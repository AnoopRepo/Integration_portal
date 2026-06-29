"""
schemas.py — Pydantic data models for the Knowledge Agent.

WHY THIS FILE EXISTS:
  FastAPI uses Pydantic models to validate request bodies and serialize
  response data automatically. Keeping schemas in a separate file means
  every other module can import them without circular dependencies.

WHY A CLASS (not a dict):
  Pydantic BaseModel gives us:
  - Automatic type checking (string vs int etc.)
  - Auto-generated API docs (Swagger UI)
  - IDE autocomplete on all fields
  - Clear contract between frontend and backend

DATA FLOW:
  Frontend sends JSON → FastAPI deserializes into KnowledgeQueryRequest
  knowledge_agent.run() returns KnowledgeQueryResponse
  FastAPI serializes it back to JSON → Frontend receives it
"""

from pydantic import BaseModel
from typing import List, Optional


class KnowledgeQueryRequest(BaseModel):
    """
    What the frontend sends to POST /knowledge-agent/query.

    Fields:
      query (str): The user's natural language question typed in chat.
                   Example: "Find Java developers with Spring Boot experience"
    """
    query: str


class KnowledgeQueryResponse(BaseModel):
    """
    What the backend returns after the full pipeline completes.

    Fields:
      answer         — Markdown-formatted text for the chat bubble.
                       For listing queries: a markdown table.
                       For summary queries: a prose explanation.

      matched_documents — List of filenames that were actually read.
                          Example: ["Anoop-J-Resume.pdf", "Ashish_Deloitte (2).pdf"]

      directory_used — Which registry category was searched.
                       Example: "java"

      search_terms   — Keywords Qwen identified from the query.
                       Example: ["java", "spring boot"]

      total_found    — How many candidates/results were found.

      csv_content    — Raw CSV string for browser download.
                       Only populated for listing queries.
                       Frontend converts this to a downloadable .csv file.

      csv_filename   — Suggested filename for the download.
                       Example: "results_java_20260606_145000.csv"

      query_type     — Either "listing" or "summary".
                       Controls which Qwen prompt template is used.

      error          — Non-null if a fatal error occurred.
                       The agent always returns a response (never crashes),
                       so the frontend can always display something useful.
    """
    answer: str
    matched_documents: List[str]
    directory_used: str
    search_terms: List[str]
    total_found: int
    query_type: str = "listing"
    error: Optional[str] = None
