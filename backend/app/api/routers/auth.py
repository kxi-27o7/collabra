from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.models import User, UserCreate
from app.db.session import get_session
from app.core import auth as auth_core

router = APIRouter()


@router.post("/register")
def register(user_in: UserCreate, session: Session = Depends(get_session)):
    user = User(email=user_in.email, hashed_password=auth_core.get_password_hash(user_in.password))
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"id": user.id, "email": user.email}


@router.post("/login")
def login(user_in: UserCreate, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == user_in.email)).first()
    if not user or not auth_core.verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = auth_core.create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}
