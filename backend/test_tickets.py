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
    print("STARTING SUPPORT TICKETS END-TO-END VERIFICATION")
    print("====================================================")
    
    # 1. Setup Test User Accounts
    alice_signup_data = {
        "name": "Alice Support",
        "email": "alice.support@workpulse.com",
        "password": "alicepassword123",
        "role": "general",
        "department": "Customer Support"
    }
    
    bob_signup_data = {
        "name": "Bob IT",
        "email": "bob.test.it@workpulse.com",
        "password": "bobpassword123",
        "role": "general",
        "department": "IT Ops"
    }
    
    charlie_signup_data = {
        "name": "Charlie HR",
        "email": "charlie.hr@workpulse.com",
        "password": "charliepassword123",
        "role": "general",
        "department": "HR & Finance"
    }
    
    admin_signup_data = {
        "name": "Ticket Admin",
        "email": "admin.tickets@workpulse.com",
        "password": "adminpassword123",
        "role": "admin",
        "department": "Engineering"
    }
    
    print("\n[+] Registering/Logging in test users...")
    
    # Sign up users
    make_request("/api/auth/signup", "POST", alice_signup_data)
    make_request("/api/auth/signup", "POST", bob_signup_data)
    make_request("/api/auth/signup", "POST", charlie_signup_data)
    make_request("/api/auth/signup", "POST", admin_signup_data)
    
    # Make the signed up admin a super admin in MongoDB so it can see all tickets
    try:
        import os
        from pymongo import MongoClient
        from dotenv import load_dotenv
        
        load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
        mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
        db = client.get_default_database(default="daily_work_reports")
        db.users.update_one({"email": "admin.tickets@workpulse.com"}, {"$set": {"is_super_admin": True}})
        print("    -> Upgraded Ticket Admin to Super Admin in MongoDB.")
    except Exception as e:
        print(f"    -> Super Admin upgrade failed: {e}")
    
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

    # Login Alice (Customer Support)
    alice_token = authenticate("alice.support@workpulse.com", "alicepassword123", "general")
    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    
    # Login Bob (IT Ops)
    bob_token = authenticate("bob.test.it@workpulse.com", "bobpassword123", "general")
    bob_headers = {"Authorization": f"Bearer {bob_token}"}
    
    # Login Charlie (HR & Finance)
    charlie_token = authenticate("charlie.hr@workpulse.com", "charliepassword123", "general")
    charlie_headers = {"Authorization": f"Bearer {charlie_token}"}
    
    # Login Admin
    admin_token = authenticate("admin.tickets@workpulse.com", "adminpassword123", "admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    print("    -> Alice (Customer Support) logged in successfully via 2FA.")
    print("    -> Bob (IT Ops) logged in successfully via 2FA.")
    print("    -> Charlie (HR & Finance) logged in successfully via 2FA.")
    print("    -> Admin (Engineering) logged in successfully via 2FA.")

    # ──────────────────────────────────────────────────────────────────────────
    # 1. TICKET CREATION
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[1] Testing Support Ticket Creation...")
    
    ticket_data = {
        "title": "VPN Access Request",
        "description": "I need VPN access to work from home on weekends.",
        "priority": "High",
        "target_department": "IT Ops"
    }
    
    status, res = make_request("/api/tickets", "POST", ticket_data, headers=alice_headers)
    assert status == 201, f"Create ticket failed: {status} {res}"
    ticket_id = res["id"]
    print(f"    -> Alice successfully raised ticket '{res['title']}' targeting '{res['target_department']}' (ID: {ticket_id})")
    assert res["status"] == "Open"
    assert res["user_name"] == "Alice Support"
    assert res["user_email"] == "alice.support@workpulse.com"

    # ──────────────────────────────────────────────────────────────────────────
    # 2. QUEUE & VISIBILITY VERIFICATION
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[2] Testing Support Ticket Queue & Visibility...")
    
    # Alice (raiser) lists tickets
    status, tickets_alice = make_request("/api/tickets", "GET", headers=alice_headers)
    assert status == 200
    alice_saw_ticket = any(t["id"] == ticket_id for t in tickets_alice)
    assert alice_saw_ticket, "Alice should see the ticket she raised"
    print("    -> Raiser visibility: Alice successfully sees her own ticket (Passed)")
    
    # Bob (target department staff) lists tickets
    status, tickets_bob = make_request("/api/tickets", "GET", headers=bob_headers)
    assert status == 200
    bob_saw_ticket = any(t["id"] == ticket_id for t in tickets_bob)
    assert bob_saw_ticket, "Bob in IT Ops should see tickets targeted to IT Ops"
    print("    -> Target department visibility: Bob sees ticket routed to IT Ops (Passed)")
    
    # Charlie (third-party user in HR & Finance) lists tickets
    status, tickets_charlie = make_request("/api/tickets", "GET", headers=charlie_headers)
    assert status == 200
    charlie_saw_ticket = any(t["id"] == ticket_id for t in tickets_charlie)
    assert not charlie_saw_ticket, "Charlie in HR & Finance should not see Alice's ticket targeted to IT Ops"
    print("    -> Isolation/Privacy: Charlie in unrelated department does not see the ticket (Passed)")
    
    # Admin lists tickets
    status, tickets_admin = make_request("/api/tickets", "GET", headers=admin_headers)
    assert status == 200
    admin_saw_ticket = any(t["id"] == ticket_id for t in tickets_admin)
    assert admin_saw_ticket, "Admin should see all tickets in the organization"
    print("    -> Admin visibility: Admin successfully sees all tickets (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # 3. TICKET RESOLUTION PERMISSIONS & HANDLING
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[3] Testing Ticket Resolution Flow...")
    
    resolution_data = {
        "resolution_notes": "Granted VPN profile. Details sent via secure email."
    }
    
    # Alice tries to resolve the ticket (Forbidden, not in IT Ops and not admin)
    status, res = make_request(f"/api/tickets/{ticket_id}/resolve", "PUT", resolution_data, headers=alice_headers)
    assert status == 403, f"Expected 403 Forbidden when raiser tries to resolve, got {status} {res}"
    print("    -> Permission check: Raiser without matching department blocked from resolving (Passed)")
    
    # Charlie tries to resolve (Forbidden)
    status, res = make_request(f"/api/tickets/{ticket_id}/resolve", "PUT", resolution_data, headers=charlie_headers)
    assert status == 403, f"Expected 403 Forbidden when third-party department tries to resolve, got {status} {res}"
    print("    -> Permission check: Unrelated department employee blocked from resolving (Passed)")
    
    # Bob (target department) resolves the ticket (Succeeds)
    status, res = make_request(f"/api/tickets/{ticket_id}/resolve", "PUT", resolution_data, headers=bob_headers)
    assert status == 200, f"Bob failed to resolve ticket: {status} {res}"
    assert res["status"] == "Closed"
    assert res["handled_by_name"] == "Bob IT"
    assert res["resolution_notes"] == "Granted VPN profile. Details sent via secure email."
    assert res["resolved_at"] is not None
    print("    -> Resolution: Bob in IT Ops resolved the ticket successfully (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # 4. ADMIN CLEANUP & DELETION
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[4] Testing Deletion & Cleanup...")
    
    # Bob (user) tries to delete ticket (Forbidden)
    status, res = make_request(f"/api/tickets/{ticket_id}", "DELETE", headers=bob_headers)
    assert status == 403, f"Expected 403 Forbidden when standard user tries to delete, got {status}"
    print("    -> RBAC Check: Standard user blocked from deleting tickets (Passed)")
    
    # Admin deletes the ticket (Succeeds)
    status, res = make_request(f"/api/tickets/{ticket_id}", "DELETE", headers=admin_headers)
    assert status == 204 or status == 200, f"Expected 204/200 on successful deletion, got {status}"
    print("    -> Deletion: Admin successfully purged resolved ticket (Passed)")
    
    # Confirm it is no longer listed
    status, tickets_admin_after = make_request("/api/tickets", "GET", headers=admin_headers)
    assert status == 200
    admin_still_saw = any(t["id"] == ticket_id for t in tickets_admin_after)
    assert not admin_still_saw, "Deleted ticket should no longer exist"
    print("    -> Post-Delete Verify: Ticket successfully purged from the database (Passed)")

    print("\n====================================================")
    print("SUPPORT TICKET SYSTEM E2E TESTS PASSED SUCCESSFULLY!")
    print("====================================================")

if __name__ == "__main__":
    run_tests()
