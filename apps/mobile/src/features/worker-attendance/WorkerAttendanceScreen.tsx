import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "../../theme";
import { Badge, BodyText, Button, Card, Divider, Heading, ScreenContainer, Section, SmallText } from "../../ui/primitives";
import {
  getAttendanceStage,
  type WorkerAttendanceStage,
  workerAttendanceBoundaries,
  workerAttendancePrivacyRules,
  workerAttendanceStateModel
} from "./workerAttendanceContent";

type WorkerAttendanceScreenProps = {
  onBack: () => void;
  onOpenTimesheet?: () => void;
  onSelectStage: (stage: WorkerAttendanceStage) => void;
  stage: WorkerAttendanceStage;
};

export function WorkerAttendanceScreen({
  onBack,
  onOpenTimesheet,
  onSelectStage,
  stage
}: WorkerAttendanceScreenProps) {
  const stageDetails = getAttendanceStage(stage);

  return (
    <ScreenContainer testID="worker-attendance-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Button label="Back" onPress={onBack} variant="secondary" />
          <Card>
            <Badge label={stageDetails.status} tone={stage === "review" ? "success" : "warning"} />
            <Heading>{stageDetails.title}</Heading>
            <BodyText>{stageDetails.purpose}</BodyText>
            <SmallText>
              Fixture-backed worker attendance only. No GPS engine, backend evidence capture or
              automatic timesheet approval is connected.
            </SmallText>
          </Card>

          <Section title="Assignment context">
            <Card>
              <Heading>Housekeeping support - Maple Grove Residence</Heading>
              <BodyText>Today, 9:00 AM - 1:00 PM. Worker accepted assignment fixture.</BodyText>
              <SmallText>Workplace instructions are visible before arrival.</SmallText>
              <SmallText>Immediate safety emergencies should use local emergency services.</SmallText>
            </Card>
          </Section>

          <Section title="Attendance controls">
            <Card>
              <View style={styles.buttonGrid}>
                <Button label="Arrival" onPress={() => onSelectStage("arrival")} variant="secondary" />
                <Button label="Clock in" onPress={() => onSelectStage("clockIn")} />
                <Button label="In progress" onPress={() => onSelectStage("inProgress")} variant="secondary" />
                <Button label="Break" onPress={() => onSelectStage("break")} variant="secondary" />
                <Button label="Clock out" onPress={() => onSelectStage("clockOut")} />
                <Button label="Review" onPress={() => onSelectStage("review")} variant="secondary" />
              </View>
              <Divider />
              <SmallText>
                Actions update only this local frontend state. They do not create authoritative
                attendance evidence.
              </SmallText>
            </Card>
          </Section>

          <Section title="Governed states">
            <Card>
              <SmallText>{workerAttendanceStateModel.join(" -> ")}</SmallText>
              <Divider />
              {workerAttendanceBoundaries.map((item) => (
                <SmallText key={item}>{item}</SmallText>
              ))}
            </Card>
          </Section>

          <Section title="Privacy and fallback">
            <Card>
              {workerAttendancePrivacyRules.map((item) => (
                <SmallText key={item}>{item}</SmallText>
              ))}
              <Divider />
              <BodyText>
                If clock-in, clock-out, location or connectivity fails, the worker can contact
                support and request manual review. The app must not infer misconduct automatically.
              </BodyText>
            </Card>
          </Section>

          {stage === "review" ? (
            <Card>
              <Heading>Timesheet handoff</Heading>
              <BodyText>
                Attendance evidence can be reviewed in the timesheet workflow. Approved hours,
                payroll and payment remain separate future steps.
              </BodyText>
              {onOpenTimesheet ? (
                <Button label="Open timesheet review" onPress={onOpenTimesheet} />
              ) : null}
            </Card>
          ) : null}
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
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
