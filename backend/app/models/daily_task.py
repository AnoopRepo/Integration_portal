from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    BLOCKED = "Blocked"

class TaskPriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"

class DailyTaskBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = Field("", max_length=1000)
    date: str = Field(..., description="Date of task in YYYY-MM-DD format")
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM

class DailyTaskCreate(DailyTaskBase):
    pass

class DailyTaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None

class DailyTaskResponse(DailyTaskBase):
    id: str
    employee_id: str
    employee_name: str
    employee_email: str
    department: str
    created_at: datetime

    class Config:
        from_attributes = True
