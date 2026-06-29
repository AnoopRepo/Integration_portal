import urllib.request
import urllib.error
import json
import time
import random
from datetime import datetime, timedelta

API_URL = "http://localhost:8000"

def make_request(path, data=None, headers=None, method=None):
    url = f"{API_URL}{path}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    
    req_data = json.dumps(data).encode("utf-8") if data is not None else None
    
    if method is None:
        if data is not None:
            method = "POST"
        else:
            method = "GET"
            
    req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except Exception:
            return e.code, {"detail": e.reason}

def authenticate_user(email, password, role):
    # Step 1: Login Credentials
    login_data = {
        "email": email,
        "password": password,
        "role": role
    }
    status, login_res = make_request("/api/auth/login", data=login_data)
    if status != 200:
        raise Exception(f"Login Step 1 failed: {login_res}")
    
    # Step 2: OTP Verification
    otp_data = {
        "email": email,
        "otp": login_res["simulated_otp"],
        "role": role
    }
    status, otp_res = make_request("/api/auth/verify-otp", data=otp_data)
    if status != 200:
        raise Exception(f"Login Step 2 failed: {otp_res}")
        
    return otp_res["access_token"], otp_res["user"]["id"]

def run_integration_test():
    rand_id = random.randint(10000, 99999)
    emp_email = f"emp_{rand_id}@example.com"
    mgr_email = f"mgr_{rand_id}@example.com"
    password = "securepassword123"

    print("=== WORKPULSE HR MODULE INTEGRATION TEST ===")
    
    # 1. Signup Employee
    print("\n[1/7] Creating test Employee account...")
    emp_data = {
        "name": f"Employee {rand_id}",
        "email": emp_email,
        "password": password,
        "role": "general",
        "department": "Engineering"
    }
    status, res = make_request("/api/auth/signup", data=emp_data)
    assert status == 201, f"Failed to create employee: {res}"
    print(f"Success: Created Employee with ID: {res['id']}")

    # 2. Signup Manager (Admin)
    print("\n[2/7] Creating test Manager (Admin) account...")
    mgr_data = {
        "name": f"Manager {rand_id}",
        "email": mgr_email,
        "password": password,
        "role": "admin",
        "department": "Engineering"
    }
    status, res = make_request("/api/auth/signup", data=mgr_data)
    assert status == 201, f"Failed to create manager: {res}"
    print(f"Success: Created Manager with ID: {res['id']}")

    # 3. Authenticate both users
    print("\n[3/7] Authenticating users & fetching active tokens...")
    emp_token, emp_id = authenticate_user(emp_email, password, "general")
    mgr_token, mgr_id = authenticate_user(mgr_email, password, "admin")
    print(f"Employee Token: {emp_token[:15]}...")
    print(f"Manager Token: {mgr_token[:15]}...")

    # 4. Test Daily Check-In/Out
    print("\n[4/7] Testing Daily Attendance check-in and check-out...")
    headers = {"Authorization": f"Bearer {emp_token}"}
    status, check_in_res = make_request("/api/attendance/check-in?ip_address=192.168.1.100&otp=123456", method="POST", headers=headers)
    assert status == 200, f"Check-in failed: {check_in_res}"
    print(f"Success Check-In: Status is {check_in_res['status']}, Late = {check_in_res['is_late']}")

    status, check_out_res = make_request("/api/attendance/check-out?ip_address=192.168.1.100", method="POST", headers=headers)
    assert status == 200, f"Check-out failed: {check_out_res}"
    print(f"Success Check-Out: Registered checkout at {check_out_res['check_out_time']}")

    # 5. Request a Leave
    print("\n[5/7] Requesting a 3-day Vacation Leave...")
    # Request starting tomorrow
    start_date = datetime.utcnow() + timedelta(days=1)
    end_date = start_date + timedelta(days=2)
    
    leave_data = {
        "leave_type": "Casual",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "reason": "Family gathering out of state"
    }
    status, leave_res = make_request("/api/leaves", data=leave_data, headers=headers)
    assert status == 201, f"Leave request failed: {leave_res}"
    leave_id = leave_res["id"]
    print(f"Success: Leave request created with ID: {leave_id}, Status: {leave_res['status']}, Duration: {leave_res['duration_days']} days")

    # 6. Manager approves the Leave
    print("\n[6/7] Manager reviews and approves the pending leave request...")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    status, approve_res = make_request(f"/api/leaves/{leave_id}/approve", method="PUT", headers=mgr_headers)
    assert status == 200, f"Approve failed: {approve_res}"
    assert approve_res["status"] == "Approved", f"Expected Approved status, got: {approve_res['status']}"
    print("Success: Manager approved the leave request. Notification email logged.")

    # 7. CASCADING SYNC VERIFICATION
    print("\n[7/7] Verifying CASCADING SYNC: checking attendance grid for automatic 'OnLeave' entries...")
    # Fetch history for the leave range
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = end_date.strftime("%Y-%m-%d")
    
    status, history_res = make_request(
        f"/api/attendance/history?start_date={start_str}&end_date={end_str}", 
        headers=headers
    )
    assert status == 200, f"Failed to fetch attendance history: {history_res}"
    
    print(f"Found {len(history_res)} attendance entries for leave dates [{start_str} to {end_str}]:")
    for r in history_res:
        print(f" - Date: {r['date']}, Status: {r['status']}, IP: {r['check_in_ip']}")
        assert r["status"] == "OnLeave", f"Expected status 'OnLeave', found: {r['status']}"

    print("\nSUCCESS: INTEGRATION TEST SUCCEEDED! All synchronization cascades, checks, and approvals worked flawlessly!")

if __name__ == "__main__":
    run_integration_test()
