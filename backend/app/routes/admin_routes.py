from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from typing import List
from datetime import datetime
from app.database import get_database
from app.auth import check_admin_role, get_current_user
from app.models.admin_models import (
    AssetCreate, AssetResponse,
    InventoryItemCreate, InventoryItemResponse,
    VendorCreate, VendorResponse,
    ReminderCreate, ReminderResponse,
    MeetingCreate, MeetingResponse,
    ExpenseCreate, ExpenseResponse, ExpenseStatusUpdate,
    DocumentCreate, DocumentResponse
)

router = APIRouter(tags=["Admin Management Hub"])

# Helper function to convert mongo _id to str id
def parse_doc(doc):
    if doc:
        doc["id"] = str(doc.get("_id", doc.get("id")))
    return doc


# ──────────────────────────────────────────────────────────────────────────────
# ─── ASSET ENDPOINTS (ADMIN ONLY) ─────────────────────────────────────────────
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/api/admin/assets", response_model=List[AssetResponse], dependencies=[Depends(check_admin_role)])
async def list_assets():
    db = get_database()
    cursor = db.assets.find()
    assets = []
    async for doc in cursor:
        assets.append(parse_doc(doc))
    return assets

@router.post("/api/admin/assets", response_model=AssetResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(check_admin_role)])
async def create_asset(asset_in: AssetCreate):
    db = get_database()
    asset_dict = asset_in.dict()
    result = await db.assets.insert_one(asset_dict)
    asset_dict["id"] = str(result.inserted_id)
    return asset_dict

@router.put("/api/admin/assets/{asset_id}", response_model=AssetResponse, dependencies=[Depends(check_admin_role)])
async def update_asset(asset_id: str, asset_in: AssetCreate):
    db = get_database()
    try:
        existing = await db.assets.find_one({"_id": ObjectId(asset_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        asset_dict = asset_in.dict()
        await db.assets.update_one({"_id": ObjectId(asset_id)}, {"$set": asset_dict})
        
        updated = await db.assets.find_one({"_id": ObjectId(asset_id)})
        return parse_doc(updated)
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid asset ID format")

@router.delete("/api/admin/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(check_admin_role)])
async def delete_asset(asset_id: str):
    db = get_database()
    try:
        result = await db.assets.delete_one({"_id": ObjectId(asset_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Asset not found")
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid asset ID format")
    return None


# ──────────────────────────────────────────────────────────────────────────────
# ─── INVENTORY ENDPOINTS (ADMIN ONLY) ─────────────────────────────────────────
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/api/admin/inventory", response_model=List[InventoryItemResponse], dependencies=[Depends(check_admin_role)])
async def list_inventory():
    db = get_database()
    cursor = db.inventory.find()
    items = []
    async for doc in cursor:
        items.append(parse_doc(doc))
    return items

@router.post("/api/admin/inventory", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(check_admin_role)])
async def create_inventory(item_in: InventoryItemCreate):
    db = get_database()
    item_dict = item_in.dict()
    item_dict["last_updated"] = datetime.utcnow()
    result = await db.inventory.insert_one(item_dict)
    item_dict["id"] = str(result.inserted_id)
    return item_dict

@router.put("/api/admin/inventory/{item_id}", response_model=InventoryItemResponse, dependencies=[Depends(check_admin_role)])
async def update_inventory(item_id: str, item_in: InventoryItemCreate):
    db = get_database()
    try:
        existing = await db.inventory.find_one({"_id": ObjectId(item_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        
        item_dict = item_in.dict()
        item_dict["last_updated"] = datetime.utcnow()
        await db.inventory.update_one({"_id": ObjectId(item_id)}, {"$set": item_dict})
        
        updated = await db.inventory.find_one({"_id": ObjectId(item_id)})
        return parse_doc(updated)
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid item ID format")

@router.delete("/api/admin/inventory/{item_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(check_admin_role)])
async def delete_inventory(item_id: str):
    db = get_database()
    try:
        result = await db.inventory.delete_one({"_id": ObjectId(item_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Inventory item not found")
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid item ID format")
    return None


# ──────────────────────────────────────────────────────────────────────────────
# ─── VENDOR ENDPOINTS (ADMIN ONLY) ────────────────────────────────────────────
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/api/admin/vendors", response_model=List[VendorResponse], dependencies=[Depends(check_admin_role)])
async def list_vendors():
    db = get_database()
    cursor = db.vendors.find()
    vendors = []
    async for doc in cursor:
        vendors.append(parse_doc(doc))
    return vendors

@router.post("/api/admin/vendors", response_model=VendorResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(check_admin_role)])
async def create_vendor(vendor_in: VendorCreate):
    db = get_database()
    vendor_dict = vendor_in.dict()
    result = await db.vendors.insert_one(vendor_dict)
    vendor_dict["id"] = str(result.inserted_id)
    return vendor_dict

@router.put("/api/admin/vendors/{vendor_id}", response_model=VendorResponse, dependencies=[Depends(check_admin_role)])
async def update_vendor(vendor_id: str, vendor_in: VendorCreate):
    db = get_database()
    try:
        existing = await db.vendors.find_one({"_id": ObjectId(vendor_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Vendor not found")
        
        vendor_dict = vendor_in.dict()
        await db.vendors.update_one({"_id": ObjectId(vendor_id)}, {"$set": vendor_dict})
        
        updated = await db.vendors.find_one({"_id": ObjectId(vendor_id)})
        return parse_doc(updated)
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid vendor ID format")

@router.delete("/api/admin/vendors/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(check_admin_role)])
async def delete_vendor(vendor_id: str):
    db = get_database()
    try:
        result = await db.vendors.delete_one({"_id": ObjectId(vendor_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Vendor not found")
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid vendor ID format")
    return None


# ──────────────────────────────────────────────────────────────────────────────
# ─── REMINDER & ESCALATION ENDPOINTS (ADMIN ONLY) ─────────────────────────────
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/api/admin/reminders", response_model=List[ReminderResponse], dependencies=[Depends(check_admin_role)])
async def list_reminders():
    db = get_database()
    cursor = db.reminders.find()
    reminders = []
    async for doc in cursor:
        reminders.append(parse_doc(doc))
    return reminders

@router.post("/api/admin/reminders", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(check_admin_role)])
async def create_reminder(reminder_in: ReminderCreate):
    db = get_database()
    reminder_dict = reminder_in.dict()
    reminder_dict["created_at"] = datetime.utcnow()
    result = await db.reminders.insert_one(reminder_dict)
    reminder_dict["id"] = str(result.inserted_id)
    return reminder_dict

@router.put("/api/admin/reminders/{reminder_id}/resolve", response_model=ReminderResponse, dependencies=[Depends(check_admin_role)])
async def resolve_reminder(reminder_id: str):
    db = get_database()
    try:
        existing = await db.reminders.find_one({"_id": ObjectId(reminder_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Reminder not found")
        
        await db.reminders.update_one({"_id": ObjectId(reminder_id)}, {"$set": {"status": "Resolved"}})
        
        updated = await db.reminders.find_one({"_id": ObjectId(reminder_id)})
        return parse_doc(updated)
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid reminder ID format")

@router.delete("/api/admin/reminders/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(check_admin_role)])
async def delete_reminder(reminder_id: str):
    db = get_database()
    try:
        result = await db.reminders.delete_one({"_id": ObjectId(reminder_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Reminder not found")
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid reminder ID format")
    return None


# ──────────────────────────────────────────────────────────────────────────────
# ─── MEETING ENDPOINTS (ALL USERS - READ, ADMIN - WRITE) ──────────────────────
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/api/meetings", response_model=List[MeetingResponse])
async def list_meetings(current_user: dict = Depends(get_current_user)):
    db = get_database()
    meetings = []
    
    # If admin, fetch all
    if current_user.get("role") in ("admin", "administrator"):
        cursor = db.meetings.find()
    else:
        # Standard user: only see if attendee or organizer
        email = current_user.get("email")
        name = current_user.get("name")
        cursor = db.meetings.find({
            "$or": [
                {"organizer_id": current_user["id"]},
                {"attendees": email},
                {"attendees": name}
            ]
        })
        
    async for doc in cursor:
        meetings.append(parse_doc(doc))
    return meetings

@router.post("/api/admin/meetings", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(check_admin_role)])
async def create_meeting(meeting_in: MeetingCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    meeting_dict = meeting_in.dict()
    meeting_dict.update({
        "organizer_id": current_user["id"],
        "organizer_name": current_user["name"],
        "created_at": datetime.utcnow()
    })
    result = await db.meetings.insert_one(meeting_dict)
    meeting_dict["id"] = str(result.inserted_id)
    return meeting_dict

@router.delete("/api/admin/meetings/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(check_admin_role)])
async def delete_meeting(meeting_id: str):
    db = get_database()
    try:
        result = await db.meetings.delete_one({"_id": ObjectId(meeting_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Meeting not found")
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid meeting ID format")
    return None


# ──────────────────────────────────────────────────────────────────────────────
# ─── EXPENSE ENDPOINTS (ALL USERS - READ/WRITE OWN, ADMIN - AUDIT ALL) ────────
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/api/admin/expenses", response_model=List[ExpenseResponse])
async def list_all_expenses(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("admin", "administrator"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required"
        )
    db = get_database()
    is_super = current_user.get("is_super_admin", False) or current_user.get("role") == "administrator"
    
    if is_super:
        cursor = db.expenses.find().sort("created_at", -1)
    else:
        dept = current_user.get("department")
        users = await db.users.find({"department": dept}).to_list(length=1000)
        user_ids = [str(u["_id"]) for u in users]
        cursor = db.expenses.find({"user_id": {"$in": user_ids}}).sort("created_at", -1)
        
    expenses = []
    async for doc in cursor:
        expenses.append(parse_doc(doc))
    return expenses

@router.get("/api/expenses", response_model=List[ExpenseResponse])
async def list_my_expenses(current_user: dict = Depends(get_current_user)):
    db = get_database()
    cursor = db.expenses.find({"user_id": current_user["id"]}).sort("created_at", -1)
    expenses = []
    async for doc in cursor:
        expenses.append(parse_doc(doc))
    return expenses

@router.post("/api/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def submit_expense(expense_in: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    expense_dict = expense_in.dict()
    expense_dict.update({
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "status": "Pending",
        "comments": "",
        "created_at": datetime.utcnow()
    })
    result = await db.expenses.insert_one(expense_dict)
    expense_dict["id"] = str(result.inserted_id)
    return expense_dict

@router.put("/api/admin/expenses/{expense_id}/status", response_model=ExpenseResponse)
async def audit_expense(
    expense_id: str,
    audit_in: ExpenseStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") not in ("admin", "administrator"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required"
        )
    db = get_database()
    is_super = current_user.get("is_super_admin", False) or current_user.get("role") == "administrator"
    
    try:
        existing = await db.expenses.find_one({"_id": ObjectId(expense_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Expense record not found")
            
        if not is_super:
            owner_id = existing.get("user_id")
            owner = await db.users.find_one({"_id": ObjectId(owner_id)})
            if not owner or owner.get("department") != current_user.get("department"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to manage expenses for other departments"
                )
        
        await db.expenses.update_one(
            {"_id": ObjectId(expense_id)},
            {"$set": {"status": audit_in.status, "comments": audit_in.comments}}
        )
        
        updated = await db.expenses.find_one({"_id": ObjectId(expense_id)})
        return parse_doc(updated)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid expense ID format")

@router.delete("/api/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    try:
        existing = await db.expenses.find_one({"_id": ObjectId(expense_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Expense record not found")
        
        # Only allow deleting own expenses OR admin can delete any
        if existing["user_id"] != current_user["id"] and current_user.get("role") not in ("admin", "administrator"):
            raise HTTPException(status_code=403, detail="Not authorized to delete this expense record")
            
        # Standard user can only delete if still Pending
        if existing["status"] != "Pending" and current_user.get("role") not in ("admin", "administrator"):
            raise HTTPException(status_code=400, detail="Cannot delete a finalized expense record")
            
        await db.expenses.delete_one({"_id": ObjectId(expense_id)})
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid expense ID format")
    return None


# ──────────────────────────────────────────────────────────────────────────────
# ─── PREVIOUS DOCUMENT ENDPOINTS REMOVED ──────────────────────────────────────
# ──────────────────────────────────────────────────────────────────────────────

