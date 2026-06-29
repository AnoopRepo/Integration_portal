import uuid
from datetime import datetime
from typing import List, Optional, Dict
from app.knowledge.interfaces.repository import KnowledgeRepositoryInterface
from app.knowledge.schemas.knowledge import (
    KnowledgeRecord, 
    KnowledgeCreate, 
    KnowledgeUpdate, 
    KnowledgeCategory
)

class InMemoryKnowledgeRepository(KnowledgeRepositoryInterface):
    """
    In-memory mock/stub implementation of the KnowledgeRepositoryInterface.
    Provides functional state persistence for testing controllers, services, and pipelines.
    No physical storage (files or databases) is touched.
    """

    def __init__(self) -> None:
        # Internal dictionary to hold knowledge records in memory.
        # Key: record ID (str), Value: KnowledgeRecord object
        self._storage: Dict[str, KnowledgeRecord] = {}

    async def save(self, record: KnowledgeCreate) -> KnowledgeRecord:
        record_id = f"know_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow()
        
        saved_record = KnowledgeRecord(
            id=record_id,
            title=record.title,
            category=record.category,
            content=record.content,
            source=record.source,
            metadata=record.metadata,
            created_at=now,
            updated_at=now
        )
        
        self._storage[record_id] = saved_record
        return saved_record

    async def get(self, record_id: str) -> Optional[KnowledgeRecord]:
        return self._storage.get(record_id)

    async def update(self, record_id: str, update_data: KnowledgeUpdate) -> Optional[KnowledgeRecord]:
        record = self._storage.get(record_id)
        if not record:
            return None
            
        # Extract fields to update
        now = datetime.utcnow()
        updated_dict = record.dict()
        
        # Merge source sub-model if provided
        if update_data.source is not None:
            updated_dict["source"] = update_data.source.dict()
            
        # Merge main fields
        for field in ["title", "category", "content", "metadata"]:
            value = getattr(update_data, field)
            if value is not None:
                updated_dict[field] = value
                
        updated_dict["updated_at"] = now
        
        updated_record = KnowledgeRecord(**updated_dict)
        self._storage[record_id] = updated_record
        return updated_record

    async def delete(self, record_id: str) -> bool:
        if record_id in self._storage:
            del self._storage[record_id]
            return True
        return False

    async def list_records(
        self, 
        category: Optional[KnowledgeCategory] = None, 
        limit: int = 100, 
        offset: int = 0
    ) -> List[KnowledgeRecord]:
        records = list(self._storage.values())
        
        # Sort by creation time descending by default
        records.sort(key=lambda x: x.created_at, reverse=True)
        
        # Filter by category if supplied
        if category:
            records = [r for r in records if r.category == category]
            
        # Apply offset and limit
        return records[offset : offset + limit]

    async def search(
        self, 
        query: str, 
        category: Optional[KnowledgeCategory] = None, 
        limit: int = 10,
        offset: int = 0
    ) -> List[KnowledgeRecord]:
        records = list(self._storage.values())
        records.sort(key=lambda x: x.created_at, reverse=True)
        
        # Filter by category if supplied
        if category:
            records = [r for r in records if r.category == category]
            
        # Substring/Keywords search in title and content (case-insensitive)
        query_lower = query.lower()
        matched = []
        for r in records:
            if query_lower in r.title.lower() or query_lower in r.content.lower():
                matched.append(r)
                
        return matched[offset : offset + limit]


# Global singleton instance of the repository
knowledge_repo = InMemoryKnowledgeRepository()
