"""
knowledge_router.py — FastAPI router that exposes the Knowledge Agent as an HTTP endpoint.

WHY THIS FILE EXISTS:
  FastAPI uses APIRouter to group related endpoints.
  This keeps knowledge agent routes completely separate from existing
  resume/bill routes in main.py. They coexist without interfering.

  APIRouter is like a "mini app" — it has its own prefix, tags, and routes.
  main.py then mounts it with app.include_router().

WHY A SEPARATE ROUTER (not adding the endpoint to main.py directly):
  main.py is already 662 lines. Adding more code there risks breaking
  the existing resume and bill parsers. The router pattern keeps modules
  cleanly separated.

DATA FLOW:
  POST /knowledge-agent/query (HTTP request from useChat.ts)
       ↓ FastAPI deserializes body → KnowledgeQueryRequest
       ↓ query_knowledge_agent() is called
       ↓ knowledge_agent.run(query) runs the pipeline
       ↓ Returns KnowledgeQueryResponse
       ↓ FastAPI serializes → JSON response to frontend
"""

import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from .schemas import KnowledgeQueryRequest, KnowledgeQueryResponse
from . import knowledge_agent
from .directory_registry import resolve_path

# prefix="/knowledge-agent" means all routes in this router
# will be available at /knowledge-agent/...
# tags=["Knowledge Agent"] groups them in the Swagger UI docs
router = APIRouter(prefix="/knowledge-agent", tags=["Knowledge Agent"])


@router.post("/query", response_model=KnowledgeQueryResponse)
def query_knowledge_agent(req: KnowledgeQueryRequest) -> KnowledgeQueryResponse:
    """
    POST /knowledge-agent/query

    The main entry point for the Knowledge Agent.

    This endpoint:
    1. Receives the user's natural language query from the chat frontend
    2. Runs the full pipeline (route → search → read → analyze → respond)
    3. Returns structured JSON with the AI answer and optional CSV data

    Request body:
        { "query": "Find Java developers with Spring Boot experience" }

    Response:
        {
            "answer": "Found 3 candidates in the java directory...",
            "matched_documents": ["Anoop-J-Resume.pdf", "Ashish.pdf"],
            "directory_used": "java",
            "search_terms": ["java", "spring boot"],
            "total_found": 3,
            "csv_content": "Name,Email,...\\nAnoop J,...",
            "csv_filename": "results_java_20260606_145032.csv",
            "query_type": "listing",
            "error": null
        }

    WHY response_model=KnowledgeQueryResponse:
        FastAPI validates the return value against the schema
        and generates accurate Swagger documentation automatically.

    WHY NOT ASYNC:
        knowledge_agent.run() calls Ollama via requests.post() which is
        synchronous. Mixing sync and async in FastAPI without careful
        handling can cause issues. Keeping it synchronous matches the
        existing style in main.py and works correctly.
    """
    print(f"\n[Router] POST /knowledge-agent/query | Query: '{req.query[:80]}'")
    return knowledge_agent.run(req.query)


@router.get("/download-file")
def download_file(category: str, filename: str):
    """
    GET /knowledge-agent/download-file?category=java&filename=Anoop-J-Resume.pdf
    Serves the original resume PDF/DOCX/TXT file from the registered directory.
    """
    try:
        # 1. Resolve the folder path for the category
        folder_path = resolve_path(category)
        
        # 2. Prevent directory traversal attacks by securing the path
        file_path = os.path.abspath(os.path.join(folder_path, filename))
        if not file_path.startswith(os.path.abspath(folder_path)):
            raise HTTPException(status_code=403, detail="Access denied")
            
        # 3. Check if the file exists
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
            
        # 4. Return the file response
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/octet-stream"
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Category '{category}' path not found in registry")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rebuild-index")
def rebuild_index():
    """
    POST /knowledge-agent/rebuild-index

    Triggers a scan and metadata rebuild of the document index.
    Updates modified files incrementally and indexes new ones.
    """
    try:
        from .index_builder import build_index
        build_index()
        return {"status": "success", "message": "Document index rebuilt successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rebuild index: {str(e)}")
