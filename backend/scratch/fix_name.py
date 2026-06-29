import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import get_database

async def fix_name():
    db = get_database()
    result = await db.users.update_one(
        {"email": "anoopyadav5984@gmail.com"},
        {"$set": {"name": "Anoop Yadav"}}
    )
    print(f"Matched: {result.matched_count}, Modified: {result.modified_count}")
    user = await db.users.find_one({"email": "anoopyadav5984@gmail.com"})
    if user:
        print(f"Name is now: {user['name']}")
    else:
        print("User not found in DB")

asyncio.run(fix_name())
