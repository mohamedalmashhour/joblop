import type { CSSProperties } from "react";

export const baseButton: CSSProperties = {
  alignItems: "center",
  borderRadius: 8,
  display: "inline-flex",
  fontSize: 15,
  fontWeight: 800,
  justifyContent: "center",
  minHeight: 44,
  padding: "0 16px",
  textDecoration: "none"
};

export const styles: Record<string, CSSProperties> = {
  page: {
    background: "#f7faf9",
    color: "#0b1f3a",
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: "100vh"
  },
  header: {
    alignItems: "center",
    background: "#ffffff",
    borderBottom: "1px solid #dce8e8",
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
    padding: "18px clamp(16px, 4vw, 40px)",
    position: "sticky",
    top: 0,
    zIndex: 1
  },
  brand: {
    color: "#071f4d",
    fontSize: 20,
    fontWeight: 900,
    textDecoration: "none"
  },
  nav: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 14
  },
  navLink: {
    color: "#0b1f3a",
    fontSize: 14,
    fontWeight: 700,
    textDecoration: "none"
  },
  primaryButton: {
    ...baseButton,
    background: "#071f4d",
    color: "#ffffff"
  },
  secondaryButton: {
    ...baseButton,
    background: "#fff8d8",
    color: "#071f4d"
  },
  disabledAction: {
    ...baseButton,
    background: "#dce8e8",
    color: "#071f4d"
  },
  hero: {
    background: "#071f4d",
    color: "#ffffff",
    display: "grid",
    gap: 14,
    padding: "clamp(34px, 7vw, 72px) clamp(16px, 4vw, 40px)"
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
    color: "#dce8e8",
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
    borderBottom: "1px solid #dce8e8",
    borderTop: "1px solid #dce8e8",
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  sectionHeader: {
    display: "grid",
    gap: 8,
    marginBottom: 18,
    maxWidth: 900
  },
  sectionTitle: {
    color: "#071f4d",
    fontSize: "clamp(26px, 4vw, 42px)",
    lineHeight: 1.12,
    margin: 0
  },
  sectionCopy: {
    color: "#607276",
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
    border: "1px solid #dce8e8",
    borderRadius: 8,
    padding: 18
  },
  tintedCard: {
    background: "#eef4ff",
    border: "1px solid #bfd0f5",
    borderRadius: 8,
    padding: 18
  },
  cardTitle: {
    color: "#071f4d",
    fontSize: 18,
    margin: 0
  },
  cardText: {
    color: "#607276",
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.55,
    margin: "8px 0 0"
  },
  calendarCardMoney: {
    background: "#f0fff8",
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
    border: "1px solid #dce8e8",
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
    border: "1px solid #dce8e8",
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
    border: "1px solid #dce8e8",
    borderRadius: 8,
    color: "#071f4d",
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
    border: "1px solid #bccdce",
    borderRadius: 8,
    color: "#0b1f3a",
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
    border: "1px solid #dce8e8",
    borderRadius: 8,
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
    color: "#ffffff",
    fontWeight: 700,
    textDecoration: "none"
  }
};
