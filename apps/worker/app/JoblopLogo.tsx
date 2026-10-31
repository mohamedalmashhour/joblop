// The single JobLop brand logo, used everywhere. The owner-supplied artwork ("Joblop" wordmark —
// white letters + gold aperture "o"s on black) lives at /img/joblop-logo.png and is used as-is,
// background included, so the mark is identical across every surface.
export function JoblopLogo({ height = 28 }: { height?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/img/joblop-logo.png"
      alt="JobLop"
      style={{ height, width: "auto", display: "block", borderRadius: 6 }}
    />
  );
}
