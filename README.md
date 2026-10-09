# Zoom Clone: Video Conferencing Platform

A full-stack web app that recreates the Zoom web experience: a home dashboard, instant meetings, joining by ID or invite link, scheduling, and a meeting room with participant management and host controls.

**Live app:** _add your Vercel link here_
**API docs:** _add your Render link here_ + `/docs`

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router, client-side SPA pages), React 19, Tailwind CSS, lucide-react icons |
| Backend | Python, FastAPI, SQLAlchemy 2, Pydantic 2 |
| Database | SQLite |
| Media | Browser APIs: `getUserMedia` (camera/mic), `getDisplayMedia` (screen share), WebRTC (sends camera, mic and screen share to other participants, signaled over a FastAPI WebSocket) |

## Features

**Core**
- **Landing dashboard:** Zoom Workplace-style navbar and sidebar (profile/settings placeholders), New meeting / Join / Schedule buttons, live clock, Upcoming and Recent meetings.
- **Instant meeting:** creates a meeting with a unique 10-digit ID and invite link, then redirects to the meeting room as host.
- **Join meeting:** accepts a meeting ID (`812 345 6789`) or a full invite link, asks for a display name, and validates that the meeting exists and has not ended.
- **Schedule meeting:** title, description, date and time picker, duration. The link is generated automatically, saved to the database, and shown under Upcoming.

**Meeting room**
- Speaker / Gallery views, Zoom-style bottom toolbar (Mute, Video, Participants, Chat, Share, Host tools, End/Leave), browser fullscreen.
- Meeting info popover (ID, passcode, host, copyable invite link).
- Participants panel, kept in sync every 3 seconds.
- **In-meeting chat:** messages are saved in the database and appear for everyone in the meeting (polled every 3 seconds), with join/leave lines and an unread badge.

**Bonus**
- Responsive layout (mobile, tablet, desktop).
- Host controls: **Mute All**, **Remove participant**, **End Meeting for All**.

## Database schema

```
users 1 ──< meetings 1 ──< participants >── 0..1 users
             meetings 1 ──< chat_messages >── 1 participants
```

**users**: id (PK), name, email (unique), avatar_color, created_at

**meetings**: id (PK), meeting_code (unique, indexed, 10 digits), title, description, host_id (FK → users), meeting_type (`instant` | `scheduled`), status (`scheduled` | `live` | `ended`), start_time, duration_minutes, started_at, ended_at, created_at

**participants**: id (PK), meeting_id (FK → meetings, indexed), user_id (FK → users, nullable for guests), display_name, role (`host` | `guest`), is_muted, is_video_on, joined_at, left_at (NULL while still in the meeting)

**chat_messages**: id (PK), meeting_id (FK → meetings, indexed), participant_id (FK → participants), message (text), created_at

Design notes:
- `meeting_code` is separate from the numeric `id`, so public IDs are not guessable sequential numbers.
- A participant row is one *session*: the same person rejoining creates a new row, which keeps a join/leave history.
- "Currently in the meeting" = `left_at IS NULL`. Removing someone or ending the meeting just sets `left_at`.
- All times are stored in UTC and converted to local time in the browser.
- A chat message points at the participant *session* that sent it, so the sender's display name comes from that row. Messages are deleted with their meeting.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/users/me` | Default logged-in user |
| POST | `/api/meetings/instant` | Create an instant meeting |
| POST | `/api/meetings/schedule` | Schedule a meeting |
| GET | `/api/meetings/upcoming` | Upcoming scheduled meetings |
| GET | `/api/meetings/recent` | Recent meetings (last 10) |
| GET | `/api/meetings/{code}` | Meeting details / validate ID |
| POST | `/api/meetings/{code}/join` | Join with a display name |
| GET | `/api/meetings/{code}/participants` | People currently in the meeting |
| PATCH | `/api/meetings/{code}/participants/{id}` | Update own mic/camera state |
| POST | `/api/meetings/{code}/participants/{id}/leave` | Leave |
| POST | `/api/meetings/{code}/mute-all` | Host: mute everyone |
| POST | `/api/meetings/{code}/participants/{id}/remove` | Host: remove a participant |
| POST | `/api/meetings/{code}/end` | Host: end for all |
| GET | `/api/meetings/{code}/messages?after_id=0` | Chat messages newer than `after_id`, oldest first |
| POST | `/api/meetings/{code}/messages` | Send a chat message (only while in the meeting) |
| WS | `/ws/meetings/{code}/{participant_id}` | WebRTC signaling (camera, mic, screen share) |

Interactive docs are at `http://localhost:8000/docs`.

## Project structure

```
backend/
  app/
    main.py          app setup, CORS, startup (create tables + seed)
    database.py      SQLite connection and session
    models.py        tables: User, Meeting, Participant
    schemas.py       request/response validation (Pydantic)
    utils.py         meeting-code generator, default user, 404 helper
    seed.py          sample data
    routers/
      users.py       /api/users
      meetings.py    /api/meetings
frontend/
  app/
    page.js                 home dashboard
    meeting/[code]/page.js  meeting room
    j/[code]/page.js        invite link redirect
  components/               reusable UI (Navbar, Modal, tiles, lists, modals)
  components/meeting/       meeting room UI (PreJoin, VideoGrid, Toolbar, ...)
  hooks/                    useLocalMedia (camera/mic/screen), useMeetingPolling
  lib/                      api.js (all backend calls), format.js (helpers)
```

## Running locally

**Requirements:** Python 3.10+ and Node.js 18.18+

**Backend** (terminal 1):
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate    Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Runs on http://localhost:8000. The database file and sample data are created automatically on first start.

**Frontend** (terminal 2):
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:3000.

### Environment variables

| Where | Variable | Default | Purpose |
|---|---|---|---|
| backend | `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated frontend URLs allowed to call the API |
| backend | `FRONTEND_URL` | `http://localhost:3000` | Used to build invite links |
| backend | `DATABASE_URL` | `sqlite:///./zoom_clone.db` | Database location |
| frontend | `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL |

## Assumptions

- **No login:** a default user ("Demo User") is always logged in, as the assignment allows. Every meeting is hosted by this user.
- **Host identity:** opening a meeting via *New Meeting* or *Start* makes you the host. Host actions are authorised by the host's participant ID, since there is no authentication.
- **Camera, mic and screen share** are sent to every other participant peer-to-peer with WebRTC (a full mesh, fine for small meetings). The backend WebSocket `/ws/meetings/{code}/{participant_id}` only relays the connection setup messages, and keeps rooms in memory, so run a single backend process. Only Google's public STUN server is configured. On networks that block direct connections, set `NEXT_PUBLIC_TURN_URL`, `NEXT_PUBLIC_TURN_USERNAME` and `NEXT_PUBLIC_TURN_CREDENTIAL` in the frontend to add a TURN server.
- **Real-time updates** use polling every 3 seconds rather than WebSockets, for simplicity.
- **Hosting:** on free hosting tiers the SQLite file may reset on redeploy. The app re-seeds sample data automatically on startup.
- A meeting is "ended" only when the host chooses *End Meeting for All*. If everyone simply leaves, the meeting can be rejoined.
