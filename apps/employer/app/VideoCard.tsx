"use client";

import { useEffect, useRef, useState } from "react";

// A short phone-shaped video that plays muted on a loop, like a social clip. Sound only plays when
// the visitor asks for it, and people who prefer less motion get the still image until they press play.
export function VideoCard({
  src,
  poster,
  label,
  soundLabel,
  muteLabel,
  playLabel,
  withSound = false
}: Readonly<{
  src: string;
  poster: string;
  label: string;
  soundLabel?: string;
  muteLabel?: string;
  playLabel?: string;
  withSound?: boolean;
}>) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    void video.play().then(() => setPaused(false)).catch(() => setPaused(true));
  }, []);

  const toggleSound = () => {
    const video = ref.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (video.paused) void video.play().then(() => setPaused(false)).catch(() => undefined);
  };

  const play = () => {
    void ref.current?.play().then(() => setPaused(false)).catch(() => undefined);
  };

  return (
    <figure className="video-card">
      <video
        ref={ref}
        aria-label={label}
        loop
        muted
        playsInline
        poster={poster}
        preload="metadata"
        src={src}
        onPause={() => setPaused(true)}
        onPlay={() => setPaused(false)}
      />
      {paused ? (
        <button className="video-card-play" type="button" onClick={play} aria-label={playLabel ?? "Play"}>
          ▶
        </button>
      ) : null}
      {withSound ? (
        <button className="video-card-sound" type="button" onClick={toggleSound} aria-pressed={!muted}>
          {muted ? `🔈 ${soundLabel ?? "Sound on"}` : `🔇 ${muteLabel ?? "Sound off"}`}
        </button>
      ) : null}
    </figure>
  );
}
