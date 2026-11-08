import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../../theme";
import type { MobileSessionTransport, PublicJob, PublicLead } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, EmptyState, ErrorState, Heading, Input, LoadingState, ScreenContainer, Section, SmallText } from "../../ui/primitives";
import { useLocale } from "../../i18n/LocaleContext";
import {
  ADZUNA_URL,
  EVERYDAY_WORK_QUERY,
  PUBLIC_LIST_LIMIT,
  countLabel,
  employerOrigin,
  formatJobDate,
  formatLeadPay,
  isAdzunaLead,
  isUrgentJob,
  leadSubline
} from "./publicJobsContent";

// The FIRST screen for a signed-out person (owner rule, same as the website): search jobs free with
// no account. Seeing a job's details or applying needs a free account (phone-code sign-in), so every
// job card opens Create account. Public, token-free API calls only.

type LoadState =
  | { status: "loading" }
  | { status: "ready"; jobs: readonly PublicJob[]; leads: readonly PublicLead[]; leadTotal: number }
  | { status: "offline" | "error" };

const EMPLOYER_URL = employerOrigin(process.env.EXPO_PUBLIC_RWOS_EMPLOYER_ORIGIN);

function openExternal(url: string) {
  void Linking.openURL(url).catch(() => undefined);
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
  const { t, locale } = useLocale();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const runId = useRef(0);

  const run = useCallback(
    async (text: string) => {
      const id = ++runId.current;
      setState({ status: "loading" });
      if (!transport) {
        setState({ status: "error" });
        return;
      }
      const q = text.trim();
      const [jobs, leads] = await Promise.all([
        transport.listPublicJobs({ ...(q ? { q } : {}), limit: PUBLIC_LIST_LIMIT }),
        transport.listPublicLeads({ q: q || EVERYDAY_WORK_QUERY, limit: PUBLIC_LIST_LIMIT })
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
    void run("");
  }, [run]);

  const search = useCallback(() => void run(query), [run, query]);
  const retry = useCallback(() => void run(query), [run, query]);

  const total = state.status === "ready" ? state.jobs.length + state.leadTotal : 0;

  return (
    <ScreenContainer testID="public-jobs-screen">
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
        <View style={styles.stack}>
          <Card>
            <Heading>{t("publicJobs.title")}</Heading>
            <BodyText>{t("publicJobs.sub")}</BodyText>
            <View style={styles.actions}>
              <Button label={t("publicJobs.createAccount")} onPress={onCreateAccount} testID="public-jobs-create-account" />
              <Button label={t("publicJobs.signIn")} onPress={onSignIn} variant="secondary" testID="public-jobs-sign-in" />
            </View>
          </Card>

          <Card>
            <Input
              label={t("publicJobs.searchLabel")}
              onChangeText={setQuery}
              placeholder={t("publicJobs.placeholder")}
              value={query}
            />
            <View style={styles.searchRow}>
              <Button label={t("publicJobs.search")} onPress={search} testID="public-jobs-search" />
            </View>
          </Card>

          {state.status === "loading" ? <LoadingState label={t("publicJobs.loading")} /> : null}
          {state.status === "offline" ? (
            <ErrorState
              title={t("publicJobs.offlineTitle")}
              body={t("publicJobs.offlineBody")}
              action={<Button label={t("publicJobs.retry")} onPress={retry} variant="secondary" />}
            />
          ) : null}
          {state.status === "error" ? (
            <ErrorState
              title={t("publicJobs.errorTitle")}
              body={t("publicJobs.errorBody")}
              action={<Button label={t("publicJobs.retry")} onPress={retry} variant="secondary" />}
            />
          ) : null}

          {state.status === "ready" ? (
            <>
              <Text accessibilityLiveRegion="polite" style={styles.found}>
                {countLabel(total, t("publicJobs.foundOne"), t("publicJobs.foundMany"))}
              </Text>
              {total === 0 ? <EmptyState title={t("publicJobs.noneTitle")} body={t("publicJobs.noneBody")} /> : null}

              {state.jobs.length ? (
                <Section title={t("publicJobs.joblopJobs")}>
                  {state.jobs.map((job) => (
                    <Pressable
                      onPress={onWantDetails}
                      accessibilityHint={t("publicJobs.detailsHint")}
                      accessibilityRole="button"
                      key={job.jobCode}
                      style={styles.card}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{job.role}</Text>
                        {isUrgentJob(job.urgency) ? <Badge label={t("publicJobs.urgent")} tone="warning" /> : null}
                      </View>
                      <SmallText>{[job.areaLabel, formatJobDate(job.startAt, locale)].filter(Boolean).join(" · ")}</SmallText>
                      <Text style={styles.places}>
                        {countLabel(job.openings, t("publicJobs.placesOne"), t("publicJobs.placesMany"))}
                      </Text>
                    </Pressable>
                  ))}
                </Section>
              ) : null}

              {state.leads.length ? (
                <Section title={t("publicJobs.moreJobs")}>
                  {state.leads.map((lead, index) => {
                    const pay = formatLeadPay(lead);
                    return (
                      <Pressable
                        onPress={onWantDetails}
                        accessibilityHint={t("publicJobs.detailsHint")}
                        accessibilityRole="button"
                        key={`${lead.url ?? lead.title}-${index}`}
                        style={styles.card}
                      >
                        <Text style={styles.cardTitle}>{lead.title}</Text>
                        {leadSubline(lead) ? <SmallText>{leadSubline(lead)}</SmallText> : null}
                        <View style={styles.cardFooter}>
                          {pay ? <Text style={styles.pay}>{pay}</Text> : <View />}
                          {isAdzunaLead(lead) ? (
                            <Pressable
                              onPress={() => openExternal(ADZUNA_URL)}
                              accessibilityRole="link"
                              hitSlop={8}
                              style={styles.source}
                            >
                              <Text style={styles.sourceText}>Adzuna</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </Section>
              ) : null}
            </>
          ) : null}

          <Card>
            <BodyText>{t("publicJobs.detailsHint")}</BodyText>
            <View style={styles.actions}>
              <Button label={t("publicJobs.createAccount")} onPress={onCreateAccount} />
              <Button label={t("publicJobs.forEmployers")} onPress={() => openExternal(EMPLOYER_URL)} variant="secondary" testID="public-jobs-employers" />
            </View>
          </Card>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  stack: { gap: spacing.lg, paddingBottom: spacing.xxl },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md },
  searchRow: { flexDirection: "row", marginTop: spacing.md },
  found: { color: colors.deepTeal, fontSize: typography.body, fontWeight: "800" },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  cardTitle: { color: colors.text, flexShrink: 1, fontSize: typography.body, fontWeight: "800" },
  places: { color: colors.deepTeal, fontSize: typography.small, fontWeight: "700" },
  cardFooter: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  pay: { color: colors.success, fontSize: typography.small, fontWeight: "700" },
  source: {
    backgroundColor: colors.cream,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  sourceText: { color: colors.muted, fontSize: typography.small, fontWeight: "700" }
});
