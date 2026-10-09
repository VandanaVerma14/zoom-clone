"""Database tables.

users 1 ──< meetings 1 ──< participants >── 0..1 users
             meetings 1 ──< chat_messages >── 1 participants

- A user hosts many meetings.
- A meeting has many participants (one row per person per join).
- A participant may be a registered user (user_id) or a guest (user_id is NULL).
- A chat message belongs to one meeting and was sent by one participant.
"""
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    """Current time in UTC (stored without timezone, SQLite has no tz support)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    avatar_color: Mapped[str] = mapped_column(String(20), default="#0B5CFF")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    hosted_meetings: Mapped[list["Meeting"]] = relationship(back_populates="host")


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # 10-digit public ID shown to users, e.g. 8123456789 -> "812 345 6789"
    meeting_code: Mapped[str] = mapped_column(String(10), unique=True, index=True, nullable=False)
    passcode: Mapped[str] = mapped_column(String(6), nullable=False)  # e.g. "aB3xY9"
    numeric_passcode: Mapped[str] = mapped_column(String(6), nullable=False)  # for phone / SIP dial-in
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    meeting_type: Mapped[str] = mapped_column(String(20), default="instant")  # instant | scheduled
    status: Mapped[str] = mapped_column(String(20), default="scheduled")  # scheduled | live | ended
    start_time: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=40)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    host: Mapped["User"] = relationship(back_populates="hosted_meetings")
    participants: Mapped[list["Participant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan"
    )
    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="ChatMessage.id"
    )

    @property
    def participant_count(self) -> int:
        """Number of distinct people who have joined this meeting."""
        return len({p.display_name for p in self.participants})


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id"), index=True, nullable=False)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    display_name: Mapped[str] = mapped_column(String(50), nullable=False)
    role: Mapped[str] = mapped_column(String(10), default="guest")  # host | guest
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_video_on: Mapped[bool] = mapped_column(Boolean, default=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    left_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # NULL = still in meeting

    meeting: Mapped["Meeting"] = relationship(back_populates="participants")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id"), index=True, nullable=False)
    participant_id: Mapped[int] = mapped_column(ForeignKey("participants.id"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    meeting: Mapped["Meeting"] = relationship(back_populates="messages")
    participant: Mapped["Participant"] = relationship()

    @property
    def sender_name(self) -> str:
        return self.participant.display_name
