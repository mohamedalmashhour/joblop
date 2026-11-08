import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "../i18n/LocaleContext";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme";
import type { MobileSessionTransport } from "../auth/secureSession";
import { WorkerAuthScreen } from "../features/worker-auth";
import { PublicJobsScreen } from "../features/public-jobs";
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
import {
  pushPermissionPlan,
  registerForPush,
  rememberPushAsked,
  setUpNotificationDisplay,
  subscribeToNotificationTaps
} from "../notifications/pushNotifications";
import type { PushTarget } from "../notifications/pushTarget";
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
  | { name: "contact"; draft: ContactDraft | null; conversationId?: string | null };

// What a signed-out person sees: the free public job search first; its actions open sign-up / sign-in.
type GuestView = { name: "publicJobs" } | { name: "auth"; mode: "sign-in" | "sign-up" };

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

  const [guestView, setGuestView] = useState<GuestView>({ name: "publicJobs" });

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

  // Push notifications: show notices while the app is open, and remember a tapped notice until the
  // worker is inside the app.
  const [pendingTarget, setPendingTarget] = useState<PushTarget | null>(null);
  const [showPushAsk, setShowPushAsk] = useState(false);
  const pushTokenRef = useRef<string | null>(null);
  useEffect(() => {
    void setUpNotificationDisplay();
    return subscribeToNotificationTaps(setPendingTarget);
  }, []);
  useEffect(() => {
    if (!authenticated || !pendingTarget) return;
    if (pendingTarget.screen === "calendar") selectTab("available");
    else if (pendingTarget.screen === "pay") selectTab("earnings");
    else {
      // "Joblop staff replied" → the Contact tab, straight into that conversation when known.
      setTab("contact");
      setStack([{ name: "contact", draft: null, conversationId: pendingTarget.conversationId ?? null }]);
    }
    setPendingTarget(null);
  }, [authenticated, pendingTarget, selectTab]);
  useEffect(() => {
    // Defensive: only register push for a real stored session.
    if (!authenticated || !transport) return;
    let cancelled = false;
    void (async () => {
      if (!(await transport.hasSession())) return;
      const plan = await pushPermissionPlan();
      if (cancelled) return;
      if (plan === "ask") setShowPushAsk(true);
      else if (plan === "register") pushTokenRef.current = await registerForPush(transport, { ask: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, transport]);
  const allowPush = useCallback(() => {
    setShowPushAsk(false);
    if (!transport) return;
    void registerForPush(transport, { ask: true }).then((token) => {
      pushTokenRef.current = token;
    });
  }, [transport]);
  const declinePush = useCallback(() => {
    setShowPushAsk(false);
    void rememberPushAsked();
  }, []);

  const signOut = useCallback(async () => {
    try {
      const pushToken = pushTokenRef.current;
      pushTokenRef.current = null;
      setShowPushAsk(false);
      if (pushToken) await transport?.unregisterPushToken(pushToken).catch(() => undefined);
      await transport?.signOut();
    } finally {
      setGuestView({ name: "publicJobs" });
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
        return <ContactScreen draft={current.draft} openConversationId={current.conversationId ?? null} transport={transport} />;
      default: {
        const _exhaustive: never = current;
        return _exhaustive;
      }
    }
  }

  // Signed out (owner rule, same as the website): the FIRST screen is the free public job search — no
  // account needed. Tapping a job or "Create free account" opens sign-up; "Sign in" opens phone-code
  // sign-in; Back from either returns to the search. Only a real sign-in opens the app (and only then
  // does a pending notification target route).
  if (!authenticated) {
    if (guestView.name === "auth") {
      return (
        <WorkerAuthScreen
          key={guestView.mode}
          initialMode={guestView.mode}
          transport={transport}
          onAuthenticated={() => {
            setGuestView({ name: "publicJobs" });
            onAuthenticatedChange(true);
          }}
          onBack={() => setGuestView({ name: "publicJobs" })}
        />
      );
    }
    return (
      <PublicJobsScreen
        transport={transport}
        onWantDetails={() => setGuestView({ name: "auth", mode: "sign-up" })}
        onCreateAccount={() => setGuestView({ name: "auth", mode: "sign-up" })}
        onSignIn={() => setGuestView({ name: "auth", mode: "sign-in" })}
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
      {showPushAsk ? (
        <View accessibilityRole="alert" style={styles.pushAsk}>
          <Text style={styles.pushAskText}>{tr("push.ask")}</Text>
          <View style={styles.pushAskActions}>
            <Pressable accessibilityRole="button" onPress={allowPush} style={styles.pushAllow}>
              <Text style={styles.pushAllowText}>{tr("push.allow")}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={declinePush} style={styles.signOut}>
              <Text style={styles.signOutText}>{tr("push.notNow")}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
              <Text numberOfLines={1} style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>
                {t.id === "available" ? tr("nav.tab.available") : tr(`nav.${t.id}`)}
              </Text>
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
  pushAsk: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.surfaceSubtle,
    borderBottomWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  pushAskText: { color: colors.deepTeal, fontSize: typography.small, fontWeight: "600" },
  pushAskActions: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  pushAllow: {
    backgroundColor: colors.actionTeal,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  pushAllowText: { color: colors.surface, fontSize: typography.small, fontWeight: "800" },
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
