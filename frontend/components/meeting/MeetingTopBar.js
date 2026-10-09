"use client";

import { Info, Pencil, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import useDismiss from "@/hooks/useDismiss";
import { initials } from "@/lib/format";
import MeetingInfoPopover from "./MeetingInfoPopover";
import ViewMenu, { SpeakerViewIcon } from "./ViewMenu";

/**
 * Top strip of the meeting panel: title pill (opens meeting info) on the left;
 * security shield, placeholder tools, the View menu and my avatar on the right.
 * `viewMenu` holds everything ViewMenu needs except onComingSoon / onClose.
 */
export default function MeetingTopBar({ meeting, me, onHostTools, onComingSoon, viewMenu }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const pillRef = useRef(null);
  const viewRef = useRef(null);
  const closeInfo = useCallback(() => setInfoOpen(false), []);
  const closeView = useCallback(() => setViewOpen(false), []);
  useDismiss(pillRef, infoOpen, closeInfo);
  useDismiss(viewRef, viewOpen, closeView);

  function run(action) {
    setInfoOpen(false);
    action();
  }

  return (
    <header className="flex h-[46px] shrink-0 items-center justify-between gap-3 bg-[#0E0E0E] px-2 text-white sm:px-3">
      <div ref={pillRef} className="relative min-w-0">
        <button
          onClick={() => setInfoOpen(!infoOpen)}
          aria-expanded={infoOpen}
          className={`flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold hover:bg-white/15 ${
            infoOpen ? "bg-white/15" : "bg-white/[0.06]"
          }`}
        >
          <Info size={13} className="shrink-0" />
          <span className="truncate">{meeting.title}</span>
        </button>
        {infoOpen && (
          <MeetingInfoPopover
            meeting={meeting}
            me={me}
            onViewInfo={() => run(onComingSoon)}
            onHostTools={() => run(onHostTools)}
          />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <ShieldCheck size={17} className="fill-[#1FD27C] text-[#0E0E0E]" aria-label="Encrypted" />
        <IconButton label="Annotate" onClick={onComingSoon} className="hidden sm:flex">
          <Pencil size={16} />
        </IconButton>
        <IconButton label="AI Companion" onClick={onComingSoon} className="hidden sm:flex">
          <Sparkles size={16} />
        </IconButton>
        <span className="mx-1 h-5 w-px bg-white/20" />
        <div ref={viewRef} className="relative">
          <IconButton label="View" onClick={() => setViewOpen(!viewOpen)} active={viewOpen}>
            <SpeakerViewIcon size={16} />
          </IconButton>
          {viewOpen && <ViewMenu {...viewMenu} onComingSoon={onComingSoon} onClose={closeView} />}
        </div>
        <span
          title={me.display_name}
          className="ml-1 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white text-[9px] font-bold text-[#0E0E0E]"
        >
          {initials(me.display_name)}
        </span>
      </div>
    </header>
  );
}

function IconButton({ label, onClick, active, className = "flex", children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-expanded={active}
      className={`${className} h-7 w-7 items-center justify-center rounded-md text-white hover:bg-white/15 ${active ? "bg-white/15" : ""}`}
    >
      {children}
    </button>
  );
}
