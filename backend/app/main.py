from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import api_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Collabra API",
        description="Backend API for the Collabra project management platform.",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Tighten this in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api")

    @app.on_event("startup")
    def on_startup():
        from app.db.session import init_db
        init_db()

    @app.get("/", tags=["Health"])
    def health_check():
        return {"status": "ok", "message": "Collabra API is running"}

    return app


app = create_app()
