from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.database import get_database
from app.models.leave import LeaveCreate, LeaveResponse, LeaveBalanceResponse, LeaveUpdateStatus, LeaveStatus
from app.auth import get_current_user, mask_email
from app.services.leave_service import leave_service

router = APIRouter(
    prefix="/api/leaves",
    tags=["Leave Management"]
)

# Role check helper for Manager and Admin
def check_manager_or_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in ["admin", "manager", "hr", "administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have sufficient permissions to perform this action (Manager/Admin/HR required)"
        )
    return current_user

@router.post("", response_model=LeaveResponse, status_code=status.HTTP_201_CREATED)
async def request_leave(
    leave_in: LeaveCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Pass fields
        leave = await leave_service.request_leave(
            employee_id=current_user["id"],
            leave_type=leave_in.leave_type,
            start_date=leave_in.start_date,
            end_date=leave_in.end_date,
            reason=leave_in.reason
        )
        return leave
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/balances", response_model=LeaveBalanceResponse)
async def get_my_balances(
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    if not year:
        year = datetime.utcnow().year
    try:
        balances = await leave_service.get_leave_balances(current_user["id"], year)
        return balances
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/my-requests", response_model=List[LeaveResponse])
async def get_my_requests(
    current_user: dict = Depends(get_current_user)
):
    try:
        requests = await leave_service.get_employee_leaves(current_user["id"])
        return requests
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/pending", response_model=List[dict])
async def get_pending_requests(
    current_user: dict = Depends(check_manager_or_admin)
):
    try:
        pending = await leave_service.get_pending_leaves()
        
        is_super = current_user.get("is_super_admin", False) or current_user.get("role") == "administrator"
        user_dept = current_user.get("department")
        user_id = current_user["id"]
        
        filtered = []
        for r in pending:
            # Enforce department boundary
            if not is_super and r.get("department") != user_dept:
                continue
            
            # Mask emails of other employees
            if not is_super and r.get("employee_id") != user_id:
                r["employee_email"] = mask_email(r.get("employee_email", ""))
                
            filtered.append(r)
            
        return filtered
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/{leave_id}/approve", response_model=LeaveResponse)
async def approve_leave(
    leave_id: str,
    current_user: dict = Depends(check_manager_or_admin)
):
    try:
        db = get_database()
        leave = await db.leave_records.find_one({"_id": ObjectId(leave_id)})
        if not leave:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Leave request not found"
            )
            
        is_super = current_user.get("is_super_admin", False) or current_user.get("role") == "administrator"
        if not is_super:
            target_user = await db.users.find_one({"_id": leave["employee_id"]})
            if not target_user or target_user.get("department") != current_user.get("department"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to manage leave requests for other departments"
                )
                
        record = await leave_service.approve_leave(leave_id, current_user["id"])
        return record
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{leave_id}/reject", response_model=LeaveResponse)
async def reject_leave(
    leave_id: str,
    payload: LeaveUpdateStatus,
    current_user: dict = Depends(check_manager_or_admin)
):
    if payload.status != LeaveStatus.REJECTED:
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail="Status update must be 'Rejected' for this endpoint."
         )
    if not payload.rejection_reason or len(payload.rejection_reason.strip()) < 3:
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail="A rejection reason of at least 3 characters is required."
         )
         
    try:
        db = get_database()
        leave = await db.leave_records.find_one({"_id": ObjectId(leave_id)})
        if not leave:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Leave request not found"
            )
            
        is_super = current_user.get("is_super_admin", False) or current_user.get("role") == "administrator"
        if not is_super:
            target_user = await db.users.find_one({"_id": leave["employee_id"]})
            if not target_user or target_user.get("department") != current_user.get("department"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to manage leave requests for other departments"
                )
                
        record = await leave_service.reject_leave(leave_id, current_user["id"], payload.rejection_reason)
        return record
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
