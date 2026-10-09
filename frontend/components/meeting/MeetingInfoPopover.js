"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { copyToClipboard, formatMeetingCode } from "@/lib/format";

/**
 * Dark "meeting information" card shown under the title pill in the top bar.
 * Closing (outside click / Escape) is handled by the parent, which owns the open state.
 */
export default function MeetingInfoPopover({ meeting, me, onViewInfo, onHostTools }) {
  const [copied, setCopied] = useState(false);
  const isHost = me.role === "host";

  async function handleCopy() {
    if (await copyToClipboard(meeting.invite_link)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Meeting information"
      className="fixed inset-x-2 top-14 z-30 rounded-xl border border-white/10 bg-[#232428] p-5 text-white shadow-2xl sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[460px]"
    >
      <h2 className="mb-5 text-xl font-bold sm:text-2xl">{meeting.title}</h2>

      <dl className="space-y-4 text-sm sm:text-base">
        <InfoRow label="Invite link">
          <div className="flex items-center gap-2">
            <a href={meeting.invite_link} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-[#4A9EFF] hover:underline">
              {meeting.invite_link}
            </a>
            <button
              onClick={handleCopy}
              aria-label="Copy invite link"
              className="flex h-9 min-w-9 shrink-0 items-center justify-center gap-1 rounded-md bg-white/5 px-2 text-xs hover:bg-white/15"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              {copied && "Copied"}
            </button>
          </div>
        </InfoRow>
        <InfoRow label="Meeting ID">{formatMeetingCode(meeting.meeting_code)}</InfoRow>
        <InfoRow label="Passcode">{meeting.passcode || "—"}</InfoRow>
        <InfoRow label="Host">
          {meeting.host.name}
          {isHost && " (You)"}
        </InfoRow>
        <InfoRow label="Participant ID">{String(me.id).padStart(6, "0")}</InfoRow>
        <InfoRow label="Numeric passcode (telephone, SIP/H.323 systems)">{meeting.numeric_passcode || "—"}</InfoRow>
      </dl>

      <div className="my-4 h-px bg-white/10" />

      <div className="-mx-2 flex flex-col text-sm sm:text-base">
        <MenuRow onClick={onViewInfo}>View meeting info</MenuRow>
        {isHost && <MenuRow onClick={onHostTools}>Host tools</MenuRow>}
      </div>
    </div>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="grid grid-cols-[40%_1fr] items-center gap-3">
      <dt className="text-gray-400">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function MenuRow({ onClick, children }) {
  return (
    <button onClick={onClick} className="rounded-md px-2 py-2 text-left hover:bg-white/10">
      {children}
    </button>
  );
}
