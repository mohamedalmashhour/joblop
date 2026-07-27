import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { colors, spacing } from "@rwos/design-system";
import { Badge, BodyText, Button, Card, Divider, Heading, Section, SmallText } from "../../ui/primitives";
import {
  workerCalendarDisplay,
  workerCalendarPrivacy,
  workerArrivalInstructions,
  workerAttendanceHandoff,
  workerConfirmedCalendarFixture,
  workerOfferCalendarFixture
} from "./workerCalendarContent";

type LocalOfferState = "pending" | "accepted" | "declined";

export function WorkerCalendarPanel() {
  const [offerState, setOfferState] = useState<LocalOfferState>("pending");

  return (
    <ScrollView style={styles.scroll} testID="worker-connected-calendar">
      <View style={styles.stack}>
        <Card>
          <SmallText>Connected calendar</SmallText>
          <Heading>Worker offers</Heading>
          <BodyText>
            Review eligible offers and confirmed jobs using worker-authorized details only.
          </BodyText>
        </Card>

        <Section title="Eligible offer">
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
            <SmallText>
              Qualifications: {workerOfferCalendarFixture.qualifications.join(", ")}
            </SmallText>
            <Divider />
            <BodyText>{workerCalendarDisplay.wage}</BodyText>
            <BodyText>{workerCalendarDisplay.transportation}</BodyText>
            <BodyText>{workerCalendarDisplay.estimatedEarnings}</BodyText>
            <SmallText>{workerCalendarDisplay.distance}</SmallText>
            <View style={styles.mapPlaceholder}>
              <SmallText>{workerCalendarDisplay.mapPlaceholder}</SmallText>
            </View>
            <Button label="Accept fixture offer" onPress={() => setOfferState("accepted")} />
            <Button
              label="Decline fixture offer"
              onPress={() => setOfferState("declined")}
              variant="secondary"
            />
            <SmallText>{workerCalendarDisplay.responseBoundary}</SmallText>
          </Card>
        </Section>

        <Section title="Confirmed calendar">
          {offerState === "accepted" ? (
            <Card testID="worker-confirmed-calendar-card">
              <Badge label="confirmed" tone="success" />
              <Heading>{workerConfirmedCalendarFixture.roleLabel}</Heading>
              <BodyText>{workerCalendarDisplay.date}</BodyText>
              <BodyText>{workerCalendarDisplay.hours}</BodyText>
              <SmallText>{workerConfirmedCalendarFixture.locationSummary}</SmallText>
              <SmallText>
                Confirmation is a calendar projection of the fixture Assignment.
              </SmallText>
              <Divider />
              <Heading>Arrival instructions</Heading>
              <BodyText>{workerArrivalInstructions.meetingPoint}</BodyText>
              <BodyText>{workerArrivalInstructions.contactRole}</BodyText>
              <SmallText>{workerArrivalInstructions.timing}</SmallText>
              <SmallText>{workerArrivalInstructions.locationBoundary}</SmallText>
              <Divider />
              <Heading>Attendance handoff</Heading>
              <BodyText>Eligibility: {workerAttendanceHandoff.eligibility}</BodyText>
              <SmallText>Authority: {workerAttendanceHandoff.authority}</SmallText>
              <SmallText>Execution: {workerAttendanceHandoff.attendanceExecution}</SmallText>
              <SmallText>
                No attendance controls or records are created from this calendar projection.
              </SmallText>
            </Card>
          ) : (
            <Card>
              <Heading>No new confirmed fixture job</Heading>
              <BodyText>Accept the fixture offer to preview its confirmed-calendar state.</BodyText>
            </Card>
          )}
        </Section>

        <Section title="Privacy boundary">
          {workerCalendarPrivacy.map((boundary) => (
            <Card key={boundary}>
              <SmallText>{boundary}</SmallText>
            </Card>
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
  scroll: {
    flex: 1
  },
  stack: {
    gap: spacing.lg,
    padding: spacing.lg
  }
});
