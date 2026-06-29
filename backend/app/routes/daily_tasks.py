from fastapi import APIRouter, Depends, HTTPException, status, Query
from datetime import datetime
from bson import ObjectId
from typing import List, Optional
from app.database import get_database
from app.models.daily_task import DailyTaskCreate, DailyTaskUpdate, DailyTaskResponse
from app.auth import get_current_user

router = APIRouter(
    prefix="/api/daily-tasks",
    tags=["Daily Task Updates"]
)

# Helper to check if user has admin/HR role
def is_privileged_role(user: dict) -> bool:
    return user.get("role") in ("admin", "administrator", "hr") or user.get("is_super_admin", False)

@router.post("", response_model=DailyTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_daily_task(
    task_in: DailyTaskCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    
    task_dict = task_in.dict()
    task_dict.update({
        "employee_id": current_user["id"],
        "employee_name": current_user.get("name", "Unknown"),
        "employee_email": current_user.get("email", ""),
        "department": current_user.get("department", "General"),
        "created_at": datetime.utcnow()
    })
    
    result = await db.daily_tasks.insert_one(task_dict)
    task_dict["id"] = str(result.inserted_id)
    
    # Emit knowledge event to central Knowledge Layer (optional, like status reports)
    try:
        from app.knowledge.helpers import emit_portal_knowledge
        from app.knowledge.schemas.knowledge import KnowledgeCategory
        
        await emit_portal_knowledge(
            category=KnowledgeCategory.DAILY_TASKS,
            title=f"Task: {task_dict['title']} ({task_dict['employee_name']})",
            content=f"Employee: {task_dict['employee_name']} ({task_dict['employee_email']})\n"
                    f"Task Title: {task_dict['title']}\n"
                    f"Description: {task_dict.get('description', '')}\n"
                    f"Priority: {task_dict['priority']}\n"
                    f"Status: {task_dict['status']}\n"
                    f"Date: {task_dict['date']}",
            system_module="daily_tasks",
            creator_id=current_user["id"],
            metadata={
                "task_id": task_dict["id"],
                "employee_name": task_dict["employee_name"]
            }
        )
    except Exception as e:
        print(f"[Knowledge Emit Warning] Daily task: {e}")
        
    return task_dict

@router.get("", response_model=List[DailyTaskResponse])
async def list_daily_tasks(
    date: Optional[str] = Query(None, description="Filter by date in YYYY-MM-DD format"),
    employee_id: Optional[str] = Query(None, description="Filter by specific employee ID (privileged roles only)"),
    department: Optional[str] = Query(None, description="Filter by department (privileged roles only)"),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    query = {}
    
    # Apply date filter
    if date:
        query["date"] = date
        
    # Access Control Logic
    role = current_user.get("role")
    is_super = current_user.get("is_super_admin", False) or role == "administrator"
    
    if is_super:
        # Super admin has no restrictions
        if employee_id:
            query["employee_id"] = employee_id
        if department:
            query["department"] = department
    elif role in ("admin", "hr"):
        # Department admin / HR: restricted to their own department
        dept = current_user.get("department")
        query["department"] = dept
        
        if employee_id:
            # Check if target employee is in the same department
            try:
                target = await db.users.find_one({"_id": ObjectId(employee_id)})
                if target and target.get("department") == dept:
                    query["employee_id"] = employee_id
                else:
                    # Target is in a different department; return empty results or filter strictly
                    query["employee_id"] = "INSULATED_UNAUTHORIZED_TARGET"
            except Exception:
                query["employee_id"] = "INVALID_ID"
    else:
        # General employees can only see their own tasks
        query["employee_id"] = current_user["id"]
        
    cursor = db.daily_tasks.find(query).sort("created_at", -1)
    
    tasks = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        tasks.append(doc)
        
    return tasks

@router.put("/{task_id}", response_model=DailyTaskResponse)
async def update_daily_task(
    task_id: str,
    task_update: DailyTaskUpdate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    
    try:
        task = await db.daily_tasks.find_one({"_id": ObjectId(task_id)})
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid task ID format"
        )
        
    # Access Control check for updates
    role = current_user.get("role")
    is_super = current_user.get("is_super_admin", False) or role == "administrator"
    is_owner = task.get("employee_id") == current_user["id"]
    is_dept_admin = (role in ("admin", "hr")) and (task.get("department") == current_user.get("department"))
    
    if not (is_super or is_owner or is_dept_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this task"
        )
        
    update_data = {k: v for k, v in task_update.dict().items() if v is not None}
    if update_data:
        await db.daily_tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": update_data}
        )
        # Fetch updated doc
        task = await db.daily_tasks.find_one({"_id": ObjectId(task_id)})
        
    task["id"] = str(task["_id"])
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_daily_task(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    
    try:
        task = await db.daily_tasks.find_one({"_id": ObjectId(task_id)})
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid task ID format"
        )
        
    # Access Control check for deletion
    role = current_user.get("role")
    is_super = current_user.get("is_super_admin", False) or role == "administrator"
    is_owner = task.get("employee_id") == current_user["id"]
    is_dept_admin = (role in ("admin", "hr")) and (task.get("department") == current_user.get("department"))
    
    if not (is_super or is_owner or is_dept_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this task"
        )
        
    await db.daily_tasks.delete_one({"_id": ObjectId(task_id)})
    return None
