"""Entry point of the backend. Run with:  uvicorn app.main:app --reload"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, SessionLocal, engine
from .routers import meetings, signaling, users
from .seed import seed_database, upgrade_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # On startup: create tables (if missing), add columns from newer versions, add sample data (if empty).
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        upgrade_database(db)
        seed_database(db)
    yield


app = FastAPI(title="Zoom Clone API", version="1.0.0", lifespan=lifespan)

# Which websites may call this API. Comma-separated list in the CORS_ORIGINS env variable.
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(meetings.router)
app.include_router(signaling.router)


@app.get("/")
def health():
    return {"status": "ok", "docs": "/docs"}
