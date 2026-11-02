import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Image, Linking, Platform, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@rwos/design-system";
import {
  createVolatileSessionVault,
  nativeSecureSessionVault,
  tryCreateMobileSessionTransport
} from "./auth/secureSession";
import { readWorkerCalendarOfferId } from "./features/worker-calendar/deepLink";
import joblopLogo from "../assets/joblop-logo.png";
import { productName } from "./navigation/routes";
import { WorkerNavigator } from "./navigation/WorkerNavigator";
import { LocaleProvider } from "./i18n/LocaleContext";

export default function ProductionApp() {
  const [offerId, setOfferId] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const isStaging = process.env.EXPO_PUBLIC_RWOS_DEPLOYMENT_TIER === "staging";
  const transport = useMemo(
    () =>
      tryCreateMobileSessionTransport({
        apiOrigin: process.env.EXPO_PUBLIC_RWOS_API_ORIGIN,
        vault: Platform.OS === "web" ? createVolatileSessionVault() : nativeSecureSessionVault
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
    <LocaleProvider>
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        {isStaging ? (
          <View accessibilityRole="alert" style={styles.stagingBanner}>
            <Text style={styles.stagingTitle}>STAGING · SYNTHETIC DATA</Text>
            <Text style={styles.stagingText}>NO REAL PAYMENT · NO PRODUCTION CUSTOMER DATA</Text>
          </View>
        ) : null}
        <View accessibilityRole="header" style={styles.header}>
          <Image
            accessibilityElementsHidden={true}
            importantForAccessibility="no-hide-descendants"
            resizeMode="contain"
            source={joblopLogo}
            style={styles.logo}
          />
          <Text style={styles.subtitle}>{productName} · Workforce marketplace</Text>
        </View>
        <View style={styles.content}>
          <WorkerNavigator
            allowFixturePreview={false}
            authenticated={authenticated}
            offerId={offerId}
            onAuthenticatedChange={setAuthenticated}
            transport={transport}
          />
        </View>
      </View>
    </SafeAreaView>
    </LocaleProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.surfaceSubtle, flex: 1 },
  app: { backgroundColor: colors.surfaceSubtle, flex: 1 },
  stagingBanner: {
    backgroundColor: "#FFF4D6",
    borderBottomColor: "#D49B00",
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  stagingTitle: { color: "#684B00", fontSize: typography.small, fontWeight: "800" },
  stagingText: { color: "#684B00", fontSize: typography.small, fontWeight: "700" },
  header: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    gap: spacing.xs,
    padding: spacing.lg
  },
  logo: { height: 34, width: 150, borderRadius: 6 },
  subtitle: { color: colors.muted, fontSize: typography.small },
  content: { flex: 1 }
});
