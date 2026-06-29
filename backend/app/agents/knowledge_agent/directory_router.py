"""
directory_router.py — Uses Qwen to classify which directory to search.

WHY THIS FILE EXISTS:
  The user types a natural language query. We need to know which folder
  to look in. Instead of writing complex if/else keyword rules, we let
  Qwen — which understands language — make that decision.

  This is "Qwen Call #1" in our pipeline. It is a SMALL, FAST call:
  - Input:  query + list of category names (~50 tokens)
  - Output: JSON with directory + search_terms (~30 tokens)
  - Time:   typically 2-5 seconds

WHY QWEN IS SAFE HERE:
  We give Qwen a closed list of valid categories:
  ["java", "full_stack", "mern", "python"]
  Qwen can ONLY return one of these strings.
  Python then resolves that string to a real path.
  Qwen never generates or sees any file paths.

WHY ASYNC IS NOT USED:
  FastAPI supports async, but Ollama's Python requests are synchronous
  in this project to match the existing main.py style. Keeping
  consistent patterns is more important than micro-optimization here.

DATA FLOW:
  query + categories → [Qwen] → raw JSON string
  raw JSON string → Python json.loads() → { "directory": "java", "search_terms": [...] }
  "java" → directory_registry.resolve_path() → real OS path
"""

import json
import re
import os
import multiprocessing
import requests
from typing import Dict, List

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")


def _get_model() -> str:
    """
    Get the best available Qwen model from Ollama.
    Prefers any model with 'qwen' in its name.
    Falls back to 'qwen3:4b' as default.

    WHY A HELPER FUNCTION: Reused by both the router call and the
    analysis call in knowledge_agent.py. DRY principle.
    """
    try:
        res = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if res.status_code == 200:
            models = res.json().get("models", [])
            for m in models:
                if "qwen" in m["name"].lower():
                    return m["name"]
            if models:
                return models[0]["name"]
    except Exception as e:
        print(f"[Router] Could not fetch model list: {e}")
    return "qwen3:4b"


def route_query(query: str, categories: List[str]) -> Dict:
    """
    Ask Qwen to classify the query into a directory category and extract
    relevant search terms.

    WHY PRE-FILLING ASSISTANT TURN WITH '{':
      This is the same technique used in main.py for bill extraction.
      By pre-seeding the assistant response with '{', we force Qwen to
      continue with a JSON object directly — no preamble, no thinking steps.
      This cuts response time significantly.

    Input:
      query      = "Find Java developers with Spring Boot experience"
      categories = ["java", "full_stack", "mern", "python"]

    Output:
      {
        "directory": "java",
        "search_terms": ["java", "spring boot"]
      }

    On any failure: falls back to simple keyword matching (no crash).
    """
    # 1. Fast Python keyword matching
    query_lower = query.lower()
    from .directory_registry import get_keywords
    
    matched_category = None
    matched_keyword = None
    for cat in categories:
        keywords = get_keywords(cat)
        for kw in keywords:
            kw_clean = kw.lower().strip()
            if not kw_clean:
                continue
            if kw_clean in query_lower:
                matched_category = cat
                matched_keyword = kw_clean
                break
        if matched_category:
            break
            
    if matched_category:
        print(f"[Router] Fast-routed query '{query}' to category '{matched_category}' via keyword '{matched_keyword}'")
        return {"directory": matched_category, "search_terms": [matched_keyword]}

    model = _get_model()
    cpu_count = multiprocessing.cpu_count()
    categories_str = ", ".join(categories)

    system_prompt = (
        "You are a routing agent for a document search system. "
        "Given a user query and a list of valid directory categories, "
        "determine which category to search and extract relevant search terms. "
        "If the query does not pertain to any category, return 'none' for directory. "
        "Return ONLY valid JSON. No explanations. No markdown. No code fences."
    )

    user_prompt = (
        f"Available directory categories: {categories_str}\n\n"
        f"User query: {query}\n\n"
        f"Return JSON in this exact format:\n"
        f'{{ "directory": "<one of: {categories_str}, or none>", '
        f'"search_terms": ["term1", "term2"] }}\n\n'
        f"Rules:\n"
        f"- 'directory' must be exactly one of: {categories_str}, or 'none' if no category is relevant\n"
        f"- 'search_terms': 2-5 lowercase keywords from the query\n"
        f"- Return ONLY the JSON object. Nothing else."
    )

    print(f"[Router] Routing query: '{query[:80]}...' | Categories: {categories}")

    try:
        res = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                    # Pre-fill assistant with '{' — forces model to output JSON directly
                    {"role": "assistant", "content": "{"},
                ],
                "stream": False,
                "think": False,
                "options": {
                    "temperature": 0.0,   # deterministic — no random routing
                    "num_predict": 120,   # JSON response is tiny
                    "num_ctx": 2048,      # small context for fast routing
                    "num_thread": cpu_count,
                }
            },
            timeout=180  # routing should be fast; 180s is generous for CPU
        )

        if res.status_code != 200:
            raise ValueError(f"Ollama HTTP {res.status_code}: {res.text[:200]}")

        # Reconstruct the JSON by prepending our pre-seeded '{'
        raw = "{" + res.json().get("message", {}).get("content", "").strip()

        # Strip any <think>...</think> or <thought>...</thought> blocks Qwen may emit
        raw = re.sub(r"<(think|thought)>[\s\S]*?</\1>", "", raw, flags=re.IGNORECASE | re.DOTALL)
        raw = re.sub(r"<(think|thought)>[\s\S]*", "", raw, flags=re.IGNORECASE | re.DOTALL).strip()

        print(f"[Router] Raw Qwen output: {raw[:200]}")

        # Extract the first valid JSON object
        json_match = re.search(r"\{[\s\S]*?\}", raw)
        if not json_match:
            raise ValueError(f"No JSON object found in routing response: {raw[:200]}")

        parsed = json.loads(json_match.group())

        # Validate and sanitize directory
        directory = str(parsed.get("directory", "")).lower().strip().replace(" ", "_")
        if directory == "none":
            print(f"[Router] Qwen routed query to 'none' (general query)")
            return {"directory": "none", "search_terms": []}

        if directory not in categories:
            print(f"[Router] Warning: Qwen returned unknown category '{directory}'. Falling back to keyword match.")
            directory = _fallback_keyword_match(query, categories)

        if directory == "none":
            return {"directory": "none", "search_terms": []}

        # Sanitize search_terms
        raw_terms = parsed.get("search_terms", [])
        if not isinstance(raw_terms, list):
            raw_terms = [query]
        search_terms = [str(t).lower().strip() for t in raw_terms if t][:5]
        if not search_terms:
            search_terms = [query.lower()]

        print(f"[Router] Result -> directory='{directory}', terms={search_terms}")
        return {"directory": directory, "search_terms": search_terms}

    except Exception as e:
        print(f"[Router] Error: {e}. Using fallback keyword match.")
        directory = _fallback_keyword_match(query, categories)
        if directory == "none":
            return {"directory": "none", "search_terms": []}
        return {"directory": directory, "search_terms": [query.lower()]}


def _fallback_keyword_match(query: str, categories: List[str]) -> str:
    """
    Fallback when Qwen is unavailable or returns invalid output.
    Simple keyword matching: if category or its readable name appears in query.

    WHY FALLBACK: The system must always return something meaningful,
    never crash. This makes the agent resilient to model errors.
    """
    lower_query = query.lower()
    for cat in categories:
        readable = cat.replace("_", " ")  # "full_stack" → "full stack"
        if cat in lower_query or readable in lower_query:
            return cat
    return "none"
