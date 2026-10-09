"""Small helper functions shared by the routers."""
import random
import secrets
import string

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from .database import get_db
from .models import Meeting, User


def generate_meeting_code(db: Session) -> str:
    """Create a random, unused 10-digit meeting ID (never starts with 0)."""
    while True:
        code = str(random.randint(1_000_000_000, 9_999_999_999))
        if not db.query(Meeting).filter_by(meeting_code=code).first():
            return code


def generate_passcodes() -> dict[str, str]:
    """A 6-character letters+digits passcode and a 6-digit numeric one, as Meeting fields."""
    alphabet = string.ascii_letters + string.digits
    return {
        "passcode": "".join(secrets.choice(alphabet) for _ in range(6)),
        "numeric_passcode": "".join(secrets.choice(string.digits) for _ in range(6)),
    }


def get_current_user(db: Session = Depends(get_db)) -> User:
    """No login required: the first seeded user is always 'logged in'."""
    user = db.query(User).order_by(User.id).first()
    if not user:
        raise HTTPException(status_code=500, detail="Default user missing. Restart the server to seed data.")
    return user


def get_meeting_or_404(db: Session, code: str) -> Meeting:
    meeting = db.query(Meeting).filter_by(meeting_code=code).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Invalid meeting ID. Please check and try again.")
    return meeting
