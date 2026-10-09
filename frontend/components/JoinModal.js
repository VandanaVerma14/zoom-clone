"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { parseMeetingInput } from "@/lib/format";
import Modal from "./Modal";

/** "Join Meeting" popup: meeting ID or link + display name, validated before redirecting. */
export default function JoinModal({ defaultName, onClose }) {
  const router = useRouter();
  const [meetingInput, setMeetingInput] = useState("");
  const [name, setName] = useState(defaultName || "");
  const [noAudio, setNoAudio] = useState(false);
  const [noVideo, setNoVideo] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const code = parseMeetingInput(meetingInput);
    if (!code) return setError("Please enter a valid meeting ID or invite link.");
    if (!name.trim()) return setError("Please enter your name.");

    setLoading(true);
    try {
      const meeting = await api.getMeeting(code); // validates that the meeting exists
      if (meeting.status === "ended") throw new Error("This meeting has already ended.");
      const params = new URLSearchParams({ name: name.trim() });
      if (noAudio) params.set("audio", "0");
      if (noVideo) params.set("video", "0");
      router.push(`/meeting/${code}?${params}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <Modal title="Join Meeting" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="meeting-id">Meeting ID or invite link</label>
          <input
            id="meeting-id"
            autoFocus
            className="input"
            placeholder="e.g. 812 345 6789"
            value={meetingInput}
            onChange={(e) => setMeetingInput(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="display-name">Your name</label>
          <input id="display-name" className="input" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-2 text-sm">
          <Checkbox checked={noAudio} onChange={setNoAudio} label="Don't connect to audio" />
          <Checkbox checked={noVideo} onChange={setNoVideo} label="Turn off my video" />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-zoom-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={!meetingInput.trim() || loading} className="btn-primary">
            {loading ? "Checking..." : "Join"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-zoom-blue"
      />
      {label}
    </label>
  );
}
