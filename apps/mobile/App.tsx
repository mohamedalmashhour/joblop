import { StatusBar } from "expo-status-bar";
import { createElement, useMemo, useState, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { colors, radii, spacing, touch, typography } from "@rwos/design-system";
import {
  ApplicationDetailsScreen,
  ApplicationSuccessScreen,
  ApplicationSummaryScreen,
  ConfirmationDetailsScreen,
  MockWorkerApplicationRepository,
  MyShiftsScreen,
  OfferDetailsScreen
} from "./src/features/applications";
import { AvailableShiftsScreen, ShiftDetailsScreen } from "./src/features/shifts";
import { MockShiftDiscoveryRepository } from "./src/features/shifts/mockShiftDiscoveryRepository";
import { WorkerAttendanceScreen, type WorkerAttendanceStage } from "./src/features/worker-attendance";
import { WorkerEarningsScreen } from "./src/features/worker-earnings";
import { WorkerDashboardHandoffScreen, WorkerOnboardingScreen } from "./src/features/worker-onboarding";
import { WorkerServiceScreen, type WorkerServiceMode } from "./src/features/worker-service";
import { WorkerTimesheetScreen, type WorkerTimesheetStage } from "./src/features/worker-timesheets";
import { mobileTabs, productName, type MobileTabId } from "./src/navigation/routes";
import { BodyText, Card, Heading, SmallText } from "./src/ui/primitives";

type MobileScreen =
  | Readonly<{ name: "tab"; tabId: MobileTabId }>
  | Readonly<{ name: "shift-details"; shiftId: string }>
  | Readonly<{ name: "application-summary"; shiftId: string }>
  | Readonly<{ name: "application-success"; applicationId: string }>
  | Readonly<{ name: "application-details"; applicationId: string }>
  | Readonly<{ name: "offer-details"; offerId: string }>
  | Readonly<{ name: "confirmation-details"; confirmationId: string }>
  | Readonly<{ name: "worker-signup" }>
  | Readonly<{ name: "worker-profile-setup" }>
  | Readonly<{ name: "worker-qualifications-setup" }>
  | Readonly<{ name: "worker-availability-setup" }>
  | Readonly<{ name: "worker-onboarding-review" }>
  | Readonly<{ name: "worker-dashboard" }>
  | Readonly<{ name: "worker-attendance"; stage: WorkerAttendanceStage }>
  | Readonly<{ name: "worker-timesheet"; stage: WorkerTimesheetStage }>
  | Readonly<{ name: "worker-service"; mode: WorkerServiceMode }>;

type WorkerGroupId = "kitchen" | "care" | "helper" | "maintenance";

export default function App() {
  const [screen, setScreen] = useState<MobileScreen>({ name: "tab", tabId: "home" });
  const [selectedWorkerGroup, setSelectedWorkerGroup] = useState<WorkerGroupId>("kitchen");
  const shiftRepository = useMemo(() => new MockShiftDiscoveryRepository(), []);
  const applicationRepository = useMemo(() => new MockWorkerApplicationRepository(), []);
  const activeTabId =
    screen.name === "tab"
      ? screen.tabId
      : ["application-details", "offer-details", "confirmation-details"].includes(screen.name)
        ? "my-shifts"
        : screen.name === "worker-service"
          ? "notifications"
        : "available";

  const renderScreen = () => {
    if (screen.name === "shift-details") {
      return (
        <ShiftDetailsScreen
          onApply={(shiftId) => setScreen({ name: "application-summary", shiftId })}
          onBack={() => setScreen({ name: "tab", tabId: "available" })}
          repository={shiftRepository}
          shiftId={screen.shiftId}
        />
      );
    }

    if (screen.name === "application-summary") {
      return (
        <ApplicationSummaryScreen
          applicationRepository={applicationRepository}
          onBack={() => setScreen({ name: "shift-details", shiftId: screen.shiftId })}
          onSubmitted={(applicationId) => setScreen({ name: "application-success", applicationId })}
          shiftId={screen.shiftId}
          shiftRepository={shiftRepository}
        />
      );
    }

    if (screen.name === "application-success") {
      return (
        <ApplicationSuccessScreen
          applicationId={screen.applicationId}
          onOpenApplication={(applicationId) =>
            setScreen({ name: "application-details", applicationId })
          }
          onOpenMyShifts={() => setScreen({ name: "tab", tabId: "my-shifts" })}
        />
      );
    }

    if (screen.name === "application-details") {
      return (
        <ApplicationDetailsScreen
          applicationId={screen.applicationId}
          applicationRepository={applicationRepository}
          onBack={() => setScreen({ name: "tab", tabId: "my-shifts" })}
        />
      );
    }

    if (screen.name === "offer-details") {
      return (
        <OfferDetailsScreen
          applicationRepository={applicationRepository}
          offerId={screen.offerId}
          onBack={() => setScreen({ name: "tab", tabId: "my-shifts" })}
          onDone={() => setScreen({ name: "tab", tabId: "my-shifts" })}
        />
      );
    }

    if (screen.name === "confirmation-details") {
      return (
        <ConfirmationDetailsScreen
          applicationRepository={applicationRepository}
          confirmationId={screen.confirmationId}
          onBack={() => setScreen({ name: "tab", tabId: "my-shifts" })}
          onDone={() => setScreen({ name: "tab", tabId: "my-shifts" })}
          onOpenAttendance={() => setScreen({ name: "worker-attendance", stage: "overview" })}
        />
      );
    }

    if (screen.name === "worker-signup") {
      return (
        <WorkerOnboardingScreen
          kind="signup"
          onBack={() => setScreen({ name: "tab", tabId: "home" })}
          onNext={() => setScreen({ name: "worker-profile-setup" })}
        />
      );
    }

    if (screen.name === "worker-profile-setup") {
      return (
        <WorkerOnboardingScreen
          kind="profile"
          onBack={() => setScreen({ name: "worker-signup" })}
          onNext={() => setScreen({ name: "worker-qualifications-setup" })}
        />
      );
    }

    if (screen.name === "worker-qualifications-setup") {
      return (
        <WorkerOnboardingScreen
          kind="qualifications"
          onBack={() => setScreen({ name: "worker-profile-setup" })}
          onNext={() => setScreen({ name: "worker-availability-setup" })}
        />
      );
    }

    if (screen.name === "worker-availability-setup") {
      return (
        <WorkerOnboardingScreen
          kind="availability"
          onBack={() => setScreen({ name: "worker-qualifications-setup" })}
          onNext={() => setScreen({ name: "worker-onboarding-review" })}
        />
      );
    }

    if (screen.name === "worker-onboarding-review") {
      return (
        <WorkerOnboardingScreen
          kind="review"
          onBack={() => setScreen({ name: "worker-availability-setup" })}
          onNext={() => setScreen({ name: "worker-dashboard" })}
        />
      );
    }

    if (screen.name === "worker-dashboard") {
      return (
        <WorkerDashboardHandoffScreen
          onOpenAvailable={() => setScreen({ name: "tab", tabId: "available" })}
          onOpenProfile={() => setScreen({ name: "tab", tabId: "profile" })}
        />
      );
    }

    if (screen.name === "worker-attendance") {
      return (
        <WorkerAttendanceScreen
          onBack={() => setScreen({ name: "tab", tabId: "my-shifts" })}
          onOpenTimesheet={() => setScreen({ name: "worker-timesheet", stage: "review" })}
          onSelectStage={(stage) => setScreen({ name: "worker-attendance", stage })}
          stage={screen.stage}
        />
      );
    }

    if (screen.name === "worker-timesheet") {
      return (
        <WorkerTimesheetScreen
          onBack={() => setScreen({ name: "worker-attendance", stage: "review" })}
          onOpenEarnings={() => setScreen({ name: "tab", tabId: "billing" })}
          onSelectStage={(stage) => setScreen({ name: "worker-timesheet", stage })}
          stage={screen.stage}
        />
      );
    }

    if (screen.name === "worker-service") {
      return (
        <WorkerServiceScreen
          mode={screen.mode}
          onOpenAttendance={() => setScreen({ name: "worker-attendance", stage: "overview" })}
          onOpenAvailable={() => setScreen({ name: "tab", tabId: "available" })}
          onOpenEarnings={() => setScreen({ name: "tab", tabId: "billing" })}
          onOpenMode={(mode) => setScreen({ name: "worker-service", mode })}
          onOpenMyShifts={() => setScreen({ name: "tab", tabId: "my-shifts" })}
          onOpenOnboarding={() => setScreen({ name: "worker-signup" })}
          onOpenProfile={() => setScreen({ name: "tab", tabId: "profile" })}
          onOpenTimesheet={() => setScreen({ name: "worker-timesheet", stage: "review" })}
        />
      );
    }

    if (screen.tabId === "available") {
      return (
        <AvailableShiftsScreen
          onOpenShift={(shiftId) => setScreen({ name: "shift-details", shiftId })}
          repository={shiftRepository}
        />
      );
    }

    if (screen.tabId === "my-shifts") {
      return (
        <MyShiftsScreen
          applicationRepository={applicationRepository}
          onOpenApplication={(applicationId) =>
            setScreen({ name: "application-details", applicationId })
          }
          onOpenConfirmation={(confirmationId) =>
            setScreen({ name: "confirmation-details", confirmationId })
          }
          onOpenOffer={(offerId) => setScreen({ name: "offer-details", offerId })}
        />
      );
    }

    return (
      <PlaceholderScreen
        onOpenAvailable={() => setScreen({ name: "tab", tabId: "available" })}
        onOpenOnboarding={() => setScreen({ name: "worker-signup" })}
        onOpenOwnerReview={() => setScreen({ name: "worker-service", mode: "ownerReview" })}
        onOpenServiceMode={(mode) => setScreen({ name: "worker-service", mode })}
        onOpenShift={(shiftId) => setScreen({ name: "shift-details", shiftId })}
        selectedWorkerGroup={selectedWorkerGroup}
        setSelectedWorkerGroup={setSelectedWorkerGroup}
        tabId={screen.tabId}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <View style={styles.header}>
          <HeaderText variant="title">{productName}</HeaderText>
          <HeaderText variant="subtitle">
            Worker app foundation - G02 applications and offers
          </HeaderText>
        </View>
        <View style={styles.content}>{renderScreen()}</View>
        <View style={styles.tabBar}>
          {mobileTabs.map((tab) => (
            <Pressable
              accessibilityRole="button"
              key={tab.id}
              onPress={() => setScreen({ name: "tab", tabId: tab.id })}
              style={[styles.tabButton, activeTabId === tab.id ? styles.activeTabButton : null]}
            >
              <Text style={[styles.tabText, activeTabId === tab.id ? styles.activeTabText : null]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function HeaderText({ children, variant }: { children: ReactNode; variant: "title" | "subtitle" }) {
  if (Platform.OS === "web") {
    return createElement(
      "div",
      {
        style: variant === "title" ? webHeaderTitleStyle : webHeaderSubtitleStyle
      },
      children
    );
  }

  return (
    <Text style={variant === "title" ? styles.productName : styles.headerText}>{children}</Text>
  );
}

function PlaceholderScreen({
  onOpenAvailable,
  onOpenOnboarding,
  onOpenOwnerReview,
  onOpenServiceMode,
  onOpenShift,
  selectedWorkerGroup,
  setSelectedWorkerGroup,
  tabId
}: {
  onOpenAvailable: () => void;
  onOpenOnboarding: () => void;
  onOpenOwnerReview: () => void;
  onOpenServiceMode: (mode: WorkerServiceMode) => void;
  onOpenShift: (shiftId: string) => void;
  selectedWorkerGroup: WorkerGroupId;
  setSelectedWorkerGroup: (groupId: WorkerGroupId) => void;
  tabId: MobileTabId;
}) {
  const tab = mobileTabs.find((item) => item.id === tabId);
  const title = tab?.label ?? "Route";
  const group = workerGroups.find((item) => item.id === selectedWorkerGroup) ?? workerGroups[0]!;
  const groupOffers = workerGroupOffers.filter((offer) => offer.groupId === selectedWorkerGroup);
  const [rateAdjustments, setRateAdjustments] = useState<Record<string, number>>({});
  const adjustedRatePreferences = workerRatePreferenceRules.map((item) => ({
    ...item,
    adjustedRate: item.baseRate + (rateAdjustments[item.id] ?? 0)
  }));
  const updateRateAdjustment = (preferenceId: string, delta: number) => {
    setRateAdjustments((current) => {
      const existing = current[preferenceId] ?? 0;
      const next = Math.max(-6, Math.min(18, existing + delta));
      return { ...current, [preferenceId]: next };
    });
  };

  if (tabId === "home") {
    return (
      <ScrollView style={styles.placeholderScroll}>
        <View style={styles.screenStack}>
          <Card>
            <SmallText>Today</SmallText>
            <Heading>Good morning, Mohamed</Heading>
            <BodyText>
              Choose your registered work group first. The app then shows only the offers that fit
              your approved skills.
            </BodyText>
          </Card>
          <Card>
            <SmallText>Resident Job profile</SmallText>
            <Heading>Ready to receive matched work</Heading>
            <BodyText>
              Your documents, preferred groups, languages, payment data, and work experience decide
              which offers appear first.
            </BodyText>
            <View style={styles.onboardingRail}>
              {workerReadiness.map((item) => (
                <View key={item.label} style={styles.readinessChip}>
                  <Text style={styles.checkMark}>✓</Text>
                  <SmallText>{item.label}</SmallText>
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onOpenOnboarding}
              style={styles.fullListButton}
            >
              <Text style={styles.fullListButtonText}>Start worker onboarding</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onOpenOwnerReview}
              style={styles.fullListButton}
            >
              <Text style={styles.fullListButtonText}>Open worker owner review</Text>
            </Pressable>
          </Card>
          <View style={styles.metricGrid}>
            {workerMetrics.map((metric) => (
              <View key={metric.label} style={styles.metricCard}>
                <SmallText>{metric.label}</SmallText>
                <Text style={styles.metricValue}>{metric.value}</Text>
                <SmallText>{metric.note}</SmallText>
              </View>
            ))}
          </View>
          <Card>
            <SmallText>Registered groups</SmallText>
            <Heading>Where do you want to work today?</Heading>
            <BodyText>
              Staff see the groups approved in their profile. Each group opens the correct offer
              area for that worker.
            </BodyText>
            <View style={styles.groupGrid}>
              {workerGroups.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item.id}
                  onPress={() => setSelectedWorkerGroup(item.id)}
                  style={[
                    styles.groupCard,
                    selectedWorkerGroup === item.id ? styles.groupCardActive : null
                  ]}
                >
                  <Text
                    style={[
                      styles.groupTitle,
                      selectedWorkerGroup === item.id ? styles.groupTitleActive : null
                    ]}
                  >
                    {item.title}
                  </Text>
                  <SmallText>{item.skills}</SmallText>
                  <Text style={styles.groupCount}>{item.openOffers}</Text>
                  <SmallText>open offers</SmallText>
                </Pressable>
              ))}
            </View>
          </Card>
          <Card>
            <SmallText>{group.title} group</SmallText>
            <Heading>{group.offerTitle}</Heading>
            <BodyText>{group.description}</BodyText>
            {groupOffers.map((offer) => (
              <View key={offer.title} style={styles.offerRow}>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle}>{offer.title}</Text>
                  <SmallText>{offer.place}</SmallText>
                  <SmallText>{offer.details}</SmallText>
                </View>
                {offer.shiftId ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (offer.shiftId) onOpenShift(offer.shiftId);
                    }}
                    style={styles.offerButton}
                  >
                    <Text style={styles.offerButtonText}>View</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.statusPill}>None</Text>
                )}
              </View>
            ))}
            <Pressable accessibilityRole="button" onPress={onOpenAvailable} style={styles.fullListButton}>
              <Text style={styles.fullListButtonText}>Open all available offers</Text>
            </Pressable>
          </Card>
          <Card>
            <Heading>Worker Calendar</Heading>
            {workerCalendar.map((item) => (
              <View key={item.time} style={styles.timelineRow}>
                <Text style={styles.timelineTime}>{item.time}</Text>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  <SmallText>{item.place}</SmallText>
                </View>
                <Text style={[styles.statusPill, item.status === "Ready" && styles.readyPill]}>
                  {item.status}
                </Text>
              </View>
            ))}
          </Card>
          <Card>
            <Heading>Urgent Offer</Heading>
            <BodyText>Chef working alone - Laval Residence - starts 4:00 PM.</BodyText>
            <SmallText>AI match evidence: works alone, Rational oven, 7 km, food safety verified.</SmallText>
          </Card>
        </View>
      </ScrollView>
    );
  }

  if (tabId === "billing") {
    return <WorkerEarningsScreen />;
  }

  if (tabId === "calendar") {
    return (
      <ScrollView style={styles.placeholderScroll}>
        <View style={styles.screenStack}>
          <Card>
            <SmallText>Worker OS</SmallText>
            <Heading>Calendar & Availability</Heading>
            <BodyText>View confirmed shifts, offers, on-call blocks, and unavailable time.</BodyText>
          </Card>
          <View style={styles.calendarStrip}>
            {workerWeek.map((day) => (
              <View key={day.day} style={[styles.dayCard, day.status === "Emergency" && styles.hotDay]}>
                <SmallText>{day.day}</SmallText>
                <Text style={styles.dayNumber}>{day.date}</Text>
                <SmallText>{day.status}</SmallText>
              </View>
            ))}
          </View>
          <Card>
            <Heading>Today&apos;s Schedule</Heading>
            {workerCalendar.map((item) => (
              <View key={item.time} style={styles.timelineRow}>
                <Text style={styles.timelineTime}>{item.time}</Text>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  <SmallText>{item.place}</SmallText>
                </View>
                <Text style={[styles.statusPill, item.status === "Ready" && styles.readyPill]}>
                  {item.status}
                </Text>
              </View>
            ))}
          </Card>
          <Card>
            <Heading>Availability</Heading>
            {availabilityBlocks.map((item) => (
              <View key={item.label} style={styles.checkRow}>
                <Text style={styles.checkMark}>✓</Text>
                <BodyText>{item.label}</BodyText>
              </View>
            ))}
          </Card>
          <CalendarBoard title="Available Orders Calendar" items={workerAvailableOrders} />
          <CalendarBoard title="Past & Future Orders Calendar" items={workerOrderHistory} />
          <AdjustableRatePreferences
            items={adjustedRatePreferences}
            onAdjust={updateRateAdjustment}
          />
          <CalendarBoard title="Revenue Calendar" items={workerRevenueCalendar} />
        </View>
      </ScrollView>
    );
  }

  if (tabId === "profile") {
    return (
      <ScrollView style={styles.placeholderScroll}>
        <View style={styles.screenStack}>
          <Card>
            <SmallText>Worker account</SmallText>
            <Heading>Profile</Heading>
            <BodyText>Chef - kitchen lead - emergency available.</BodyText>
            <SmallText>Profile completeness: 92% · Demo worker data</SmallText>
          </Card>
          <Card>
            <Heading>Account menu</Heading>
            {profileMenuItems.map((item) => (
              <Pressable accessibilityRole="button" key={item.title} style={styles.profileMenuRow}>
                <View style={styles.profileIconBox}>
                  <Text style={styles.profileIconText}>{item.icon}</Text>
                </View>
                <View style={styles.timelineBody}>
                  <Text style={styles.profileMenuTitle}>{item.title}</Text>
                  <SmallText>{item.detail}</SmallText>
                </View>
                <Text style={styles.profileChevron}>›</Text>
              </Pressable>
            ))}
          </Card>
          {profileSections.map((section) => (
            <Card key={section.title}>
              <Heading>{section.title}</Heading>
              {section.items.map((item) => (
                <View key={item} style={styles.checkRow}>
                  <Text style={styles.checkMark}>✓</Text>
                  <BodyText>{item}</BodyText>
                </View>
              ))}
            </Card>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (tabId === "notifications") {
    return (
      <WorkerServiceScreen
        mode="messages"
        onOpenAttendance={() => undefined}
        onOpenAvailable={onOpenAvailable}
        onOpenEarnings={() => undefined}
        onOpenMode={onOpenServiceMode}
        onOpenMyShifts={() => undefined}
        onOpenOnboarding={onOpenOnboarding}
        onOpenProfile={() => undefined}
        onOpenTimesheet={() => undefined}
      />
    );
  }

  return (
    <ScrollView style={styles.placeholderScroll}>
      <View style={styles.screenStack}>
        <Card>
          <Heading>{title}</Heading>
          <BodyText>{tab?.status ?? "Placeholder route"}</BodyText>
          <SmallText>
            Placeholder screen. G02 implements Available, Shift Details, Applications, Offers,
            Confirmations and My Shifts. This route name is preserved for future milestones.
          </SmallText>
        </Card>
      </View>
    </ScrollView>
  );
}

function CalendarBoard({
  items,
  title
}: {
  items: readonly Readonly<{ day: string; value: string; detail: string; tone?: "hot" | "money" }>[];
  title: string;
}) {
  return (
    <Card>
      <Heading>{title}</Heading>
      <View style={styles.calendarBoard}>
        {items.map((item) => (
          <View
            key={`${title}-${item.day}-${item.value}`}
            style={[
              styles.calendarCell,
              item.tone === "hot" && styles.calendarCellHot,
              item.tone === "money" && styles.calendarCellMoney
            ]}
          >
            <SmallText>{item.day}</SmallText>
            <Text style={styles.calendarValue}>{item.value}</Text>
            <SmallText>{item.detail}</SmallText>
          </View>
        ))}
      </View>
    </Card>
  );
}

function AdjustableRatePreferences({
  items,
  onAdjust
}: {
  items: readonly Readonly<{
    adjustedRate: number;
    baseRate: number;
    id: string;
    need: string;
    note: string;
    title: string;
  }>[];
  onAdjust: (preferenceId: string, delta: number) => void;
}) {
  return (
    <Card>
      <SmallText>Worker controlled preferences</SmallText>
      <Heading>Variable Rate Preferences</Heading>
      <BodyText>
        Adjust these preferences to reflect your availability needs. They influence matching only;
        they are not guaranteed earnings, payroll, or final payment.
      </BodyText>
      {items.map((item) => (
        <View key={item.id} style={styles.ratePreferenceRow}>
          <View style={styles.timelineBody}>
            <Text style={styles.timelineTitle}>{item.title}</Text>
            <SmallText>{item.need}</SmallText>
            <SmallText>{item.note}</SmallText>
            <SmallText>Base preference: ${item.baseRate}/hr</SmallText>
          </View>
          <View style={styles.rateControl}>
            <Pressable
              accessibilityLabel={`Decrease ${item.title} preference`}
              accessibilityRole="button"
              onPress={() => onAdjust(item.id, -2)}
              style={styles.rateButton}
            >
              <Text style={styles.rateButtonText}>-</Text>
            </Pressable>
            <Text style={styles.rateValue}>${item.adjustedRate}/hr</Text>
            <Pressable
              accessibilityLabel={`Increase ${item.title} preference`}
              accessibilityRole="button"
              onPress={() => onAdjust(item.id, 2)}
              style={styles.rateButton}
            >
              <Text style={styles.rateButtonText}>+</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </Card>
  );
}

const workerMetrics = [
  { label: "Confirmed", value: "2", note: "Today" },
  { label: "Open offers", value: "3", note: "1 urgent" },
  { label: "Rating", value: "4.9", note: "128 reviews" },
  { label: "Documents", value: "4/4", note: "Verified" }
] as const;

const workerReadiness = [
  { label: "Groups approved" },
  { label: "Documents verified" },
  { label: "Payment ready" },
  { label: "Emergency available" }
] as const;

const workerGroups: readonly Readonly<{
  description: string;
  id: WorkerGroupId;
  offerTitle: string;
  openOffers: string;
  skills: string;
  title: string;
}>[] = [
  {
    description:
      "For chefs and kitchen staff approved for meal preparation, special diets, dessert support, and emergency kitchen coverage.",
    id: "kitchen",
    offerTitle: "Kitchen offers matched to your profile",
    openOffers: "3",
    skills: "Chef, kitchen aide, dishwasher",
    title: "Kitchen"
  },
  {
    description:
      "For care staff approved for resident support, nurse-supervised routines, handoff notes, and evening or night coverage.",
    id: "care",
    offerTitle: "Care and nurse-support offers",
    openOffers: "2",
    skills: "Nurse, PSW, care aide",
    title: "Care / Nurse"
  },
  {
    description:
      "For helpers approved for dining-room support, floor service, housekeeping support, laundry, and general residence assistance.",
    id: "helper",
    offerTitle: "Helper and service offers",
    openOffers: "1",
    skills: "Helper, service, housekeeping",
    title: "Helper"
  },
  {
    description:
      "For maintenance staff approved for repairs, inspections, urgent facility support, and safe building operations.",
    id: "maintenance",
    offerTitle: "Maintenance offers",
    openOffers: "0",
    skills: "Maintenance, repairs, facility",
    title: "Maintenance"
  }
] as const;

const workerGroupOffers: readonly Readonly<{
  details: string;
  groupId: WorkerGroupId;
  place: string;
  shiftId?: string;
  title: string;
}>[] = [
  {
    details: "Immediate. Chef must work alone and confirm kitchen setup before accepting.",
    groupId: "kitchen",
    place: "Sunrise Residence - Montreal",
    shiftId: "shift_emergency_chef_001",
    title: "Emergency Chef"
  },
  {
    details: "Lunch and dinner preparation. Food safety required.",
    groupId: "kitchen",
    place: "Laval Residence - Chomedey",
    title: "Chef support - pending full request"
  },
  {
    details: "Dishwasher and kitchen support. Supervisor on site.",
    groupId: "kitchen",
    place: "Golden Gardens",
    title: "Kitchen aide / dishwasher"
  },
  {
    details: "Urgent evening care support with nurse supervisor.",
    groupId: "care",
    place: "Golden Gardens - Laval",
    shiftId: "shift_psw_evening_002",
    title: "Evening Care Aide"
  },
  {
    details: "Night replacement. CPR and French required.",
    groupId: "care",
    place: "North Residence",
    title: "Night care support"
  },
  {
    details: "Housekeeping and floor support for afternoon service.",
    groupId: "helper",
    place: "Greenwood Residence - Longueuil",
    shiftId: "shift_housekeeping_003",
    title: "Housekeeping Support"
  },
  {
    details: "No open maintenance offers match this worker profile right now.",
    groupId: "maintenance",
    place: "All residences",
    title: "No current offer"
  }
] as const;

const workerCalendar = [
  { time: "08:00", title: "Kitchen Staff", place: "Sunrise Residence", status: "Done" },
  { time: "16:00", title: "Chef - working alone", place: "Laval Residence", status: "Ready" },
  { time: "On call", title: "Emergency kitchen pool", place: "Within 12 km", status: "Open" }
] as const;

const workerWeek = [
  { day: "Mon", date: "21", status: "2 shifts" },
  { day: "Tue", date: "22", status: "Open" },
  { day: "Wed", date: "23", status: "Emergency" },
  { day: "Thu", date: "24", status: "Available" },
  { day: "Fri", date: "25", status: "Confirmed" }
] as const;

const availabilityBlocks = [
  { label: "Available for emergency kitchen calls today" },
  { label: "Can work alone when kitchen has required equipment" },
  { label: "Unavailable Sunday night after 8:00 PM" }
] as const;

const workerAvailableOrders = [
  { day: "Today", value: "3", detail: "Kitchen offers", tone: "hot" },
  { day: "Tue", value: "2", detail: "Care / kitchen" },
  { day: "Wed", value: "5", detail: "Open shifts" },
  { day: "Thu", value: "1", detail: "Maintenance" }
] as const;

const workerOrderHistory = [
  { day: "Past", value: "12", detail: "Completed" },
  { day: "Today", value: "2", detail: "Confirmed" },
  { day: "Future", value: "4", detail: "Scheduled" },
  { day: "Pending", value: "1", detail: "Awaiting client" }
] as const;

const workerRevenueCalendar = [
  { day: "Mon", value: "$240", detail: "Completed", tone: "money" },
  { day: "Tue", value: "$360", detail: "Expected", tone: "money" },
  { day: "Wed", value: "$0", detail: "Open" },
  { day: "Payout", value: "$1,250", detail: "Next cycle", tone: "money" }
] as const;

const workerRatePreferenceRules = [
  {
    baseRate: 28,
    id: "standard",
    need: "Regular accepted shifts",
    note: "Used as a worker preference signal, not a guaranteed offer.",
    title: "Standard day"
  },
  {
    baseRate: 34,
    id: "urgent",
    need: "Short-notice or urgent availability",
    note: "Urgency may influence recommendations only.",
    title: "Urgent coverage"
  },
  {
    baseRate: 32,
    id: "weekend",
    need: "Weekend and evening availability",
    note: "Final compensation still depends on approved shift terms.",
    title: "Weekend / evening"
  },
  {
    baseRate: 30,
    id: "travel",
    need: "Longer travel or distant residence",
    note: "Travel allowance and reimbursement remain separate governed items.",
    title: "Travel-sensitive"
  }
] as const;

const profileSections = [
  {
    title: "Kitchen Skills",
    items: ["Can work alone", "Rational oven experience", "Texture modified meals", "Dessert prep"]
  },
  {
    title: "Credentials",
    items: ["Food safety verified", "ID verified", "Emergency contact saved", "Tax data pending"]
  },
  {
    title: "Preferences",
    items: ["Kitchen and care homes", "Laval and Montreal", "Emergency calls accepted"]
  }
] as const;

const profileMenuItems = [
  {
    detail: "Name, phone, email, address, languages",
    icon: "ID",
    title: "Account info"
  },
  {
    detail: "Kitchen, care, helper, maintenance, experience level",
    icon: "JOB",
    title: "Job preferences and experiences"
  },
  {
    detail: "Food safety, CPR, PDSB, ID, tax forms",
    icon: "DOC",
    title: "Documents"
  },
  {
    detail: "Ratings, completed shifts, reliability, cancellations",
    icon: "STAT",
    title: "Statistics"
  },
  {
    detail: "Direct deposit and payment status",
    icon: "$",
    title: "Payment methods"
  },
  {
    detail: "Tax profile and worker documents",
    icon: "TAX",
    title: "Tax data"
  },
  {
    detail: "Contracts, platform rules, privacy",
    icon: "LAW",
    title: "Legal"
  },
  {
    detail: "Support, questions, account help",
    icon: "?",
    title: "Help"
  }
] as const;

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    flex: 1,
    minHeight: "100%",
    width: "100%"
  },
  app: {
    flex: 1,
    alignSelf: "stretch",
    minWidth: "100%",
    width: "100%"
  },
  header: {
    alignSelf: "stretch",
    backgroundColor: colors.deepTeal,
    gap: spacing.xs,
    minWidth: "100%",
    padding: spacing.lg,
    width: "100%"
  },
  productName: {
    color: colors.cream,
    fontSize: typography.title,
    fontWeight: "700",
    maxWidth: "100%",
    minWidth: "100%",
    width: "100%"
  },
  headerText: {
    color: colors.surface,
    fontSize: typography.small,
    maxWidth: "100%",
    minWidth: "100%",
    width: "100%"
  },
  content: {
    alignSelf: "stretch",
    flex: 1,
    width: "100%"
  },
  tabBar: {
    alignSelf: "stretch",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "space-around",
    padding: spacing.sm,
    width: "100%"
  },
  tabButton: {
    alignItems: "center",
    borderRadius: radii.pill,
    minHeight: touch.minimumTarget,
    minWidth: 92,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  activeTabButton: {
    backgroundColor: colors.deepTeal
  },
  tabText: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: "700"
  },
  activeTabText: {
    color: colors.cream
  },
  placeholderScroll: {
    flex: 1
  },
  placeholderStack: {
    padding: spacing.lg
  },
  screenStack: {
    gap: spacing.md,
    padding: spacing.lg
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metricCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 96,
    padding: spacing.md
  },
  metricValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800"
  },
  onboardingRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  readinessChip: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: touch.minimumTarget,
    paddingHorizontal: spacing.md
  },
  groupGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 132,
    minWidth: 142,
    padding: spacing.md
  },
  groupCardActive: {
    backgroundColor: colors.deepTeal,
    borderColor: colors.deepTeal
  },
  groupTitle: {
    color: colors.deepTeal,
    fontSize: typography.body,
    fontWeight: "900"
  },
  groupTitleActive: {
    color: colors.cream
  },
  groupCount: {
    color: colors.warning,
    fontSize: 30,
    fontWeight: "900",
    marginTop: spacing.xs
  },
  offerRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.md
  },
  offerButton: {
    alignItems: "center",
    backgroundColor: colors.deepTeal,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: touch.minimumTarget,
    minWidth: 72,
    paddingHorizontal: spacing.md
  },
  offerButtonText: {
    color: colors.cream,
    fontSize: typography.small,
    fontWeight: "900"
  },
  fullListButton: {
    alignItems: "center",
    backgroundColor: colors.cream,
    borderColor: colors.warning,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: spacing.md,
    minHeight: touch.minimumTarget,
    paddingHorizontal: spacing.md
  },
  fullListButtonText: {
    color: colors.deepTeal,
    fontSize: typography.small,
    fontWeight: "900"
  },
  profileMenuRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 78,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  profileIconBox: {
    alignItems: "center",
    borderColor: colors.deepTealMuted,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  profileIconText: {
    color: colors.deepTeal,
    fontSize: typography.micro,
    fontWeight: "900"
  },
  profileMenuTitle: {
    color: colors.deepTeal,
    fontSize: typography.body,
    fontWeight: "900"
  },
  profileChevron: {
    color: colors.deepTeal,
    fontSize: 32,
    fontWeight: "300"
  },
  timelineRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.sm
  },
  timelineTime: {
    color: colors.deepTeal,
    fontSize: typography.small,
    fontWeight: "800",
    width: 54
  },
  timelineBody: {
    flex: 1,
    gap: spacing.xs
  },
  timelineTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800"
  },
  statusPill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    color: colors.deepTeal,
    fontSize: typography.micro,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  readyPill: {
    backgroundColor: colors.cream,
    borderColor: colors.warning
  },
  checkRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs
  },
  checkMark: {
    color: colors.success,
    fontSize: typography.body,
    fontWeight: "900"
  },
  calendarStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  dayCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 96,
    minWidth: 82,
    padding: spacing.md
  },
  hotDay: {
    backgroundColor: "#fff4f4",
    borderColor: colors.danger
  },
  dayNumber: {
    color: colors.deepTeal,
    fontSize: 28,
    fontWeight: "900"
  },
  calendarBoard: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  calendarCell: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 104,
    minWidth: 118,
    padding: spacing.md
  },
  calendarCellHot: {
    backgroundColor: "#fff4f4",
    borderColor: colors.danger
  },
  calendarCellMoney: {
    backgroundColor: "#f0fff8",
    borderColor: colors.success
  },
  calendarValue: {
    color: colors.deepTeal,
    fontSize: 24,
    fontWeight: "900"
  },
  rateButton: {
    alignItems: "center",
    backgroundColor: colors.deepTeal,
    borderRadius: radii.sm,
    justifyContent: "center",
    minHeight: touch.minimumTarget,
    minWidth: touch.minimumTarget
  },
  rateButtonText: {
    color: colors.surfaceRaised,
    fontSize: typography.title,
    fontWeight: "900"
  },
  rateControl: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "flex-end",
    minWidth: 150
  },
  ratePreferenceRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.md
  },
  rateValue: {
    color: colors.deepTeal,
    fontSize: typography.body,
    fontWeight: "900",
    minWidth: 68,
    textAlign: "center"
  }
});

const webHeaderTitleStyle = {
  color: colors.cream,
  display: "block",
  fontSize: typography.title,
  fontWeight: 700,
  lineHeight: "34px",
  whiteSpace: "normal",
  width: "100%"
} as const;

const webHeaderSubtitleStyle = {
  color: colors.surface,
  display: "block",
  fontSize: typography.small,
  lineHeight: "18px",
  whiteSpace: "normal",
  width: "100%"
} as const;
