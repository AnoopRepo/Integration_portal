import json
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from bson import ObjectId

def seed():
    print("[+] Seeding database with original custom passwords...")
    mock_users_path = os.path.join(os.path.dirname(__file__), "mock_users.json")
    with open(mock_users_path, "r") as f:
        users = json.load(f)

    try:
        load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
        mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        print(f"    -> Connecting to MongoDB at: {mongo_uri}")
        
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        client.server_info()
        
        db = client.get_default_database(default="daily_work_reports")
        print("    -> Connected. Re-seeding users collection...")
        
        db.users.delete_many({})
        for u in users:
            doc = u.copy()
            if "_id" in doc:
                doc["_id"] = ObjectId(doc["_id"])
            if "id" in doc:
                del doc["id"]
            db.users.insert_one(doc)
            
        print("    -> Database seeded with original passwords successfully!")
    except Exception as e:
        print(f"    -> Seeding failed: {e}")

if __name__ == "__main__":
    seed()
