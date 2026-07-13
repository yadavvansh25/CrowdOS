import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base, Mapped, mapped_column
from sqlalchemy import JSON

DB_FILE = os.path.join(os.path.dirname(__file__), "crowdos.db")
DATABASE_URL = f"sqlite+aiosqlite:///{DB_FILE}"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()

class IncidentModel(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    incident_id: Mapped[str] = mapped_column(unique=True, index=True)
    type: Mapped[str]
    sector: Mapped[str]
    severity: Mapped[int]
    description: Mapped[str]
    reporter_id: Mapped[str]
    ai_action_plan: Mapped[list[str]] = mapped_column(JSON)
    estimated_response_time_seconds: Mapped[int]
    notified_teams: Mapped[list[str]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(default="active")

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
