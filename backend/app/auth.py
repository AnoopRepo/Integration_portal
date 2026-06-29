from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from bson import ObjectId
from app.config import settings
from app.database import get_database

import bcrypt

# OAuth2 Authentication Scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    db = get_database()
    try:
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        if user_doc is None:
            raise credentials_exception
        # Convert ObjectId to string for internal convenience
        user_doc["id"] = str(user_doc["_id"])
        return user_doc
    except Exception:
        raise credentials_exception

def check_admin_role(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in ("admin", "administrator"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have sufficient permissions to perform this action"
        )
    return current_user

def check_hr_role(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in ("hr", "admin", "administrator"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires HR privileges"
        )
    return current_user

def check_hr_or_admin_role(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in ("admin", "hr", "administrator"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires Admin or HR privileges"
        )
    return current_user

def send_otp_email(receiver_email: str, otp: str, user_name: Optional[str] = None) -> bool:
    import smtplib
    import ssl
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    # Retrieve SMTP configurations
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT
    smtp_username = settings.SMTP_USERNAME
    smtp_password = settings.SMTP_PASSWORD.replace(" ", "") if settings.SMTP_PASSWORD else ""
    smtp_sender = settings.SMTP_SENDER or smtp_username
    
    # If credentials are not configured, print mock log to terminal and return
    if not smtp_username or not smtp_password:
        target_desc = f"{user_name} ({receiver_email})" if user_name else receiver_email
        print(f"\n[MOCK OTP SERVICE] SMTP not configured. Dispatched simulated OTP for {target_desc}: {otp}\n")
        return False

    # Construct professional HTML email body
    message = MIMEMultipart("alternative")
    message["Subject"] = f"Your WorkPulse Login Verification Code - {user_name}" if user_name else "Your WorkPulse Login Verification Code"
    message["From"] = smtp_sender
    message["To"] = receiver_email

    target_name_str = f"for <strong>{user_name}</strong> ({receiver_email})" if user_name else f"for ({receiver_email})"

    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 20px; border-radius: 10px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #334155; text-align: center;">
          <div style="display: inline-block; background: linear-gradient(135deg, #a855f7, #3b82f6); padding: 2px; border-radius: 12px; margin-bottom: 20px;">
            <div style="background-color: #0f172a; padding: 10px 20px; border-radius: 10px; font-weight: bold; color: #ffffff;">WorkPulse Security</div>
          </div>
          <h2 style="color: #f1f5f9; font-weight: 800; margin-top: 0; font-family: 'Inter', sans-serif;">Verification Code</h2>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">To finalize the secure login {target_name_str}, please enter the following 6-digit verification code:</p>
          <div style="display: inline-block; padding: 15px 30px; font-size: 32px; font-weight: 900; letter-spacing: 5px; color: #c084fc; background-color: #0f172a; border: 1px solid #475569; border-radius: 10px; margin: 20px 0; font-family: monospace;">
            {otp}
          </div>
          <p style="color: #64748b; font-size: 11px; margin-top: 20px; line-height: 1.5;">This passcode is valid for 5 minutes. If you did not initiate this login request, please secure your account immediately.</p>
        </div>
      </body>
    </html>
    """
    
    part = MIMEText(html, "html")
    message.attach(part)

    try:
        context = ssl.create_default_context()
        if smtp_port == 465:
            # SSL Connection
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context, timeout=5.0) as server:
                server.login(smtp_username, smtp_password)
                server.sendmail(smtp_sender, receiver_email, message.as_string())
        else:
            # TLS Connection (usually port 587)
            with smtplib.SMTP(smtp_host, smtp_port, timeout=5.0) as server:
                server.starttls(context=context)
                server.login(smtp_username, smtp_password)
                server.sendmail(smtp_sender, receiver_email, message.as_string())
        print(f"[EMAIL SUCCESS] Dispatched OTP code to {receiver_email}!")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send OTP email to {receiver_email} via SMTP: {e}")
        return False

def mask_email(email: str) -> str:
    try:
        parts = email.split("@")
        if len(parts) != 2:
            return email
        local, domain = parts
        if len(local) <= 1:
            return f"{local}***@{domain}"
        return f"{local[0]}***@{domain}"
    except Exception:
        return email
