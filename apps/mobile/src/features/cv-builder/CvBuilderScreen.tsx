import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../../theme";
import type { CvPlan, CvResult, MobileSessionTransport } from "../../auth/secureSession";
import { BodyText, Button, Card, Heading, Input, ScreenContainer, SmallText } from "../../ui/primitives";
import { useLocale } from "../../i18n/LocaleContext";
import { formatLocale } from "../marketplace/marketplaceContent";
import { formatExpiry } from "../documents/documentsContent";
import {
  AVAILABILITY,
  CATEGORIES,
  CITIES,
  EDUCATION,
  EXPERIENCE,
  LANGUAGES,
  buildCvProfile,
  categoryFor,
  fallbackText,
  markdownToPlain,
  proStatus
} from "./cvContent";

// "Build your CV" — the website's CV builder in the app. Same questions and the same request; the API
// decides who gets the AI writer (Worker Pro, within its daily limit) and sends the basic CV with its
// own note in EN / FR / AR whenever the AI is not used. Worker Pro is shown as a status only.
export function CvBuilderScreen({ transport, onBack }: { transport: MobileSessionTransport | null; onBack: () => void }) {
  const { t, locale } = useLocale();
  const [categoryKey, setCategoryKey] = useState("kitchen");
  const [fullName, setFullName] = useState("");
  const [cvLanguage, setCvLanguage] = useState<"en" | "fr">(locale === "fr" ? "fr" : "en");
  const [city, setCity] = useState<string>("Laval");
  const [experience, setExperience] = useState<string>("5–10 years");
  const [languages, setLanguages] = useState<string[]>(["Français", "English"]);
  const [skills, setSkills] = useState<string[]>([]);
  const [education, setEducation] = useState<string>("DEP (vocational)");
  const [availability, setAvailability] = useState<string[]>(["Full-time"]);
  const [lastJob, setLastJob] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [cv, setCv] = useState<CvResult | null>(null);
  const [plan, setPlan] = useState<CvPlan | null>(null);

  useEffect(() => {
    if (!transport) return;
    void transport.cvPlan().then((r) => {
      if (r.status === "ready") setPlan(r.data);
    });
  }, [transport]);

  const category = categoryFor(categoryKey);
  const toggle = (list: string[], set: (v: string[]) => void, value: string) => set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const build = async () => {
    if (!transport) return;
    if (!fullName.trim()) return setMessage(t("cv.needName"));
    setBusy(true);
    setMessage(t("cv.building"));
    try {
      const result = await transport.buildCv({
        profile: buildCvProfile({ categoryKey, fullName, city, experience, languages, skills, education, availability, lastJob, cvLanguage }),
        jobTitle: category.label
      });
      if (result.status !== "ready") return setMessage(result.status === "offline" ? t("jobs.msg.offline") : t("cv.failed"));
      setCv(result.data);
      if (result.data.pro !== plan?.pro) setPlan((p) => ({ pro: result.data.pro, source: p?.source ?? null, expiresAt: p?.expiresAt ?? null }));
      setMessage(fallbackText(result.data.fallback, locale) ?? (result.data.saved ? t("cv.readySaved") : t("cv.ready")));
    } finally {
      setBusy(false);
    }
  };

  const pro = proStatus(plan);
  return (
    <ScreenContainer testID="cv-builder-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Button label={t("auth.back")} onPress={onBack} variant="secondary" />
          <Card>
            <Heading>{t("cv.title")}</Heading>
            <BodyText>{t("cv.pageIntro")}</BodyText>
          </Card>

          <Card testID="cv-pro-status">
            <Heading>{t("pro.title")}</Heading>
            <BodyText>{t(pro.key, { date: pro.until ? formatExpiry(pro.until, formatLocale(locale)) : "" })}</BodyText>
          </Card>

          <Card>
            <Step title={t("cv.step1")} />
            <Chips options={CATEGORIES.map((c) => c.label)} value={[category.label]} onToggle={(label) => { setCategoryKey(CATEGORIES.find((c) => c.label === label)?.key ?? "kitchen"); setSkills([]); }} />
            <Step title={t("cv.step2")} />
            <Input label={t("cv.fullName")} value={fullName} onChangeText={setFullName} placeholder="Marie Tremblay" />
            <SmallText>{t("cv.cvLanguage")}</SmallText>
            <Chips options={["English", "Français"]} value={[cvLanguage === "fr" ? "Français" : "English"]} onToggle={(v) => setCvLanguage(v === "Français" ? "fr" : "en")} />
            <SmallText>{t("cv.city")}</SmallText>
            <Chips options={[...CITIES]} value={[city]} onToggle={setCity} />
            <Step title={t("cv.step3")} />
            <Chips options={[...EXPERIENCE]} value={[experience]} onToggle={setExperience} />
            <Step title={t("cv.step4")} />
            <Chips options={[...LANGUAGES]} value={languages} onToggle={(v) => toggle(languages, setLanguages, v)} multi />
            <Step title={t("cv.step5")} />
            <Chips options={[...category.skills]} value={skills} onToggle={(v) => toggle(skills, setSkills, v)} multi />
            <Step title={t("cv.step6")} />
            <Chips options={[...EDUCATION]} value={[education]} onToggle={setEducation} />
            <Step title={t("cv.step7")} />
            <Chips options={[...AVAILABILITY]} value={availability} onToggle={(v) => toggle(availability, setAvailability, v)} multi />
            <Step title={t("cv.step8")} />
            <Input label={t("cv.lastJob")} value={lastJob} onChangeText={setLastJob} placeholder="Bistro Laval" />
            <Button disabled={busy || !transport} label={busy ? t("cv.building") : t("cv.build")} onPress={() => void build()} testID="cv-build" />
            {message ? (
              <View accessibilityLiveRegion="polite" style={styles.notice} testID="cv-message">
                <BodyText>{message}</BodyText>
              </View>
            ) : null}
          </Card>

          {cv ? (
            <Card testID="cv-result">
              <Text selectable style={styles.cvText}>{markdownToPlain(cv.cvMarkdown)}</Text>
              <Heading>{t("cv.coverLetter")}</Heading>
              <Text selectable style={styles.cvText}>{markdownToPlain(cv.coverLetterMarkdown || "—")}</Text>
              <SmallText>{cv.aiWritten ? t("cv.aiWritten") : t("cv.draft")}</SmallText>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Step({ title }: { title: string }) {
  const { isRtl } = useLocale();
  return <Text style={[styles.step, isRtl ? styles.rtl : null]}>{title}</Text>;
}

function Chips({ options, value, onToggle, multi }: { options: readonly string[]; value: readonly string[]; onToggle: (v: string) => void; multi?: boolean }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <Pressable
            accessibilityRole={multi ? "checkbox" : "radio"}
            accessibilityState={multi ? { checked: on } : { selected: on }}
            key={o}
            onPress={() => onToggle(o)}
            style={[styles.chip, on ? styles.chipOn : null]}
          >
            <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{on && multi ? `✓ ${o}` : o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  stack: { gap: spacing.lg, paddingBottom: spacing.xxl },
  step: { color: colors.deepTeal, fontSize: 16, fontWeight: "800", marginTop: spacing.md },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginVertical: spacing.xs },
  chip: { borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  chipOn: { backgroundColor: colors.deepTeal, borderColor: colors.deepTeal },
  chipText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  chipTextOn: { color: "#000000", fontWeight: "800" },
  notice: { backgroundColor: colors.cream, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, marginTop: spacing.sm, padding: spacing.md },
  cvText: { color: colors.text, fontSize: 14, lineHeight: 21 }
});
