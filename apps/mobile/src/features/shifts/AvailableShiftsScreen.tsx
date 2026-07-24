import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import type {
  ShiftCategory,
  ShiftDiscoveryFilters,
  ShiftDiscoveryRepository,
  ShiftUrgency,
  TimeOfDay
} from "@rwos/shared";
import { spacing } from "@rwos/design-system";
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

const categories: readonly ShiftCategory[] = ["kitchen", "care", "housekeeping", "maintenance"];
const urgencies: readonly ShiftUrgency[] = ["normal", "urgent", "immediate"];
const times: readonly TimeOfDay[] = ["morning", "afternoon", "evening", "night"];

export function AvailableShiftsScreen({
  onOpenShift,
  repository = mockShiftDiscoveryRepository,
  initialState
}: {
  onOpenShift: (shiftId: string) => void;
  repository?: ShiftDiscoveryRepository;
  initialState?: ShiftDiscoveryState;
}) {
  const [filters, setFilters] = useState<ShiftDiscoveryFilters>({});
  const [state, setState] = useState<ShiftDiscoveryState>(initialState ?? { status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [minimumRate, setMinimumRate] = useState("");

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

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
              {categories.map((category) => (
                <Button
                  key={category}
                  label={category}
                  onPress={() => updateFilter({ ...filters, category })}
                  variant={filters.category === category ? "primary" : "secondary"}
                />
              ))}
            </View>
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
              onPress={() => {
                setMinimumRate("");
                updateFilter(resetFilters());
              }}
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
  }
});
