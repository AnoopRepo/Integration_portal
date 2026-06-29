from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.agents.knowledge_agent.schemas import KnowledgeQueryResponse
from app.agents.knowledge_agent import knowledge_agent

router = APIRouter(prefix="/api/company-agent", tags=["Company Agent Integration"])

class CompanyAgentChatRequest(BaseModel):
    query: Optional[str] = None
    message: Optional[str] = None

class CompanyAgentChatResponse(BaseModel):
    answer: str
    reply: str  # For backward compatibility with the Portal's original shell expectations
    matched_documents: List[str]
    directory_used: str
    search_terms: List[str]
    total_found: int
    query_type: str
    error: Optional[str] = None

@router.post("/chat", response_model=CompanyAgentChatResponse)
def company_agent_chat(req: CompanyAgentChatRequest):
    """
    Unified entry point for Company AI Agent chat interactions.
    Accepts:
        { "query": "..." } or { "message": "..." }
    Returns:
        The full KnowledgeQueryResponse with an added 'reply' field.
    """
    query_text = req.query or req.message
    if not query_text:
        raise HTTPException(
            status_code=400,
            detail="Request body must contain either 'query' or 'message' field."
        )

    print(f"\n[CompanyAgent Chat API] Received message: '{query_text[:80]}'")
    
    try:
        agent_res = knowledge_agent.run(query_text)
        
        # Build response with both 'answer' and 'reply' fields
        return CompanyAgentChatResponse(
            answer=agent_res.answer,
            reply=agent_res.answer,
            matched_documents=agent_res.matched_documents,
            directory_used=agent_res.directory_used,
            search_terms=agent_res.search_terms,
            total_found=agent_res.total_found,
            query_type=agent_res.query_type,
            error=agent_res.error
        )
    except Exception as e:
        print(f"[CompanyAgent Chat API Error] {e}")
        return CompanyAgentChatResponse(
            answer=f"❌ **Error:** {str(e)}",
            reply=f"❌ **Error:** {str(e)}",
            matched_documents=[],
            directory_used="none",
            search_terms=[],
            total_found=0,
            query_type="summary",
            error=str(e)
        )
