"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import useFullscreen from "@/hooks/useFullscreen";
import useLocalMedia from "@/hooks/useLocalMedia";
import useMeetingPolling from "@/hooks/useMeetingPolling";
import useMeetingRTC from "@/hooks/useMeetingRTC";
import { api } from "@/lib/api";
import { copyToClipboard, inviteLink } from "@/lib/format";
import MeetingTopBar from "./MeetingTopBar";
import ChatPanel from "./ChatPanel";
import ParticipantsPanel from "./ParticipantsPanel";
import RemoteAudio from "./RemoteAudio";
import PreJoin from "./PreJoin";
import StatusScreen from "./StatusScreen";
import Toolbar from "./Toolbar";
import VideoGrid from "./VideoGrid";

/**
 * Controls the whole meeting page. It moves through these stages:
 *   loading -> prejoin -> room -> (ended | removed)
 *   loading -> error (invalid meeting ID)
 * Every stage is drawn inside a dark panel in the app shell (navbar + sidebar).
 * That panel is also the element that goes fullscreen, so only the meeting fills the screen.
 */
export default function MeetingRoom() {
  const { code } = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const wantsHost = search.get("host") === "1";

  const media = useLocalMedia({ audio: search.get("audio") !== "0", video: search.get("video") !== "0" });

  const [stage, setStage] = useState("loading");
  const [meeting, setMeeting] = useState(null);
  const [me, setMe] = useState(null); // my participant record
  const [participants, setParticipants] = useState([]);
  const [defaultName, setDefaultName] = useState(search.get("name") || "");
  const [errorText, setErrorText] = useState("");
  const [joining, setJoining] = useState(false);
  const [sidePanel, setSidePanel] = useState(null); // null | "participants" | "chat" (one at a time)
  // Chat lines: [{ id, kind: "system" | "me" | "other", text, name, at, serverId?, pending? }]
  const [chat, setChat] = useState([]);
  const [unreadChat, setUnreadChat] = useState(0);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState(null); // logged-in user, for the navbar avatar
  const [view, setView] = useState("speaker"); // "speaker" | "gallery" | "multi"
  const [hideSelf, setHideSelf] = useState(false);
  const [hideNonVideo, setHideNonVideo] = useState(false);
  const lastMicChange = useRef(0);
  const knownPeople = useRef(null); // participants at the previous poll, to spot joins / leaves
  const chatId = useRef(0); // local keys for chat lines
  const seenMessageIds = useRef(new Set()); // server ids already shown, so nothing appears twice
  const panelRef = useRef(null);
  const fullscreen = useFullscreen(panelRef);

  const showToast = useCallback((text) => {
    setToast(text);
    setTimeout(() => setToast(""), 2500);
  }, []);

  // 1. Check that the meeting exists (and load the navbar's user; not essential)
  useEffect(() => {
    let cancelled = false;
    api.getMe().then((u) => !cancelled && setUser(u)).catch(() => {});
    (async () => {
      try {
        const m = await api.getMeeting(code);
        if (cancelled) return;
        setMeeting(m);
        if (m.status === "ended") return setStage("ended");
        if (wantsHost && !defaultName) setDefaultName(m.host.name);
        setStage("prejoin");
      } catch (err) {
        if (!cancelled) {
          setErrorText(err.message);
          setStage("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // 2. Turn on camera/mic for the preview
  const { start: startMedia, stopAll: stopMedia } = media;
  useEffect(() => {
    if (stage === "prejoin") startMedia();
    if (stage === "ended" || stage === "removed") stopMedia();
  }, [stage, startMedia, stopMedia]);

  // Fullscreen only makes sense inside the room (e.g. the host ended the meeting)
  const { exit: exitFullscreen } = fullscreen;
  useEffect(() => {
    if (stage !== "room") exitFullscreen();
  }, [stage, exitFullscreen]);

  // 3. Join
  async function handleJoin(name) {
    setJoining(true);
    setErrorText("");
    try {
      const participant = await api.joinMeeting(code, {
        display_name: name,
        as_host: wantsHost,
        is_muted: !media.micOn,
        is_video_on: media.camOn,
      });
      setMe(participant);
      setParticipants([participant]);
      setStage("room");
    } catch (err) {
      setErrorText(err.message);
    } finally {
      setJoining(false);
    }
  }

  // 4. While in the room, stay in sync with the server (participants, meeting status, chat)
  const addChat = useCallback((items) => {
    if (!items.length) return;
    const at = new Date().toISOString();
    setChat((list) => [...list, ...items.map((item) => ({ id: ++chatId.current, at, ...item }))]);
  }, []);

  // Compare who is here now with the previous poll, and post "joined" / "left" lines
  function trackJoinsAndLeaves(list) {
    const previous = knownPeople.current;
    knownPeople.current = new Map(list.map((p) => [p.id, p]));
    if (!previous) return; // first poll: just remember everyone already here
    const events = [];
    for (const p of list) {
      if (!previous.has(p.id) && p.id !== me.id) {
        events.push({ kind: "system", text: p.role === "host" ? `${p.display_name} joined` : `${p.display_name} joined as a guest` });
      }
    }
    for (const [id, p] of previous) {
      if (!knownPeople.current.has(id)) events.push({ kind: "system", text: `${p.display_name} left` });
    }
    addChat(events);
    if (events.length && sidePanel !== "chat") setUnreadChat((n) => n + events.length);
  }

  // New chat messages from the server (each poll only returns ids we haven't asked for yet)
  function receiveMessages(messages) {
    const fresh = messages.filter((msg) => !seenMessageIds.current.has(msg.id));
    if (!fresh.length) return;
    fresh.forEach((msg) => seenMessageIds.current.add(msg.id));
    setChat((list) => {
      let next = [...list];
      for (const msg of fresh) {
        const line = { kind: msg.participant_id === me.id ? "me" : "other", text: msg.message, name: msg.sender_name, at: msg.created_at, serverId: msg.id };
        // My own message may arrive here before its POST finished: replace the pending copy
        const pending = line.kind === "me" ? next.findIndex((l) => l.pending && l.text === line.text) : -1;
        if (pending >= 0) next[pending] = { ...next[pending], ...line, pending: false };
        else next.push({ id: ++chatId.current, ...line });
      }
      return next;
    });
    const fromOthers = fresh.filter((msg) => msg.participant_id !== me.id).length;
    if (fromOthers && sidePanel !== "chat") setUnreadChat((n) => n + fromOthers);
  }

  useMeetingPolling(code, stage === "room", ({ meeting: m, participants: list, messages }) => {
    setMeeting(m);
    if (m.status === "ended") return setStage("ended");
    const mine = list.find((p) => p.id === me.id);
    if (!mine) return setStage("removed");
    trackJoinsAndLeaves(list);
    receiveMessages(messages);
    setParticipants(list);
    // Host pressed "Mute All": follow the server (unless I just changed it myself)
    if (mine.is_muted && media.micOn && Date.now() - lastMicChange.current > 4000) {
      media.setMic(false);
      showToast("The host muted everyone");
    }
  });

  // Send our camera, mic and screen share to the others and receive theirs (WebRTC)
  const remote = useMeetingRTC(code, me?.id, stage === "room", media.stream, media.screenStream);

  // Leave the meeting if the tab is closed
  useEffect(() => {
    if (stage !== "room" || !me) return;
    const onUnload = () => api.leaveOnUnload(code, me.id);
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [stage, me, code]);

  // ----- Toolbar actions -----
  async function toggleMic() {
    const next = !media.micOn;
    if (!media.setMic(next)) return showToast("No microphone available");
    lastMicChange.current = Date.now();
    api.updateParticipant(code, me.id, { is_muted: !next }).catch(() => {});
  }

  async function toggleCam() {
    const next = !media.camOn;
    if (!media.setCam(next)) return showToast("No camera available");
    api.updateParticipant(code, me.id, { is_video_on: next }).catch(() => {});
  }

  async function toggleShare() {
    if (media.screenStream) return media.stopShare();
    if (!navigator.mediaDevices?.getDisplayMedia) return showToast("Screen sharing is not supported on this device");
    await media.startShare();
  }

  async function invite() {
    const link = inviteLink(meeting);
    const ok = await copyToClipboard(link);
    showToast(ok ? "Invite link copied to clipboard" : link);
  }

  async function leave() {
    exitFullscreen();
    await api.leaveMeeting(code, me.id).catch(() => {});
    media.stopAll();
    router.push("/");
  }

  async function endForAll() {
    exitFullscreen();
    await api.endMeeting(code, me.id).catch(() => {});
    media.stopAll();
    router.push("/");
  }

  function openHostTools() {
    setSidePanel("participants");
  }

  function toggleSidePanel(name) {
    setSidePanel((open) => (open === name ? null : name));
    if (name === "chat") setUnreadChat(0);
  }

  // Show my message at once (pending), then swap in the server's copy. Returns an error text or null.
  async function sendChat(text) {
    const id = ++chatId.current;
    setChat((list) => [...list, { id, kind: "me", text, name: me.display_name, at: new Date().toISOString(), pending: true }]);
    try {
      const msg = await api.sendMessage(code, me.id, text);
      if (seenMessageIds.current.has(msg.id)) {
        // A poll already delivered it (and replaced a pending copy); drop ours if it's still there
        setChat((list) => list.filter((l) => !(l.id === id && l.pending)));
      } else {
        seenMessageIds.current.add(msg.id);
        setChat((list) => list.map((l) => (l.id === id ? { ...l, at: msg.created_at, serverId: msg.id, pending: false } : l)));
      }
      return null;
    } catch (err) {
      setChat((list) => list.filter((l) => l.id !== id));
      return err.message || "Message not sent";
    }
  }

  function comingSoon() {
    showToast("Coming soon");
  }

  async function muteAll() {
    try {
      await api.muteAll(code, me.id);
      showToast("All participants muted");
    } catch (err) {
      showToast(err.message);
    }
  }

  async function removeParticipant(p) {
    if (!window.confirm(`Remove ${p.display_name} from the meeting?`)) return;
    try {
      await api.removeParticipant(code, p.id, me.id);
      setParticipants((list) => list.filter((x) => x.id !== p.id));
    } catch (err) {
      showToast(err.message);
    }
  }

  // ----- Render each stage, always inside the dark meeting panel -----
  return (
    <AppShell user={user} activeNav={null} fill>
      <div
        ref={panelRef}
        className={`flex h-full flex-col overflow-hidden bg-[#1C1C1C] text-white ${fullscreen.isFullscreen ? "" : "sm:rounded-xl"}`}
      >
        {renderStage()}
      </div>
    </AppShell>
  );

  function renderStage() {
    if (stage === "loading") return <StatusScreen title="Connecting..." showHomeButton={false} />;
    if (stage === "error") return <StatusScreen title="Unable to join" message={errorText} />;
    if (stage === "ended") return <StatusScreen title="This meeting has ended" message="The host has ended this meeting." />;
    if (stage === "removed") return <StatusScreen title="You have been removed" message="The host removed you from this meeting." />;
    if (stage === "prejoin") {
      return (
        <PreJoin
          meeting={meeting}
          media={media}
          defaultName={defaultName}
          isHost={wantsHost}
          onJoin={handleJoin}
          joining={joining}
          error={errorText}
        />
      );
    }

    const isHost = me.role === "host";
    return (
      <div className="flex min-h-0 flex-1">
        {/* Left: top bar, video and toolbar shrink to the width left over by the chat */}
        <div className="flex min-w-0 flex-1 flex-col">
          <MeetingTopBar
            meeting={meeting}
            me={me}
            onHostTools={openHostTools}
            onComingSoon={comingSoon}
            viewMenu={{
              view,
              onViewChange: setView,
              hideSelf,
              onToggleHideSelf: () => setHideSelf(!hideSelf),
              hideNonVideo,
              onToggleHideNonVideo: () => setHideNonVideo(!hideNonVideo),
              fullscreen,
            }}
          />

          <div className="relative flex min-h-0 flex-1">
            <div className="min-w-0 flex-1">
              <VideoGrid
                participants={participants}
                meId={me.id}
                media={media}
                remote={remote}
                view={view}
                hideSelf={hideSelf}
                hideNonVideo={hideNonVideo}
              />
              {Object.entries(remote).map(([id, m]) => m.camera && <RemoteAudio key={id} stream={m.camera} />)}
            </div>
            {sidePanel === "participants" && (
              <div className="absolute inset-0 z-10 flex sm:static">
                <ParticipantsPanel
                  participants={participants}
                  meId={me.id}
                  isHost={isHost}
                  onClose={() => setSidePanel(null)}
                  onMuteAll={muteAll}
                  onRemove={removeParticipant}
                  onInvite={invite}
                />
              </div>
            )}
            {toast && (
              <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2 text-sm text-white">
                {toast}
              </div>
            )}
          </div>

          <Toolbar
            micOn={media.micOn}
            camOn={media.camOn}
            sharing={Boolean(media.screenStream)}
            participantCount={participants.length}
            isHost={isHost}
            onToggleMic={toggleMic}
            onToggleCam={toggleCam}
            onToggleShare={toggleShare}
            onToggleParticipants={() => toggleSidePanel("participants")}
            onToggleChat={() => toggleSidePanel("chat")}
            unreadChat={unreadChat}
            onHostTools={openHostTools}
            onComingSoon={comingSoon}
            onLeave={leave}
            onEndForAll={endForAll}
          />
        </div>

        {/* Right: full-height chat column */}
        {sidePanel === "chat" && (
          <ChatPanel
            title={meeting.title}
            messages={chat}
            myName={me.display_name}
            onSend={sendChat}
            onClose={() => setSidePanel(null)}
            onComingSoon={comingSoon}
          />
        )}
      </div>
    );
  }
}
