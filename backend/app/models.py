from typing import Optional
from sqlmodel import SQLModel, Field


class UserBase(SQLModel):
    email: str


class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str


class UserCreate(SQLModel):
    email: str
    password: str
