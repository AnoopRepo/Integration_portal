import urllib.request
import urllib.error
import json
import time
import os
import shutil
from pathlib import Path

API_URL = "http://localhost:8000"

def make_request(path, method="GET", data=None, headers=None, is_form=False):
    url = f"{API_URL}{path}"
    req_headers = {}
    if not is_form:
        req_headers["Content-Type"] = "application/json"
    if headers:
        req_headers.update(headers)
    
    if is_form:
        req_data = data
    else:
        req_data = json.dumps(data).encode("utf-8") if data is not None else None
        
    req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.status
            body_bytes = response.read()
            if not body_bytes or status_code == 204:
                return status_code, None
            # Check if it's JSON or raw file content
            content_type = response.headers.get("Content-Type", "")
            if "application/json" in content_type:
                return status_code, json.loads(body_bytes.decode("utf-8"))
            else:
                return status_code, body_bytes
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
    print("STARTING DOCUMENT CENTER & STORAGE INTEGRATION TESTS")
    print("====================================================")

    # Clean up mock database files to ensure clean test state
    test_dir = Path(__file__).parent
    mock_docs_file = test_dir / "mock_documents.json"
    mock_logs_file = test_dir / "mock_document_audit_logs.json"
    
    if mock_docs_file.exists():
        with open(mock_docs_file, "w") as f:
            json.dump([], f)
    if mock_logs_file.exists():
        with open(mock_logs_file, "w") as f:
            json.dump([], f)

    # Clean up any leftover physical files
    for p in [
        test_dir / "knowledge" / "documents" / "corp_guidelines.txt",
        test_dir / "knowledge" / "policies" / "network_sec_audit.txt",
        test_dir / "knowledge" / "reports" / "network_sec_audit.txt",
    ]:
        if p.exists():
            try:
                os.remove(p)
            except Exception:
                pass


    # 1. Register test accounts
    emp_signup_data = {
        "name": "Bob Developer",
        "email": "bob.dev@workpulse.com",
        "password": "bobpassword123",
        "role": "general",
        "department": "Engineering"
    }
    
    admin_signup_data = {
        "name": "Alice Super Admin",
        "email": "alice.admin@workpulse.com",
        "password": "alicepassword123",
        "role": "admin",
        "department": "Executive"
    }

    print("\n[+] Registering test accounts...")
    make_request("/api/auth/signup", "POST", emp_signup_data)
    make_request("/api/auth/signup", "POST", admin_signup_data)

    def authenticate(email, password, role):
        status, res = make_request("/api/auth/login", "POST", {
            "email": email,
            "password": password,
            "role": role
        })
        assert status == 200, f"Login stage 1 failed: {status} {res}"
        
        otp_status, otp_res = make_request("/api/auth/verify-otp", "POST", {
            "email": email,
            "otp": res["simulated_otp"],
            "role": role
        })
        assert otp_status == 200, f"OTP verification failed: {otp_status} {otp_res}"
        return otp_res["access_token"], otp_res["user"]["id"]

    bob_token, bob_id = authenticate("bob.dev@workpulse.com", "bobpassword123", "general")
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    alice_token, alice_id = authenticate("alice.admin@workpulse.com", "alicepassword123", "admin")
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    print("    -> Bob Developer (User) authenticated.")
    print("    -> Alice Admin (Admin) authenticated.")

    # ──────────────────────────────────────────────────────────────────────────
    # 2. UPLOAD DOCUMENTS
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[2] Testing Document Upload via multipart/form-data...")
    
    # We construct a raw multipart form data payload manually to keep urllib dependency clean
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    
    def build_multipart_form(fields, file_field_name, filename, file_content, content_type="text/plain"):
        body = []
        for name, value in fields.items():
            body.append(f"--{boundary}")
            body.append(f'Content-Disposition: form-data; name="{name}"')
            body.append('')
            body.append(str(value))
        
        body.append(f"--{boundary}")
        body.append(f'Content-Disposition: form-data; name="{file_field_name}"; filename="{filename}"')
        body.append(f'Content-Type: {content_type}')
        body.append('')
        body.append(file_content)
        body.append(f"--{boundary}--")
        body.append('')
        
        payload = "\r\n".join(body).encode("utf-8")
        headers = {
            "Content-Type": f"multipart/form-data; boundary={boundary}"
        }
        return payload, headers

    # Upload document 1: Public Document (Engineering category - maps to knowledge/documents or knowledge/training)
    # Let's map it to "documents"
    fields1 = {
        "title": "Corporate Guidelines",
        "category": "documents",
        "description": "Standard corporate operating procedures",
        "is_public": "true"
    }
    payload1, form_headers1 = build_multipart_form(fields1, "file", "corp_guidelines.txt", "Welcome to the corporate guidelines content.")
    
    # Upload as Alice (Admin)
    headers = alice_headers.copy()
    headers.update(form_headers1)
    status, upload_res1 = make_request("/api/documents/upload", "POST", data=payload1, headers=headers, is_form=True)
    assert status == 201, f"Expected 201 on upload, got {status}: {upload_res1}"
    doc1_id = upload_res1["id"]
    print(f"    -> Admin successfully uploaded public document (ID: {doc1_id})")

    # Upload document 2: Private Document
    fields2 = {
        "title": "Confidential Security Audit",
        "category": "policies",
        "description": "Restricted network vulnerability report",
        "is_public": "false"
    }
    payload2, form_headers2 = build_multipart_form(fields2, "file", "network_sec_audit.txt", "Vulnerability found: Port 22 is open to the public.")
    
    headers = alice_headers.copy()
    headers.update(form_headers2)
    status, upload_res2 = make_request("/api/documents/upload", "POST", data=payload2, headers=headers, is_form=True)
    assert status == 201
    doc2_id = upload_res2["id"]
    print(f"    -> Admin successfully uploaded private document (ID: {doc2_id})")

    # ──────────────────────────────────────────────────────────────────────────
    # 3. LISTING & SEARCH PRIVACY
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[3] Testing Listing and Privacy Constraints...")
    
    # Bob (general employee) list documents: should see doc1 (public) but NOT doc2 (private)
    status, bob_docs = make_request("/api/documents", "GET", headers=bob_headers)
    assert status == 200
    bob_doc_ids = [d["id"] for d in bob_docs]
    assert doc1_id in bob_doc_ids, "Bob should see public guidelines document"
    assert doc2_id not in bob_doc_ids, "Bob should NOT see private security audit document"
    print("    -> Privacy check: Bob sees public files but not private admin files. (Passed)")

    # Alice (admin) list documents: should see both
    status, alice_docs = make_request("/api/documents", "GET", headers=alice_headers)
    assert status == 200
    alice_doc_ids = [d["id"] for d in alice_docs]
    assert doc1_id in alice_doc_ids
    assert doc2_id in alice_doc_ids
    print("    -> Privacy check: Admin sees both public and private documents. (Passed)")

    # Search filter check
    status, search_res = make_request("/api/documents?q=Guidelines", "GET", headers=bob_headers)
    assert status == 200
    assert len(search_res) == 1
    assert search_res[0]["id"] == doc1_id
    print("    -> Search check: Substring matching filtered results successfully. (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # 4. PREVIEW & DOWNLOAD
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[4] Testing Document Preview and Download endpoints...")
    
    # Bob preview public doc
    status, content = make_request(f"/api/documents/preview/{doc1_id}", "GET", headers=bob_headers)
    assert status == 200
    assert b"Welcome to the corporate guidelines content." in content
    print("    -> Preview check: Bob successfully previewed public document. (Passed)")

    # Bob attempt preview private doc (Should get 403)
    status, err_res = make_request(f"/api/documents/preview/{doc2_id}", "GET", headers=bob_headers)
    assert status == 403, f"Expected 403 for private document, got {status}: {err_res}"
    print("    -> Privacy check: Bob denied preview of private document. (Passed)")

    # Bob download public doc
    status, content = make_request(f"/api/documents/download/{doc1_id}", "GET", headers=bob_headers)
    assert status == 200
    assert b"Welcome to the corporate guidelines content." in content
    print("    -> Download check: Bob successfully downloaded public document. (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # 5. MOVE CATEGORY & PHYSICAL SHIFTING
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[5] Testing Moving Category (physical folder move)...")
    
    # Verify file initially exists in policies folder on disk
    old_resolved_path = Path("knowledge/policies/network_sec_audit.txt")
    # Resolve relative path
    old_abs = (Path(__file__).parent / old_resolved_path).resolve()
    assert old_abs.exists(), f"Physical file should be in policies folder, but was not found at {old_abs}"
    
    # Request Move: policies -> reports
    status, move_res = make_request(f"/api/documents/{doc2_id}/category", "PUT", {"category": "reports"}, headers=alice_headers)
    assert status == 200
    assert move_res["category"] == "reports"
    
    # Verify old path is gone and new path has the file
    new_resolved_path = Path("knowledge/reports/network_sec_audit.txt")
    new_abs = (Path(__file__).parent / new_resolved_path).resolve()
    assert not old_abs.exists(), "Old physical file should be deleted after moving"
    assert new_abs.exists(), f"New physical file should be created at target category path: {new_abs}"
    print("    -> Move category: Physical file successfully moved on disk and DB updated. (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # 6. AUDIT LOGGING
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[6] Testing Audit Trail & CSV logs...")
    
    # Non-admin tries to view audit logs (Should get 403)
    status, err_res = make_request("/api/documents/admin/audit-logs", "GET", headers=bob_headers)
    assert status == 403
    print("    -> Privacy check: General employee denied viewing audit trail. (Passed)")

    # Admin pulls audit logs (Should see logs for Upload, Preview, Download, Move)
    status, logs = make_request("/api/documents/admin/audit-logs", "GET", headers=alice_headers)
    assert status == 200
    assert len(logs) >= 5, f"Expected multiple audit logs, got {len(logs)}"
    
    actions = [l["action"] for l in logs]
    print(f"    -> Audit logs recorded: {actions}")
    assert "Upload" in actions
    assert "Preview" in actions
    assert "Download" in actions
    assert "Move" in actions
    
    # Verify CSV export endpoint
    status, csv_data = make_request("/api/documents/admin/audit-logs/csv", "GET", headers=alice_headers)
    assert status == 200
    assert b"Timestamp,User Name,User ID,Action" in csv_data
    print("    -> CSV export check: Audit logs CSV successfully downloaded. (Passed)")

    # ──────────────────────────────────────────────────────────────────────────
    # 7. AI AGENT REBUILD & DELETIONS
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[7] Testing Document Deletion...")
    
    # Emergency Delete as Admin
    status, _ = make_request(f"/api/documents/{doc1_id}", "DELETE", headers=alice_headers)
    assert status == 204
    
    # Verify DB record is gone
    status, current_docs = make_request("/api/documents", "GET", headers=alice_headers)
    assert status == 200
    assert doc1_id not in [d["id"] for d in current_docs]
    
    # Verify physical file is gone
    doc1_abs = (Path(__file__).parent / "knowledge/documents/corp_guidelines.txt").resolve()
    assert not doc1_abs.exists(), "Physical file should be deleted on document deletion"
    
    # Delete doc2
    status, _ = make_request(f"/api/documents/{doc2_id}", "DELETE", headers=alice_headers)
    assert status == 204
    
    print("    -> Deletion check: Document DB record and physical file deleted. (Passed)")

    print("\n====================================================")
    print("ALL DOCUMENT CENTER & STORAGE INTEGRATION TESTS PASSED")
    print("====================================================")

if __name__ == "__main__":
    run_tests()
