"""
document_retriever.py — Abstracted Document Retrieval Engine.

WHY THIS FILE EXISTS:
  This module loads the document index, scores and filters documents, and
  selects the top matching files.

FAISS COMPATIBILITY BOUNDARY:
  This file exposes the unified function `retrieve_relevant_documents(...)`.
  If we want to switch to FAISS Vector Search later, we only need to modify
  the internal implementation of this function. The FastAPI endpoints,
  Knowledge Agent orchestrator, and Ollama integration will remain unchanged.
"""

import json
import os
import re
from pathlib import Path
from typing import List, Dict, Any

from .relevance_engine import calculate_relevance_score, STOP_WORDS

INDEX_PATH = Path(__file__).parent.parent.parent / "config" / "document_index.json"

# In-memory index cache variables
_INDEX_CACHE = None
_INDEX_MTIME = None

def load_cached_index() -> List[Dict[str, Any]]:
    """
    Loads document_index.json from memory or disk.
    If the file has not been modified on disk, returns the cached version.
    Pre-normalizes the loaded entries once for faster scoring lookup.
    """
    global _INDEX_CACHE, _INDEX_MTIME
    
    if not INDEX_PATH.exists():
        print(f"[Retriever] WARNING: Document index not found at: {INDEX_PATH}")
        return []

    try:
        current_mtime = INDEX_PATH.stat().st_mtime
        
        # If cache is valid, return it immediately (takes <0.1 ms)
        if _INDEX_CACHE is not None and _INDEX_MTIME == current_mtime:
            return _INDEX_CACHE
            
        print(f"[Retriever] Cache empty or index updated. Loading index from disk...")
        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            index_data = json.load(f)
            
        # Ensure it is a list
        entries = index_data if isinstance(index_data, list) else list(index_data.values())
        
        # Pre-normalize search attributes for all entries
        for entry in entries:
            # 1. Normalize candidate name
            c_name = entry.get("candidate_name", "")
            entry["_candidate_name_lower"] = c_name.lower().strip()
            
            # 2. Normalize and split skills (single-word vs multi-word)
            skills = entry.get("skills", [])
            single_skills = set()
            multi_skills = []
            if isinstance(skills, list):
                for s in skills:
                    s_lower = s.lower().strip()
                    if not s_lower:
                        continue
                    if " " in s_lower:
                        multi_skills.append(s_lower)
                    else:
                        single_skills.add(s_lower)
            entry["_skills_single"] = single_skills
            entry["_skills_multi"] = multi_skills
            
            # 3. Normalize and split keywords
            keywords = entry.get("keywords", [])
            single_kws = set()
            multi_kws = []
            if isinstance(keywords, list):
                for k in keywords:
                    k_lower = k.lower().strip()
                    if not k_lower:
                        continue
                    if " " in k_lower:
                        multi_kws.append(k_lower)
                    else:
                        single_kws.add(k_lower)
            entry["_kws_single"] = single_kws
            entry["_kws_multi"] = multi_kws
            
            # 4. Pre-tokenize filename (excluding extensions and stop words)
            filename = entry.get("filename", "").lower()
            name_part = os.path.splitext(filename)[0]
            tokens = {t for t in re.split(r'[-_\s]+', name_part) if t}
            entry["_filename_tokens"] = tokens - STOP_WORDS - {"resume", "cv", "notes", "document"}
            
        # Update cache
        _INDEX_CACHE = entries
        _INDEX_MTIME = current_mtime
        print(f"[Retriever] Successfully loaded and pre-normalized {len(entries)} index entries.")
        return _INDEX_CACHE
        
    except Exception as e:
        print(f"[Retriever] ERROR: Failed to load index: {e}")
        return []

def retrieve_relevant_documents(
    query: str,
    category: str,
    search_terms: List[str],
    max_results: int = 3
) -> List[Dict[str, Any]]:
    """
    Retrieve documents matching the category, score them, and select the top N relevant files.

    Args:
        query: User's natural language question.
        category: The routed category (e.g. "java", "mcp_server").
        search_terms: Extracted query keywords from the router.
        max_results: Max files to read (default 3, matches MAX_FILES_TO_READ).

    Returns:
        List of dicts representing the top-scored relevant documents, including their metadata.
    """
    # 1. Load cached index (disk check / memory lookup)
    entries = load_cached_index()

    # 2. Filter documents by category
    if category is None or category.lower().strip() == "none":
        category_docs = entries
        category_lower = "none"
    else:
        category_lower = category.lower().strip()
        category_docs = []
        for doc_meta in entries:
            doc_category = doc_meta.get("category", "").lower().strip()
            if doc_category == category_lower:
                category_docs.append(doc_meta)

    # 3. Score each document
    scored_docs = []
    for doc in category_docs:
        score = calculate_relevance_score(query, doc, category_lower)
        # We only keep files that have a positive relevance score
        if score > 0:
            doc_copy = doc.copy()
            doc_copy["relevance_score"] = score
            scored_docs.append(doc_copy)

    # 3.5. Also query the central in-memory Knowledge Repository!
    from app.knowledge.repositories.stub_repository import knowledge_repo
    import asyncio
    try:
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Check category mappings (directory names vs enum values)
        # Map category e.g., "Theory_Notes" -> "internal_document" or similar if needed
        # But we can query with category as string (search takes KnowledgeCategory enum, so we map or pass None)
        from app.knowledge.schemas.knowledge import KnowledgeCategory
        cat_enum = None
        for val in KnowledgeCategory:
            if val.value == category_lower:
                cat_enum = val
                break
        
        repo_records = loop.run_until_complete(
            knowledge_repo.search(query=query, category=cat_enum)
        )
        
        for record in repo_records:
            doc_meta = {
                "file_path": f"knowledge_layer://{record.id}",
                "filename": f"{record.title}.txt",
                "category": record.category.value,
                "document_type": "knowledge" if record.category.value != "resume" else "resume",
                "candidate_name": record.metadata.get("candidate_name", "NOT_FOUND"),
                "skills": record.metadata.get("skills", []),
                "experience": record.metadata.get("experience", "NOT_FOUND"),
                "keywords": record.metadata.get("tags", [record.category.value]),
                "relevance_score": 100.0  # High score for direct DB matching
            }
            scored_docs.append(doc_meta)
    except Exception as e:
        print(f"[Retriever Warning]: Failed to query Knowledge Repository: {e}")

    # 4. Sort by score descending
    scored_docs.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)

    # 5. Select top N
    top_docs = scored_docs[:max_results]
    return top_docs
