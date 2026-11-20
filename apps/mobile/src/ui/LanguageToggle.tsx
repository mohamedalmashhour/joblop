import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocale } from "../i18n/LocaleContext";
import { LOCALES, localeLabel, type Locale } from "../i18n/strings";
import { colors } from "../theme";

const SHORT: Record<Locale, string> = { en: "EN", fr: "FR", ar: "ع" };

/** Compact EN / FR / ع switch for the app header (same look as the websites). */
export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <View accessibilityRole="radiogroup" style={styles.row}>
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <Pressable
            accessibilityLabel={localeLabel[l]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            key={l}
            onPress={() => setLocale(l)}
            style={[styles.chip, active ? styles.chipActive : null]}
            testID={`header-lang-${l}`}
          >
            <Text style={[styles.label, active ? styles.labelActive : null]}>{SHORT[l]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderColor: "rgba(248, 184, 8, 0.35)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden"
  },
  chip: { alignItems: "center", justifyContent: "center", minHeight: 36, minWidth: 40, paddingHorizontal: 10 },
  chipActive: { backgroundColor: colors.actionTeal },
  label: { color: colors.text, fontSize: 13, fontWeight: "800" },
  labelActive: { color: "#000000" }
});
