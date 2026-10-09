from fastapi import APIRouter, Depends

from ..models import User
from ..schemas import UserOut
from ..utils import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    """The default logged-in user (shown in the navbar)."""
    return user
