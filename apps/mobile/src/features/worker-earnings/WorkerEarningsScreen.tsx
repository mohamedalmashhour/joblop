import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "../../theme";
import type { MobileSessionTransport, WorkerPayoutsSummary } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, Divider, Heading, ScreenContainer, Section, SmallText } from "../../ui/primitives";
import { useLocale } from "../../i18n/LocaleContext";
import {
  getWorkerEarningsFixtureDisclosure,
  workerEarningsBoundaries,
  workerEarningsCopyFor,
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

export function WorkerEarningsScreen({ onBack, onOpenSupport, transport }: WorkerEarningsScreenProps) {
  const { locale } = useLocale();
  const copy = workerEarningsCopyFor(locale);
  const ledgerMessage: Record<"denied" | "error" | "unavailable" | "empty", string> = {
    denied: copy.denied,
    error: copy.error,
    unavailable: copy.unavailable,
    empty: copy.empty
  };
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
          {onBack ? <Button label={copy.back} onPress={onBack} variant="secondary" /> : null}
          <Card>
            <Badge label={copy.badge} tone="warning" />
            <Heading>{copy.title}</Heading>
            <BodyText>{copy.intro}</BodyText>
            {!transport
              ? getWorkerEarningsFixtureDisclosure().map((item) => <SmallText key={item}>{item}</SmallText>)
              : null}
          </Card>

          {transport ? (
            <Section title={copy.fromAccountTitle}>
              <Card>
                {ledger.status === "loading" ? (
                  <BodyText>{copy.loadingLedger}</BodyText>
                ) : ledger.status === "ready" ? (
                  <>
                    <View style={styles.summaryRow}>
                      <View style={styles.rowBody}>
                        <Heading>{copy.toPayTitle}</Heading>
                        <SmallText>{copy.toPayNote}</SmallText>
                      </View>
                      <BodyText>{formatMinor(ledger.data.toPayMinor, ledger.data.currency)}</BodyText>
                    </View>
                    <Divider />
                    <View style={styles.summaryRow}>
                      <View style={styles.rowBody}>
                        <Heading>{copy.paidTitle}</Heading>
                        <SmallText>{copy.paidNote}</SmallText>
                      </View>
                      <BodyText>{formatMinor(ledger.data.paidMinor, ledger.data.currency)}</BodyText>
                    </View>
                  </>
                ) : (
                  <BodyText>{ledgerMessage[ledger.status]}</BodyText>
                )}
              </Card>
            </Section>
          ) : (
            <Section title={copy.payableSummaryTitle}>
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
              <BodyText>{copy.supportNote}</BodyText>
              {onOpenSupport ? (
                <Button label={copy.contactSupport} onPress={onOpenSupport} variant="secondary" />
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

