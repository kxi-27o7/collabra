from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.models import User, UserBase, UserOut
from app.db.session import get_session
from app.core.auth import get_current_user

router = APIRouter()


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(
    updates: UserBase,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    current_user.full_name = updates.full_name
    current_user.email = updates.email
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user
