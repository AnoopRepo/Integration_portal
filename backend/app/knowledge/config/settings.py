import os

class KnowledgeSettings:
    """
    Configuration parameters for the Knowledge Layer.
    Includes settings for storage providers, vector search, and future AI/Agent integrations.
    """
    # Active storage provider: "stub", "local", "onedrive", "postgres", "sqlite", "s3"
    STORAGE_PROVIDER: str = os.getenv("KNOWLEDGE_STORAGE_PROVIDER", "stub")

    # Local storage configurations (for future use when KNOWLEDGE_STORAGE_PROVIDER == "local")
    LOCAL_STORAGE_DIR: str = os.getenv("KNOWLEDGE_LOCAL_STORAGE_DIR", "static/knowledge_store")

    # Future AI / Vector database config
    VECTOR_SEARCH_LIMIT: int = int(os.getenv("KNOWLEDGE_VECTOR_SEARCH_LIMIT", "5"))
    VECTOR_DB_TYPE: str = os.getenv("KNOWLEDGE_VECTOR_DB_TYPE", "faiss") # e.g., faiss, chroma, pgvector
    EMBEDDINGS_MODEL: str = os.getenv("KNOWLEDGE_EMBEDDINGS_MODEL", "all-MiniLM-L6-v2")

    # Future Company Agent Integration Endpoint
    AGENT_INTEGRATION_URL: str = os.getenv("KNOWLEDGE_AGENT_INTEGRATION_URL", "http://localhost:8001/api/v1/agent")
    
    # Auto-indexing toggle (when true, saving a record triggers agent indexing)
    AUTO_INDEX_FOR_AGENT: bool = os.getenv("KNOWLEDGE_AUTO_INDEX_FOR_AGENT", "false").lower() == "true"

knowledge_settings = KnowledgeSettings()
