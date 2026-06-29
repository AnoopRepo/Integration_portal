from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List

# ─── ASSET MODELS ───
class AssetBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    serial_number: str = Field(..., min_length=2, max_length=100)
    category: str = Field(..., min_length=2, max_length=50)
    assigned_to: Optional[str] = None
    assigned_name: Optional[str] = None
    status: str = "Available"  # "Available", "Assigned", "Under Repair"
    purchase_date: str
    value: float = Field(..., ge=0)

class AssetCreate(AssetBase):
    pass

class AssetResponse(AssetBase):
    id: str

    class Config:
        from_attributes = True


# ─── INVENTORY MODELS ───
class InventoryItemBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    category: str = Field(..., min_length=2, max_length=50)
    quantity: int = Field(..., ge=0)
    unit: str = Field(..., min_length=1, max_length=20)
    min_threshold: int = Field(..., ge=0)
    location: str = Field(..., min_length=2, max_length=100)

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemResponse(InventoryItemBase):
    id: str
    last_updated: datetime

    class Config:
        from_attributes = True


# ─── VENDOR MODELS ───
class VendorBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    contact_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=5, max_length=20)
    services: str = Field(..., min_length=2)
    contract_start: str
    contract_end: str
    status: str = "Active"  # "Active", "Inactive"

class VendorCreate(VendorBase):
    pass

class VendorResponse(VendorBase):
    id: str

    class Config:
        from_attributes = True


# ─── REMINDER MODELS ───
class ReminderBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: str = Field(...)
    type: str = "Reminder"  # "Reminder", "Escalation"
    target_user: Optional[str] = None
    target_name: Optional[str] = None
    status: str = "Pending"  # "Pending", "Resolved"
    due_date: str

class ReminderCreate(ReminderBase):
    pass

class ReminderResponse(ReminderBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── MEETING MODELS ───
class MeetingBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    agenda: str = Field(...)
    room: str = Field(..., min_length=2, max_length=50)
    date: str
    start_time: str
    end_time: str
    attendees: List[str] = []

class MeetingCreate(MeetingBase):
    pass

class MeetingResponse(MeetingBase):
    id: str
    organizer_id: str
    organizer_name: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── EXPENSE MODELS ───
class ExpenseBase(BaseModel):
    amount: float = Field(..., gt=0)
    category: str = Field(..., min_length=2, max_length=50)
    description: str = Field(...)
    date: str
    document_id: Optional[str] = None
    document_title: Optional[str] = None
    document_url: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseStatusUpdate(BaseModel):
    status: str  # "Approved", "Rejected"
    comments: Optional[str] = ""

class ExpenseResponse(ExpenseBase):
    id: str
    user_id: str
    user_name: str
    status: str  # "Pending", "Approved", "Rejected"
    comments: Optional[str] = ""
    created_at: datetime

    class Config:
        from_attributes = True


# ─── DOCUMENT MODELS ───
class DocumentBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    category: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = ""
    file_url: str
    is_public: bool = True

class DocumentCreate(DocumentBase):
    pass

class DocumentResponse(DocumentBase):
    id: str
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True
