"use client";

import { usePageText } from "../../i18n/pageText";
import { dispatchText } from "./dispatchText";

/**
 * Plain warning shown wherever staff can create or send an offer: on the live site an offer never
 * becomes an assignment (see dispatchText.ts), so the worker must take the shift from the job board.
 */
export function BoardOnlyNotice() {
  const t = usePageText(dispatchText);
  return (
    <div role="note" style={styles.box}>
      <strong>{t.boardOnlyTitle}</strong>
      <p style={styles.body}>{t.boardOnlyBody}</p>
    </div>
  );
}

/** One-line reminder next to the "Create offer" button. */
export function CreateOfferNote() {
  const t = usePageText(dispatchText);
  return <span style={styles.note}>{t.createOfferNote}</span>;
}

const styles = {
  box: {
    background: "rgba(248, 184, 8, 0.08)",
    border: "1px solid rgba(248, 184, 8, 0.45)",
    borderRadius: 8,
    color: "#f4efe4",
    fontSize: 14,
    margin: "8px 0 12px",
    padding: "10px 12px"
  },
  body: { lineHeight: 1.5, margin: "4px 0 0" },
  note: { color: "#e8c46b", fontSize: 12, fontWeight: 700 }
} as const;
