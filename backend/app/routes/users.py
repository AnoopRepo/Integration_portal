from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from typing import List
from app.database import get_database
from app.models.user import UserResponse, UserUpdate, UserCreate
from app.auth import check_admin_role, get_current_user, mask_email, get_password_hash
from datetime import datetime

router = APIRouter(
    prefix="/api/users",
    tags=["User Management"],
    dependencies=[Depends(check_admin_role)]
)

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_in: UserCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_in.email.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )
    
    is_super = current_user.get("is_super_admin", False) or current_user.get("role") == "administrator"
    if not is_super:
        # General admin can only add users to their own department
        if user_in.department != current_user.get("department"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to add users to other departments"
            )
        # General admin cannot assign admin or administrator roles
        if user_in.role.value in ("admin", "administrator"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to assign elevated administrative roles"
            )
            
    # Hash password and insert user
    hashed_password = get_password_hash(user_in.password)
    user_dict = {
        "name": user_in.name,
        "email": user_in.email.lower(),
        "password": hashed_password,
        "role": user_in.role.value,
        "department": user_in.department or "Engineering",
        "is_super_admin": user_in.role.value == "administrator",
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    user_dict["id"] = str(result.inserted_id)
    return user_dict

@router.get("", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    is_super = current_user.get("is_super_admin", False) or current_user.get("role") == "administrator"
    user_dept = current_user.get("department")
    
    query = {}
    if not is_super:
        query = {"department": user_dept}
        
    cursor = db.users.find(query)
    users_list = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        # If not super admin and not self, mask the email address
        if not is_super and doc["id"] != current_user["id"]:
            doc["email"] = mask_email(doc["email"])
        users_list.append(doc)
    return users_list

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_in: UserUpdate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        is_super = current_user.get("is_super_admin", False) or current_user.get("role") == "administrator"
        if not is_super and user.get("department") != current_user.get("department"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to manage users in other departments"
            )
            
        update_data = {k: v for k, v in user_in.dict(exclude_unset=True).items() if v is not None}
        
        if "role" in update_data:
            role_val = update_data["role"].value if hasattr(update_data["role"], "value") else update_data["role"]
            update_data["is_super_admin"] = (role_val == "administrator")
            
        # Safeguard: prevent overwriting real email with a masked email
        if "email" in update_data:
            if "*" in update_data["email"]:
                del update_data["email"]
        
        if not update_data:
            user["id"] = str(user["_id"])
            if not is_super and user["id"] != current_user["id"]:
                user["email"] = mask_email(user["email"])
            return user
            
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        # Retrieve the fresh document
        updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
        updated_user["id"] = str(updated_user["_id"])
        if not is_super and updated_user["id"] != current_user["id"]:
            updated_user["email"] = mask_email(updated_user["email"])
        return updated_user
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format or update error"
        )

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        is_super = current_user.get("is_super_admin", False) or current_user.get("role") == "administrator"
        if not is_super and user.get("department") != current_user.get("department"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to manage users in other departments"
            )
            
        # Delete user
        await db.users.delete_one({"_id": ObjectId(user_id)})
        
        # Delete all reports associated with this user for consistency
        await db.reports.delete_many({"user_id": user_id})
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format or deletion error"
        )
        
    return None
