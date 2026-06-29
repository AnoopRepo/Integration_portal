from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import logging
import socket

logger = logging.getLogger("uvicorn.error")

def is_mongo_port_open(uri: str) -> bool:
    try:
        if "localhost" in uri or "127.0.0.1" in uri:
            port = 27017
            if ":" in uri:
                parts = uri.split(":")
                if len(parts) >= 3:
                    port_str = parts[-1].split("/")[0].split("?")[0]
                    if port_str.isdigit():
                        port = int(port_str)
            s = socket.create_connection(("localhost", port), timeout=1.0)
            s.close()
            return True
        return True
    except Exception:
        return False

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_helper = Database()

def get_database():
    if db_helper.db is None:
        logger.info("ℹ️ Using Local Mock JSON Database (MongoDB option disabled)!")
        from app.mock_db import MockDatabase
        db_helper.db = MockDatabase()
    return db_helper.db

def close_database():
    pass
