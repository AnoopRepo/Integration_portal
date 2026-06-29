from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class AttendanceStatus(str, Enum):
    PRESENT = "Present"
    LATE = "Late"
    ABSENT = "Absent"
    ONLEAVE = "OnLeave"

class AttendanceBase(BaseModel):
    employee_id: str
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    status: AttendanceStatus = AttendanceStatus.PRESENT
    is_late: bool = False
    is_early_departure: bool = False

class AttendanceCheckIn(BaseModel):
    ip_address: str = "127.0.0.1"

class AttendanceCheckOut(BaseModel):
    ip_address: str = "127.0.0.1"

class AttendanceResponse(AttendanceBase):
    id: str
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    check_in_ip: Optional[str] = None
    
    class Config:
        from_attributes = True

class AttendanceMetricsResponse(BaseModel):
    employee_id: str
    month: int
    year: int
    total_days: int
    present_days: int
    absent_days: int
    late_days: int
    on_leave_days: int
    attendance_percentage: float

    class Config:
        from_attributes = True
