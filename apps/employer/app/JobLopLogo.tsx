import type { CSSProperties } from "react";

// The single Joblop brand logo, used everywhere. The owner-supplied artwork ("Joblop" wordmark —
// white letters + gold aperture "o"s on black) lives at /img/joblop-logo.png and is used as-is,
// background included. `showRabbit` is kept for call-site compatibility (no longer meaningful).
export function JobLopLogo({
  height = 34,
  showRabbit = true,
  style
}: {
  height?: number;
  showRabbit?: boolean;
  style?: CSSProperties;
}) {
  void showRabbit;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/img/joblop-logo.png"
      alt="Joblop"
      style={{ height, width: "auto", display: "block", borderRadius: 6, ...style }}
    />
  );
}
