# Zoom Clone: Video Conferencing Platform

A full-stack web app that recreates the Zoom web experience: a home dashboard, instant meetings, joining by ID or invite link, scheduling, and a meeting room with live video, screen sharing, chat, participant management and host controls.

## Live demo

- **Live app:** _add your Vercel link here_ (e.g. `https://your-app.vercel.app`)
- **API docs:** _add your Render link here_ + `/docs` (e.g. `https://your-api.onrender.com/docs`)

> The backend runs on a free tier, so the first request after a period of inactivity can take up to a minute while the server wakes up.

**Try it:** open the live app, click **New Meeting**, then open the invite link in a second browser (or on another device) and join as a guest. Turn on the camera, share your screen and send a chat message.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router, client-side SPA pages), React 19, Tailwind CSS, lucide-react icons |
| Backend | Python, FastAPI, SQLAlchemy 2, Pydantic 2 |
| Database | SQLite |
| Media | Browser APIs: `getUserMedia` (camera/mic), `getDisplayMedia` (screen share), WebRTC (sends camera, mic and screen share to other participants, signaled over a FastAPI WebSocket), Fullscreen API |

## Features

**Core**
- **Landing dashboard:** Zoom Workplace-style navbar (with hover tooltips) and sidebar, New meeting / Join / Schedule buttons, live clock, Upcoming and Recent meetings.
- **Instant meeting:** creates a meeting with a unique 10-digit ID, passcodes and an invite link, then redirects to the meeting room as host.
- **Join meeting:** accepts a meeting ID (`812 345 6789`) or a full invite link, asks for a display name, and validates that the meeting exists and has not ended.
- **Schedule meeting:** title, description, date and time picker, duration. The link is generated automatically, saved to the database, and shown under Upcoming.

**Meeting room**

- **Live video, audio and screen share** between participants using WebRTC. A shared screen appears in the main area for everyone, labelled with the sharer's name.
- Meeting runs inside the app shell (navbar and sidebar), like Zoom Workplace.
- **View menu:** Speaker / Gallery / Multi-speaker views, hide self view, hide non-video participants, and browser fullscreen.
- Zoom-style bottom toolbar: Mute/Unmute, Video on/off, Participants, Chat (with unread badge), React, Share / Stop share, Host tools, More, End/Leave.
- Meeting info popover (ID, passcode, numeric passcode, host, copyable invite link).
- Participants panel, kept in sync every 3 seconds.
- **In-meeting chat:** messages are saved in the database and appear for everyone in the meeting (polled every 3 seconds), with join/leave lines, an unread badge, and an error message if a send fails.
- Participants panel, kept in sync every 3 seconds.
- **In-meeting chat:** messages are saved in the database and appear for everyone in the meeting (polled every 3 seconds), with join/leave lines, an unread badge, and an error message if a send fails.

**Bonus**
- Responsive layout (mobile, tablet, desktop).
- Host controls: **Mute All**, **Remove participant**, **End Meeting for All**.

## Database schema

```
users 1 ──< meetings 1 ──< participants >── 0..1 users
             meetings 1 ──< chat_messages >── 1 participants
```

**users**: id (PK), name, email (unique), avatar_color, created_at

**meetings**: id (PK), meeting_code (unique, indexed, 10 digits), title, description, host_id (FK → users), meeting_type (`instant` | `scheduled`), status (`scheduled` | `live` | `ended`), passcode, numeric_passcode, start_time, duration_minutes, started_at, ended_at, created_at

**participants**: id (PK), meeting_id (FK → meetings, indexed), user_id (FK → users, nullable for guests), display_name, role (`host` | `guest`), is_muted, is_video_on, joined_at, left_at (NULL while still in the meeting)

**chat_messages**: id (PK), meeting_id (FK → meetings, indexed), participant_id (FK → participants), message (text), created_at

Design notes:
- `meeting_code` is separate from the numeric `id`, so public IDs are not guessable sequential numbers.
- Passcodes are generated with Python's `secrets` module when a meeting is created.
- A participant row is one *session*: the same person rejoining creates a new row, which keeps a join/leave history.
- "Currently in the meeting" = `left_at IS NULL`. Removing someone or ending the meeting just sets `left_at`.
- All times are stored in UTC and converted to local time in the browser.
- A chat message points at the participant *session* that sent it, so the sender's display name comes from that row. Messages are deleted with their meeting.
- Older databases are upgraded automatically on startup (missing tables are created and the passcode columns are added), so no manual migration is needed.

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

Interactive docs are at `http://localhost:8000/docs` (or your deployed API URL + `/docs`).

## How it works

- **Video, audio and screen share:** each browser connects directly to every other participant with WebRTC. The backend WebSocket only passes the connection setup messages (offers, answers, ICE candidates) between browsers; the media itself never goes through the server.
- **Participants and chat:** every 3 seconds the meeting room asks the backend for the meeting, the participant list and any chat messages newer than the last one it has (`after_id`). Your own chat message appears instantly and is replaced by the saved copy when the server confirms it; messages already shown are skipped, so nothing appears twice.

## Project structure

```
backend/
  app/
    main.py          app setup, CORS, startup (create tables, upgrade old DB, seed)
    database.py      SQLite connection and session
    models.py        tables: User, Meeting, Participant, ChatMessage
    schemas.py       request/response validation (Pydantic)
    utils.py         meeting-code and passcode generators, default user, 404 helper
    seed.py          sample data and old-database upgrade
    routers/
      users.py       /api/users
      meetings.py    /api/meetings (meetings, participants, host controls, chat)
      signaling.py   /ws/meetings: WebSocket relay for WebRTC signaling
frontend/
  app/
    page.js                 home dashboard
    meeting/[code]/page.js  meeting room
    j/[code]/page.js        invite link redirect
  components/               reusable UI (AppShell, Navbar, Sidebar, HoverTip, Modal, tiles, lists, modals)
  components/meeting/       meeting room UI (PreJoin, MeetingTopBar, ViewMenu, VideoGrid, VideoTile,
                            Toolbar, ParticipantsPanel, ChatPanel, MeetingInfoPopover, ...)
  hooks/                    useLocalMedia (camera/mic/screen), useMeetingRTC (WebRTC peers),
                            useMeetingPolling, useFullscreen, useDismiss
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
python -m uvicorn app.main:app --reload
```
Runs on http://localhost:8000. The database file and sample data are created automatically on first start.

**Frontend** (terminal 2):
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:3000. To test a meeting with two people, open the invite link in a second browser or an incognito window.

### Environment variables

| Where | Variable | Default | Purpose |
|---|---|---|---|
| backend | `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated frontend URLs allowed to call the API |
| backend | `FRONTEND_URL` | `http://localhost:3000` | Used to build invite links |
| backend | `DATABASE_URL` | `sqlite:///./zoom_clone.db` | Database location |
| frontend | `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL (also used for the WebSocket) |
| frontend | `NEXT_PUBLIC_TURN_URL` | (none) | Optional TURN server for networks that block direct connections |
| frontend | `NEXT_PUBLIC_TURN_USERNAME` | (none) | TURN username |
| frontend | `NEXT_PUBLIC_TURN_CREDENTIAL` | (none) | TURN password |

## Deployment

- **Backend (Render):** root directory `backend`, build command `pip install -r requirements.txt`, start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set `CORS_ORIGINS` and `FRONTEND_URL` to the Vercel URL.
- **Frontend (Vercel):** root directory `frontend`. Set `NEXT_PUBLIC_API_URL` to the Render URL (no trailing slash). The WebSocket URL is derived from it automatically (`https` → `wss`).

## Assumptions

- **No login:** a default user ("Demo User") is always logged in, as the assignment allows. Every meeting is hosted by this user.
- **Host identity:** opening a meeting via *New Meeting* or *Start* makes you the host. Host actions are authorised by the host's participant ID, since there is no authentication.
- **Passcodes** are generated and shown in the meeting info, but are not required to join.
- **Camera, mic and screen share** are sent to every other participant peer-to-peer with WebRTC (a full mesh, fine for small meetings). The backend WebSocket only relays the connection setup messages and keeps rooms in memory, so run a single backend process. Only Google's public STUN server is configured; on networks that block direct connections, set the `NEXT_PUBLIC_TURN_*` variables to add a TURN server.
- **Real-time updates** (participants and chat) use polling every 3 seconds rather than WebSockets, for simplicity, so a chat message can take up to 3 seconds to appear for others.
- A meeting is "ended" only when the host chooses *End Meeting for All*. If everyone simply leaves, the meeting can be rejoined.

## Mocked data

- **Sample data:** sample upcoming and past meetings, participants and chat messages are seeded when the database is empty.
- **Placeholders:** features outside the scope (Annotate, AI Companion, React, More, pop-out chat, chat formatting/file/emoji, some dashboard cards) show a "coming soon" message.
- **Hosting:** on free hosting tiers the SQLite file may reset on redeploy. The app re-seeds sample data automatically on startup.
