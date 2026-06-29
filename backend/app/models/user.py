from pydantic import BaseModel, EmailStr, Field
from enum import Enum
from datetime import datetime
from typing import Optional

class UserRole(str, Enum):
    GENERAL = "general"
    ADMIN = "admin"
    HR = "hr"
    ADMINISTRATOR = "administrator"
    IT = "it"

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    department: Optional[str] = None
    is_super_admin: bool = False

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)
    role: UserRole = UserRole.GENERAL

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    department: Optional[str] = None
    is_super_admin: Optional[bool] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role: UserRole

class OTPVerification(BaseModel):
    email: EmailStr
    otp: str
    role: UserRole

class UserResponse(UserBase):
    id: str
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
