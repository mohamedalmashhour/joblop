import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Linking, Platform, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "./theme";
import {
  createVolatileSessionVault,
  nativeSecureSessionVault,
  tryCreateMobileSessionTransport
} from "./auth/secureSession";
import { readWorkerCalendarOfferId } from "./features/worker-calendar/deepLink";
import joblopLogo from "../assets/joblop-logo.png";
import { LanguageToggle } from "./ui/LanguageToggle";
import { useLocale } from "./i18n/LocaleContext";
import type { MobileSessionTransport } from "./auth/secureSession";
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
    <AccountLanguageSync authenticated={authenticated} transport={transport} />
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.app}>
        {isStaging ? (
          <View accessibilityRole="alert" style={styles.stagingBanner}>
            <Text style={styles.stagingTitle}>STAGING · SYNTHETIC DATA</Text>
            <Text style={styles.stagingText}>NO REAL PAYMENT · NO PRODUCTION CUSTOMER DATA</Text>
          </View>
        ) : null}
        <View accessibilityRole="header" accessibilityLabel={productName} style={styles.header}>
          <View style={styles.brand}>
            <Image
              accessibilityElementsHidden={true}
              importantForAccessibility="no-hide-descendants"
              resizeMode="contain"
              source={joblopLogo}
              style={styles.logo}
            />
            <Tagline />
          </View>
          <LanguageToggle />
        </View>
        <View style={styles.content}>
          <WorkerNavigator
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
    backgroundColor: "#2a1f0a",
    borderBottomColor: colors.deepTealMuted,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  stagingTitle: { color: colors.focus, fontSize: typography.small, fontWeight: "800" },
  stagingText: { color: colors.warning, fontSize: typography.small, fontWeight: "700" },
  header: {
    alignItems: "center",
    // Pure black so the logo artwork (black background) blends in with no visible box.
    backgroundColor: "#000000",
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    padding: spacing.lg
  },
  brand: { gap: spacing.xs },
  logo: { height: 34, width: 150 },
  subtitle: { color: colors.muted, fontSize: typography.small },
  content: { flex: 1 }
});

function Tagline() {
  const { t } = useLocale();
  return <Text style={styles.subtitle}>{t("brand.tagline")}</Text>;
}

// When the worker picks a language in the app (and is signed in), save it on their account so job
// offers and notices use it too. The app's starting language is never saved on its own, so it can't
// overwrite a choice the worker made on the website.
function AccountLanguageSync({ authenticated, transport }: { authenticated: boolean; transport: MobileSessionTransport | null }) {
  const { locale } = useLocale();
  const initial = useRef(locale);
  const chosen = useRef(false);
  useEffect(() => {
    if (locale !== initial.current) chosen.current = true;
    if (authenticated && chosen.current && transport) void transport.saveLanguage(locale).catch(() => false);
  }, [authenticated, locale, transport]);
  return null;
}
