from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class ReportBase(BaseModel):
    user_name: str
    date: str
    hours: float = Field(..., ge=0, le=24)
    completion: int = Field(..., ge=0, le=100)
    status: str
    today_task: str
    problems: Optional[str] = ""
    achievements: Optional[str] = ""
    next_day_task: str

class ReportCreate(ReportBase):
    pass

class ReportResponse(ReportBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True
