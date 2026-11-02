import { Pressable, StyleSheet, View } from "react-native";
import type { ShiftDiscoveryRecord } from "@rwos/shared";
import { colors, spacing, touch } from "../../theme";
import { Badge, BodyText, Card, Heading, SmallText } from "../../ui/primitives";
import { formatDurationHours, formatMoney, formatShiftDate, formatShiftTimeRange } from "./formatters";

export function ShiftCard({
  shift,
  onPress
}: {
  shift: ShiftDiscoveryRecord;
  onPress: (shiftId: string) => void;
}) {
  const urgencyTone =
    shift.urgency === "immediate" ? "danger" : shift.urgency === "urgent" ? "warning" : "success";

  return (
    <Pressable
      accessibilityLabel={`Open ${shift.title} details`}
      accessibilityRole="button"
      onPress={() => onPress(shift.id)}
      style={styles.pressable}
      testID={`shift-card-${shift.id}`}
    >
      <Card>
        <View style={styles.headerRow}>
          <View style={styles.titleColumn}>
            <Heading>{shift.title}</Heading>
            <SmallText>
              {shift.employerName} - {shift.employerRating.toFixed(1)} rating
            </SmallText>
          </View>
          <Badge label={shift.urgency} tone={urgencyTone} />
        </View>
        <BodyText>
          {shift.city} -{" "}
          {shift.distanceKm === null ? "Distance not listed" : `${shift.distanceKm.toFixed(1)} km`}
        </BodyText>
        <SmallText>
          {formatShiftDate(shift.startAt)} - {formatShiftTimeRange(shift)}
        </SmallText>
        <View style={styles.detailGrid}>
          <SmallText>Duration: {formatDurationHours(shift)}</SmallText>
          <SmallText>{formatMoney(shift.hourlyRate)}/hr</SmallText>
          <SmallText>{formatMoney(shift.estimatedTotal)} est.</SmallText>
          <SmallText>
            Travel:{" "}
            {shift.distanceKm === null
              ? "configurable fixture terms"
              : `${shift.distanceKm.toFixed(1)} km, terms configurable`}
          </SmallText>
          <SmallText>{shift.requiredExperienceYears}+ yrs</SmallText>
          <SmallText>
            {shift.requiredCertifications.join(", ") || "No certification listed"}
          </SmallText>
          <SmallText>{shift.requiredLanguages.join(", ")}</SmallText>
          <SmallText>Status: {shift.status}</SmallText>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: touch.minimumTarget
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  titleColumn: {
    flex: 1,
    gap: spacing.xs
  },
  detailGrid: {
    borderColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingTop: spacing.sm
  }
});
