"""
document_search.py — Scans a directory and returns matching file paths.

WHY THIS FILE EXISTS:
  After the router tells us WHICH directory to search, this module
  does the actual file system walk. It finds all readable documents
  (PDF, DOCX, TXT) and handles edge cases like:
  - Empty directories
  - Duplicate filenames (same resume in multiple folders)
  - Unsupported file types (images, Excel, etc.)

WHY QWEN IS NOT INVOLVED HERE:
  File system operations are pure Python. os.walk() is fast and
  accurate — no need for an LLM. Adding Qwen here would be slower
  and adds no value. Each tool should do what it is best at.

DATA FLOW:
  folder_path (real OS path) + search_terms
       ↓ os.walk() recursively scans all subfolders
  All files with .pdf / .docx / .txt extensions
       ↓ deduplication by filename
  List of unique absolute file paths (strings)
       ↓ returned to knowledge_agent.py orchestrator
"""

import os
from pathlib import Path
from typing import List

# Only these file types are supported.
# .docx → python-docx can read it
# .pdf  → PyMuPDF can read it
# .txt  → Python's built-in open() reads it
# .csv  → csv module reads it
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".csv"}


def search_documents(folder_path: str, search_terms: List[str]) -> List[str]:
    """
    Recursively scan folder_path for all supported document files.

    WHY ALL FILES ARE RETURNED (not just filename-matched ones):
      The directory_router already chose the correct category (e.g. "java").
      Every file inside that directory is relevant by definition —
      because the directory itself was already pre-filtered by the router.
      We return all files and let Qwen decide which content is relevant
      during the analysis step.

    WHY DEDUPLICATION:
      Your 'Anoop-J-Resume.pdf' exists in BOTH Java/ and Full-Stack/.
      Without dedup, Qwen would receive it twice and list the same
      candidate twice in the output. Dedup by filename prevents this.

    Input:
      folder_path  = "C:/Users/.../Resume/Java"
      search_terms = ["java", "spring boot"]

    Output:
      [
        "C:/Users/.../Resume/Java/Anoop-J-Resume.pdf",
        "C:/Users/.../Resume/Java/Ashish_Deloitte (2).pdf",
        "C:/Users/.../Resume/Java/Auns deloitte.pdf"
      ]

    Raises:
      FileNotFoundError   — directory does not exist
      NotADirectoryError  — path exists but is a file, not a folder
    """
    folder = Path(folder_path)

    # Guard: directory must exist
    if not folder.exists():
        raise FileNotFoundError(
            f"Search directory not found: {folder_path}\n"
            f"Check directory_registry.json path for this category."
        )

    if not folder.is_dir():
        raise NotADirectoryError(f"Path is not a directory: {folder_path}")

    matched_files: List[str] = []
    seen_filenames: set = set()  # For deduplication

    # Normalize search terms for filename comparison
    normalized_terms = [term.lower().strip() for term in search_terms if term.strip()]

    print(f"[Search] Scanning: {folder_path}")

    # os.walk() recursively yields (root_dir, subdirs, files) tuples
    for root, dirs, files in os.walk(folder):
        # Sort files for consistent ordering across runs
        for filename in sorted(files):
            file_path = Path(root) / filename
            ext = file_path.suffix.lower()

            # Skip unsupported file types silently
            if ext not in SUPPORTED_EXTENSIONS:
                continue

            # Deduplication: skip if we already have a file with this name
            # Handles the case where Anoop's resume is in multiple folders
            if filename in seen_filenames:
                print(f"[Search] Skipping duplicate: '{filename}'")
                continue

            seen_filenames.add(filename)
            matched_files.append(str(file_path))
            print(f"[Search] Found: '{filename}' ({ext})")

    total = len(matched_files)
    print(f"[Search] Total: {total} file(s) found in '{folder_path}'")

    return matched_files
