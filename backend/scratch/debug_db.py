import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

async def debug():
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
    mongo_uri = os.getenv("MONGODB_URI")
    print(f"MongoDB URI: {mongo_uri}")
    
    try:
        client = AsyncIOMotorClient(mongo_uri)
        db = client.get_default_database(default="daily_work_reports")
        print("Connected to database:", db.name)
        
        users_count = await db.users.count_documents({})
        print(f"Total users in DB: {users_count}")
        
        cursor = db.users.find({})
        async for u in cursor:
            print(f"User: {u.get('email')} | Role: {u.get('role')} | Hash: {u.get('password')[:20]}...")
            
    except Exception as e:
        print("Error connecting to Atlas:", e)

if __name__ == "__main__":
    asyncio.run(debug())
