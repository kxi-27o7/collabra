from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List

from app.models import (
    Project, ProjectCreate, ProjectOut,
    ProjectMember, User, UserOut,
    Task, TaskCreate, TaskOut,
)
from app.db.session import get_session
from app.core.auth import get_current_user

router = APIRouter()


def _get_project_or_404(project_id: int, session: Session) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _require_manager(project: Project, current_user: User):
    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the Project Manager can perform this action",
        )


def _require_member(project_id: int, current_user: User, session: Session):
    """Checks that the current user is either the owner or a member of the project."""
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


# ── Project CRUD ────────────────────────────────────────────────────────────

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = Project(**project_in.dict(), owner_id=current_user.id)
    session.add(project)
    session.flush()  # get project.id before commit

    # Auto-add owner as a 'manager' member
    member = ProjectMember(project_id=project.id, user_id=current_user.id, role="manager")
    session.add(member)
    session.commit()
    session.refresh(project)
    return project


@router.get("", response_model=List[ProjectOut])
def list_projects(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Returns all projects that the current user owns or is a member of."""
    memberships = session.exec(
        select(ProjectMember).where(ProjectMember.user_id == current_user.id)
    ).all()
    project_ids = {m.project_id for m in memberships}
    if not project_ids:
        return []
    projects = session.exec(select(Project).where(Project.id.in_(project_ids))).all()
    return projects


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = _require_member(project_id, current_user, session)
    return project


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    updates: ProjectCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Edit project details OR mark it as finished. Manager only."""
    project = _get_project_or_404(project_id, session)
    _require_manager(project, current_user)
    for field, value in updates.dict(exclude_unset=True).items():
        setattr(project, field, value)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@router.put("/{project_id}/finish", response_model=ProjectOut)
def finish_project(
    project_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark a project as finished. Manager only."""
    project = _get_project_or_404(project_id, session)
    _require_manager(project, current_user)
    project.status = "finished"
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


# ── Membership Management ───────────────────────────────────────────────────

@router.get("/{project_id}/members", response_model=List[UserOut])
def list_members(
    project_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _require_member(project_id, current_user, session)
    memberships = session.exec(
        select(ProjectMember).where(ProjectMember.project_id == project_id)
    ).all()
    user_ids = [m.user_id for m in memberships]
    users = session.exec(select(User).where(User.id.in_(user_ids))).all()
    return users


@router.post("/{project_id}/members", status_code=status.HTTP_201_CREATED)
def invite_member(
    project_id: int,
    user_email: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Invite a user by email. Manager only."""
    project = _get_project_or_404(project_id, session)
    _require_manager(project, current_user)

    target = session.exec(select(User).where(User.email == user_email)).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = session.exec(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == target.id,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a member")

    member = ProjectMember(project_id=project_id, user_id=target.id, role="member")
    session.add(member)
    session.commit()
    return {"detail": f"{target.email} has been added to the project"}


@router.post("/{project_id}/join", status_code=status.HTTP_201_CREATED)
def join_project(
    project_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Allow a user to join a project they have been invited to."""
    _get_project_or_404(project_id, session)

    existing = session.exec(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are already a member")

    member = ProjectMember(project_id=project_id, user_id=current_user.id, role="member")
    session.add(member)
    session.commit()
    return {"detail": "Successfully joined the project"}


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_200_OK)
def remove_member(
    project_id: int,
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Remove a team member from the project. Manager only."""
    project = _get_project_or_404(project_id, session)
    _require_manager(project, current_user)

    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project Manager cannot remove themselves")

    membership = session.exec(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    session.delete(membership)
    session.commit()
    return {"detail": "Member removed from project"}


# ── Project-Scoped Task Endpoints ────────────────────────────────────────────

@router.post("/{project_id}/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: int,
    task_in: TaskCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new task in a project. Manager only."""
    project = _get_project_or_404(project_id, session)
    _require_manager(project, current_user)

    task = Task(**task_in.dict(), project_id=project_id)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.get("/{project_id}/tasks", response_model=List[TaskOut])
def list_tasks(
    project_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all tasks in a project. All project members can view."""
    _require_member(project_id, current_user, session)
    tasks = session.exec(select(Task).where(Task.project_id == project_id)).all()
    return tasks
