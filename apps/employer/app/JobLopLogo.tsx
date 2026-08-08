import type { CSSProperties } from "react";

// Clean, watermark-free JobLop wordmark: charcoal "Job", navy "Lop", and an
// orange bunny beside it. Pure SVG — sharp at any size, tiny file.
export function JobLopLogo({
  height = 34,
  showRabbit = true,
  style
}: {
  height?: number;
  showRabbit?: boolean;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 300 96"
      height={height}
      role="img"
      aria-label="JobLop"
      style={{ display: "block", ...style }}
    >
      <text
        x="0"
        y="70"
        fontFamily='-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        fontSize="72"
        fontWeight="800"
        letterSpacing="-2"
      >
        <tspan fill="#173a86">Job</tspan>
        <tspan fill="#173a86">Lop</tspan>
      </text>
      {showRabbit ? <BunnyMark transform="translate(236 18) scale(0.72)" /> : null}
    </svg>
  );
}

// Front-facing sitting bunny in a ~64x76 local box. Tall ears make it read small.
function BunnyMark({ transform }: { transform?: string }) {
  return (
    <g transform={transform}>
      <g fill="#e8641c">
        {/* ears */}
        <ellipse cx="25" cy="15" rx="6" ry="16" transform="rotate(-11 25 15)" />
        <ellipse cx="40" cy="14" rx="6" ry="16" transform="rotate(11 40 14)" />
        {/* body */}
        <ellipse cx="32" cy="54" rx="21" ry="19" />
        {/* head */}
        <circle cx="32" cy="33" r="15" />
        {/* front feet */}
        <ellipse cx="23" cy="71" rx="7" ry="4.5" />
        <ellipse cx="41" cy="71" rx="7" ry="4.5" />
      </g>
      {/* inner ears */}
      <ellipse cx="25" cy="16" rx="2.6" ry="9" transform="rotate(-11 25 16)" fill="#ffb98c" />
      <ellipse cx="40" cy="15" rx="2.6" ry="9" transform="rotate(11 40 15)" fill="#ffb98c" />
      {/* eyes + nose */}
      <circle cx="27" cy="31" r="1.9" fill="#ffffff" />
      <circle cx="37" cy="31" r="1.9" fill="#ffffff" />
      <circle cx="32" cy="37" r="1.7" fill="#7a2f0c" />
    </g>
  );
}
