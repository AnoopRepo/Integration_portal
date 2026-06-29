"""
relevance_engine.py — Python-based relevance scoring for document search.

WHY THIS FILE EXISTS:
  To calculate relevance scores between queries and document metadata records.
  This version is highly optimized using functools.lru_cache and C-speed set
  intersections to process thousands of scoring comparisons per second.
"""

import os
import re
import functools
from typing import Dict, Any, Tuple, Set

# Stop words to filter out before token matching to prevent false positives on common words
STOP_WORDS = {
    "tell", "me", "about", "what", "is", "a", "an", "the", "and", "or",
    "but", "in", "on", "at", "for", "with", "find", "search", "show",
    "list", "who", "get", "of", "to", "are", "do", "does", "did", "have",
    "has", "had", "can", "could", "should", "would", "any", "some"
}

@functools.lru_cache(maxsize=32)
def get_normalized_query_data(query: str) -> Tuple[str, Set[str]]:
    """
    Normalize the query text and extract token sets once per request.
    Using lru_cache ensures this calculation runs exactly once for a given query,
    even when scoring 1000+ files.
    """
    query_lower = query.lower().strip()
    query_tokens = set(re.findall(r'\b\w+\b', query_lower))
    
    # Split tokens with underscores/dashes to match split filenames/keywords
    extra_tokens = set()
    for token in query_tokens:
        if "_" in token:
            extra_tokens.update(token.split("_"))
        if "-" in token:
            extra_tokens.update(token.split("-"))
    query_tokens.update(extra_tokens)
    
    query_tokens = query_tokens - STOP_WORDS
    return query_lower, query_tokens

def calculate_relevance_score(query: str, doc_meta: Dict[str, Any], routed_category: str) -> float:
    """
    Calculate a relevance score between 0 and 100+ for a document metadata object.

    If candidate name is explicitly matched in the query, returns 100.0 immediately.
    Otherwise, sums up scores for skill, keyword, filename, and category matches.
    If there are no content matches (skills, keywords, filename), the final score is 0.0
    even if the category matches.

    Args:
        query: The raw natural language query.
        doc_meta: The metadata dictionary of a document (from document_index.json).
        routed_category: The category predicted by the directory router (lowercase).

    Returns:
        float: The relevance score.
    """
    # Pre-normalize the query using cache
    query_lower, query_tokens = get_normalized_query_data(query)
    
    # 1. Candidate Name Match (High Priority)
    candidate_name = doc_meta.get("candidate_name", "")
    if candidate_name and candidate_name.upper() != "NOT_FOUND":
        name_lower = doc_meta.get("_candidate_name_lower")
        if name_lower is None:
            name_lower = candidate_name.lower().strip()
            
        # Check if the full candidate name is present in the query
        if name_lower in query_lower:
            return 100.0
            
        # Check if individual name parts (excluding short names/initials) match
        name_parts = [p for p in name_lower.split() if len(p) >= 3]
        if name_parts and any(part in query_lower for part in name_parts):
            return 100.0

    # Initialize scoring variables
    score = 0.0
    content_matched = False

    # 2. Skill Match (For Resumes)
    single_skills = doc_meta.get("_skills_single")
    multi_skills = doc_meta.get("_skills_multi")
    
    if single_skills is None:
        # Fallback compatibility if index is loaded without pre-normalization
        skills = doc_meta.get("skills", [])
        single_skills = set()
        multi_skills = []
        if isinstance(skills, list):
            for skill in skills:
                skill_lower = skill.lower().strip()
                if not skill_lower:
                    continue
                if " " in skill_lower:
                    multi_skills.append(skill_lower)
                else:
                    single_skills.add(skill_lower)
                    
    # Set intersections run at C-speed in O(min(len(single_skills), len(query_tokens)))
    if single_skills:
        matches = single_skills.intersection(query_tokens)
        if matches:
            score += len(matches) * 15.0
            content_matched = True
            
    # Substring checks for multi-word skills (e.g. "spring boot")
    if multi_skills:
        for skill in multi_skills:
            if skill in query_lower:
                score += 15.0
                content_matched = True

    # 3. Keyword Match (For Knowledge Documents / Resumes)
    single_kws = doc_meta.get("_kws_single")
    multi_kws = doc_meta.get("_kws_multi")
    
    if single_kws is None:
        # Fallback compatibility
        keywords = doc_meta.get("keywords", [])
        single_kws = set()
        multi_kws = []
        if isinstance(keywords, list):
            for kw in keywords:
                kw_lower = kw.lower().strip()
                if not kw_lower:
                    continue
                if " " in kw_lower:
                    multi_kws.append(kw_lower)
                else:
                    single_kws.add(kw_lower)
                    
    if single_kws:
        matches = single_kws.intersection(query_tokens)
        if matches:
            score += len(matches) * 15.0
            content_matched = True
            
    if multi_kws:
        for kw in multi_kws:
            if kw in query_lower:
                score += 15.0
                content_matched = True

    # 4. File Name Match
    filename_tokens = doc_meta.get("_filename_tokens")
    if filename_tokens is None:
        file_path = doc_meta.get("file_path", "")
        if file_path:
            filename = os.path.basename(file_path).lower()
            name_part = os.path.splitext(filename)[0]
            tokens = {t for t in re.split(r'[-_\s]+', name_part) if t}
            filename_tokens = tokens - STOP_WORDS - {"resume", "cv", "notes", "document"}
            
    if filename_tokens:
        matches = filename_tokens.intersection(query_tokens)
        if matches:
            score += len(matches) * 10.0
            content_matched = True

    # 5. Category Relevance Boost
    # Only apply if we had at least one content match (prevents irrelevant files in same category from scoring > 0)
    doc_category = doc_meta.get("category", "").lower().strip()
    if content_matched and doc_category and doc_category == routed_category:
        score += 30.0

    return score if content_matched else 0.0
