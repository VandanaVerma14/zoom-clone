"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Manages this browser's camera, microphone and screen share.
 * Turning mic/camera off just disables the track (no new permission prompt when turning back on).
 */
export default function useLocalMedia({ audio = true, video = true } = {}) {
  const [stream, setStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [micOn, setMicOn] = useState(audio);
  const [camOn, setCamOn] = useState(video);
  const [error, setError] = useState("");
  const streamRef = useRef(null);
  const screenRef = useRef(null);
  const startedRef = useRef(false);

  const start = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser does not support camera access.");
      setMicOn(false);
      setCamOn(false);
      return;
    }
    // Try camera + mic, then fall back to only one of them.
    const attempts = [{ video: true, audio: true }, { audio: true }, { video: true }];
    for (const constraints of attempts) {
      try {
        const media = await navigator.mediaDevices.getUserMedia(constraints);
        media.getAudioTracks().forEach((t) => (t.enabled = audio));
        media.getVideoTracks().forEach((t) => (t.enabled = video));
        streamRef.current = media;
        setStream(media);
        if (!constraints.video) setCamOn(false);
        if (!constraints.audio) setMicOn(false);
        if (constraints !== attempts[0]) setError("Some devices are unavailable.");
        return;
      } catch {
        // try the next option
      }
    }
    setError("Camera and microphone are blocked or not found. You can still join.");
    setMicOn(false);
    setCamOn(false);
  }, [audio, video]);

  const setMic = useCallback((on) => {
    const tracks = streamRef.current?.getAudioTracks() || [];
    if (!tracks.length) return false;
    tracks.forEach((t) => (t.enabled = on));
    setMicOn(on);
    return true;
  }, []);

  const setCam = useCallback((on) => {
    const tracks = streamRef.current?.getVideoTracks() || [];
    if (!tracks.length) return false;
    tracks.forEach((t) => (t.enabled = on));
    setCamOn(on);
    return true;
  }, []);

  const stopShare = useCallback(() => {
    screenRef.current?.getTracks().forEach((t) => t.stop());
    screenRef.current = null;
    setScreenStream(null);
  }, []);

  const startShare = useCallback(async () => {
    try {
      const media = await navigator.mediaDevices.getDisplayMedia({ video: true });
      // When the user clicks the browser's own "Stop sharing" button
      media.getVideoTracks()[0].addEventListener("ended", stopShare);
      screenRef.current = media;
      setScreenStream(media);
      return true;
    } catch {
      return false; // user cancelled the picker
    }
  }, [stopShare]);

  const stopAll = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    stopShare();
  }, [stopShare]);

  // Release camera/mic when leaving the page
  useEffect(() => stopAll, [stopAll]);

  return { stream, screenStream, micOn, camOn, error, start, setMic, setCam, startShare, stopShare, stopAll };
}
