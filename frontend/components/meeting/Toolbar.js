"use client";

import { CircleEllipsis, Heart, Hexagon, MessageSquare, Mic, ShieldHalf, SquareArrowUp, Users, Video, X } from "lucide-react";
import { useState } from "react";
import ToolbarButton from "./ToolbarButton";

/** Zoom-style black bottom control bar. */
export default function Toolbar({
  micOn,
  camOn,
  sharing,
  participantCount,
  isHost,
  onToggleMic,
  onToggleCam,
  onToggleShare,
  onToggleParticipants,
  onToggleChat,
  unreadChat = 0,
  onHostTools,
  onComingSoon,
  onLeave,
  onEndForAll,
}) {
  const [leaveOpen, setLeaveOpen] = useState(false);

  return (
    <div className="relative flex h-[54px] shrink-0 items-center justify-between gap-1 bg-black px-1 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:px-3">
      <div className="flex sm:[&>*]:w-[86px]">
        <ToolbarButton icon={Mic} label={micOn ? "Mute" : "Unmute"} chevron slashed={!micOn} onClick={onToggleMic} />
        <ToolbarButton icon={Video} label="Video" chevron slashed={!camOn} onClick={onToggleCam} />
      </div>

      <div className="flex sm:[&>*]:w-[86px]">
        <ToolbarButton icon={Users} label="Participants" chevron badge={participantCount} onClick={onToggleParticipants} />
        <ToolbarButton icon={MessageSquare} label="Chat" chevron alert={unreadChat} onClick={onToggleChat} />
        <ToolbarButton icon={Heart} label="React" chevron onClick={onComingSoon} className="hidden sm:flex" />
        <ToolbarButton
          icon={SquareArrowUp}
          label={sharing ? "Stop share" : "Share"}
          chevron
          iconClassName={sharing ? "text-[#E8364B]" : ""}
          onClick={onToggleShare}
        />
        {isHost && <ToolbarButton icon={ShieldHalf} label="Host tools" onClick={onHostTools} />}
        <ToolbarButton icon={CircleEllipsis} label="More" onClick={onComingSoon} className="hidden sm:flex" />
      </div>

      <div className="flex justify-end">
        <ToolbarButton icon={EndIcon} label={isHost ? "End" : "Leave"} onClick={() => setLeaveOpen(!leaveOpen)} />
      </div>

      {leaveOpen && (
        <div className="absolute bottom-[58px] right-2 z-20 w-60 space-y-2 rounded-xl border border-white/10 bg-[#232428] p-3 shadow-2xl">
          {isHost && (
            <button
              onClick={onEndForAll}
              className="w-full rounded-lg bg-zoom-danger py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              End Meeting for All
            </button>
          )}
          <button onClick={onLeave} className="w-full rounded-lg bg-white/10 py-2 text-sm font-bold text-white hover:bg-white/20">
            Leave Meeting
          </button>
          <button onClick={() => setLeaveOpen(false)} className="w-full py-1 text-xs text-gray-400 hover:text-white">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

/** Zoom's red hexagon with an X, built from two lucide icons. */
function EndIcon({ size }) {
  return (
    <span className="relative flex items-center justify-center text-[#E8364B]" style={{ width: size, height: size }}>
      <Hexagon size={size} strokeWidth={1.8} className="rotate-90" />
      <X size={size * 0.45} strokeWidth={3.5} className="absolute" />
    </span>
  );
}
