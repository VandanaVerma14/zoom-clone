"""Database connection setup (SQLite via SQLAlchemy)."""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# The SQLite file is created next to where you run the server.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./zoom_clone.db")

# check_same_thread=False lets FastAPI use the connection from different threads.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Parent class for all database tables."""


def get_db():
    """Gives each API request its own database session and closes it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
