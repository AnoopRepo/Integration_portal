import sys
import os
import ssl
import smtplib
from email.mime.text import MIMEText

# Add backend directory to sys.path to import app.config
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from app.config import settings

def test_smtp():
    host = settings.SMTP_HOST
    port = settings.SMTP_PORT
    username = settings.SMTP_USERNAME
    password = settings.SMTP_PASSWORD.replace(" ", "") if settings.SMTP_PASSWORD else ""
    sender = settings.SMTP_SENDER or username

    print("=== WorkPulse SMTP Diagnostic Tool ===")
    print(f"SMTP Host: {host}")
    print(f"SMTP Port: {port}")
    print(f"SMTP Username: {username}")
    print(f"SMTP Password Length: {len(password)} characters")
    print(f"SMTP Sender: {sender}")
    print("--------------------------------------")

    if not username or not password:
        print("[ERROR] SMTP Username or Password is empty! Please verify your backend/.env file.")
        return

    # Construct test email
    msg = MIMEText("This is a WorkPulse diagnostic test email.")
    msg["Subject"] = "WorkPulse SMTP Diagnostic Test"
    msg["From"] = sender
    msg["To"] = username

    try:
        print("[1/3] Connecting to SMTP server...")
        context = ssl.create_default_context()
        
        if port == 465:
            print("Connecting via SMTP_SSL...")
            server = smtplib.SMTP_SSL(host, port, context=context)
        else:
            print("Connecting via standard SMTP...")
            server = smtplib.SMTP(host, port, timeout=10)
            print("[2/3] Starting TLS encryption...")
            server.starttls(context=context)
        
        print("[3/3] Authenticating/Logging in...")
        server.login(username, password)
        print("[SUCCESS] SMTP login succeeded! App Password is correct.")
        
        print("Sending test email...")
        server.sendmail(sender, [username], msg.as_string())
        print("[SUCCESS] Test email sent successfully to your inbox!")
        server.quit()
        
    except smtplib.SMTPAuthenticationError as e:
        print("\n[AUTHENTICATION ERROR] Gmail rejected the credentials!")
        print("Details:", e)
        print("\nPossible solutions:")
        print("1. Double-check that your Google App Password is correct.")
        print("2. Ensure you generated an 'App Password' and NOT your normal Google account password.")
        print("3. Check if your Gmail address is correct in SMTP_USERNAME.")
    except smtplib.SMTPConnectError as e:
        print("\n[CONNECTION ERROR] Failed to connect to the SMTP server!")
        print("Details:", e)
    except Exception as e:
        print("\n[UNEXPECTED ERROR]")
        print("Type:", type(e).__name__)
        print("Details:", str(e))

if __name__ == "__main__":
    test_smtp()
