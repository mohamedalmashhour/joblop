import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import type {
  ShiftCategory,
  ShiftDiscoveryFilters,
  ShiftDiscoveryRepository,
  ShiftUrgency,
  TimeOfDay
} from "@rwos/shared";
import { colors, radii, spacing, touch, typography } from "@rwos/design-system";
import {
  Badge,
  BodyText,
  Button,
  EmptyState,
  ErrorState,
  Heading,
  Input,
  LoadingState,
  ScreenContainer,
  Section,
  SmallText
} from "../../ui/primitives";
import { countActiveFilters, resetFilters } from "./filters";
import { mockShiftDiscoveryRepository } from "./mockShiftDiscoveryRepository";
import type { ShiftDiscoveryState } from "./repository";
import { getShiftDiscoveryState } from "./stateModel";
import { ShiftCard } from "./ShiftCard";

const urgencies: readonly ShiftUrgency[] = ["normal", "urgent", "immediate"];
const times: readonly TimeOfDay[] = ["morning", "afternoon", "evening", "night"];

const workerSearchCapsules: readonly Readonly<{
  category: ShiftCategory;
  experience: readonly string[];
  label: string;
  summary: string;
}>[] = [
  {
    category: "kitchen",
    experience: ["Chef", "Kitchen aide", "Dishwasher", "Food safety", "Working alone"],
    label: "Kitchen",
    summary: "Meal prep, dishwashing, kitchen support, urgent chef coverage."
  },
  {
    category: "care",
    experience: ["Care aide", "PSW support", "Nurse-supervised routines", "Resident support"],
    label: "Care / Nurse",
    summary: "Care shifts where approval, supervision, and credentials may apply."
  },
  {
    category: "housekeeping",
    experience: ["Housekeeping", "Laundry", "Dining support", "Floor service"],
    label: "Helper",
    summary: "General residence support, housekeeping, laundry, and service tasks."
  },
  {
    category: "maintenance",
    experience: ["Maintenance", "Repairs", "Facility support", "Safety checks"],
    label: "Maintenance",
    summary: "Building support and maintenance work where site access may be required."
  }
] as const;

export function AvailableShiftsScreen({
  onOpenShift,
  repository = mockShiftDiscoveryRepository,
  initialState
}: {
  onOpenShift: (shiftId: string) => void;
  repository?: ShiftDiscoveryRepository;
  initialState?: ShiftDiscoveryState;
}) {
  const [filters, setFilters] = useState<ShiftDiscoveryFilters>({ category: "kitchen" });
  const [state, setState] = useState<ShiftDiscoveryState>(initialState ?? { status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [minimumRate, setMinimumRate] = useState("");

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  const selectedCapsule =
    workerSearchCapsules.find((capsule) => capsule.category === filters.category) ??
    workerSearchCapsules[0]!;

  const loadShifts = useCallback(async () => {
    try {
      if (!initialState) setState({ status: "loading" });
      const shifts = await repository.listAvailableShifts(filters);
      setState(getShiftDiscoveryState(shifts, filters));
    } catch {
      setState({
        status: "error",
        message: "Unable to load available shifts from the G01 mock repository."
      });
    }
  }, [filters, initialState, repository]);

  useEffect(() => {
    if (!initialState) void loadShifts();
  }, [initialState, loadShifts]);

  const refresh = async () => {
    setRefreshing(true);
    await loadShifts();
    setRefreshing(false);
  };

  const updateFilter = (nextFilters: ShiftDiscoveryFilters) => {
    setFilters(nextFilters);
    if (initialState) setState({ status: "loading" });
  };

  const resetSearchWithinActiveCapsule = () => {
    setMinimumRate("");
    updateFilter({ ...resetFilters(), category: selectedCapsule.category });
  };

  const setMinimumHourlyRate = (value: string) => {
    setMinimumRate(value);
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      updateFilter({ ...filters, minimumHourlyRateMinor: parsed * 100 });
      return;
    }

    const remainingFilters = Object.fromEntries(
      Object.entries(filters).filter(([key]) => key !== "minimumHourlyRateMinor")
    ) as ShiftDiscoveryFilters;
    updateFilter(remainingFilters);
  };

  return (
    <ScreenContainer testID="available-screen">
      <ScrollView
        refreshControl={<RefreshControl onRefresh={refresh} refreshing={refreshing} />}
        style={styles.scroll}
      >
        <View style={styles.stack}>
          <View style={styles.header}>
            <View>
              <Heading>Available shifts</Heading>
              <SmallText>
                Fixture-backed discovery. Visible shifts are not guaranteed assignments.
              </SmallText>
            </View>
            <Badge
              label={`${activeFilterCount} filters`}
              tone={activeFilterCount > 0 ? "warning" : "neutral"}
            />
          </View>

          <Section title="Search and filters">
            <View style={styles.capsuleHeader}>
              <View style={styles.capsuleTitleColumn}>
                <Heading>Search Work Capsules</Heading>
                <SmallText>
                  Select the group you want to search. This filters visible jobs and lists matching
                  experience areas; it does not approve eligibility or assign the worker.
                </SmallText>
              </View>
              <Badge label={selectedCapsule.label} tone="success" />
            </View>
            <View style={styles.capsuleRail}>
              {workerSearchCapsules.map((capsule) => {
                const isSelected = selectedCapsule.category === capsule.category;
                return (
                  <Pressable
                    accessibilityLabel={`Search ${capsule.label} work`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={capsule.category}
                    onPress={() => updateFilter({ ...filters, category: capsule.category })}
                    style={[styles.searchCapsule, isSelected && styles.searchCapsuleActive]}
                  >
                    <Text
                      style={[
                        styles.searchCapsuleTitle,
                        isSelected && styles.searchCapsuleTitleActive
                      ]}
                    >
                      {capsule.label}
                    </Text>
                    <Text
                      style={[
                        styles.searchCapsuleSummary,
                        isSelected && styles.searchCapsuleSummaryActive
                      ]}
                    >
                      {capsule.summary}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.experiencePanel}>
              <SmallText>Active job search: {selectedCapsule.label}</SmallText>
              <BodyText>{selectedCapsule.summary}</BodyText>
              <SmallText>Experience listed for this worker group</SmallText>
              <View style={styles.experienceList}>
                {selectedCapsule.experience.map((item) => (
                  <Text key={item} style={styles.experienceChip}>
                    {item}
                  </Text>
                ))}
              </View>
            </View>
            <Input
              label="Keyword"
              onChangeText={(keyword) => updateFilter({ ...filters, keyword })}
              placeholder="chef, care, residence"
              value={filters.keyword ?? ""}
            />
            <Input
              label="City"
              onChangeText={(city) => updateFilter({ ...filters, city })}
              placeholder="Montreal"
              value={filters.city ?? ""}
            />
            <Input
              keyboardType="numeric"
              label="Minimum hourly rate"
              onChangeText={setMinimumHourlyRate}
              placeholder="50"
              value={minimumRate}
            />
            <View style={styles.filterRow}>
              {urgencies.map((urgency) => (
                <Button
                  key={urgency}
                  label={urgency}
                  onPress={() => updateFilter({ ...filters, urgency })}
                  variant={filters.urgency === urgency ? "primary" : "secondary"}
                />
              ))}
            </View>
            <View style={styles.filterRow}>
              {times.map((timeOfDay) => (
                <Button
                  key={timeOfDay}
                  label={timeOfDay}
                  onPress={() => updateFilter({ ...filters, timeOfDay })}
                  variant={filters.timeOfDay === timeOfDay ? "primary" : "secondary"}
                />
              ))}
            </View>
            <Input
              label="Date"
              onChangeText={(date) => updateFilter({ ...filters, date })}
              placeholder="2026-07-14"
              value={filters.date ?? ""}
            />
            <Button
              label="Reset filters"
              onPress={resetSearchWithinActiveCapsule}
              variant="secondary"
            />
          </Section>

          {state.status === "loading" ? <LoadingState /> : null}
          {state.status === "error" ? (
            <ErrorState
              action={<Button label="Retry" onPress={loadShifts} testID="retry-shifts" />}
              body={state.message}
              title="Shift discovery unavailable"
            />
          ) : null}
          {state.status === "empty" ? (
            <EmptyState body={state.message} title="No shifts found" />
          ) : null}
          {state.status === "populated" ? (
            <Section title={`${state.shifts.length} open shifts`}>
              {state.shifts.map((shift) => (
                <ShiftCard key={shift.id} onPress={onOpenShift} shift={shift} />
              ))}
            </Section>
          ) : null}

          <BodyText>
            Demo data is local fixture data. A future API repository and eligibility engine will
            replace this mock adapter after review.
          </BodyText>
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
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  capsuleHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  capsuleTitleColumn: {
    flex: 1,
    gap: spacing.xs
  },
  capsuleRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  searchCapsule: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: touch.minimumTarget,
    minWidth: 148,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  searchCapsuleActive: {
    backgroundColor: colors.deepTeal,
    borderColor: colors.deepTeal
  },
  searchCapsuleTitle: {
    color: colors.deepTeal,
    fontSize: typography.small,
    fontWeight: "900"
  },
  searchCapsuleTitleActive: {
    color: colors.cream
  },
  searchCapsuleSummary: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "700"
  },
  searchCapsuleSummaryActive: {
    color: colors.surface
  },
  experiencePanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  experienceList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  experienceChip: {
    backgroundColor: colors.cream,
    borderRadius: radii.pill,
    color: colors.deepTeal,
    fontSize: typography.micro,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  }
});
