"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL } from "@/lib/api";

// STUN finds each browser's public address. Add a TURN server (env vars) for networks where
// a direct connection is impossible (strict corporate / mobile networks).
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];
if (process.env.NEXT_PUBLIC_TURN_URL) {
  ICE_SERVERS.push({
    urls: process.env.NEXT_PUBLIC_TURN_URL,
    username: process.env.NEXT_PUBLIC_TURN_USERNAME,
    credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
  });
}

const RECONNECT_MS = 2000;

/**
 * Sends our camera, microphone and screen share to everyone else in the meeting and receives
 * theirs, using WebRTC. The backend WebSocket (/ws/meetings/...) only relays the setup messages.
 *
 * For every other person we keep two one-way peer connections:
 *   outgoing[id]  carries our camera/mic (+ screen while sharing) to them
 *   incoming[id]  carries their camera/mic (+ screen) to us
 * When what we send changes (share starts/stops) we simply rebuild our outgoing connections.
 * Each offer names the id of the screen stream, so the receiver can tell camera and screen apart.
 *
 * Returns { [participantId]: { camera, screen, screenAt } } for the other people.
 * Mic/camera on-off is not signalled here: tracks are only disabled, and the tiles use the
 * is_muted / is_video_on flags from the server.
 */
export default function useMeetingRTC(code, myId, enabled, camera, screen) {
  const [remote, setRemote] = useState({});
  const wsRef = useRef(null);
  const peersRef = useRef(new Set());
  const outgoingRef = useRef(new Map());
  const incomingRef = useRef(new Map());
  const pendingIceRef = useRef(new Map()); // candidates that arrived before the remote description
  const mediaRef = useRef({ camera, screen });
  mediaRef.current = { camera, screen };

  const send = useCallback((message) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  }, []);

  const setRemoteMedia = useCallback((id, media) => {
    setRemote((all) => {
      const next = { ...all };
      if (media) next[id] = media;
      else delete next[id];
      return next;
    });
  }, []);

  const closePc = useCallback((map, id) => {
    const pc = map.get(id);
    if (!pc) return;
    pc.onicecandidate = pc.ontrack = pc.onconnectionstatechange = null;
    pc.close();
    map.delete(id);
    pendingIceRef.current.delete(pc);
  }, []);

  const newPc = useCallback(
    (peerId, dir) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pc.onicecandidate = (e) => {
        if (e.candidate) send({ to: peerId, type: "candidate", dir, candidate: e.candidate.toJSON() });
      };
      return pc;
    },
    [send]
  );

  const flushIce = useCallback(async (pc) => {
    const queued = pendingIceRef.current.get(pc) || [];
    pendingIceRef.current.delete(pc);
    for (const c of queued) await pc.addIceCandidate(c).catch(() => {});
  }, []);

  // (Re)build the connection that sends our media to one person
  const sendTo = useCallback(
    async (peerId) => {
      closePc(outgoingRef.current, peerId);
      const { camera, screen } = mediaRef.current;
      const streams = [camera, screen].filter((s) => s && s.getTracks().length);
      if (!streams.length) {
        send({ to: peerId, type: "stopped" });
        return;
      }
      const pc = newPc(peerId, "out");
      outgoingRef.current.set(peerId, pc);
      streams.forEach((stream) => stream.getTracks().forEach((track) => pc.addTrack(track, stream)));
      try {
        await pc.setLocalDescription(await pc.createOffer());
        send({ to: peerId, type: "offer", sdp: pc.localDescription.toJSON(), screen: screen?.id || null });
      } catch {
        if (outgoingRef.current.get(peerId) === pc) closePc(outgoingRef.current, peerId);
      }
    },
    [closePc, newPc, send]
  );

  const handleMessage = useCallback(
    async (msg) => {
      const from = msg.from;
      switch (msg.type) {
        case "peers": {
          // (Re)connected: start fresh with everyone already in the room
          peersRef.current = new Set(msg.peers);
          for (const id of [...incomingRef.current.keys()]) {
            if (!peersRef.current.has(id)) {
              closePc(incomingRef.current, id);
              setRemoteMedia(id, null);
            }
          }
          msg.peers.forEach(sendTo);
          break;
        }
        case "peer-joined":
          peersRef.current.add(from);
          sendTo(from);
          break;
        case "peer-left":
          peersRef.current.delete(from);
          closePc(outgoingRef.current, from);
          closePc(incomingRef.current, from);
          setRemoteMedia(from, null);
          break;
        case "offer": {
          closePc(incomingRef.current, from);
          const pc = newPc(from, "in");
          incomingRef.current.set(from, pc);
          const media = { camera: null, screen: null, screenAt: 0 };
          setRemoteMedia(from, { ...media });
          pc.ontrack = (e) => {
            const stream = e.streams[0] || new MediaStream([e.track]);
            if (msg.screen && stream.id === msg.screen) {
              media.screen = stream;
              media.screenAt = Date.now();
            } else {
              media.camera = stream;
            }
            if (incomingRef.current.get(from) === pc) setRemoteMedia(from, { ...media });
          };
          pc.onconnectionstatechange = () => {
            if (pc.connectionState === "failed" && incomingRef.current.get(from) === pc) {
              closePc(incomingRef.current, from);
              setRemoteMedia(from, null);
            }
          };
          try {
            await pc.setRemoteDescription(msg.sdp);
            await flushIce(pc);
            await pc.setLocalDescription(await pc.createAnswer());
            send({ to: from, type: "answer", sdp: pc.localDescription.toJSON() });
          } catch {
            if (incomingRef.current.get(from) === pc) closePc(incomingRef.current, from);
          }
          break;
        }
        case "answer": {
          const pc = outgoingRef.current.get(from);
          if (!pc) break;
          await pc.setRemoteDescription(msg.sdp).catch(() => {});
          await flushIce(pc);
          break;
        }
        case "candidate": {
          // "out" means the sender is sending media, so it belongs to our incoming connection
          const pc = (msg.dir === "out" ? incomingRef : outgoingRef).current.get(from);
          if (!pc) break;
          if (pc.remoteDescription) {
            await pc.addIceCandidate(msg.candidate).catch(() => {});
          } else {
            const queue = pendingIceRef.current.get(pc) || [];
            queue.push(msg.candidate);
            pendingIceRef.current.set(pc, queue);
          }
          break;
        }
        case "stopped":
          closePc(incomingRef.current, from);
          setRemoteMedia(from, null);
          break;
      }
    },
    [closePc, flushIce, newPc, send, sendTo, setRemoteMedia]
  );

  const handleRef = useRef(handleMessage);
  handleRef.current = handleMessage;

  // Signaling connection, kept open (and reconnected) while we are in the room
  useEffect(() => {
    if (!enabled || !myId || typeof RTCPeerConnection === "undefined") return;
    let stopped = false;
    let retryTimer;

    function connect() {
      const ws = new WebSocket(`${WS_URL}/ws/meetings/${code}/${myId}`);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          handleRef.current(JSON.parse(e.data));
        } catch {
          // ignore malformed messages
        }
      };
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        if (!stopped) retryTimer = setTimeout(connect, RECONNECT_MS);
      };
    }

    connect();
    const outgoing = outgoingRef.current;
    const incoming = incomingRef.current;
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
      for (const id of [...outgoing.keys()]) closePc(outgoing, id);
      for (const id of [...incoming.keys()]) closePc(incoming, id);
      peersRef.current = new Set();
      setRemote({});
    };
  }, [code, myId, enabled, closePc]);

  // What we send changed (camera ready, share started/stopped): rebuild our outgoing connections
  useEffect(() => {
    peersRef.current.forEach(sendTo);
  }, [camera, screen, sendTo]);

  return remote;
}
