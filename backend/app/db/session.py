from sqlalchemy import text
from sqlmodel import create_engine, SQLModel, Session
from app.core.config import settings

engine = create_engine(settings.database_url, echo=True)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    # Add columns introduced after the initial table creation, for databases
    # that already existed before the column was added to the model.
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE project ADD COLUMN IF NOT EXISTS deadline DATE"))


def get_session():
    with Session(engine) as session:
        yield session
