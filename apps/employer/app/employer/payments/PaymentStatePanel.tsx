import {
  employerPaymentStates,
  paymentBoundaries,
  paymentDataTruth,
  paymentFixture,
  type EmployerPaymentState
} from "../paymentWorkflowContent";
import { styles } from "../employerStyles";

const modeState: Record<string, EmployerPaymentState> = {
  overview: "Not Started",
  method: "Method Required",
  authorization: "Authorization Pending",
  settlement: "Processing",
  receipt: "Settled",
  exceptions: "Retry Required"
};

export function PaymentStatePanel({ mode }: { mode: "overview" | "method" | "authorization" | "settlement" | "receipt" | "exceptions" }) {
  const currentState = modeState[mode];

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <p style={styles.eyebrowDark}>Fixture-backed payment state</p>
        <h2 style={styles.sectionTitle}>{currentState}</h2>
        <p style={styles.sectionCopy}>
          Payment state is display-only. No payment provider is selected, no charge is executed,
          and no worker payment is implied.
        </p>
      </div>
      <div style={styles.cardGrid}>
        {[
          ["Invoice", paymentFixture.invoice],
          ["Amount", paymentFixture.amount],
          ["Payment method", paymentFixture.methodSummary],
          ["Masked details", paymentFixture.maskedDetails],
          ["Authorization", paymentFixture.authorizationStatus],
          ["Settlement", paymentFixture.settlementStatus],
          ["Failure reason", paymentFixture.failureReason],
          ["Retry eligibility", paymentFixture.retryEligibility],
          ["Receipt reference", paymentFixture.receiptReference],
          ["Transaction date", paymentFixture.transactionDate],
          ["Invoice linkage", paymentFixture.invoiceLinkage],
          ["Worker payable", paymentFixture.workerPayableBoundary]
        ].map(([label, value]) => (
          <article key={label} style={styles.card}>
            <h3 style={styles.cardTitle}>{label}</h3>
            <p style={styles.cardText}>{value}</p>
          </article>
        ))}
      </div>
      <section style={{ marginTop: 22 }}>
        <div style={styles.pillGrid}>{employerPaymentStates.map((state) => <span key={state} style={state === currentState ? styles.pill : styles.routeCard}>{state}</span>)}</div>
      </section>
      <section style={{ marginTop: 22 }}>
        <div style={styles.cardGrid}>
          {[...paymentBoundaries, ...paymentDataTruth].map((item) => (
            <article key={item} style={styles.tintedCard}>
              <p style={styles.cardText}>{item}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
