"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatRwosDateTime } from "@rwos/shared";
import type { EmployerDispatchStatus } from "../../../api/job-requests/jobRequestBoundary";
import { styles } from "../../employerStyles";
import { useLocale } from "../../../i18n/LocaleProvider";
import { fill, langOf } from "../../../i18n/localText";
import { staffingText } from "./staffingText";

export function StaffingProgressPanel({ requestId }: Readonly<{ requestId: string | null }>) {
  const tx = staffingText[langOf(useLocale())];
  const [status, setStatus] = useState<EmployerDispatchStatus | null>(null);
  const [view, setView] = useState<
    "loading" | "ready" | "denied" | "organization_required" | "unavailable" | "error" | "invalid"
  >(requestId && isUuid(requestId) ? "loading" : "invalid");
  const generation = useRef(0);
  const load = useCallback(async () => {
    if (!requestId || !isUuid(requestId)) return setView("invalid");
    const current = ++generation.current;
    setView("loading");
    try {
      const response = await fetch(
        `/api/job-requests/${encodeURIComponent(requestId)}/dispatch-status`,
        { cache: "no-store" }
      );
      if (current !== generation.current) return;
      if (!response.ok) {
        setView(
          response.status === 400
            ? "invalid"
            : response.status === 401 || response.status === 403
              ? "denied"
              : response.status === 409
                ? "organization_required"
                : response.status === 503
                  ? "unavailable"
                  : "error"
        );
        return;
      }
      const payload = (await response.json()) as { dispatchStatus?: EmployerDispatchStatus };
      if (!payload.dispatchStatus) throw new Error("RWOS_MISSING_STATUS");
      setStatus(payload.dispatchStatus);
      setView("ready");
    } catch {
      if (current === generation.current) setView("unavailable");
    }
  }, [requestId]);

  useEffect(() => {
    void load();
    return () => {
      generation.current += 1;
    };
  }, [load]);

  if (view !== "ready" || !status) {
    return (
      <article aria-busy={view === "loading"} aria-live="polite" style={styles.panel}>
        <h2 style={styles.sectionTitle}>
          {view === "loading"
            ? tx.loadingTitle
            : view === "invalid"
              ? tx.invalidTitle
              : view === "organization_required"
                ? tx.chooseTitle
                : view === "unavailable"
                  ? tx.unavailableTitle
                  : view === "error"
                    ? tx.errorTitle
                    : tx.deniedTitle}
        </h2>
        <p style={styles.sectionCopy}>
          {view === "denied"
            ? tx.deniedBody
            : view === "organization_required"
              ? tx.chooseBody
              : view === "invalid"
                ? tx.invalidBody
                : view === "loading"
                  ? tx.loadingBody
                  : view === "unavailable"
                    ? tx.unavailableBody
                    : tx.errorBody}
        </p>
        {view === "unavailable" || view === "error" ? (
          <button onClick={() => void load()} style={styles.secondaryButton} type="button">
            {tx.retry}
          </button>
        ) : null}
        {view !== "loading" ? (
          <a href="/employer/calendar" style={styles.secondaryButton}>
            {view === "organization_required" ? tx.chooseAction : tx.back}
          </a>
        ) : null}
      </article>
    );
  }

  const copy = tx.stages[status.state];
  return (
    <div style={styles.twoColumn}>
      <article style={styles.panel}>
        <p style={styles.eyebrowDark}>{tx.eyebrow}</p>
        <h2 style={styles.sectionTitle}>{copy.title}</h2>
        <p style={styles.sectionCopy}>{copy.body}</p>
        {[
          [tx.request, status.requestNumber],
          [tx.requested, String(status.requiredWorkerCount)],
          [tx.stillToFill, String(status.remainingWorkerCount)]
        ].map(([label, value]) => (
          <div key={label} style={styles.tintedCard}>
            <strong>{label}</strong>
            <p style={styles.cardText}>{value}</p>
          </div>
        ))}
        <p style={styles.cardText}>{tx.zeroNote}</p>
        {status.updatedAt ? (
          <p style={styles.cardText}>
            <time dateTime={status.updatedAt}>
              {fill(tx.updated, {
                date: formatRwosDateTime(status.updatedAt, {
                  timeZone: "UTC",
                  dateStyle: "medium",
                  timeStyle: "short"
                })
              })}
            </time>
          </p>
        ) : null}
      </article>
      <article style={styles.panel}>
        <h2 style={styles.sectionTitle}>{tx.sideTitle}</h2>
        <p style={styles.sectionCopy}>{tx.sideBody}</p>
      </article>
    </div>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
