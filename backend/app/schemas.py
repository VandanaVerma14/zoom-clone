"""Shapes of the data going in and out of the API (validated by Pydantic)."""
import os
from datetime import datetime, timedelta, timezone
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer, computed_field, field_validator

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

# Times are stored in UTC without a timezone; send them out as e.g. "2026-10-09T10:00:00+00:00"
UTCDateTime = Annotated[
    datetime,
    PlainSerializer(
        lambda v: (v if v.tzinfo else v.replace(tzinfo=timezone.utc)).isoformat(),
        return_type=str,
    ),
]


def to_utc_naive(value: datetime) -> datetime:
    """Convert an incoming datetime to UTC without tzinfo, the format we store."""
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Users ----------
class UserOut(ORMModel):
    id: int
    name: str
    email: str
    avatar_color: str


# ---------- Meetings ----------
class InstantMeetingCreate(BaseModel):
    title: str | None = Field(default=None, max_length=200)


class ScheduledMeetingCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    start_time: datetime
    duration_minutes: int = Field(ge=15, le=24 * 60)

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Title cannot be empty")
        return v

    @field_validator("start_time")
    @classmethod
    def must_be_future(cls, v: datetime) -> datetime:
        v = to_utc_naive(v)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if v < now - timedelta(minutes=5):
            raise ValueError("Start time must be in the future")
        return v


class MeetingOut(ORMModel):
    id: int
    meeting_code: str
    passcode: str
    numeric_passcode: str
    title: str
    description: str | None
    meeting_type: str
    status: str
    start_time: UTCDateTime
    duration_minutes: int
    started_at: UTCDateTime | None
    ended_at: UTCDateTime | None
    participant_count: int
    host: UserOut

    @computed_field
    @property
    def invite_link(self) -> str:
        return f"{FRONTEND_URL}/j/{self.meeting_code}"


# ---------- Participants ----------
class JoinRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=50)
    as_host: bool = False
    is_muted: bool = False
    is_video_on: bool = True

    @field_validator("display_name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Display name cannot be empty")
        return v


class ParticipantOut(ORMModel):
    id: int
    display_name: str
    role: str
    is_muted: bool
    is_video_on: bool
    joined_at: UTCDateTime


class ParticipantUpdate(BaseModel):
    is_muted: bool | None = None
    is_video_on: bool | None = None


class HostAction(BaseModel):
    """Host-only actions identify the host by their participant id (no login in this app)."""
    host_participant_id: int


# ---------- Chat ----------
class ChatMessageCreate(BaseModel):
    participant_id: int
    message: str = Field(min_length=1, max_length=1000)

    @field_validator("message")
    @classmethod
    def strip_message(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        return v


class ChatMessageOut(ORMModel):
    id: int
    participant_id: int
    sender_name: str
    message: str
    created_at: UTCDateTime
