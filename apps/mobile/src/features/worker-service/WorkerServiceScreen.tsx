import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "@rwos/design-system";
import { Badge, BodyText, Button, Card, Divider, Heading, ScreenContainer, Section, SmallText } from "../../ui/primitives";
import {
  getWorkerServiceFixtureDisclosure,
  type WorkerServiceMode,
  workerMessageStates,
  workerOwnerReviewSteps,
  workerRatingStates,
  workerServiceBoundaries,
  workerSupportStates
} from "./workerServiceContent";

type WorkerServiceScreenProps = {
  mode: WorkerServiceMode;
  onOpenAttendance?: () => void;
  onOpenAvailable?: () => void;
  onOpenEarnings?: () => void;
  onOpenMode: (mode: WorkerServiceMode) => void;
  onOpenMyShifts?: () => void;
  onOpenOnboarding?: () => void;
  onOpenProfile?: () => void;
  onOpenTimesheet?: () => void;
};

export function WorkerServiceScreen({
  mode,
  onOpenAttendance,
  onOpenAvailable,
  onOpenEarnings,
  onOpenMode,
  onOpenMyShifts,
  onOpenOnboarding,
  onOpenProfile,
  onOpenTimesheet
}: WorkerServiceScreenProps) {
  return (
    <ScreenContainer testID="worker-service-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Card>
            <Badge label={mode} tone="neutral" />
            <Heading>{getModeTitle(mode)}</Heading>
            <BodyText>{getModeIntro(mode)}</BodyText>
            {getWorkerServiceFixtureDisclosure().map((item) => (
              <SmallText key={item}>{item}</SmallText>
            ))}
          </Card>

          <View style={styles.buttonGrid}>
            <Button label="Owner review" onPress={() => onOpenMode("ownerReview")} variant="secondary" />
            <Button label="Ratings" onPress={() => onOpenMode("ratings")} variant="secondary" />
            <Button label="Messages" onPress={() => onOpenMode("messages")} variant="secondary" />
            <Button label="Support" onPress={() => onOpenMode("support")} variant="secondary" />
          </View>

          {mode === "ownerReview" ? (
            <OwnerReviewHub
              onOpenAttendance={onOpenAttendance}
              onOpenAvailable={onOpenAvailable}
              onOpenEarnings={onOpenEarnings}
              onOpenMyShifts={onOpenMyShifts}
              onOpenOnboarding={onOpenOnboarding}
              onOpenProfile={onOpenProfile}
              onOpenTimesheet={onOpenTimesheet}
            />
          ) : null}

          {mode === "ratings" ? (
            <ServiceStateSection
              body="Workers can review completed assignments where permitted. Ratings are moderated and never become automatic discipline, hidden blacklisting or payroll logic."
              states={workerRatingStates}
              title="Ratings"
            />
          ) : null}

          {mode === "messages" ? (
            <ServiceStateSection
              body="Messages are worker communication only. They do not approve shifts, attendance, timesheets, payments or support outcomes."
              states={workerMessageStates}
              title="Messages"
            />
          ) : null}

          {mode === "support" ? (
            <ServiceStateSection
              body="Support explains next steps and routes issues for human review. Immediate medical or public-safety emergencies should use local emergency services."
              states={workerSupportStates}
              title="Support"
            />
          ) : null}

          <Section title="Boundaries">
            <Card>
              {workerServiceBoundaries.map((item) => (
                <SmallText key={item}>{item}</SmallText>
              ))}
            </Card>
          </Section>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

type OwnerReviewHubProps = {
  onOpenAttendance: (() => void) | undefined;
  onOpenAvailable: (() => void) | undefined;
  onOpenEarnings: (() => void) | undefined;
  onOpenMyShifts: (() => void) | undefined;
  onOpenOnboarding: (() => void) | undefined;
  onOpenProfile: (() => void) | undefined;
  onOpenTimesheet: (() => void) | undefined;
};

function OwnerReviewHub({
  onOpenAttendance,
  onOpenAvailable,
  onOpenEarnings,
  onOpenMyShifts,
  onOpenOnboarding,
  onOpenProfile,
  onOpenTimesheet
}: OwnerReviewHubProps) {
  return (
    <Section title="Owner review route">
      <Card>
        <Heading>Worker journey review hub</Heading>
        <BodyText>
          Use this hub to walk the connected worker journey in the mobile frontend. It is fixture
          backed and does not create production state.
        </BodyText>
        <SmallText>{workerOwnerReviewSteps.join(" -> ")}</SmallText>
        <Divider />
        <View style={styles.buttonGrid}>
          {onOpenOnboarding ? <Button label="Sign up" onPress={onOpenOnboarding} /> : null}
          {onOpenProfile ? <Button label="Profile" onPress={onOpenProfile} variant="secondary" /> : null}
          {onOpenAvailable ? <Button label="Available shifts" onPress={onOpenAvailable} /> : null}
          {onOpenMyShifts ? <Button label="Applications" onPress={onOpenMyShifts} variant="secondary" /> : null}
          {onOpenAttendance ? <Button label="Attendance" onPress={onOpenAttendance} /> : null}
          {onOpenTimesheet ? <Button label="Timesheet" onPress={onOpenTimesheet} variant="secondary" /> : null}
          {onOpenEarnings ? <Button label="Earnings" onPress={onOpenEarnings} /> : null}
        </View>
      </Card>
    </Section>
  );
}

function ServiceStateSection({
  body,
  states,
  title
}: {
  body: string;
  states: readonly string[];
  title: string;
}) {
  return (
    <Section title={title}>
      <Card>
        <BodyText>{body}</BodyText>
        <Divider />
        <SmallText>{states.join(" -> ")}</SmallText>
      </Card>
    </Section>
  );
}

function getModeTitle(mode: WorkerServiceMode) {
  if (mode === "ratings") return "Ratings";
  if (mode === "messages") return "Messages";
  if (mode === "support") return "Support";
  return "Owner Review";
}

function getModeIntro(mode: WorkerServiceMode) {
  if (mode === "ratings") return "Completed-shift feedback with moderation boundaries.";
  if (mode === "messages") return "Authorized worker communication without workflow approval.";
  if (mode === "support") return "Support routing and active-shift guidance.";
  return "A connected navigation hub for owner validation of the worker journey.";
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
