import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle
} from "react-native";
import { spacing } from "../../theme";
import type { MobileSessionTransport, PublicJob, PublicLead } from "../../auth/secureSession";
import { ScreenContainer } from "../../ui/primitives";
import { useLocale } from "../../i18n/LocaleContext";
import {
  ADZUNA_URL,
  EVERYDAY_WORK_QUERY,
  PUBLIC_LIST_LIMIT,
  brandParts,
  columnsForWidth,
  countLabel,
  employerOrigin,
  formatJobDate,
  formatLeadPay,
  isAdzunaLead,
  isUrgentJob,
  leadSubline
} from "./publicJobsContent";

// The FIRST screen for a signed-out person. It mirrors the worker website's front page, section by
// section and with the same words:
//   1. the free job search (website PublicJobSearch, .pjs-*),
//   2. the hero with the four ✓ values and the account card (LandingPanel .landing-hero),
//   3. "How it works" with the four numbered steps (.landing-steps),
//   4. a short "For employers" strip, 5. a small footer with the two account links.
// Seeing a job's details or applying needs a free account (phone-code sign-in), so every job card
// opens Create account. Public, token-free API calls only. The logo sits in the app header above.

type LoadState =
  | { status: "loading" }
  | { status: "ready"; jobs: readonly PublicJob[]; leads: readonly PublicLead[]; leadTotal: number }
  | { status: "offline" | "error" };

const EMPLOYER_URL = employerOrigin(process.env.EXPO_PUBLIC_RWOS_EMPLOYER_ORIGIN);

// Website palette (worker front page).
const web = {
  page: "#000000",
  panel: "#0b0906",
  card: "#141210",
  stepCard: "#0c0c0c",
  cream: "#f4efe4",
  heading: "#fbf7ee",
  sub: "#cabfa8",
  gold: "#f8b808",
  goldLine: "rgba(248, 184, 8, 0.25)",
  goldSoft: "rgba(248, 184, 8, 0.18)",
  goldWash: "rgba(248, 184, 8, 0.1)",
  ink: "#111111",
  meta: "#5c5547",
  places: "#7a5600"
} as const;

const serif = Platform.select({
  ios: "Georgia",
  android: "serif",
  web: "'Playfair Display', 'Fraunces', Georgia, serif",
  default: undefined
});

function openExternal(url: string) {
  void Linking.openURL(url).catch(() => undefined);
}

/** "Joblop" in the brand style (white letters, gold o's) wherever it appears in a sentence. */
function Branded({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={style}>
      {brandParts(text).map((part, index) =>
        part.brand ? (
          <Text key={index} style={styles.brandWord}>
            J<Text style={styles.brandO}>o</Text>bl<Text style={styles.brandO}>o</Text>p
          </Text>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        )
      )}
    </Text>
  );
}

export function PublicJobsScreen({
  transport,
  onWantDetails,
  onCreateAccount,
  onSignIn
}: {
  transport: MobileSessionTransport | null;
  onWantDetails: () => void;
  onCreateAccount: () => void;
  onSignIn: () => void;
}) {
  const { t, locale, isRtl } = useLocale();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [where, setWhere] = useState("");
  const [focused, setFocused] = useState<"what" | "where" | null>(null);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const runId = useRef(0);

  const run = useCallback(
    async (text: string, place: string) => {
      const id = ++runId.current;
      setState({ status: "loading" });
      if (!transport) {
        setState({ status: "error" });
        return;
      }
      const q = text.trim();
      const city = place.trim();
      // Joblop jobs: one search word matches the role or the town, so send the job word first.
      const jobWord = q || city;
      const [jobs, leads] = await Promise.all([
        transport.listPublicJobs({ ...(jobWord ? { q: jobWord } : {}), limit: PUBLIC_LIST_LIMIT }),
        transport.listPublicLeads({ q: q || EVERYDAY_WORK_QUERY, ...(city ? { city } : {}), limit: PUBLIC_LIST_LIMIT })
      ]);
      if (id !== runId.current) return; // a newer search replaced this one
      if (jobs.status === "ready" || leads.status === "ready") {
        setState({
          status: "ready",
          jobs: jobs.status === "ready" ? jobs.jobs : [],
          leads: leads.status === "ready" ? leads.leads : [],
          leadTotal: leads.status === "ready" ? leads.total : 0
        });
      } else if (jobs.status === "offline" || leads.status === "offline") {
        setState({ status: "offline" });
      } else {
        setState({ status: "error" });
      }
    },
    [transport]
  );

  useEffect(() => {
    void run("", "");
  }, [run]);

  const search = useCallback(() => void run(query, where), [run, query, where]);

  const rtl = isRtl ? styles.rtl : null;
  const arrow = isRtl ? "←" : "→";
  const cols = columnsForWidth(width);
  const cellWidth = cols === 1 ? "100%" : cols === 2 ? "50%" : "33.333%";
  const stepWidth = width >= 700 ? "50%" : "100%";
  const total = state.status === "ready" ? state.jobs.length + state.leadTotal : 0;
  const hasResults = state.status === "ready" && (state.jobs.length > 0 || state.leads.length > 0);

  const values = [t("land.v1"), t("land.v2"), t("land.v3"), t("land.v4")];
  const steps = [1, 2, 3, 4].map((n) => ({ title: t(`land.step${n}Title`), body: t(`land.step${n}Body`) }));

  return (
    <ScreenContainer testID="public-jobs-screen">
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll} contentContainerStyle={styles.page}>
        {/* 1 — Search block (website .pjs) */}
        <View style={styles.pjs}>
          <View pointerEvents="none" style={styles.pjsGlow} />
          {/* Search first, like a job app: What + Where, then the button */}
          <View style={styles.searchStack}>
            <View style={[styles.field, focused === "what" ? styles.inputFocused : null, isRtl ? styles.fieldRtl : null]}>
              <Text style={styles.fieldIcon}>🔍</Text>
              <TextInput
                accessibilityLabel={t("publicJobs.searchLabel")}
                maxLength={80}
                onBlur={() => setFocused(null)}
                onChangeText={setQuery}
                onFocus={() => setFocused("what")}
                onSubmitEditing={search}
                placeholder={t("publicJobs.placeholder")}
                placeholderTextColor="#8a8478"
                returnKeyType="search"
                style={[styles.fieldInput, rtl]}
                value={query}
              />
            </View>
            <View style={[styles.field, focused === "where" ? styles.inputFocused : null, isRtl ? styles.fieldRtl : null]}>
              <Text style={styles.fieldIcon}>📍</Text>
              <TextInput
                accessibilityLabel={t("publicJobs.whereLabel")}
                maxLength={60}
                onBlur={() => setFocused(null)}
                onChangeText={setWhere}
                onFocus={() => setFocused("where")}
                onSubmitEditing={search}
                placeholder={t("publicJobs.wherePlaceholder")}
                placeholderTextColor="#8a8478"
                returnKeyType="search"
                style={[styles.fieldInput, rtl]}
                value={where}
              />
            </View>
            <Pressable
              onPress={search}
              accessibilityRole="button"
              testID="public-jobs-search"
              style={({ pressed }) => [styles.searchButtonWide, pressed ? styles.pressed : null]}
            >
              <Text style={styles.searchButtonText}>{t("publicJobs.findJobs")}</Text>
            </Pressable>
          </View>
          <Text style={[styles.noAccount, rtl]}>{t("publicJobs.noAccount")}</Text>

          {state.status === "loading" ? (
            <View style={styles.noteRow}>
              <ActivityIndicator color={web.gold} size="small" />
              <Text style={[styles.note, rtl]}>{t("publicJobs.loading")}</Text>
            </View>
          ) : null}

          {state.status === "offline" || state.status === "error" ? (
            <View accessibilityRole="alert" style={styles.problem}>
              <Text style={[styles.problemTitle, rtl]}>
                {t(state.status === "offline" ? "publicJobs.offlineTitle" : "publicJobs.errorTitle")}
              </Text>
              <Text style={[styles.note, rtl]}>
                {t(state.status === "offline" ? "publicJobs.offlineBody" : "publicJobs.errorBody")}
              </Text>
              <Pressable onPress={search} accessibilityRole="button" style={({ pressed }) => [styles.smallOutline, pressed ? styles.pressed : null]}>
                <Text style={styles.smallOutlineText}>{t("publicJobs.retry")}</Text>
              </Pressable>
            </View>
          ) : null}

          {state.status === "ready" && !hasResults ? <Text style={[styles.note, rtl]}>{t("publicJobs.none")}</Text> : null}

          {state.status === "ready" && hasResults ? (
            <>
              <Text accessibilityLiveRegion="polite" style={[styles.count, rtl]}>
                {countLabel(total, t("publicJobs.foundOne"), t("publicJobs.foundMany"))}
              </Text>

              {state.jobs.length ? (
                <>
                  <Branded text={t("publicJobs.joblopJobs")} style={[styles.pjsH, rtl]} />
                  <View style={styles.grid}>
                    {state.jobs.map((job) => {
                      const date = formatJobDate(job.startAt, locale);
                      const places = countLabel(job.openings, t("publicJobs.placesOne"), t("publicJobs.placesMany"));
                      return (
                        <View key={job.jobCode} style={[styles.cell, { width: cellWidth }]}>
                          <Pressable
                            onPress={onWantDetails}
                            accessibilityHint={t("publicJobs.detailsHint")}
                            accessibilityRole="button"
                            style={({ pressed }) => [styles.jobCard, styles.ownCard, pressed ? styles.cardPressed : null]}
                          >
                            <Text style={styles.badge}>{t("publicJobs.joblopBadge")}</Text>
                            <Text style={[styles.cardTitle, rtl]}>{job.role}</Text>
                            <Text style={[styles.meta, rtl]}>{`📍 ${[job.areaLabel, date].filter(Boolean).join(" · ")}`}</Text>
                            <View style={styles.foot}>
                              <Text style={styles.places}>
                                {isUrgentJob(job.urgency) ? `${places} · ${t("publicJobs.urgent")}` : places}
                              </Text>
                              <Text style={styles.open}>{`${t("publicJobs.seeDetails")} ${arrow}`}</Text>
                            </View>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {state.leads.length ? (
                <>
                  <Text style={[styles.pjsH, rtl]}>{t("publicJobs.moreJobs")}</Text>
                  <View style={styles.grid}>
                    {state.leads.map((lead, index) => {
                      const pay = formatLeadPay(lead);
                      const sub = leadSubline(lead);
                      return (
                        <View key={`${lead.url ?? lead.title}-${index}`} style={[styles.cell, { width: cellWidth }]}>
                          <Pressable
                            onPress={onWantDetails}
                            accessibilityHint={t("publicJobs.detailsHint")}
                            accessibilityRole="button"
                            style={({ pressed }) => [styles.jobCard, pressed ? styles.cardPressed : null]}
                          >
                            <Text style={[styles.cardTitle, rtl]}>{lead.title}</Text>
                            {sub ? <Text style={[styles.meta, rtl]}>{sub}</Text> : null}
                            <View style={styles.foot}>
                              <Text style={styles.places}>{pay ?? ""}</Text>
                              <Text style={styles.open}>{`${t("publicJobs.seeDetails")} ${arrow}`}</Text>
                            </View>
                          </Pressable>
                          {isAdzunaLead(lead) ? (
                            <Pressable onPress={() => openExternal(ADZUNA_URL)} accessibilityRole="link" hitSlop={8} style={styles.adzuna}>
                              <Text style={styles.adzunaText}>Adzuna</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </>
          ) : null}

          <Text style={[styles.gate, rtl]}>{`🔒 ${t("publicJobs.detailsHint")}`}</Text>
        </View>

        {/* 2 — Hero (website .landing-hero) */}
        <View style={styles.hero}>
          <Branded text={t("land.heroTitle")} style={[styles.heroTitle, rtl]} />
          <Branded text={t("land.heroSub")} style={[styles.heroSub, rtl]} />
          <View style={styles.values}>
            {values.map((value) => (
              <View key={value} style={styles.valueRow}>
                <View style={styles.tick}>
                  <Text style={styles.tickText}>✓</Text>
                </View>
                <Branded text={value} style={[styles.valueText, rtl]} />
              </View>
            ))}
          </View>

          <View style={styles.authCard}>
            <Pressable
              onPress={onCreateAccount}
              accessibilityRole="button"
              testID="public-jobs-create-account"
              style={({ pressed }) => [styles.goldButton, pressed ? styles.pressed : null]}
            >
              <Text style={styles.goldButtonText}>{t("land.getStarted")}</Text>
            </Pressable>
            <Pressable
              onPress={onSignIn}
              accessibilityRole="button"
              testID="public-jobs-sign-in"
              style={({ pressed }) => [styles.outlineButton, pressed ? styles.pressed : null]}
            >
              <Text style={styles.outlineButtonText}>{t("land.haveAccountCta")}</Text>
            </Pressable>
          </View>
        </View>

        {/* 3 — How it works (website .landing-steps) */}
        <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, rtl]}>
            {t("land.howItWorks")}
          </Text>
          <View style={styles.grid}>
            {steps.map((step, index) => (
              <View key={step.title} style={[styles.cell, { width: stepWidth }]}>
                <View style={styles.stepCard}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepCopy}>
                    <Branded text={step.title} style={[styles.stepTitle, rtl]} />
                    <Branded text={step.body} style={[styles.stepBody, rtl]} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 4 — For employers */}
        <View style={styles.employers}>
          <Branded text={t("publicJobs.employersLine")} style={[styles.employersText, rtl]} />
          <Pressable
            onPress={() => openExternal(EMPLOYER_URL)}
            accessibilityRole="link"
            testID="public-jobs-employers"
            style={({ pressed }) => [styles.smallOutline, pressed ? styles.pressed : null]}
          >
            <Text style={styles.smallOutlineText}>{`${t("publicJobs.forEmployers")} ${arrow}`}</Text>
          </Pressable>
        </View>

        {/* 5 — Footer */}
        <View style={styles.footer}>
          <Pressable onPress={onCreateAccount} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.footerLink}>{t("publicJobs.createAccount")}</Text>
          </Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable onPress={onSignIn} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.footerLink}>{t("publicJobs.signIn")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  page: { gap: spacing.xxl, paddingBottom: spacing.xxl, backgroundColor: web.page },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  pressed: { opacity: 0.85 },

  brandWord: { color: "#ffffff", fontWeight: "800" },
  brandO: { color: web.gold },

  // 1 — search block
  pjs: {
    backgroundColor: web.panel,
    borderColor: web.goldLine,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    padding: 20,
    shadowColor: web.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 22
  },
  pjsGlow: {
    backgroundColor: "rgba(248, 184, 8, 0.12)",
    borderRadius: 999,
    height: 240,
    left: -90,
    position: "absolute",
    top: -150,
    width: 360
  },
  searchStack: { gap: 10 },
  field: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "rgba(248, 184, 8, 0.35)",
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 14
  },
  fieldRtl: { flexDirection: "row-reverse" },
  fieldIcon: { fontSize: 16 },
  fieldInput: { color: web.ink, flex: 1, fontSize: 16, minWidth: 0, paddingVertical: 12 },
  inputFocused: { borderColor: web.gold },
  searchButtonWide: {
    alignItems: "center",
    backgroundColor: web.gold,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 52
  },
  noAccount: { color: web.sub, fontSize: 14, lineHeight: 20, marginTop: 10 },
  searchButtonText: { color: web.ink, fontSize: 16, fontWeight: "800" },
  noteRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginTop: 14 },
  note: { color: web.sub, fontSize: 15, lineHeight: 21, marginTop: 14 },
  problem: { gap: 4, marginTop: 6 },
  problemTitle: { color: web.cream, fontSize: 16, fontWeight: "800", marginTop: 14 },
  count: { color: web.gold, fontSize: 16, fontWeight: "700", marginTop: 14 },
  pjsH: { color: web.heading, fontSize: 15, fontWeight: "700", marginBottom: 8, marginTop: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  cell: { gap: 6, padding: 6 },
  jobCard: {
    backgroundColor: "#ffffff",
    borderColor: web.goldSoft,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 14
  },
  ownCard: { borderColor: web.gold, borderWidth: 2 },
  cardPressed: { borderColor: web.gold, opacity: 0.92 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: web.gold,
    borderRadius: 999,
    color: web.ink,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  cardTitle: { color: web.ink, fontSize: 15, fontWeight: "800", lineHeight: 20 },
  meta: { color: web.meta, fontSize: 13 },
  foot: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between", marginTop: 2 },
  places: { color: web.places, flexShrink: 1, fontSize: 14, fontWeight: "700" },
  open: { color: web.ink, fontSize: 14, fontWeight: "700" },
  adzuna: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 6,
    justifyContent: "center",
    minHeight: 24,
    minWidth: 116,
    paddingHorizontal: 10
  },
  adzunaText: { color: "#d8d2c4", fontSize: 14, fontWeight: "700", textDecorationLine: "underline" },
  gate: {
    backgroundColor: web.goldWash,
    borderRadius: 12,
    color: web.cream,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 16,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 12
  },

  // 2 — hero
  hero: { gap: 14 },
  heroTitle: { color: web.cream, fontFamily: serif, fontSize: 32, fontWeight: "800", lineHeight: 38 },
  heroSub: { color: web.sub, fontSize: 17, lineHeight: 25 },
  values: { gap: 10, marginTop: 4 },
  valueRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  tick: {
    alignItems: "center",
    backgroundColor: web.gold,
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  tickText: { color: web.ink, fontSize: 14, fontWeight: "900" },
  valueText: { color: web.cream, flex: 1, fontSize: 16, fontWeight: "600", lineHeight: 22 },
  authCard: {
    backgroundColor: web.card,
    borderColor: web.goldLine,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
    padding: 18
  },
  goldButton: {
    alignItems: "center",
    backgroundColor: web.gold,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 18
  },
  goldButtonText: { color: web.ink, fontSize: 17, fontWeight: "800", textAlign: "center" },
  outlineButton: {
    alignItems: "center",
    borderColor: web.gold,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 18
  },
  outlineButtonText: { color: web.cream, fontSize: 17, fontWeight: "700", textAlign: "center" },

  // 3 — how it works
  section: { gap: 10 },
  sectionTitle: { color: web.cream, fontFamily: serif, fontSize: 26, fontWeight: "800", marginBottom: 4 },
  stepCard: {
    alignItems: "flex-start",
    backgroundColor: web.stepCard,
    borderColor: web.goldSoft,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 18
  },
  stepNumber: {
    alignItems: "center",
    backgroundColor: web.gold,
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  stepNumberText: { color: web.ink, fontSize: 15, fontWeight: "800" },
  stepCopy: { flex: 1, gap: 4 },
  stepTitle: { color: web.cream, fontSize: 16, fontWeight: "800" },
  stepBody: { color: web.sub, fontSize: 14.5, lineHeight: 21 },

  // 4 — employers
  employers: {
    alignItems: "flex-start",
    backgroundColor: web.card,
    borderColor: web.goldSoft,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 18
  },
  employersText: { alignSelf: "stretch", color: web.cream, fontSize: 16, fontWeight: "700", lineHeight: 22 },
  smallOutline: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: web.gold,
    borderRadius: 999,
    borderWidth: 1.5,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 18
  },
  smallOutlineText: { color: web.gold, fontSize: 15, fontWeight: "800" },

  // 5 — footer
  footer: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "center", paddingVertical: spacing.sm },
  footerLink: { color: web.gold, fontSize: 14, fontWeight: "700" },
  footerDot: { color: web.sub, fontSize: 14 }
});
