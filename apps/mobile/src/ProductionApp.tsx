import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Linking, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@rwos/design-system";
import { nativeSecureSessionVault, tryCreateMobileSessionTransport } from "./auth/secureSession";
import { readWorkerCalendarOfferId } from "./features/worker-calendar/deepLink";
import { WorkerCalendarPanel } from "./features/worker-calendar";
import { productName } from "./navigation/routes";

export default function ProductionApp() {
  const [offerId, setOfferId] = useState<string | null>(null);
  const transport = useMemo(
    () =>
      tryCreateMobileSessionTransport({
        apiOrigin: process.env.EXPO_PUBLIC_RWOS_API_ORIGIN,
        vault: nativeSecureSessionVault
      }),
    []
  );
  useEffect(() => {
    const readOffer = (url: string | null) => setOfferId(readWorkerCalendarOfferId(url));
    void Linking.getInitialURL().then(readOffer);
    const subscription = Linking.addEventListener("url", ({ url }) => readOffer(url));
    return () => subscription.remove();
  }, []);
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <View style={styles.header}>
          <View style={styles.mark}>
            <Text style={styles.markText}>RW</Text>
          </View>
          <View>
            <Text accessibilityRole="header" style={styles.title}>
              {productName}
            </Text>
            <Text style={styles.subtitle}>Secure worker calendar</Text>
          </View>
        </View>
        <View style={styles.content}>
          <WorkerCalendarPanel
            allowFixturePreview={false}
            offerId={offerId}
            transport={transport}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.surfaceSubtle, flex: 1 },
  app: { backgroundColor: colors.surfaceSubtle, flex: 1 },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg
  },
  mark: {
    alignItems: "center",
    backgroundColor: colors.deepTeal,
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  markText: { color: colors.surface, fontSize: typography.body, fontWeight: "800" },
  title: { color: colors.deepTeal, fontSize: typography.title, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: typography.small },
  content: { flex: 1 }
});
