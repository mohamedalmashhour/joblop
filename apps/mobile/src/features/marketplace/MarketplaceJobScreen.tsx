import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "../../theme";
import type { MarketplaceJobDetail, MobileSessionTransport } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, Divider, ErrorState, Heading, LoadingState, ScreenContainer, Section, SmallText } from "../../ui/primitives";
import { formatOpenings, formatShiftWindow, formatJobPay, marketplaceCopyFor } from "./marketplaceContent";
import { useLocale } from "../../i18n/LocaleContext";
import { JobLocationLink } from "../maps";

type DetailState =
  | { status: "loading" }
  | { status: "ready"; job: MarketplaceJobDetail }
  | { status: "not_found" | "denied" | "unavailable" | "error" };

type ApplyState =
  | { status: "idle" }
  | { status: "applying" }
  | { status: "applied"; already: boolean }
  | { status: "not_found" | "ineligible" | "denied" | "error" };

export function MarketplaceJobScreen({
  jobRequestId,
  postalCode,
  transport,
  onBack
}: {
  jobRequestId: string;
  postalCode: string | null;
  transport: MobileSessionTransport | null;
  onBack: () => void;
}) {
  const locale = useLocale().locale;
  const marketplaceCopy = marketplaceCopyFor(locale);
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [apply, setApply] = useState<ApplyState>({ status: "idle" });

  useEffect(() => {
    if (!transport) {
      setState({ status: "denied" });
      return;
    }
    let active = true;
    void transport.marketplaceJob(jobRequestId, postalCode ?? undefined).then((result) => {
      if (!active) return;
      if (result.status === "ready") setState({ status: "ready", job: result.data });
      else setState({ status: result.status });
    });
    return () => {
      active = false;
    };
  }, [transport, jobRequestId, postalCode]);

  const onApply = useCallback(async () => {
    if (!transport) return;
    setApply({ status: "applying" });
    const result = await transport.expressInterest(jobRequestId, postalCode ?? undefined);
    if (result.status === "ready") setApply({ status: "applied", already: result.alreadyInterested });
    else setApply({ status: result.status });
  }, [transport, jobRequestId, postalCode]);

  return (
    <ScreenContainer testID="marketplace-job-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Button label="Back" onPress={onBack} variant="secondary" />

          {state.status === "loading" ? <LoadingState label="Loading shift" /> : null}
          {state.status === "not_found" ? <ErrorState title="Not available" body={marketplaceCopy.notFound} /> : null}
          {state.status === "denied" ? <ErrorState title="Sign in required" body={marketplaceCopy.signInRequired} /> : null}
          {state.status === "unavailable" ? <ErrorState title="Unavailable" body={marketplaceCopy.unavailable} /> : null}
          {state.status === "error" ? <ErrorState title="Something went wrong" body={marketplaceCopy.loadError} /> : null}

          {state.status === "ready" ? (
            <>
              <Card>
                <View style={styles.header}>
                  <Heading>{state.job.title}</Heading>
                  {state.job.verifiedEmployer ? <Badge label="Verified" tone="success" /> : null}
                </View>
                <SmallText>{state.job.role}</SmallText>
                <BodyText>{state.job.employerName}</BodyText>
                <SmallText>{`${state.job.city}, ${state.job.province}`}</SmallText>
                <JobLocationLink address={`${state.job.city}, ${state.job.province}`} />
                <Divider />
                <SmallText>{formatShiftWindow(state.job.startAt, state.job.endAt)}</SmallText>
                <SmallText>{formatOpenings(state.job.openings)}</SmallText>
                <SmallText>{formatJobPay(state.job, locale)}</SmallText>
              </Card>

              {state.job.description ? (
                <Section title="About this shift">
                  <Card>
                    <BodyText>{state.job.description}</BodyText>
                  </Card>
                </Section>
              ) : null}

              {state.job.duties ? (
                <Section title="Duties">
                  <Card>
                    <BodyText>{state.job.duties}</BodyText>
                  </Card>
                </Section>
              ) : null}

              {state.job.qualifications.length > 0 ? (
                <Section title="Qualifications">
                  <Card>
                    {state.job.qualifications.map((q) => (
                      <SmallText key={q}>{q}</SmallText>
                    ))}
                  </Card>
                </Section>
              ) : null}

              <Card>
                {apply.status === "applied" ? (
                  <BodyText>{apply.already ? marketplaceCopy.alreadyApplied : marketplaceCopy.applied}</BodyText>
                ) : apply.status === "ineligible" || apply.status === "not_found" ? (
                  <BodyText>{marketplaceCopy.applyIneligible}</BodyText>
                ) : apply.status === "error" || apply.status === "denied" ? (
                  <BodyText>{marketplaceCopy.applyError}</BodyText>
                ) : (
                  <Button label={marketplaceCopy.applyCta} onPress={() => void onApply()} disabled={apply.status === "applying"} />
                )}
              </Card>
            </>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  stack: { gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }
});
