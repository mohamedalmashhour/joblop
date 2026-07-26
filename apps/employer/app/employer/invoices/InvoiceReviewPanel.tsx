import {
  chargeBreakdownRows,
  invoiceBoundaries,
  invoiceDataTruth,
  invoiceFixture,
  invoiceRows,
  invoiceStates
} from "../invoiceWorkflowContent";
import { styles } from "../employerStyles";

export function InvoiceReviewPanel({ mode }: { mode: "list" | "detail" | "breakdown" }) {
  return (
    <section style={styles.section}>
      <div style={styles.panel}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Fixture-backed invoice review</p>
          <h2 style={styles.sectionTitle}>{mode === "list" ? "Invoice list" : invoiceFixture.invoiceNumber}</h2>
          <p style={styles.sectionCopy}>
            Invoice data is a labelled fixture. It does not authorize charges, settle payments, post
            accounting entries, or provide tax advice.
          </p>
          <span style={styles.statusBadgeWarning}>Payment execution not active</span>
        </div>
        {mode === "list" ? (
          <div style={styles.cardGrid}>
            {invoiceRows.map((row) => (
              <article key={row.invoiceNumber} style={styles.card}>
                <h3 style={styles.cardTitle}>{row.invoiceNumber}</h3>
                <p style={styles.cardText}>
                  <span style={styles.metaLabel}>Shift</span>
                  {row.shift}
                </p>
                <p style={styles.cardText}>Invoice state: {row.state}</p>
                <p style={styles.cardText}>Payment state: {row.paymentState}</p>
                <p style={styles.cardText}>{row.boundary}</p>
                <a href="/employer/invoices/detail" style={{ ...styles.secondaryButton, marginTop: 12 }}>
                  Open detail
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div style={styles.cardGrid}>
            {[
              ["Shift reference", invoiceFixture.shiftReference],
              ["Worker reference", invoiceFixture.workerReference],
              ["Residence", invoiceFixture.residence],
              ["Department", invoiceFixture.department],
              ["Generated date", invoiceFixture.generatedDate],
              ["Due date", invoiceFixture.dueDate],
              ["Invoice state", invoiceFixture.invoiceState],
              ["Payment state", invoiceFixture.paymentState]
            ].map(([label, value]) => (
              <article key={label} style={styles.card}>
                <span style={styles.metaLabel}>{label}</span>
                <p style={styles.cardText}>{value}</p>
              </article>
            ))}
          </div>
        )}
      </div>
      {mode === "breakdown" ? (
        <section style={{ marginTop: 22 }}>
          <div style={styles.cardGrid}>
            {chargeBreakdownRows.map(([label, value]) => (
              <article key={label} style={styles.tintedCard}>
                <h3 style={styles.cardTitle}>{label}</h3>
                <p style={styles.cardText}>{value}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <section style={{ marginTop: 22 }}>
        <div style={styles.pillGrid}>{invoiceStates.map((state) => <span key={state} style={styles.pill}>{state}</span>)}</div>
      </section>
      <section style={{ marginTop: 22 }}>
        <div style={styles.cardGrid}>
          {[...invoiceBoundaries, ...invoiceDataTruth].map((item) => (
            <article key={item} style={styles.card}>
              <p style={styles.cardText}>{item}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
