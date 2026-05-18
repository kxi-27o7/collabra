from fastapi import FastAPI
from app.api import api_router

def create_app() -> FastAPI:
    app = FastAPI(title="Collabra API")
    app.include_router(api_router, prefix="/api")

    @app.on_event("startup")
    def on_startup():
        from app.db.session import init_db
        init_db()

    return app


app = create_app()
