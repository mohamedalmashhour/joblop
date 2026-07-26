"use client";

import { useState } from "react";
import {
  canApproveTimesheet,
  timesheetBoundaries,
  timesheetDataTruth,
  timesheetFixture,
  timesheetStates,
  timesheetVersionHistory,
  type TimesheetState
} from "../timesheetWorkflowContent";
import { styles } from "../employerStyles";

const storageKey = "rwos.employer.timesheetReview.v1";

export function TimesheetReviewPanel({ mode }: { mode: "draft" | "review" | "clarification" | "corrected" | "approved" }) {
  const [state, setState] = useState<TimesheetState>(mode === "approved" ? "Finance Ready" : timesheetFixture.approvalState);
  const [reason, setReason] = useState(timesheetFixture.adjustmentReason);

  function saveState(nextState: TimesheetState) {
    setState(nextState);
    window.localStorage.setItem(storageKey, JSON.stringify({ state: nextState, reason }));
  }

  const nextRoute = {
    draft: "/employer/timesheets/review",
    review: "/employer/timesheets/clarification",
    clarification: "/employer/timesheets/corrected",
    corrected: "/employer/timesheets/approved",
    approved: "/employer/invoices"
  }[mode];

  return (
    <section style={styles.section}>
      <div style={styles.panel}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Fixture-backed timesheet</p>
          <h2 style={styles.sectionTitle}>{timesheetFixture.shift}</h2>
          <p style={styles.sectionCopy}>
            State: {state}. This review does not persist to a server, calculate payroll, pay workers,
            or generate invoices.
          </p>
          <span style={canApproveTimesheet(reason) ? styles.statusBadge : styles.statusBadgeWarning}>
            Approval available: {canApproveTimesheet(reason) ? "Yes" : "No"}
          </span>
        </div>
        <div style={styles.cardGrid}>
          {[
            ["Scheduled start", timesheetFixture.scheduledStart],
            ["Scheduled end", timesheetFixture.scheduledEnd],
            ["Actual clock-in", timesheetFixture.actualClockIn],
            ["Actual clock-out", timesheetFixture.actualClockOut],
            ["Scheduled hours", timesheetFixture.scheduledHours],
            ["Original worked hours", timesheetFixture.workedHoursOriginal],
            ["Adjusted worked hours", timesheetFixture.workedHoursAdjusted],
            ["Break duration", timesheetFixture.breakDuration],
            ["Overtime", timesheetFixture.overtime],
            ["Adjustment", timesheetFixture.adjustment],
            ["Worker note", timesheetFixture.workerNote],
            ["Employer note", timesheetFixture.employerNote]
          ].map(([label, value]) => (
            <article key={label} style={styles.card}>
              <span style={styles.metaLabel}>{label}</span>
              <p style={styles.cardText}>{value}</p>
            </article>
          ))}
        </div>
        <label style={styles.fieldLabel}>
          Adjustment reason
          <input value={reason} onChange={(event) => setReason(event.target.value)} style={styles.input} />
        </label>
        <p style={styles.warning}>Adjustment reason is required before local approval can be displayed.</p>
        <div style={styles.pillGrid}>
          {timesheetStates.map((item) => (
            <span key={item} style={item === state ? styles.pill : styles.routeCard}>
              {item}
            </span>
          ))}
        </div>
        <div style={styles.actionBar}>
          {mode === "review" ? (
            <button type="button" onClick={() => saveState("Clarification Requested")} style={styles.secondaryButton}>
              Request clarification locally
            </button>
          ) : null}
          {mode === "corrected" ? (
            <button type="button" onClick={() => saveState("Finance Ready")} style={styles.primaryButton}>
              Approve fixture timesheet
            </button>
          ) : null}
          <a href={nextRoute} style={styles.primaryButton}>
            Continue
          </a>
        </div>
      </div>
      <section style={{ marginTop: 22 }}>
        <div style={styles.cardGrid}>
          {timesheetVersionHistory.map((entry) => (
            <article key={entry.version} style={styles.tintedCard}>
              <h3 style={styles.cardTitle}>{entry.version}</h3>
              <p style={styles.cardText}>Actor: {entry.actor}</p>
              <p style={styles.cardText}>Timestamp: {entry.timestamp}</p>
              <p style={styles.cardText}>{entry.change}</p>
            </article>
          ))}
        </div>
      </section>
      <section style={{ marginTop: 22 }}>
        <div style={styles.cardGrid}>
          {[...timesheetBoundaries, ...timesheetDataTruth].map((item) => (
            <article key={item} style={styles.card}>
              <p style={styles.cardText}>{item}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
