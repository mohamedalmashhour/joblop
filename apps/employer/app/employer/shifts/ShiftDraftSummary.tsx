"use client";

import { useEffect, useState } from "react";
import { styles } from "../employerStyles";
import {
  defaultShiftDraft,
  markPublicationRequested,
  markPublishedFixture,
  shiftDataStates,
  shiftDraftStorageKey,
  type ShiftDraft,
  validateShiftDraft
} from "./shiftCreationModel";

export function ShiftDraftSummary({ mode }: { mode: "review" | "publish" | "detail" }) {
  const [draft, setDraft] = useState<ShiftDraft>(defaultShiftDraft);
  const validation = validateShiftDraft(draft);

  useEffect(() => {
    const saved = window.localStorage.getItem(shiftDraftStorageKey);
    if (saved) {
      setDraft({ ...defaultShiftDraft, ...JSON.parse(saved) });
    }
  }, []);

  function requestPublication() {
    const nextDraft = markPublicationRequested(draft);
    setDraft(nextDraft);
    window.localStorage.setItem(shiftDraftStorageKey, JSON.stringify(nextDraft));
  }

  function publishFixture() {
    const nextDraft = markPublishedFixture(draft);
    setDraft(nextDraft);
    window.localStorage.setItem(shiftDraftStorageKey, JSON.stringify(nextDraft));
  }

  return (
    <section style={styles.section}>
      <div style={styles.panel}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Fixture-backed shift summary</p>
          <h2 style={styles.sectionTitle}>
            {draft.role} at {draft.residence}
          </h2>
          <p style={styles.sectionCopy}>
            Status: {draft.publicationState}. Validation: {validation.state}. This is not server
            persistence and not live publication.
          </p>
          <span style={validation.state === "Ready" ? styles.statusBadge : styles.statusBadgeWarning}>
            {validation.state}
          </span>
        </div>
        <div style={styles.cardGrid}>
          {Object.entries({
            Organization: draft.employerOrganization,
            Residence: draft.residence,
            Department: draft.department,
            Role: draft.role,
            Date: draft.date,
            Time: `${draft.startTime} - ${draft.endTime} ${draft.timezone}`,
            Workers: draft.workerCount,
            Rate: draft.rate,
            Requirements: draft.qualificationRequirements,
            Type: draft.shiftType,
            Recurrence: draft.recurrence
          }).map(([label, value]) => (
            <article key={label} style={styles.card}>
              <span style={styles.metaLabel}>{label}</span>
              <p style={styles.cardText}>{value}</p>
            </article>
          ))}
        </div>
        <div style={styles.cardGrid}>
          {shiftDataStates.map((state) => (
            <article key={state} style={styles.tintedCard}>
              <p style={styles.cardText}>{state}</p>
            </article>
          ))}
        </div>
        <div style={styles.actionBar}>
          {mode === "review" ? (
            <button type="button" onClick={requestPublication} style={styles.primaryButton}>
              Mark publication requested locally
            </button>
          ) : null}
          {mode === "publish" ? (
            <button type="button" onClick={publishFixture} style={styles.primaryButton}>
              Mark published fixture locally
            </button>
          ) : null}
          {mode === "review" ? (
            <a href="/employer/shifts/publish" style={styles.secondaryButton}>
              Go to publish
            </a>
          ) : null}
          {mode === "publish" ? (
            <a href="/employer/shifts/detail" style={styles.secondaryButton}>
              Open shift detail
            </a>
          ) : null}
          {mode === "detail" ? (
            <a href="/employer/applicants" style={styles.secondaryButton}>
              View applicants
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
