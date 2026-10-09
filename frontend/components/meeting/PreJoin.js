"use client";

import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useState } from "react";
import VideoTile from "./VideoTile";

/** Preview screen before entering: camera preview, mic/cam toggles and display name. */
export default function PreJoin({ meeting, media, defaultName, isHost, onJoin, joining, error }) {
  const [name, setName] = useState(defaultName || "");

  function handleSubmit(e) {
    e.preventDefault();
    if (name.trim()) onJoin(name.trim());
  }

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-4 text-white">
      <form onSubmit={handleSubmit} className="my-auto w-full max-w-xl space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-bold sm:text-2xl">{meeting.title}</h1>
          <p className="mt-1 text-sm text-white/60">{isHost ? "You are the host of this meeting" : "Get ready to join"}</p>
        </div>

        <div className="aspect-video w-full">
          <VideoTile name={name || "You"} stream={media.stream} videoOn={media.camOn} muted={!media.micOn} isSelf />
        </div>

        <div className="flex justify-center gap-3">
          <RoundToggle on={media.micOn} onClick={() => media.setMic(!media.micOn)} onIcon={Mic} offIcon={MicOff} label="microphone" />
          <RoundToggle on={media.camOn} onClick={() => media.setCam(!media.camOn)} onIcon={Video} offIcon={VideoOff} label="camera" />
        </div>
        {media.error && <p className="text-center text-sm text-yellow-400">{media.error}</p>}

        <div className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
          <input
            className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-zoom-blue"
            placeholder="Enter your name"
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={!name.trim() || joining} className="btn-primary px-8 py-2.5">
            {joining ? "Joining..." : "Join"}
          </button>
        </div>
        {error && <p className="text-center text-sm text-red-400">{error}</p>}
      </form>
    </div>
  );
}

function RoundToggle({ on, onClick, onIcon: OnIcon, offIcon: OffIcon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Turn ${on ? "off" : "on"} ${label}`}
      className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
        on ? "bg-white/15 hover:bg-white/25" : "bg-zoom-danger hover:bg-red-700"
      }`}
    >
      {on ? <OnIcon size={20} /> : <OffIcon size={20} />}
    </button>
  );
}
