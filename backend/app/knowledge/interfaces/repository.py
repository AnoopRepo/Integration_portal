from abc import ABC, abstractmethod
from typing import List, Optional
from app.knowledge.schemas.knowledge import KnowledgeRecord, KnowledgeCreate, KnowledgeUpdate, KnowledgeCategory

class KnowledgeRepositoryInterface(ABC):
    """
    Abstract Base Class defining the contract for storage adapters in the Knowledge Layer.
    Any concrete repository (e.g. LocalFolder, OneDrive, SQLite, PostgreSQL, CloudStorage)
    must implement these asynchronous methods.
    """

    @abstractmethod
    async def save(self, record: KnowledgeCreate) -> KnowledgeRecord:
        """
        Persists a new knowledge record in the storage system.
        
        Args:
            record: The KnowledgeCreate schema representing the input record.
            
        Returns:
            The saved KnowledgeRecord containing generated ID and timestamps.
        """
        pass

    @abstractmethod
    async def get(self, record_id: str) -> Optional[KnowledgeRecord]:
        """
        Retrieves a knowledge record by its unique ID.
        
        Args:
            record_id: The unique ID string.
            
        Returns:
            The KnowledgeRecord if found, otherwise None.
        """
        pass

    @abstractmethod
    async def update(self, record_id: str, update_data: KnowledgeUpdate) -> Optional[KnowledgeRecord]:
        """
        Updates an existing knowledge record.
        
        Args:
            record_id: The unique ID of the record.
            update_data: The update schema containing values to modify.
            
        Returns:
            The updated KnowledgeRecord if successful, otherwise None.
        """
        pass

    @abstractmethod
    async def delete(self, record_id: str) -> bool:
        """
        Removes a knowledge record from the storage system.
        
        Args:
            record_id: The unique ID of the record.
            
        Returns:
            True if deleted successfully, False if not found or deletion failed.
        """
        pass

    @abstractmethod
    async def list_records(
        self, 
        category: Optional[KnowledgeCategory] = None, 
        limit: int = 100, 
        offset: int = 0
    ) -> List[KnowledgeRecord]:
        """
        Lists knowledge records, with optional filtering and pagination.
        
        Args:
            category: Optional KnowledgeCategory to filter by.
            limit: The maximum number of records to return.
            offset: The offset index to start retrieving records.
            
        Returns:
            A list of matching KnowledgeRecord objects.
        """
        pass

    @abstractmethod
    async def search(
        self, 
        query: str, 
        category: Optional[KnowledgeCategory] = None, 
        limit: int = 10,
        offset: int = 0
    ) -> List[KnowledgeRecord]:
        """
        Searches the contents and metadata of knowledge records matching the search query.
        
        Args:
            query: The search term or string to look for.
            category: Optional KnowledgeCategory to restrict the search.
            limit: Maximum search results.
            offset: Search pagination offset.
            
        Returns:
            A list of KnowledgeRecord objects matching the search criteria.
        """
        pass
