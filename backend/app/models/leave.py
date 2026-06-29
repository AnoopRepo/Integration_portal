from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict
from enum import Enum

class LeaveType(str, Enum):
    SICK = "Sick"
    CASUAL = "Casual"
    ANNUAL = "Annual"
    UNPAID = "Unpaid"
    MATERNITY = "Maternity"

class LeaveStatus(str, Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"

class LeaveBase(BaseModel):
    leave_type: LeaveType
    start_date: datetime
    end_date: datetime
    reason: str = Field(..., min_length=5, max_length=500)

class LeaveCreate(LeaveBase):
    pass

class LeaveUpdateStatus(BaseModel):
    status: LeaveStatus
    rejection_reason: Optional[str] = None

class LeaveResponse(LeaveBase):
    id: str
    employee_id: str
    duration_days: float
    status: LeaveStatus
    approved_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True

class LeaveBalanceDetail(BaseModel):
    total: float
    used: float
    remaining: float

class LeaveBalanceResponse(BaseModel):
    employee_id: str
    year: int
    balances: Dict[str, LeaveBalanceDetail]

    class Config:
        from_attributes = True

class HolidayCreate(BaseModel):
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    name: str = Field(..., min_length=2, max_length=100)
    is_optional: bool = False

class HolidayResponse(HolidayCreate):
    id: str

    class Config:
        from_attributes = True
