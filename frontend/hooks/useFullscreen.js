"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Puts one element (not the whole page) into the browser's real fullscreen mode.
 *
 * - enter(): element.requestFullscreen(). Only that element is shown, filling the screen,
 *   and the browser itself shows the "press Esc to exit" hint.
 * - exit(): document.exitFullscreen().
 * - The user can also leave with Esc, which bypasses our code, so we listen to the
 *   "fullscreenchange" event (fired on every enter/exit) to keep isFullscreen correct.
 * - isSupported is false where elements can't go fullscreen (e.g. iPhone Safari).
 */
export default function useFullscreen(ref) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Checked after mount: `document` doesn't exist during server rendering
    setIsSupported(Boolean(document.fullscreenEnabled && ref.current?.requestFullscreen));

    const onChange = () => setIsFullscreen(Boolean(ref.current) && document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [ref]);

  const enter = useCallback(() => {
    ref.current?.requestFullscreen?.().catch(() => {});
  }, [ref]);

  const exit = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  return { isFullscreen, isSupported, enter, exit };
}
