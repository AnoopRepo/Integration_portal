import urllib.request
import urllib.error
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

def setup_feedback_data():
    print("[+] Seeding feedback database with clean mock data...")
    import os
    from dotenv import load_dotenv
    try:
        from pymongo import MongoClient
        from bson import ObjectId
        
        load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
        mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        print(f"    -> Connecting to MongoDB at: {mongo_uri}")
        
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
        client.server_info()
        
        db = client.get_default_database(default="daily_work_reports")
        print("    -> Connected to MongoDB. Purging and seeding mock feedback...")
        
        db.feedback.delete_many({})
        
        mock_fb_path = os.path.join(os.path.dirname(__file__), "mock_feedback.json")
        with open(mock_fb_path, "r") as f:
            feedbacks = json.load(f)
            
        for fb in feedbacks:
            doc = fb.copy()
            if "_id" in doc:
                doc["_id"] = ObjectId(doc["_id"])
            db.feedback.insert_one(doc)
            
        print("    -> Feedback collection seeded successfully.")
    except Exception as e:
        print(f"    -> MongoDB feedback seeding skipped / fell back to Mock JSON DB: {e}")

def run_tests():
    print("====================================================")
    print("STARTING HR PORTAL EXTENDED FEATURES E2E VERIFICATION")
    print("====================================================")
    
    # 0. Setup feedback mock data
    setup_feedback_data()
    
    # 1. Setup Test User Accounts
    emp_signup_data = {
        "name": "Jane Developer",
        "email": "jane.dev@workpulse.com",
        "password": "janepassword123",
        "role": "general",
        "department": "Engineering"
    }
    
    admin_signup_data = {
        "name": "HR Manager Admin",
        "email": "hr.admin@workpulse.com",
        "password": "hradminpassword123",
        "role": "admin",
        "department": "HR Ops"
    }
    
    print("\n[+] Registering test users...")
    make_request("/api/auth/signup", "POST", emp_signup_data)
    make_request("/api/auth/signup", "POST", admin_signup_data)
    
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
        return otp_res["access_token"], otp_res["user"]["id"]

    # Login Jane (Standard User)
    jane_token, jane_id = authenticate("jane.dev@workpulse.com", "janepassword123", "general")
    jane_headers = {"Authorization": f"Bearer {jane_token}"}
    
    # Login HR Admin
    admin_token, admin_id = authenticate("hr.admin@workpulse.com", "hradminpassword123", "admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    print(f"    -> Jane Developer (User) logged in successfully. ID: {jane_id}")
    print(f"    -> HR Manager (Admin) logged in successfully. ID: {admin_id}")

    # ──────────────────────────────────────────────────────────────────────────
    # 1. RESUME SCREENING
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[1] Testing Resume Screening & Recruitment...")
    
    cand_data = {
        "name": "Alan Turing",
        "email": "alan.turing@enigma.org",
        "phone": "+44-20-7946-0958",
        "experience_years": 10.0,
        "role_applied": "Lead Cryptographer",
        "skills": ["Python", "C++", "Cybersecurity", "Number Theory"],
        "resume_url": "https://workpulse.com/resumes/alan_turing.pdf",
        "notes": "Pioneer of computing science. Exceptional intelligence."
    }
    
    # User tries to list/create candidates (Should get 403)
    status, res = make_request("/api/hr/candidates", "GET", headers=jane_headers)
    assert status == 403, f"Expected 403 for general user listing candidates, got {status}"
    
    # Admin lists candidates (Should succeed)
    status, initial_candidates = make_request("/api/hr/candidates", "GET", headers=admin_headers)
    assert status == 200, f"Expected 200 for admin listing candidates, got {status} {initial_candidates}"
    
    # Admin creates new candidate profile
    status, new_cand = make_request("/api/hr/candidates", "POST", cand_data, headers=admin_headers)
    assert status == 201, f"Expected 201 on candidate creation, got {status} {new_cand}"
    cand_id = new_cand["id"]
    print(f"    -> Admin successfully created candidate: {new_cand['name']} (ID: {cand_id})")
    
    # Admin updates candidate status & score
    update_payload = {
        "status": "Shortlisted",
        "score": 98,
        "notes": "Verified. Interviewing immediately."
    }
    status, updated_cand = make_request(f"/api/hr/candidates/{cand_id}/status", "PUT", update_payload, headers=admin_headers)
    assert status == 200
    assert updated_cand["status"] == "Shortlisted"
    assert updated_cand["score"] == 98
    print("    -> Admin successfully updated candidate status to Shortlisted and scored 98.")

    # ──────────────────────────────────────────────────────────────────────────
    # 2. INTERVIEW SCHEDULING
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[2] Testing Interview Scheduling...")
    
    interview_data = {
        "candidate_id": cand_id,
        "candidate_name": "Alan Turing",
        "interviewer_name": "HR Manager Admin & Jane Developer",
        "date": "2026-06-01T15:00:00.000000",
        "format": "Technical Zoom Meeting",
        "meeting_link": "https://zoom.us/j/enigma-key",
        "notes": "Assess decoding pipelines and computing limits."
    }
    
    # Admin schedules the interview
    status, new_int = make_request("/api/hr/interviews", "POST", interview_data, headers=admin_headers)
    assert status == 201, f"Expected 201 on interview schedule, got {status}"
    int_id = new_int["id"]
    print(f"    -> Admin scheduled interview for {new_int['candidate_name']} (ID: {int_id})")
    
    # Jane lists interviews (she is listed in interviewer_name, should see it)
    status, jane_interviews = make_request("/api/hr/interviews", "GET", headers=jane_headers)
    assert status == 200
    jane_saw_int = any(i["id"] == int_id for i in jane_interviews)
    assert jane_saw_int, "Jane should see the interview because her name is in the interviewer list"
    print("    -> Interviewer visibility: Jane lists and sees the interview (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # 3. ONBOARDING CHECKLISTS
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[3] Testing Onboarding Workflows...")
    
    # Let's seed an onboarding checklist for Jane Developer
    onb_data = {
        "employee_id": jane_id,
        "employee_name": "Jane Developer",
        "tasks": [
            {"id": "jt1", "title": "Submit Passport Copy", "completed": False, "due_date": "2026-06-01"},
            {"id": "jt2", "title": "Sign NDA Agreement", "completed": False, "due_date": "2026-06-02"},
            {"id": "jt3", "title": "Configure Dev Laptop", "completed": False, "due_date": "2026-06-05"}
        ]
    }
    
    # Admin creates onboarding checklist
    status, new_onb = make_request("/api/hr/onboarding", "POST", onb_data, headers=admin_headers)
    assert status == 201, f"Expected 201 on onboarding checklist creation, got {status} {new_onb}"
    onb_id = new_onb["id"]
    print(f"    -> Admin successfully created onboarding checklist for Jane. (ID: {onb_id})")
    
    # Jane lists her onboarding checklist
    status, jane_onb_list = make_request("/api/hr/onboarding", "GET", headers=jane_headers)
    assert status == 200
    assert len(jane_onb_list) == 1
    assert jane_onb_list[0]["id"] == onb_id
    print("    -> Self onboarding list fetch: Jane sees her checklist (Passed)")
    
    # Jane toggles the first onboarding task ("jt1" -> submit passport)
    status, updated_onb = make_request(f"/api/hr/onboarding/{onb_id}/tasks/jt1/toggle", "PUT", headers=jane_headers)
    assert status == 200
    assert updated_onb["tasks"][0]["completed"] is True
    print("    -> Jane successfully checked off onboarding task: 'Submit Passport Copy'.")

    # ──────────────────────────────────────────────────────────────────────────
    # 4. EMPLOYEE DOCUMENTATION
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[4] Testing Employee Documentation Registry...")
    
    doc_payload = {
        "title": "Jane Degree Certificate",
        "category": "Education",
        "filename": "jane_btech_degree.pdf",
        "file_size": "1.8 MB"
    }
    
    # Jane uploads/registers a document
    status, new_doc = make_request("/api/hr/documents", "POST", doc_payload, headers=jane_headers)
    assert status == 201, f"Expected 201 on document upload, got {status} {new_doc}"
    doc_id = new_doc["id"]
    print(f"    -> Jane uploaded a new document: '{new_doc['title']}' (ID: {doc_id})")
    
    # Admin lists documents and should see Jane's document
    status, admin_docs = make_request("/api/hr/documents", "GET", headers=admin_headers)
    assert status == 200
    saw_jane_doc = any(d["id"] == doc_id for d in admin_docs)
    assert saw_jane_doc, "Admin should see Jane's uploaded document"
    print("    -> Document Registry: Admin lists and sees Jane's degree certificate (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # 5. POLICY ACKNOWLEDGEMENT & COMPLIANCE
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[5] Testing Compliance Policy Acknowledgement...")
    
    policy_payload = {
        "title": "WorkPulse Remote Work Security Policy V2",
        "category": "Compliance",
        "description": "All developers must connect via secure WireGuard tunnel and enforce full disk encryption.",
        "effective_date": "2026-06-01"
    }
    
    # Admin creates the compliance policy
    status, new_policy = make_request("/api/hr/policies", "POST", policy_payload, headers=admin_headers)
    assert status == 201
    policy_id = new_policy["id"]
    print(f"    -> Admin published compliance policy: '{new_policy['title']}' (ID: {policy_id})")
    
    # Jane lists policies, it should show 'acknowledged: False'
    status, jane_policies = make_request("/api/hr/policies", "GET", headers=jane_headers)
    assert status == 200
    my_policy = next(p for p in jane_policies if p["id"] == policy_id)
    assert my_policy["acknowledged"] is False
    print("    -> Initial sign-off check: Policy marked as UN-acknowledged for Jane. (Passed)")
    
    # Jane signs/acknowledges the policy
    status, signed_policy = make_request(f"/api/hr/policies/{policy_id}/acknowledge", "POST", headers=jane_headers)
    assert status == 200
    assert signed_policy["acknowledged"] is True
    print(f"    -> Jane successfully signed and acknowledged remote work security policy. (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # 6. TRAINING & PROGRESS CASCADING
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[6] Testing Training Progress Auto-Cascading...")
    
    # Seed a training record dynamically for Jane Developer using the POST trainings route
    jane_trn_payload = {
        "employee_id": jane_id,
        "employee_name": "Jane Developer",
        "course_name": "Advanced FastAPI Microservices & OAuth2 Security",
        "provider": "FastAPI Masters Academy",
        "tasks": [
            {"id": "jct1", "title": "Pydantic V2 migration and field definitions", "completed": True},
            {"id": "jct2", "title": "Database connection pooling and lifespan context managers", "completed": True},
            {"id": "jct3", "title": "JWT generation and simulated OTP 2FA setup", "completed": True},
            {"id": "jct4", "title": "CORS rules and security header headers", "completed": False}
        ]
    }
    
    status, new_trn = make_request("/api/hr/trainings", "POST", jane_trn_payload, headers=admin_headers)
    assert status == 201, f"Expected 201 on training creation, got {status} {new_trn}"
    trn_id = new_trn["id"]
    print(f"    -> Admin successfully assigned course '{new_trn['course_name']}' to Jane. Progress is at {new_trn['progress']}%")
    assert new_trn["progress"] == 75
    
    # Jane toggles the last task "jct4" as completed (should automatically make progress 100% and status "Completed")
    status, updated_trn = make_request(f"/api/hr/trainings/{trn_id}/tasks/jct4/toggle", "PUT", headers=jane_headers)
    assert status == 200
    assert updated_trn["progress"] == 100
    assert updated_trn["status"] == "Completed"
    print(f"    -> Auto-calculating Progress: Completed last module! Progress is now {updated_trn['progress']}%, Status: {updated_trn['status']}. (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # 7. PERFORMANCE REVIEWS
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[7] Testing Performance Evaluations...")
    
    # Jane submits her Q1 self review self_score and self_feedback
    jane_review_payload = {
        "review_period": "Q1 2026",
        "self_score": 4.2,
        "self_feedback": "I have successfully designed and built multiple secure web application modules, registered routers and validated schemas."
    }
    status, jane_self_res = make_request("/api/hr/performance", "POST", jane_review_payload, headers=jane_headers)
    assert status == 200
    assert jane_self_res["self_score"] == 4.2
    assert jane_self_res["employee_name"] == "Jane Developer"
    print("    -> Self-Review: Jane successfully submitted her Q1 self-review.")
    
    # HR Admin completes Jane's review by scoring her and giving manager feedback
    mgr_review_payload = {
        "employee_id": jane_id,
        "review_period": "Q1 2026",
        "manager_score": 4.6,
        "manager_feedback": "Jane is doing excellent! Her integration tests are extremely clean and solid.",
        "strengths": ["FastAPI", "Test Suites", "Punctuality"],
        "goals": ["Expand React front-end interactive mock dashboards next week"]
    }
    status, final_review_res = make_request("/api/hr/performance", "POST", mgr_review_payload, headers=admin_headers)
    assert status == 200
    assert final_review_res["self_score"] == 4.2
    assert final_review_res["manager_score"] == 4.6
    assert final_review_res["status"] == "Finalized"
    print("    -> Manager Evaluation: Admin successfully completed the review and finalized the score to 4.6.")

    # ──────────────────────────────────────────────────────────────────────────
    # 8. ENGAGEMENT SURVEYS & FEEDBACK
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[8] Testing Anonymous Engagement Surveys...")
    
    feedback_payload = {
        "rating_workplace": 5,
        "rating_management": 5,
        "rating_worklife": 4,
        "suggestions": "This HR Portal system is fully working and looks stunning! Highly aesthetic."
    }
    
    # Submit anonymous feedback (no token needed, fully anonymous)
    status, new_fb = make_request("/api/hr/feedback", "POST", feedback_payload)
    assert status == 201, f"Expected 201 on feedback submission, got {status}"
    print(f"    -> Successfully submitted anonymous survey. ID: {new_fb['id']}")
    
    # Admin pulls metrics and verifies the average score calculation
    status, metrics = make_request("/api/hr/feedback", "GET", headers=admin_headers)
    assert status == 200
    assert metrics["total_responses"] >= 3 # pre-seeded ones + our new one
    assert metrics["average_workplace"] > 4.0
    print(f"    -> Aggregated feedback check: Admin fetches statistics: Total responses: {metrics['total_responses']}, Workplace satisfaction: {metrics['average_workplace']}/5. (Passed)")

    print("\n====================================================")
    print("ALL Extended HR Endpoints E2E Verification Passed Successfully!")
    print("====================================================")

if __name__ == "__main__":
    run_tests()
