"use client";

import { Mic, MicOff, Video, VideoOff, X } from "lucide-react";
import Avatar from "../Avatar";

/** Right-side list of people in the meeting, with host controls. */
export default function ParticipantsPanel({ participants, meId, isHost, onClose, onMuteAll, onRemove, onInvite }) {
  return (
    <aside className="flex w-full shrink-0 flex-col bg-white text-zoom-text sm:w-80">
      <div className="flex items-center justify-between border-b border-zoom-border px-4 py-3">
        <h2 className="font-bold">Participants ({participants.length})</h2>
        <button onClick={onClose} aria-label="Close participants" className="rounded p-1 hover:bg-gray-100">
          <X size={18} />
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto py-2">
        {participants.map((p) => {
          const isMe = p.id === meId;
          const tags = [p.role === "host" && "Host", isMe && "me"].filter(Boolean);
          return (
            <li key={p.id} className="group flex items-center gap-3 px-4 py-2 hover:bg-gray-50">
              <Avatar name={p.display_name} size={32} />
              <span className="min-w-0 flex-1 truncate text-sm">
                {p.display_name}
                {tags.length > 0 && <span className="text-zoom-muted"> ({tags.join(", ")})</span>}
              </span>
              {isHost && !isMe && (
                <button
                  onClick={() => onRemove(p)}
                  className="hidden rounded border border-zoom-border px-2 py-0.5 text-xs hover:bg-gray-100 group-hover:block"
                >
                  Remove
                </button>
              )}
              {p.is_muted ? <MicOff size={16} className="text-zoom-danger" /> : <Mic size={16} className="text-zoom-muted" />}
              {p.is_video_on ? <Video size={16} className="text-zoom-muted" /> : <VideoOff size={16} className="text-zoom-danger" />}
            </li>
          );
        })}
      </ul>

      <div className="flex gap-2 border-t border-zoom-border p-3">
        <button onClick={onInvite} className="btn-secondary flex-1">Invite</button>
        {isHost && (
          <button onClick={onMuteAll} className="btn-secondary flex-1">Mute All</button>
        )}
      </div>
    </aside>
  );
}
