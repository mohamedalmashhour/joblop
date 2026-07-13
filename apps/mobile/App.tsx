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
import { mobileTabs, productName, type MobileTabId } from "./src/navigation/routes";
import { BodyText, Card, Heading, SmallText } from "./src/ui/primitives";

type MobileScreen =
  | Readonly<{ name: "tab"; tabId: MobileTabId }>
  | Readonly<{ name: "shift-details"; shiftId: string }>
  | Readonly<{ name: "application-summary"; shiftId: string }>
  | Readonly<{ name: "application-success"; applicationId: string }>
  | Readonly<{ name: "application-details"; applicationId: string }>
  | Readonly<{ name: "offer-details"; offerId: string }>
  | Readonly<{ name: "confirmation-details"; confirmationId: string }>;

export default function App() {
  const [screen, setScreen] = useState<MobileScreen>({ name: "tab", tabId: "home" });
  const shiftRepository = useMemo(() => new MockShiftDiscoveryRepository(), []);
  const applicationRepository = useMemo(() => new MockWorkerApplicationRepository(), []);
  const activeTabId =
    screen.name === "tab"
      ? screen.tabId
      : ["application-details", "offer-details", "confirmation-details"].includes(screen.name)
        ? "my-shifts"
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

    return <PlaceholderScreen tabId={screen.tabId} />;
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

function PlaceholderScreen({ tabId }: { tabId: MobileTabId }) {
  const tab = mobileTabs.find((item) => item.id === tabId);

  return (
    <ScrollView style={styles.placeholderScroll}>
      <View style={styles.placeholderStack}>
        <Card>
          <Heading>{tab?.label ?? "Route"}</Heading>
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
