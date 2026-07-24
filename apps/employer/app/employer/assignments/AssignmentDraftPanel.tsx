"use client";

import { useEffect, useState } from "react";
import {
  assignmentDataStates,
  manualAssignmentLifecycle,
  selectAssignmentCandidate,
  type AssignmentStatus
} from "../assignmentWorkflowContent";
import { styles } from "../employerStyles";

const storageKey = "rwos.employer.assignmentDraft.v1";

type AssignmentDraft = ReturnType<typeof selectAssignmentCandidate>;

export function AssignmentDraftPanel({ mode }: { mode: "manual" | "review" | "confirmation" | "response" | "detail" }) {
  const [draft, setDraft] = useState<AssignmentDraft>(selectAssignmentCandidate());

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      setDraft(JSON.parse(saved));
    }
  }, []);

  function updateStatus(status: AssignmentStatus) {
    const nextDraft = { ...draft, assignmentStatus: status };
    setDraft(nextDraft);
    window.localStorage.setItem(storageKey, JSON.stringify(nextDraft));
  }

  function saveProposedAssignment() {
    updateStatus("Proposed");
  }

  function createPendingAssignment() {
    updateStatus("Pending Response");
  }

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <p style={styles.eyebrowDark}>Fixture-backed assignment draft</p>
        <h2 style={styles.sectionTitle}>{draft.candidate.displayName}</h2>
        <p style={styles.sectionCopy}>
          Assignment state: {draft.assignmentStatus}. This does not contact workers, simulate
          acceptance, create attendance, or execute backend assignment logic.
        </p>
      </div>
      <div style={styles.cardGrid}>
        {[
          ["Candidate", draft.candidate.displayName],
          ["Availability", draft.candidate.availability],
          ["Qualifications", draft.candidate.qualifications],
          ["Decision actor", draft.decisionActor],
          ["Decision reason", draft.decisionReason],
          ["Authoritative handoff", draft.authoritativeHandoff]
        ].map(([label, value]) => (
          <article key={label} style={styles.card}>
            <h3 style={styles.cardTitle}>{label}</h3>
            <p style={styles.cardText}>{value}</p>
          </article>
        ))}
      </div>
      <div style={styles.pillGrid}>
        {manualAssignmentLifecycle.map((state) => (
          <span key={state} style={state === draft.assignmentStatus ? styles.pill : styles.routeCard}>
            {state}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
        {mode === "manual" ? (
          <>
            <button type="button" onClick={saveProposedAssignment} style={styles.primaryButton}>
              Select candidate locally
            </button>
            <a href="/employer/assignments/review" style={styles.secondaryButton}>Review assignment</a>
          </>
        ) : null}
        {mode === "review" ? (
          <>
            <button type="button" onClick={createPendingAssignment} style={styles.primaryButton}>
              Create pending-response fixture
            </button>
            <a href="/employer/assignments/confirmation" style={styles.secondaryButton}>Open confirmation</a>
          </>
        ) : null}
        {mode === "confirmation" ? <a href="/employer/assignments/worker-response" style={styles.secondaryButton}>View worker response state</a> : null}
        {mode === "response" ? <a href="/employer/assignments/detail" style={styles.secondaryButton}>Open assignment detail</a> : null}
        {mode === "detail" ? <a href="/employer/attendance" style={styles.secondaryButton}>Attendance handoff</a> : null}
      </div>
      <div style={styles.cardGrid}>
        {assignmentDataStates.map((state) => (
          <article key={state} style={styles.tintedCard}>
            <p style={styles.cardText}>{state}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
