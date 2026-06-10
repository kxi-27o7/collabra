from typing import Optional, List
from datetime import date, datetime, timezone
from sqlmodel import SQLModel, Field, Relationship
import secrets
import string


class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    full_name: Optional[str] = None


class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str


class UserCreate(SQLModel):
    email: str
    password: str
    full_name: Optional[str] = None

class UserOut(UserBase):
    id: int


class ProjectBase(SQLModel):
    name: str
    description: Optional[str] = None
    status: str = Field(default="active")
    deadline: Optional[date] = None


def _generate_invite_code() -> str:
    """Generate a random invite code in format SA-XXXX-XXXX"""
    chars = string.ascii_uppercase + string.digits
    code = ''.join(secrets.choice(chars) for _ in range(8))
    return f"SA-{code[:4]}-{code[4:]}"


class Project(ProjectBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    invite_code: str = Field(default_factory=_generate_invite_code, index=True)


class ProjectCreate(ProjectBase):
    pass


class ProjectOut(ProjectBase):
    id: int
    owner_id: int
    invite_code: str


class ProjectMember(SQLModel, table=True):
    project_id: int = Field(foreign_key="project.id", primary_key=True)
    user_id: int = Field(foreign_key="user.id", primary_key=True)
    role: str = Field(default="member")


class TaskBase(SQLModel):
    title: str
    description: Optional[str] = None
    status: str = Field(default="todo")
    deadline: Optional[datetime] = None
    assignee_id: Optional[int] = Field(default=None, foreign_key="user.id")


class Task(TaskBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")


class TaskCreate(TaskBase):
    pass

class TaskUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    deadline: Optional[datetime] = None
    assignee_id: Optional[int] = None

class TaskProgressUpdate(SQLModel):
    status: str

class TaskOut(TaskBase):
    id: int
    project_id: int


class TaskCommentBase(SQLModel):
    content: str


class TaskComment(TaskCommentBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(foreign_key="task.id")
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TaskCommentCreate(TaskCommentBase):
    pass


class TaskCommentOut(TaskCommentBase):
    id: int
    task_id: int
    user_id: int
    created_at: datetime
    author_name: Optional[str] = None


class TaskAttachmentBase(SQLModel):
    file_url: str


class TaskAttachment(TaskAttachmentBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(foreign_key="task.id")
    uploader_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
