"use client";

import { Ellipsis, File, MessagesSquare, SendHorizontal, Smile, SquareArrowOutUpRight, Type, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import useDismiss from "@/hooks/useDismiss";
import { formatTime } from "@/lib/format";
import Avatar from "../Avatar";

/**
 * Zoom-style meeting chat. The parent sends and receives the messages through the API;
 * this component only shows them and collects new ones.
 * `messages`: [{ id, kind: "system" | "me" | "other", text, name?, at (ISO time), pending? }]
 * `onSend(text)` returns a promise of an error text (or null when it worked).
 * Full-height column on the right of the meeting panel; a full-screen overlay on phones.
 */
export default function ChatPanel({ title, messages, myName, onSend, onClose, onComingSoon }) {
  const [draft, setDraft] = useState("");
  const [whoOpen, setWhoOpen] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);
  const whoRef = useRef(null);
  useDismiss(whoRef, whoOpen, useCallback(() => setWhoOpen(false), []));

  // Keep the newest message in view
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setError("");
    const failed = await onSend(text);
    if (failed) {
      setError(failed);
      setDraft((current) => current || text); // give the text back so it can be resent
    }
  }

  function handleKeyDown(e) {
    // Enter sends, Shift+Enter is a new line (and don't send while an IME is composing)
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  return (
    <aside
      aria-label="Chat"
      className="fixed inset-0 z-40 flex flex-col bg-[#1F1F1F] text-white sm:static sm:z-auto sm:w-[384px] sm:shrink-0 sm:border-l sm:border-[#2D2D2D]"
    >
      {/* Header */}
      <div className="flex h-[46px] shrink-0 items-center gap-2 px-3">
        <MessagesSquare size={16} className="shrink-0 text-white/60" />
        <h2 className="min-w-0 flex-1 truncate text-center text-sm font-bold">{title}</h2>
        <button onClick={onComingSoon} aria-label="Pop out chat" className="rounded p-1 text-white/80 hover:bg-white/10">
          <SquareArrowOutUpRight size={16} />
        </button>
        <button onClick={onClose} aria-label="Close chat" className="rounded p-1 text-white/80 hover:bg-white/10">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-2 text-[13px]">
        <p className="px-4 text-center text-xs leading-snug text-white/60">
          Messages addressed to &quot;Meeting Group Chat&quot; will also appear in the meeting group chat in Team Chat
        </p>
        {messages.map((m) => (
          <Message key={m.id} message={m} myName={myName} />
        ))}
      </div>

      {/* Footer */}
      <div className="shrink-0">
        <div ref={whoRef} className="relative bg-[#2A2A2A] py-1.5 text-center">
          <button
            onClick={() => setWhoOpen(!whoOpen)}
            aria-expanded={whoOpen}
            className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white"
          >
            <UserRound size={14} className="text-[#4A9EFF]" />
            Who can see your messages?
          </button>
          {whoOpen && (
            <p
              role="tooltip"
              className="absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2 rounded-md border border-white/10 bg-[#2D2D2D] px-3 py-2 text-xs text-white shadow-xl"
            >
              Everyone in the meeting can see messages sent to Meeting Group Chat
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 pt-2.5 text-xs">
          <span className="text-white/60">to:</span>
          <button className="rounded-full bg-zoom-blue px-3 py-0.5 text-xs text-white hover:bg-[#0849cc]">Meeting Group Chat</button>
        </div>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder="Type message here ..."
          aria-label="Type message"
          className="block w-full resize-none bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/80"
        />
        {error && (
          <p role="alert" className="px-3 text-xs text-[#FF6B6B]">
            {error}
          </p>
        )}

        <div className="flex items-center gap-1 px-2 pb-2">
          <FooterIcon label="Format" onClick={onComingSoon} icon={Type} />
          <FooterIcon label="File" onClick={onComingSoon} icon={File} />
          <FooterIcon label="Emoji" onClick={onComingSoon} icon={Smile} />
          <FooterIcon label="More" onClick={onComingSoon} icon={Ellipsis} />
          <button
            onClick={send}
            disabled={!draft.trim()}
            aria-label="Send"
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md bg-zoom-blue text-white transition hover:bg-[#0849cc] disabled:bg-white/10 disabled:text-white/40"
          >
            <SendHorizontal size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Message({ message: m, myName }) {
  if (m.kind === "system") {
    return <p className="text-center text-xs text-white/60">{m.text}</p>;
  }
  const mine = m.kind === "me";
  const header = (
    <p className={`mb-1 text-[11px] text-white/60 ${mine ? "text-right" : ""}`}>
      <span className="font-bold text-white/80">{mine ? myName : m.name}</span> {formatTime(m.at)}
    </p>
  );
  const bubble = (
    <p
      className={`inline-block max-w-[85%] whitespace-pre-wrap break-words rounded-xl px-3 py-1.5 text-left ${
        mine ? "bg-zoom-blue" : "bg-[#2D2D2D]"
      } ${m.pending ? "opacity-60" : ""}`}
    >
      {m.text}
    </p>
  );

  if (mine) {
    return (
      <div className="text-right">
        {header}
        {bubble}
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <Avatar name={m.name} size={28} />
      <div className="min-w-0 flex-1">
        {header}
        {bubble}
      </div>
    </div>
  );
}

function FooterIcon({ label, onClick, icon: Icon }) {
  return (
    <button onClick={onClick} aria-label={label} className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
      <Icon size={16} />
    </button>
  );
}
