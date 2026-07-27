"use client";

import { useState } from "react";
import {
  adminAiRecommendation,
  adminCalendarBoundaries,
  adminCalendarEvent,
  adminReviewActions,
  adminReviewChecks
} from "./adminCalendarContent";

export function AdminReviewPanel() {
  const [localDecision, setLocalDecision] = useState<string>("No fixture action selected");

  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Resident Workforce OS / Connected calendar</p>
          <h1 style={styles.title}>Review staffing request</h1>
          <p style={styles.lede}>
            Review readiness and separated economics before choosing a non-persistent fixture action.
          </p>
        </div>
        <a href="/calendar" style={styles.secondaryButton}>
          Back to admin calendar
        </a>
      </header>

      <section style={styles.grid}>
        <article style={styles.panel}>
          <p style={styles.eyebrowDark}>Required review</p>
          <h2 style={styles.h2}>{adminCalendarEvent.roleLabel}</h2>
          {adminReviewChecks.map((check) => (
            <div key={check.label} style={styles.row}>
              <strong>{check.label}</strong>
              <span>{check.status}</span>
            </div>
          ))}
          <div style={styles.mapPlaceholder}>Map placeholder · no map provider connected</div>
        </article>

        <article style={styles.panel}>
          <p style={styles.eyebrowDark}>Economics separation</p>
          <div style={styles.economicsCard}>
            <h2 style={styles.h2}>Client economics</h2>
            <p>Bill rate: $45.00 CAD / hour</p>
            <p>Terms: {adminCalendarEvent.clientEconomics.termsVersion}</p>
          </div>
          <div style={styles.economicsCard}>
            <h2 style={styles.h2}>Worker-offer economics</h2>
            <p>Worker wage: $30.00 CAD / hour</p>
            <p>Transportation compensation: $5.00 CAD</p>
            <p>Terms: {adminCalendarEvent.workerOfferEconomics.termsVersion}</p>
          </div>
        </article>
      </section>

      <section style={styles.grid}>
        <article style={styles.panel}>
          <p style={styles.eyebrowDark}>Local review controls</p>
          <h2 style={styles.h2}>Decision preview</h2>
          <p aria-live="polite" style={styles.localState}>
            {localDecision}
          </p>
          <div style={styles.actionGrid}>
            {adminReviewActions.map((action) => (
              <button
                key={action}
                onClick={() =>
                  setLocalDecision(`${action} selected locally — not saved, published, or executed`)
                }
                style={styles.actionButton}
                type="button"
              >
                {action}
              </button>
            ))}
          </div>
          <a href="/calendar/assignment" style={styles.assignmentLink}>
            Open operational assignment visibility
          </a>
        </article>

        <article style={styles.advisoryPanel}>
          <p style={styles.eyebrowDark}>AI advisory fixture</p>
          <h2 style={styles.h2}>{adminAiRecommendation.title}</h2>
          <p>{adminAiRecommendation.recommendation}</p>
          <p><strong>Evidence:</strong> {adminAiRecommendation.evidence}</p>
          <p><strong>Uncertainty:</strong> {adminAiRecommendation.uncertainty}</p>
          <p><strong>Required decision:</strong> {adminAiRecommendation.requiredDecision}</p>
        </article>
      </section>

      <section style={styles.boundaryGrid}>
        {adminCalendarBoundaries.map((boundary) => (
          <article key={boundary} style={styles.boundaryCard}>
            {boundary}
          </article>
        ))}
      </section>
    </main>
  );
}

const styles = {
  page: { background: "#f4f7fb", color: "#10233f", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  hero: { alignItems: "center", background: "#061b41", color: "#fff", display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between", padding: "40px clamp(18px, 5vw, 64px)" },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  eyebrowDark: { color: "#123b78", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(34px, 5vw, 56px)", margin: "8px 0" },
  lede: { color: "#d6e5f8", fontSize: 18, lineHeight: 1.6, maxWidth: 760 },
  h2: { color: "#061b41", fontSize: 25, margin: "6px 0 14px" },
  grid: { display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", padding: "24px clamp(18px, 5vw, 64px) 0" },
  panel: { background: "#fff", border: "1px solid #dbe4f0", borderRadius: 14, boxShadow: "0 12px 30px rgba(6,27,65,.08)", padding: 24 },
  advisoryPanel: { background: "#edf8f5", border: "1px solid #a7d9cf", borderRadius: 14, padding: 24 },
  row: { alignItems: "center", borderBottom: "1px solid #e7edf5", display: "flex", gap: 12, justifyContent: "space-between", padding: "12px 0" },
  economicsCard: { background: "#f4f7fb", border: "1px solid #dbe4f0", borderRadius: 10, marginTop: 12, padding: 18 },
  mapPlaceholder: { background: "#e9eef6", border: "1px dashed #91a5bf", borderRadius: 10, marginTop: 18, padding: 28, textAlign: "center" as const },
  localState: { background: "#eef6ff", borderRadius: 8, color: "#123b78", fontWeight: 800, padding: 12 },
  actionGrid: { display: "flex", flexWrap: "wrap" as const, gap: 10 },
  actionButton: { background: "#0f7f78", border: 0, borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 800, minHeight: 44, padding: "0 16px" },
  secondaryButton: { background: "#fff", borderRadius: 8, color: "#061b41", fontWeight: 800, minHeight: 44, padding: "12px 18px", textDecoration: "none" },
  assignmentLink: { alignItems: "center", background: "#061b41", borderRadius: 8, color: "#fff", display: "inline-flex", fontWeight: 800, marginTop: 14, minHeight: 44, padding: "0 16px", textDecoration: "none" },
  boundaryGrid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", padding: "24px clamp(18px, 5vw, 64px) 48px" },
  boundaryCard: { background: "#fff", border: "1px solid #dbe4f0", borderRadius: 10, padding: 16 }
} as const;
