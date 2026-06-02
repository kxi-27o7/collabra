from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import api_router

import os
import uvicorn


def create_app() -> FastAPI:
    app = FastAPI(
        title="Collabra API",
        description="Backend API for the Collabra project management platform.",
        version="1.0.0",
    )

    origins = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5500",  # Live Server
        "http://localhost:8000",
        "http://localhost:8080",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5500",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8080",
        "https://collabra.onrender.com"
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins, 
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

if __name__ == "__main__":
    # Render automatically injects a PORT environment variable.
    # If it's not found (like when running locally), it defaults to 8000.
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
