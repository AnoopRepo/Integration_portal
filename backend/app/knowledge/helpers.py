from app.knowledge.schemas.knowledge import KnowledgeCreate, KnowledgeCategory, KnowledgeSource
from app.knowledge.repositories.stub_repository import knowledge_repo
from app.knowledge.services.knowledge_service import KnowledgeService

knowledge_service = KnowledgeService(knowledge_repo)

async def emit_portal_knowledge(
    category: KnowledgeCategory,
    title: str,
    content: str,
    system_module: str,
    creator_id: str = None,
    file_path: str = None,
    external_url: str = None,
    metadata: dict = None
):
    """
    Utility helper to save/publish a knowledge record into the central Knowledge Layer.
    Wired directly to the central repository singleton.
    """
    try:
        record_in = KnowledgeCreate(
            title=title,
            category=category,
            content=content,
            source=KnowledgeSource(
                system_module=system_module,
                creator_id=creator_id,
                file_path=file_path,
                external_url=external_url
            ),
            metadata=metadata or {}
        )
        record = await knowledge_service.save_knowledge(record_in)
        print(f"[Knowledge Layer Success] Emitted: Category={category.value}, Title='{title}'")
        return record
    except Exception as e:
        print(f"[Knowledge Layer Warning] Failed to emit knowledge: {e}")
        return None
