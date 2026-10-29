import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "@rwos/design-system";
import type { MarketplaceJob, MobileSessionTransport } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, EmptyState, ErrorState, Heading, Input, LoadingState, ScreenContainer, Section, SmallText } from "../../ui/primitives";
import { formatDistance, formatOpenings, formatShiftWindow, formatWorkerRate, marketplaceCopyFor } from "./marketplaceContent";
import { useLocale } from "../../i18n/LocaleContext";

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; jobs: readonly MarketplaceJob[] }
  | { status: "empty" | "denied" | "invalid_location" | "unavailable" | "error" };

export function MarketplaceSearchScreen({
  transport,
  onOpenJob
}: {
  transport: MobileSessionTransport | null;
  onOpenJob: (jobRequestId: string, postalCode: string) => void;
}) {
  const marketplaceCopy = marketplaceCopyFor(useLocale().locale);
  const [postalCode, setPostalCode] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [state, setState] = useState<SearchState>({ status: "idle" });

  const search = useCallback(async () => {
    if (!transport || postalCode.trim().length < 3) return;
    setState({ status: "loading" });
    const result = await transport.marketplaceSearch({ postalCode: postalCode.trim(), verifiedOnly, sort: "nearest" });
    if (result.status === "ready") setState({ status: "ready", jobs: result.data.jobs });
    else setState({ status: result.status });
  }, [transport, postalCode, verifiedOnly]);

  return (
    <ScreenContainer testID="marketplace-search-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Card>
            <Badge label="Open shifts" tone="neutral" />
            <Heading>{marketplaceCopy.title}</Heading>
            <BodyText>{marketplaceCopy.intro}</BodyText>
          </Card>

          {!transport ? (
            <Card>
              <BodyText>{marketplaceCopy.signInRequired}</BodyText>
            </Card>
          ) : (
            <>
              <Card>
                <Input label={marketplaceCopy.postalLabel} value={postalCode} onChangeText={setPostalCode} placeholder={marketplaceCopy.postalPlaceholder} />
                <View style={styles.controls}>
                  <Button
                    label={verifiedOnly ? marketplaceCopy.verifiedOn : marketplaceCopy.verifiedOff}
                    onPress={() => setVerifiedOnly((v) => !v)}
                    variant="secondary"
                  />
                  <Button label={marketplaceCopy.searchCta} onPress={() => void search()} disabled={postalCode.trim().length < 3} />
                </View>
              </Card>

              {state.status === "loading" ? <LoadingState label="Finding open shifts" /> : null}
              {state.status === "empty" ? <EmptyState title={marketplaceCopy.emptyResults} body="Try a wider area or turn off the verified-only filter." /> : null}
              {state.status === "invalid_location" ? <ErrorState title="Check your location" body={marketplaceCopy.invalidLocation} /> : null}
              {state.status === "unavailable" ? <ErrorState title="Unavailable" body={marketplaceCopy.unavailable} /> : null}
              {state.status === "denied" ? <ErrorState title="Sign in required" body={marketplaceCopy.signInRequired} /> : null}
              {state.status === "error" ? <ErrorState title="Something went wrong" body={marketplaceCopy.loadError} /> : null}

              {state.status === "ready" ? (
                <Section title={`Open shifts near ${postalCode.trim().toUpperCase()}`}>
                  {state.jobs.map((job) => (
                    <Pressable
                      accessibilityRole="button"
                      key={job.jobRequestId}
                      onPress={() => onOpenJob(job.jobRequestId, postalCode.trim())}
                      style={styles.jobCard}
                    >
                      <View style={styles.jobHeader}>
                        <Heading>{job.role}</Heading>
                        {job.verifiedEmployer ? <Badge label="Verified" tone="success" /> : null}
                      </View>
                      <SmallText>{job.employerName}</SmallText>
                      <BodyText>{`${job.city}, ${job.province}`}</BodyText>
                      <SmallText>{formatShiftWindow(job.startAt, job.endAt)}</SmallText>
                      <View style={styles.metaRow}>
                        <SmallText>{formatOpenings(job.openings)}</SmallText>
                        {formatDistance(job.distanceKm) ? <SmallText>{formatDistance(job.distanceKm)}</SmallText> : null}
                      </View>
                      <SmallText>{formatWorkerRate(job.workerRateMinor, job.currency)}</SmallText>
                    </Pressable>
                  ))}
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
  controls: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  jobCard: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  jobHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  metaRow: { flexDirection: "row", gap: spacing.md }
});
