import { colors, elevation, radii, spacing, touch } from "@rwos/design-system";
import type { CSSProperties } from "react";

// Shared styles for the admin auth capsule (sign-in / sign-up), built from the design-system tokens so
// the pages match the rest of the administration workspace (navy + action teal on light surfaces).
export const authStyles: Record<string, CSSProperties> = {
  page: {
    background: "#0c0c0c",
    color: "#f4efe4",
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: "100vh",
    padding: "clamp(16px, 3vw, 32px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start"
  },
  card: {
    background: "#141210",
    border: `1px solid ${"rgba(248, 184, 8, 0.16)"}`,
    borderRadius: radii.md,
    boxShadow: elevation.raised,
    padding: "clamp(20px, 4vw, 32px)",
    marginTop: 24,
    width: "min(100%, 460px)",
    display: "grid",
    gap: spacing.lg
  },
  eyebrow: {
    color: colors.actionTeal,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    margin: 0
  },
  title: { color: "#f4efe4", fontSize: 26, lineHeight: 1.15, margin: 0 },
  copy: { color: "#b3a894", fontSize: 15, lineHeight: 1.55, margin: 0 },
  form: { display: "grid", gap: spacing.md },
  fieldLabel: {
    display: "grid",
    // 8px between a label and its field so the label never looks glued to the box.
    gap: 8,
    color: "#f4efe4",
    fontSize: 14,
    fontWeight: 700
  },
  input: {
    border: `1px solid ${"rgba(248, 184, 8, 0.6)"}`,
    borderRadius: radii.sm,
    padding: "0 12px",
    minHeight: touch.minimumTarget,
    fontSize: 15,
    background: "#141210",
    color: "#f4efe4"
  },
  primaryButton: {
    background: colors.actionTeal,
    border: 0,
    borderRadius: radii.sm,
    // Black on gold: white on gold could not be read.
    color: "#000000",
    fontWeight: 800,
    fontSize: 15,
    minHeight: touch.minimumTarget,
    padding: `0 ${spacing.xl}px`,
    cursor: "pointer"
  },
  secondaryButton: {
    background: "#0a0a0a",
    border: `1px solid ${"rgba(248, 184, 8, 0.16)"}`,
    borderRadius: radii.sm,
    color: "#f4efe4",
    fontWeight: 700,
    fontSize: 14,
    minHeight: touch.minimumTarget,
    padding: `0 ${spacing.lg}px`,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    cursor: "pointer"
  },
  message: { color: "#b3a894", fontSize: 14, lineHeight: 1.5, margin: 0 },
  warning: {
    color: "#f4efe4",
    background: "#0a0a0a",
    border: `1px solid ${"rgba(248, 184, 8, 0.16)"}`,
    borderRadius: radii.sm,
    padding: 12,
    fontSize: 14,
    lineHeight: 1.5,
    margin: 0
  },
  actions: { display: "flex", gap: spacing.md, flexWrap: "wrap", alignItems: "center" },
  /** Text link: brand gold, underlined (never browser blue/purple). */
  inlineLink: { color: "#f8b808", fontWeight: 800, textDecoration: "underline", textUnderlineOffset: 3 }
};
