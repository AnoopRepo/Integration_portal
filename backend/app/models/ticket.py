from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional

class TicketBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=5)
    target_department: str = Field(..., min_length=2, max_length=100)
    priority: str = "Medium"  # "Low", "Medium", "High", "Critical"

class TicketCreate(TicketBase):
    pass

class TicketResolve(BaseModel):
    resolution_notes: str = Field(..., min_length=2)

class TicketResponse(TicketBase):
    id: str
    user_id: str
    user_name: str
    user_email: str
    status: str = "Open"  # "Open", "Closed"
    created_at: datetime
    
    handled_by_id: Optional[str] = None
    handled_by_name: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None

    class Config:
        from_attributes = True
