"""
index_builder.py — Incremental Document Index Builder.

WHY THIS FILE EXISTS:
  To scan registered folders, parse metadata from documents, and build
  `document_index.json`. This acts as our localized search database.

INCREMENTAL UPDATES:
  Compares file size and modification time (mtime) against the existing index.
  Unmodified files are skipped completely, saving CPU and LLM generation time.

PARALLELIZATION:
  Runs file parsing and metadata extraction concurrently in a ThreadPoolExecutor
  with bounded workers. This significantly speeds up indexing when multiple
  files change, without overloading local CPU-bound Ollama instances.
"""

import json
import os
import re
import time
import requests
import multiprocessing
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

from .directory_registry import load_registry, resolve_path
from .document_reader import read_document
from .directory_router import _get_model

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
INDEX_PATH = Path(__file__).parent.parent.parent / "config" / "document_index.json"
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".csv", ".py", ".json"}

METADATA_EXTRACTION_PROMPT = """You are a precise document metadata extractor.
Analyze the document text and extract specific metadata fields in raw JSON format.

First, determine if the document is a resume (contains work history, education, candidate name) or a general knowledge document (notes, documentation, manuals).

For Resumes:
{
  "document_type": "resume",
  "candidate_name": "Full Name of Candidate (NOT_FOUND if not present)",
  "skills": ["Skill1", "Skill2", "Skill3", ... (up to 15 key technical skills)],
  "experience": "Brief experience summary or years of experience (NOT_FOUND if not present)",
  "keywords": ["keyword1", "keyword2", ... (generic search terms, e.g. skill names or role name)]
}

For Knowledge Documents:
{
  "document_type": "knowledge",
  "candidate_name": "NOT_FOUND",
  "skills": [],
  "experience": "NOT_FOUND",
  "keywords": ["keyword1", "keyword2", ... (up to 10 key concepts, technologies, or subjects)]
}

Return ONLY raw JSON matching the correct structure. Do not include markdown code fences, thought blocks, or explanation. Continue the JSON output after the open bracket.
"""

def fallback_extract_metadata(text: str, filename: str, category: str, file_path: str) -> Dict[str, Any]:
    """
    Fallback metadata extractor using Python heuristics.
    Ensures the index builder never fails, even if Ollama is unreachable.
    """
    # Heuristic: Check if path/category indicates a resume
    is_resume = "resume" in file_path.lower() or category.lower() in {"java", "full_stack", "mern", "python"}
    
    # 1. Parse name from filename (e.g. "Anoop-J-Resume.pdf" -> "Anoop J")
    name_part = os.path.splitext(filename)[0]
    name_clean = name_part.replace("_", " ").replace("-", " ")
    # Filter out common file labeling terms
    name_words = [w for w in name_clean.split() if w.lower() not in {
        "resume", "cv", "latest", "updated", "profile", "job", "deloitte", "formal", "verification"
    }]
    candidate_name = " ".join(name_words).title() if name_words else "NOT_FOUND"
    
    # 2. Extract matching keywords/skills from the document text
    common_skills = {
        "java", "python", "javascript", "typescript", "react", "angular", "vue", "node", 
        "express", "django", "flask", "fastapi", "spring", "spring boot", "hibernate", 
        "sql", "mysql", "postgresql", "mongodb", "aws", "docker", "kubernetes", "git", 
        "html", "css", "formal verification", "mcp", "mcp server", "model context protocol"
    }
    
    found_skills = []
    text_lower = text.lower()
    for skill in common_skills:
        # Match using word boundaries
        if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
            found_skills.append(skill.title())
            
    if is_resume:
        return {
            "document_type": "resume",
            "candidate_name": candidate_name,
            "skills": found_skills[:15],
            "experience": "NOT_FOUND",
            "keywords": [s.lower() for s in found_skills[:10]]
        }
    else:
        # For general theory/notes, use found technical words or fallback to category name
        keywords = [s.lower() for s in found_skills[:10]]
        if not keywords:
            keywords = [category.lower()]
        return {
            "document_type": "knowledge",
            "candidate_name": "NOT_FOUND",
            "skills": [],
            "experience": "NOT_FOUND",
            "keywords": keywords
        }

def extract_metadata_via_llm(text: str, filename: str, category: str, file_path: str) -> Dict[str, Any]:
    """
    Call Qwen to extract document metadata. Falls back to Python heuristics on failure.
    """
    model = _get_model()
    cpu_count = multiprocessing.cpu_count()
    
    # Truncate text block to prevent model overload during indexing
    truncated_text = text[:10000]
    
    user_prompt = f"Document Name: {filename}\nCategory: {category}\n\nDocument Text:\n{truncated_text}"
    
    try:
        res = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": METADATA_EXTRACTION_PROMPT},
                    {"role": "user", "content": user_prompt},
                    {"role": "assistant", "content": "{"}
                ],
                "stream": False,
                "think": False,
                "options": {
                    "temperature": 0.0,
                    "num_predict": 300,
                    "num_ctx": 4096,
                    "num_thread": cpu_count
                }
            },
            timeout=2
        )
        
        if res.status_code != 200:
            raise ValueError(f"Ollama HTTP {res.status_code}")
            
        raw = "{" + res.json().get("message", {}).get("content", "").strip()
        
        # Clean any thought tags
        raw = re.sub(r"<(think|thought)>[\s\S]*?</\1>", "", raw, flags=re.IGNORECASE | re.DOTALL)
        raw = re.sub(r"<(think|thought)>[\s\S]*", "", raw, flags=re.IGNORECASE | re.DOTALL).strip()
        
        # Extract first JSON block
        json_match = re.search(r"\{[\s\S]*?\}", raw)
        if not json_match:
            raise ValueError("No JSON object matched")
            
        parsed = json.loads(json_match.group())
        return parsed
        
    except Exception as e:
        print(f"[IndexBuilder] LLM extraction failed for '{filename}' ({e}). Using Python heuristics fallback.")
        return fallback_extract_metadata(text, filename, category, file_path)

def _parse_file_task(args: Tuple[str, Path, str, float, int]) -> Optional[Dict[str, Any]]:
    """
    ThreadPool worker task to parse a single document and extract its metadata.
    """
    category, file_path, filename, mtime, size = args
    abs_path = str(file_path.resolve()).replace("\\", "/")
    
    print(f"[IndexBuilder] Parsing '{filename}' for category '{category}'...")
    text, err = read_document(str(file_path))
    if err or not text:
        print(f"[IndexBuilder] Skipped '{filename}' due to read error: {err}")
        return None
        
    # Extract metadata (Qwen + Python fallback internally)
    meta = extract_metadata_via_llm(text, filename, category, abs_path)
    
    # Build index entry
    entry = {
        "file_path": abs_path,
        "filename": filename,
        "category": category,
        "last_modified": mtime,
        "file_size": size,
        "document_type": meta.get("document_type", "knowledge"),
        "candidate_name": meta.get("candidate_name", "NOT_FOUND"),
        "skills": meta.get("skills", []),
        "experience": meta.get("experience", "NOT_FOUND"),
        "keywords": meta.get("keywords", [])
    }
    
    # Normalize skills and keywords
    if not isinstance(entry["skills"], list):
        entry["skills"] = []
    if not isinstance(entry["keywords"], list):
        entry["keywords"] = []
        
    return entry

def build_index() -> List[Dict[str, Any]]:
    """
    Scans the directory registry, identifies changes, extracts metadata,
    and updates the JSON document index.
    """
    start_time = time.time()
    print(f"\n{'='*60}")
    print("[IndexBuilder] Starting Incremental Index Build...")
    print(f"{'='*60}")

    # Ensure config directory exists
    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    # 1. Load current index (if any)
    existing_index_list = []
    existing_lookup = {}  # maps (category, file_path) -> entry
    
    if INDEX_PATH.exists():
        try:
            with open(INDEX_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    existing_index_list = data
                elif isinstance(data, dict):
                    existing_index_list = list(data.values())
            
            for entry in existing_index_list:
                key = (entry.get("category", ""), entry.get("file_path", ""))
                existing_lookup[key] = entry
                
            print(f"[IndexBuilder] Loaded existing index containing {len(existing_lookup)} entry/entries")
        except Exception as e:
            print(f"[IndexBuilder] Warning: Failed to load existing index ({e}). Rebuilding from scratch.")

    # 2. Load registry
    try:
        registry = load_registry()
    except Exception as e:
        print(f"[IndexBuilder] ERROR: Could not load directory registry: {e}")
        return []

    new_index_list = []
    files_to_parse = []
    stats = {"scanned": 0, "indexed_llm": 0, "reused": 0, "errors": 0}

    # 3. Scan directories
    for category, cat_info in registry.items():
        try:
            folder_path = resolve_path(category)
        except Exception as e:
            print(f"[IndexBuilder] Skipped category '{category}': {e}")
            continue

        print(f"[IndexBuilder] Scanning folder for category '{category}': {folder_path}")
        
        for root, dirs, files in os.walk(folder_path):
            # Prune directory walking to avoid virtual environments, caches and build artifacts
            dirs[:] = [d for d in dirs if d not in ('venv', 'node_modules', '.git', '__pycache__', '.pytest_cache', 'scratch', 'venv_backend', 'dist')]
            for filename in files:
                file_path = Path(root) / filename
                ext = file_path.suffix.lower()
                
                if ext not in SUPPORTED_EXTENSIONS:
                    continue
                
                stats["scanned"] += 1
                abs_path = str(file_path.resolve()).replace("\\", "/")
                
                # Check modification time and file size
                mtime = os.path.getmtime(file_path)
                size = os.path.getsize(file_path)
                
                # Check if we can reuse the existing index entry
                lookup_key = (category, abs_path)
                if lookup_key in existing_lookup:
                    existing_entry = existing_lookup[lookup_key]
                    if (existing_entry.get("last_modified") == mtime and 
                        existing_entry.get("file_size") == size):
                        # Reuse the entry
                        new_index_list.append(existing_entry)
                        stats["reused"] += 1
                        continue
                
                # Add to queue of files to parse
                files_to_parse.append((category, file_path, filename, mtime, size))

    # 4. Parse new/modified files concurrently in ThreadPoolExecutor
    if files_to_parse:
        # Bounded worker threads (typically 2-3 workers to avoid thrashing Ollama CPU)
        max_workers = min(3, multiprocessing.cpu_count())
        print(f"[IndexBuilder] Concurrently indexing {len(files_to_parse)} file(s) using {max_workers} worker threads...")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(_parse_file_task, f): f[2] for f in files_to_parse}
            for fut in as_completed(futures):
                fname = futures[fut]
                try:
                    entry = fut.result()
                    if entry:
                        new_index_list.append(entry)
                        stats["indexed_llm"] += 1
                    else:
                        stats["errors"] += 1
                except Exception as exc:
                    print(f"[IndexBuilder] Thread task failed for '{fname}': {exc}")
                    stats["errors"] += 1

    # 5. Write new index file (list of entries)
    try:
        with open(INDEX_PATH, "w", encoding="utf-8") as f:
            json.dump(new_index_list, f, indent=2)
        duration = time.time() - start_time
        print(f"\n{'='*60}")
        print("[IndexBuilder] Indexing Completed Successfully!")
        print(f"Time Taken: {duration:.2f} seconds")
        print(f"Total Files Scanned: {stats['scanned']}")
        print(f"Reused from Cache:  {stats['reused']}")
        print(f"Newly Indexed:      {stats['indexed_llm']}")
        print(f"Skipped / Errors:   {stats['errors']}")
        print(f"Index File:         {INDEX_PATH}")
        print(f"{'='*60}\n")
    except Exception as e:
        print(f"[IndexBuilder] ERROR: Failed to write index file: {e}")

    return new_index_list
