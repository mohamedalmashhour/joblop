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

type WorkerLearningCapsule = {
  experience: string;
  groupLabel: string;
  title: string;
};

const urgencies: readonly ShiftUrgency[] = ["normal", "urgent", "immediate"];
const times: readonly TimeOfDay[] = ["morning", "afternoon", "evening", "night"];
const quebecMinimumWage = {
  amount: 16.6,
  effectiveDate: "May 1, 2026",
  source: "CNESST / Gouvernement du Quebec"
} as const;

const workerSearchCapsules: readonly Readonly<{
  category: ShiftCategory;
  code: string;
  label: string;
  specialties: readonly Readonly<{
    description: string;
    experience: readonly string[];
    id: string;
    keyword: string;
    label: string;
    medianHourlyWage: number;
    wageOccupation: string;
    wageSource: string;
  }>[];
  summary: string;
}>[] = [
  {
    category: "kitchen",
    code: "K",
    label: "Kitchen",
    specialties: [
      {
        description: "Chef shifts where the worker may need to handle meal service independently.",
        experience: ["Menu review", "Hot meal service", "Food safety", "Working alone"],
        id: "kitchen-chef",
        keyword: "chef",
        label: "Chef",
        medianHourlyWage: 18,
        wageOccupation: "Cook in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      },
      {
        description: "Kitchen aide support for prep, service, cleanup, and supervisor-led work.",
        experience: ["Prep support", "Dishwasher", "Kitchen cleanup", "Supervisor on site"],
        id: "kitchen-aide",
        keyword: "kitchen",
        label: "Kitchen aide",
        medianHourlyWage: 16.6,
        wageOccupation: "Food counter attendants, kitchen helpers and related support occupations in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      },
      {
        description: "Waiter and waitress shifts for meal service, dining-room setup, and resident service.",
        experience: ["Dining-room service", "Meal delivery", "Table setup", "Resident-facing service"],
        id: "kitchen-waitress",
        keyword: "waitress",
        label: "Waiter / waitress",
        medianHourlyWage: 20,
        wageOccupation: "Waiter/waitress in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      },
      {
        description: "Dietary aide work for tray preparation, texture-modified meals, and service support.",
        experience: ["Tray prep", "Dietary notes", "Texture-modified meals", "Meal service support"],
        id: "kitchen-dietary-aide",
        keyword: "dietary",
        label: "Dietary aide",
        medianHourlyWage: 16.6,
        wageOccupation: "Food counter attendants, kitchen helpers and related support occupations in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      },
      {
        description: "Prep cook shifts for batch preparation, ingredient setup, and supervised cooking.",
        experience: ["Batch prep", "Ingredient setup", "Safe food handling", "Recipe support"],
        id: "kitchen-prep-cook",
        keyword: "prep cook",
        label: "Prep cook",
        medianHourlyWage: 18,
        wageOccupation: "Cook in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      }
    ],
    summary: "Meal prep, dishwashing, kitchen support, urgent chef coverage."
  },
  {
    category: "care",
    code: "C",
    label: "Care / Nurse",
    specialties: [
      {
        description: "Care aide shifts for resident routines with appropriate supervision.",
        experience: ["Evening care routine", "Resident support", "Handoff notes", "PDSB / CPR"],
        id: "care-aide",
        keyword: "care",
        label: "Care aide",
        medianHourlyWage: 25.1,
        wageOccupation: "Nurse aide in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      },
      {
        description: "Nurse-support work where the worker follows site direction and credentials apply.",
        experience: ["Nurse supervisor", "Resident handoff", "Care team coordination"],
        id: "care-nurse-support",
        keyword: "nurse",
        label: "Nurse support",
        medianHourlyWage: 25.1,
        wageOccupation: "Nurse aide in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      },
      {
        description: "Companion support shifts for non-clinical resident presence and daily routine help.",
        experience: ["Companionship", "Activity support", "Meal reminders", "Non-clinical help"],
        id: "care-companion",
        keyword: "companion",
        label: "Companion",
        medianHourlyWage: 25.1,
        wageOccupation: "Nurse aide in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      },
      {
        description: "Recreation support for activities, resident programs, and supervised group assistance.",
        experience: ["Activity setup", "Group support", "Resident engagement", "Program cleanup"],
        id: "care-recreation",
        keyword: "recreation",
        label: "Recreation aide",
        medianHourlyWage: 25.1,
        wageOccupation: "Nurse aide in Quebec",
        wageSource: "Job Bank proxy reference, updated November 19, 2025"
      }
    ],
    summary: "Care shifts where approval, supervision, and credentials may apply."
  },
  {
    category: "housekeeping",
    code: "H",
    label: "Helper",
    specialties: [
      {
        description: "Housekeeping shifts for room turnover, common areas, and supplies.",
        experience: ["Room turnover", "Common-area cleaning", "Supply reporting"],
        id: "helper-housekeeping",
        keyword: "housekeeping",
        label: "Housekeeping",
        medianHourlyWage: 20.47,
        wageOccupation: "Light duty cleaner in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      },
      {
        description: "Residence support work for dining, laundry, and floor-service assistance.",
        experience: ["Dining support", "Laundry", "Floor service", "General residence help"],
        id: "helper-service",
        keyword: "support",
        label: "Service helper",
        medianHourlyWage: 16.6,
        wageOccupation: "Food counter attendants, kitchen helpers and related support occupations in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      },
      {
        description: "Laundry shifts for linens, resident laundry handling, folding, and cart restocking.",
        experience: ["Laundry sorting", "Linen carts", "Folding", "Restocking"],
        id: "helper-laundry",
        keyword: "laundry",
        label: "Laundry",
        medianHourlyWage: 20.47,
        wageOccupation: "Light duty cleaner in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      },
      {
        description: "Reception support for visitor routing, calls, front-desk notes, and basic admin help.",
        experience: ["Front desk", "Visitor routing", "Phone support", "Admin notes"],
        id: "helper-reception",
        keyword: "reception",
        label: "Reception",
        medianHourlyWage: 22,
        wageOccupation: "Receptionist in Quebec",
        wageSource: "Job Bank wage reference"
      },
      {
        description: "Security support for controlled access, sign-in monitoring, and site patrol assistance.",
        experience: ["Access control", "Visitor log", "Site patrol", "Incident notes"],
        id: "helper-security",
        keyword: "security",
        label: "Security",
        medianHourlyWage: 22,
        wageOccupation: "Security guard in Quebec",
        wageSource: "Job Bank wage reference"
      }
    ],
    summary: "General residence support, housekeeping, laundry, and service tasks."
  },
  {
    category: "maintenance",
    code: "M",
    label: "Maintenance",
    specialties: [
      {
        description: "Maintenance work for repairs, facility checks, and building support.",
        experience: ["Repairs", "Facility support", "Safety checks", "Site access"],
        id: "maintenance-repairs",
        keyword: "maintenance",
        label: "Repairs",
        medianHourlyWage: 25,
        wageOccupation: "Maintenance person - building in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      },
      {
        description: "Electrical maintenance support for lighting, basic troubleshooting, and safe escalation.",
        experience: ["Lighting", "Electrical troubleshooting", "Breaker awareness", "Escalation notes"],
        id: "maintenance-electrician",
        keyword: "electrician",
        label: "Electrician",
        medianHourlyWage: 41.3,
        wageOccupation: "Electrician in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      },
      {
        description: "Plumbing support for leaks, fixtures, drains, and maintenance coordination.",
        experience: ["Leak checks", "Fixture repair", "Drain support", "Water shutoff awareness"],
        id: "maintenance-plumber",
        keyword: "plumber",
        label: "Plumber",
        medianHourlyWage: 40,
        wageOccupation: "Plumber in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      },
      {
        description: "Painting shifts for touch-ups, room refreshes, patch prep, and safe cleanup.",
        experience: ["Wall prep", "Paint touch-ups", "Room refresh", "Safe cleanup"],
        id: "maintenance-painter",
        keyword: "painter",
        label: "Painter",
        medianHourlyWage: 34.98,
        wageOccupation: "Painter in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      },
      {
        description: "Grounds and facility work for exterior checks, simple repairs, and seasonal support.",
        experience: ["Grounds support", "Exterior checks", "Seasonal cleanup", "Facility notes"],
        id: "maintenance-grounds",
        keyword: "grounds",
        label: "Grounds / facility",
        medianHourlyWage: 25,
        wageOccupation: "Maintenance person - building in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      },
      {
        description: "Urgent facility support where timing, safety, and access need review.",
        experience: ["Urgent response", "Building support", "Safety review"],
        id: "maintenance-urgent",
        keyword: "facility",
        label: "Urgent facility",
        medianHourlyWage: 25,
        wageOccupation: "Maintenance person - building in Quebec",
        wageSource: "Job Bank, updated November 19, 2025"
      }
    ],
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
  const [filters, setFilters] = useState<ShiftDiscoveryFilters>({
    category: "kitchen",
    keyword: "chef"
  });
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState("kitchen-chef");
  const [state, setState] = useState<ShiftDiscoveryState>(initialState ?? { status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [minimumRate, setMinimumRate] = useState("");
  const [workerLearningCapsules, setWorkerLearningCapsules] = useState<WorkerLearningCapsule[]>([]);
  const [workerLearningExperience, setWorkerLearningExperience] = useState("");
  const [workerLearningTitle, setWorkerLearningTitle] = useState("");

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  const selectedCapsule =
    workerSearchCapsules.find((capsule) => capsule.category === filters.category) ??
    workerSearchCapsules[0]!;
  const selectedSpecialty =
    selectedCapsule.specialties.find((specialty) => specialty.id === selectedSpecialtyId) ??
    selectedCapsule.specialties[0]!;

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

  const selectCapsule = (capsule: (typeof workerSearchCapsules)[number]) => {
    const firstSpecialty = capsule.specialties[0]!;
    setSelectedSpecialtyId(firstSpecialty.id);
    updateFilter({
      ...filters,
      category: capsule.category,
      keyword: firstSpecialty.keyword
    });
  };

  const selectSpecialty = (specialty: (typeof selectedCapsule.specialties)[number]) => {
    setSelectedSpecialtyId(specialty.id);
    updateFilter({
      ...filters,
      category: selectedCapsule.category,
      keyword: specialty.keyword
    });
  };

  const applyAiSuggestedSearch = () => {
    const suggestedRate = Math.max(
      selectedSpecialty.medianHourlyWage,
      quebecMinimumWage.amount
    );
    const suggestedFilters: ShiftDiscoveryFilters = {
      ...filters,
      category: selectedCapsule.category,
      keyword: selectedSpecialty.keyword,
      minimumHourlyRateMinor: Math.round(suggestedRate * 100),
      ...(selectedCapsule.category === "kitchen" ? { urgency: "immediate" as const } : {}),
      ...(selectedCapsule.category === "care" ? { timeOfDay: "evening" as const } : {})
    };

    setMinimumRate(String(suggestedRate));
    updateFilter(suggestedFilters);
  };

  const saveWorkerLearningCapsule = () => {
    const title = workerLearningTitle.trim();
    if (!title) return;

    setWorkerLearningCapsules((current) => [
      ...current,
      {
        experience:
          workerLearningExperience.trim() ||
          "Worker-described experience pending verification and profile review.",
        groupLabel: selectedCapsule.label,
        title
      }
    ]);
    setWorkerLearningTitle("");
    setWorkerLearningExperience("");
  };

  const resetSearchWithinActiveCapsule = () => {
    setMinimumRate("");
    updateFilter({
      ...resetFilters(),
      category: selectedCapsule.category,
      keyword: selectedSpecialty.keyword
    });
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

          <View style={styles.searchHero}>
            <View style={styles.heroCopy}>
              <SmallText>Worker job search</SmallText>
              <Text style={styles.heroTitle}>Find the right work capsule first.</Text>
              <Text style={styles.heroBody}>
                Choose a group, narrow to a specialty, review experience, then apply safe AI
                guidance only when it helps.
              </Text>
            </View>
            <View style={styles.heroFocusCard}>
              <Text style={styles.heroFocusCode}>{selectedCapsule.code}</Text>
              <Text style={styles.heroFocusTitle}>{selectedSpecialty.label}</Text>
              <SmallText>{selectedCapsule.label}</SmallText>
            </View>
          </View>

          <View style={styles.searchFlow}>
            {["Group", "Specialty", "Experience", "AI filter"].map((step, index) => (
              <View key={step} style={styles.flowStep}>
                <Text style={styles.flowNumber}>{index + 1}</Text>
                <Text style={styles.flowLabel}>{step}</Text>
              </View>
            ))}
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
                    onPress={() => selectCapsule(capsule)}
                    style={[styles.searchCapsule, isSelected && styles.searchCapsuleActive]}
                  >
                    <Text
                      style={[
                        styles.searchCapsuleCode,
                        isSelected && styles.searchCapsuleCodeActive
                      ]}
                    >
                      {capsule.code}
                    </Text>
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
                    <Text
                      style={[
                        styles.searchCapsuleCount,
                        isSelected && styles.searchCapsuleCountActive
                      ]}
                    >
                      {capsule.specialties.length} job types
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.specialtyPanel}>
              <SmallText>Narrow by specialty</SmallText>
              <View style={styles.specialtyRail}>
                {selectedCapsule.specialties.map((specialty) => {
                  const isSelected = selectedSpecialty.id === specialty.id;
                  return (
                    <Pressable
                      accessibilityLabel={`Select ${specialty.label} specialty`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={specialty.id}
                      onPress={() => selectSpecialty(specialty)}
                      style={[styles.specialtyCapsule, isSelected && styles.specialtyCapsuleActive]}
                    >
                      <Text
                        style={[
                          styles.specialtyCapsuleText,
                          isSelected && styles.specialtyCapsuleTextActive
                        ]}
                      >
                        {specialty.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.experiencePanel}>
              <SmallText>Active job search: {selectedCapsule.label}</SmallText>
              <BodyText>{selectedSpecialty.description}</BodyText>
              <View style={styles.selectedSummaryGrid}>
                <View style={styles.selectedSummaryItem}>
                  <SmallText>Specialty</SmallText>
                  <Text style={styles.selectedSummaryValue}>{selectedSpecialty.label}</Text>
                </View>
                <View style={styles.selectedSummaryItem}>
                  <SmallText>Keyword</SmallText>
                  <Text style={styles.selectedSummaryValue}>{selectedSpecialty.keyword}</Text>
                </View>
                <View style={styles.selectedSummaryItem}>
                  <SmallText>Median</SmallText>
                  <Text style={styles.selectedSummaryValue}>
                    ${selectedSpecialty.medianHourlyWage.toFixed(2)}/hr
                  </Text>
                </View>
              </View>
              <SmallText>Experience listed for {selectedSpecialty.label}</SmallText>
              <View style={styles.experienceList}>
                {selectedSpecialty.experience.map((item) => (
                  <Text key={item} style={styles.experienceChip}>
                    {item}
                  </Text>
                ))}
              </View>
            </View>
            <View style={styles.aiPanel}>
              <SmallText>AI Search Assistant</SmallText>
              <Heading>Suggested search brain</Heading>
              <BodyText>
                AI can suggest filters from your active capsule and specialty. It does not apply,
                accept, assign, or guarantee work unless you choose the suggestion.
              </BodyText>
              <View style={styles.aiEvidenceList}>
                <SmallText>Group: {selectedCapsule.label}</SmallText>
                <SmallText>Specialty: {selectedSpecialty.label}</SmallText>
                <SmallText>Suggested keyword: {selectedSpecialty.keyword}</SmallText>
                <SmallText>
                  Quebec minimum wage: ${quebecMinimumWage.amount.toFixed(2)}/hr effective{" "}
                  {quebecMinimumWage.effectiveDate}
                </SmallText>
                <SmallText>
                  Median reference: ${selectedSpecialty.medianHourlyWage.toFixed(2)}/hr -{" "}
                  {selectedSpecialty.wageOccupation}
                </SmallText>
                <SmallText>Source: {selectedSpecialty.wageSource}</SmallText>
              </View>
              <Button
                label="Apply AI wage-aware filters"
                onPress={applyAiSuggestedSearch}
                variant="secondary"
              />
              <SmallText>
                Wage guidance is informational. Final shift compensation depends on approved shift
                terms and governed employer/worker workflows.
              </SmallText>
            </View>
            <View style={styles.learningPanel}>
              <SmallText>Worker learning capsule</SmallText>
              <Heading>Add experience AI should consider later</Heading>
              <BodyText>
                Save experience that is missing from the capsule list. This is local learning input
                only; it does not verify credentials, update the profile, or train production AI.
              </BodyText>
              <Input
                label="Experience capsule"
                onChangeText={setWorkerLearningTitle}
                placeholder="Example: pastry, HVAC, dementia support"
                value={workerLearningTitle}
              />
              <Input
                label="Experience details"
                onChangeText={setWorkerLearningExperience}
                placeholder="Tools, years, setting, language, supervisor context"
                value={workerLearningExperience}
              />
              <Button
                label="Save worker capsule locally"
                onPress={saveWorkerLearningCapsule}
                variant={workerLearningTitle.trim() ? "secondary" : "primary"}
              />
              <View style={styles.experienceList}>
                {workerLearningCapsules.map((capsule) => (
                  <View key={`${capsule.groupLabel}-${capsule.title}`} style={styles.learningCard}>
                    <Text style={styles.learningTitle}>{capsule.title}</Text>
                    <SmallText>{capsule.groupLabel}</SmallText>
                    <SmallText>{capsule.experience}</SmallText>
                  </View>
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
  searchHero: {
    backgroundColor: colors.deepTeal,
    borderRadius: radii.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.lg
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 220
  },
  heroTitle: {
    color: colors.cream,
    fontSize: typography.title,
    fontWeight: "900",
    lineHeight: 32
  },
  heroBody: {
    color: colors.surface,
    fontSize: typography.body,
    lineHeight: 22
  },
  heroFocusCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 136,
    minWidth: 132,
    padding: spacing.md
  },
  heroFocusCode: {
    color: colors.deepTeal,
    fontSize: 42,
    fontWeight: "900"
  },
  heroFocusTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
    textAlign: "center"
  },
  searchFlow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  flowStep: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: touch.minimumTarget,
    paddingHorizontal: spacing.md
  },
  flowNumber: {
    backgroundColor: colors.deepTeal,
    borderRadius: radii.pill,
    color: colors.cream,
    fontSize: typography.micro,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  flowLabel: {
    color: colors.deepTeal,
    fontSize: typography.small,
    fontWeight: "900"
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
  searchCapsuleCode: {
    alignSelf: "flex-start",
    backgroundColor: colors.deepTeal,
    borderRadius: radii.pill,
    color: colors.cream,
    fontSize: typography.small,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  searchCapsuleCodeActive: {
    backgroundColor: colors.surfaceRaised,
    color: colors.deepTeal
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
  searchCapsuleCount: {
    backgroundColor: colors.cream,
    borderRadius: radii.pill,
    color: colors.deepTeal,
    fontSize: typography.micro,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  searchCapsuleCountActive: {
    backgroundColor: colors.surfaceRaised
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
  },
  selectedSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  selectedSummaryItem: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 120,
    padding: spacing.sm
  },
  selectedSummaryValue: {
    color: colors.deepTeal,
    fontSize: typography.small,
    fontWeight: "900",
    marginTop: spacing.xs
  },
  specialtyPanel: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  specialtyRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  specialtyCapsule: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: touch.minimumTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  specialtyCapsuleActive: {
    backgroundColor: colors.deepTeal,
    borderColor: colors.deepTeal
  },
  specialtyCapsuleText: {
    color: colors.deepTeal,
    fontSize: typography.small,
    fontWeight: "900"
  },
  specialtyCapsuleTextActive: {
    color: colors.cream
  },
  aiPanel: {
    backgroundColor: "#f0fff8",
    borderColor: colors.success,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  aiEvidenceList: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm
  },
  learningPanel: {
    backgroundColor: colors.cream,
    borderColor: colors.warning,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  learningCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    minWidth: 160,
    padding: spacing.sm
  },
  learningTitle: {
    color: colors.deepTeal,
    fontSize: typography.small,
    fontWeight: "900"
  }
});
