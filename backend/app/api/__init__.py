from fastapi import APIRouter
from app.api.routers import auth, users, projects, tasks

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users & Profile"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(tasks.router, tags=["Tasks & Collaboration"])
