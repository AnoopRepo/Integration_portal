"""
knowledge_agent.py — The main orchestrator. Runs the complete pipeline.

This is the "orchestrator pattern":
  knowledge_agent.py knows WHAT to do and in WHAT ORDER
  directory_registry.py knows HOW to load paths
  directory_router.py  knows HOW to classify queries
  document_search.py   knows HOW to find files
  document_reader.py   knows HOW to read files
"""

import os
import re
import time
import multiprocessing
import requests
from pathlib import Path
from typing import Dict, List, Tuple
from urllib.parse import quote

from .schemas import KnowledgeQueryResponse
from .directory_registry import list_categories, resolve_path
from .directory_router import route_query, _get_model
from .document_retriever import retrieve_relevant_documents
from .document_reader import read_document

# ── Configuration ──────────────────────────────────────────────────────────────
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")

# Output directory for saved CSV files — created automatically if not exists
OUTPUT_DIR = Path(__file__).parent.parent.parent / "output"

# Per-document text limit: prevents context window overflow on 8GB RAM
MAX_TEXT_PER_DOC = 5000

# Total text limit across all documents
MAX_TOTAL_TEXT = 14000


# ==============================================================================
# ── SINGLE UNIFIED PROMPT CONFIGURATION ────────────────────────────────────────
# Customize these variables to change the agent's behavior.
# This single prompt will be used for EVERY query.
# ==============================================================================
SYSTEM_PROMPT = """You are an intelligent Local Knowledge Assistant.

The retrieved documents are your primary source of truth.

When local information exists:

1. Read and understand the documents.
2. Summarize the information instead of copying it.
3. Combine information from multiple documents.
4. Explain concepts in a natural and helpful way.
5. Add context, examples, and clarifications using your own knowledge.
6. Never contradict the retrieved documents.
7. Prefer teaching and explanation over extraction.

When local information partially answers the question:

* Use the local information first.
* Fill gaps using general knowledge.

When local information fully answers the question:

* Still improve readability and explanation.
* Do not simply repeat document text.

When no relevant local information exists:
Begin with:

"This information was not found in the local database. Answering using general knowledge."

Then answer normally.

The goal is to behave like ChatGPT with access to a private local knowledge base, not like a document copier.
"""

USER_PROMPT_TEMPLATE = """User Query:
{query}

Documents:
{documents}"""


def _extract_thinking(content: str) -> Tuple[str, str]:
    """
    Extracts the thinking block and the clean answer from the content.
    Handles standard tags, missing opening tag, or missing closing tag (case-insensitive, matching think/thought).
    """
    content = content.strip()
    
    # 1. Standard matching of <think>...</think> or <thought>...</thought>
    think_match = re.search(r"<(think|thought)>([\s\S]*?)</\1>", content, flags=re.IGNORECASE | re.DOTALL)
    if think_match:
        thinking = think_match.group(2).strip()
        clean = re.sub(r"<(think|thought)>[\s\S]*?</\1>", "", content, flags=re.IGNORECASE | re.DOTALL).strip()
        clean = re.sub(r"<(think|thought)>[\s\S]*", "", clean, flags=re.IGNORECASE | re.DOTALL).strip()
        return thinking, clean

    # 2. Missing opening tag but ends with closing tag
    close_match = re.search(r"</(think|thought)>", content, flags=re.IGNORECASE)
    if close_match:
        tag = close_match.group(1)
        parts = re.split(r"</" + tag + r">", content, 1, flags=re.IGNORECASE)
        thinking = parts[0].strip().replace("<" + tag + ">", "").replace("<" + tag.upper() + ">", "").strip()
        clean = parts[1].strip()
        return thinking, clean

    # 3. Starts with opening tag but missing closing tag
    open_match = re.search(r"<(think|thought)>", content, flags=re.IGNORECASE)
    if open_match:
        tag = open_match.group(1)
        parts = re.split(r"<" + tag + r">", content, 1, flags=re.IGNORECASE)
        thinking = parts[1].strip()
        clean = parts[0].strip()
        return thinking, clean

    return "", content


def _call_general_knowledge(query: str, search_terms: List[str]) -> KnowledgeQueryResponse:
    """
    Call Ollama directly using the model's pre-trained general knowledge.
    Prepends the required disclaimer.
    """
    model = _get_model()
    cpu_count = multiprocessing.cpu_count()
    
    system_prompt = SYSTEM_PROMPT
    user_prompt = USER_PROMPT_TEMPLATE.format(query=query, documents="No documents available.")
    
    try:
        res = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "stream": False,
                "think": True,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 1000,
                    "num_ctx": 4096,
                    "num_thread": cpu_count,
                }
            },
            timeout=600
        )
        if res.status_code == 200:
            raw_content = res.json().get("message", {}).get("content", "").strip()

            # Show thinking in terminal for debugging, then strip from chat
            thinking, clean_output = _extract_thinking(raw_content)
            if thinking:
                print(f"[KnowledgeAgent] 🧠 Qwen Thinking (General Knowledge):")
                print(thinking)
                print(f"[KnowledgeAgent] 🧠 End of Thinking")
            
            disclaimer = ""
            if "This information was not found in the local database" not in clean_output:
                disclaimer = "This information was not found in the local database. Answering using general knowledge.\n\n"
                
            return KnowledgeQueryResponse(
                answer=disclaimer + clean_output,
                matched_documents=[],
                directory_used="none",
                search_terms=search_terms,
                total_found=0,
                query_type="summary"
            )
        else:
            raise ValueError(f"Ollama HTTP {res.status_code}: {res.text[:300]}")
    except Exception as e:
        return KnowledgeQueryResponse(
            answer=(
                f"This information was not found in the local database. Answering using general knowledge.\n\n"
                f"❌ **Analysis Error:** `{str(e)}`\n\nMake sure Ollama is running."
            ),
            matched_documents=[], directory_used="none",
            search_terms=search_terms, total_found=0, error=str(e)
        )


def run(query: str) -> KnowledgeQueryResponse:
    """
    Run the complete Knowledge Agent pipeline for a given user query.
    """
    t_start = time.perf_counter()
    print(f"\n{'='*60}")
    print(f"[KnowledgeAgent] Query: {query}")
    print(f"{'='*60}")

    # ── Step 1: Load Registry ──────────────────────────────────────────────────
    try:
        categories = list_categories()
        print(f"[KnowledgeAgent] Available categories: {categories}")
    except Exception as e:
        return _call_general_knowledge(query, [])

    # ── Step 2: Route Query ────────────────────────────────────────────────────
    try:
        route_result = route_query(query, categories)
        category = route_result["directory"]
        search_terms = route_result["search_terms"]
        print(f"[KnowledgeAgent] Routed -> category='{category}', terms={search_terms}")
    except Exception as e:
        print(f"[KnowledgeAgent] Routing failed: {e}. Falling back to general knowledge.")
        return _call_general_knowledge(query, [])

    if category == "none":
        print(
            "[KnowledgeAgent] No category matched. "
            "Running global retrieval."
        )
        t_routed = time.perf_counter()
        routing_duration = (t_routed - t_start) * 1000

        try:
            top_docs = retrieve_relevant_documents(
                query=query,
                category=None,
                search_terms=search_terms,
                max_results=3
            )
        except Exception as e:
            print(f"[KnowledgeAgent] Global retrieval failed: {e}. Falling back to general knowledge.")
            return _call_general_knowledge(query, search_terms)

        t_retrieved = time.perf_counter()
        retrieval_duration = (t_retrieved - t_routed) * 1000

        if not top_docs:
            return _call_general_knowledge(
                query,
                search_terms
            )
    else:
        # ── Step 3: Resolve Path ───────────────────────────────────────────────────
        try:
            folder_path = resolve_path(category)
            print(f"[KnowledgeAgent] Folder path resolved: {folder_path}")  
        except Exception as e:
            print(f"[KnowledgeAgent] Path resolution failed: {e}. Falling back to general knowledge.")
            return _call_general_knowledge(query, search_terms)

        t_routed = time.perf_counter()
        routing_duration = (t_routed - t_start) * 1000

        # ── Step 4: Retrieve Relevant Documents ─────────────────────────────────────
        try:
            # Retrieve the top relevant documents (MAX_FILES_TO_READ = 3)
            top_docs = retrieve_relevant_documents(
                query=query,
                category=category,
                search_terms=search_terms,
                max_results=3
            )
        except Exception as e:
            print(f"[KnowledgeAgent] Retrieval failed: {e}. Falling back to general knowledge.")
            return _call_general_knowledge(query, search_terms)

        t_retrieved = time.perf_counter()
        retrieval_duration = (t_retrieved - t_routed) * 1000

        if not top_docs:
            print(f"[KnowledgeAgent] No relevant documents found. Falling back to general knowledge.")
            print(f"[PERF] Router: {routing_duration:.0f} ms")
            print(f"[PERF] Retrieval: {retrieval_duration:.0f} ms")
            print(f"[PERF] File Read: 0 ms")
            return _call_general_knowledge(query, search_terms)

    # ── Step 5: Read Only Selected Top Documents ────────────────────────────────
    documents: Dict[str, str] = {}
    doc_categories: Dict[str, str] = {}
    read_errors: List[str] = []

    for doc_meta in top_docs:
        file_path = doc_meta["file_path"]
        filename = doc_meta["filename"]
        text, error = read_document(file_path)

        if error:
            read_errors.append(f"⚠️ `{filename}`: {error}")
        else:
            documents[filename] = text
            doc_categories[filename] = doc_meta.get("category", category)

    t_read = time.perf_counter()
    read_duration = (t_read - t_retrieved) * 1000

    if not documents:
        print(f"[KnowledgeAgent] No documents could be read. Falling back to general knowledge.")
        print(f"[PERF] Router: {routing_duration:.0f} ms")
        print(f"[PERF] Retrieval: {retrieval_duration:.0f} ms")
        print(f"[PERF] File Read: {read_duration:.0f} ms")
        return _call_general_knowledge(query, search_terms)

    # ── Step 6: Enforce Total Text Budget & Build Prompt ──────────────────────
    trimmed_docs: Dict[str, str] = {}
    total_chars = 0

    for fname, text in documents.items():
        if total_chars >= MAX_TOTAL_TEXT:
            print(f"[KnowledgeAgent] Text budget exhausted. Skipping '{fname}'.")
            break
        remaining_budget = MAX_TOTAL_TEXT - total_chars
        chunk = text[:min(MAX_TEXT_PER_DOC, remaining_budget)]
        trimmed_docs[fname] = chunk
        total_chars += len(chunk)

    model = _get_model()
    cpu_count = multiprocessing.cpu_count()

    doc_section = ""
    for filename, text in trimmed_docs.items():
        doc_section += f"\n[DOCUMENT: {filename}]\n---\n{text}\n---\n"

    system_prompt = SYSTEM_PROMPT
    user_prompt = USER_PROMPT_TEMPLATE.format(query=query, documents=doc_section)

    print(f"[KnowledgeAgent] Calling Qwen ({model}) | Prompt: {len(user_prompt)} chars")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    qwen_duration = 0.0
    try:
        t_qwen_start = time.perf_counter()
        res = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": model,
                "messages": messages,
                "stream": False,
                "think": True,
                "options": {
                    "temperature": 0.0,
                    "num_predict": 1200,
                    "num_ctx": 4096,
                    "num_thread": cpu_count,
                }
            },
            timeout=600
        )
        t_qwen_end = time.perf_counter()
        qwen_duration = (t_qwen_end - t_qwen_start) * 1000

        if res.status_code != 200:
            raise ValueError(f"Ollama HTTP {res.status_code}: {res.text[:300]}")

        raw_content = res.json().get("message", {}).get("content", "").strip()

        # Show thinking in terminal for debugging, then strip from chat
        thinking, clean_content = _extract_thinking(raw_content)
        if thinking:
            print(f"[KnowledgeAgent] 🧠 Qwen Thinking:")
            print(thinking)
            print(f"[KnowledgeAgent] 🧠 End of Thinking")

        raw_output = clean_content
        print(f"[KnowledgeAgent] Qwen responded: {len(raw_output)} chars")

    except requests.exceptions.Timeout:
        print(f"[PERF] Router: {routing_duration:.0f} ms")
        print(f"[PERF] Retrieval: {retrieval_duration:.0f} ms")
        print(f"[PERF] File Read: {read_duration:.0f} ms")
        return KnowledgeQueryResponse(
            answer=(
                f"❌ **Qwen Timed Out**\n\n"
                f"Analysis took too long. The documents may be too large.\n\n"
                f"**Tips:**\n"
                f"- Try with fewer files in the directory\n"
                f"- Run `ollama ps` to check model status\n"
                f"- Restart: `ollama serve`"
            ),
            matched_documents=list(documents.keys()),
            directory_used=category, search_terms=search_terms,
            total_found=len(documents), error="Timeout"
        )
    except Exception as e:
        print(f"[PERF] Router: {routing_duration:.0f} ms")
        print(f"[PERF] Retrieval: {retrieval_duration:.0f} ms")
        print(f"[PERF] File Read: {read_duration:.0f} ms")
        return KnowledgeQueryResponse(
            answer=f"❌ **Analysis Error:** `{str(e)}`\n\nMake sure Ollama is running.",
            matched_documents=list(documents.keys()),
            directory_used=category, search_terms=search_terms,
            total_found=len(documents), error=str(e)
        )

    # ── Step 7: Build Response ─────────────────────────────────────────────────
    matched_doc_names = list(documents.keys())
    error_note = ""
    if read_errors:
        error_note = f"\n\n> ⚠️ **Note:** {len(read_errors)} file(s) could not be read:\n> " + "\n> ".join(read_errors)

    # Generate matched documents list with download links
    matched_links = []
    for doc_name in matched_doc_names:
        safe_name = quote(doc_name)
        doc_cat = doc_categories.get(doc_name, category)
        matched_links.append(f"[`{doc_name}`](http://127.0.0.1:8000/knowledge-agent/download-file?category={doc_cat}&filename={safe_name}) (📥 Download)")
    scanned_note = f"📁 Scanned: {', '.join(matched_links)}"

    clean_output = raw_output.strip()
    
    if "This information was not found in the local database" in clean_output:
        answer = f"{clean_output}\n\n---\n{scanned_note}"
    else:
        # Build a dedicated download section
        download_section = ""
        if matched_doc_names and category != "unknown":
            download_lines = []
            for doc_name in matched_doc_names:
                safe_name = quote(doc_name)
                doc_cat = doc_categories.get(doc_name, category)
                download_lines.append(
                    f"- [📥 {doc_name}](http://127.0.0.1:8000/knowledge-agent/download-file?category={doc_cat}&filename={safe_name})"
                )
            download_section = f"\n\n**📥 Available Downloads:**\n" + "\n".join(download_lines)

        category_display = "global search" if category == "none" else f"`{category}` directory"
        answer = (
            f"📁 Based on {category_display}:\n\n"
            f"{clean_output}\n\n"
            f"---\n{scanned_note}"
            f"{download_section}"
            f"{error_note}"
        )

    # Print performance metrics
    print(f"[PERF] Router: {routing_duration:.0f} ms")
    print(f"[PERF] Retrieval: {retrieval_duration:.0f} ms")
    print(f"[PERF] File Read: {read_duration:.0f} ms")
    print(f"[PERF] Qwen: {qwen_duration:.0f} ms")

    return KnowledgeQueryResponse(
        answer=answer,
        matched_documents=matched_doc_names,
        directory_used=category,
        search_terms=search_terms,
        total_found=len(matched_doc_names),
        query_type="summary"
    )
