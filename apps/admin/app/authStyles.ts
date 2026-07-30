import { colors, elevation, radii, spacing, touch } from "@rwos/design-system";
import type { CSSProperties } from "react";

// Shared styles for the admin auth capsule (sign-in / sign-up), built from the design-system tokens so
// the pages match the rest of the administration workspace (navy + action teal on light surfaces).
export const authStyles: Record<string, CSSProperties> = {
  page: {
    background: colors.surface,
    color: colors.text,
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: "100vh",
    padding: "clamp(16px, 3vw, 32px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start"
  },
  card: {
    background: colors.surfaceRaised,
    border: `1px solid ${colors.border}`,
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
  title: { color: colors.navy, fontSize: 26, lineHeight: 1.15, margin: 0 },
  copy: { color: colors.muted, fontSize: 15, lineHeight: 1.55, margin: 0 },
  form: { display: "grid", gap: spacing.md },
  fieldLabel: {
    display: "grid",
    gap: spacing.xs,
    color: colors.text,
    fontSize: 14,
    fontWeight: 700
  },
  input: {
    border: `1px solid ${colors.border}`,
    borderRadius: radii.sm,
    padding: "0 12px",
    minHeight: touch.minimumTarget,
    fontSize: 15,
    background: colors.surfaceRaised,
    color: colors.text
  },
  primaryButton: {
    background: colors.actionTeal,
    border: 0,
    borderRadius: radii.sm,
    color: "white",
    fontWeight: 800,
    fontSize: 15,
    minHeight: touch.minimumTarget,
    padding: `0 ${spacing.xl}px`,
    cursor: "pointer"
  },
  secondaryButton: {
    background: colors.surfaceSubtle,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.sm,
    color: colors.navy,
    fontWeight: 700,
    fontSize: 14,
    minHeight: touch.minimumTarget,
    padding: `0 ${spacing.lg}px`,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    cursor: "pointer"
  },
  message: { color: colors.muted, fontSize: 14, lineHeight: 1.5, margin: 0 },
  warning: {
    color: colors.navy,
    background: colors.surfaceSubtle,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.sm,
    padding: 12,
    fontSize: 14,
    lineHeight: 1.5,
    margin: 0
  },
  actions: { display: "flex", gap: spacing.md, flexWrap: "wrap", alignItems: "center" }
};
