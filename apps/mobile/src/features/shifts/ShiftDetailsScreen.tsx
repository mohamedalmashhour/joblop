import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { ShiftDiscoveryRecord, ShiftDiscoveryRepository } from "@rwos/shared";
import { spacing } from "@rwos/design-system";
import {
  Badge,
  BodyText,
  Button,
  Card,
  Divider,
  ErrorState,
  Heading,
  LoadingState,
  ScreenContainer,
  Section,
  SmallText
} from "../../ui/primitives";
import {
  formatDurationHours,
  formatMoney,
  formatShiftDate,
  formatShiftTimeRange
} from "./formatters";
import { mockShiftDiscoveryRepository } from "./mockShiftDiscoveryRepository";
import { getUnavailableApplicationsMessage } from "./stateModel";
import {
  getEligibilitySummary,
  workerShiftBoundaries,
  workerShiftDataTruth
} from "./workerShiftDiscoveryContent";

export function ShiftDetailsScreen({
  shiftId,
  onApply,
  onBack,
  repository = mockShiftDiscoveryRepository
}: {
  shiftId: string;
  onApply?: (shiftId: string) => void;
  onBack: () => void;
  repository?: ShiftDiscoveryRepository;
}) {
  const [shift, setShift] = useState<ShiftDiscoveryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadShift() {
      try {
        setLoading(true);
        const record = await repository.getShiftById(shiftId);
        if (!mounted) return;
        setShift(record);
        setError(record ? null : "The requested shift was not found in the G01 mock data.");
      } catch {
        if (mounted) setError("Unable to load shift details from the G01 mock repository.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadShift();

    return () => {
      mounted = false;
    };
  }, [repository, shiftId]);

  if (loading) {
    return (
      <ScreenContainer>
        <Button label="Back" onPress={onBack} variant="secondary" />
        <LoadingState label="Loading shift details" />
      </ScreenContainer>
    );
  }

  if (error || !shift) {
    return (
      <ScreenContainer>
        <Button label="Back" onPress={onBack} variant="secondary" />
        <ErrorState body={error ?? "Unknown shift details error."} title="Shift not available" />
      </ScreenContainer>
    );
  }

  const urgencyTone =
    shift.urgency === "immediate" ? "danger" : shift.urgency === "urgent" ? "warning" : "success";
  const eligibilitySummary = getEligibilitySummary({
    hasRequiredCertifications: shift.requiredCertifications.length > 0,
    hasScheduleConflict: false
  });

  return (
    <ScreenContainer testID="shift-details-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Button label="Back to available shifts" onPress={onBack} variant="secondary" />
          <Card>
            <View style={styles.header}>
              <View style={styles.titleColumn}>
                <Heading>{shift.title}</Heading>
                <SmallText>
                  {shift.employerName} - {shift.employerRating.toFixed(1)} rating
                </SmallText>
              </View>
              <Badge label={shift.urgency} tone={urgencyTone} />
            </View>
            <Divider />
            <BodyText>
              {shift.city}, {shift.province} - {shift.addressSummary}
            </BodyText>
            <SmallText>
              {formatShiftDate(shift.startAt)} - {formatShiftTimeRange(shift)} -{" "}
              {formatDurationHours(shift)}
            </SmallText>
          </Card>

          <Section title="Compensation shown to worker">
            <Card>
              <BodyText>{formatMoney(shift.hourlyRate)}/hr</BodyText>
              <SmallText>
                {formatMoney(shift.estimatedTotal)} estimated worker-facing total
              </SmallText>
            </Card>
          </Section>

          <Section title="Work details">
            <Card>
              <BodyText>{shift.description}</BodyText>
              <SmallText>Role: {shift.category}</SmallText>
              <SmallText>Department: fixture department aligned to role</SmallText>
              <SmallText>Timezone: local fixture timezone</SmallText>
              <SmallText>Experience: {shift.requiredExperienceYears}+ years</SmallText>
              <SmallText>
                Certifications: {shift.requiredCertifications.join(", ") || "None listed"}
              </SmallText>
              <SmallText>Worker count: fixture requirement not live capacity</SmallText>
              <SmallText>Urgent premium: included only where configured in fixture data</SmallText>
              <SmallText>Transport terms: worker confirms travel before applying</SmallText>
              <SmallText>Travel terms: allowance shown only when configured</SmallText>
              <SmallText>Languages: {shift.requiredLanguages.join(", ")}</SmallText>
              <SmallText>Dress code: {shift.dressCode}</SmallText>
              <SmallText>Break policy: {shift.breakPolicy}</SmallText>
              <SmallText>Cancellation: {shift.cancellationPolicy}</SmallText>
              <SmallText>
                Application deadline: {formatShiftDate(shift.applicationDeadline)}
              </SmallText>
              <SmallText>Status: {shift.status}</SmallText>
            </Card>
          </Section>

          <Section title="Eligibility summary">
            <Card>
              <Heading>Eligibility is not guaranteed</Heading>
              <BodyText>{eligibilitySummary}</BodyText>
              <SmallText>Data freshness: fixture updated {formatShiftDate(shift.updatedAt)}</SmallText>
              {workerShiftBoundaries.map((boundary) => (
                <SmallText key={boundary}>- {boundary}</SmallText>
              ))}
            </Card>
          </Section>

          <Section title="Data source">
            <Card>
              {workerShiftDataTruth.map((truth) => (
                <SmallText key={truth}>- {truth}</SmallText>
              ))}
            </Card>
          </Section>

          <Section title="Duties">
            <Card>
              {shift.duties.map((duty) => (
                <SmallText key={duty}>- {duty}</SmallText>
              ))}
            </Card>
          </Section>

          <Section title="Worker application">
            <Card>
              <Heading>Apply for this shift</Heading>
              <BodyText>
                Review the worker-facing compensation, schedule and duties before submitting your
                application. Employer approval and final confirmation happen after this step.
              </BodyText>
              {onApply ? (
                <Button
                  label="Review application"
                  onPress={() => onApply(shift.id)}
                  testID="apply-shift"
                />
              ) : (
                <SmallText>{getUnavailableApplicationsMessage()}</SmallText>
              )}
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
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  titleColumn: {
    flex: 1,
    gap: spacing.xs
  }
});
