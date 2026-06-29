import json
import os
import bcrypt
from pymongo import MongoClient
from dotenv import load_dotenv
from bson import ObjectId

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def reset():
    print("[+] Dynamically hashing password 'securepassword123' on your local system...")
    hash_val = get_password_hash("securepassword123")
    print(f"    -> Generated hash: {hash_val}")
    
    mock_users_path = os.path.join(os.path.dirname(__file__), "mock_users.json")
    with open(mock_users_path, "r") as f:
        users = json.load(f)
        
    for u in users:
        u["password"] = hash_val
        
    with open(mock_users_path, "w") as f:
        json.dump(users, f, indent=2)
    print("    -> Updated mock_users.json on disk.")

    try:
        load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
        mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        print(f"    -> Connecting to MongoDB at: {mongo_uri}")
        
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        client.server_info()
        
        db = client.get_default_database(default="daily_work_reports")
        print("    -> Connected. Purging and re-seeding users collection...")
        
        db.users.delete_many({})
        for u in users:
            doc = u.copy()
            if "_id" in doc:
                doc["_id"] = ObjectId(doc["_id"])
            if "id" in doc:
                del doc["id"]
            db.users.insert_one(doc)
            
        print("    -> MongoDB Atlas seeded successfully!")
        print("\n==========================================================")
        print("SUCCESS: Every single account password is now 'securepassword123'")
        print("==========================================================")
    except Exception as e:
        print(f"    -> Seeding failed: {e}")

if __name__ == "__main__":
    reset()
