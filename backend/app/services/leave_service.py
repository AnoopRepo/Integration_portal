from datetime import datetime, timedelta
from bson import ObjectId
from app.database import get_database
from app.models.leave import LeaveType, LeaveStatus
from app.services.attendance_service import attendance_service
from app.auth import send_otp_email # We can adapt the SMTP helper to send notifications

class LeaveService:
    @staticmethod
    def send_leave_status_email(receiver_email: str, employee_name: str, leave_type: str, start_str: str, end_str: str, status: str, remarks: str = "") -> None:
        import smtplib
        import ssl
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from app.config import settings

        smtp_host = settings.SMTP_HOST
        smtp_port = settings.SMTP_PORT
        smtp_username = settings.SMTP_USERNAME
        smtp_password = settings.SMTP_PASSWORD.replace(" ", "") if settings.SMTP_PASSWORD else ""
        smtp_sender = settings.SMTP_SENDER or smtp_username

        if not smtp_username or not smtp_password:
            print(f"\n[MOCK MAIL SERVICE] Leave notification sent for {employee_name}: {status}\n")
            return

        message = MIMEMultipart("alternative")
        message["Subject"] = f"WorkPulse HR: Leave Request {status}"
        message["From"] = smtp_sender
        message["To"] = receiver_email

        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 20px; border-radius: 10px;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #334155;">
              <h2 style="color: #f1f5f9; text-align: center; margin-top: 0;">Leave Request Status Update</h2>
              <p style="color: #94a3b8; font-size: 14px;">Dear {employee_name},</p>
              <p style="color: #94a3b8; font-size: 14px;">Your leave request has been processed.</p>
              
              <div style="background-color: #0f172a; padding: 15px; border-radius: 8px; border: 1px solid #475569; margin: 20px 0;">
                <table style="width: 100%; color: #f1f5f9; font-size: 14px;">
                  <tr>
                    <td style="color: #94a3b8; padding-bottom: 5px;">Leave Type:</td>
                    <td style="font-weight: bold; padding-bottom: 5px;">{leave_type}</td>
                  </tr>
                  <tr>
                    <td style="color: #94a3b8; padding-bottom: 5px;">Duration:</td>
                    <td style="font-weight: bold; padding-bottom: 5px;">{start_str} to {end_str}</td>
                  </tr>
                  <tr>
                    <td style="color: #94a3b8; padding-bottom: 5px;">Status:</td>
                    <td style="font-weight: bold; color: {'#10b981' if status == 'Approved' else '#ef4444'}; padding-bottom: 5px;">{status}</td>
                  </tr>
                  {f'<tr><td style="color: #94a3b8;">Remarks:</td><td style="font-weight: bold;">{remarks}</td></tr>' if remarks else ''}
                </table>
              </div>
              
              <p style="color: #64748b; font-size: 11px; text-align: center;">This is an automated HR notification from WorkPulse security portal.</p>
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
            print(f"[MAIL SUCCESS] Dispatched leave notification email to {receiver_email}!")
        except Exception as e:
            print(f"[MAIL ERROR] Failed to send leave email to {receiver_email}: {e}")

    async def initialize_balances(self, employee_id: str, year: int) -> dict:
        db = get_database()
        
        # Check if already exists
        existing = await db.leave_balances.find_one({
            "employee_id": ObjectId(employee_id),
            "year": year
        })
        
        if existing:
            existing["employee_id"] = str(existing["employee_id"])
            return existing

        default_balance = {
            "employee_id": ObjectId(employee_id),
            "year": year,
            "balances": {
                LeaveType.SICK.value: {"total": 3.0, "used": 0.0, "remaining": 3.0},
                LeaveType.CASUAL.value: {"total": 5.0, "used": 0.0, "remaining": 5.0},
                LeaveType.ANNUAL.value: {"total": 20.0, "used": 0.0, "remaining": 20.0},
                LeaveType.MATERNITY.value: {"total": 180.0, "used": 0.0, "remaining": 180.0},
                LeaveType.UNPAID.value: {"total": 999.0, "used": 0.0, "remaining": 999.0}
            }
        }

        result = await db.leave_balances.insert_one(default_balance)
        default_balance["id"] = str(result.inserted_id)
        default_balance["employee_id"] = str(default_balance["employee_id"])
        return default_balance

    async def get_leave_balances(self, employee_id: str, year: int) -> dict:
        return await self.initialize_balances(employee_id, year)

    async def request_leave(self, employee_id: str, leave_type: LeaveType, start_date: datetime, end_date: datetime, reason: str) -> dict:
        db = get_database()

        if start_date > end_date:
            raise ValueError("Start date cannot be after end date.")

        duration = (end_date - start_date).days + 1.0

        # Check balance for the year
        year = start_date.year
        balance_doc = await self.get_leave_balances(employee_id, year)
        
        if leave_type.value not in balance_doc["balances"]:
            raise ValueError(f"Invalid leave type: {leave_type}")

        avail = balance_doc["balances"][leave_type.value]["remaining"]
        
        if leave_type != LeaveType.UNPAID and avail < duration:
            raise ValueError(f"Insufficient leave balance for {leave_type.value}. Requested {duration} days, but only {avail} days remain.")

        leave_doc = {
            "employee_id": ObjectId(employee_id),
            "leave_type": leave_type.value,
            "start_date": start_date,
            "end_date": end_date,
            "duration_days": duration,
            "reason": reason,
            "status": LeaveStatus.PENDING.value,
            "approved_by": None,
            "rejection_reason": None,
            "created_at": datetime.utcnow()
        }

        result = await db.leave_records.insert_one(leave_doc)
        leave_doc["id"] = str(result.inserted_id)
        leave_doc["employee_id"] = str(leave_doc["employee_id"])
        return leave_doc

    async def approve_leave(self, leave_id: str, manager_id: str) -> dict:
        db = get_database()
        
        leave = await db.leave_records.find_one({"_id": ObjectId(leave_id)})
        if not leave:
            raise ValueError("Leave request not found.")

        if leave["status"] != LeaveStatus.PENDING.value:
            raise ValueError(f"Cannot approve leave request with status: {leave['status']}.")

        employee_id = leave["employee_id"]
        leave_type = leave["leave_type"]
        duration = leave["duration_days"]
        year = leave["start_date"].year

        # Deduct balance if not unpaid leave
        if leave_type != LeaveType.UNPAID.value:
            balance_doc = await self.get_leave_balances(str(employee_id), year)
            current_bal = balance_doc["balances"][leave_type]
            
            new_used = current_bal["used"] + duration
            new_rem = current_bal["total"] - new_used
            
            if new_rem < 0:
                raise ValueError("Insufficient balance to complete approval.")

            await db.leave_balances.update_one(
                {"_id": balance_doc["_id"]},
                {
                    "$set": {
                        f"balances.{leave_type}.used": new_used,
                        f"balances.{leave_type}.remaining": new_rem
                    }
                }
            )

        # Update leave status
        await db.leave_records.update_one(
            {"_id": ObjectId(leave_id)},
            {
                "$set": {
                    "status": LeaveStatus.APPROVED.value,
                    "approved_by": ObjectId(manager_id)
                }
            }
        )

        # CASCADING SYNC: Log the dates as "OnLeave" in the Attendance grid!
        await attendance_service.log_approved_leaves(
            str(employee_id),
            leave["start_date"],
            leave["end_date"]
        )

        # Retrieve user email for SMTP notification
        user = await db.users.find_one({"_id": employee_id})
        if user and "email" in user:
            self.send_leave_status_email(
                receiver_email=user["email"],
                employee_name=user.get("name", "Employee"),
                leave_type=leave_type,
                start_str=leave["start_date"].strftime("%Y-%m-%d"),
                end_str=leave["end_date"].strftime("%Y-%m-%d"),
                status="Approved"
            )

        leave["status"] = LeaveStatus.APPROVED.value
        leave["approved_by"] = manager_id
        leave["id"] = str(leave["_id"])
        leave["employee_id"] = str(leave["employee_id"])
        return leave

    async def reject_leave(self, leave_id: str, manager_id: str, reason: str) -> dict:
        db = get_database()
        
        leave = await db.leave_records.find_one({"_id": ObjectId(leave_id)})
        if not leave:
            raise ValueError("Leave request not found.")

        if leave["status"] != LeaveStatus.PENDING.value:
            raise ValueError(f"Cannot reject leave request with status: {leave['status']}.")

        await db.leave_records.update_one(
            {"_id": ObjectId(leave_id)},
            {
                "$set": {
                    "status": LeaveStatus.REJECTED.value,
                    "rejection_reason": reason,
                    "approved_by": ObjectId(manager_id)
                }
            }
        )

        # Retrieve user email for SMTP notification
        user = await db.users.find_one({"_id": leave["employee_id"]})
        if user and "email" in user:
            self.send_leave_status_email(
                receiver_email=user["email"],
                employee_name=user.get("name", "Employee"),
                leave_type=leave["leave_type"],
                start_str=leave["start_date"].strftime("%Y-%m-%d"),
                end_str=leave["end_date"].strftime("%Y-%m-%d"),
                status="Rejected",
                remarks=reason
            )

        leave["status"] = LeaveStatus.REJECTED.value
        leave["rejection_reason"] = reason
        leave["approved_by"] = manager_id
        leave["id"] = str(leave["_id"])
        leave["employee_id"] = str(leave["employee_id"])
        return leave

    async def get_pending_leaves(self) -> list:
        db = get_database()
        
        records = await db.leave_records.find({"status": LeaveStatus.PENDING.value}).to_list(length=100)
        
        hydrated = []
        for r in records:
            user = await db.users.find_one({"_id": r["employee_id"]})
            if user:
                r["id"] = str(r["_id"])
                r["employee_id"] = str(r["employee_id"])
                r["employee_name"] = user.get("name", "Unknown")
                r["employee_email"] = user.get("email", "")
                r["department"] = user.get("department", "Engineering")
                # Remove ObjectId so jsonable_encoder can serialize it
                r.pop("_id", None)
                hydrated.append(r)
        return hydrated

    async def get_employee_leaves(self, employee_id: str) -> list:
        db = get_database()
        
        records = await db.leave_records.find({"employee_id": ObjectId(employee_id)}).sort("created_at", -1).to_list(length=100)
        
        for r in records:
            r["id"] = str(r["_id"])
            r["employee_id"] = str(r["employee_id"])
            if r["approved_by"]:
                r["approved_by"] = str(r["approved_by"])
            r.pop("_id", None)
        return records

leave_service = LeaveService()
