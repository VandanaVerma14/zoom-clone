"use client";

import { Check, Copy, Users } from "lucide-react";
import { useState } from "react";
import { copyToClipboard, formatDate, formatDuration, formatMeetingCode, formatTime, isToday } from "@/lib/format";

/**
 * One row in the Upcoming or Recent list.
 * variant "upcoming" shows a Start button, "recent" shows when it happened and who joined.
 */
export default function MeetingItem({ meeting, variant, onStart }) {
  const [copied, setCopied] = useState(false);
  const when = variant === "recent" ? meeting.started_at || meeting.start_time : meeting.start_time;

  async function handleCopy() {
    if (await copyToClipboard(meeting.invite_link)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <li className="flex items-center gap-3 border-b border-gray-100 px-5 py-3 last:border-none hover:bg-gray-50 sm:gap-4">
      <div className="w-[4.5rem] shrink-0 text-sm sm:w-20">
        <p className="font-bold text-zoom-text">{formatTime(when)}</p>
        <p className="text-xs text-gray-500">{isToday(when) ? "Today" : formatDate(when)}</p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-zoom-text">{meeting.title}</p>
        <p className="truncate text-xs text-gray-500">
          Meeting ID: {formatMeetingCode(meeting.meeting_code)}
          {variant === "recent" ? (
            <span className="ml-2 inline-flex items-center gap-1">
              <Users size={12} /> {meeting.participant_count}
            </span>
          ) : (
            <span className="ml-2">· {formatDuration(meeting.duration_minutes)}</span>
          )}
        </p>
      </div>

      <button
        onClick={handleCopy}
        title="Copy invitation link"
        className="shrink-0 rounded-lg p-2 text-gray-500 transition hover:bg-gray-200"
      >
        {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
      </button>

      {variant === "upcoming" && (
        <button onClick={() => onStart(meeting)} className="btn-primary shrink-0 rounded-full px-4 py-1.5">
          Start
        </button>
      )}
      {variant === "recent" && meeting.status === "ended" && (
        <span className="hidden rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 sm:inline">Ended</span>
      )}
    </li>
  );
}
