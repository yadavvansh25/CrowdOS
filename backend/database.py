"""
CrowdOS — Database Layer
========================
SQLAlchemy async models and session factory for incident persistence.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from sqlalchemy import JSON, String
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

DB_FILE: str = os.path.join(os.path.dirname(__file__), "crowdos.db")
DATABASE_URL: str = f"sqlite+aiosqlite:///{DB_FILE}"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


class IncidentModel(Base):
    """Persisted stadium incident record."""

    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    incident_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    type: Mapped[str] = mapped_column(String(32))
    sector: Mapped[str] = mapped_column(String(16))
    severity: Mapped[int]
    description: Mapped[str] = mapped_column(String(1024))
    reporter_id: Mapped[str] = mapped_column(String(64))
    ai_action_plan: Mapped[list[str]] = mapped_column(JSON)
    estimated_response_time_seconds: Mapped[int]
    notified_teams: Mapped[list[str]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(32), default="active")


async def init_db() -> None:
    """Create all database tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@asynccontextmanager
async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Context manager for a transactional DB session."""
    async with AsyncSessionLocal() as session:
        yield session
