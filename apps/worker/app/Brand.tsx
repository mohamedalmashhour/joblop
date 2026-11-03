import type { CSSProperties, ReactNode } from "react";

// Inline "Joblop" wordmark that matches the logo: brand letters with gold aperture "o"s and a gentle
// gold pulse, so the name reads as the brand everywhere it appears in copy. Pure/presentational (no
// hooks) so it renders inside both server and client components. Use <Brand/> for the bare wordmark,
// or withBrand(text) to swap every literal "Joblop" inside an already-translated string.
export function Brand({ style }: { style?: CSSProperties }) {
  return (
    <span className="brandword" aria-label="Joblop" style={style}>
      {"Joblop".split("").map((ch, i) =>
        ch === "o" ? (
          <span key={i} aria-hidden="true" className="brandword-o">
            o
          </span>
        ) : (
          <span key={i} aria-hidden="true">
            {ch}
          </span>
        )
      )}
    </span>
  );
}

// Splits a translated string on "Joblop" and renders each occurrence as the animated <Brand/>
// wordmark. Returns the plain string unchanged when the brand name is absent.
export function withBrand(text: string): ReactNode {
  const parts = text.split("Joblop");
  if (parts.length === 1) return text;
  const nodes: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part) nodes.push(part);
    if (i < parts.length - 1) nodes.push(<Brand key={`b${i}`} />);
  });
  return nodes;
}
