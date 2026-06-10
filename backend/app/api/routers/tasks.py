from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session, select
from typing import List
import os, shutil, uuid

from app.models import (
    Task, TaskCreate, TaskUpdate, TaskOut, TaskProgressUpdate,
    TaskComment, TaskCommentCreate, TaskCommentOut,
    TaskAttachment,
    ProjectMember, Project, User,
)
from app.db.session import get_session
from app.core.auth import get_current_user

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_task_or_404(task_id: int, session: Session) -> Task:
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


def _get_project_or_404(project_id: int, session: Session) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _require_project_member(project_id: int, current_user: User, session: Session) -> Project:
    project = _get_project_or_404(project_id, session)
    if project.owner_id == current_user.id:
        return project
    membership = session.exec(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
        )
    ).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this project",
        )
    return project


def _require_manager(project: Project, current_user: User):
    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the Project Manager can perform this action",
        )


# ── Task CRUD ─────────────────────────────────────────────────────────────────
# Note: POST /tasks and GET /tasks (project-scoped) live in projects.py

@router.get("/dashboard")
def get_dashboard(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Returns a summary of all projects the user is part of,
    with task status counts for each — powers the Dashboard view.
    """
    memberships = session.exec(
        select(ProjectMember).where(ProjectMember.user_id == current_user.id)
    ).all()

    result = []
    for m in memberships:
        project = session.get(Project, m.project_id)
        tasks = session.exec(select(Task).where(Task.project_id == m.project_id)).all()
        result.append({
            "project": {
                "id": project.id,
                "name": project.name,
                "status": project.status,
                "is_owner": project.owner_id == current_user.id,
            },
            "task_summary": {
                "total": len(tasks),
                "todo": sum(1 for t in tasks if t.status == "todo"),
                "in_progress": sum(1 for t in tasks if t.status == "in_progress"),
                "done": sum(1 for t in tasks if t.status == "done"),
            },
        })
    return result


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    task = _get_task_or_404(task_id, session)
    _require_project_member(task.project_id, current_user, session)
    return task


@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    updates: TaskUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Edit task details or assign a team member. Manager only."""
    task = _get_task_or_404(task_id, session)
    project = _get_project_or_404(task.project_id, session)
    _require_manager(project, current_user)

    for field, value in updates.dict(exclude_unset=True).items():
        setattr(task, field, value)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.put("/{task_id}/progress", response_model=TaskOut)
def update_task_progress(
    task_id: int,
    progress: TaskProgressUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update task status. Available to the assigned team member OR the manager."""
    valid_statuses = {"todo", "in_progress", "done"}
    if progress.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {valid_statuses}",
        )

    task = _get_task_or_404(task_id, session)
    project = _get_project_or_404(task.project_id, session)

    is_manager = project.owner_id == current_user.id
    is_assignee = task.assignee_id == current_user.id

    if not is_manager and not is_assignee:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned team member or the Project Manager can update progress",
        )

    task.status = progress.status
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
def delete_task(
    task_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a task. Manager only."""
    task = _get_task_or_404(task_id, session)
    project = _get_project_or_404(task.project_id, session)
    _require_manager(project, current_user)

    # Delete comments and attachments first (no cascade configured)
    for c in session.exec(select(TaskComment).where(TaskComment.task_id == task_id)).all():
        session.delete(c)
    for a in session.exec(select(TaskAttachment).where(TaskAttachment.task_id == task_id)).all():
        # Delete the physical file first
        if os.path.exists(a.file_url):
            os.remove(a.file_url)
        # Then delete the DB record
        session.delete(a)

    session.delete(task)
    session.commit()
    return {"detail": "Task deleted successfully"}


# ── Collaboration: Comments ───────────────────────────────────────────────────

@router.post("/{task_id}/comments", response_model=TaskCommentOut, status_code=status.HTTP_201_CREATED)
def add_comment(
    task_id: int,
    comment_in: TaskCommentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add a comment to a task. All project members can comment."""
    task = _get_task_or_404(task_id, session)
    _require_project_member(task.project_id, current_user, session)

    comment = TaskComment(task_id=task_id, user_id=current_user.id, content=comment_in.content)
    session.add(comment)
    session.commit()
    session.refresh(comment)

    return TaskCommentOut(**comment.dict(), author_name=current_user.full_name or current_user.email)


@router.get("/{task_id}/comments", response_model=List[TaskCommentOut])
def list_comments(
    task_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    task = _get_task_or_404(task_id, session)
    _require_project_member(task.project_id, current_user, session)

    comments = session.exec(select(TaskComment).where(TaskComment.task_id == task_id)).all()
    user_ids = {c.user_id for c in comments}
    users = session.exec(select(User).where(User.id.in_(user_ids))).all() if user_ids else []
    names_by_id = {u.id: (u.full_name or u.email) for u in users}

    return [
        TaskCommentOut(**c.dict(), author_name=names_by_id.get(c.user_id))
        for c in comments
    ]


# ── Collaboration: File Attachments ──────────────────────────────────────────

@router.post("/{task_id}/attachments", status_code=status.HTTP_201_CREATED)
def upload_attachment(
    task_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Upload/share a file on a task. All project members can upload."""
    task = _get_task_or_404(task_id, session)
    _require_project_member(task.project_id, current_user, session)

    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    attachment = TaskAttachment(task_id=task_id, uploader_id=current_user.id, file_url=file_path)
    session.add(attachment)
    session.commit()
    session.refresh(attachment)
    return {"id": attachment.id, "file_url": attachment.file_url, "task_id": task_id}


@router.get("/{task_id}/attachments")
def list_attachments(
    task_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    task = _get_task_or_404(task_id, session)
    _require_project_member(task.project_id, current_user, session)
    return session.exec(select(TaskAttachment).where(TaskAttachment.task_id == task_id)).all()
