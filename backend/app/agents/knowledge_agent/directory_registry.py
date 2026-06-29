"""
directory_registry.py — Loads and resolves the directory configuration.

WHY THIS FILE EXISTS:
  This is the ONLY place in the entire system that knows about real folder paths.
  The LLM (Qwen) never sees paths. The frontend never sees paths.
  Only Python code in this file resolves category names to real OS paths.

  This is the "single source of truth" pattern — one module owns one responsibility.

WHY A SEPARATE MODULE (not inline in knowledge_agent.py):
  Future phases will need to add/modify registry behavior:
  - Phase 4 (FAISS): registry will also store index paths
  - Phase 5 (Memory): registry will store per-category memory files
  Keeping it separate means those changes don't touch the orchestrator.

DATA FLOW:
  directory_registry.json
       ↓ load_registry()
  Python dict: { "java": { "path": "...", "keywords": [...] }, ... }
       ↓ list_categories()
  ["java", "full_stack", "mern", "python"]
       ↓ resolve_path("java")
  "C:/Users/.../Resume/Java"   ← real OS path, never shown to Qwen

SECURITY NOTE:
  LLM returns:   "java"   (a safe label string)
  Python returns: "C:/Users/.../Resume/Java"   (the real path)
  These two steps are always kept separate.
"""

import json
import os
from pathlib import Path
from typing import Dict, List

# Absolute path to the registry JSON.
# Path(__file__) = this file's location
# .parent = knowledge_agent/ folder
# .parent.parent = agents/ folder
# .parent.parent.parent = backend/ folder
# / "config" / "directory_registry.json" = the config file
REGISTRY_PATH = Path(__file__).parent.parent.parent / "config" / "directory_registry.json"


def load_registry() -> Dict:
    """
    Load the full registry from JSON config.

    WHY: Loads fresh from disk every call — so if you add a new directory
    to the JSON, it takes effect immediately without restarting the server.

    Returns: dict like { "java": { "path": "...", "keywords": [...] }, ... }
    Raises: FileNotFoundError if registry JSON does not exist.
    """
    if not REGISTRY_PATH.exists():
        raise FileNotFoundError(
            f"Directory registry not found at: {REGISTRY_PATH}\n"
            f"Expected file: backend/config/directory_registry.json"
        )

    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, dict) or len(data) == 0:
        raise ValueError(
            f"Registry file is empty or malformed: {REGISTRY_PATH}\n"
            f"Expected: a JSON object with at least one category entry."
        )

    # Normalize category names: lowercase and replace spaces with underscores
    normalized_data = {}
    for k, v in data.items():
        norm_key = k.lower().strip().replace(" ", "_")
        normalized_data[norm_key] = v

    return normalized_data


def list_categories() -> List[str]:
    """
    Return all configured category names.

    WHY: The directory_router sends this list to Qwen so Qwen knows
    what valid categories exist. Qwen can only pick from this list —
    it cannot invent new paths.

    Returns: ["java", "full_stack", "mern", "python"]
    """
    return list(load_registry().keys())


def resolve_path(category: str) -> str:
    """
    Convert a category name to its real OS directory path.

    WHY: This function is the security boundary. The LLM outputs "java".
    Python calls this function to get the real path. The LLM never
    sees or touches the real path.

    Input:  "java"
    Output: "C:/Users/Anoop/.../Resume/Java"

    Raises:
      ValueError       — if category is not in the registry
      FileNotFoundError — if the path in registry doesn't exist on disk
    """
    registry = load_registry()

    if category not in registry:
        available = list(registry.keys())
        raise ValueError(
            f"Category '{category}' not found in registry.\n"
            f"Available categories: {available}"
        )

    raw_path = registry[category].get("path", "")
    if not raw_path:
        raise ValueError(f"Category '{category}' has no 'path' defined in registry.")

    # Use pathlib for safe cross-platform path handling (handles spaces correctly)
    resolved = Path(raw_path)

    # If the path is relative, resolve it relative to backend directory (parent of app/)
    if not resolved.is_absolute():
        resolved = (Path(__file__).parent.parent.parent.parent / raw_path).resolve()

    if not resolved.exists():
        # Auto-create if it is part of the knowledge layer directories
        if "knowledge" in str(resolved).lower():
            resolved.mkdir(parents=True, exist_ok=True)
        else:
            raise FileNotFoundError(
                f"Directory for '{category}' does not exist on disk: {resolved}\n"
                f"Check: (1) The path in directory_registry.json is correct\n"
                f"       (2) OneDrive has synced the folder (set to 'Always keep on this device')"
            )

    if not resolved.is_dir():
        raise NotADirectoryError(
            f"Path for '{category}' exists but is not a folder: {resolved}"
        )

    # Normalize to forward slashes for registry consistency
    return str(resolved).replace("\\", "/")


def get_keywords(category: str) -> List[str]:
    """
    Return the keyword list for a given category.

    WHY: These keywords are used by document_search.py to pre-filter
    files by name before reading their full content. Faster than reading
    every file.

    Input:  "java"
    Output: ["java", "spring", "spring boot", "hibernate", ...]
    """
    registry = load_registry()
    if category not in registry:
        return []
    return registry[category].get("keywords", [])
