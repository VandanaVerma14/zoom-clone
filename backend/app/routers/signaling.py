"""WebSocket signaling for WebRTC (camera, microphone and screen share).

The server never sees any video. It only relays small messages (offers, answers, ICE candidates)
between the browsers in a meeting so they can open a direct peer-to-peer connection.

Messages from the server:
  {"type": "peers", "peers": [ids]}        sent once on connect: who is already here
  {"type": "peer-joined", "from": id}      someone connected
  {"type": "peer-left", "from": id}        someone disconnected
  {...anything, "from": id}                a message another peer addressed to us
Messages to the server:
  {"to": id, ...anything}                  relayed to that one peer
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..database import SessionLocal
from ..models import Meeting, Participant

router = APIRouter(tags=["signaling"])

# meeting code -> {participant id -> socket}. Kept in memory, so run a single server process.
rooms: dict[str, dict[int, WebSocket]] = {}


def _is_active_participant(code: str, participant_id: int) -> bool:
    with SessionLocal() as db:
        return (
            db.query(Participant)
            .join(Meeting)
            .filter(
                Meeting.meeting_code == code,
                Meeting.status != "ended",
                Participant.id == participant_id,
                Participant.left_at.is_(None),
            )
            .first()
            is not None
        )


async def _send(ws: WebSocket, message: dict):
    try:
        await ws.send_json(message)
    except Exception:
        pass  # that peer is disconnecting; its own handler cleans up


@router.websocket("/ws/meetings/{code}/{participant_id}")
async def signaling(ws: WebSocket, code: str, participant_id: int):
    if not _is_active_participant(code, participant_id):
        await ws.close(code=4403)
        return
    await ws.accept()

    room = rooms.setdefault(code, {})
    old = room.get(participant_id)
    if old is not None:  # same participant reconnected (e.g. network blip)
        await old.close()
    room[participant_id] = ws

    await ws.send_json({"type": "peers", "peers": [pid for pid in room if pid != participant_id]})
    for pid, peer in list(room.items()):
        if pid != participant_id:
            await _send(peer, {"type": "peer-joined", "from": participant_id})

    try:
        while True:
            message = await ws.receive_json()
            target = room.get(message.pop("to", None))
            if target is not None:
                message["from"] = participant_id
                await _send(target, message)
    except (WebSocketDisconnect, ValueError, RuntimeError):
        pass
    finally:
        if room.get(participant_id) is ws:
            del room[participant_id]
            for peer in list(room.values()):
                await _send(peer, {"type": "peer-left", "from": participant_id})
        if not room:
            rooms.pop(code, None)
