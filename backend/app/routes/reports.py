from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from bson import ObjectId
from typing import List
from app.database import get_database
from app.models.report import ReportCreate, ReportResponse
from app.auth import get_current_user, check_admin_role

router = APIRouter(prefix="/api/reports", tags=["Daily Status Reports"])

@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(report_in: ReportCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    report_dict = report_in.dict()
    report_dict.update({
        "user_id": current_user["id"],
        "created_at": datetime.utcnow()
    })
    
    result = await db.reports.insert_one(report_dict)
    report_dict["id"] = str(result.inserted_id)

    # Emit knowledge event to central Knowledge Layer
    try:
        from app.knowledge.helpers import emit_portal_knowledge
        from app.knowledge.schemas.knowledge import KnowledgeCategory
        
        tasks_text = f"Work Report submitted by {current_user['name']} ({current_user['email']}) on {report_dict['created_at'].isoformat()}.\n"
        tasks_text += f"Completed Tasks:\n{report_dict.get('completed_tasks', '')}\n"
        tasks_text += f"Pending/Plan Tasks:\n{report_dict.get('pending_tasks', '')}\n"
        tasks_text += f"Blockers:\n{report_dict.get('blockers', 'None')}"
        
        await emit_portal_knowledge(
            category=KnowledgeCategory.DAILY_TASKS,
            title=f"Daily Report: {current_user['name']} ({datetime.utcnow().strftime('%d-%m-%Y')})",
            content=tasks_text,
            system_module="reports",
            creator_id=current_user["id"],
            metadata={
                "report_id": report_dict["id"],
                "employee_name": current_user["name"]
            }
        )
    except Exception as e:
        print(f"[Knowledge Emit Warning] Daily report: {e}")

    return report_dict

@router.get("", response_model=List[ReportResponse])
async def list_reports(current_user: dict = Depends(get_current_user)):
    db = get_database()
    role = current_user.get("role")
    is_super = current_user.get("is_super_admin", False) or current_user.get("role") == "administrator"
    
    if role in ("admin", "administrator"):
        if is_super:
            cursor = db.reports.find().sort("created_at", -1)
        else:
            dept = current_user.get("department")
            users = await db.users.find({"department": dept}).to_list(length=1000)
            user_ids = [str(u["_id"]) for u in users]
            cursor = db.reports.find({"user_id": {"$in": user_ids}}).sort("created_at", -1)
    else:
        cursor = db.reports.find({"user_id": current_user["id"]}).sort("created_at", -1)
        
    reports = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        reports.append(doc)
        
    return reports

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(report_id: str, current_user: dict = Depends(check_admin_role)):
    db = get_database()
    is_super = current_user.get("is_super_admin", False) or current_user.get("role") == "administrator"
    
    try:
        report = await db.reports.find_one({"_id": ObjectId(report_id)})
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
            
        if not is_super:
            report_owner_id = report.get("user_id")
            owner = await db.users.find_one({"_id": ObjectId(report_owner_id)})
            if not owner or owner.get("department") != current_user.get("department"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to delete reports for other departments"
                )
                
        result = await db.reports.delete_one({"_id": ObjectId(report_id)})
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report ID format"
        )
    return None
