// JobLop brand mark — the app icon as a crisp, scalable SVG: blue rounded-square badge, a white
// briefcase whose body sweeps into a "J", and an upward arrow (growth). Shared across the platform.
export function JobLopMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ flex: "0 0 auto", display: "block" }}>
      <defs>
        <linearGradient id="jlmk-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b6cf0" />
          <stop offset="1" stopColor="#1546c8" />
        </linearGradient>
        <linearGradient id="jlmk-ar" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2b6cf0" />
          <stop offset="1" stopColor="#58c6ff" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#jlmk-bg)" />
      <path d="M26 17a6 6 0 0 1 12 0v4h-4v-4a2 2 0 0 0-4 0v4h-4z" fill="#fff" />
      <path d="M21 23h22a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6v-6h-4v14a9 9 0 0 1-18 0 3 3 0 0 1 6 0 3 3 0 0 0 6 0V25a2 2 0 0 1 2-2z" fill="#fff" />
      <rect x="34" y="28" width="7" height="6" rx="2" fill="#2b6cf0" />
      <path d="M24 48c6-1 12-6 16-12l3 3 2-11-11 2 3 3c-3 5-9 10-16 11z" fill="url(#jlmk-ar)" />
    </svg>
  );
}
