from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.auth import get_current_user, check_admin_role
from app.knowledge.schemas.knowledge import (
    KnowledgeRecord, 
    KnowledgeCreate, 
    KnowledgeUpdate, 
    KnowledgeCategory
)
from app.knowledge.repositories.stub_repository import InMemoryKnowledgeRepository
from app.knowledge.services.knowledge_service import KnowledgeService

router = APIRouter(
    prefix="/api/knowledge",
    tags=["Knowledge Layer"],
    dependencies=[Depends(get_current_user)]
)

# Application-scoped singleton of the storage adapter.
# This ensures that in-memory mock data persists across separate API requests.
# When changing the storage backend, replace this with the appropriate concrete adapter class.
from app.knowledge.repositories.stub_repository import knowledge_repo as _stub_repository

def get_knowledge_service() -> KnowledgeService:
    """
    Dependency injection provider returning a configured KnowledgeService.
    Wires the concrete repository adapter to the service.
    """
    return KnowledgeService(_stub_repository)

@router.post("", response_model=KnowledgeRecord, status_code=status.HTTP_201_CREATED)
async def create_knowledge(
    record_in: KnowledgeCreate,
    service: KnowledgeService = Depends(get_knowledge_service)
):
    """
    Publish a new knowledge record to the Knowledge Layer.
    Emits the record to the repository and triggers downstream AI Agent indexers.
    """
    try:
        return await service.save_knowledge(record_in)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to save knowledge: {str(e)}"
        )

@router.get("", response_model=List[KnowledgeRecord])
async def list_or_search_knowledge(
    category: Optional[KnowledgeCategory] = None,
    q: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    service: KnowledgeService = Depends(get_knowledge_service)
):
    """
    Retrieve knowledge records.
    Supports filtering by category and full-text substring search.
    """
    try:
        if q:
            return await service.search_knowledge(query=q, category=category, limit=limit, offset=offset)
        else:
            return await service.list_knowledge(category=category, limit=limit, offset=offset)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error listing knowledge: {str(e)}"
        )

@router.get("/categories", response_model=List[str])
async def get_categories():
    """
    Get all supported knowledge category classifications.
    Allows portal modules to query what tags are acceptable.
    """
    return [c.value for c in KnowledgeCategory]

@router.get("/{record_id}", response_model=KnowledgeRecord)
async def get_knowledge_by_id(
    record_id: str,
    service: KnowledgeService = Depends(get_knowledge_service)
):
    """
    Retrieve a specific knowledge record by ID.
    """
    record = await service.get_knowledge(record_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Knowledge record with ID '{record_id}' not found"
        )
    return record

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_by_id(
    record_id: str,
    service: KnowledgeService = Depends(get_knowledge_service),
    current_user: dict = Depends(check_admin_role)
):
    """
    Remove a knowledge record. Restricted to administrative roles.
    """
    success = await service.delete_knowledge(record_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Knowledge record with ID '{record_id}' not found or could not be deleted"
        )
    return None

@router.post("/rebuild-index", status_code=status.HTTP_200_OK)
async def rebuild_vector_index(
    service: KnowledgeService = Depends(get_knowledge_service),
    current_user: dict = Depends(check_admin_role)
):
    """
    Trigger manual rebuild of the vector search/FAISS index files.
    Restricted to administrative roles.
    """
    try:
        return await service.rebuild_faiss_index()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rebuild index: {str(e)}"
        )
