from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
import random
from bson import ObjectId
from pydantic import BaseModel, EmailStr
from app.database import get_database
from app.models.user import UserCreate, UserLogin, UserResponse, Token, OTPVerification, UserRole
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user, send_otp_email
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# In-memory store for login OTPs.
# Format: { email: { "otp": otp, "expires_at": datetime, "role": role } }
otp_store = {}

# Separate in-memory store for password-reset OTPs.
# Format: { email: { "otp": otp, "expires_at": datetime } }
reset_otp_store = {}

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_in: UserCreate):
    if not settings.DEV_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public user registration is disabled. Only system administrators can add new employee profiles."
        )
    
    db = get_database()
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_in.email.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )
        
    # Hash password and insert user
    hashed_password = get_password_hash(user_in.password)
    user_dict = {
        "name": user_in.name,
        "email": user_in.email.lower(),
        "password": hashed_password,
        "role": user_in.role.value,
        "department": user_in.department or "Engineering",
        "is_super_admin": user_in.role.value == "administrator",
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    user_dict["id"] = str(result.inserted_id)
    return user_dict

@router.post("/login")
async def login(credentials: UserLogin):
    db = get_database()
    
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Check if the user's role matches the chosen login role
    if user["role"] != credentials.role.value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect role selected for this account",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Generate 6-digit OTP
    otp = f"{random.randint(100000, 999999)}"
    
    # Store OTP in-memory with a 5-minute expiration
    otp_store[credentials.email.lower()] = {
        "otp": otp,
        "expires_at": datetime.utcnow() + timedelta(minutes=5),
        "role": credentials.role.value
    }
    
    # Dispatch secure OTP email using SMTP helper
    send_otp_email(credentials.email.lower(), otp, user.get("name"))
    
    response_payload = {
        "otp_required": True,
        "email": credentials.email
    }
    
    # If in DEV_MODE, include the simulated OTP in the response payload for E2E testing
    if settings.DEV_MODE:
        response_payload["simulated_otp"] = otp
        
    return response_payload

@router.post("/verify-otp", response_model=Token)
async def verify_otp(verification: OTPVerification):
    email = verification.email.lower()
    otp = verification.otp
    role = verification.role.value
    
    if email not in otp_store:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active login session found. Please request a new OTP."
        )
        
    session = otp_store[email]
    
    # Check expiration
    if datetime.utcnow() > session["expires_at"]:
        del otp_store[email]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new one."
        )
        
    # Check role matches session
    if session["role"] != role:
        raise HTTPException(
            status_code=status.HTTP_412_PRECONDITION_FAILED,
            detail="Role mismatch. Please login again."
        )
        
    # Check OTP matches
    if session["otp"] != otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please try again."
        )
        
    # OTP is valid! Clear it from store and issue token.
    del otp_store[email]
    
    db = get_database()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    # Strictly if the logging-in user is the owner/administrator, dispatch the active presence OTP to their email
    if email == "anoopyadav5984@gmail.com":
        try:
            from app.routes.attendance import generate_office_otp, send_office_attendance_email
            import os
            
            attendance_otp = generate_office_otp()
            owner_email = "anoopyadav5984@gmail.com"
            office_email = os.getenv("OFFICE_SYSTEMS_EMAIL", "anoopyadav5984@gmail.com")
            
            send_office_attendance_email(owner_email, attendance_otp, user.get("name"))
            if office_email != owner_email:
                send_office_attendance_email(office_email, attendance_otp, user.get("name"))
        except Exception as e:
            print(f"[AUTH LOGIN SUCCESS] Attendance OTP trigger error: {e}")

    user_response = {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "department": user.get("department", "Engineering"),
        "is_super_admin": user.get("is_super_admin", False) or user["role"] == "administrator",
        "created_at": user["created_at"]
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


# ──────────────────────────────────────────────────────────────────
# PASSWORD RESET FLOW
# ──────────────────────────────────────────────────────────────────

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    """
    Step 1: User submits their email.
    If the email exists, generate a 6-digit OTP and send it via SMTP.
    Returns simulated_otp in DEV_MODE so the flow can be tested without email.
    """
    db = get_database()
    email_lower = payload.email.lower()
    user = await db.users.find_one({"email": email_lower})

    # Always return 200 even if user not found — prevents email enumeration.
    if not user:
        return {"message": "If this email exists, a reset code has been sent."}

    otp = f"{random.randint(100000, 999999)}"

    reset_otp_store[email_lower] = {
        "otp": otp,
        "expires_at": datetime.utcnow() + timedelta(minutes=10),
    }

    # Reuse the existing SMTP helper (same as login OTP emails)
    send_otp_email(email_lower, otp, user.get("name"))

    response = {"message": "If this email exists, a reset code has been sent."}
    if settings.DEV_MODE:
        response["simulated_otp"] = otp

    return response


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    """
    Step 2: User submits email + OTP + new password.
    Validates the OTP then updates the password hash in the database.
    """
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters."
        )

    email = payload.email.lower()

    if email not in reset_otp_store:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active reset session. Please request a new code."
        )

    session = reset_otp_store[email]

    if datetime.utcnow() > session["expires_at"]:
        del reset_otp_store[email]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code has expired. Please request a new one."
        )

    if session["otp"] != payload.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset code. Please try again."
        )

    # OTP valid — hash the new password and save
    del reset_otp_store[email]

    db = get_database()
    hashed = get_password_hash(payload.new_password)
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"password": hashed}}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    return {"message": "Password reset successfully. You can now log in with your new password."}
