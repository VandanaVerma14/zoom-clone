"use client";

import { useEffect, useRef } from "react";

/**
 * Plays one other participant's microphone. Kept separate from the video tiles,
 * because a tile with the camera off has no <video> element, and the tiles remount
 * when the layout switches to screen-share view.
 */
export default function RemoteAudio({ stream }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay />;
}
