import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { colors, spacing } from "@rwos/design-system";
import { Badge, BodyText, Button, Card, Divider, Heading, Section, SmallText } from "../../ui/primitives";
import {
  workerArrivalInstructions,
  workerAttendanceHandoff,
  workerCalendarDisplay,
  workerCalendarPrivacy,
  workerConfirmedCalendarFixture,
  workerOfferCalendarFixture
} from "./workerCalendarContent";

type LocalOfferState = "pending" | "accepted" | "declined";

export function WorkerCalendarFixturePreview({ onClose }: Readonly<{ onClose: () => void }>) {
  const [offerState, setOfferState] = useState<LocalOfferState>("pending");

  return (
    <ScrollView style={styles.scroll} testID="worker-calendar-fixture-preview">
      <View style={styles.stack}>
        <Card>
          <SmallText>Fixture workflow preview · not persisted</SmallText>
          <Heading>Worker offer to attendance handoff</Heading>
          <BodyText>
            This local preview is isolated from authenticated offer data and cannot save a response,
            confirm a real assignment, or execute attendance.
          </BodyText>
          <Button label="Back to authenticated calendar" onPress={onClose} variant="secondary" />
        </Card>

        <Section title="Eligible fixture offer">
          <Card>
            <Badge
              label={offerState}
              tone={offerState === "accepted" ? "success" : offerState === "declined" ? "danger" : "warning"}
            />
            <Heading>{workerOfferCalendarFixture.roleLabel}</Heading>
            <SmallText>{workerOfferCalendarFixture.clientDisplayName}</SmallText>
            <BodyText>{workerCalendarDisplay.date}</BodyText>
            <BodyText>{workerCalendarDisplay.hours}</BodyText>
            <BodyText>{workerOfferCalendarFixture.dutiesSummary}</BodyText>
            <SmallText>Qualifications: {workerOfferCalendarFixture.qualifications.join(", ")}</SmallText>
            <Divider />
            <BodyText>{workerCalendarDisplay.wage}</BodyText>
            <BodyText>{workerCalendarDisplay.transportation}</BodyText>
            <BodyText>{workerCalendarDisplay.estimatedEarnings}</BodyText>
            <SmallText>{workerCalendarDisplay.distance}</SmallText>
            <View style={styles.mapPlaceholder}>
              <SmallText>{workerCalendarDisplay.mapPlaceholder}</SmallText>
            </View>
            <Button label="Accept fixture offer" onPress={() => setOfferState("accepted")} />
            <Button label="Decline fixture offer" onPress={() => setOfferState("declined")} variant="secondary" />
            <SmallText>{workerCalendarDisplay.responseBoundary}</SmallText>
          </Card>
        </Section>

        <Section title="Confirmed fixture calendar">
          {offerState === "accepted" ? (
            <Card testID="worker-confirmed-calendar-card">
              <Badge label="confirmed fixture" tone="success" />
              <Heading>{workerConfirmedCalendarFixture.roleLabel}</Heading>
              <BodyText>{workerCalendarDisplay.date}</BodyText>
              <BodyText>{workerCalendarDisplay.hours}</BodyText>
              <SmallText>{workerConfirmedCalendarFixture.locationSummary}</SmallText>
              <Divider />
              <Heading>Arrival instructions</Heading>
              <BodyText>{workerArrivalInstructions.meetingPoint}</BodyText>
              <BodyText>{workerArrivalInstructions.contactRole}</BodyText>
              <SmallText>{workerArrivalInstructions.timing}</SmallText>
              <SmallText>{workerArrivalInstructions.locationBoundary}</SmallText>
              <Divider />
              <Heading>Attendance handoff only</Heading>
              <BodyText>Eligibility: {workerAttendanceHandoff.eligibility}</BodyText>
              <SmallText>Authority: {workerAttendanceHandoff.authority}</SmallText>
              <SmallText>Execution: {workerAttendanceHandoff.attendanceExecution}</SmallText>
              <SmallText>No attendance controls or records are created from this fixture preview.</SmallText>
            </Card>
          ) : (
            <Card>
              <Heading>No confirmed fixture job</Heading>
              <BodyText>Accept the fixture offer to preview the confirmed-calendar handoff.</BodyText>
            </Card>
          )}
        </Section>

        <Section title="Privacy boundary">
          {workerCalendarPrivacy.map((boundary) => (
            <Card key={boundary}><SmallText>{boundary}</SmallText></Card>
          ))}
        </Section>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mapPlaceholder: {
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 92,
    padding: spacing.md
  },
  scroll: { flex: 1 },
  stack: { gap: spacing.lg, padding: spacing.lg }
});
