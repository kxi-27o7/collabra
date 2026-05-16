from sqlmodel import create_engine, SQLModel, Session
from app.core.config import settings

engine = create_engine(settings.database_url, echo=True)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
