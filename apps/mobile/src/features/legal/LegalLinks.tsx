import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../../theme";
import { useLocale } from "../../i18n/LocaleContext";
import { legalUrl, workerOrigin, type LegalPage } from "./legalLinkRules";

const ORIGIN = workerOrigin(process.env.EXPO_PUBLIC_RWOS_WORKER_ORIGIN);

const LABEL_KEYS: Readonly<Record<LegalPage, string>> = {
  terms: "legal.terms",
  privacy: "legal.privacy",
  "account-deletion": "legal.deleteAccount"
};

/** Terms, Privacy and "Delete my account" — each opens the worker website page in the app's language. */
export function LegalLinks({ pages = ["terms", "privacy", "account-deletion"] }: { pages?: readonly LegalPage[] }) {
  const { t, locale } = useLocale();
  return (
    <View style={styles.row}>
      {pages.map((page) => (
        <Pressable
          accessibilityRole="link"
          key={page}
          onPress={() => void Linking.openURL(legalUrl(ORIGIN, page, locale)).catch(() => undefined)}
          testID={`legal-link-${page}`}
        >
          <Text style={styles.link}>{t(LABEL_KEYS[page])}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.sm },
  link: { color: colors.deepTeal, fontSize: 14, fontWeight: "700", textDecorationLine: "underline" }
});
