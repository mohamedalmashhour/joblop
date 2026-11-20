"use client";

import { useState } from "react";
import {
  adminAiRecommendation,
  adminCalendarBoundaries,
  adminCalendarEvent,
  adminReviewActions,
  adminReviewChecks
} from "./adminCalendarContent";
import { usePageText } from "../i18n/pageText";
import { calendarText } from "./text";

export function AdminReviewPanel() {
  const text = usePageText(calendarText);
  const t = text.fixtureReview;
  const [localDecision, setLocalDecision] = useState<(typeof adminReviewActions)[number] | null>(null);

  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>{t.eyebrow}</p>
          <h1 style={styles.title}>{t.title}</h1>
          <p style={styles.lede}>{t.lede}</p>
        </div>
        <a href="/calendar" style={styles.secondaryButton}>
          {t.back}
        </a>
      </header>

      <section style={styles.grid}>
        <article style={styles.panel}>
          <p style={styles.eyebrowDark}>{t.requiredReview}</p>
          <h2 style={styles.h2}>{adminCalendarEvent.roleLabel}</h2>
          {adminReviewChecks.map((check) => (
            <div key={check.label} style={styles.row}>
              <strong>{check.label}</strong>
              <span>{check.status}</span>
            </div>
          ))}
          <div style={styles.mapPlaceholder}>{t.mapPlaceholder}</div>
        </article>

        <article style={styles.panel}>
          <p style={styles.eyebrowDark}>{t.economicsSeparation}</p>
          <div style={styles.economicsCard}>
            <h2 style={styles.h2}>{t.clientEconomics}</h2>
            <p>{t.billRate}</p>
            <p>{t.terms(adminCalendarEvent.clientEconomics.termsVersion)}</p>
          </div>
          <div style={styles.economicsCard}>
            <h2 style={styles.h2}>{t.workerEconomics}</h2>
            <p>{t.workerWage}</p>
            <p>{t.transportation}</p>
            <p>{t.terms(adminCalendarEvent.workerOfferEconomics.termsVersion)}</p>
          </div>
        </article>
      </section>

      <section style={styles.grid}>
        <article style={styles.panel}>
          <p style={styles.eyebrowDark}>{t.localControls}</p>
          <h2 style={styles.h2}>{t.decisionPreview}</h2>
          <p aria-live="polite" style={styles.localState}>
            {localDecision ? t.selectedLocally(t.actions[localDecision]) : t.noAction}
          </p>
          <div style={styles.actionGrid}>
            {adminReviewActions.map((action) => (
              <button
                key={action}
                onClick={() => setLocalDecision(action)}
                style={styles.actionButton}
                type="button"
              >
                {t.actions[action]}
              </button>
            ))}
          </div>
          <a href="/calendar/assignment" style={styles.assignmentLink}>
            {t.openAssignment}
          </a>
        </article>

        <article style={styles.advisoryPanel}>
          <p style={styles.eyebrowDark}>{t.aiFixture}</p>
          <h2 style={styles.h2}>{adminAiRecommendation.title}</h2>
          <p>{adminAiRecommendation.recommendation}</p>
          <p><strong>{t.evidence}</strong> {adminAiRecommendation.evidence}</p>
          <p><strong>{t.uncertainty}</strong> {adminAiRecommendation.uncertainty}</p>
          <p><strong>{t.requiredDecision}</strong> {adminAiRecommendation.requiredDecision}</p>
        </article>
      </section>

      <section style={styles.boundaryGrid}>
        {adminCalendarBoundaries.map((boundary, index) => (
          <article key={boundary} style={styles.boundaryCard}>
            {text.boundaries[index] ?? boundary}
          </article>
        ))}
      </section>
    </main>
  );
}

const styles = {
  page: { background: "#000000", color: "#f4efe4", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  hero: { alignItems: "center", background: "#000000", color: "#fff", display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between", padding: "40px clamp(18px, 5vw, 64px)" },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  eyebrowDark: { color: "#f4efe4", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(34px, 5vw, 56px)", margin: "8px 0" },
  lede: { color: "#faf6ec", fontSize: 18, lineHeight: 1.6, maxWidth: 760 },
  h2: { color: "#f4efe4", fontSize: 25, margin: "6px 0 14px" },
  grid: { display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", padding: "24px clamp(18px, 5vw, 64px) 0" },
  panel: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 14, boxShadow: "0 12px 30px rgba(0,0,0,.4)", padding: 24 },
  advisoryPanel: { background: "#edf8f5", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 14, padding: 24 },
  row: { alignItems: "center", borderBottom: "1px solid rgba(248, 184, 8, 0.16)", display: "flex", gap: 12, justifyContent: "space-between", padding: "12px 0" },
  economicsCard: { background: "#000000", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 10, marginTop: 12, padding: 18 },
  mapPlaceholder: { background: "#000000", border: "1px dashed rgba(248, 184, 8, 0.16)", borderRadius: 10, marginTop: 18, padding: 28, textAlign: "center" as const },
  localState: { background: "#000000", borderRadius: 8, color: "#f4efe4", fontWeight: 800, padding: 12 },
  actionGrid: { display: "flex", flexWrap: "wrap" as const, gap: 10 },
  actionButton: { background: "#171511", border: 0, borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 800, minHeight: 44, padding: "0 16px" },
  secondaryButton: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.3)", borderRadius: 8, color: "#f4efe4", fontWeight: 800, minHeight: 44, padding: "12px 18px", textDecoration: "none" },
  assignmentLink: { alignItems: "center", background: "#000000", borderRadius: 8, color: "#fff", display: "inline-flex", fontWeight: 800, marginTop: 14, minHeight: 44, padding: "0 16px", textDecoration: "none" },
  boundaryGrid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", padding: "24px clamp(18px, 5vw, 64px) 48px" },
  boundaryCard: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 10, padding: 16 }
} as const;
