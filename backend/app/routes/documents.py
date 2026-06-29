from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.responses import FileResponse
from bson import ObjectId
from typing import List, Optional
from datetime import datetime
import os
import shutil
from pathlib import Path
import csv
import io

from app.database import get_database
from app.auth import get_current_user, check_admin_role, check_hr_or_admin_role
from app.agents.knowledge_agent.directory_registry import resolve_path, list_categories
from app.agents.knowledge_agent.index_builder import build_index
from app.agents.knowledge_agent.document_reader import read_document

router = APIRouter(prefix="/api/documents", tags=["Document Center"])

# Helper function to convert mongo _id to str id
def parse_doc(doc):
    if doc:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        doc["id"] = str(doc.get("_id", doc.get("id")))
        # Ensure new DMS metadata fields exist on legacy documents
        if "document_id" not in doc:
            doc["document_id"] = f"DOC{doc['id'][-6:].upper()}" if "id" in doc else "DOC000"
        if "file_name" not in doc:
            doc["file_name"] = doc.get("filename", "unknown")
        if "uploaded_by" not in doc:
            doc["uploaded_by"] = doc.get("created_by", "Unknown")
        if "uploaded_at" not in doc:
            created_at = doc.get("created_at")
            if isinstance(created_at, datetime):
                doc["uploaded_at"] = created_at.strftime("%Y-%m-%d")
            elif isinstance(created_at, str):
                doc["uploaded_at"] = created_at[:10]
            else:
                doc["uploaded_at"] = "2026-06-10"
        if "file_path" not in doc:
            try:
                folder_path = resolve_path(doc.get("category", "documents"))
                doc["file_path"] = os.path.join(folder_path, doc.get("filename", ""))
            except Exception:
                doc["file_path"] = ""
        if "size" not in doc:
            doc["size"] = doc.get("file_size", "0 Bytes")
        if "visibility" not in doc:
            doc["visibility"] = "shared" if doc.get("is_public", True) else "private"
    return doc

# Category map check
def get_valid_categories():
    try:
        return list_categories()
    except Exception:
        return ["documents", "policies", "resumes", "certificates", "reports", "training"]

@router.get("/categories", response_model=List[str])
async def get_categories(current_user: dict = Depends(get_current_user)):
    """
    Returns dynamically configured categories list from directory_registry.
    """
    return get_valid_categories()

@router.get("", response_model=List[dict])
async def list_documents(
    q: Optional[str] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns documents based on user roles and permissions:
    - Admins: Can view all uploads.
    - HR: Can access resumes, documents, public files, and their own uploads.
    - Employees (Users): Can view public files and their own uploads.
    Supports filtering by category and searching by title, description, filename, and uploader.
    """
    db = get_database()
    user_id = current_user.get("id")
    role = (current_user.get("role") or "").lower()
    is_admin = role in ("admin", "administrator")
    is_hr = role == "hr"

    cursor = db.documents.find()
    documents = []
    async for doc in cursor:
        doc_parsed = parse_doc(doc)
        
        # 1. Scoped access check
        doc_created_by_id = doc_parsed.get("created_by_id")
        doc_category = doc_parsed.get("category")
        doc_is_public = doc_parsed.get("is_public", True)
        
        has_permission = False
        if is_admin:
            has_permission = True
        elif is_hr:
            if doc_is_public or doc_created_by_id == user_id or doc_category in ("resumes", "documents"):
                has_permission = True
        else:
            if doc_is_public or doc_created_by_id == user_id:
                has_permission = True
                
        if not has_permission:
            continue
            
        # 2. Category filtering
        if category:
            norm_cat = category.lower().strip().replace(" ", "_")
            if doc_category != norm_cat:
                continue
                
        # 3. Query search (Search title, description, filename, or uploader/creator)
        if q:
            q_lower = q.lower()
            title = (doc_parsed.get("title") or "").lower()
            desc = (doc_parsed.get("description") or "").lower()
            fname = (doc_parsed.get("filename") or "").lower()
            uploader = (doc_parsed.get("uploaded_by") or doc_parsed.get("created_by") or "").lower()
            
            if q_lower not in title and q_lower not in desc and q_lower not in fname and q_lower not in uploader:
                continue
                
        documents.append(doc_parsed)
    return documents

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    title: str = Form(...),
    category: str = Form(...),
    description: str = Form(""),
    is_public: bool = Form(True),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Saves file in resolved category folder on disk, adds metadata to documents collection,
    adds log to document_audit_logs, and triggers incremental AI Agent indexing (build_index) in background.
    """
    # Verify valid category
    valid_categories = get_valid_categories()
    norm_category = category.lower().strip().replace(" ", "_")
    if norm_category not in valid_categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category '{category}'. Available: {valid_categories}"
        )

    # Resolve folder path
    try:
        folder_path = resolve_path(norm_category)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not resolve folder path for category: {e}"
        )

    # Prevent directory traversal attacks by securing filename
    safe_filename = os.path.basename(file.filename)
    file_dest = os.path.join(folder_path, safe_filename)

    # Save physical file
    try:
        with open(file_dest, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write file to disk: {e}"
        )

    file_size_bytes = os.path.getsize(file_dest)
    # Formatted file size string
    if file_size_bytes >= 1024 * 1024:
        file_size_str = f"{file_size_bytes / (1024 * 1024):.2f} MB"
    elif file_size_bytes >= 1024:
        file_size_str = f"{file_size_bytes / 1024:.2f} KB"
    else:
        file_size_str = f"{file_size_bytes} Bytes"

    db = get_database()
    # Generate unique document ID
    document_id_unique = f"DOC{datetime.utcnow().strftime('%m%d%H%M%f')[:9].upper()}"
    file_dest_abs = str(Path(file_dest).resolve()).replace("\\", "/")

    doc_data = {
        # DMS Specific Metadata
        "document_id": document_id_unique,
        "file_name": safe_filename,
        "uploaded_by": current_user.get("name", "Unknown"),
        "uploaded_at": datetime.utcnow().strftime("%Y-%m-%d"),
        "category": norm_category,
        "file_path": file_dest_abs,
        "size": file_size_str,
        "visibility": "shared" if is_public else "private",

        # Legacy backward-compatible fields
        "title": title,
        "description": description,
        "filename": safe_filename,
        "file_size": file_size_str,
        "file_url": f"/api/documents/preview/{safe_filename}",
        "is_public": is_public,
        "created_by": current_user.get("name", "Unknown"),
        "created_by_id": current_user.get("id"),
        "created_at": datetime.utcnow()
    }

    result = await db.documents.insert_one(doc_data)
    inserted_id = str(result.inserted_id)
    doc_data["id"] = inserted_id

    # Create Audit Log
    audit_entry = {
        "document_id": inserted_id,
        "document_title": title,
        "action": "Upload",
        "user_id": current_user.get("id"),
        "user_name": current_user.get("name"),
        "details": f"Uploaded file '{safe_filename}' into category '{norm_category}' ({file_size_str})",
        "timestamp": datetime.utcnow()
    }
    await db.document_audit_logs.insert_one(audit_entry)

    # Trigger incremental AI Agent index rebuilding in the background
    try:
        build_index()
    except Exception as e:
        print(f"[IndexBuilder Warning] Failed to rebuild index: {e}")

    return parse_doc(doc_data)

@router.get("/preview/{doc_id}")
async def preview_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    """
    Serves document with inline Content-Disposition header.
    Can be looked up by DB document ID or by filename (if previewing raw files).
    """
    db = get_database()
    # Try looking up by ID first
    doc = None
    try:
        if len(doc_id) == 24:
            doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        pass

    if not doc:
        # If not found or not an ObjectId, try querying title/filename
        doc = await db.documents.find_one({"filename": doc_id})

    if not doc:
        # Also check if it matches in the physical files directly if category is specified or we search all
        raise HTTPException(status_code=404, detail="Document metadata not found")

    role = (current_user.get("role") or "").lower()
    is_admin = role in ("admin", "administrator")
    is_hr = role == "hr"
    user_id = current_user.get("id")

    # Scoped access permission check
    has_access = False
    if doc.get("is_public"):
        has_access = True
    elif is_admin:
        has_access = True
    elif is_hr and doc.get("category") in ("resumes", "documents"):
        has_access = True
    elif doc.get("created_by_id") == user_id:
        has_access = True

    if not has_access:
        raise HTTPException(status_code=403, detail="You do not have permission to view this private document")

    category = doc.get("category")
    filename = doc.get("filename")
    try:
        folder_path = resolve_path(category)
        file_path = os.path.abspath(os.path.join(folder_path, filename))
        if not file_path.startswith(os.path.abspath(folder_path)) or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Physical file not found")
        
        # Log preview action
        audit_entry = {
            "document_id": str(doc["_id"]),
            "document_title": doc.get("title"),
            "action": "Preview",
            "user_id": current_user.get("id"),
            "user_name": current_user.get("name"),
            "details": f"Previewed document '{filename}'",
            "timestamp": datetime.utcnow()
        }
        await db.document_audit_logs.insert_one(audit_entry)

        # Detect correct Content-Type for browser in-page previewing
        ext = os.path.splitext(filename)[1].lower()
        media_types = {
            ".pdf": "application/pdf",
            ".txt": "text/plain",
            ".csv": "text/csv",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
        media_type = media_types.get(ext, "application/octet-stream")

        # Omit 'filename' parameter so it returns an inline Content-Disposition
        return FileResponse(path=file_path, media_type=media_type)
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{doc_id}")
async def download_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    """
    Serves document with attachment Content-Disposition header. Audits the download action.
    """
    db = get_database()
    doc = None
    try:
        if len(doc_id) == 24:
            doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        pass

    if not doc:
        doc = await db.documents.find_one({"filename": doc_id})

    if not doc:
        raise HTTPException(status_code=404, detail="Document metadata not found")

    role = (current_user.get("role") or "").lower()
    is_admin = role in ("admin", "administrator")
    is_hr = role == "hr"
    user_id = current_user.get("id")

    # Scoped access permission check
    has_access = False
    if doc.get("is_public"):
        has_access = True
    elif is_admin:
        has_access = True
    elif is_hr and doc.get("category") in ("resumes", "documents"):
        has_access = True
    elif doc.get("created_by_id") == user_id:
        has_access = True

    if not has_access:
        raise HTTPException(status_code=403, detail="You do not have permission to download this private document")

    category = doc.get("category")
    filename = doc.get("filename")
    try:
        folder_path = resolve_path(category)
        file_path = os.path.abspath(os.path.join(folder_path, filename))
        if not file_path.startswith(os.path.abspath(folder_path)) or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Physical file not found")

        # Log download action
        audit_entry = {
            "document_id": str(doc["_id"]),
            "document_title": doc.get("title"),
            "action": "Download",
            "user_id": current_user.get("id"),
            "user_name": current_user.get("name"),
            "details": f"Downloaded document '{filename}'",
            "timestamp": datetime.utcnow()
        }
        await db.document_audit_logs.insert_one(audit_entry)

        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/octet-stream"
        )
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{doc_id}/category")
async def move_document_category(
    doc_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Moves the file physically on disk, updates db record, audits action, and triggers index rebuild in background.
    """
    new_category = payload.get("category")
    if not new_category:
        raise HTTPException(status_code=400, detail="Missing target category")

    new_category = new_category.lower().strip().replace(" ", "_")
    valid_categories = get_valid_categories()
    if new_category not in valid_categories:
        raise HTTPException(status_code=400, detail=f"Invalid category '{new_category}'")

    db = get_database()
    try:
        doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format")

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    role = (current_user.get("role") or "").lower()
    is_admin = role in ("admin", "administrator")
    is_hr = role == "hr"
    # Authorized if Admin, HR, or the owner
    if not (is_admin or is_hr or doc.get("created_by_id") == current_user.get("id")):
        raise HTTPException(status_code=403, detail="Not authorized to move this document")

    old_category = doc.get("category")
    if old_category == new_category:
        return parse_doc(doc)

    filename = doc.get("filename")
    try:
        old_folder = resolve_path(old_category)
        new_folder = resolve_path(new_category)

        old_file_path = os.path.join(old_folder, filename)
        new_file_path = os.path.join(new_folder, filename)

        # Move the physical file if it exists
        if os.path.exists(old_file_path):
            shutil.move(old_file_path, new_file_path)
        
        # Update DB Record
        await db.documents.update_one(
            {"_id": ObjectId(doc_id)},
            {"$set": {"category": new_category, "file_url": f"/api/documents/preview/{filename}"}}
        )

        updated_doc = await db.documents.find_one({"_id": ObjectId(doc_id)})

        # Log Move Action
        audit_entry = {
            "document_id": doc_id,
            "document_title": doc.get("title"),
            "action": "Move",
            "user_id": current_user.get("id"),
            "user_name": current_user.get("name"),
            "details": f"Moved document '{filename}' from category '{old_category}' to '{new_category}'",
            "timestamp": datetime.utcnow()
        }
        await db.document_audit_logs.insert_one(audit_entry)

        # Trigger AI Index rebuild
        try:
            build_index()
        except Exception as e:
            print(f"[IndexBuilder Warning] Failed to rebuild index: {e}")

        return parse_doc(updated_doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Deletes the physical file, deletes database record, audits action, and triggers index rebuild in background.
    """
    db = get_database()
    try:
        doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format")

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    role = (current_user.get("role") or "").lower()
    is_admin = role in ("admin", "administrator")
    is_hr = role == "hr"
    # Authorized if Admin, HR, or the owner
    if not (is_admin or is_hr or doc.get("created_by_id") == current_user.get("id")):
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")

    category = doc.get("category")
    filename = doc.get("filename")
    try:
        folder_path = resolve_path(category)
        file_path = os.path.join(folder_path, filename)

        # Delete physical file
        if os.path.exists(file_path):
            os.remove(file_path)

        # Delete DB Record
        await db.documents.delete_one({"_id": ObjectId(doc_id)})

        # Log Delete Action
        audit_entry = {
            "document_id": doc_id,
            "document_title": doc.get("title"),
            "action": "Delete",
            "user_id": current_user.get("id"),
            "user_name": current_user.get("name"),
            "details": f"Deleted document '{filename}' from category '{category}'",
            "timestamp": datetime.utcnow()
        }
        await db.document_audit_logs.insert_one(audit_entry)

        # Trigger AI Index rebuild
        try:
            build_index()
        except Exception as e:
            print(f"[IndexBuilder Warning] Failed to rebuild index: {e}")

        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ──────────────────────────────────────────────────────────────────────────────
# ─── ADMIN-ONLY ENDPOINTS ─────────────────────────────────────────────────────
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/admin/audit-logs", dependencies=[Depends(check_hr_or_admin_role)])
async def list_audit_logs():
    """
    Returns list of all audit logs sorted by timestamp descending (Admin & HR Only).
    """
    db = get_database()
    cursor = db.document_audit_logs.find().sort("timestamp", -1)
    logs = []
    async for log in cursor:
        logs.append(parse_doc(log))
    return logs

@router.get("/admin/audit-logs/csv", dependencies=[Depends(check_hr_or_admin_role)])
async def download_audit_logs_csv():
    """
    Generates and returns the document audit logs as a downloadable CSV file.
    """
    db = get_database()
    cursor = db.document_audit_logs.find().sort("timestamp", -1)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow(["Timestamp", "User Name", "User ID", "Action", "Document ID", "Document Title", "Details"])
    
    async for log in cursor:
        writer.writerow([
            log.get("timestamp").isoformat() if isinstance(log.get("timestamp"), datetime) else str(log.get("timestamp")),
            log.get("user_name", ""),
            log.get("user_id", ""),
            log.get("action", ""),
            log.get("document_id", ""),
            log.get("document_title", ""),
            log.get("details", "")
        ])
        
    output.seek(0)
    # Stream response
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=document_audit_logs.csv"}
    )

@router.get("/admin/storage-usage")
async def get_storage_usage(current_user: dict = Depends(check_hr_or_admin_role)):
    """
    Computes storage usage in backend/knowledge directories (Admin/HR Only).
    """
    try:
        categories = list_categories()
        breakdown = {}
        total_size_bytes = 0
        total_files = 0

        for cat in categories:
            try:
                folder = resolve_path(cat)
                cat_size = 0
                cat_files = 0
                if os.path.exists(folder):
                    for entry in os.scandir(folder):
                        if entry.is_file():
                            cat_size += entry.stat().st_size
                            cat_files += 1
                
                # Format category size string
                if cat_size >= 1024 * 1024:
                    cat_size_str = f"{cat_size / (1024 * 1024):.2f} MB"
                elif cat_size >= 1024:
                    cat_size_str = f"{cat_size / 1024:.2f} KB"
                else:
                    cat_size_str = f"{cat_size} Bytes"

                breakdown[cat] = {
                    "files": cat_files,
                    "size_bytes": cat_size,
                    "size_str": cat_size_str
                }
                total_size_bytes += cat_size
                total_files += cat_files
            except Exception:
                continue

        # Format total size string
        if total_size_bytes >= 1024 * 1024:
            total_size_str = f"{total_size_bytes / (1024 * 1024):.2f} MB"
        elif total_size_bytes >= 1024:
            total_size_str = f"{total_size_bytes / 1024:.2f} KB"
        else:
            total_size_str = f"{total_size_bytes} Bytes"

        return {
            "total_size_bytes": total_size_bytes,
            "total_size_str": total_size_str,
            "total_files": total_files,
            "categories": breakdown
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scan storage: {str(e)}")

@router.get("/preview/{doc_id}/text")
async def preview_document_text(doc_id: str, current_user: dict = Depends(get_current_user)):
    """
    Extracts and returns the plain text representation of the document for in-page reading.
    Respects document security permissions.
    """
    db = get_database()
    doc = None
    try:
        if len(doc_id) == 24:
            doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        pass

    if not doc:
        doc = await db.documents.find_one({"filename": doc_id})

    if not doc:
        raise HTTPException(status_code=404, detail="Document metadata not found")

    role = (current_user.get("role") or "").lower()
    is_admin = role in ("admin", "administrator")
    is_hr = role == "hr"
    user_id = current_user.get("id")

    # Access control
    has_access = False
    if doc.get("is_public"):
        has_access = True
    elif is_admin:
        has_access = True
    elif is_hr and doc.get("category") in ("resumes", "documents"):
        has_access = True
    elif doc.get("created_by_id") == user_id:
        has_access = True

    if not has_access:
        raise HTTPException(status_code=403, detail="You do not have permission to preview this private document")

    category = doc.get("category")
    filename = doc.get("filename")
    try:
        folder_path = resolve_path(category)
        file_path = os.path.abspath(os.path.join(folder_path, filename))
        if not file_path.startswith(os.path.abspath(folder_path)) or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Physical file not found")
        
        # Read text content
        text, error = read_document(file_path)
        if error:
            raise HTTPException(status_code=500, detail=f"Failed to read document content: {error}")
            
        return {
            "filename": filename,
            "text": text or "No text content found in document."
        }
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))
