import type { CSSProperties } from "react";

// JobLop brand lockup: the app-icon mark (blue badge, white briefcase-J, up arrow) beside the
// wordmark — charcoal "Job", blue "Lop". Pure SVG — sharp at any size, tiny file. The `showRabbit`
// prop (kept for call-site compatibility) now toggles the app-icon mark.
export function JobLopLogo({
  height = 34,
  showRabbit = true,
  style
}: {
  height?: number;
  showRabbit?: boolean;
  style?: CSSProperties;
}) {
  const markOn = showRabbit;
  return (
    <svg
      viewBox="0 0 320 96"
      height={height}
      role="img"
      aria-label="JobLop"
      style={{ display: "block", ...style }}
    >
      {markOn ? <AppIconMark transform="translate(2 8) scale(1.25)" /> : null}
      <text
        x={markOn ? 96 : 0}
        y="70"
        fontFamily='-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        fontSize="72"
        fontWeight="800"
        letterSpacing="-2"
      >
        <tspan fill="#173a86">Job</tspan>
        <tspan fill="#2563eb">Lop</tspan>
      </text>
    </svg>
  );
}

// The app icon in a 64x64 local box: blue rounded-square badge, white briefcase whose body sweeps
// into a "J", and an upward arrow.
function AppIconMark({ transform }: { transform?: string }) {
  return (
    <g transform={transform}>
      <defs>
        <linearGradient id="jllogo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b6cf0" />
          <stop offset="1" stopColor="#1546c8" />
        </linearGradient>
        <linearGradient id="jllogo-ar" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2b6cf0" />
          <stop offset="1" stopColor="#58c6ff" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#jllogo-bg)" />
      <path d="M26 17a6 6 0 0 1 12 0v4h-4v-4a2 2 0 0 0-4 0v4h-4z" fill="#fff" />
      <path d="M21 23h22a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6v-6h-4v14a9 9 0 0 1-18 0 3 3 0 0 1 6 0 3 3 0 0 0 6 0V25a2 2 0 0 1 2-2z" fill="#fff" />
      <rect x="34" y="28" width="7" height="6" rx="2" fill="#2b6cf0" />
      <path d="M24 48c6-1 12-6 16-12l3 3 2-11-11 2 3 3c-3 5-9 10-16 11z" fill="url(#jllogo-ar)" />
    </g>
  );
}
