from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, Field
from app.database import get_database
from app.auth import get_current_user, mask_email

router = APIRouter(
    prefix="/api/hr",
    tags=["Extended HR Portal"]
)

# Helper function to check roles
def check_manager_or_admin(current_user: dict = Depends(get_current_user)) -> dict:
    role = (current_user.get("role") or "").lower()
    dept = (current_user.get("department") or "").lower()
    
    is_super = current_user.get("is_super_admin", False) or role == "administrator"
    is_hr = role == "hr" or (role in ["admin", "manager"] and dept.startswith("hr"))
    
    if not is_super and not is_hr:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access manager features (Admin/Manager/HR role required)"
        )
    return current_user

# Permission check for HR department members or Admin
def check_hr_or_admin(current_user: dict = Depends(get_current_user)) -> dict:
    role = (current_user.get("role") or "").lower()
    dept = (current_user.get("department") or "").lower()
    
    is_super = current_user.get("is_super_admin", False) or role == "administrator"
    is_hr = role == "hr" or dept.startswith("hr")
    
    if not is_super and not is_hr:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access HR features (HR department or Super Admin required)"
        )
    return current_user

# Helper to serialize Mongo documents safely
def parse_id(doc):
    if not doc:
        return None
    d = doc.copy()
    if "_id" in d:
        d["id"] = str(d["_id"])
        d.pop("_id", None)
    return d

def parse_list(docs):
    return [parse_id(d) for d in docs]

# --- PYDANTIC SCHEMAS ---

class CandidateCreate(BaseModel):
    name: str
    email: str
    phone: str
    experience_years: float
    role_applied: str
    skills: List[str]
    resume_url: str
    notes: Optional[str] = ""
    questions: Optional[List[str]] = None
    questions_by_agent: Optional[dict] = None

class CandidateStatusUpdate(BaseModel):
    status: str
    score: Optional[int] = None
    notes: Optional[str] = None

class InterviewCreate(BaseModel):
    candidate_id: str
    candidate_name: str
    interviewer_name: str
    date: str  # ISO string
    format: str
    meeting_link: str
    notes: Optional[str] = ""

class InterviewFeedbackUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class OnboardingCreate(BaseModel):
    employee_id: str
    employee_name: str
    tasks: List[dict]  # list of task dicts like {"id": "t1", "title": "Setup Git", "completed": false, "due_date": "2026-05-30"}

class DocumentCreate(BaseModel):
    title: str
    category: str
    filename: str
    file_size: str

class PolicyCreate(BaseModel):
    title: str
    category: str
    description: str
    effective_date: str

class FeedbackSubmit(BaseModel):
    rating_workplace: int
    rating_management: int
    rating_worklife: int
    suggestions: str

class PerformanceReviewSubmit(BaseModel):
    employee_id: Optional[str] = None
    review_period: str
    self_score: Optional[float] = None
    self_feedback: Optional[str] = None
    manager_score: Optional[float] = None
    manager_feedback: Optional[str] = None
    strengths: Optional[List[str]] = None
    goals: Optional[List[str]] = None

class TrainingCreate(BaseModel):
    employee_id: str
    employee_name: str
    course_name: str
    provider: str
    tasks: List[dict]

class InviteAIInterview(BaseModel):
    email: str
    questions: List[str]
    questions_by_agent: Optional[dict] = None

class SubmitAIInterview(BaseModel):
    answers: List[dict]

# --- ENDPOINTS ---

# 1. RESUME SCREENING & RECRUITMENT
@router.get("/candidates")
async def get_candidates(current_user: dict = Depends(check_manager_or_admin)):
    db = get_database()
    cursor = db.candidates.find()
    candidates = []
    async for c in cursor:
        candidates.append(parse_id(c))
    return candidates

@router.post("/candidates", status_code=status.HTTP_201_CREATED)
async def create_candidate(candidate_in: CandidateCreate, current_user: dict = Depends(check_manager_or_admin)):
    db = get_database()
    cand_dict = candidate_in.dict()
    cand_dict.update({
        "score": 0,
        "status": "Screened",
        "created_at": datetime.utcnow()
    })
    result = await db.candidates.insert_one(cand_dict)
    cand_dict["id"] = str(result.inserted_id)
    cand_dict.pop("_id", None)

    # Emit knowledge event to central Knowledge Layer
    try:
        from app.knowledge.helpers import emit_portal_knowledge
        from app.knowledge.schemas.knowledge import KnowledgeCategory
        await emit_portal_knowledge(
            category=KnowledgeCategory.RESUME,
            title=f"Candidate Profile: {cand_dict['name']}",
            content=(
                f"Candidate {cand_dict['name']} applied for role: {cand_dict['role_applied']}.\n"
                f"Email: {cand_dict['email']}\n"
                f"Phone: {cand_dict['phone']}\n"
                f"Experience: {cand_dict['experience_years']} years\n"
                f"Key Skills: {', '.join(cand_dict['skills'])}\n"
                f"Notes: {cand_dict.get('notes', '')}"
            ),
            system_module="hr_extended",
            creator_id=current_user["id"],
            metadata={
                "candidate_id": cand_dict["id"],
                "candidate_name": cand_dict["name"],
                "skills": cand_dict["skills"],
                "experience": f"{cand_dict['experience_years']} years"
            }
        )
    except Exception as e:
        print(f"[Knowledge Emit Warning] Candidate creation: {e}")

    return cand_dict

@router.put("/candidates/{candidate_id}/status")
async def update_candidate_status(candidate_id: str, payload: CandidateStatusUpdate, current_user: dict = Depends(check_manager_or_admin)):
    db = get_database()
    query = {"_id": ObjectId(candidate_id)} if len(candidate_id) == 24 else {"id": candidate_id}
    
    cand = await db.candidates.find_one(query)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    set_dict = {"status": payload.status}
    if payload.score is not None:
        set_dict["score"] = payload.score
    if payload.notes is not None:
        set_dict["notes"] = payload.notes
        
    await db.candidates.update_one(query, {"$set": set_dict})
    updated = await db.candidates.find_one(query)
    return parse_id(updated)

# 2. INTERVIEW SCHEDULING
@router.get("/interviews")
async def get_interviews(current_user: dict = Depends(get_current_user)):
    db = get_database()
    cursor = db.interviews.find()
    interviews = []
    async for i in cursor:
        interviews.append(parse_id(i))
    
    # Filter if user is not manager/admin
    if current_user.get("role") not in ["admin", "manager"]:
        name = current_user.get("name", "")
        # Only see interviews assigned to them as interviewer or candidate name
        interviews = [i for i in interviews if name.lower() in i.get("interviewer_name", "").lower() or name.lower() in i.get("candidate_name", "").lower()]
        
    return interviews

@router.post("/interviews", status_code=status.HTTP_201_CREATED)
async def schedule_interview(interview_in: InterviewCreate, current_user: dict = Depends(check_manager_or_admin)):
    db = get_database()
    int_dict = interview_in.dict()
    int_dict.update({
        "status": "Scheduled"
    })
    result = await db.interviews.insert_one(int_dict)
    int_dict["id"] = str(result.inserted_id)
    int_dict.pop("_id", None)
    return int_dict

@router.put("/interviews/{interview_id}/feedback")
async def update_interview_feedback(interview_id: str, payload: InterviewFeedbackUpdate, current_user: dict = Depends(check_manager_or_admin)):
    db = get_database()
    query = {"_id": ObjectId(interview_id)} if len(interview_id) == 24 else {"id": interview_id}
    
    interview = await db.interviews.find_one(query)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    set_dict = {"status": payload.status}
    if payload.notes is not None:
        set_dict["notes"] = payload.notes
        
    await db.interviews.update_one(query, {"$set": set_dict})
    updated = await db.interviews.find_one(query)
    return parse_id(updated)

# 3. ONBOARDING WORKFLOWS
@router.get("/onboarding")
async def get_onboarding(current_user: dict = Depends(get_current_user)):
    db = get_database()
    role = (current_user.get("role") or "").lower()
    dept = (current_user.get("department") or "").lower()
    is_super = current_user.get("is_super_admin", False) or role == "administrator"
    is_hr_manager = role == "hr" or (role in ["admin", "manager"] and dept.startswith("hr"))
    
    if is_super or is_hr_manager:
        cursor = db.onboarding.find()
        onboarding_list = []
        async for o in cursor:
            onboarding_list.append(parse_id(o))
        return onboarding_list
    else:
        # Standard user: only see their own onboarding checklist
        query = {"employee_id": current_user["id"]}
        o = await db.onboarding.find_one(query)
        if not o:
            # If no onboarding checklist exists, return empty or create a blank one for user
            return []
        return [parse_id(o)]

@router.post("/onboarding", status_code=status.HTTP_201_CREATED)
async def create_onboarding(onboarding_in: OnboardingCreate, current_user: dict = Depends(check_manager_or_admin)):
    db = get_database()
    onb_dict = onboarding_in.dict()
    onb_dict.update({
        "last_updated": datetime.utcnow()
    })
    result = await db.onboarding.insert_one(onb_dict)
    onb_dict["id"] = str(result.inserted_id)
    onb_dict.pop("_id", None)
    return onb_dict

@router.put("/onboarding/{onboarding_id}/tasks/{task_id}/toggle")
async def toggle_onboarding_task(onboarding_id: str, task_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {"_id": ObjectId(onboarding_id)} if len(onboarding_id) == 24 else {"id": onboarding_id}
    
    onb = await db.onboarding.find_one(query)
    if not onb:
        raise HTTPException(status_code=404, detail="Onboarding checklist not found")
        
    role = (current_user.get("role") or "").lower()
    dept = (current_user.get("department") or "").lower()
    is_super = current_user.get("is_super_admin", False) or role == "administrator"
    is_hr_manager = role == "hr" or (role in ["admin", "manager"] and dept.startswith("hr"))
    
    # Standard user check: can only update their own onboarding tasks
    if not is_super and not is_hr_manager and onb.get("employee_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this checklist")
        
    tasks = onb.get("tasks", [])
    updated_tasks = []
    task_found = False
    
    for t in tasks:
        if t.get("id") == task_id:
            t["completed"] = not t.get("completed", False)
            task_found = True
        updated_tasks.append(t)
        
    if not task_found:
        raise HTTPException(status_code=404, detail="Task not found in onboarding checklist")
        
    await db.onboarding.update_one(query, {"$set": {
        "tasks": updated_tasks,
        "last_updated": datetime.utcnow()
    }})
    
    updated = await db.onboarding.find_one(query)
    return parse_id(updated)

# 4. EMPLOYEE DOCUMENTATION
@router.get("/documents")
async def get_documents(current_user: dict = Depends(get_current_user)):
    db = get_database()
    role = (current_user.get("role") or "").lower()
    dept = (current_user.get("department") or "").lower()
    is_super = current_user.get("is_super_admin", False) or role == "administrator"
    is_hr_manager = role == "hr" or (role in ["admin", "manager"] and dept.startswith("hr"))
    
    if is_super or is_hr_manager:
        cursor = db.hr_documents.find()
        docs = []
        async for d in cursor:
            docs.append(parse_id(d))
        return docs
    else:
        # Standard user: only see their own uploaded documents
        cursor = db.hr_documents.find({"employee_id": current_user["id"]})
        docs = []
        async for d in cursor:
            docs.append(parse_id(d))
        return docs

@router.post("/documents", status_code=status.HTTP_201_CREATED)
async def upload_document(doc_in: DocumentCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    doc_dict = doc_in.dict()
    doc_dict.update({
        "employee_id": current_user["id"],
        "employee_name": current_user["name"],
        "status": "Verified",
        "uploaded_at": datetime.utcnow()
    })
    result = await db.hr_documents.insert_one(doc_dict)
    doc_dict["id"] = str(result.inserted_id)
    doc_dict.pop("_id", None)
    return doc_dict

# 5. POLICY ACKNOWLEDGEMENT & COMPLIANCE
@router.get("/policies")
async def get_policies(current_user: dict = Depends(get_current_user)):
    db = get_database()
    cursor = db.policy_acknowledgements.find()
    policies = []
    user_id = current_user["id"]
    
    async for p in cursor:
        p_dict = parse_id(p)
        acknowledged_by = p_dict.get("acknowledged_by", [])
        p_dict["acknowledged"] = user_id in acknowledged_by
        policies.append(p_dict)
        
    return policies

@router.post("/policies", status_code=status.HTTP_201_CREATED)
async def create_policy(policy_in: PolicyCreate, current_user: dict = Depends(check_manager_or_admin)):
    db = get_database()
    pol_dict = policy_in.dict()
    pol_dict.update({
        "acknowledged_by": []
    })
    result = await db.policy_acknowledgements.insert_one(pol_dict)
    pol_dict["id"] = str(result.inserted_id)
    pol_dict.pop("_id", None)
    return pol_dict

@router.post("/policies/{policy_id}/acknowledge")
async def acknowledge_policy(policy_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {"_id": ObjectId(policy_id)} if len(policy_id) == 24 else {"id": policy_id}
    
    policy = await db.policy_acknowledgements.find_one(query)
    if not policy:
        raise HTTPException(status_code=404, detail="Compliance policy not found")
        
    user_id = current_user["id"]
    acknowledged_by = policy.get("acknowledged_by", [])
    if user_id not in acknowledged_by:
        acknowledged_by.append(user_id)
        await db.policy_acknowledgements.update_one(query, {"$set": {"acknowledged_by": acknowledged_by}})
        
    updated = await db.policy_acknowledgements.find_one(query)
    res_dict = parse_id(updated)
    res_dict["acknowledged"] = True
    return res_dict

# 6. TRAINING & COURSE PROGRESS
@router.post("/trainings", status_code=status.HTTP_201_CREATED)
async def create_training(training_in: TrainingCreate, current_user: dict = Depends(check_manager_or_admin)):
    db = get_database()
    t_dict = training_in.dict()
    
    # Calculate initial progress
    tasks = t_dict.get("tasks", [])
    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.get("completed", False))
    progress = int((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0
    status_str = "Completed" if progress == 100 else "In Progress"
    
    t_dict.update({
        "progress": progress,
        "status": status_str
    })
    result = await db.trainings.insert_one(t_dict)
    t_dict["id"] = str(result.inserted_id)
    t_dict.pop("_id", None)
    return t_dict

@router.get("/trainings")
async def get_trainings(current_user: dict = Depends(get_current_user)):
    db = get_database()
    role = (current_user.get("role") or "").lower()
    dept = (current_user.get("department") or "").lower()
    is_super = current_user.get("is_super_admin", False) or role == "administrator"
    is_hr_manager = role == "hr" or (role in ["admin", "manager"] and dept.startswith("hr"))
    
    if is_super or is_hr_manager:
        cursor = db.trainings.find()
        trainings = []
        async for t in cursor:
            trainings.append(parse_id(t))
        return trainings
    else:
        # Standard user: only see their assigned trainings
        cursor = db.trainings.find({"employee_id": current_user["id"]})
        trainings = []
        async for t in cursor:
            trainings.append(parse_id(t))
        return trainings

@router.put("/trainings/{training_id}/tasks/{task_id}/toggle")
async def toggle_training_task(training_id: str, task_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {"_id": ObjectId(training_id)} if len(training_id) == 24 else {"id": training_id}
    
    training = await db.trainings.find_one(query)
    if not training:
        raise HTTPException(status_code=404, detail="Training record not found")
        
    role = (current_user.get("role") or "").lower()
    dept = (current_user.get("department") or "").lower()
    is_super = current_user.get("is_super_admin", False) or role == "administrator"
    is_hr_manager = role == "hr" or (role in ["admin", "manager"] and dept.startswith("hr"))
    
    # Standard user check
    if not is_super and not is_hr_manager and training.get("employee_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this training record")
        
    tasks = training.get("tasks", [])
    updated_tasks = []
    task_found = False
    
    for t in tasks:
        if t.get("id") == task_id:
            t["completed"] = not t.get("completed", False)
            task_found = True
        updated_tasks.append(t)
        
    if not task_found:
        raise HTTPException(status_code=404, detail="Task not found in training modules")
        
    # Automatically recalculate progress and status
    total_tasks = len(updated_tasks)
    completed_tasks = sum(1 for t in updated_tasks if t.get("completed", False))
    progress = int((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 100
    
    status_str = "Completed" if progress == 100 else "In Progress"
    
    await db.trainings.update_one(query, {"$set": {
        "tasks": updated_tasks,
        "progress": progress,
        "status": status_str
    }})
    
    updated = await db.trainings.find_one(query)
    return parse_id(updated)

# 7. PERFORMANCE REVIEWS
@router.get("/performance")
async def get_performance_reviews(current_user: dict = Depends(get_current_user)):
    db = get_database()
    role = (current_user.get("role") or "").lower()
    dept = (current_user.get("department") or "").lower()
    is_super = current_user.get("is_super_admin", False) or role == "administrator"
    is_hr_manager = role == "hr" or (role in ["admin", "manager"] and dept.startswith("hr"))
    
    if is_super or is_hr_manager:
        cursor = db.performance_reviews.find()
        reviews = []
        async for r in cursor:
            reviews.append(parse_id(r))
        return reviews
    else:
        # Standard user: only see their own performance reviews
        cursor = db.performance_reviews.find({"employee_id": current_user["id"]})
        reviews = []
        async for r in cursor:
            reviews.append(parse_id(r))
        return reviews

@router.post("/performance")
async def submit_performance_review(payload: PerformanceReviewSubmit, current_user: dict = Depends(get_current_user)):
    db = get_database()
    role = (current_user.get("role") or "").lower()
    dept = (current_user.get("department") or "").lower()
    is_super = current_user.get("is_super_admin", False) or role == "administrator"
    is_hr_manager = role == "hr" or (role in ["admin", "manager"] and dept.startswith("hr"))
    
    is_authorized_manager = is_super or is_hr_manager
    
    # Determine the target employee ID
    target_emp_id = payload.employee_id
    if not is_authorized_manager or not target_emp_id:
        target_emp_id = current_user["id"]
        
    # Check if a review already exists for this employee and period
    query = {"employee_id": target_emp_id, "review_period": payload.review_period}
    existing = await db.performance_reviews.find_one(query)
    
    if existing:
        # Update existing
        set_dict = {"last_updated": datetime.utcnow()}
        
        # General employees can only edit self score and self feedback
        if not is_authorized_manager:
            if payload.self_score is not None:
                set_dict["self_score"] = payload.self_score
            if payload.self_feedback is not None:
                set_dict["self_feedback"] = payload.self_feedback
        else:
            # Admins/Managers can update everything
            if payload.self_score is not None:
                set_dict["self_score"] = payload.self_score
            if payload.self_feedback is not None:
                set_dict["self_feedback"] = payload.self_feedback
            if payload.manager_score is not None:
                set_dict["manager_score"] = payload.manager_score
            if payload.manager_feedback is not None:
                set_dict["manager_feedback"] = payload.manager_feedback
            if payload.strengths is not None:
                set_dict["strengths"] = payload.strengths
            if payload.goals is not None:
                set_dict["goals"] = payload.goals
            if payload.manager_score is not None and payload.manager_feedback:
                set_dict["status"] = "Finalized"
                
        await db.performance_reviews.update_one(query, {"$set": set_dict})
        updated = await db.performance_reviews.find_one(query)
        return parse_id(updated)
    else:
        # Create new
        # Get target employee details
        emp_query = {"_id": ObjectId(target_emp_id)} if len(target_emp_id) == 24 else {"id": target_emp_id}
        emp_user = await db.users.find_one(emp_query)
        emp_name = emp_user.get("name", "Unknown Employee") if emp_user else "Unknown Employee"
        
        new_review = {
            "employee_id": target_emp_id,
            "employee_name": emp_name,
            "review_period": payload.review_period,
            "self_score": payload.self_score or 0.0,
            "self_feedback": payload.self_feedback or "",
            "manager_score": payload.manager_score or 0.0,
            "manager_feedback": payload.manager_feedback or "",
            "strengths": payload.strengths or [],
            "goals": payload.goals or [],
            "status": "Finalized" if (payload.manager_score and payload.manager_feedback) else "Pending Manager",
            "last_updated": datetime.utcnow()
        }
        result = await db.performance_reviews.insert_one(new_review)
        new_review["id"] = str(result.inserted_id)
        new_review.pop("_id", None)
        return new_review

# 8. EMPLOYEE ENGAGEMENT FEEDBACK
@router.post("/feedback", status_code=status.HTTP_201_CREATED)
async def submit_feedback(payload: FeedbackSubmit):
    db = get_database()
    fb_dict = payload.dict()
    fb_dict.update({
        "submitted_at": datetime.utcnow()
    })
    result = await db.feedback.insert_one(fb_dict)
    fb_dict["id"] = str(result.inserted_id)
    fb_dict.pop("_id", None)
    return fb_dict

@router.get("/feedback")
async def get_feedback_metrics(current_user: dict = Depends(check_manager_or_admin)):
    db = get_database()
    cursor = db.feedback.find()
    feedbacks = []
    async for f in cursor:
        feedbacks.append(f)
        
    if not feedbacks:
        return {
            "average_workplace": 0.0,
            "average_management": 0.0,
            "average_worklife": 0.0,
            "total_responses": 0,
            "suggestions": []
        }
        
    total = len(feedbacks)
    avg_wp = sum(f.get("rating_workplace", 0) for f in feedbacks) / total
    avg_mg = sum(f.get("rating_management", 0) for f in feedbacks) / total
    avg_wl = sum(f.get("rating_worklife", 0) for f in feedbacks) / total
    
    suggestions = [f.get("suggestions") for f in feedbacks if f.get("suggestions")]
    
    return {
        "average_workplace": round(avg_wp, 2),
        "average_management": round(avg_mg, 2),
        "average_worklife": round(avg_wl, 2),
        "total_responses": total,
        "suggestions": suggestions
    }


# --- GEMINI GENERATION SERVICE ---
def generate_questions_with_gemini(candidate_name, skills, role_applied, agent_type) -> list:
    import urllib.request
    import json
    import os
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return []
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    prompt = f"""
    You are {agent_type}, an expert interviewer for the role of {role_applied}.
    The candidate's name is {candidate_name} and they have the following skills: {", ".join(skills)}.
    
    Based on your interviewer persona:
    - Ava (Technical Lead): Focus on deep technical questions, system architecture, performance, database optimization, and React/Python deep concepts.
    - Marcus (Product Manager): Focus on agile processes, sprint planning, project delivery, requirements prioritization, risk mitigation, and product metrics.
    - Sophia (HR Specialist): Focus on behavioral questions, team collaboration, cultural alignment, core conflict resolution, learning adaptability, and career goals.
    - Dexter (Genius Dev): Focus on code quality, testing suites, legacy code refactoring, system debugging, secure coding standards (OWASP), and development tools.
    
    Generate exactly 5 highly customized, professional, and challenging interview questions for this candidate.
    Return ONLY a valid JSON array of strings containing the questions. Do not include markdown formatting or extra text.
    """
    
    data = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=8.0) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            text = res_data["candidates"][0]["content"]["parts"][0]["text"]
            questions = json.loads(text)
            if isinstance(questions, list) and len(questions) >= 5:
                return questions[:5]
    except Exception as e:
        print(f"[GEMINI API ERROR] {e}")
    return []

# 9. RESUME SCANNING & TAILORED QUESTIONS
@router.post("/scan-resume")
async def scan_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(check_hr_or_admin)
):
    import io
    import re
    contents = await file.read()
    filename = file.filename or "resume.pdf"
    
    text_content = ""
    filename_lower = filename.lower()
    
    if filename_lower.endswith(".pdf"):
        try:
            from pypdf import PdfReader
            pdf_file = io.BytesIO(contents)
            reader = PdfReader(pdf_file)
            extracted_pages = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    extracted_pages.append(page_text)
            text_content = "\n".join(extracted_pages)
        except Exception as e:
            print(f"[PDF EXTRACTION ERROR] {e}")
            try:
                text_content = contents.decode("utf-8", errors="ignore")
            except Exception:
                text_content = ""
    else:
        try:
            text_content = contents.decode("utf-8")
        except UnicodeDecodeError:
            import string
            printable = set(string.printable)
            text_content = "".join(chr(x) if chr(x) in printable else " " for x in contents)

    # Analyze the text content for key skills
    skills_map = {
        "React": ["react", "react.js", "frontend", "redux", "next.js"],
        "Python": ["python", "django", "fastapi", "flask", "numpy", "pandas"],
        "JavaScript": ["javascript", "js", "typescript", "ts", "node.js", "express"],
        "SQL": ["sql", "mysql", "postgresql", "postgres", "sqlite", "oracle", "database"],
        "AWS": ["aws", "amazon web services", "s3", "ec2", "rds", "lambda", "cloud"],
        "Docker": ["docker", "kubernetes", "k8s", "devops", "ci/cd", "jenkins"],
        "Java": ["java", "spring", "spring boot", "hibernate"],
        "Machine Learning": ["machine learning", "ml", "deep learning", "dl", "pytorch", "tensorflow", "scikit-learn"],
        "Project Management": ["management", "scrum", "agile", "pm", "pmp", "leader", "leadership"]
    }
    
    detected_skills = []
    text_lower = text_content.lower()
    
    for skill, keywords in skills_map.items():
        for kw in keywords:
            kw_lower = kw.lower()
            if kw_lower.isalnum():
                pattern = rf"\b{re.escape(kw_lower)}\b"
                if re.search(pattern, text_lower):
                    detected_skills.append(skill)
                    break
            else:
                if kw_lower in text_lower:
                    detected_skills.append(skill)
                    break
                
    if not detected_skills:
        detected_skills = ["Communication", "Problem Solving", "Adaptability"]

    # Estimate experience years
    experience_years = 1.0
    exp_matches = re.findall(r"(\d+)\s*(?:\+)?\s*(?:year|yr)", text_lower)
    if exp_matches:
        try:
            years = [int(y) for y in exp_matches if int(y) < 50]
            if years:
                experience_years = float(max(years))
        except ValueError:
            pass

    # Extract Candidate Name (best effort from filename)
    candidate_name = filename.split(".")[0].replace("_", " ").replace("-", " ").title()
    for word in ["Resume", "Cv", "Bio", "Profile", "Final", "2026", "2025", "Job"]:
        candidate_name = re.sub(rf"\b{word}\b", "", candidate_name, flags=re.I).strip()
    if not candidate_name or len(candidate_name) < 2:
        candidate_name = "Candidate Profile"

    # Extract Candidate Email (best effort from text)
    email_matches = re.findall(r"[\w\.-]+@[\w\.-]+\.\w+", text_content)
    extracted_email = email_matches[0] if email_matches else "candidate@domain.com"
    
    # Extract Candidate Phone (best effort from text)
    phone_matches = re.findall(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", text_content)
    extracted_phone = phone_matches[0] if phone_matches else "+1-555-0100"

    # Generate tailored interview questions based on the candidate's skills and agents
    questions_pool = {
        "React": [
            "Explain the difference between functional components with Hooks and class components. When would you use each?",
            "How does React's virtual DOM reconciliation algorithm work under the hood?",
            "What is your approach to application-wide state management in a large-scale React application?",
            "Can you explain the difference between useEffect, useMemo, and useCallback hooks, and give optimization examples?",
            "How do you handle error boundaries and lazy loading in React to optimize page loading performance?"
        ],
        "Python": [
            "Explain the difference between deep copying and shallow copying in Python, and how the copy module works.",
            "What are generators and decorators in Python? Write a quick example of a caching decorator.",
            "How does Python's Global Interpreter Lock (GIL) impact multi-threaded programs, and how do you achieve parallelism?",
            "Compare asynchronous programming using asyncio in Python with traditional multi-processing.",
            "How does memory management and garbage collection work in Python (reference counting and generational collection)?"
        ],
        "JavaScript": [
            "Explain the JavaScript event loop, microtasks, and macrotasks. How do Promises execute relative to setTimeout?",
            "What is a closure in JavaScript, and what are some common use cases or memory leak pitfalls associated with them?",
            "How do you handle asynchronous operations in JavaScript, and what are the advantages of async/await over promises?"
        ],
        "SQL": [
            "Explain the difference between INNER JOIN, LEFT OUTER JOIN, and RIGHT OUTER JOIN, with performance implications.",
            "What are database indexes? How do they speed up lookups, and what are the trade-offs of having too many indexes?",
            "What are the ACID properties in database transactions? Explain how they are maintained under heavy concurrent loads.",
            "Can you explain the difference between normalization (up to 3NF) and denormalization, and when to use denormalization?"
        ],
        "AWS": [
            "How do you design a highly available, fault-tolerant, and secure architecture for a web app on AWS?",
            "Compare serverless compute (AWS Lambda) with containerized orchestration (ECS/EKS) in terms of scaling and cost.",
            "What is the difference between AWS IAM users, groups, roles, and policies? What is the best practice for assigning permissions?",
            "How would you securely store database credentials or API secrets in AWS (e.g. Secrets Manager vs. Parameter Store)?"
        ],
        "Docker": [
            "Explain the architecture of Docker containers. How do namespaces and cgroups isolate applications?",
            "What are multi-stage Docker builds, and how do they help optimize container security and final image sizes?",
            "What is your strategy for container orchestration? Contrast Docker Compose with full Kubernetes scaling.",
            "Explain how Kubernetes handles service discovery, load balancing, and ingress routing."
        ],
        "Java": [
            "Explain JVM architecture and how its garbage collectors (like G1 or ZGC) manage heap memory and pause times.",
            "What is the Spring framework's Dependency Injection (DI) and Inversion of Control (IoC), and how does it benefit testing?",
            "How do you ensure thread safety in Java? Explain synchronized blocks, volatile variables, and ReentrantLocks."
        ],
        "Machine Learning": [
            "What is the bias-variance trade-off in machine learning? How do you diagnose and address overfitting in a model?",
            "Explain how gradient descent works, and compare batch gradient descent with SGD and Adam optimizers.",
            "What are the differences between bagging and boosting algorithms? Give examples of each (e.g., Random Forest vs. XGBoost)."
        ],
        "Project Management": [
            "How do you manage client expectations, scope creep, and changing requirements mid-sprint in an Agile environment?",
            "What is your strategy for identifying, tracking, and mitigating project risks and technical debt?",
            "How do you foster high collaboration and resolve interpersonal conflicts within a cross-functional product team?"
        ]
    }
    
    default_questions = [
        "Tell me about a challenging technical project you worked on recently. What was your role and the key outcome?",
        "How do you approach learning new technologies or frameworks when starting a new project?",
        "Describe a time when you had to debug a complex system issue under tight deadlines. How did you diagnose it?",
        "How do you handle disagreement with team members or stakeholders regarding technical design decisions?",
        "What strategies do you use to ensure the code you write is maintainable, clean, and well-tested?"
    ]

    questions_pool_by_agent = {
        "Ava": [
            "Explain the difference between functional components with Hooks and class components. When would you use each?",
            "How does React's virtual DOM reconciliation algorithm work under the hood?",
            "What is your approach to application-wide state management in a large-scale React application?",
            "Can you explain the difference between useEffect, useMemo, and useCallback hooks, and give optimization examples?",
            "How do you handle error boundaries and lazy loading in React to optimize page loading performance?"
        ],
        "Marcus": [
            "How do you manage client expectations, scope creep, and changing requirements mid-sprint in an Agile environment?",
            "What is your strategy for identifying, tracking, and mitigating project risks and technical debt?",
            "How do you foster high collaboration and resolve interpersonal conflicts within a cross-functional product team?",
            "How do you balance high-priority feature requests against technical refactoring of core systems?",
            "How do you define success milestones for a product launch and verify them using analytics telemetry?"
        ],
        "Sophia": [
            "Tell me about a challenging technical project you worked on recently. What was your role and the key outcome?",
            "How do you approach learning new technologies or frameworks when starting a new project?",
            "Describe a time when you had to debug a complex system issue under tight deadlines. How did you diagnose it?",
            "How do you handle disagreement with team members or stakeholders regarding technical design decisions?",
            "What strategies do you use to ensure the code you write is maintainable, clean, and well-tested?"
        ],
        "Dexter": [
            "How do you approach refactoring a piece of legacy, poorly written code that has no existing unit tests?",
            "What is your debugging process when dealing with a race condition or memory leak in a production environment?",
            "What automated linting, formatting, and static analysis tools do you include in your standard developer pipeline?",
            "Describe your ideal local developer environment setup. What tools make you the most productive?",
            "How do you ensure security standards like OWASP Top 10 and secure data validation are strictly maintained in your code?"
        ]
    }

    # Generate questions by agent dynamically (Gemini with safe local fallback)
    agents = ["Ava", "Marcus", "Sophia", "Dexter"]
    questions_by_agent = {}
    
    for agent in agents:
        gemini_questions = generate_questions_with_gemini(candidate_name, detected_skills, "Software Developer", agent)
        if gemini_questions:
            questions_by_agent[agent] = gemini_questions
        else:
            agent_pool = []
            if agent == "Ava":
                # Mix skills questions
                for skill in detected_skills:
                    if skill in questions_pool:
                        for q in questions_pool[skill]:
                            if q not in agent_pool:
                                agent_pool.append(q)
                                break
                while len(agent_pool) < 5:
                    dq = default_questions[len(agent_pool) % len(default_questions)]
                    if dq not in agent_pool:
                        agent_pool.append(dq)
            else:
                theme_questions = questions_pool_by_agent.get(agent, default_questions)
                agent_pool = theme_questions[:5]
            questions_by_agent[agent] = agent_pool[:5]

    return {
        "candidate_name": candidate_name,
        "filename": filename,
        "skills": detected_skills,
        "experience_years": experience_years,
        "email": extracted_email,
        "phone": extracted_phone,
        "questions": questions_by_agent["Ava"],  # default back for backwards compatibility
        "questions_by_agent": questions_by_agent,
        "timestamp": datetime.utcnow().isoformat()
    }


# 10. AI INTERVIEW ENDPOINTS

def send_interview_invite_email(receiver_email: str, candidate_name: str, role_applied: str, meeting_link: str) -> bool:
    import smtplib
    import ssl
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from app.config import settings
    
    # Retrieve SMTP configurations
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT
    smtp_username = settings.SMTP_USERNAME
    smtp_password = settings.SMTP_PASSWORD.replace(" ", "") if settings.SMTP_PASSWORD else ""
    smtp_sender = settings.SMTP_SENDER or smtp_username
    
    # If credentials are not configured, print mock log to terminal and return
    if not smtp_username or not smtp_password:
        print(f"\n[MOCK EMAIL SERVICE] SMTP not configured. Dispatched simulated AI Interview Link to {candidate_name} ({receiver_email}): http://localhost:5173{meeting_link}\n")
        return False

    # Construct professional HTML email body
    message = MIMEMultipart("alternative")
    message["Subject"] = f"Action Required: Invitation to AI Technical Interview for {role_applied}"
    message["From"] = smtp_sender
    message["To"] = receiver_email

    full_room_link = f"http://localhost:5173{meeting_link}"

    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 20px; border-radius: 10px;">
        <div style="max-width: 550px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #334155; text-align: center;">
          <div style="display: inline-block; background: linear-gradient(135deg, #a855f7, #3b82f6); padding: 2px; border-radius: 12px; margin-bottom: 20px;">
            <div style="background-color: #0f172a; padding: 10px 20px; border-radius: 10px; font-weight: bold; color: #ffffff;">WorkPulse AI Recruitment</div>
          </div>
          <h2 style="color: #f1f5f9; font-weight: 800; margin-top: 0; font-family: 'Inter', sans-serif; text-align: left;">Dear {candidate_name},</h2>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; text-align: left;">
            Thank you for applying for the <strong>{role_applied}</strong> position at our organization. We have reviewed your resume and would love to invite you to complete a short, 5-question automated technical AI interview.
          </p>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; text-align: left;">
            During the interview, the AI will voice the questions and you can answer by typing or using your microphone. Your responses will be recorded and transcribed for our team to review.
          </p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="{full_room_link}" style="display: inline-block; background: linear-gradient(135deg, #a855f7, #3b82f6); color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
              Enter AI Interview Room
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 12px; margin-top: 20px; line-height: 1.5; text-align: left;">
            Please ensure you are in a quiet environment and have a functioning microphone before starting the interview.
          </p>
          
          <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
          
          <p style="color: #475569; font-size: 11px; text-align: center; line-height: 1.5;">
            This email was sent automatically on behalf of WorkPulse Inc. Recruiter Team.
          </p>
        </div>
      </body>
    </html>
    """
    
    part = MIMEText(html, "html")
    message.attach(part)

    try:
        context = ssl.create_default_context()
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context, timeout=5.0) as server:
                server.login(smtp_username, smtp_password)
                server.sendmail(smtp_sender, receiver_email, message.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=5.0) as server:
                server.starttls(context=context)
                server.login(smtp_username, smtp_password)
                server.sendmail(smtp_sender, receiver_email, message.as_string())
        print(f"[EMAIL SUCCESS] Dispatched AI Interview link to {receiver_email}!")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send AI Interview invite email to {receiver_email} via SMTP: {e}")
        return False


@router.post("/candidates/{candidate_id}/invite-ai-interview")
async def invite_ai_interview(
    candidate_id: str,
    payload: InviteAIInterview,
    current_user: dict = Depends(check_hr_or_admin)
):
    db = get_database()
    query = {"_id": ObjectId(candidate_id)} if len(candidate_id) == 24 else {"id": candidate_id}
    
    candidate = await db.candidates.find_one(query)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    meeting_link = f"/ai-interview/{candidate_id}"
    update_data = {
        "email": payload.email,
        "questions": payload.questions,
        "status": "AI Invited",
        "meeting_link": meeting_link,
        "invited_at": datetime.utcnow().isoformat()
    }
    if payload.questions_by_agent:
        update_data["questions_by_agent"] = payload.questions_by_agent
    elif candidate.get("questions_by_agent"):
        update_data["questions_by_agent"] = candidate.get("questions_by_agent")
        
    await db.candidates.update_one(query, {"$set": update_data})
    
    # Try sending real SMTP email
    email_sent = send_interview_invite_email(
        receiver_email=payload.email,
        candidate_name=candidate.get("name", "Candidate"),
        role_applied=candidate.get("role_applied", "Software Engineer"),
        meeting_link=meeting_link
    )
    
    return {
        "meeting_link": meeting_link,
        "email_sent": email_sent,
        "message": f"AI Interview meeting link dispatched to {payload.email} successfully!"
    }


@router.delete("/candidates/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_candidate(
    candidate_id: str,
    current_user: dict = Depends(check_manager_or_admin)
):
    db = get_database()
    try:
        query = {"_id": ObjectId(candidate_id)} if len(candidate_id) == 24 else {"id": candidate_id}
    except Exception:
        query = {"id": candidate_id}
        
    cand = await db.candidates.find_one(query)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate dossier not found")
        
    await db.candidates.delete_one(query)
    return None


@router.get("/public/candidates/{candidate_id}")
async def get_candidate_public(candidate_id: str):
    db = get_database()
    try:
        query = {"_id": ObjectId(candidate_id)} if len(candidate_id) == 24 else {"id": candidate_id}
    except Exception:
        query = {"id": candidate_id}
    candidate = await db.candidates.find_one(query)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate or Interview link not valid")
        
    default_questions = candidate.get("questions") or [
        "Explain your experience with standard software development tools.",
        "How do you ensure task completion under tight constraints?",
        "Discuss your background in modular application layouts.",
        "Explain how you handle error boundary cases in logic.",
        "What strategies do you use to ensure code quality?"
    ]
    
    questions_by_agent = candidate.get("questions_by_agent") or {
        "Ava": default_questions,
        "Marcus": [
            "How do you manage client expectations, scope creep, and changing requirements mid-sprint in an Agile environment?",
            "What is your strategy for identifying, tracking, and mitigating project risks and technical debt?",
            "How do you foster high collaboration and resolve interpersonal conflicts within a cross-functional product team?",
            "How do you balance high-priority feature requests against technical refactoring of core systems?",
            "How do you define success milestones for a product launch and verify them using analytics telemetry?"
        ],
        "Sophia": [
            "Tell me about a challenging technical project you worked on recently. What was your role and the key outcome?",
            "How do you approach learning new technologies or frameworks when starting a new project?",
            "Describe a time when you had to debug a complex system issue under tight deadlines. How did you diagnose it?",
            "How do you handle disagreement with team members or stakeholders regarding technical design decisions?",
            "What strategies do you use to ensure the code you write is maintainable, clean, and well-tested?"
        ],
        "Dexter": [
            "How do you approach refactoring a piece of legacy, poorly written code that has no existing unit tests?",
            "What is your debugging process when dealing with a race condition or memory leak in a production environment?",
            "What automated linting, formatting, and static analysis tools do you include in your standard developer pipeline?",
            "Describe your ideal local developer environment setup. What tools make you the most productive?",
            "How do you ensure security standards like OWASP Top 10 and secure data validation are strictly maintained in your code?"
        ]
    }
    
    return {
        "name": candidate.get("name"),
        "role_applied": candidate.get("role_applied") or "Software Engineer",
        "questions": default_questions,
        "questions_by_agent": questions_by_agent
    }


@router.post("/public/candidates/{candidate_id}/submit-ai-interview")
async def submit_ai_interview(
    candidate_id: str,
    payload: SubmitAIInterview
):
    db = get_database()
    try:
        query = {"_id": ObjectId(candidate_id)} if len(candidate_id) == 24 else {"id": candidate_id}
    except Exception:
        query = {"id": candidate_id}
    candidate = await db.candidates.find_one(query)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate or Interview link not valid")
        
    total_words = 0
    keywords_found = []
    tech_keywords = ["hook", "component", "state", "context", "async", "await", "promise", "database", "sql", "docker", "aws", "security", "git", "rest", "api", "optim"]
    
    for ans_item in payload.answers:
        ans_text = ans_item.get("answer", "").lower()
        total_words += len(ans_text.split())
        for kw in tech_keywords:
            if kw in ans_text and kw not in keywords_found:
                keywords_found.append(kw)
                
    score = 70 + min(len(keywords_found) * 3, 15)
    if total_words > 150:
        score += 10
    score = min(score, 98)
    
    feedback_notes = f"Completed automated AI Interview. Candidate provided detailed answers totaling {total_words} words. "
    if keywords_found:
        feedback_notes += f"Demonstrated familiar understanding of key technical concepts: {', '.join(keywords_found).upper()}. "
    else:
        feedback_notes += "Responses were generic. Basic compliance standards were met, but technical depth could be improved. "
        
    if score >= 85:
        feedback_notes += "Highly recommended for next round technical zoom panel."
    elif score >= 75:
        feedback_notes += "Recommended with reservations, follow up on core systems design."
    else:
        feedback_notes += "Low score relative to role benchmarks. Keep in reserve list."
        
    await db.candidates.update_one(query, {"$set": {
        "status": "AI Completed",
        "score": score,
        "notes": feedback_notes,
        "ai_transcript": payload.answers,
        "completed_at": datetime.utcnow().isoformat()
    }})
    
    return {
        "score": score,
        "notes": feedback_notes,
        "success": True
    }


@router.post("/public/candidates/{candidate_id}/upload-audio/{question_idx}")
async def upload_candidate_audio(
    candidate_id: str,
    question_idx: int,
    file: UploadFile = File(...)
):
    import os
    db = get_database()
    try:
        query = {"_id": ObjectId(candidate_id)} if len(candidate_id) == 24 else {"id": candidate_id}
    except Exception:
        query = {"id": candidate_id}
    candidate = await db.candidates.find_one(query)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    # Create directory for audio uploads if it doesn't exist
    upload_dir = os.path.join("static", "audio", candidate_id)
    os.makedirs(upload_dir, exist_ok=True)
    
    filename = f"question_{question_idx}.webm"
    file_path = os.path.join(upload_dir, filename)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        contents = await file.read()
        buffer.write(contents)
        
    audio_url = f"/static/audio/{candidate_id}/{filename}"
    return {"audio_url": audio_url}
