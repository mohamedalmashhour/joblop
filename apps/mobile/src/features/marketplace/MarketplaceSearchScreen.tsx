import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../../theme";
import type { MarketplaceJob, MobileSessionTransport } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, EmptyState, ErrorState, Heading, Input, LoadingState, ScreenContainer, Section, SmallText } from "../../ui/primitives";
import { formatDistance, formatJobPay, formatJobWhen, formatOpenings } from "./marketplaceContent";
import { certificateChipText } from "./jobDetailContent";
import { useLocale } from "../../i18n/LocaleContext";

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; jobs: readonly MarketplaceJob[] }
  | { status: "empty" | "denied" | "invalid_location" | "unavailable" | "error" };

// Signed-in job search — the website's search words (mk.*): a "Where?" box (city or postal code),
// "Verified employers only", then cards with the worker's own pay, certificates and long-term badge.
export function MarketplaceSearchScreen({
  transport,
  onOpenJob
}: {
  transport: MobileSessionTransport | null;
  onOpenJob: (jobRequestId: string, place: string) => void;
}) {
  const { t, locale, isRtl } = useLocale();
  const [place, setPlace] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [state, setState] = useState<SearchState>({ status: "idle" });

  const search = useCallback(async () => {
    if (!transport || place.trim().length < 2) return;
    setState({ status: "loading" });
    const result = await transport.marketplaceSearch({ postalCode: place.trim(), verifiedOnly, sort: "nearest" });
    if (result.status === "ready") setState({ status: "ready", jobs: result.data.jobs });
    else setState({ status: result.status });
  }, [transport, place, verifiedOnly]);

  return (
    <ScreenContainer testID="marketplace-search-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Card>
            <Heading>{t("mk.heroTitle")}</Heading>
            <BodyText>{t("mk.heroIntro")}</BodyText>
          </Card>

          {!transport ? (
            <Card>
              <BodyText>{t("job.signInToView")}</BodyText>
            </Card>
          ) : (
            <>
              <Card>
                <Input label={t("mk.postalCode")} value={place} onChangeText={setPlace} placeholder={t("mk.postalPlaceholder")} />
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: verifiedOnly }}
                  onPress={() => setVerifiedOnly((v) => !v)}
                  style={styles.checkRow}
                >
                  <View style={[styles.box, verifiedOnly ? styles.boxOn : null]}>{verifiedOnly ? <Text style={styles.tick}>✓</Text> : null}</View>
                  <Text style={[styles.checkLabel, isRtl ? styles.rtl : null]}>{t("mk.verifiedOnly")}</Text>
                </Pressable>
                <Button
                  label={state.status === "loading" ? t("mk.searching") : t("mk.searchJobs")}
                  onPress={() => void search()}
                  disabled={place.trim().length < 2 || state.status === "loading"}
                />
              </Card>

              {state.status === "loading" ? <LoadingState label={t("mk.searching")} /> : null}
              {state.status === "empty" ? <EmptyState title={verifiedOnly ? t("mk.emptyFiltered") : t("mk.empty")} body={t("mk.clearFilters")} /> : null}
              {state.status === "invalid_location" ? <ErrorState title={t("mk.postalCode")} body={t("mk.placeNotFound")} /> : null}
              {state.status === "unavailable" ? <ErrorState title={t("common.somethingWrong")} body={t("mk.placeUnavailable")} /> : null}
              {state.status === "denied" ? <ErrorState title={t("job.signInCta")} body={t("job.signInToView")} /> : null}
              {state.status === "error" ? <ErrorState title={t("common.somethingWrong")} body={t("mk.searchError")} /> : null}

              {state.status === "ready" ? (
                <Section
                  title={t(state.jobs.length === 1 ? "mk.resultsOne" : "mk.resultsMany", { count: state.jobs.length, place: place.trim() })}
                >
                  {state.jobs.map((job) => {
                    const certs = certificateChipText(job.requiredCertificates, locale);
                    const distance = formatDistance(job.distanceKm, locale);
                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={job.jobRequestId}
                        onPress={() => onOpenJob(job.jobRequestId, place.trim())}
                        style={styles.jobCard}
                        testID="marketplace-job-card"
                      >
                        <View style={styles.jobHeader}>
                          <Heading>{job.role}</Heading>
                          {job.payOffered !== undefined ? <Badge label={t("job.longTermChip")} tone="neutral" /> : null}
                        </View>
                        <SmallText>{`${job.employerName}${job.verifiedEmployer ? t("mk.verifiedSuffix") : ""}`}</SmallText>
                        <BodyText>{[job.city, job.province].filter(Boolean).join(", ")}</BodyText>
                        <SmallText>{formatJobWhen(job.startAt, job.endAt, locale)}</SmallText>
                        <View style={styles.metaRow}>
                          <SmallText>{formatOpenings(job.openings, locale)}</SmallText>
                          {distance ? <SmallText>{distance}</SmallText> : null}
                        </View>
                        <Text style={[styles.pay, isRtl ? styles.rtl : null]}>{formatJobPay(job, locale)}</Text>
                        {certs ? <SmallText>{`🎓 ${t("job.certsChip")}: ${certs}`}</SmallText> : null}
                        <Text style={[styles.link, isRtl ? styles.rtl : null]}>{isRtl ? t("mk.viewDetails").replace("→", "←") : t("mk.viewDetails")}</Text>
                      </Pressable>
                    );
                  })}
                </Section>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  stack: { gap: spacing.lg, paddingBottom: spacing.xxl },
  checkRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginVertical: spacing.sm },
  box: { alignItems: "center", borderColor: colors.deepTeal, borderRadius: 4, borderWidth: 2, height: 24, justifyContent: "center", width: 24 },
  boxOn: { backgroundColor: colors.deepTeal },
  tick: { color: "#000000", fontSize: 16, fontWeight: "800" },
  checkLabel: { color: colors.text, flex: 1, fontSize: 15 },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  jobCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  jobHeader: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  pay: { color: colors.deepTeal, fontSize: 15, fontWeight: "800" },
  link: { color: colors.deepTeal, fontSize: 14, fontWeight: "700", marginTop: spacing.xs }
});
