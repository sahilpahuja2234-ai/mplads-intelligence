"""
app/db/session.py
=================
SQLAlchemy engine and session factory.
Import `get_db` as a FastAPI dependency in endpoint functions.
"""

from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.core.config import DB_URL

engine = create_engine(
    DB_URL,
    connect_args={"check_same_thread": False},   # needed for SQLite + FastAPI threading
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session and closes it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
