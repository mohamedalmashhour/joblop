// Joblop mobile — DARK-FIRST theme.
//
// The platform is one continuous black canvas (brand decision: joblop-brand-black). The web apps
// drive this through CSS variables; React Native has no CSS vars, so the mobile app themes from
// this module instead. We keep the exact token *names* the screens already use (the legacy
// `colors` shape from @rwos/design-system) and only remap the VALUES to the dark-first brand, so
// no screen has to change how it reads a color. Layout tokens (spacing/radii/typography/touch) are
// theme-agnostic and re-exported from the design system unchanged.
//
// Brand palette (fixed):
//   • BLACK  pure #000000 base, warm near-blacks for raised panels
//   • GOLD   #c9a24b accent / #b8862f action fill — used sparingly (CTAs, numbers, active state)
//   • CREAM  #f4efe4 body text on black
//   • NO blue/teal anywhere.
export { spacing, radii, typography, touch } from "@rwos/design-system";

/**
 * Dark-first color tokens. Same keys as the design system's legacy `colors` export, remapped to
 * the black/gold/cream brand so every mobile surface reads as one premium dark product.
 */
export const colors = {
  // Action + accent (gold). Used both as CTA fills and as emphasis text; gold reads well on black
  // and dark text reads well on a gold fill.
  deepTeal: "#c9a24b",
  deepTealMuted: "#b8862f",
  actionTeal: "#c9a24b",

  // Dark surfaces.
  navy: "#000000",
  surfaceSubtle: "#000000", // page background — the continuous black canvas
  surface: "#0c0c0c", // raised dark surface (nav, headers, sections)
  surfaceRaised: "#141210", // cards / panels on black
  cream: "#1b160d", // warm gold-tinted dark fill (chips, soft badges)

  // Text + hairlines.
  text: "#f4efe4", // cream body text
  muted: "#9b9281", // warm muted text, readable on black
  border: "rgba(201, 162, 75, 0.16)", // thin gold hairline

  // Status (brightened for legibility on black; used sparingly).
  urgent: "#e0953a",
  warning: "#e0a640",
  danger: "#e4756b",
  success: "#6bbf8a",
  focus: "#f0d9a0"
} as const;
