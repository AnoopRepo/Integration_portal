import json
import os
from datetime import datetime
from bson import ObjectId

def safe_object_id(val):
    if not val:
        return val
    if isinstance(val, ObjectId):
        return val
    val_str = str(val)
    if ObjectId.is_valid(val_str):
        return ObjectId(val_str)
    return val_str

class MockInsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

class MockDeleteResult:
    def __init__(self, deleted_count):
        self.deleted_count = deleted_count

class MockCursor:
    def __init__(self, documents):
        self.documents = documents
        self._index = 0

    def sort(self, field, direction):
        # Direction -1 is descending, 1 is ascending
        reverse = (direction == -1)
        self.documents.sort(key=lambda x: x.get(field) or datetime.min, reverse=reverse)
        return self

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self._index >= len(self.documents):
            raise StopAsyncIteration
        doc = self.documents[self._index]
        self._index += 1
        return doc

    async def to_list(self, length=None):
        if length is None:
            res = self.documents[self._index:]
            self._index = len(self.documents)
            return res
        else:
            end = min(self._index + length, len(self.documents))
            res = self.documents[self._index:end]
            self._index = end
            return res

class MockCollection:
    def __init__(self, collection_name):
        self.name = collection_name
        self.file_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
            f"mock_{collection_name}.json"
        )
        if not os.path.exists(self.file_path):
            self._save_docs([])

    def _load_docs(self):
        try:
            with open(self.file_path, "r") as f:
                data = json.load(f)
                # Convert ISO strings back to datetime and ensure _id exists
                for doc in data:
                    for k in ("created_at", "last_updated", "start_date", "end_date", "date_time", "check_in_time", "check_out_time"):
                        if k in doc and isinstance(doc[k], str):
                            try:
                                doc[k] = datetime.fromisoformat(doc[k])
                            except ValueError:
                                pass
                return data
        except Exception:
            return []

    def _save_docs(self, docs):
        serializable_docs = []
        for doc in docs:
            d = doc.copy()
            if "_id" in d:
                d["_id"] = str(d["_id"])
            for k, v in d.items():
                if isinstance(v, datetime):
                    d[k] = v.isoformat()
                elif isinstance(v, ObjectId):
                    d[k] = str(v)
            serializable_docs.append(d)
        with open(self.file_path, "w") as f:
            json.dump(serializable_docs, f, indent=2)

    def _match_query(self, doc, query):
        if not query:
            return True
        
        # Handle $or query
        if "$or" in query:
            sub_queries = query["$or"]
            for sq in sub_queries:
                if self._match_query(doc, sq):
                    return True
            return False
            
        for k, v in query.items():
            if k == "_id" or k == "id":
                doc_id = str(doc.get("_id", doc.get("id")))
                val_id = str(v)
                if doc_id != val_id:
                    return False
            elif k.endswith("_id") or isinstance(v, ObjectId) or isinstance(doc.get(k), ObjectId):
                doc_val = doc.get(k)
                if doc_val is None or str(doc_val) != str(v):
                    return False
            elif isinstance(v, dict):
                doc_val = doc.get(k)
                for op, val in v.items():
                    if op == "$regex":
                        import re
                        if doc_val is None or not re.search(val, str(doc_val)):
                            return False
                    elif op == "$gte":
                        if doc_val is None or doc_val < val:
                            return False
                    elif op == "$lte":
                        if doc_val is None or doc_val > val:
                            return False
                    elif op == "$gt":
                        if doc_val is None or doc_val <= val:
                            return False
                    elif op == "$lt":
                        if doc_val is None or doc_val >= val:
                            return False
                    elif op == "$ne":
                        if doc_val == val:
                            return False
                    elif op == "$in":
                        if doc_val not in val:
                            return False
            else:
                doc_val = doc.get(k)
                # If field in doc is a list (like attendees), check if v is in the list
                if isinstance(doc_val, list):
                    if v not in doc_val:
                        return False
                elif doc_val != v:
                    return False
        return True

    async def replace_one(self, query, replacement):
        docs = self._load_docs()
        replaced = False
        for i, doc in enumerate(docs):
            if self._match_query(doc, query):
                if "_id" in doc and "_id" not in replacement:
                    replacement["_id"] = doc["_id"]
                if "id" in doc and "id" not in replacement:
                    replacement["id"] = doc["id"]
                docs[i] = replacement
                replaced = True
                break
        if replaced:
            self._save_docs(docs)
        
        class MockReplaceResult:
            def __init__(self, modified_count):
                self.modified_count = modified_count
        return MockReplaceResult(1 if replaced else 0)

    async def find_one(self, query):
        docs = self._load_docs()
        for doc in docs:
            if self._match_query(doc, query):
                if "_id" not in doc and "id" in doc:
                    doc["_id"] = safe_object_id(doc["id"])
                elif "_id" in doc:
                    doc["_id"] = safe_object_id(doc["_id"])
                return doc
        return None

    async def insert_one(self, document):
        docs = self._load_docs()
        
        if "_id" not in document:
            new_id = ObjectId()
            document["_id"] = new_id
            if "id" not in document:
                document["id"] = str(new_id)
        else:
            if "id" not in document:
                document["id"] = str(document["_id"])

        docs.append(document)
        self._save_docs(docs)
        return MockInsertResult(document["_id"])

    def find(self, query=None):
        if query is None:
            query = {}
        docs = self._load_docs()
        matched = []
        for doc in docs:
            if self._match_query(doc, query):
                if "_id" not in doc and "id" in doc:
                    doc["_id"] = safe_object_id(doc["id"])
                elif "_id" in doc:
                    doc["_id"] = safe_object_id(doc["_id"])
                matched.append(doc)
        return MockCursor(matched)

    async def delete_one(self, query):
        docs = self._load_docs()
        new_docs = []
        deleted = False
        for doc in docs:
            if self._match_query(doc, query) and not deleted:
                deleted = True
            else:
                new_docs.append(doc)
        
        self._save_docs(new_docs)
        return MockDeleteResult(1 if deleted else 0)

    async def update_one(self, query, update, upsert=False, **kwargs):
        docs = self._load_docs()
        updated = False
        set_dict = update.get("$set", {})
        
        for doc in docs:
            if self._match_query(doc, query):
                for uk, uv in set_dict.items():
                    if "." in uk:
                        parts = uk.split(".")
                        current = doc
                        for part in parts[:-1]:
                            if part not in current or not isinstance(current[part], dict):
                                current[part] = {}
                            current = current[part]
                        current[parts[-1]] = uv
                    else:
                        doc[uk] = uv
                updated = True
                break
                
        if not updated and upsert:
            new_doc = {}
            for qk, qv in query.items():
                if not qk.startswith("$"):
                    if qk == "_id" or qk == "id":
                        new_doc["_id"] = safe_object_id(qv)
                        new_doc["id"] = str(qv)
                    else:
                        new_doc[qk] = qv
            
            for uk, uv in set_dict.items():
                if "." in uk:
                    parts = uk.split(".")
                    current = new_doc
                    for part in parts[:-1]:
                        if part not in current or not isinstance(current[part], dict):
                            current[part] = {}
                        current = current[part]
                    current[parts[-1]] = uv
                else:
                    new_doc[uk] = uv
            
            if "_id" not in new_doc:
                new_id = ObjectId()
                new_doc["_id"] = new_id
                new_doc["id"] = str(new_id)
            elif "id" not in new_doc:
                new_doc["id"] = str(new_doc["_id"])
                
            docs.append(new_doc)
            updated = True
            
        if updated:
            self._save_docs(docs)
            
        class MockUpdateResult:
            def __init__(self, modified_count):
                self.modified_count = modified_count
                
        return MockUpdateResult(1 if updated else 0)

    async def delete_many(self, query):
        docs = self._load_docs()
        new_docs = []
        deleted_count = 0
        for doc in docs:
            if self._match_query(doc, query):
                deleted_count += 1
            else:
                new_docs.append(doc)
        
        if deleted_count > 0:
            self._save_docs(new_docs)
            
        return MockDeleteResult(deleted_count)


class MockDatabase:
    def __init__(self):
        self.users = MockCollection("users")
        self.reports = MockCollection("reports")
        self.assets = MockCollection("assets")
        self.inventory = MockCollection("inventory")
        self.vendors = MockCollection("vendors")
        self.reminders = MockCollection("reminders")
        self.meetings = MockCollection("meetings")
        self.expenses = MockCollection("expenses")
        self.documents = MockCollection("documents")
        self.document_audit_logs = MockCollection("document_audit_logs")
        self.tickets = MockCollection("tickets")
        self.attendance = MockCollection("attendance")
        self.leave_balances = MockCollection("leave_balances")
        self.leave_records = MockCollection("leave_records")
        self.candidates = MockCollection("candidates")
        self.interviews = MockCollection("interviews")
        self.onboarding = MockCollection("onboarding")
        self.hr_documents = MockCollection("hr_documents")
        self.policy_acknowledgements = MockCollection("policy_acknowledgements")
        self.trainings = MockCollection("trainings")
        self.performance_reviews = MockCollection("performance_reviews")
        self.feedback = MockCollection("feedback")
        self.daily_tasks = MockCollection("daily_tasks")
