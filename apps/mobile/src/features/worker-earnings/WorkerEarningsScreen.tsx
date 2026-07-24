import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "@rwos/design-system";
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
};

export function WorkerEarningsScreen({ onBack, onOpenSupport }: WorkerEarningsScreenProps) {
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
            {getWorkerEarningsFixtureDisclosure().map((item) => (
              <SmallText key={item}>{item}</SmallText>
            ))}
          </Card>

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

