import urllib.request
import json

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
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

# Login Super Admin
status, login_res = make_request("/api/auth/login", "POST", {
    "email": "anoopyadav5984@gmail.com",
    "password": "securepassword123",
    "role": "admin"
})
print("Login status:", status)

status, otp_res = make_request("/api/auth/verify-otp", "POST", {
    "email": "anoopyadav5984@gmail.com",
    "otp": login_res["simulated_otp"],
    "role": "admin"
})
print("OTP status:", status)
token = otp_res["access_token"]

# Request today's dashboard as Super Admin
status, db_res = make_request("/api/attendance/today", "GET", headers={"Authorization": f"Bearer {token}"})
print("Super Admin Dashboard status:", status)
print("Super Admin Dashboard response:", json.dumps(db_res, indent=2) if isinstance(db_res, dict) else db_res)

# Login Eng Admin
status, login_res_eng = make_request("/api/auth/login", "POST", {
    "email": "anoop@example.com",
    "password": "securepassword123",
    "role": "admin"
})
status, otp_res_eng = make_request("/api/auth/verify-otp", "POST", {
    "email": "anoop@example.com",
    "otp": login_res_eng["simulated_otp"],
    "role": "admin"
})
token_eng = otp_res_eng["access_token"]

# Request today's dashboard as Eng Admin
status, db_res_eng = make_request("/api/attendance/today", "GET", headers={"Authorization": f"Bearer {token_eng}"})
print("Eng Admin Dashboard status:", status)
print("Eng Admin Dashboard response:", json.dumps(db_res_eng, indent=2) if isinstance(db_res_eng, dict) else db_res_eng)

