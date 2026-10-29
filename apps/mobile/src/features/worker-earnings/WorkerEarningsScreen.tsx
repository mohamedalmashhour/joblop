import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "@rwos/design-system";
import type { MobileSessionTransport, WorkerPayoutsSummary } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, Divider, Heading, ScreenContainer, Section, SmallText } from "../../ui/primitives";
import {
  getWorkerEarningsFixtureDisclosure,
  workerEarningsBoundaries,
  workerEarningsPrivacyRules,
  workerEarningsRows,
  workerEarningsStatusModel
} from "./workerEarningsContent";

type WorkerEarningsScreenProps = {
  onBack?: () => void;
  onOpenSupport?: () => void;
  // When supplied, the screen loads the worker's REAL payout ledger from GET /worker/payouts and shows
  // it in place of the fixture rows. Absent (or null) → the fixture preview is shown instead.
  transport?: MobileSessionTransport | null;
};

type LedgerState =
  | { status: "loading" }
  | { status: "ready"; data: WorkerPayoutsSummary }
  | { status: "empty" | "denied" | "error" | "unavailable" };

function formatMinor(amountMinor: number, currency: string): string {
  return `${(amountMinor / 100).toFixed(2)} ${currency}`;
}

const LEDGER_MESSAGE: Record<"denied" | "error" | "unavailable" | "empty", string> = {
  denied: "Sign in to see the amounts registered in your account.",
  error: "Your payout ledger could not be loaded right now.",
  unavailable: "The payout service is not available right now.",
  empty: "No payouts registered to your account yet."
};

export function WorkerEarningsScreen({ onBack, onOpenSupport, transport }: WorkerEarningsScreenProps) {
  const [ledger, setLedger] = useState<LedgerState>({ status: "loading" });

  useEffect(() => {
    if (!transport) return;
    let active = true;
    void transport.workerPayouts().then((result) => {
      if (active) setLedger(result);
    });
    return () => {
      active = false;
    };
  }, [transport]);

  return (
    <ScreenContainer testID="worker-earnings-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          {onBack ? <Button label="Back" onPress={onBack} variant="secondary" /> : null}
          <Card>
            <Badge label="Worker payable summary" tone="warning" />
            <Heading>Earnings</Heading>
            <BodyText>
              Worker-facing earnings and payable status only. This screen does not calculate
              payroll, execute payments, display employer invoices or guarantee settlement.
            </BodyText>
            {!transport
              ? getWorkerEarningsFixtureDisclosure().map((item) => <SmallText key={item}>{item}</SmallText>)
              : null}
          </Card>

          {transport ? (
            <Section title="From your account">
              <Card>
                {ledger.status === "loading" ? (
                  <BodyText>Loading your payout ledger…</BodyText>
                ) : ledger.status === "ready" ? (
                  <>
                    <View style={styles.summaryRow}>
                      <View style={styles.rowBody}>
                        <Heading>To pay</Heading>
                        <SmallText>Confirmed and awaiting transfer.</SmallText>
                      </View>
                      <BodyText>{formatMinor(ledger.data.toPayMinor, ledger.data.currency)}</BodyText>
                    </View>
                    <Divider />
                    <View style={styles.summaryRow}>
                      <View style={styles.rowBody}>
                        <Heading>Paid</Heading>
                        <SmallText>Already sent to your account.</SmallText>
                      </View>
                      <BodyText>{formatMinor(ledger.data.paidMinor, ledger.data.currency)}</BodyText>
                    </View>
                  </>
                ) : (
                  <BodyText>{LEDGER_MESSAGE[ledger.status]}</BodyText>
                )}
              </Card>
            </Section>
          ) : (
            <Section title="Payable summary">
              <Card>
                {workerEarningsRows.map((row) => (
                  <View key={row.label} style={styles.summaryRow}>
                    <View style={styles.rowBody}>
                      <Heading>{row.label}</Heading>
                      <SmallText>{row.note}</SmallText>
                    </View>
                    <BodyText>{row.amount}</BodyText>
                  </View>
                ))}
              </Card>
            </Section>
          )}

          <Section title="Status model">
            <Card>
              <SmallText>{workerEarningsStatusModel.join(" -> ")}</SmallText>
              <Divider />
              {workerEarningsBoundaries.map((item) => (
                <SmallText key={item}>{item}</SmallText>
              ))}
            </Card>
          </Section>

          <Section title="Privacy">
            <Card>
              {workerEarningsPrivacyRules.map((item) => (
                <SmallText key={item}>{item}</SmallText>
              ))}
              <Divider />
              <BodyText>
                Failed, held or disputed payable states route to support and human review. AI may
                explain states but cannot calculate payroll or release funds.
              </BodyText>
              {onOpenSupport ? (
                <Button label="Contact support" onPress={onOpenSupport} variant="secondary" />
              ) : null}
            </Card>
          </Section>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1
  },
  stack: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl
  },
  summaryRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  rowBody: {
    flex: 1,
    gap: spacing.xs
  }
});

