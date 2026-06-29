import os
from dotenv import load_dotenv

# Load environment variables from the backend/.env file relative to this file
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_path = os.path.join(backend_dir, ".env")
load_dotenv(dotenv_path=dotenv_path, override=True)

class Settings:
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-default-jwt-secret-key-make-it-very-long-and-secure")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    PORT: int = int(os.getenv("PORT", "8000"))

    # SMTP Mail Server Configurations
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_SENDER: str = os.getenv("SMTP_SENDER", "")
    
    # Development mode enables pre-dispatched simulated OTP returns in response
    DEV_MODE: bool = os.getenv("DEV_MODE", "true").lower() == "true"

settings = Settings()
