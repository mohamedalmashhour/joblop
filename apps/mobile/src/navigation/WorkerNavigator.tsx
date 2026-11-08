import { useCallback, useState } from "react";
import { useLocale } from "../i18n/LocaleContext";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme";
import type { MobileSessionTransport } from "../auth/secureSession";
import { WorkerAuthScreen } from "../features/worker-auth";
import { HomeScreen } from "../features/home";
import { WorkerCalendarPanel } from "../features/worker-calendar";
import { MonthCalendarScreen } from "../features/calendar-month";
import { MarketplaceJobScreen, MarketplaceSearchScreen } from "../features/marketplace";
import { JobsCalendarScreen } from "../features/jobs-calendar";
import { MyWorkScreen } from "../features/my-work";
import { WorkerScheduleScreen } from "../features/worker-attendance";
import { WorkerTimesheetListScreen } from "../features/worker-timesheets";
import { WorkerEarningsScreen } from "../features/worker-earnings";
import { WorkerSetupScreen } from "../features/worker-onboarding";
import { ContactScreen, type ContactDraft } from "../features/contact";

// The worker app's real navigation shell. A dependency-free stack + bottom-tab navigator (no
// react-navigation / native-screens dependency, to keep the EAS build surface minimal) that mounts
// the already-built feature screens and wires their callbacks into real transitions. Each screen owns
// its own data source and fixture/real disclosure; this shell only routes between them.


type Screen =
  | { name: "home" }
  | { name: "available" }
  | { name: "marketplaceSearch" }
  | { name: "marketplaceJob"; jobRequestId: string; postalCode: string | null }
  | { name: "myShifts" }
  | { name: "calendar" }
  | { name: "offers" }
  | { name: "attendance" }
  | { name: "timesheet" }
  | { name: "earnings" }
  | { name: "onboarding" }
  | { name: "contact"; draft: ContactDraft | null };

type TabId = "home" | "available" | "myShifts" | "calendar" | "earnings" | "contact";

const TABS: readonly { id: TabId; label: string; root: Screen }[] = [
  { id: "home", label: "Home", root: { name: "home" } },
  { id: "available", label: "My calendar", root: { name: "available" } },
  { id: "myShifts", label: "My Shifts", root: { name: "myShifts" } },
  { id: "earnings", label: "Earnings", root: { name: "earnings" } },
  { id: "contact", label: "Contact", root: { name: "contact", draft: null } }
];


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
  const { t: tr } = useLocale();
  // One calendar (owner rule): the worker opens on "My calendar". A deep-linked offer opens the offer
  // on top of it so the existing accept flow still works, and Back returns to the calendar.
  const [tab, setTab] = useState<TabId>("available");
  const [stack, setStack] = useState<Screen[]>(offerId ? [{ name: "available" }, { name: "calendar" }] : [{ name: "available" }]);

  const current = stack[stack.length - 1]!;
  const push = useCallback((screen: Screen) => setStack((s) => [...s, screen]), []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const selectTab = useCallback((requested: TabId) => {
    // The old separate "Calendar" tab is now part of "My calendar".
    const next: TabId = requested === "calendar" ? "available" : requested;
    const root = TABS.find((t) => t.id === next)!.root;
    setTab(next);
    setStack([root]);
  }, []);
  // "Contact Joblop about this shift": open the Contact tab with a prefilled new message.
  const contactWith = useCallback((draft: ContactDraft) => {
    setTab("contact");
    setStack([{ name: "contact", draft }]);
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
          <HomeScreen
            authenticated={authenticated}
            onOpen={(destination) => {
              if (destination === "onboarding") push({ name: "onboarding" });
              else selectTab(destination);
            }}
          />
        );
      case "available":
        // "My calendar" hub (GET /worker/calendar-hub): open jobs with Accept, my shifts, cancelled
        // shifts, pay days and a Today panel on one month calendar.
        return (
          <JobsCalendarScreen
            transport={transport}
            onOpenSetup={() => push({ name: "onboarding" })}
            onOpenSearch={() => push({ name: "marketplaceSearch" })}
            onOpenSchedule={() => push({ name: "attendance" })}
            onOpenPay={() => selectTab("earnings")}
            onOpenOffers={() => push({ name: "offers" })}
            onContactAboutShift={contactWith}
          />
        );
      case "marketplaceSearch":
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
        return (
          <MyWorkScreen
            transport={transport}
            onOpenSchedule={() => push({ name: "attendance" })}
            onOpenTimesheets={() => push({ name: "timesheet" })}
          />
        );
      case "calendar":
        // Normal open → the worker's month calendar, with a button to their offers (accept/decline).
        // A deep-linked offer → the offer panel directly so the existing accept flow still works.
        return offerId ? (
          <WorkerCalendarPanel allowFixturePreview={false} offerId={offerId} transport={transport} />
        ) : (
          <MonthCalendarScreen transport={transport} onOpenOffers={() => push({ name: "offers" })} />
        );
      case "offers":
        // The worker's targeted offers — accept or decline (respondToWorkerOffer, with terms confirm).
        return <WorkerCalendarPanel allowFixturePreview={false} offerId={null} transport={transport} />;
      case "attendance":
        return <WorkerScheduleScreen transport={transport} onBack={back} />;
      case "timesheet":
        return <WorkerTimesheetListScreen transport={transport} onBack={back} />;
      case "earnings":
        return (
          <WorkerEarningsScreen transport={transport} onOpenSupport={() => selectTab("contact")} />
        );
      case "onboarding":
        return <WorkerSetupScreen transport={transport} onBack={back} />;
      case "contact":
        // "Contact Joblop": AI assistant first, Joblop staff take over when needed.
        return <ContactScreen draft={current.draft} transport={transport} />;
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
        <Text style={styles.topTitle}>{tr(`nav.${tab}`)}</Text>
        <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.signOut}>
          <Text style={styles.signOutText}>{tr("nav.signOut")}</Text>
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
              <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{tr(`nav.${t.id}`)}</Text>
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
