"""All meeting-related API endpoints."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ChatMessage, Meeting, Participant, User, utcnow
from ..schemas import (
    ChatMessageCreate,
    ChatMessageOut,
    HostAction,
    InstantMeetingCreate,
    JoinRequest,
    MeetingOut,
    ParticipantOut,
    ParticipantUpdate,
    ScheduledMeetingCreate,
)
from ..utils import generate_meeting_code, generate_passcodes, get_current_user, get_meeting_or_404

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


def _end_time(m: Meeting):
    return m.start_time + timedelta(minutes=m.duration_minutes)


def _active_participants(meeting: Meeting) -> list[Participant]:
    return [p for p in meeting.participants if p.left_at is None]


def _get_participant(meeting: Meeting, participant_id: int) -> Participant:
    for p in meeting.participants:
        if p.id == participant_id:
            return p
    raise HTTPException(status_code=404, detail="Participant not found in this meeting")


def _require_host(meeting: Meeting, participant_id: int) -> Participant:
    host = _get_participant(meeting, participant_id)
    if host.role != "host" or host.left_at is not None:
        raise HTTPException(status_code=403, detail="Only the host can do this")
    return host


# ---------- Create ----------
@router.post("/instant", response_model=MeetingOut, status_code=201)
def create_instant_meeting(
    body: InstantMeetingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    now = utcnow()
    meeting = Meeting(
        meeting_code=generate_meeting_code(db),
        **generate_passcodes(),
        title=body.title or f"{user.name}'s Zoom Meeting",
        host_id=user.id,
        meeting_type="instant",
        status="live",
        start_time=now,
        started_at=now,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.post("/schedule", response_model=MeetingOut, status_code=201)
def schedule_meeting(
    body: ScheduledMeetingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    meeting = Meeting(
        meeting_code=generate_meeting_code(db),
        **generate_passcodes(),
        title=body.title,
        description=body.description,
        host_id=user.id,
        meeting_type="scheduled",
        status="scheduled",
        start_time=body.start_time,
        duration_minutes=body.duration_minutes,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


# ---------- Lists for the dashboard ----------
@router.get("/upcoming", response_model=list[MeetingOut])
def upcoming_meetings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Scheduled meetings that have not ended yet, soonest first."""
    now = utcnow()
    meetings = (
        db.query(Meeting)
        .filter(Meeting.host_id == user.id, Meeting.meeting_type == "scheduled", Meeting.status != "ended")
        .order_by(Meeting.start_time)
        .all()
    )
    return [m for m in meetings if _end_time(m) > now]


@router.get("/recent", response_model=list[MeetingOut])
def recent_meetings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Meetings that were started or whose time has passed, newest first (max 10)."""
    now = utcnow()
    meetings = db.query(Meeting).filter(Meeting.host_id == user.id).all()
    recent = [m for m in meetings if m.started_at is not None or _end_time(m) <= now]
    recent.sort(key=lambda m: m.started_at or m.start_time, reverse=True)
    return recent[:10]


# ---------- Single meeting ----------
@router.get("/{code}", response_model=MeetingOut)
def get_meeting(code: str, db: Session = Depends(get_db)):
    """Used to validate a meeting ID before joining."""
    return get_meeting_or_404(db, code)


@router.post("/{code}/join", response_model=ParticipantOut, status_code=201)
def join_meeting(
    code: str,
    body: JoinRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    meeting = get_meeting_or_404(db, code)
    if meeting.status == "ended":
        raise HTTPException(status_code=400, detail="This meeting has been ended by the host.")

    is_host = body.as_host and meeting.host_id == user.id
    participant = Participant(
        meeting_id=meeting.id,
        user_id=user.id if is_host else None,
        display_name=body.display_name,
        role="host" if is_host else "guest",
        is_muted=body.is_muted,
        is_video_on=body.is_video_on,
    )
    if meeting.status == "scheduled":
        meeting.status = "live"
    if meeting.started_at is None:
        meeting.started_at = utcnow()
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


@router.get("/{code}/participants", response_model=list[ParticipantOut])
def list_participants(code: str, db: Session = Depends(get_db)):
    """People currently in the meeting (the meeting room polls this)."""
    meeting = get_meeting_or_404(db, code)
    active = _active_participants(meeting)
    return sorted(active, key=lambda p: (p.role != "host", p.joined_at))


@router.patch("/{code}/participants/{participant_id}", response_model=ParticipantOut)
def update_participant(code: str, participant_id: int, body: ParticipantUpdate, db: Session = Depends(get_db)):
    """A participant updates their own mic / camera state."""
    meeting = get_meeting_or_404(db, code)
    participant = _get_participant(meeting, participant_id)
    if body.is_muted is not None:
        participant.is_muted = body.is_muted
    if body.is_video_on is not None:
        participant.is_video_on = body.is_video_on
    db.commit()
    db.refresh(participant)
    return participant


@router.post("/{code}/participants/{participant_id}/leave", status_code=204)
def leave_meeting(code: str, participant_id: int, db: Session = Depends(get_db)):
    meeting = get_meeting_or_404(db, code)
    participant = _get_participant(meeting, participant_id)
    if participant.left_at is None:
        participant.left_at = utcnow()
        db.commit()


# ---------- Host controls ----------
@router.post("/{code}/mute-all", status_code=204)
def mute_all(code: str, body: HostAction, db: Session = Depends(get_db)):
    meeting = get_meeting_or_404(db, code)
    host = _require_host(meeting, body.host_participant_id)
    for p in _active_participants(meeting):
        if p.id != host.id:
            p.is_muted = True
    db.commit()


@router.post("/{code}/participants/{participant_id}/remove", status_code=204)
def remove_participant(code: str, participant_id: int, body: HostAction, db: Session = Depends(get_db)):
    meeting = get_meeting_or_404(db, code)
    host = _require_host(meeting, body.host_participant_id)
    if participant_id == host.id:
        raise HTTPException(status_code=400, detail="Host cannot remove themselves")
    target = _get_participant(meeting, participant_id)
    target.left_at = utcnow()
    db.commit()


@router.post("/{code}/end", status_code=204)
def end_meeting(code: str, body: HostAction, db: Session = Depends(get_db)):
    """End the meeting for everyone."""
    meeting = get_meeting_or_404(db, code)
    _require_host(meeting, body.host_participant_id)
    now = utcnow()
    meeting.status = "ended"
    meeting.ended_at = now
    for p in _active_participants(meeting):
        p.left_at = now
    db.commit()


# ---------- Chat ----------
@router.get("/{code}/messages", response_model=list[ChatMessageOut])
def list_messages(code: str, after_id: int = 0, db: Session = Depends(get_db)):
    """Chat messages newer than `after_id`, oldest first (the meeting room polls this)."""
    meeting = get_meeting_or_404(db, code)
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.meeting_id == meeting.id, ChatMessage.id > after_id)
        .order_by(ChatMessage.id)
        .all()
    )


@router.post("/{code}/messages", response_model=ChatMessageOut, status_code=201)
def send_message(code: str, body: ChatMessageCreate, db: Session = Depends(get_db)):
    """Send a message to everyone in the meeting. Only people currently in the meeting can send."""
    meeting = get_meeting_or_404(db, code)
    if meeting.status == "ended":
        raise HTTPException(status_code=400, detail="This meeting has ended.")
    sender = next((p for p in meeting.participants if p.id == body.participant_id), None)
    if sender is None or sender.left_at is not None:
        raise HTTPException(status_code=403, detail="You are not in this meeting.")
    message = ChatMessage(meeting_id=meeting.id, participant_id=sender.id, message=body.message)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
