import type { CSSProperties } from "react";
import { colors, elevation, radii, spacing, statusColors, touch } from "@rwos/design-system";

// Dark-first workspace: black canvas, dark-raised panels, cream text, gold accent + hairline.
const navy = colors.navy; // #000000 brand black (dark panels)
const teal = colors.actionTeal; // gold accent
const surface = "#0c0c0c"; // dark-raised panel
const surfaceSubtle = "#141210"; // slightly higher raise
const border = "rgba(201, 162, 75, 0.16)"; // gold hairline
const text = "#f4efe4"; // cream body
const muted = "#b3a894"; // warm secondary

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
    // No forced 100vh: on a flex row it stretches to the workspace height anyway; forcing it full
    // height pushed the workspace a whole screen down whenever the row wrapped (narrow/tablet),
    // leaving the employer looking at a blank page.
    padding: 20
  },
  workspace: {
    background: surface,
    // A smaller flex-basis so the workspace sits BESIDE the 280px sidebar at tablet/pane widths
    // instead of wrapping below it; it still stacks under the sidebar on true mobile.
    flex: "1 1 360px",
    minWidth: 0
  },
  stagingBanner: {
    alignItems: "center",
    background: "#0c0c0c",
    borderBottom: "2px solid #e8d782",
    color: "#5f4000",
    display: "flex",
    flexWrap: "wrap",
    fontSize: 12,
    fontWeight: 900,
    gap: 12,
    justifyContent: "center",
    letterSpacing: 0.3,
    minHeight: 44,
    padding: "8px clamp(16px, 4vw, 40px)"
  },
  header: {
    alignItems: "center",
    background: "rgba(0, 0, 0, 0.72)",
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
    background: "#000000",
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
    color: "#f0e8d8",
    display: "grid",
    fontSize: 13,
    fontWeight: 700,
    gap: 2,
    minHeight: 48,
    padding: "9px 10px",
    textDecoration: "none"
  },
  navLinkActive: {
    background: "#000000",
    border: "1px solid rgba(201, 162, 75, 0.16)",
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
    color: "#f0e8d8",
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
    background: "#000000",
    border: `1px solid ${border}`,
    color: navy
  },
  disabledAction: {
    ...baseButton,
    background: statusColors.disabled.background,
    color: statusColors.disabled.foreground
  },
  hero: {
    background: `linear-gradient(135deg, ${navy} 0%, #2a2114 100%)`,
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
    color: "#f4efe4",
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
    color: "#f0e8d8",
    fontSize: 18,
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 820
  },
  section: {
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  whiteSection: {
    background: "#000000",
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
    background: "#000000",
    border: `1px solid ${border}`,
    borderRadius: radii.sm,
    boxShadow: elevation.raised,
    padding: 18
  },
  panel: {
    background: "#000000",
    border: `1px solid ${border}`,
    borderRadius: radii.md,
    boxShadow: elevation.raised,
    display: "grid",
    gap: 18,
    padding: "clamp(18px, 3vw, 28px)"
  },
  tintedCard: {
    background: surfaceSubtle,
    border: "1px solid rgba(201, 162, 75, 0.16)",
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
    color: "#f4efe4",
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
    color: "#f4efe4",
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 900,
    minHeight: 28,
    padding: "5px 10px"
  },
  statusBadgeWarning: {
    alignItems: "center",
    background: "#0c0c0c",
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
    background: "#0c0c0c",
    borderColor: "#e8d782"
  },
  calendarGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
    marginTop: 14
  },
  calendarMetric: {
    color: "#f4efe4",
    display: "block",
    fontSize: 24,
    fontWeight: 900,
    marginTop: 4
  },
  calendarState: {
    background: "#000000",
    border: `1px solid ${border}`,
    borderRadius: 999,
    color: "#f4efe4",
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
    color: "#f4efe4",
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
    background: "#000000",
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
    color: "#f4efe4",
    fontWeight: 800,
    lineHeight: 1.45
  },
  formGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))"
  },
  fieldLabel: {
    color: "#f4efe4",
    display: "grid",
    fontSize: 14,
    fontWeight: 800,
    gap: 6
  },
  input: {
    background: "#000000",
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
    background: "#000000",
    border: `1px solid ${border}`,
    borderRadius: radii.sm,
    boxShadow: elevation.raised,
    display: "grid",
    gap: 10,
    padding: 16,
    textDecoration: "none"
  },
  routeStatus: {
    color: "#f4efe4",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase"
  },
  warning: {
    background: "#0c0c0c",
    borderRadius: 8,
    color: "#f4efe4",
    fontSize: 14,
    fontWeight: 900,
    lineHeight: 1.5,
    padding: 14
  },
  footer: {
    alignItems: "center",
    background: "#1b160e",
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
