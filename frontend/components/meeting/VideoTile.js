"use client";

import { MicOff } from "lucide-react";
import { useEffect, useRef } from "react";
import Avatar from "../Avatar";

/**
 * One person's box in the meeting grid.
 * Shows live video if a stream is given and the camera is on. Otherwise their initials,
 * or (bigName, used for the main tile) their name in large text, like Zoom.
 * `small` tiles (the strips beside the main stage) get a smaller avatar so it clears the name chip.
 */
export default function VideoTile({ name, stream, videoOn, muted, isSelf, isHost, mirror = true, fit = "cover", bigName = false, small = false }) {
  const videoRef = useRef(null);
  const showVideo = Boolean(stream && videoOn);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream, showVideo]);

  let placeholder = <Avatar name={name} size={small ? 40 : 72} className={small ? "-mt-6" : ""} />;
  if (bigName) {
    placeholder = <span className="max-w-[90%] break-words px-4 text-center text-[clamp(2.5rem,9vw,9rem)] font-bold leading-tight text-white">{name}</span>;
  }

  return (
    <div
      className={`relative flex h-full min-h-[90px] w-full items-center justify-center overflow-hidden rounded-xl ${
        bigName ? "bg-transparent" : "bg-[#2A2A2A]"
      }`}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted // never play our own audio back to ourselves
          className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"} ${
            isSelf && mirror ? "-scale-x-100" : ""
          }`}
        />
      ) : (
        placeholder
      )}

      <div className="absolute bottom-2 left-2 flex max-w-[90%] items-center gap-1.5 rounded-md bg-[#2A2D32]/90 px-2 py-0.5 text-[13px] text-white">
        {muted && <MicOff size={13} className="shrink-0 text-[#E8364B]" />}
        <span className="truncate">
          {name}
          {(isHost || isSelf) && (
            <span className="text-gray-400"> ({[isHost && "Host", isSelf && "me"].filter(Boolean).join(", ")})</span>
          )}
        </span>
      </div>
    </div>
  );
}
