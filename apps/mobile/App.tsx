import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, touch, typography } from "@rwos/design-system";
import { AvailableShiftsScreen, ShiftDetailsScreen } from "./src/features/shifts";
import { mobileTabs, productName, type MobileTabId } from "./src/navigation/routes";
import { BodyText, Card, Heading, SmallText } from "./src/ui/primitives";

type MobileScreen =
  | Readonly<{ name: "tab"; tabId: MobileTabId }>
  | Readonly<{ name: "shift-details"; shiftId: string }>;

export default function App() {
  const [screen, setScreen] = useState<MobileScreen>({ name: "tab", tabId: "home" });
  const activeTabId = screen.name === "tab" ? screen.tabId : "available";

  const renderScreen = () => {
    if (screen.name === "shift-details") {
      return (
        <ShiftDetailsScreen
          onBack={() => setScreen({ name: "tab", tabId: "available" })}
          shiftId={screen.shiftId}
        />
      );
    }

    if (screen.tabId === "available") {
      return (
        <AvailableShiftsScreen
          onOpenShift={(shiftId) => setScreen({ name: "shift-details", shiftId })}
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
          <Text style={styles.productName}>{productName}</Text>
          <Text style={styles.headerText}>Worker app foundation - G01 shift discovery</Text>
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

function PlaceholderScreen({ tabId }: { tabId: MobileTabId }) {
  const tab = mobileTabs.find((item) => item.id === tabId);

  return (
    <ScrollView style={styles.placeholderScroll}>
      <View style={styles.placeholderStack}>
        <Card>
          <Heading>{tab?.label ?? "Route"}</Heading>
          <BodyText>{tab?.status ?? "Placeholder route"}</BodyText>
          <SmallText>
            Placeholder screen. G01 implements only Available and Shift Details. This route name is
            preserved for future milestones.
          </SmallText>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    flex: 1
  },
  app: {
    flex: 1
  },
  header: {
    backgroundColor: colors.deepTeal,
    gap: spacing.xs,
    padding: spacing.lg
  },
  productName: {
    color: colors.cream,
    fontSize: typography.title,
    fontWeight: "700"
  },
  headerText: {
    color: colors.surface,
    fontSize: typography.small
  },
  content: {
    flex: 1
  },
  tabBar: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "space-around",
    padding: spacing.sm
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
