export const colors = {
  deepTeal: "#071f4d",
  deepTealMuted: "#123b78",
  actionTeal: "#0f7f78",
  actionTealMuted: "#0b655f",
  navy: "#071f4d",
  navyMuted: "#123b78",
  urgent: "#b66b00",
  cream: "#fff8d8",
  surface: "#f7faff",
  surfaceSubtle: "#eef5ff",
  surfaceRaised: "#ffffff",
  border: "#d8e4f5",
  text: "#0b1f3a",
  muted: "#526782",
  warning: "#b66b00",
  danger: "#c93434",
  success: "#1f8f5f",
  focus: "#0d6efd"
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
    background: "#eef5f5",
    border: colors.border,
    foreground: colors.deepTeal
  },
  informational: {
    background: "#eef4ff",
    border: "#bfd0f5",
    foreground: colors.deepTealMuted
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
    foreground: colors.surfaceRaised
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
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
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
  none: "none",
  raised: "0 1px 2px rgba(11, 31, 58, 0.08)",
  overlay: "0 18px 48px rgba(11, 31, 58, 0.18)"
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

export function createCssVariableBlock() {
  return Object.entries(cssVariables)
    .map(([name, value]) => `${name}: ${value};`)
    .join("\n");
}
