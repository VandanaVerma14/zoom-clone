"""Fills an empty database with a default user and sample meetings."""
from datetime import timedelta

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from .models import ChatMessage, Meeting, Participant, User, utcnow
from .utils import generate_meeting_code, generate_passcodes


def upgrade_database(db: Session) -> None:
    """Adds columns that newer code expects to a database created by an older version.

    create_all() only creates missing tables, never missing columns, so an old
    zoom_clone.db would otherwise crash on the passcode columns.
    """
    columns = {c["name"] for c in inspect(db.get_bind()).get_columns("meetings")}
    missing = [c for c in ("passcode", "numeric_passcode") if c not in columns]
    if not missing:
        return
    for column in missing:
        db.execute(text(f"ALTER TABLE meetings ADD COLUMN {column} VARCHAR(6)"))
    for meeting_id in db.execute(text("SELECT id FROM meetings")).scalars().all():
        db.execute(
            text("UPDATE meetings SET passcode = :passcode, numeric_passcode = :numeric_passcode WHERE id = :id"),
            {**generate_passcodes(), "id": meeting_id},
        )
    db.commit()


def seed_database(db: Session) -> None:
    if db.query(User).first():
        return  # already seeded

    user = User(name="Demo User", email="demo@zoomclone.dev", avatar_color="#0B5CFF")
    db.add(user)
    db.flush()  # gives user an id

    now = utcnow().replace(second=0, microsecond=0)

    upcoming = [
        ("Daily Standup", "Quick sync on yesterday's progress and blockers.", timedelta(hours=2), 30),
        ("Design Review: Dashboard v2", "Walk through the new dashboard mockups.", timedelta(days=1, hours=1), 60),
        ("1:1 with Manager", None, timedelta(days=3), 45),
    ]
    for title, desc, offset, duration in upcoming:
        db.add(Meeting(
            meeting_code=generate_meeting_code(db), **generate_passcodes(), title=title, description=desc, host_id=user.id,
            meeting_type="scheduled", status="scheduled", start_time=now + offset, duration_minutes=duration,
        ))
        db.flush()

    past = [
        ("Sprint Planning", "scheduled", timedelta(days=1), 60, ["Priya Sharma", "Rahul Verma", "Ananya Iyer"]),
        ("Demo User's Zoom Meeting", "instant", timedelta(days=2), 25, ["Karan Mehta"]),
        ("Client Kickoff Call", "scheduled", timedelta(days=5), 45, ["Sarah Lee", "Tom Wilson"]),
    ]
    for title, mtype, ago, duration, guests in past:
        start = now - ago
        end = start + timedelta(minutes=duration)
        meeting = Meeting(
            meeting_code=generate_meeting_code(db), **generate_passcodes(), title=title, host_id=user.id, meeting_type=mtype,
            status="ended", start_time=start, duration_minutes=duration, started_at=start, ended_at=end,
        )
        db.add(meeting)
        db.flush()
        host = Participant(meeting_id=meeting.id, user_id=user.id, display_name=user.name,
                           role="host", joined_at=start, left_at=end)
        db.add(host)
        guest_rows = [
            Participant(meeting_id=meeting.id, display_name=guest, role="guest",
                        joined_at=start + timedelta(minutes=i), left_at=end)
            for i, guest in enumerate(guests, start=1)
        ]
        db.add_all(guest_rows)

        if title == "Sprint Planning":  # a little chat history to show in the API
            db.flush()
            db.add_all([
                ChatMessage(meeting_id=meeting.id, participant_id=host.id,
                            message="Welcome everyone! Let's start with the sprint goals.",
                            created_at=start + timedelta(minutes=5)),
                ChatMessage(meeting_id=meeting.id, participant_id=guest_rows[0].id,
                            message="I've added the API tickets to the board.",
                            created_at=start + timedelta(minutes=7)),
            ])

    db.commit()
