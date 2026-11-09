import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../../theme";
import type { JobCategoryChoice, MobileSessionTransport, WorkerIntake, WorkerProfile } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, ErrorState, Heading, Input, LoadingState, ScreenContainer, Section, SmallText } from "../../ui/primitives";
import { useLocale } from "../../i18n/LocaleContext";
import { LOCALES, localeLabel, type Locale } from "../../i18n/strings";
import { LegalLinks } from "../legal";
import { formatLocale } from "../marketplace/marketplaceContent";
import { formatExpiry } from "../documents/documentsContent";
import { categoryLabelKey, credentialStatusKey, intakeBody, standingKey } from "./profileContent";

type State =
  | { status: "loading" }
  | { status: "ready"; profile: WorkerProfile }
  | { status: "denied" | "needs_setup" | "error" };

// "My profile" — the website's HR profile page in the app: standing, your details (with the same
// consent and text-message words), credentials and their expiry, "Jobs I want", a link to Documents,
// the language your offers and notices use (saved on your account), and Terms / Privacy / Delete.
export function ProfileScreen({
  transport,
  onOpenDocuments,
  onOpenCv,
  onOpenSetup
}: {
  transport: MobileSessionTransport | null;
  onOpenDocuments: () => void;
  onOpenCv: () => void;
  onOpenSetup?: () => void;
}) {
  const { t, locale } = useLocale();
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    if (!transport) return setState({ status: "denied" });
    const result = await transport.workerProfile();
    if (result.status === "ready") setState({ status: "ready", profile: result.data });
    else if (result.status === "denied" || result.status === "needs_setup") setState({ status: result.status });
    else setState({ status: "error" });
  }, [transport]);

  useEffect(() => {
    void load();
  }, [load]);

  const loc = formatLocale(locale);
  const needsAction = state.status === "ready" ? state.profile.credentials.filter((c) => c.effectiveStatus === "expired" || c.effectiveStatus === "expiring") : [];
  return (
    <ScreenContainer testID="profile-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Card>
            <Heading>{t("hr.title")}</Heading>
            <BodyText>{t("hr.intro")}</BodyText>
          </Card>

          <LanguageCard transport={transport} />

          <Card>
            <Heading>{t("cv.title")}</Heading>
            <BodyText>{t("cv.intro")}</BodyText>
            <Button label={t("cv.open")} onPress={onOpenCv} testID="profile-open-cv" />
          </Card>

          {state.status === "loading" ? <LoadingState label={t("common.loading")} /> : null}
          {state.status === "denied" ? <ErrorState title={t("job.signInCta")} body={t("hr.signInPrompt")} /> : null}
          {state.status === "needs_setup" ? (
            <ErrorState
              title={t("common.setUpWorker")}
              body={t("common.needsWorkerSetup")}
              action={onOpenSetup ? <Button label={t("common.setUpWorker")} onPress={onOpenSetup} /> : undefined}
            />
          ) : null}
          {state.status === "error" ? (
            <ErrorState title={t("common.somethingWrong")} body={t("hr.loadError")} action={<Button label={t("common.retry")} onPress={() => void load()} variant="secondary" />} />
          ) : null}

          {state.status === "ready" ? (
            <>
              <Card>
                <SmallText>{t("hr.standing")}</SmallText>
                <Badge label={state.profile.standing.replaceAll("_", " ")} tone={state.profile.standing === "active" ? "success" : "warning"} />
                <BodyText>{t(standingKey(state.profile.standing))}</BodyText>
              </Card>

              <IntakeForm key={state.profile.intake ? "loaded" : "empty"} initial={state.profile.intake} transport={transport} onSaved={load} onOpenDocuments={onOpenDocuments} />

              {needsAction.length > 0 ? (
                <Card>
                  <Heading>{t("hr.requiredActions")}</Heading>
                  <SmallText>{t("hr.someNeedAttention")}</SmallText>
                  {needsAction.map((c) => (
                    <Badge key={c.id} label={`${c.credentialType}: ${t(credentialStatusKey(c.effectiveStatus))}`} tone={c.effectiveStatus === "expired" ? "danger" : "warning"} />
                  ))}
                </Card>
              ) : null}

              <Section title={t("hr.credentials")}>
                {state.profile.credentials.length === 0 ? (
                  <Card>
                    <BodyText>{t("hr.noCredentials")}</BodyText>
                  </Card>
                ) : (
                  state.profile.credentials.map((c) => (
                    <Card key={c.id}>
                      <Heading>{c.credentialType}</Heading>
                      <View style={styles.chips}>
                        <Badge label={t(credentialStatusKey(c.effectiveStatus))} tone={c.effectiveStatus === "valid" ? "success" : c.effectiveStatus === "expiring" ? "warning" : "danger"} />
                        {c.expiresAt ? <Badge label={t("common.expires", { date: formatExpiry(c.expiresAt, loc) })} tone="neutral" /> : null}
                      </View>
                    </Card>
                  ))
                )}
              </Section>

              <JobCategories transport={transport} />

              <Card>
                <Heading>{t("hr.certificates")}</Heading>
                <BodyText>{t("hr.certsIntro")}</BodyText>
                <Button label={t("hr.manageDocs")} onPress={onOpenDocuments} variant="secondary" testID="profile-open-documents" />
              </Card>
            </>
          ) : null}

          <Card>
            <Heading>{t("legal.title")}</Heading>
            <SmallText>{t("legal.intro")}</SmallText>
            <LegalLinks />
          </Card>
          <SmallText>{t("hr.footer")}</SmallText>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// The language Joblop uses for the worker's offers, texts, emails and push notices. Picking one here
// switches the app and saves it on the account (PUT /worker/language), as the website does.
function LanguageCard({ transport }: { transport: MobileSessionTransport | null }) {
  const { t, locale, setLocale } = useLocale();
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const choose = async (next: Locale) => {
    setLocale(next);
    if (!transport) return;
    setSaved("saving");
    setSaved((await transport.saveLanguage(next)) ? "saved" : "failed");
  };
  return (
    <Card testID="profile-language">
      <Heading>{t("profile.languageTitle")}</Heading>
      <SmallText>{t("profile.languageIntro")}</SmallText>
      <View style={styles.chips}>
        {LOCALES.map((l) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: l === locale }}
            key={l}
            onPress={() => void choose(l)}
            style={[styles.chip, l === locale ? styles.chipOn : null]}
            testID={`profile-lang-${l}`}
          >
            <Text style={[styles.chipText, l === locale ? styles.chipTextOn : null]}>{localeLabel[l]}</Text>
          </Pressable>
        ))}
      </View>
      {saved === "saved" ? <SmallText>{t("profile.languageSaved")}</SmallText> : null}
      {saved === "failed" ? <SmallText>{t("profile.languageFailed")}</SmallText> : null}
    </Card>
  );
}

function IntakeForm({
  initial,
  transport,
  onSaved,
  onOpenDocuments
}: {
  initial: WorkerIntake | null;
  transport: MobileSessionTransport | null;
  onSaved: () => Promise<void>;
  onOpenDocuments: () => void;
}) {
  const { t } = useLocale();
  const [form, setForm] = useState<WorkerIntake>(
    initial ?? {
      legalFirstName: "",
      legalLastName: "",
      phone: "",
      addressLine: "",
      city: "",
      province: "",
      postalCode: "",
      hasDrivingLicence: false,
      licenceClass: "",
      licenceExpiry: "",
      hasVehicle: false,
      transportNotes: "",
      marketingEmailOptIn: false
    }
  );
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<"ok" | "err" | "consent" | null>(null);
  const set = <K extends keyof WorkerIntake>(key: K, value: WorkerIntake[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setNotice(null);
    if (!consent) return setNotice("consent");
    if (!transport) return setNotice("err");
    setSaving(true);
    try {
      const result = await transport.saveWorkerIntake(intakeBody(form));
      if (result.status === "ready") {
        setNotice("ok");
        await onSaved();
      } else setNotice("err");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card testID="profile-intake">
      <Heading>{t("hr.intakeTitle")}</Heading>
      <SmallText>{t("hr.intakeIntro")}</SmallText>
      <Input label={t("hr.fFirstName")} value={form.legalFirstName} onChangeText={(v) => set("legalFirstName", v)} />
      <Input label={t("hr.fLastName")} value={form.legalLastName} onChangeText={(v) => set("legalLastName", v)} />
      <Input label={t("hr.fPhone")} value={form.phone} onChangeText={(v) => set("phone", v)} />
      <SmallText>{t("hr.smsConsent")}</SmallText>
      <Input label={t("hr.fAddress")} value={form.addressLine} onChangeText={(v) => set("addressLine", v)} />
      <Input label={t("hr.fCity")} value={form.city} onChangeText={(v) => set("city", v)} />
      <Input label={t("hr.fProvince")} value={form.province} onChangeText={(v) => set("province", v)} />
      <Input label={t("hr.fPostal")} value={form.postalCode} onChangeText={(v) => set("postalCode", v)} />
      <Check label={t("hr.hasLicence")} checked={form.hasDrivingLicence} onToggle={() => set("hasDrivingLicence", !form.hasDrivingLicence)} />
      {form.hasDrivingLicence ? (
        <>
          <Input label={t("hr.fLicenceClass")} value={form.licenceClass} onChangeText={(v) => set("licenceClass", v.slice(0, 32))} />
          <Input label={t("hr.fLicenceExpiry")} value={form.licenceExpiry} onChangeText={(v) => set("licenceExpiry", v.slice(0, 10))} placeholder="AAAA-MM-JJ / YYYY-MM-DD" />
        </>
      ) : null}
      <Check label={t("hr.hasVehicle")} checked={form.hasVehicle} onToggle={() => set("hasVehicle", !form.hasVehicle)} />
      <Input label={t("hr.fTransportNotes")} value={form.transportNotes} onChangeText={(v) => set("transportNotes", v)} />
      <Check label={t("hr.marketingOptIn")} checked={form.marketingEmailOptIn} onToggle={() => set("marketingEmailOptIn", !form.marketingEmailOptIn)} />
      <Check label={t("hr.consent")} checked={consent} onToggle={() => setConsent((c) => !c)} testID="profile-consent" />
      {notice === "err" ? <SmallText>{t("hr.saveError")}</SmallText> : null}
      {notice === "consent" ? <SmallText>{t("hr.mustConsent")}</SmallText> : null}
      {notice === "ok" ? (
        <View style={styles.ok}>
          <BodyText>{t("hr.savedContinue")}</BodyText>
          <Button label={t("hr.continueProfile")} onPress={onOpenDocuments} variant="secondary" />
        </View>
      ) : null}
      <Button disabled={saving} label={saving ? t("hr.saving") : t("hr.save")} onPress={() => void save()} testID="profile-save" />
    </Card>
  );
}

function JobCategories({ transport }: { transport: MobileSessionTransport | null }) {
  const { t } = useLocale();
  const [categories, setCategories] = useState<readonly JobCategoryChoice[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!transport) return;
    void transport.jobCategories().then((r) => (r.status === "ready" ? setCategories(r.data) : setFailed(true)));
  }, [transport]);
  if (!transport || (!categories && !failed)) return null;
  const toggle = async (key: string) => {
    if (!categories) return;
    const previous = categories;
    const next = categories.map((c) => (c.key === key ? { ...c, selected: !c.selected } : c));
    setCategories(next);
    setFailed(false);
    const saved = await transport.saveJobCategories(next.filter((c) => c.selected).map((c) => c.key));
    if (saved.status !== "ready") {
      setCategories(previous);
      setFailed(true);
    }
  };
  return (
    <Card>
      <Heading>{t("cat.title")}</Heading>
      <SmallText>{t("cat.intro")}</SmallText>
      {failed ? <SmallText>{t("cat.saveError")}</SmallText> : null}
      <View style={styles.chips}>
        {(categories ?? []).map((c) => {
          const key = categoryLabelKey(c.key);
          const label = key ? t(key) : c.label;
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: c.selected }}
              key={c.key}
              onPress={() => void toggle(c.key)}
              style={[styles.chip, c.selected ? styles.chipOn : null]}
            >
              <Text style={[styles.chipText, c.selected ? styles.chipTextOn : null]}>{c.selected ? `✓ ${label}` : label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function Check({ label, checked, onToggle, testID }: { label: string; checked: boolean; onToggle: () => void; testID?: string }) {
  const { isRtl } = useLocale();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle} style={styles.checkRow} testID={testID}>
      <View style={[styles.box, checked ? styles.boxOn : null]}>{checked ? <Text style={styles.tick}>✓</Text> : null}</View>
      <Text style={[styles.checkLabel, isRtl ? styles.rtl : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  stack: { gap: spacing.lg, paddingBottom: spacing.xxl },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginVertical: spacing.xs },
  chip: { borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  chipOn: { backgroundColor: colors.deepTeal, borderColor: colors.deepTeal },
  chipText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  chipTextOn: { color: "#000000", fontWeight: "800" },
  checkRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  box: { alignItems: "center", borderColor: colors.deepTeal, borderRadius: 4, borderWidth: 2, height: 24, justifyContent: "center", width: 24 },
  boxOn: { backgroundColor: colors.deepTeal },
  tick: { color: "#000000", fontSize: 16, fontWeight: "800" },
  checkLabel: { color: colors.text, flex: 1, fontSize: 15 },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  ok: { backgroundColor: colors.cream, borderColor: colors.success, borderRadius: radii.md, borderWidth: 1, gap: spacing.xs, padding: spacing.md }
});
