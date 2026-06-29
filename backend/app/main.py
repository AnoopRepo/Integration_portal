from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
from app.database import get_database, close_database
from app.routes import auth, reports, users, admin_routes, tickets, attendance, leaves, hr_extended, knowledge, agent_extractor, company_agent, daily_tasks, documents
from app.agents.knowledge_agent.knowledge_router import router as knowledge_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize MongoDB client
    get_database()
    yield
    # Shutdown: Close database client
    close_database()

app = FastAPI(
    title="Daily Work Reports API",
    description="Secure, authenticated and authorized backend service integrated with MongoDB Atlas.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration - Bulletproof setup using regex to match any HTTP/HTTPS origin in development
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory for media uploads (like audio clips)
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Root Endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to Daily Work Reports API!"}

# Register Routers
app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(users.router)
app.include_router(admin_routes.router)
app.include_router(tickets.router)
app.include_router(attendance.router)
app.include_router(leaves.router)
app.include_router(hr_extended.router)
app.include_router(knowledge.router)
app.include_router(agent_extractor.router)
app.include_router(company_agent.router)
app.include_router(knowledge_router)
app.include_router(daily_tasks.router)
app.include_router(documents.router)



