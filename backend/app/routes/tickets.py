from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from typing import List
from datetime import datetime
from app.database import get_database
from app.auth import get_current_user, check_admin_role, mask_email
from app.models.ticket import TicketCreate, TicketResolve, TicketResponse

router = APIRouter(prefix="/api/tickets", tags=["Support Tickets"])

# Helper function to convert mongo _id to str id
def parse_doc(doc):
    if doc:
        doc["id"] = str(doc.get("_id", doc.get("id")))
    return doc

@router.get("", response_model=List[TicketResponse])
async def list_tickets(current_user: dict = Depends(get_current_user)):
    db = get_database()
    tickets = []
    role = current_user.get("role")
    is_super = current_user.get("is_super_admin", False) or current_user.get("role") == "administrator"
    user_id = current_user["id"]
    user_dept = current_user.get("department", "Engineering")
    
    if role in ("admin", "administrator"):
        if is_super:
            cursor = db.tickets.find().sort("created_at", -1)
        else:
            users = await db.users.find({"department": user_dept}).to_list(length=1000)
            user_ids = [str(u["_id"]) for u in users]
            cursor = db.tickets.find({
                "$or": [
                    {"user_id": {"$in": user_ids}},
                    {"target_department": user_dept}
                ]
            }).sort("created_at", -1)
    else:
        # Standard user: only see tickets they raised OR targeted to their department
        cursor = db.tickets.find({
            "$or": [
                {"user_id": user_id},
                {"target_department": user_dept}
            ]
        }).sort("created_at", -1)
        
    async for doc in cursor:
        doc = parse_doc(doc)
        if not is_super and doc.get("user_id") != user_id:
            doc["user_email"] = mask_email(doc.get("user_email", ""))
        tickets.append(doc)
    return tickets

@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def raise_ticket(ticket_in: TicketCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    ticket_dict = ticket_in.dict()
    ticket_dict.update({
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "user_email": current_user["email"],
        "status": "Open",
        "created_at": datetime.utcnow(),
        "handled_by_id": None,
        "handled_by_name": None,
        "resolved_at": None,
        "resolution_notes": None
    })
    
    result = await db.tickets.insert_one(ticket_dict)
    ticket_dict["id"] = str(result.inserted_id)

    # Emit knowledge record to central Knowledge Layer
    try:
        from app.knowledge.helpers import emit_portal_knowledge
        from app.knowledge.schemas.knowledge import KnowledgeCategory
        
        # Run in background or wait for save
        await emit_portal_knowledge(
            category=KnowledgeCategory.TICKET,
            title=f"Support Ticket #{ticket_dict['id']}: {ticket_dict.get('title', 'No Title')}",
            content=(
                f"Support Ticket raised by {ticket_dict['user_name']} ({ticket_dict['user_email']}).\n"
                f"Priority: {ticket_dict.get('priority', 'Medium')}\n"
                f"Target Department: {ticket_dict.get('target_department', 'IT')}\n"
                f"Description: {ticket_dict.get('description', '')}\n"
                f"Status: {ticket_dict['status']}"
            ),
            system_module="tickets",
            creator_id=ticket_dict['user_id'],
            metadata={
                "ticket_id": ticket_dict["id"],
                "priority": ticket_dict.get("priority"),
                "status": ticket_dict["status"]
            }
        )
    except Exception as e:
        print(f"[Knowledge Emit Warning] Tickets router: {e}")

    return ticket_dict

@router.put("/{ticket_id}/resolve", response_model=TicketResponse)
async def resolve_ticket(ticket_id: str, resolve_in: TicketResolve, current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    try:
        ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Support ticket not found"
            )
            
        is_admin = current_user.get("role") in ("admin", "administrator")
        is_super = current_user.get("is_super_admin", False) or current_user.get("role") == "administrator"
        
        if not is_super:
            creator_user = await db.users.find_one({"_id": ObjectId(ticket.get("user_id"))})
            creator_dept = creator_user.get("department") if creator_user else None
            
            user_dept = current_user.get("department")
            is_target_dept = user_dept.lower() == ticket.get("target_department", "").lower()
            is_creator_dept = creator_dept and user_dept.lower() == creator_dept.lower()
            
            if is_admin:
                if not (is_target_dept or is_creator_dept):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You do not have permission to resolve tickets outside your department"
                    )
            else:
                if not is_target_dept:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You do not have permissions to resolve tickets for this department"
                    )
            
        update_fields = {
            "status": "Closed",
            "handled_by_id": current_user["id"],
            "handled_by_name": current_user["name"],
            "resolved_at": datetime.utcnow(),
            "resolution_notes": resolve_in.resolution_notes
        }
        
        await db.tickets.update_one(
            {"_id": ObjectId(ticket_id)},
            {"$set": update_fields}
        )
        
        updated_ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
        return parse_doc(updated_ticket)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ticket ID format or update error"
        )

@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("admin", "administrator"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required"
        )
        
    db = get_database()
    is_super = current_user.get("is_super_admin", False) or current_user.get("role") == "administrator"
    
    try:
        ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Support ticket not found"
            )
            
        if not is_super:
            creator_user = await db.users.find_one({"_id": ObjectId(ticket.get("user_id"))})
            creator_dept = creator_user.get("department") if creator_user else None
            
            user_dept = current_user.get("department")
            is_target_dept = user_dept.lower() == ticket.get("target_department", "").lower()
            is_creator_dept = creator_dept and user_dept.lower() == creator_dept.lower()
            
            if not (is_target_dept or is_creator_dept):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to delete tickets outside your department"
                )
                
        result = await db.tickets.delete_one({"_id": ObjectId(ticket_id)})
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Support ticket not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ticket ID format or deletion error"
        )
    return None
