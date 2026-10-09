"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/api";

const POLL_INTERVAL_MS = 3000;

/**
 * While `enabled`, asks the backend every 3 seconds for the meeting, its participants and any
 * chat messages newer than the last one received, and passes them to `onUpdate`.
 * This keeps everyone's participant list and chat in sync.
 */
export default function useMeetingPolling(code, enabled, onUpdate) {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let lastMessageId = 0; // only ask for messages we haven't seen yet

    async function poll() {
      try {
        const [meeting, participants, messages] = await Promise.all([
          api.getMeeting(code),
          api.getParticipants(code),
          api.getMessages(code, lastMessageId),
        ]);
        if (cancelled) return;
        if (messages.length) lastMessageId = messages[messages.length - 1].id;
        callbackRef.current({ meeting, participants, messages });
      } catch {
        // network hiccup: try again on the next tick
      }
    }

    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [code, enabled]);
}
