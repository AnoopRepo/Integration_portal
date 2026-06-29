import urllib.request
import json
import time

API_URL = "http://localhost:8000"

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

def run_tests():
    print("====================================================")
    print("STARTING ADMIN HUB END-TO-END VERIFICATION")
    print("====================================================")
    
    # 1. Setup Admin and Standard Staff user credentials
    admin_signup_data = {
        "name": "System Admin",
        "email": "system.admin@workpulse.com",
        "password": "adminpassword123",
        "role": "admin"
    }
    staff_signup_data = {
        "name": "John Staff",
        "email": "john.staff.adminhub@workpulse.com",
        "password": "staffpassword123",
        "role": "general"
    }
    
    print("\n[+] Registering/Logging in test users...")
    
    # Sign up users
    make_request("/api/auth/signup", "POST", admin_signup_data)
    make_request("/api/auth/signup", "POST", staff_signup_data)
    
    # Helper to authenticate with 2FA/OTP
    def authenticate(email, password, role):
        status, res = make_request("/api/auth/login", "POST", {
            "email": email,
            "password": password,
            "role": role
        })
        assert status == 200, f"Login stage 1 failed for {email}: {status} {res}"
        
        # Verify OTP
        otp_status, otp_res = make_request("/api/auth/verify-otp", "POST", {
            "email": email,
            "otp": res["simulated_otp"],
            "role": role
        })
        assert otp_status == 200, f"OTP verification failed for {email}: {otp_status} {otp_res}"
        return otp_res["access_token"]

    # Login Admin
    admin_token = authenticate("system.admin@workpulse.com", "adminpassword123", "admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Login Staff
    staff_token = authenticate("john.staff.adminhub@workpulse.com", "staffpassword123", "general")
    staff_headers = {"Authorization": f"Bearer {staff_token}"}
    
    print("    -> Admin Token acquired via 2FA.")
    print("    -> Staff Token acquired via 2FA.")

    # ──────────────────────────────────────────────────────────────────────────
    # 1. ASSET MANAGEMENT
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[1] Testing Asset Management...")
    
    # Staff trying to list assets (Forbidden)
    status, res = make_request("/api/admin/assets", "GET", headers=staff_headers)
    assert status == 403, f"Expected 403 Forbidden, got {status}"
    print("    -> RBAC Check: Staff blocked from listing assets (Passed)")
    
    # Admin creates an asset
    asset_data = {
        "name": "MacBook Pro 16",
        "serial_number": "MBP-2026-X89",
        "category": "Hardware",
        "assigned_to": "John Staff",
        "assigned_name": "John Staff",
        "status": "Assigned",
        "purchase_date": "2026-05-01",
        "value": 2499.99
    }
    status, res = make_request("/api/admin/assets", "POST", asset_data, headers=admin_headers)
    assert status == 201, f"Create asset failed: {status} {res}"
    asset_id = res["id"]
    print(f"    -> Admin created asset successfully (ID: {asset_id})")
    
    # Admin lists assets
    status, res = make_request("/api/admin/assets", "GET", headers=admin_headers)
    assert status == 200 and len(res) >= 1, "List assets failed"
    print(f"    -> Admin listed assets successfully (Count: {len(res)})")
    
    # Admin updates asset
    asset_data["value"] = 2599.99
    status, res = make_request(f"/api/admin/assets/{asset_id}", "PUT", asset_data, headers=admin_headers)
    assert status == 200 and res["value"] == 2599.99, "Update asset failed"
    print("    -> Admin updated asset value (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # 2. OFFICE INVENTORY
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[2] Testing Office Inventory Tracking...")
    
    # Staff trying to list inventory (Forbidden)
    status, res = make_request("/api/admin/inventory", "GET", headers=staff_headers)
    assert status == 403
    print("    -> RBAC Check: Staff blocked from listing inventory (Passed)")
    
    # Admin creates inventory item
    inv_data = {
        "name": "Ergonomic Chairs",
        "category": "Furniture",
        "quantity": 15,
        "unit": "pcs",
        "min_threshold": 5,
        "location": "Bay C"
    }
    status, res = make_request("/api/admin/inventory", "POST", inv_data, headers=admin_headers)
    assert status == 201, f"Create inventory failed: {status} {res}"
    item_id = res["id"]
    print(f"    -> Admin created inventory item (ID: {item_id})")
    
    # Admin updates item quantity to trigger low-stock warning threshold simulation
    inv_data["quantity"] = 3
    status, res = make_request(f"/api/admin/inventory/{item_id}", "PUT", inv_data, headers=admin_headers)
    assert status == 200 and res["quantity"] == 3
    print("    -> Admin updated inventory quantity down (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # 3. VENDOR COORDINATION
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[3] Testing Vendor Coordination...")
    
    vendor_data = {
        "name": "SuperClean Services",
        "contact_name": "Jane Clean",
        "email": "jane@superclean.com",
        "phone": "+1-555-0199",
        "services": "Facilities Management",
        "contract_start": "2026-01-01",
        "contract_end": "2027-01-01",
        "status": "Active"
    }
    status, res = make_request("/api/admin/vendors", "POST", vendor_data, headers=admin_headers)
    assert status == 201, f"Create vendor failed: {status} {res}"
    vendor_id = res["id"]
    print(f"    -> Admin created vendor (ID: {vendor_id})")
    
    status, res = make_request("/api/admin/vendors", "GET", headers=admin_headers)
    assert status == 200 and len(res) >= 1
    print("    -> Admin listed vendors (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # 4. REMINDERS & ESCALATIONS
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[4] Testing Reminders & Escalations...")
    
    reminder_data = {
        "title": "Renew Cleaners Contract",
        "description": "Cleaners contract expires in 30 days. Need negotiation.",
        "type": "Reminder",
        "target_user": "6a0e8d5412817bbd568797fd",
        "target_name": "System Admin",
        "status": "Pending",
        "due_date": "2026-06-20"
    }
    status, res = make_request("/api/admin/reminders", "POST", reminder_data, headers=admin_headers)
    assert status == 201, f"Create reminder failed: {status} {res}"
    reminder_id = res["id"]
    print(f"    -> Admin created Reminder (ID: {reminder_id})")
    
    # Admin resolves reminder
    status, res = make_request(f"/api/admin/reminders/{reminder_id}/resolve", "PUT", headers=admin_headers)
    assert status == 200 and res["status"] == "Resolved"
    print("    -> Admin resolved reminder (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # 5. MEETING SCHEDULING
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[5] Testing Meeting Room Scheduling...")
    
    # Staff lists meetings (Should see none initially, or only their own)
    status, res = make_request("/api/meetings", "GET", headers=staff_headers)
    assert status == 200
    print(f"    -> Staff fetched meetings (Count: {len(res)})")
    
    # Admin schedules meeting and invites staff
    meeting_data = {
        "title": "Q2 Performance Review",
        "agenda": "Reviewing goals and objectives",
        "room": "Conference Room A",
        "date": "2026-06-01",
        "start_time": "10:00 AM",
        "end_time": "11:00 AM",
        "attendees": ["john.staff.adminhub@workpulse.com"]
    }
    status, res = make_request("/api/admin/meetings", "POST", meeting_data, headers=admin_headers)
    assert status == 201, f"Create meeting failed: {status} {res}"
    meeting_id = res["id"]
    print(f"    -> Admin scheduled room booking (ID: {meeting_id})")
    
    # Staff lists meetings again (should now see it because they are an attendee)
    status, res = make_request("/api/meetings", "GET", headers=staff_headers)
    assert status == 200 and len(res) >= 1
    assert res[0]["title"] == "Q2 Performance Review"
    print("    -> Staff successfully sees meeting invited to (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # 6. EXPENSE TRACKING
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[6] Testing Expense Submission & Admin Auditing...")
    
    # Staff submits an expense claim
    expense_data = {
        "amount": 125.50,
        "category": "Meals & Entertainment",
        "description": "Client Lunch",
        "date": "2026-05-20"
    }
    status, res = make_request("/api/expenses", "POST", expense_data, headers=staff_headers)
    assert status == 201, f"Create expense failed: {status} {res}"
    expense_id = res["id"]
    print(f"    -> Staff submitted an expense claim of $125.50 (ID: {expense_id})")
    
    # Admin audits the expense (Approves with comment)
    audit_data = {
        "status": "Approved",
        "comments": "Approved. Fits standard client entertainment budget guidelines."
    }
    status, res = make_request(f"/api/admin/expenses/{expense_id}/status", "PUT", audit_data, headers=admin_headers)
    assert status == 200 and res["status"] == "Approved" and res["comments"] == audit_data["comments"]
    print("    -> Admin audited and approved the expense claim (Passed)")
    
    # Staff tries to delete approved expense (Should be rejected with 400 since it is finalized)
    status, res = make_request(f"/api/expenses/{expense_id}", "DELETE", headers=staff_headers)
    assert status == 400, f"Expected 400 for deleting finalized expense, got {status} {res}"
    print("    -> RBAC Check: Staff blocked from deleting finalized expense (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # 7. DOCUMENT ORGANIZATION
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[7] Testing Document Bookmarking & Visibility...")
    
    # Admin uploads Public Policy Document
    doc_public = {
        "title": "Standard Operating Handbook",
        "category": "HR Policies",
        "description": "Company handbook",
        "file_url": "http://internal-docs/handbook.pdf",
        "is_public": True
    }
    status, res = make_request("/api/admin/documents", "POST", doc_public, headers=admin_headers)
    assert status == 201, f"Create public doc failed: {status} {res}"
    public_doc_id = res["id"]
    
    # Admin uploads Confidential Document
    doc_private = {
        "title": "Executive Payroll Breakdown Q2",
        "category": "Finance",
        "description": "Q2 Finance report",
        "file_url": "http://internal-docs/payroll.pdf",
        "is_public": False
    }
    status, res = make_request("/api/admin/documents", "POST", doc_private, headers=admin_headers)
    assert status == 201, f"Create private doc failed: {status} {res}"
    private_doc_id = res["id"]
    print("    -> Admin uploaded public and confidential documents")
    
    # Staff fetches documents (should see ONLY public)
    status, docs_staff = make_request("/api/documents", "GET", headers=staff_headers)
    assert status == 200
    private_in_staff = any(d["id"] == private_doc_id for d in docs_staff)
    public_in_staff = any(d["id"] == public_doc_id for d in docs_staff)
    assert public_in_staff and not private_in_staff
    print("    -> Staff document check: Public is visible, Confidential is hidden (Passed)")
    
    # Admin fetches documents (should see both)
    status, docs_admin = make_request("/api/documents", "GET", headers=admin_headers)
    assert status == 200
    private_in_admin = any(d["id"] == private_doc_id for d in docs_admin)
    public_in_admin = any(d["id"] == public_doc_id for d in docs_admin)
    assert public_in_admin and private_in_admin
    print("    -> Admin document check: Both Public and Confidential are visible (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # CLEANUP (DELETE TEST DATA TO KEEP DB CLEAN)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[+] Cleaning up test data...")
    make_request(f"/api/admin/assets/{asset_id}", "DELETE", headers=admin_headers)
    make_request(f"/api/admin/inventory/{item_id}", "DELETE", headers=admin_headers)
    make_request(f"/api/admin/vendors/{vendor_id}", "DELETE", headers=admin_headers)
    make_request(f"/api/admin/reminders/{reminder_id}", "DELETE", headers=admin_headers)
    make_request(f"/api/admin/meetings/{meeting_id}", "DELETE", headers=admin_headers)
    make_request(f"/api/expenses/{expense_id}", "DELETE", headers=admin_headers) # Admin bypasses status check
    make_request(f"/api/admin/documents/{public_doc_id}", "DELETE", headers=admin_headers)
    make_request(f"/api/admin/documents/{private_doc_id}", "DELETE", headers=admin_headers)
    print("    -> Cleaned up all test records.")
    
    print("\n====================================================")
    print("ALL TESTS PASSED SUCCESSFULLY! BACKEND STABLE!")
    print("====================================================")

if __name__ == "__main__":
    run_tests()
