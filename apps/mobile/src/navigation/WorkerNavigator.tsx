import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@rwos/design-system";
import type { MobileSessionTransport } from "../auth/secureSession";
import { WorkerAuthScreen } from "../features/worker-auth";
import { WorkerServiceScreen } from "../features/worker-service";
import type { WorkerServiceMode } from "../features/worker-service/workerServiceContent";
import { WorkerCalendarPanel } from "../features/worker-calendar";
import { MarketplaceJobScreen, MarketplaceSearchScreen } from "../features/marketplace";
import { MyWorkScreen } from "../features/my-work";
import { WorkerScheduleScreen } from "../features/worker-attendance";
import { WorkerTimesheetScreen } from "../features/worker-timesheets";
import type { WorkerTimesheetStage } from "../features/worker-timesheets/workerTimesheetContent";
import { WorkerEarningsScreen } from "../features/worker-earnings";
import { WorkerDashboardHandoffScreen, WorkerOnboardingScreen } from "../features/worker-onboarding";

// The worker app's real navigation shell. A dependency-free stack + bottom-tab navigator (no
// react-navigation / native-screens dependency, to keep the EAS build surface minimal) that mounts
// the already-built feature screens and wires their callbacks into real transitions. Each screen owns
// its own data source and fixture/real disclosure; this shell only routes between them.

type OnboardingKind = "profile" | "qualifications" | "availability" | "review";

type Screen =
  | { name: "home" }
  | { name: "available" }
  | { name: "marketplaceJob"; jobRequestId: string; postalCode: string | null }
  | { name: "myShifts" }
  | { name: "calendar" }
  | { name: "attendance" }
  | { name: "timesheet" }
  | { name: "earnings" }
  | { name: "onboarding"; kind: OnboardingKind }
  | { name: "dashboard" };

type TabId = "home" | "available" | "myShifts" | "calendar" | "earnings";

const TABS: readonly { id: TabId; label: string; root: Screen }[] = [
  { id: "home", label: "Home", root: { name: "home" } },
  { id: "available", label: "Available", root: { name: "available" } },
  { id: "myShifts", label: "My Shifts", root: { name: "myShifts" } },
  { id: "calendar", label: "Calendar", root: { name: "calendar" } },
  { id: "earnings", label: "Earnings", root: { name: "earnings" } }
];

const ONBOARDING_ORDER: readonly OnboardingKind[] = ["profile", "qualifications", "availability", "review"];

export function WorkerNavigator({
  transport,
  offerId,
  authenticated,
  onAuthenticatedChange
}: {
  transport: MobileSessionTransport | null;
  offerId: string | null;
  authenticated: boolean;
  onAuthenticatedChange: (next: boolean) => void;
}) {
  // A deep-linked offer opens the Calendar tab; otherwise the hub.
  const [tab, setTab] = useState<TabId>(offerId ? "calendar" : "home");
  const [stack, setStack] = useState<Screen[]>([offerId ? { name: "calendar" } : { name: "home" }]);
  const [serviceMode, setServiceMode] = useState<WorkerServiceMode>("support");
  const [timesheetStage, setTimesheetStage] = useState<WorkerTimesheetStage>("review");

  const current = stack[stack.length - 1]!;
  const push = useCallback((screen: Screen) => setStack((s) => [...s, screen]), []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const selectTab = useCallback((next: TabId) => {
    const root = TABS.find((t) => t.id === next)!.root;
    setTab(next);
    setStack([root]);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await transport?.signOut();
    } finally {
      onAuthenticatedChange(false);
    }
  }, [transport, onAuthenticatedChange]);

  function renderScreen() {
    switch (current.name) {
      case "home":
        return (
          <WorkerServiceScreen
            mode={serviceMode}
            onOpenMode={setServiceMode}
            onOpenAvailable={() => selectTab("available")}
            onOpenMyShifts={() => selectTab("myShifts")}
            onOpenEarnings={() => selectTab("earnings")}
            onOpenAttendance={() => push({ name: "attendance" })}
            onOpenTimesheet={() => push({ name: "timesheet" })}
            onOpenOnboarding={() => push({ name: "onboarding", kind: "profile" })}
            onOpenProfile={() => push({ name: "dashboard" })}
          />
        );
      case "available":
        return (
          <MarketplaceSearchScreen
            transport={transport}
            onOpenJob={(jobRequestId, postalCode) => push({ name: "marketplaceJob", jobRequestId, postalCode })}
          />
        );
      case "marketplaceJob":
        return (
          <MarketplaceJobScreen
            jobRequestId={current.jobRequestId}
            postalCode={current.postalCode}
            transport={transport}
            onBack={back}
          />
        );
      case "myShifts":
        return <MyWorkScreen transport={transport} onOpenSchedule={() => push({ name: "attendance" })} />;
      case "calendar":
        return <WorkerCalendarPanel allowFixturePreview={false} offerId={offerId} transport={transport} />;
      case "attendance":
        return <WorkerScheduleScreen transport={transport} onBack={back} />;
      case "timesheet":
        return (
          <WorkerTimesheetScreen
            onBack={back}
            onOpenEarnings={() => selectTab("earnings")}
            onSelectStage={setTimesheetStage}
            stage={timesheetStage}
          />
        );
      case "earnings":
        return (
          <WorkerEarningsScreen
            transport={transport}
            onOpenSupport={() => {
              setServiceMode("support");
              selectTab("home");
            }}
          />
        );
      case "onboarding":
        return (
          <WorkerOnboardingScreen
            kind={current.kind}
            onBack={back}
            onNext={() => {
              const idx = ONBOARDING_ORDER.indexOf(current.kind);
              const next = ONBOARDING_ORDER[idx + 1];
              push(next ? { name: "onboarding", kind: next } : { name: "dashboard" });
            }}
          />
        );
      case "dashboard":
        return (
          <WorkerDashboardHandoffScreen
            onOpenAvailable={() => selectTab("available")}
            onOpenProfile={() => push({ name: "onboarding", kind: "review" })}
          />
        );
      default: {
        const _exhaustive: never = current;
        return _exhaustive;
      }
    }
  }

  // Auth gate: unauthenticated workers see sign-in; "back" lets them browse the fixture-disclosed app
  // as a guest (discovery/earnings/etc. are self-disclosed previews; the calendar states when a sign-in
  // is required).
  if (!authenticated) {
    return (
      <WorkerAuthScreen
        transport={transport}
        onAuthenticated={() => onAuthenticatedChange(true)}
        onBack={() => onAuthenticatedChange(true)}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>{TABS.find((t) => t.id === tab)?.label ?? "JobLop"}</Text>
        <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
      <View style={styles.body}>{renderScreen()}</View>
      <View accessibilityRole="tablist" style={styles.tabBar}>
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={t.id}
              onPress={() => selectTab(t.id)}
              style={styles.tab}
            >
              <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.surfaceSubtle,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  topTitle: { color: colors.deepTeal, fontSize: typography.body, fontWeight: "800" },
  signOut: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  signOutText: { color: colors.actionTeal, fontSize: typography.small, fontWeight: "700" },
  body: { flex: 1 },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.surfaceSubtle,
    borderTopWidth: 1,
    flexDirection: "row"
  },
  tab: { alignItems: "center", flex: 1, paddingVertical: spacing.sm },
  tabLabel: { color: colors.muted, fontSize: typography.small, fontWeight: "600" },
  tabLabelActive: { color: colors.deepTeal, fontWeight: "800" }
});
