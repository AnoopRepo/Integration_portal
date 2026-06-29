from datetime import datetime, timedelta
from bson import ObjectId
from app.database import get_database
from app.models.attendance import AttendanceStatus

class AttendanceService:
    @staticmethod
    def get_date_string(dt: datetime) -> str:
        # Convert datetime to YYYY-MM-DD in local context
        # In a real app, this should respect the organization's or employee's timezone.
        # We will use the date component directly.
        return dt.strftime("%Y-%m-%d")

    async def check_in(self, employee_id: str, ip_address: str = "127.0.0.1") -> dict:
        db = get_database()
        now = datetime.utcnow()
        date_str = self.get_date_string(now)

        # Check if already checked in today
        existing = await db.attendance.find_one({
            "employee_id": ObjectId(employee_id),
            "date": date_str
        })

        if existing:
            # Check if they already checked in (meaning status is not OnLeave or Absent)
            if existing["status"] in [AttendanceStatus.PRESENT, AttendanceStatus.LATE]:
                raise ValueError("Employee already checked in for today.")
            elif existing["status"] == AttendanceStatus.ONLEAVE:
                # If they are on leave but still checking in, we let them proceed but warn/override
                pass

        # Determine if late (late if check_in is after 09:30 AM local time / UTC check-in offset)
        # Since we use UTC, let's look at local time or just use standard 09:30 UTC for generic demo,
        # or parse from hour and minute (e.g. 04:00 AM UTC = 09:30 AM IST).
        # Let's write standard local time parser:
        # Assuming IST (+5:30) is the local timezone. Let's convert UTC to IST.
        local_time = now + timedelta(hours=5, minutes=30)
        is_late = False
        status = AttendanceStatus.PRESENT

        if local_time.hour > 9 or (local_time.hour == 9 and local_time.minute > 30):
            is_late = True
            status = AttendanceStatus.LATE

        attendance_doc = {
            "employee_id": ObjectId(employee_id),
            "date": date_str,
            "check_in_time": now,
            "check_out_time": None,
            "check_in_ip": ip_address,
            "status": status.value,
            "is_late": is_late,
            "is_early_departure": False
        }

        if existing:
            # Overwrite the existing (e.g. if it was a simulated absent or onleave)
            await db.attendance.replace_one({"_id": existing["_id"]}, attendance_doc)
            attendance_doc["id"] = str(existing["_id"])
        else:
            result = await db.attendance.insert_one(attendance_doc)
            attendance_doc["id"] = str(result.inserted_id)

        attendance_doc["employee_id"] = str(attendance_doc["employee_id"])
        return attendance_doc

    async def check_out(self, employee_id: str, ip_address: str = "127.0.0.1") -> dict:
        db = get_database()
        now = datetime.utcnow()
        date_str = self.get_date_string(now)

        existing = await db.attendance.find_one({
            "employee_id": ObjectId(employee_id),
            "date": date_str
        })

        if not existing:
            raise ValueError("No check-in record found for today. Please check-in first.")

        if existing["check_out_time"] is not None:
            raise ValueError("Employee already checked out for today.")

        # Determine if early departure (before 05:00 PM IST / 17:00 IST)
        local_time = now + timedelta(hours=5, minutes=30)
        is_early = False
        if local_time.hour < 17:
            is_early = True

        update_data = {
            "check_out_time": now,
            "is_early_departure": is_early
        }

        await db.attendance.update_one(
            {"_id": existing["_id"]},
            {"$set": update_data}
        )

        existing.update(update_data)
        existing["id"] = str(existing["_id"])
        existing["employee_id"] = str(existing["employee_id"])
        return existing

    async def get_today_dashboard(self) -> dict:
        db = get_database()
        now = datetime.utcnow()
        date_str = self.get_date_string(now)

        # Retrieve all check-ins for today
        records = await db.attendance.find({"date": date_str}).to_list(length=1000)
        
        # Hydrate user details
        hydrated_records = []
        present_count = 0
        late_count = 0
        on_leave_count = 0
        
        for r in records:
            user = await db.users.find_one({"_id": r["employee_id"]})
            if user:
                r["id"] = str(r["_id"])
                r["employee_id"] = str(r["employee_id"])
                r["employee_name"] = user.get("name", "Unknown")
                r["employee_email"] = user.get("email", "")
                r["department"] = user.get("department", "Engineering")
                
                if r["status"] == AttendanceStatus.PRESENT.value:
                    present_count += 1
                elif r["status"] == AttendanceStatus.LATE.value:
                    late_count += 1
                elif r["status"] == AttendanceStatus.ONLEAVE.value:
                    on_leave_count += 1
                    
                r.pop("_id", None)
                hydrated_records.append(r)

        return {
            "date": date_str,
            "records": hydrated_records,
            "metrics": {
                "total_active": present_count + late_count,
                "present": present_count,
                "late": late_count,
                "on_leave": on_leave_count
            }
        }

    async def log_approved_leaves(self, employee_id: str, start_date: datetime, end_date: datetime) -> None:
        db = get_database()
        current = start_date
        
        while current <= end_date:
            date_str = self.get_date_string(current)
            
            attendance_doc = {
                "employee_id": ObjectId(employee_id),
                "date": date_str,
                "check_in_time": current, # Simulated check-in as start of day
                "check_out_time": current,
                "check_in_ip": "SYSTEM",
                "status": AttendanceStatus.ONLEAVE.value,
                "is_late": False,
                "is_early_departure": False
            }
            
            # Upsert so we don't duplicate
            await db.attendance.update_one(
                {
                    "employee_id": ObjectId(employee_id),
                    "date": date_str
                },
                {"$set": attendance_doc},
                upsert=True
            )
            current += timedelta(days=1)

    async def get_monthly_metrics(self, employee_id: str, month: int, year: int) -> dict:
        db = get_database()
        
        # Calculate matching dates glob or date range query
        # Date string is YYYY-MM-DD. We query date matching f"{year}-{month:02d}-*" or regex
        regex_pattern = f"^{year}-{month:02d}-\\d{{2}}$"
        
        records = await db.attendance.find({
            "employee_id": ObjectId(employee_id),
            "date": {"$regex": regex_pattern}
        }).to_list(length=100)

        total_days = len(records)
        present = 0
        late = 0
        absent = 0
        on_leave = 0

        for r in records:
            status = r["status"]
            if status == AttendanceStatus.PRESENT.value:
                present += 1
            elif status == AttendanceStatus.LATE.value:
                late += 1
            elif status == AttendanceStatus.ONLEAVE.value:
                on_leave += 1
            elif status == AttendanceStatus.ABSENT.value:
                absent += 1

        # In a real environment, total_days might be standard working days in the month (e.g. 22 days)
        # We calculate percentage based on (present + late + on_leave) / total_days if total_days > 0
        attendance_percentage = 100.0
        if total_days > 0:
            attendance_percentage = round(((present + late + on_leave) / total_days) * 100, 2)

        return {
            "employee_id": employee_id,
            "month": month,
            "year": year,
            "total_days": total_days,
            "present_days": present,
            "absent_days": absent,
            "late_days": late,
            "on_leave_days": on_leave,
            "attendance_percentage": attendance_percentage
        }

    async def get_employee_history(self, employee_id: str, start_date: datetime, end_date: datetime) -> list:
        db = get_database()
        
        # Range of dates YYYY-MM-DD
        start_str = self.get_date_string(start_date)
        end_str = self.get_date_string(end_date)
        
        records = await db.attendance.find({
            "employee_id": ObjectId(employee_id),
            "date": {"$gte": start_str, "$lte": end_str}
        }).sort("date", -1).to_list(length=100)
        
        for r in records:
            r["id"] = str(r["_id"])
            r["employee_id"] = str(r["employee_id"])
            r.pop("_id", None)
            
        return records

attendance_service = AttendanceService()
