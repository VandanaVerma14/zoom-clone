"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { copyToClipboard, formatDate, formatDuration, formatMeetingCode, formatTime } from "@/lib/format";
import Modal from "./Modal";

// Default start = next full half hour
function defaultStart() {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** "Schedule Meeting" popup: form, then a success screen with the invite link. */
export default function ScheduleModal({ userName, onClose, onScheduled }) {
  const start = defaultStart();
  const [form, setForm] = useState({
    title: `${userName || "My"}'s Zoom Meeting`,
    description: "",
    date: start.date,
    time: start.time,
    hours: "0",
    minutes: "30",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const duration = Number(form.hours) * 60 + Number(form.minutes);
    if (duration < 15) return setError("Duration must be at least 15 minutes.");

    // The browser's local date + time, converted to UTC for the backend
    const startTime = new Date(`${form.date}T${form.time}`);
    if (startTime < new Date()) return setError("Please pick a time in the future.");

    setSaving(true);
    try {
      const meeting = await api.scheduleMeeting({
        title: form.title,
        description: form.description || null,
        start_time: startTime.toISOString(),
        duration_minutes: duration,
      });
      setCreated(meeting);
      onScheduled?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (await copyToClipboard(created.invite_link)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  if (created) {
    return (
      <Modal title="Meeting scheduled" onClose={onClose}>
        <div className="space-y-3 text-sm">
          <p className="text-base font-bold">{created.title}</p>
          <Row label="When" value={`${formatDate(created.start_time)}, ${formatTime(created.start_time)}`} />
          <Row label="Duration" value={formatDuration(created.duration_minutes)} />
          <Row label="Meeting ID" value={formatMeetingCode(created.meeting_code)} />
          <div>
            <p className="mb-1 text-zoom-muted">Invite link</p>
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
              <span className="flex-1 truncate">{created.invite_link}</span>
              <button onClick={handleCopy} className="text-zoom-blue" title="Copy link">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={onClose} className="btn-primary">Done</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Schedule Meeting" onClose={onClose} width="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="title">Topic</label>
          <input id="title" className="input" required maxLength={200} value={form.title} onChange={update("title")} />
        </div>
        <div>
          <label className="label" htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            rows={2}
            className="input resize-none"
            value={form.description}
            onChange={update("description")}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="date">Date</label>
            <input id="date" type="date" className="input" required min={start.date} value={form.date} onChange={update("date")} />
          </div>
          <div>
            <label className="label" htmlFor="time">Time</label>
            <input id="time" type="time" className="input" required value={form.time} onChange={update("time")} />
          </div>
        </div>
        <div>
          <span className="label">Duration</span>
          <div className="flex items-center gap-2 text-sm">
            <select className="input w-20" value={form.hours} onChange={update("hours")} aria-label="Hours">
              {Array.from({ length: 25 }, (_, i) => <option key={i} value={i}>{i}</option>)}
            </select>
            hr
            <select className="input w-20" value={form.minutes} onChange={update("minutes")} aria-label="Minutes">
              {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            min
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-zoom-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-zoom-muted">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
