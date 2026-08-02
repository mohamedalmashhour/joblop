import type { CSSProperties } from "react";
import { colors, elevation, radii, spacing, statusColors, touch } from "@rwos/design-system";

const navy = colors.navy;
const teal = colors.actionTeal;
const surface = colors.surface;
const surfaceSubtle = colors.surfaceSubtle;
const border = colors.border;
const text = colors.text;
const muted = colors.muted;

export const baseButton: CSSProperties = {
  alignItems: "center",
  borderRadius: radii.sm,
  display: "inline-flex",
  fontSize: 15,
  fontWeight: 800,
  justifyContent: "center",
  minHeight: touch.minimumTarget,
  padding: `0 ${spacing.lg}px`,
  textDecoration: "none"
};

export const styles: Record<string, CSSProperties> = {
  page: {
    background: surface,
    color: text,
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: "100vh"
  },
  appFrame: {
    alignItems: "stretch",
    display: "flex",
    flexWrap: "wrap",
    minHeight: "100vh"
  },
  sidebarShell: {
    background: navy,
    color: "#ffffff",
    display: "grid",
    flex: "0 0 280px",
    gap: 20,
    gridTemplateRows: "auto 1fr auto",
    minHeight: "100vh",
    padding: 20
  },
  workspace: {
    background: surface,
    flex: "1 1 680px",
    minWidth: 0
  },
  header: {
    alignItems: "center",
    background: "rgba(255, 255, 255, 0.97)",
    borderBottom: `1px solid ${border}`,
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
    padding: "16px clamp(16px, 4vw, 40px)",
    position: "sticky",
    top: 0,
    zIndex: 5
  },
  brand: {
    alignItems: "center",
    color: "#ffffff",
    display: "inline-flex",
    fontSize: 20,
    fontWeight: 900,
    gap: 10,
    textDecoration: "none"
  },
  brandMark: {
    alignItems: "center",
    background: "#ffffff",
    borderRadius: radii.sm,
    color: navy,
    display: "inline-flex",
    fontSize: 12,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  nav: {
    alignContent: "start",
    display: "grid",
    gap: 8,
    maxHeight: "calc(100vh - 210px)",
    overflowY: "auto"
  },
  navLink: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: radii.sm,
    color: "#d6e5f8",
    display: "grid",
    fontSize: 13,
    fontWeight: 700,
    gap: 2,
    minHeight: 48,
    padding: "9px 10px",
    textDecoration: "none"
  },
  navLinkActive: {
    background: "#ffffff",
    border: "1px solid #ffffff",
    borderRadius: radii.sm,
    color: navy,
    display: "grid",
    fontSize: 13,
    fontWeight: 900,
    gap: 2,
    minHeight: 48,
    padding: "9px 10px",
    textDecoration: "none"
  },
  navPage: {
    color: "inherit",
    fontSize: 10,
    fontWeight: 900,
    opacity: 0.74,
    textTransform: "uppercase"
  },
  sidebarNote: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: radii.sm,
    color: "#d6e5f8",
    display: "grid",
    fontSize: 12,
    gap: 6,
    lineHeight: 1.45,
    padding: 14
  },
  topbarEyebrow: {
    color: muted,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    margin: 0,
    textTransform: "uppercase"
  },
  topbarTitle: {
    color: navy,
    display: "block",
    fontSize: 18,
    marginTop: 2
  },
  primaryButton: {
    ...baseButton,
    background: teal,
    boxShadow: "0 10px 24px rgba(15, 127, 120, 0.18)",
    color: "#ffffff"
  },
  secondaryButton: {
    ...baseButton,
    background: "#ffffff",
    border: `1px solid ${border}`,
    color: navy
  },
  disabledAction: {
    ...baseButton,
    background: statusColors.disabled.background,
    color: statusColors.disabled.foreground
  },
  hero: {
    background: `linear-gradient(135deg, ${navy} 0%, #082a66 100%)`,
    borderBottom: `1px solid ${border}`,
    color: "#ffffff",
    display: "grid",
    gap: 14,
    padding: "clamp(30px, 5vw, 56px) clamp(16px, 4vw, 40px)"
  },
  eyebrow: {
    color: "#fff8d8",
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: 0,
    margin: 0,
    textTransform: "uppercase"
  },
  eyebrowDark: {
    color: "#123b78",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    margin: 0,
    textTransform: "uppercase"
  },
  title: {
    fontSize: "clamp(34px, 5vw, 58px)",
    lineHeight: 1.04,
    margin: 0,
    maxWidth: 940
  },
  lede: {
    color: "#d6e5f8",
    fontSize: 18,
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 820
  },
  section: {
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  whiteSection: {
    background: "#ffffff",
    borderBottom: `1px solid ${border}`,
    borderTop: `1px solid ${border}`,
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  sectionHeader: {
    display: "grid",
    gap: 8,
    marginBottom: 18,
    maxWidth: 900
  },
  sectionTitle: {
    color: navy,
    fontSize: "clamp(26px, 4vw, 42px)",
    lineHeight: 1.12,
    margin: 0
  },
  sectionCopy: {
    color: muted,
    fontSize: 16,
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 780
  },
  twoColumn: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
  },
  cardGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
  },
  card: {
    background: "#ffffff",
    border: `1px solid ${border}`,
    borderRadius: radii.sm,
    boxShadow: elevation.raised,
    padding: 18
  },
  panel: {
    background: "#ffffff",
    border: `1px solid ${border}`,
    borderRadius: radii.md,
    boxShadow: elevation.raised,
    display: "grid",
    gap: 18,
    padding: "clamp(18px, 3vw, 28px)"
  },
  tintedCard: {
    background: surfaceSubtle,
    border: "1px solid #c9ddff",
    borderRadius: radii.sm,
    boxShadow: elevation.raised,
    padding: 18
  },
  cardTitle: {
    color: navy,
    fontSize: 18,
    margin: 0
  },
  cardText: {
    color: muted,
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.55,
    margin: "8px 0 0"
  },
  metaLabel: {
    color: "#123b78",
    display: "block",
    fontSize: 11,
    fontWeight: 900,
    marginBottom: 6,
    textTransform: "uppercase"
  },
  statusBadge: {
    alignItems: "center",
    background: "#eefbf6",
    border: "1px solid #9fd8bc",
    borderRadius: 999,
    color: "#0f5f54",
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 900,
    minHeight: 28,
    padding: "5px 10px"
  },
  statusBadgeWarning: {
    alignItems: "center",
    background: "#fff8d8",
    border: "1px solid #e8d782",
    borderRadius: 999,
    color: "#7a5200",
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 900,
    minHeight: 28,
    padding: "5px 10px"
  },
  actionBar: {
    alignItems: "center",
    background: surfaceSubtle,
    border: `1px solid ${border}`,
    borderRadius: radii.sm,
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
    padding: 12
  },
  controlBar: {
    alignItems: "end",
    background: surfaceSubtle,
    border: `1px solid ${border}`,
    borderRadius: radii.sm,
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    padding: 14
  },
  calendarCardMoney: {
    background: "#eefbf6",
    borderColor: "#9fd8bc"
  },
  calendarCardUrgent: {
    background: "#fff8d8",
    borderColor: "#e8d782"
  },
  calendarGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
    marginTop: 14
  },
  calendarMetric: {
    color: "#071f4d",
    display: "block",
    fontSize: 24,
    fontWeight: 900,
    marginTop: 4
  },
  calendarState: {
    background: "#ffffff",
    border: `1px solid ${border}`,
    borderRadius: 999,
    color: "#123b78",
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 900,
    marginTop: 10,
    padding: "5px 8px"
  },
  calendarTile: {
    background: "rgba(255,255,255,0.76)",
    border: `1px solid ${border}`,
    borderRadius: 8,
    color: "#0b1f3a",
    display: "block",
    minHeight: 142,
    padding: 12,
    textDecoration: "none"
  },
  pillGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))"
  },
  pill: {
    background: "#ffffff",
    border: `1px solid ${border}`,
    borderRadius: radii.sm,
    color: navy,
    fontWeight: 900,
    padding: 14
  },
  stepList: {
    display: "grid",
    gap: 10,
    margin: "16px 0 0",
    paddingLeft: 22
  },
  stepItem: {
    color: "#0b1f3a",
    fontWeight: 800,
    lineHeight: 1.45
  },
  formGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))"
  },
  fieldLabel: {
    color: "#0b1f3a",
    display: "grid",
    fontSize: 14,
    fontWeight: 800,
    gap: 6
  },
  input: {
    background: "#ffffff",
    border: `1px solid ${border}`,
    borderRadius: radii.sm,
    color: text,
    font: "inherit",
    minHeight: 44,
    padding: "0 12px"
  },
  routeGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))"
  },
  routeCard: {
    background: "#ffffff",
    border: `1px solid ${border}`,
    borderRadius: radii.sm,
    boxShadow: elevation.raised,
    display: "grid",
    gap: 10,
    padding: 16,
    textDecoration: "none"
  },
  routeStatus: {
    color: "#123b78",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase"
  },
  warning: {
    background: "#fff8d8",
    borderRadius: 8,
    color: "#071f4d",
    fontSize: 14,
    fontWeight: 900,
    lineHeight: 1.5,
    padding: 14
  },
  footer: {
    alignItems: "center",
    background: "#071f4d",
    color: "#ffffff",
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
    padding: "28px clamp(16px, 4vw, 40px)"
  },
  footerLinks: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12
  },
  footerLink: {
    alignItems: "center",
    color: "#ffffff",
    display: "inline-flex",
    fontWeight: 700,
    minHeight: 44,
    padding: "0 4px",
    textDecoration: "none"
  }
};
