// @rwos/design-system — the SINGLE source of truth for the JobLop brand.
//
// One product, one soul. Every JobLop surface (worker, employer, admin web apps and the mobile
// app) themes from the tokens below so the whole platform reads as a single premium product
// instead of copy-pasted pages. The brand is deliberate and fixed:
//   • BLACK  — pure #000000 for every dark surface (see brand decision: joblop-brand-black).
//   • GOLD   — a warm gold scale (#f0d9a0 → #c9a24b → #b8862f → #9a7122) for action + accent.
//   • CREAM  — warm off-whites (#faf6ec / #fbf9f4 / #ffffff) for light surfaces.
//   • NO blue/teal anywhere. (Google #4285F4 is permitted only on a real Google sign-in button.)
//   • VOICE  — Playfair Display serif headings + Inter sans body, platform-wide.
//
// `brand`, `fonts`, `typeScale`, `shadows` and the `--jl-*` CSS variables are the current API.
// The legacy flat `colors` / `colorRoles` / `typographyRoles` exports are kept (and now carry the
// correct brand values) so existing consumers keep compiling while they migrate to `brand`.

// ---------------------------------------------------------------------------------------------
// 1. BRAND PALETTE (current API — use these names)
// ---------------------------------------------------------------------------------------------

export const brand = {
  // Dark surfaces — pure black and warm near-blacks.
  black: "#000000",
  ink: "#0c0c0c", // raised dark surface (cards/nav on black)
  charcoal: "#171511", // warm charcoal — primary text on light
  // Gold scale — light → deep.
  goldSoft: "#f0d9a0",
  gold: "#c9a24b", // primary accent
  goldStrong: "#b8862f", // primary action fill
  goldDeep: "#9a7122", // action hover / pressed
  goldText: "#7a5513", // readable gold-brown for text/icons on light chips (AA on cream)
  // Warm light surfaces.
  cream: "#faf6ec", // subtle page background
  creamRaised: "#fbf9f4", // panel background
  white: "#ffffff", // raised card
  creamContrast: "#fbf3dd", // gold-tinted fill (chips, soft badges)
  // Text + lines.
  text: "#171511",
  muted: "#6b6356",
  border: "#ece3d2",
  borderStrong: "#ddd0b6",
  // Semantic (separate from the gold accent).
  danger: "#b42323",
  success: "#176b47",
  warning: "#8a5100",
  focus: "#c9a24b",
  // Foreground that sits on gold / on black.
  onGold: "#000000",
  onBlack: "#faf6ec",
  // Google brand blue — ONLY ever for a genuine Google sign-in control.
  googleBlue: "#4285F4"
} as const;

// ---------------------------------------------------------------------------------------------
// 2. TYPOGRAPHY — two families, one voice
// ---------------------------------------------------------------------------------------------

export const fonts = {
  // Premium serif display — headings everywhere. `--font-serif` is set by each app's layout
  // (next/font), with these as the fallback stack.
  serif:
    'var(--font-serif, "Playfair Display"), Georgia, "Times New Roman", serif',
  // Clean sans — body everywhere.
  sans:
    'var(--font-sans, "Inter"), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
} as const;

// A real editorial type scale for the web. Headings use the serif; body/labels use the sans.
// Sizes use clamp() so they read well on phone and desktop. (Mobile/React Native uses the numeric
// `typography` / `typographyRoles` below instead, since RN has no clamp().)
export const typeScale = {
  display: {
    family: fonts.serif,
    fontSize: "clamp(2.5rem, 5.2vw, 4rem)",
    fontWeight: 800,
    lineHeight: 1.04,
    letterSpacing: "-0.015em"
  },
  h1: {
    family: fonts.serif,
    fontSize: "clamp(2rem, 4vw, 3rem)",
    fontWeight: 800,
    lineHeight: 1.08,
    letterSpacing: "-0.012em"
  },
  h2: {
    family: fonts.serif,
    fontSize: "clamp(1.5rem, 2.6vw, 2.125rem)",
    fontWeight: 800,
    lineHeight: 1.16,
    letterSpacing: "-0.01em"
  },
  h3: {
    family: fonts.serif,
    fontSize: "clamp(1.25rem, 1.8vw, 1.5rem)",
    fontWeight: 700,
    lineHeight: 1.22,
    letterSpacing: "-0.005em"
  },
  bodyLarge: {
    family: fonts.sans,
    fontSize: "1.125rem",
    fontWeight: 400,
    lineHeight: 1.6,
    letterSpacing: "0"
  },
  body: {
    family: fonts.sans,
    fontSize: "1rem",
    fontWeight: 400,
    lineHeight: 1.55,
    letterSpacing: "0"
  },
  small: {
    family: fonts.sans,
    fontSize: "0.875rem",
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: "0"
  },
  label: {
    family: fonts.sans,
    fontSize: "0.8125rem",
    fontWeight: 700,
    lineHeight: 1.4,
    letterSpacing: "0.01em"
  },
  eyebrow: {
    family: fonts.sans,
    fontSize: "0.75rem",
    fontWeight: 800,
    lineHeight: 1.3,
    letterSpacing: "0.09em",
    textTransform: "uppercase"
  }
} as const;

// ---------------------------------------------------------------------------------------------
// 3. SHADOWS / ELEVATION, MOTION
// ---------------------------------------------------------------------------------------------

export const shadows = {
  none: "none",
  xs: "0 1px 2px rgba(23, 21, 17, 0.06)",
  sm: "0 1px 2px rgba(23, 21, 17, 0.06), 0 1px 3px rgba(23, 21, 17, 0.08)",
  md: "0 4px 12px rgba(23, 21, 17, 0.08), 0 2px 4px rgba(23, 21, 17, 0.05)",
  lg: "0 12px 32px rgba(23, 21, 17, 0.12), 0 4px 8px rgba(23, 21, 17, 0.06)",
  gold: "0 8px 24px rgba(184, 134, 47, 0.28)"
} as const;

// ---------------------------------------------------------------------------------------------
// 4. LEGACY FLAT PALETTE (kept for compatibility — now carrying the correct brand values).
//    Prefer `brand` above. These names are retained only so existing consumers keep compiling.
// ---------------------------------------------------------------------------------------------

/** @deprecated Use `brand`. Legacy names retained for compatibility; values are brand-correct. */
export const colors = {
  deepTeal: brand.goldStrong,
  deepTealMuted: brand.goldDeep,
  actionTeal: brand.gold,
  actionTealMuted: brand.goldDeep,
  navy: brand.black,
  navyMuted: brand.ink,
  urgent: "#b66b00",
  cream: brand.creamContrast,
  surface: brand.creamRaised,
  surfaceSubtle: brand.cream,
  surfaceRaised: brand.white,
  border: brand.border,
  text: brand.text,
  muted: brand.muted,
  warning: brand.warning,
  danger: brand.danger,
  success: brand.success,
  focus: brand.focus
} as const;

export const colorRoles = {
  background: colors.surface,
  surface: colors.surfaceRaised,
  surfaceMuted: colors.surface,
  textPrimary: colors.text,
  textSecondary: colors.muted,
  borderDefault: colors.border,
  actionPrimary: colors.deepTeal,
  actionPrimaryHover: colors.deepTealMuted,
  actionAccent: colors.actionTeal,
  actionAccentHover: colors.actionTealMuted,
  actionSecondary: colors.cream,
  focusRing: colors.focus
} as const;

export const statusColors = {
  neutral: {
    background: "#f4efe3",
    border: brand.border,
    foreground: brand.goldText
  },
  informational: {
    background: "#f6efdc",
    border: "#e8d9b4",
    foreground: brand.goldText
  },
  success: {
    background: "#e7f6ed",
    border: "#9fd8bc",
    foreground: colors.success
  },
  warning: {
    background: "#fff1d6",
    border: "#e8d782",
    foreground: colors.warning
  },
  danger: {
    background: "#fde8e8",
    border: "#efb3b3",
    foreground: colors.danger
  },
  pending: {
    background: colors.cream,
    border: "#e8d782",
    foreground: colors.warning
  },
  disabled: {
    background: colors.border,
    border: colors.border,
    foreground: colors.muted
  },
  selected: {
    background: colors.deepTeal,
    border: colors.deepTeal,
    foreground: brand.onGold
  },
  restricted: {
    background: "#f3edf7",
    border: "#d7c6e6",
    foreground: "#5f3b76"
  }
} as const;

export const touch = {
  minimumTarget: 44,
  comfortableTarget: 56
} as const;

export const accessibilityThresholds = {
  normalTextContrast: 4.5,
  largeTextContrast: 3,
  nonTextContrast: 3,
  minimumTouchTarget: touch.minimumTarget
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999
} as const;

// Numeric type ramp — used by the React Native mobile app (no clamp()). Web uses `typeScale`.
export const typography = {
  title: 28,
  heading: 20,
  body: 16,
  small: 13,
  micro: 11
} as const;

export const typographyRoles = {
  displayTitle: {
    fontSize: 32,
    fontWeight: 800,
    lineHeight: 1.12
  },
  pageTitle: {
    fontSize: typography.title,
    fontWeight: 800,
    lineHeight: 1.16
  },
  sectionHeading: {
    fontSize: typography.heading,
    fontWeight: 700,
    lineHeight: 1.24
  },
  cardHeading: {
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1.28
  },
  body: {
    fontSize: typography.body,
    fontWeight: 400,
    lineHeight: 1.5
  },
  secondaryBody: {
    fontSize: typography.small,
    fontWeight: 400,
    lineHeight: 1.45
  },
  label: {
    fontSize: typography.small,
    fontWeight: 700,
    lineHeight: 1.35
  },
  helperText: {
    fontSize: typography.small,
    fontWeight: 400,
    lineHeight: 1.4
  },
  caption: {
    fontSize: typography.micro,
    fontWeight: 700,
    lineHeight: 1.3
  },
  tableText: {
    fontSize: typography.small,
    fontWeight: 600,
    lineHeight: 1.4
  },
  numericKpi: {
    fontSize: 24,
    fontVariantNumeric: "tabular-nums",
    fontWeight: 800,
    lineHeight: 1.18
  },
  monospaceReference: {
    fontFamily: fonts.mono,
    fontSize: typography.small,
    fontWeight: 600,
    lineHeight: 1.4
  }
} as const;

export const borders = {
  default: `1px solid ${colors.border}`,
  focus: `2px solid ${colors.focus}`,
  transparent: "1px solid transparent"
} as const;

export const elevation = {
  none: shadows.none,
  raised: shadows.sm,
  overlay: shadows.lg
} as const;

export const breakpoints = {
  smallMobile: 320,
  standardMobile: 375,
  tablet: 768,
  desktop: 1024,
  wideDesktop: 1440
} as const;

export const layout = {
  mobileGutter: spacing.lg,
  desktopGutter: 40,
  contentMaxWidth: 1180,
  tableMinWidth: 720,
  modalMaxWidth: 640,
  sidebarWidth: 280
} as const;

export const motion = {
  fast: "120ms",
  standard: "180ms",
  slow: "240ms",
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  reducedMotion: "reduce"
} as const;

export const componentStates = [
  "default",
  "hover",
  "active",
  "focus-visible",
  "selected",
  "disabled",
  "loading",
  "success",
  "warning",
  "error",
  "read-only"
] as const;

export const dataStates = [
  "loading",
  "empty",
  "error",
  "stale",
  "partial",
  "unavailable",
  "access-denied",
  "restricted"
] as const;

export const statusSemantics = {
  neutral: "Neutral status. Confirm the detailed state before acting.",
  informational: "Information only. This is not an approval.",
  success: "Authoritative success or completion state.",
  warning: "Pending, urgent, estimated, or human review required.",
  danger: "Error, failed, blocked, restricted, or unavailable state.",
  pending: "Awaiting review, response, or confirmation.",
  disabled: "Unavailable action or inactive control.",
  selected: "Selected option or current navigation item.",
  restricted: "Restricted visibility or permission-limited state."
} as const;

export const residentJobStatusDefinitions = {
  draft: {
    label: "Draft",
    tone: "neutral",
    meaning: "Saved but not submitted to an authoritative workflow."
  },
  open: {
    label: "Open",
    tone: "informational",
    meaning: "Visible for review or matching; not yet filled."
  },
  matching: {
    label: "Matching",
    tone: "informational",
    meaning: "Candidate matching is in progress. AI remains advisory."
  },
  workerAssigned: {
    label: "Worker assigned",
    tone: "success",
    meaning: "A governed assignment record exists."
  },
  confirmed: {
    label: "Confirmed",
    tone: "success",
    meaning: "The relevant human or authoritative workflow has confirmed the item."
  },
  workerEnRoute: {
    label: "Worker en route",
    tone: "informational",
    meaning: "Operational travel status only; attendance has not started."
  },
  arrived: {
    label: "Arrived",
    tone: "informational",
    meaning: "Arrival evidence or status exists; punch-in remains separate."
  },
  inProgress: {
    label: "In progress",
    tone: "informational",
    meaning: "The shift or workflow is currently active."
  },
  completed: {
    label: "Completed",
    tone: "success",
    meaning: "The operational activity has ended; downstream review may still be required."
  },
  awaitingApproval: {
    label: "Awaiting approval",
    tone: "pending",
    meaning: "Human review is required before the next authoritative state."
  },
  approved: {
    label: "Approved",
    tone: "success",
    meaning: "Human approval is recorded."
  },
  invoiceIssued: {
    label: "Invoice issued",
    tone: "informational",
    meaning: "Invoice exists; payment is separate."
  },
  paid: {
    label: "Paid",
    tone: "success",
    meaning: "Payment requires a real settlement reference before production use."
  },
  paymentFailed: {
    label: "Payment failed",
    tone: "danger",
    meaning: "Payment did not complete; workflow needs review or retry."
  },
  cancelled: {
    label: "Cancelled",
    tone: "disabled",
    meaning: "No longer active; historical record remains auditable."
  },
  disputed: {
    label: "Disputed",
    tone: "warning",
    meaning: "Human correction or support review is required."
  }
} as const;

// ---------------------------------------------------------------------------------------------
// 5. CSS VARIABLES
//    `jlCssVariables` / `createJoblopThemeBlock()` are the current web API (--jl-* namespace).
//    `cssVariables` / `createCssVariableBlock()` (--rj-* namespace) are kept for compatibility.
// ---------------------------------------------------------------------------------------------

export const jlCssVariables = {
  // Fonts (each app's layout overrides --font-serif / --font-sans with its next/font faces).
  "--jl-font-serif": fonts.serif,
  "--jl-font-sans": fonts.sans,
  "--jl-font-mono": fonts.mono,
  // Dark surfaces.
  "--jl-black": brand.black,
  "--jl-ink": brand.ink,
  // Gold scale.
  "--jl-gold-soft": brand.goldSoft,
  "--jl-gold": brand.gold,
  "--jl-gold-strong": brand.goldStrong,
  "--jl-gold-deep": brand.goldDeep,
  "--jl-gold-text": brand.goldText,
  // Light surfaces.
  "--jl-cream": brand.cream,
  "--jl-cream-raised": brand.creamRaised,
  "--jl-white": brand.white,
  "--jl-cream-contrast": brand.creamContrast,
  // Text + lines.
  "--jl-text": brand.text,
  "--jl-muted": brand.muted,
  "--jl-border": brand.border,
  "--jl-border-strong": brand.borderStrong,
  // Semantic.
  "--jl-danger": brand.danger,
  "--jl-success": brand.success,
  "--jl-warning": brand.warning,
  "--jl-focus": brand.focus,
  // Foreground on brand fills.
  "--jl-on-gold": brand.onGold,
  "--jl-on-black": brand.onBlack,
  // Spacing.
  "--jl-space-xs": `${spacing.xs}px`,
  "--jl-space-sm": `${spacing.sm}px`,
  "--jl-space-md": `${spacing.md}px`,
  "--jl-space-lg": `${spacing.lg}px`,
  "--jl-space-xl": `${spacing.xl}px`,
  "--jl-space-xxl": `${spacing.xxl}px`,
  // Radii.
  "--jl-radius-sm": `${radii.sm}px`,
  "--jl-radius-md": `${radii.md}px`,
  "--jl-radius-lg": `${radii.lg}px`,
  "--jl-radius-pill": `${radii.pill}px`,
  // Shadows.
  "--jl-shadow-xs": shadows.xs,
  "--jl-shadow-sm": shadows.sm,
  "--jl-shadow-md": shadows.md,
  "--jl-shadow-lg": shadows.lg,
  "--jl-shadow-gold": shadows.gold,
  // Motion.
  "--jl-motion-fast": motion.fast,
  "--jl-motion-standard": motion.standard,
  "--jl-motion-slow": motion.slow,
  "--jl-motion-easing": motion.easing,
  // Touch.
  "--jl-touch-minimum": `${touch.minimumTarget}px`,
  "--jl-touch-comfortable": `${touch.comfortableTarget}px`
} as const;

/** Render the brand token set as a CSS custom-property block (for a `:root { … }` rule). */
export function createJoblopThemeBlock() {
  return Object.entries(jlCssVariables)
    .map(([name, value]) => `${name}: ${value};`)
    .join("\n");
}

/** @deprecated Use `jlCssVariables`. Kept for compatibility. */
export const cssVariables = {
  "--rj-color-deep-teal": colors.deepTeal,
  "--rj-color-deep-teal-muted": colors.deepTealMuted,
  "--rj-color-cream": colors.cream,
  "--rj-color-surface": colors.surface,
  "--rj-color-surface-raised": colors.surfaceRaised,
  "--rj-color-border": colors.border,
  "--rj-color-text": colors.text,
  "--rj-color-muted": colors.muted,
  "--rj-color-warning": colors.warning,
  "--rj-color-danger": colors.danger,
  "--rj-color-success": colors.success,
  "--rj-color-focus": colors.focus,
  "--rj-spacing-xs": `${spacing.xs}px`,
  "--rj-spacing-sm": `${spacing.sm}px`,
  "--rj-spacing-md": `${spacing.md}px`,
  "--rj-spacing-lg": `${spacing.lg}px`,
  "--rj-spacing-xl": `${spacing.xl}px`,
  "--rj-spacing-xxl": `${spacing.xxl}px`,
  "--rj-radius-sm": `${radii.sm}px`,
  "--rj-radius-md": `${radii.md}px`,
  "--rj-radius-lg": `${radii.lg}px`,
  "--rj-radius-pill": `${radii.pill}px`,
  "--rj-touch-minimum": `${touch.minimumTarget}px`,
  "--rj-touch-comfortable": `${touch.comfortableTarget}px`
} as const;

/** @deprecated Use `createJoblopThemeBlock`. Kept for compatibility. */
export function createCssVariableBlock() {
  return Object.entries(cssVariables)
    .map(([name, value]) => `${name}: ${value};`)
    .join("\n");
}

// ---------------------------------------------------------------------------------------------
// 6. CONTRAST UTILITIES
// ---------------------------------------------------------------------------------------------

export function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hexColor: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hexColor)) {
    throw new Error("RJDS_CONTRAST_COLOR_INVALID");
  }
  const channels = hexColor
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    );
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}
