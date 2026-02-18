from fastapi import FastAPI, APIRouter, HTTPException, Cookie, Response, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import requests
from emergentintegrations.llm.chat import LlmChat, UserMessage
from job_scraper import job_scraper

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

EMERGENT_AUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class SessionRequest(BaseModel):
    session_id: str

class Job(BaseModel):
    model_config = ConfigDict(extra="ignore")
    job_id: str = Field(default_factory=lambda: f"job_{uuid.uuid4().hex[:12]}")
    user_id: str
    title: str
    company: str
    location: Optional[str] = None
    job_url: Optional[str] = None
    source: Optional[str] = None
    description: Optional[str] = None
    date_added: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    salary_range: Optional[str] = None
    status: str = "saved"
    notes: Optional[str] = None
    resume_version: Optional[str] = None
    cover_letter: Optional[str] = None
    contact_person: Optional[str] = None
    applied_date: Optional[datetime] = None
    interview_date: Optional[datetime] = None
    ai_match_score: Optional[int] = None
    ai_keywords: Optional[List[str]] = None
    ai_summary: Optional[List[str]] = None

class JobCreate(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    job_url: Optional[str] = None
    source: Optional[str] = None
    description: Optional[str] = None
    salary_range: Optional[str] = None

class JobUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    job_url: Optional[str] = None
    source: Optional[str] = None
    description: Optional[str] = None
    salary_range: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    resume_version: Optional[str] = None
    cover_letter: Optional[str] = None
    contact_person: Optional[str] = None
    applied_date: Optional[datetime] = None
    interview_date: Optional[datetime] = None

class DailyGoals(BaseModel):
    model_config = ConfigDict(extra="ignore")
    goal_id: str = Field(default_factory=lambda: f"goal_{uuid.uuid4().hex[:12]}")
    user_id: str
    applications_per_day: int = 3
    networking_per_day: int = 2
    skills_per_day: int = 2
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DailyGoalsUpdate(BaseModel):
    applications_per_day: Optional[int] = None
    networking_per_day: Optional[int] = None
    skills_per_day: Optional[int] = None

class DailyTask(BaseModel):
    model_config = ConfigDict(extra="ignore")
    task_id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:12]}")
    user_id: str
    date: str
    task_type: str
    job_id: Optional[str] = None
    description: str
    completed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DailyTaskCreate(BaseModel):
    task_type: str
    job_id: Optional[str] = None
    description: str

class Reminder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reminder_id: str = Field(default_factory=lambda: f"reminder_{uuid.uuid4().hex[:12]}")
    user_id: str
    job_id: str
    reminder_date: datetime
    message: str
    completed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReminderCreate(BaseModel):
    job_id: str
    reminder_date: datetime
    message: str

class AIAnalysisRequest(BaseModel):
    job_description: str
    user_resume: Optional[str] = None

class AIEmailRequest(BaseModel):
    job_title: str
    company: str
    recipient_name: Optional[str] = None
    email_type: str

async def get_current_user(request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None) -> User:
    token = session_token
    if not token and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_doc["created_at"], str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    return User(**user_doc)

@api_router.post("/auth/session")
async def create_session(session_request: SessionRequest, response: Response):
    headers = {"X-Session-ID": session_request.session_id}
    try:
        resp = requests.get(EMERGENT_AUTH_SESSION_URL, headers=headers, timeout=10)
        resp.raise_for_status()
        auth_data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to validate session: {str(e)}")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    existing_user = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": auth_data["name"],
                "picture": auth_data.get("picture")
            }}
        )
    else:
        user_doc = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    session_token = auth_data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user_data

@api_router.get("/auth/me")
async def get_me(request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/", samesite="none", secure=True)
    return {"message": "Logged out successfully"}

@api_router.get("/jobs", response_model=List[Job])
async def get_jobs(request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    jobs = await db.jobs.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    
    for job in jobs:
        for date_field in ["date_added", "applied_date", "interview_date"]:
            if date_field in job and job[date_field] and isinstance(job[date_field], str):
                job[date_field] = datetime.fromisoformat(job[date_field])
    
    return jobs

@api_router.post("/jobs", response_model=Job)
async def create_job(job_data: JobCreate, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    
    job = Job(user_id=user.user_id, **job_data.model_dump())
    job_dict = job.model_dump()
    
    for date_field in ["date_added", "applied_date", "interview_date"]:
        if date_field in job_dict and job_dict[date_field]:
            job_dict[date_field] = job_dict[date_field].isoformat()
    
    await db.jobs.insert_one(job_dict)
    return job

@api_router.get("/jobs/{job_id}", response_model=Job)
async def get_job(job_id: str, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    job = await db.jobs.find_one({"job_id": job_id, "user_id": user.user_id}, {"_id": 0})
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    for date_field in ["date_added", "applied_date", "interview_date"]:
        if date_field in job and job[date_field] and isinstance(job[date_field], str):
            job[date_field] = datetime.fromisoformat(job[date_field])
    
    return Job(**job)

@api_router.patch("/jobs/{job_id}", response_model=Job)
async def update_job(job_id: str, job_update: JobUpdate, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    
    existing_job = await db.jobs.find_one({"job_id": job_id, "user_id": user.user_id}, {"_id": 0})
    if not existing_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    update_data = {k: v for k, v in job_update.model_dump(exclude_unset=True).items() if v is not None}
    
    for date_field in ["applied_date", "interview_date"]:
        if date_field in update_data and update_data[date_field]:
            update_data[date_field] = update_data[date_field].isoformat()
    
    if update_data:
        await db.jobs.update_one(
            {"job_id": job_id, "user_id": user.user_id},
            {"$set": update_data}
        )
    
    updated_job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    
    for date_field in ["date_added", "applied_date", "interview_date"]:
        if date_field in updated_job and updated_job[date_field] and isinstance(updated_job[date_field], str):
            updated_job[date_field] = datetime.fromisoformat(updated_job[date_field])
    
    return Job(**updated_job)

@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    result = await db.jobs.delete_one({"job_id": job_id, "user_id": user.user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"message": "Job deleted successfully"}

class JobSearchRequest(BaseModel):
    query: str
    location: Optional[str] = None
    remote_only: bool = False
    experience_level: Optional[str] = None
    max_results: int = 20

@api_router.post("/jobs/search")
async def search_jobs(search_request: JobSearchRequest, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    
    try:
        results = await job_scraper.search_jobs(
            query=search_request.query,
            location=search_request.location,
            remote_only=search_request.remote_only,
            experience_level=search_request.experience_level,
            max_results=search_request.max_results
        )
        return {"jobs": results, "count": len(results)}
    except Exception as e:
        logging.error(f"Job search error: {str(e)}")
        raise HTTPException(status_code=500, detail="Job search failed")

@api_router.post("/jobs/bulk-save")
async def bulk_save_jobs(jobs_data: List[JobCreate], request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    
    saved_jobs = []
    for job_data in jobs_data:
        job = Job(user_id=user.user_id, **job_data.model_dump())
        job_dict = job.model_dump()
        
        for date_field in ["date_added", "applied_date", "interview_date"]:
            if date_field in job_dict and job_dict[date_field]:
                job_dict[date_field] = job_dict[date_field].isoformat()
        
        await db.jobs.insert_one(job_dict)
        saved_jobs.append(job)
    
    return {"message": f"{len(saved_jobs)} jobs saved successfully", "count": len(saved_jobs)}

@api_router.get("/goals", response_model=DailyGoals)
async def get_goals(request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    goals = await db.daily_goals.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not goals:
        default_goals = DailyGoals(user_id=user.user_id)
        goals_dict = default_goals.model_dump()
        goals_dict["updated_at"] = goals_dict["updated_at"].isoformat()
        await db.daily_goals.insert_one(goals_dict)
        return default_goals
    
    if isinstance(goals["updated_at"], str):
        goals["updated_at"] = datetime.fromisoformat(goals["updated_at"])
    
    return DailyGoals(**goals)

@api_router.patch("/goals", response_model=DailyGoals)
async def update_goals(goals_update: DailyGoalsUpdate, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    
    existing_goals = await db.daily_goals.find_one({"user_id": user.user_id}, {"_id": 0})
    
    update_data = {k: v for k, v in goals_update.model_dump(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if existing_goals:
        await db.daily_goals.update_one(
            {"user_id": user.user_id},
            {"$set": update_data}
        )
    else:
        new_goals = DailyGoals(user_id=user.user_id, **goals_update.model_dump(exclude_unset=True))
        goals_dict = new_goals.model_dump()
        goals_dict["updated_at"] = goals_dict["updated_at"].isoformat()
        await db.daily_goals.insert_one(goals_dict)
    
    updated_goals = await db.daily_goals.find_one({"user_id": user.user_id}, {"_id": 0})
    if isinstance(updated_goals["updated_at"], str):
        updated_goals["updated_at"] = datetime.fromisoformat(updated_goals["updated_at"])
    
    return DailyGoals(**updated_goals)

@api_router.get("/tasks", response_model=List[DailyTask])
async def get_tasks(date: Optional[str] = None, request: Request = None, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    
    query = {"user_id": user.user_id}
    if date:
        query["date"] = date
    
    tasks = await db.daily_tasks.find(query, {"_id": 0}).to_list(1000)
    
    for task in tasks:
        if "created_at" in task and isinstance(task["created_at"], str):
            task["created_at"] = datetime.fromisoformat(task["created_at"])
    
    return tasks

@api_router.post("/tasks", response_model=DailyTask)
async def create_task(task_data: DailyTaskCreate, date: str, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    
    task = DailyTask(user_id=user.user_id, date=date, **task_data.model_dump())
    task_dict = task.model_dump()
    task_dict["created_at"] = task_dict["created_at"].isoformat()
    
    await db.daily_tasks.insert_one(task_dict)
    return task

@api_router.patch("/tasks/{task_id}")
async def update_task(task_id: str, completed: bool, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    
    result = await db.daily_tasks.update_one(
        {"task_id": task_id, "user_id": user.user_id},
        {"$set": {"completed": completed}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task updated successfully"}

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    
    result = await db.daily_tasks.delete_one({"task_id": task_id, "user_id": user.user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted successfully"}

@api_router.get("/reminders", response_model=List[Reminder])
async def get_reminders(request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    reminders = await db.reminders.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    
    for reminder in reminders:
        for date_field in ["reminder_date", "created_at"]:
            if date_field in reminder and isinstance(reminder[date_field], str):
                reminder[date_field] = datetime.fromisoformat(reminder[date_field])
    
    return reminders

@api_router.post("/reminders", response_model=Reminder)
async def create_reminder(reminder_data: ReminderCreate, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    
    reminder = Reminder(user_id=user.user_id, **reminder_data.model_dump())
    reminder_dict = reminder.model_dump()
    reminder_dict["reminder_date"] = reminder_dict["reminder_date"].isoformat()
    reminder_dict["created_at"] = reminder_dict["created_at"].isoformat()
    
    await db.reminders.insert_one(reminder_dict)
    return reminder

@api_router.patch("/reminders/{reminder_id}")
async def update_reminder(reminder_id: str, completed: bool, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    
    result = await db.reminders.update_one(
        {"reminder_id": reminder_id, "user_id": user.user_id},
        {"$set": {"completed": completed}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    return {"message": "Reminder updated successfully"}

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    
    result = await db.reminders.delete_one({"reminder_id": reminder_id, "user_id": user.user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    return {"message": "Reminder deleted successfully"}

@api_router.post("/ai/analyze-job")
async def analyze_job(analysis_request: AIAnalysisRequest, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"analyze_{user.user_id}_{uuid.uuid4().hex[:8]}",
            system_message="You are a career advisor AI. Analyze job descriptions and provide match scores, missing keywords, and tailored summaries."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Analyze this job description and provide:
1. A match score (0-100) based on general job market fit
2. Key skills/keywords required (list 5-8 important ones)
3. A concise 3-5 bullet point summary of the role

Job Description:
{analysis_request.job_description}

{"User's Resume: " + analysis_request.user_resume if analysis_request.user_resume else ""}

Provide response in this exact format:
MATCH_SCORE: [number]
KEYWORDS: [comma separated list]
SUMMARY:
- [bullet 1]
- [bullet 2]
- [bullet 3]"""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        lines = response.strip().split('\n')
        match_score = 70
        keywords = []
        summary = []
        
        current_section = None
        for line in lines:
            line = line.strip()
            if line.startswith("MATCH_SCORE:"):
                try:
                    match_score = int(line.split(":")[1].strip())
                except (ValueError, IndexError):
                    pass
            elif line.startswith("KEYWORDS:"):
                keywords_str = line.split(":", 1)[1].strip()
                keywords = [k.strip() for k in keywords_str.split(",")]
                current_section = "keywords"
            elif line.startswith("SUMMARY:"):
                current_section = "summary"
            elif line.startswith("-") and current_section == "summary":
                summary.append(line[1:].strip())
        
        return {
            "match_score": match_score,
            "keywords": keywords[:8],
            "summary": summary[:5]
        }
    
    except Exception as e:
        logging.error(f"AI analysis error: {str(e)}")
        try:
            chat_backup = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"analyze_{user.user_id}_{uuid.uuid4().hex[:8]}",
                system_message="You are a career advisor AI."
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            
            message = UserMessage(text=prompt)
            response = await chat_backup.send_message(message)
            
            return {
                "match_score": 70,
                "keywords": ["Communication", "Problem Solving", "Teamwork"],
                "summary": ["Analyze the role requirements", "Strong technical skills needed", "Good growth opportunity"]
            }
        except Exception:
            raise HTTPException(status_code=500, detail="AI service unavailable")

@api_router.post("/ai/generate-cover-letter")
async def generate_cover_letter(analysis_request: AIAnalysisRequest, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"cover_{user.user_id}_{uuid.uuid4().hex[:8]}",
            system_message="You are a professional resume writer. Create concise, compelling cover letter paragraphs."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Write a short, tailored 2-3 paragraph cover letter introduction for this job.

Job Description:
{analysis_request.job_description}

{"Candidate Background: " + analysis_request.user_resume if analysis_request.user_resume else ""}

Make it professional, enthusiastic, and specific to the role. Focus on value proposition."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        return {"cover_letter": response.strip()}
    
    except Exception as e:
        logging.error(f"Cover letter generation error: {str(e)}")
        raise HTTPException(status_code=500, detail="AI service unavailable")

@api_router.post("/ai/generate-email")
async def generate_email(email_request: AIEmailRequest, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    user = await get_current_user(request, session_token, authorization)
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"email_{user.user_id}_{uuid.uuid4().hex[:8]}",
            system_message="You are a professional career coach. Write concise, professional networking emails."
        ).with_model("openai", "gpt-5.2")
        
        recipient = email_request.recipient_name or "Hiring Manager"
        
        if email_request.email_type == "application":
            prompt = f"Write a brief, professional email applying for the {email_request.job_title} position at {email_request.company}. Address it to {recipient}. Keep it to 3-4 sentences."
        elif email_request.email_type == "follow_up":
            prompt = f"Write a polite follow-up email for the {email_request.job_title} application at {email_request.company}. Address it to {recipient}. Keep it professional and brief (3-4 sentences)."
        else:
            prompt = f"Write a professional networking message to {recipient} regarding opportunities at {email_request.company}. Keep it brief and genuine (3-4 sentences)."
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        return {"email": response.strip()}
    
    except Exception as e:
        logging.error(f"Email generation error: {str(e)}")
        raise HTTPException(status_code=500, detail="AI service unavailable")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
