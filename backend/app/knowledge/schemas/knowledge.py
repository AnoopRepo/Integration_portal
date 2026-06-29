from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class KnowledgeCategory(str, Enum):
    """
    Extensible enumeration of knowledge domains within the company.
    Allows portal modules to tag emitted knowledge correctly.
    """
    RESUME = "resume"
    ATTENDANCE = "attendance"
    LEAVE = "leave"
    TICKET = "ticket"
    DAILY_TASKS = "daily_tasks"
    INTERVIEW = "interview"
    EXPENSE = "expense"
    POLICY = "policy"
    INTERNAL_DOCUMENT = "internal_document"
    TRAINING_RECORD = "training_record"

class KnowledgeSource(BaseModel):
    """
    Identifies the origin and provenance of the knowledge record.
    """
    system_module: str = Field(
        ..., 
        description="The source portal module name (e.g., 'leaves', 'tickets', 'users')",
        example="tickets"
    )
    creator_id: Optional[str] = Field(
        None, 
        description="ID of the user who produced/triggered this knowledge",
        example="647f1a2b3c4d5e6f7a8b9c0d"
    )
    file_path: Optional[str] = Field(
        None, 
        description="Optional absolute or relative path to the physical file if applicable",
        example="static/uploads/resumes/john_doe_cv.pdf"
    )
    external_url: Optional[str] = Field(
        None, 
        description="Optional URL pointing to external content (e.g. OneDrive, sharepoint)",
        example="https://onedrive.live.com/redir?id=123"
    )

class KnowledgeBase(BaseModel):
    """
    Shared properties for a knowledge record.
    """
    title: str = Field(
        ..., 
        description="A summary or title of the knowledge chunk",
        example="Leave Policy Update 2026"
    )
    category: KnowledgeCategory = Field(
        ..., 
        description="The category classification of this knowledge"
    )
    content: str = Field(
        ..., 
        description="The actual textual knowledge content or structural data representation"
    )
    source: KnowledgeSource = Field(
        ..., 
        description="Metadata detailing the source system and author"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Flexible, unstructured metadata tags (e.g. visiblity, tags, department)",
        example={"department": "Engineering", "confidentiality": "restricted", "tags": ["policy", "2026"]}
    )

class KnowledgeCreate(KnowledgeBase):
    """
    Schema representing request payload to create/save knowledge.
    """
    pass

class KnowledgeUpdate(BaseModel):
    """
    Schema for updating existing knowledge records.
    """
    title: Optional[str] = None
    category: Optional[KnowledgeCategory] = None
    content: Optional[str] = None
    source: Optional[KnowledgeSource] = None
    metadata: Optional[Dict[str, Any]] = None

class KnowledgeRecord(KnowledgeBase):
    """
    Complete schema returned by the Knowledge Layer services and API endpoints.
    Includes persistence details.
    """
    id: str = Field(..., description="Unique identifier of the knowledge record")
    created_at: datetime = Field(..., description="Timestamp of when the record was registered")
    updated_at: datetime = Field(..., description="Timestamp of the latest update")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "know_abc123xyz789",
                "title": "Interview notes for Senior Engineer candidate",
                "category": "interview",
                "content": "Candidate demonstrated strong systems knowledge but lacked experience in MongoDB.",
                "source": {
                    "system_module": "hr_extended",
                    "creator_id": "603d2e11f123456789abcdef",
                    "file_path": None,
                    "external_url": None
                },
                "metadata": {
                    "candidate_name": "Jane Smith",
                    "interviewer": "John Doe",
                    "verdict": "hire"
                },
                "created_at": "2026-06-09T14:00:00Z",
                "updated_at": "2026-06-09T14:00:00Z"
            }
        }
