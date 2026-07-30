import {
  employerPaymentStates,
  paymentBoundaries,
  paymentDataTruth,
  paymentFixture,
  type EmployerPaymentState
} from "../paymentWorkflowContent";
import { styles } from "../employerStyles";

const modeState: Record<string, EmployerPaymentState> = {
  overview: "Pending",
  method: "Pending",
  authorization: "Pending",
  settlement: "Processing",
  receipt: "Succeeded",
  exceptions: "Failed"
};

export function PaymentStatePanel({ mode }: { mode: "overview" | "method" | "authorization" | "settlement" | "receipt" | "exceptions" }) {
  const currentState = modeState[mode];

  return (
    <section style={styles.section}>
      <div style={styles.panel}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Synthetic local payment orchestration</p>
          <h2 style={styles.sectionTitle}>{currentState}</h2>
          <p style={styles.sectionCopy}>
            Mastercard through Stripe is the intended default and ACSS debit is the alternative.
            This screen uses a local fake provider only; no real charge or worker payment is implied.
          </p>
          <span style={styles.statusBadgeWarning}>Provider gate required</span>
        </div>
        <div style={styles.cardGrid}>
          {[
            ["Invoice", paymentFixture.invoice],
            ["Employer", paymentFixture.employerOrganization],
            ["Estimated labour", paymentFixture.labourEstimate],
            ["Approved travel", paymentFixture.travelEstimate],
            ["Mileage", paymentFixture.mileageEstimate],
            ["Marketplace service fee", paymentFixture.marketplaceFee],
            ["Estimated taxes", paymentFixture.taxes],
            ["Authorization total", paymentFixture.authorizationTotal],
            ["Payment method", paymentFixture.methodSummary],
            ["Alternative method", paymentFixture.alternativeMethod],
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
              <span style={styles.metaLabel}>{label}</span>
              <p style={styles.cardText}>{value}</p>
            </article>
          ))}
        </div>
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
