from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, timedelta
import random
import os
from app.models.attendance import AttendanceResponse, AttendanceMetricsResponse, AttendanceStatus
from app.auth import get_current_user, check_admin_role, mask_email
from app.services.attendance_service import attendance_service
from app.database import get_database
from bson import ObjectId

router = APIRouter(
    prefix="/api/attendance",
    tags=["Attendance Tracking"]
)

# In-memory store for the active office attendance OTP (valid for 12 hours once generated)
active_attendance_otp = {
    "otp": None,
    "expires_at": None
}

def generate_office_otp():
    global active_attendance_otp
    now = datetime.utcnow()
    # Generate new one if none exists or has expired
    if not active_attendance_otp["otp"] or not active_attendance_otp["expires_at"] or now > active_attendance_otp["expires_at"]:
        otp = f"{random.randint(100000, 999999)}"
        active_attendance_otp["otp"] = otp
        active_attendance_otp["expires_at"] = now + timedelta(hours=12)
    return active_attendance_otp["otp"]

def send_office_attendance_email(receiver_email: str, otp: str, user_name: Optional[str] = None) -> bool:
    from app.config import settings
    import smtplib
    import ssl
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT
    smtp_username = settings.SMTP_USERNAME
    smtp_password = settings.SMTP_PASSWORD.replace(" ", "") if settings.SMTP_PASSWORD else ""
    smtp_sender = settings.SMTP_SENDER or smtp_username
    
    if not smtp_username or not smtp_password:
        target_desc = f"{user_name} ({receiver_email})" if user_name else receiver_email
        print(f"\n[MOCK OFFICE OTP SERVICE] SMTP not configured. Dispatched Attendance OTP for {target_desc}: {otp}\n")
        return False

    message = MIMEMultipart("alternative")
    message["Subject"] = f"Active Office Attendance Verification Code - {user_name}" if user_name else "Active Office Attendance Verification Code"
    message["From"] = smtp_sender
    message["To"] = receiver_email

    target_name_str = f"for <strong>{user_name}</strong>" if user_name else "your"

    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 20px; border-radius: 10px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #334155; text-align: center;">
          <div style="display: inline-block; background: linear-gradient(135deg, #a855f7, #3b82f6); padding: 2px; border-radius: 12px; margin-bottom: 20px;">
            <div style="background-color: #0f172a; padding: 10px 20px; border-radius: 10px; font-weight: bold; color: #ffffff;">WorkPulse Attendance Security</div>
          </div>
          <h2 style="color: #f1f5f9; font-weight: 800; margin-top: 0; font-family: 'Inter', sans-serif;">Active Attendance Code</h2>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">To verify the physical presence inside the office {target_name_str} and complete the check-in, please display or use the following 6-digit active attendance code:</p>
          <div style="display: inline-block; padding: 15px 30px; font-size: 32px; font-weight: 900; letter-spacing: 5px; color: #c084fc; background-color: #0f172a; border: 1px solid #475569; border-radius: 10px; margin: 20px 0; font-family: monospace;">
            {otp}
          </div>
          <p style="color: #64748b; font-size: 11px; margin-top: 20px; line-height: 1.5;">This presence verification code is valid for 12 hours and must only be entered from the physical office systems.</p>
        </div>
      </body>
    </html>
    """
    
    part = MIMEText(html, "html")
    message.attach(part)

    try:
        context = ssl.create_default_context()
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context) as server:
                server.login(smtp_username, smtp_password)
                server.sendmail(smtp_sender, receiver_email, message.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls(context=context)
                server.login(smtp_username, smtp_password)
                server.sendmail(smtp_sender, receiver_email, message.as_string())
        print(f"[ATTENDANCE OTP SUCCESS] Sent active presence code to {receiver_email} for {user_name or ''}!")
        return True
    except Exception as e:
        print(f"[ATTENDANCE OTP ERROR] Failed to send attendance OTP email to {receiver_email}: {e}")
        return False

# Role check helper for Manager and Admin
def check_manager_or_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in ["admin", "manager", "hr", "administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have sufficient permissions to perform this action (Manager/Admin/HR required)"
        )
    return current_user

@router.post("/send-office-otp")
async def send_office_otp(
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") not in ("admin", "administrator") and current_user.get("email") != "anoopyadav5984@gmail.com":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can request a central office OTP dispatch."
        )
        
    otp = generate_office_otp()
    owner_email = "anoopyadav5984@gmail.com"
    office_email = os.getenv("OFFICE_SYSTEMS_EMAIL", "anoopyadav5984@gmail.com")
    
    send_office_attendance_email(owner_email, otp, current_user.get("name"))
    if office_email != owner_email:
        send_office_attendance_email(office_email, otp, current_user.get("name"))
        
    return {"message": "Active Office Attendance OTP dispatched successfully."}

@router.post("/check-in", response_model=AttendanceResponse)
async def check_in(
    otp: str = Query(...),
    ip_address: str = "127.0.0.1",
    current_user: dict = Depends(get_current_user)
):
    from app.config import settings
    # 1. Dev Mode / Test Bypass
    if settings.DEV_MODE and otp == "123456":
        pass
    else:
        # Validate active office OTP
        global active_attendance_otp
        now = datetime.utcnow()
        if not active_attendance_otp["otp"] or not active_attendance_otp["expires_at"] or now > active_attendance_otp["expires_at"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Active Office Attendance OTP has expired or has not been generated yet. Please ask the administrator to log in."
            )
        if active_attendance_otp["otp"] != otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Office Attendance OTP. Please check the office display or consult the administrator."
            )

    try:
        record = await attendance_service.check_in(current_user["id"], ip_address)
        
        # Emit check-in event to Knowledge Layer
        try:
            from app.knowledge.helpers import emit_portal_knowledge
            from app.knowledge.schemas.knowledge import KnowledgeCategory
            await emit_portal_knowledge(
                category=KnowledgeCategory.ATTENDANCE,
                title=f"Attendance Check-In: {current_user['name']}",
                content=f"Employee {current_user['name']} ({current_user['email']}) checked in from IP {ip_address}.",
                system_module="attendance",
                creator_id=current_user["id"],
                metadata={"action": "check-in"}
            )
        except Exception as e:
            print(f"[Knowledge Emit Warning] Check-in: {e}")
            
        return record
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/check-out", response_model=AttendanceResponse)
async def check_out(
    ip_address: str = "127.0.0.1",
    current_user: dict = Depends(get_current_user)
):
    try:
        record = await attendance_service.check_out(current_user["id"], ip_address)
        
        # Emit check-out event to Knowledge Layer
        try:
            from app.knowledge.helpers import emit_portal_knowledge
            from app.knowledge.schemas.knowledge import KnowledgeCategory
            await emit_portal_knowledge(
                category=KnowledgeCategory.ATTENDANCE,
                title=f"Attendance Check-Out: {current_user['name']}",
                content=f"Employee {current_user['name']} ({current_user['email']}) checked out from IP {ip_address}.",
                system_module="attendance",
                creator_id=current_user["id"],
                metadata={"action": "check-out"}
            )
        except Exception as e:
            print(f"[Knowledge Emit Warning] Check-out: {e}")
            
        return record
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/today")
async def get_today_dashboard(
    current_user: dict = Depends(check_manager_or_admin)
):
    try:
        dashboard = await attendance_service.get_today_dashboard()
        is_super = current_user.get("is_super_admin", False) or current_user.get("role") == "administrator"
        user_dept = current_user.get("department")
        user_id = current_user["id"]
        
        records = dashboard.get("records", [])
        filtered_records = []
        present_count = 0
        late_count = 0
        on_leave_count = 0
        
        for r in records:
            # Enforce department boundary
            if not is_super and r.get("department") != user_dept:
                continue
                
            # Mask emails and IPs for other employees
            if not is_super and r.get("employee_id") != user_id:
                r["employee_email"] = mask_email(r.get("employee_email", ""))
                r["check_in_ip"] = "Hidden"
                
            if r["status"] == AttendanceStatus.PRESENT.value:
                present_count += 1
            elif r["status"] == AttendanceStatus.LATE.value:
                late_count += 1
            elif r["status"] == AttendanceStatus.ONLEAVE.value:
                on_leave_count += 1
                
            filtered_records.append(r)
            
        return {
            "date": dashboard.get("date"),
            "records": filtered_records,
            "metrics": {
                "total_active": present_count + late_count,
                "present": present_count,
                "late": late_count,
                "on_leave": on_leave_count
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/history", response_model=List[AttendanceResponse])
async def get_my_history(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Default: last 30 days
        if not end_date:
            end_dt = datetime.utcnow()
        else:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            
        if not start_date:
            start_dt = end_dt - timedelta(days=30)
        else:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")

        records = await attendance_service.get_employee_history(current_user["id"], start_dt, start_dt if start_date and not end_date else end_dt)
        # Note: adjust date check inclusive
        if start_date and not end_date:
             records = await attendance_service.get_employee_history(current_user["id"], start_dt, start_dt + timedelta(days=30))
        else:
             records = await attendance_service.get_employee_history(current_user["id"], start_dt, end_dt)
             
        return records
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date formats: {e}"
        )

@router.get("/metrics", response_model=AttendanceMetricsResponse)
async def get_my_metrics(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    current_user: dict = Depends(get_current_user)
):
    try:
        metrics = await attendance_service.get_monthly_metrics(current_user["id"], month, year)
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/employee/{employee_id}", response_model=List[AttendanceResponse])
async def get_employee_history(
    employee_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(check_manager_or_admin)
):
    is_super = current_user.get("is_super_admin", False) or current_user.get("role") == "administrator"
    if not is_super:
        try:
            db = get_database()
            target_user = await db.users.find_one({"_id": ObjectId(employee_id)})
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid employee ID: {e}"
            )
        if not target_user or target_user.get("department") != current_user.get("department"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view attendance history for other departments"
            )

    try:
        if not end_date:
            end_dt = datetime.utcnow()
        else:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            
        if not start_date:
            start_dt = end_dt - timedelta(days=30)
        else:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")

        records = await attendance_service.get_employee_history(employee_id, start_dt, end_dt)
        
        # Mask check_in_ip if not super admin and not self
        if not is_super and employee_id != current_user["id"]:
            for r in records:
                r["check_in_ip"] = "Hidden"
                
        return records
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
