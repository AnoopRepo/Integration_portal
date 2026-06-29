
import urllib.request
import urllib.error
import json
import time
import bcrypt
import os

API_URL = "http://localhost:8000"

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def setup_known_passwords():
    print("[+] Seeding database with clean mock data...")
    mock_users_path = os.path.join(os.path.dirname(__file__), "mock_users.json")
    with open(mock_users_path, "r") as f:
        users = json.load(f)

    # Keep existing password hashes from mock_users.json as-is to preserve correct login credentials

    # Clean and seed to MongoDB
    try:
        from pymongo import MongoClient
        from dotenv import load_dotenv
        from bson import ObjectId
        
        load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
        mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        print(f"    -> Connecting to MongoDB at: {mongo_uri}")
        
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
        client.server_info()
        
        db = client.get_default_database(default="daily_work_reports")
        print("    -> Connected to MongoDB. Purging collections and seeding mock users...")
        
        db.users.delete_many({})
        db.attendance.delete_many({})
        db.leave_records.delete_many({})
        db.leave_balances.delete_many({})
        db.reports.delete_many({})
        db.tickets.delete_many({})
        db.expenses.delete_many({})
        
        for u in users:
            doc = u.copy()
            if "_id" in doc:
                doc["_id"] = ObjectId(doc["_id"])
            if "id" in doc:
                del doc["id"]
            db.users.insert_one(doc)
            
        print("    -> MongoDB seeded successfully.")
    except Exception as e:
        print(f"    -> MongoDB seeding skipped / fell back to Mock JSON DB: {e}")
        
    time.sleep(2) # Give server time to stabilize/reload

def make_request(path, method="GET", data=None, headers=None):
    url = f"{API_URL}{path}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    
    req_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.status
            body_bytes = response.read()
            if not body_bytes or status_code == 204:
                return status_code, None
            return status_code, json.loads(body_bytes.decode("utf-8"))
    except urllib.error.HTTPError as e:
        body_bytes = e.read()
        if not body_bytes:
            return e.code, None
        body = body_bytes.decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

def authenticate(email, password, role):
    status, res = make_request("/api/auth/login", "POST", {
        "email": email,
        "password": password,
        "role": role
    })
    if status != 200:
        raise Exception(f"Login stage 1 failed for {email}: {status} {res}")
    
    otp_status, otp_res = make_request("/api/auth/verify-otp", "POST", {
        "email": email,
        "otp": res["simulated_otp"],
        "role": role
    })
    if otp_status != 200:
        raise Exception(f"OTP verification failed for {email}: {otp_status} {otp_res}")
    return otp_res["access_token"], otp_res["user"]["id"]

def run_tests():
    print("====================================================")
    print("STARTING DEPARTMENTAL PRIVACY & ACCESS CONTROL TESTS")
    print("====================================================")
    
    # 1. Setup database and passwords
    setup_known_passwords()
    
    # 2. Authenticate the three actors
    print("\n[+] Authenticating Actors...")
    
    super_token, super_id = authenticate("anoopyadav5984@gmail.com", "securepassword123", "administrator")
    super_headers = {"Authorization": f"Bearer {super_token}"}
    print(f"    -> Super Admin logged in. ID: {super_id}")
    
    eng_admin_token, eng_admin_id = authenticate("anoop@example.com", "securepassword123", "admin")
    eng_admin_headers = {"Authorization": f"Bearer {eng_admin_token}"}
    print(f"    -> Engineering Department Admin logged in. ID: {eng_admin_id}")
    
    john_token, john_id = authenticate("john.staff@workpulse.com", "securepassword123", "general")
    john_headers = {"Authorization": f"Bearer {john_token}"}
    print(f"    -> Customer Support User John Staff logged in. ID: {john_id}")
    
    # ──────────────────────────────────────────────────────────────────────────
    # VERIFICATION 1: USER ROSTER ISOLATION & MASKING
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[1] Testing User Roster Isolation & Masking...")
    
    # Super Admin lists users: should see everyone and unmasked emails
    status, users_super = make_request("/api/users", "GET", headers=super_headers)
    assert status == 200, f"Failed to list users: {status}"
    emails_super = [u["email"] for u in users_super]
    print(f"    -> Super Admin sees all users: {emails_super}")
    assert "john.staff@workpulse.com" in emails_super
    assert "anoop@example.com" in emails_super
    # Super Admin should NOT see masked emails
    assert not any("*" in email for email in emails_super)
    print("    -> Super Admin Roster Check: Passed (sees all, completely unmasked)")
    
    # Local Eng Admin lists users: should only see Engineering users
    status, users_eng = make_request("/api/users", "GET", headers=eng_admin_headers)
    assert status == 200
    for u in users_eng:
        assert u["department"] == "Engineering", f"Local Eng Admin saw a non-Engineering user: {u}"
        # Caller sees their own email unmasked, but others masked
        if u["id"] == eng_admin_id:
            assert u["email"] == "anoop@example.com"
        else:
            assert "*" in u["email"], f"Other user email was not masked: {u['email']}"
            
    print("    -> Local Admin Roster Check: Passed (only Engineering seen, other emails masked)")
    
    # ──────────────────────────────────────────────────────────────────────────
    # VERIFICATION 2: EMAIL SELF-OVERWRITE PROTECTION (PUT SAFEGUARD)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[2] Testing Email Self-Overwrite Protection (PUT Safeguard)...")
    
    # Let's find an Engineering user in users_eng list
    eng_user = None
    for u in users_eng:
        if u["id"] != eng_admin_id:
            eng_user = u
            break
            
    assert eng_user is not None, "Need at least one other Engineering user in mock DB"
    original_real_email = "anoopyadav598@gmail.com" # From mock_users.json for ID 6a0d4c5bfd019034a6416e10
    
    # Eng admin updates this user, sending back their masked email representation
    update_payload = {
        "name": eng_user["name"],
        "email": eng_user["email"], # Contains asterisks
        "role": eng_user["role"],
        "department": eng_user["department"]
    }
    
    status, update_res = make_request(f"/api/users/{eng_user['id']}", "PUT", update_payload, headers=eng_admin_headers)
    assert status == 200, f"Failed to update user: {status} {update_res}"
    
    # Verify the email in the DB is NOT overwritten by the masked representation
    # Fetch from Super Admin to inspect unmasked email
    status, users_super_refreshed = make_request("/api/users", "GET", headers=super_headers)
    assert status == 200
    refreshed_user = next(u for u in users_super_refreshed if u["id"] == eng_user["id"])
    assert refreshed_user["email"] == original_real_email, f"Email was corrupted to masked representation: {refreshed_user['email']}"
    print("    -> PUT Safeguard Check: Passed (masked email update was ignored, no DB corruption)")

    # ──────────────────────────────────────────────────────────────────────────
    # VERIFICATION 3: LEAVE REQUESTS ISOLATION
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[3] Testing Leave Requests Isolation...")
    
    # John Staff (Customer Support) requests a leave
    leave_payload = {
        "leave_type": "Sick",
        "start_date": "2026-06-01T00:00:00",
        "end_date": "2026-06-02T00:00:00",
        "reason": "Medical checkup"
    }
    status, leave_res = make_request("/api/leaves", "POST", leave_payload, headers=john_headers)
    assert status == 201
    leave_id = leave_res["id"]
    print(f"    -> John Staff (Customer Support) raised leave request: {leave_id}")
    
    # Eng Admin tries to fetch pending leaves: should NOT see John's request
    status, pending_eng = make_request("/api/leaves/pending", "GET", headers=eng_admin_headers)
    assert status == 200
    assert not any(r["id"] == leave_id for r in pending_eng), "Eng Admin saw Customer Support leave request"
    print("    -> Leave Pending Isolation: Passed (Eng Admin cannot see Customer Support requests)")
    
    # Eng Admin tries to approve John's leave request: should be Forbidden (403)
    status, approve_res = make_request(f"/api/leaves/{leave_id}/approve", "PUT", headers=eng_admin_headers)
    assert status == 403, f"Expected 403 Forbidden for cross-department approve, got {status} {approve_res}"
    print("    -> Leave Approve Isolation: Passed (Eng Admin blocked from approving other dept's leave)")
    
    # Super Admin lists pending leaves: should see John's request with unmasked email
    status, pending_super = make_request("/api/leaves/pending", "GET", headers=super_headers)
    assert status == 200
    super_saw_leave = next(r for r in pending_super if r["id"] == leave_id)
    assert super_saw_leave["employee_email"] == "john.staff@workpulse.com", f"Super Admin saw masked leave email: {super_saw_leave['employee_email']}"
    print("    -> Super Admin Pending Leave: Passed (sees all, email unmasked)")
    
    # Super Admin approves John's leave request: should succeed (200)
    status, approve_res = make_request(f"/api/leaves/{leave_id}/approve", "PUT", headers=super_headers)
    assert status == 200
    assert approve_res["status"] == "Approved"
    print("    -> Super Admin Approve Action: Passed (unrestricted access works)")

    # ──────────────────────────────────────────────────────────────────────────
    # VERIFICATION 4: ATTENDANCE ISOLATION
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[4] Testing Attendance Isolation...")
    
    # John Staff checks in from IP "10.0.0.99"
    status, check_in_res = make_request("/api/attendance/check-in?otp=123456&ip_address=10.0.0.99", "POST", headers=john_headers)
    assert status == 200
    print(f"    -> John Staff checked in from IP: 10.0.0.99")
    
    # Eng Admin fetches today's dashboard: should NOT see John's record, metrics should exclude John
    status, dashboard_eng = make_request("/api/attendance/today", "GET", headers=eng_admin_headers)
    assert status == 200
    records_eng = dashboard_eng["records"]
    assert not any(r["employee_id"] == john_id for r in records_eng), "Eng Admin saw Customer Support check-in"
    print("    -> Attendance Today Dashboard Isolation: Passed (Eng Admin only sees Engineering check-ins)")
    
    # Eng Admin tries to fetch John's attendance history: should be Forbidden (403)
    status, history_eng = make_request(f"/api/attendance/employee/{john_id}", "GET", headers=eng_admin_headers)
    assert status == 403, f"Expected 403 Forbidden for cross-department attendance view, got {status} {history_eng}"
    print("    -> Attendance History Isolation: Passed (Eng Admin blocked from viewing other dept history)")
    
    # Super Admin fetches today's dashboard: should see John's check-in with unmasked details and unmasked IP
    status, dashboard_super = make_request("/api/attendance/today", "GET", headers=super_headers)
    assert status == 200
    john_record_super = next(r for r in dashboard_super["records"] if r["employee_id"] == john_id)
    assert john_record_super["employee_email"] == "john.staff@workpulse.com"
    assert john_record_super["check_in_ip"] == "10.0.0.99", f"Super Admin saw masked IP: {john_record_super['check_in_ip']}"
    print("    -> Super Admin Attendance Dashboard: Passed (sees all, email unmasked, IP unmasked)")
    
    # John Staff fetches his own history: should see his own IP "10.0.0.99" unmasked
    status, history_john = make_request(f"/api/attendance/history", "GET", headers=john_headers)
    assert status == 200
    john_record_self = next(r for r in history_john if r["check_in_ip"] == "10.0.0.99")
    print("    -> John Roster History Self: Passed (user sees their own IP address)")

    # ──────────────────────────────────────────────────────────────────────────
    # VERIFICATION 5: DAILY REPORTS ISOLATION
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[5] Testing Daily Reports Isolation...")
    
    # John Staff submits a status report
    report_payload = {
        "user_name": "John Staff",
        "date": "2026-05-22",
        "hours": 8.0,
        "completion": 100,
        "status": "Completed",
        "today_task": "Handled 15 support tickets today.",
        "next_day_task": "Assist new users and clear backlog.",
        "problems": "",
        "achievements": "Handled 15 support tickets with high rating."
    }
    status, report_res = make_request("/api/reports", "POST", report_payload, headers=john_headers)
    assert status == 201
    report_id = report_res["id"]
    print(f"    -> John Staff submitted daily report: {report_id}")
    
    # Eng Admin lists reports: should NOT see John's report
    status, reports_eng = make_request("/api/reports", "GET", headers=eng_admin_headers)
    assert status == 200
    assert not any(r["id"] == report_id for r in reports_eng), "Eng Admin saw Customer Support report"
    print("    -> Report Listing Isolation: Passed (Eng Admin only sees Engineering reports)")
    
    # Eng Admin tries to delete John's report: should be Forbidden (403)
    status, delete_res = make_request(f"/api/reports/{report_id}", "DELETE", headers=eng_admin_headers)
    assert status == 403, f"Expected 403 Forbidden for cross-department report delete, got {status} {delete_res}"
    print("    -> Report Delete Isolation: Passed (Eng Admin blocked from deleting other dept reports)")
    
    # Super Admin lists reports: should see John's report
    status, reports_super = make_request("/api/reports", "GET", headers=super_headers)
    assert status == 200
    assert any(r["id"] == report_id for r in reports_super)
    
    # Super Admin deletes John's report: should succeed
    status, delete_res = make_request(f"/api/reports/{report_id}", "DELETE", headers=super_headers)
    assert status == 204 or status == 200
    print("    -> Super Admin Report Action: Passed (deleted successfully)")

    # ──────────────────────────────────────────────────────────────────────────
    # VERIFICATION 6: SUPPORT TICKETS ISOLATION
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[6] Testing Support Tickets Isolation...")
    
    # John Staff raises a support ticket targeting IT Ops
    ticket_payload = {
        "title": "Monitor flickering",
        "description": "My secondary monitor is flickering badly.",
        "priority": "Medium",
        "target_department": "IT Ops"
    }
    status, ticket_res = make_request("/api/tickets", "POST", ticket_payload, headers=john_headers)
    assert status == 201
    ticket_id = ticket_res["id"]
    print(f"    -> John Staff (Customer Support) raised ticket targeting IT Ops: {ticket_id}")
    
    # Eng Admin lists tickets: should NOT see John's ticket (raised by Customer Support, targeted to IT Ops, Eng Admin is in Engineering)
    status, tickets_eng = make_request("/api/tickets", "GET", headers=eng_admin_headers)
    assert status == 200
    assert not any(t["id"] == ticket_id for t in tickets_eng), "Eng Admin saw ticket outside their department"
    print("    -> Ticket Listing Isolation: Passed (Eng Admin cannot see unrelated tickets)")
    
    # Eng Admin tries to resolve John's ticket: should be Forbidden (403)
    status, resolve_res = make_request(f"/api/tickets/{ticket_id}/resolve", "PUT", {"resolution_notes": "Resolve by Eng"}, headers=eng_admin_headers)
    assert status == 403, f"Expected 403 Forbidden for cross-department ticket resolve, got {status} {resolve_res}"
    print("    -> Ticket Resolve Isolation: Passed (Eng Admin blocked from resolving other dept tickets)")
    
    # Super Admin lists tickets: should see John's ticket and his unmasked email
    status, tickets_super = make_request("/api/tickets", "GET", headers=super_headers)
    assert status == 200
    super_saw_ticket = next(t for t in tickets_super if t["id"] == ticket_id)
    assert super_saw_ticket["user_email"] == "john.staff@workpulse.com"
    print("    -> Super Admin Ticket Listing: Passed (sees all, email unmasked)")
    
    # Super Admin resolves the ticket: should succeed
    status, resolve_res = make_request(f"/api/tickets/{ticket_id}/resolve", "PUT", {"resolution_notes": "Resolved by Super Admin"}, headers=super_headers)
    assert status == 200
    assert resolve_res["status"] == "Closed"
    print("    -> Super Admin Ticket Resolve Action: Passed (resolved successfully)")

    # ──────────────────────────────────────────────────────────────────────────
    # VERIFICATION 7: EXPENSES AUDITING ISOLATION
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[7] Testing Expenses Auditing Isolation...")
    
    # John Staff submits an expense request
    expense_payload = {
        "title": "Office chair reimbursement",
        "category": "Office Supplies",
        "amount": 150.0,
        "date": "2026-05-22",
        "description": "Ergonomic chair for home office"
    }
    status, expense_res = make_request("/api/expenses", "POST", expense_payload, headers=john_headers)
    assert status == 201
    expense_id = expense_res["id"]
    print(f"    -> John Staff submitted expense: {expense_id}")
    
    # Eng Admin lists all expenses: should NOT see John's expense
    status, expenses_eng = make_request("/api/admin/expenses", "GET", headers=eng_admin_headers)
    assert status == 200
    assert not any(e["id"] == expense_id for e in expenses_eng), "Eng Admin saw Customer Support expense"
    print("    -> Expense Listing Isolation: Passed (Eng Admin only sees Engineering expenses)")
    
    # Eng Admin tries to audit John's expense: should be Forbidden (403)
    audit_payload = {
        "status": "Approved",
        "comments": "Audited by Eng"
    }
    status, audit_res = make_request(f"/api/admin/expenses/{expense_id}/status", "PUT", audit_payload, headers=eng_admin_headers)
    assert status == 403, f"Expected 403 Forbidden for cross-department expense audit, got {status} {audit_res}"
    print("    -> Expense Audit Isolation: Passed (Eng Admin blocked from auditing other dept expenses)")
    
    # Super Admin lists all expenses: should see John's expense
    status, expenses_super = make_request("/api/admin/expenses", "GET", headers=super_headers)
    assert status == 200
    assert any(e["id"] == expense_id for e in expenses_super)
    
    # Super Admin audits John's expense: should succeed
    status, audit_res = make_request(f"/api/admin/expenses/{expense_id}/status", "PUT", audit_payload, headers=super_headers)
    assert status == 200
    assert audit_res["status"] == "Approved"
    print("    -> Super Admin Expense Audit Action: Passed (audited successfully)")

    print("\n====================================================")
    print("ALL DEPARTMENTAL PRIVACY & ISOLATION TESTS PASSED!")
    print("====================================================")

if __name__ == "__main__":
    time.sleep(1) # wait for server to fully stabilize
    run_tests()
