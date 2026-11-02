import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "../../theme";
import { BodyText, Card, Heading, ScreenContainer, SmallText } from "../../ui/primitives";
import { useLocale } from "../../i18n/LocaleContext";
import { LOCALES, localeLabel } from "../../i18n/strings";
import { homeDestinations, type HomeDestination } from "./homeContent";

// The worker's real home: a greeting, a language switch (EN / FR / العربية), and quick routes to every
// live destination (and onboarding). Fully translated; Arabic renders right-to-left.
export function HomeScreen({
  authenticated,
  onOpen
}: {
  authenticated: boolean;
  onOpen: (destination: HomeDestination) => void;
}) {
  const { t, locale, setLocale } = useLocale();

  return (
    <ScreenContainer testID="home-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Card>
            <Heading>{t("home.title")}</Heading>
            <BodyText>{t("home.intro")}</BodyText>
            {!authenticated ? <SmallText>{t("home.signedOut")}</SmallText> : null}
            <View style={styles.langRow}>
              {LOCALES.map((l) => {
                const active = l === locale;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    key={l}
                    onPress={() => setLocale(l)}
                    style={[styles.langChip, active ? styles.langChipActive : null]}
                    testID={`lang-${l}`}
                  >
                    <SmallText>{localeLabel[l]}</SmallText>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {homeDestinations.map((d) => (
            <Pressable
              accessibilityRole="button"
              key={d.id}
              onPress={() => onOpen(d.id)}
              style={styles.tile}
              testID={`home-tile-${d.id}`}
            >
              <Heading>{t(`home.${d.id}.label`)}</Heading>
              <SmallText>{t(`home.${d.id}.desc`)}</SmallText>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  stack: { gap: spacing.md, paddingBottom: spacing.xxl },
  tile: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg
  },
  langRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  langChip: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  langChipActive: { backgroundColor: colors.actionTeal }
});
