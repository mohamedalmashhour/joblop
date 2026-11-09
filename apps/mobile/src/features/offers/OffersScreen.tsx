import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { WorkerCalendarDto } from "@rwos/shared";
import { colors, radii, spacing } from "../../theme";
import type { MobileSessionTransport } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, Divider, ErrorState, Heading, LoadingState, ScreenContainer, SmallText } from "../../ui/primitives";
import { useLocale } from "../../i18n/LocaleContext";
import { formatLocale } from "../marketplace/marketplaceContent";
import { offerStatusKey, offerStatusTone, offerWhen, isRespondable } from "./offersContent";

type State =
  | { status: "loading" }
  | { status: "ready"; offers: readonly WorkerCalendarDto[] }
  | { status: "denied" | "error" };

// "My offers" — the website's offers page (apps/worker/app/offers/Offers.tsx) in the app: the
// agreement, your rights, Accept / Decline, and the API's own message when the worker already holds
// a shift at that time (RWOS_SHIFT_OVERLAP). A deep-linked offer is shown first.
export function OffersScreen({
  transport,
  focusOfferId,
  onOpenJob,
  onOpenSetup
}: {
  transport: MobileSessionTransport | null;
  focusOfferId: string | null;
  onOpenJob?: (jobRequestId: string) => void;
  onOpenSetup?: () => void;
}) {
  const { t, locale, isRtl } = useLocale();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [needsPayChoice, setNeedsPayChoice] = useState(false);

  const load = useCallback(async () => {
    if (!transport) return setState({ status: "denied" });
    const result = await transport.workerOffers();
    if (result.status === "ready") {
      const offers = [...result.data].sort((a, b) => (a.workerOfferId === focusOfferId ? -1 : b.workerOfferId === focusOfferId ? 1 : 0));
      setState({ status: "ready", offers });
    } else if (result.status === "empty") setState({ status: "ready", offers: [] });
    else setState({ status: result.status === "denied" ? "denied" : "error" });
  }, [transport, focusOfferId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Accepting needs a signed pay choice; ask for it up front, as the website does.
  useEffect(() => {
    if (!transport) return;
    void transport.workerClassification().then((r) => {
      if (r.status === "ready") setNeedsPayChoice(r.election === null);
    });
  }, [transport]);

  const respond = useCallback(
    async (offer: WorkerCalendarDto, decision: "accept" | "decline") => {
      if (!transport) return;
      if (!offer.termsVersionId) {
        setNotice(t("offers.changed"));
        return;
      }
      setBusyId(offer.workerOfferId);
      setNotice("");
      try {
        const result = await transport.respondToWorkerOffer({
          offerId: offer.workerOfferId,
          decision,
          expectedVersion: offer.versionToken,
          expectedTermsVersionId: offer.termsVersionId
        });
        if (result.status === "shift_overlap") {
          setNotice(result.messages[locale] ?? result.messages.en ?? t("jobs.msg.shiftOverlap"));
          return;
        }
        if (result.status === "stale") {
          setNotice(t("offers.changed"));
          await load();
          return;
        }
        if (result.status === "denied") return setState({ status: "denied" });
        if (result.status !== "ready") {
          setNotice(t("offers.responseFailed"));
          return;
        }
        setNotice(decision === "accept" ? t("offers.accepted") : t("offers.declined"));
        await load();
      } finally {
        setBusyId(null);
      }
    },
    [transport, load, locale, t]
  );

  const loc = formatLocale(locale);
  return (
    <ScreenContainer testID="worker-offers-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Card>
            <Heading>{t("nav.offers")}</Heading>
            <BodyText>{t("offers.intro")}</BodyText>
          </Card>
          {notice ? (
            <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.notice} testID="offers-notice">
              <BodyText>{notice}</BodyText>
            </View>
          ) : null}
          {state.status === "loading" ? <LoadingState label={t("common.loading")} /> : null}
          {state.status === "denied" ? <ErrorState title={t("job.signInCta")} body={t("offers.signInPrompt")} /> : null}
          {state.status === "error" ? (
            <ErrorState title={t("common.somethingWrong")} body={t("offers.loadError")} action={<Button label={t("common.retry")} onPress={() => void load()} variant="secondary" />} />
          ) : null}
          {state.status === "ready" && state.offers.length === 0 ? (
            <Card>
              <BodyText>{t("offers.none")}</BodyText>
            </Card>
          ) : null}
          {state.status === "ready"
            ? state.offers.map((o) => {
                const respondable = isRespondable(o.status);
                const busy = busyId === o.workerOfferId;
                return (
                  <Card key={o.workerOfferId} testID="worker-offer-card">
                    <Heading>{o.title ?? t("offers.shiftOffer")}</Heading>
                    <Badge label={t(offerStatusKey(o.status))} tone={offerStatusTone(o.status)} />
                    <Divider />
                    <Text style={[styles.dt, isRtl ? styles.rtl : null]}>{t("offers.agreementTitle")}</Text>
                    {o.summary ? <Row label={t("offers.whatYoullDo")} value={o.summary} rtl={isRtl} /> : null}
                    <Row label={t("offers.scheduleLabel")} value={offerWhen(o, loc) ?? t("offers.scheduleTbc")} rtl={isRtl} />
                    {o.compensationSummary ? <Row label={t("offers.compensationLabel")} value={o.compensationSummary} rtl={isRtl} /> : null}
                    {o.policySummary ? <Row label={t("offers.policyLabel")} value={o.policySummary} rtl={isRtl} /> : null}
                    <Row label={t("offers.respondBy")} value={offerWhen({ startAt: o.expiresAt, endAt: null, timezone: o.timezone }, loc) ?? "—"} rtl={isRtl} />
                    {respondable ? (
                      <View style={styles.rights}>
                        <Text style={[styles.dt, isRtl ? styles.rtl : null]}>{t("offers.rightsTitle")}</Text>
                        <SmallText>{`• ${t("offers.rightBinding")}`}</SmallText>
                        <SmallText>{`• ${t("offers.rightNoFee")}`}</SmallText>
                        <SmallText>{`• ${t("offers.rightRecorded")}`}</SmallText>
                        <SmallText>{t("offers.allowancesNote")}</SmallText>
                      </View>
                    ) : null}
                    {respondable && needsPayChoice ? (
                      <View style={styles.notice}>
                        <Text style={[styles.dt, isRtl ? styles.rtl : null]}>{t("offers.payChoiceTitle")}</Text>
                        <SmallText>{t("offers.payChoiceBody")}</SmallText>
                        {onOpenSetup ? <Button label={t("offers.payChoiceAction")} onPress={onOpenSetup} /> : null}
                      </View>
                    ) : null}
                    {respondable ? (
                      <>
                        <Button
                          disabled={busy || needsPayChoice}
                          label={busy ? t("offers.working") : t("offers.acceptOffer")}
                          onPress={() => void respond(o, "accept")}
                          testID="offer-accept"
                        />
                        <Button disabled={busy} label={t("offers.decline")} onPress={() => void respond(o, "decline")} variant="secondary" />
                      </>
                    ) : null}
                    {onOpenJob && o.jobRequestId ? <Button label={t("offers.viewJob")} onPress={() => onOpenJob(o.jobRequestId)} variant="secondary" /> : null}
                  </Card>
                );
              })
            : null}
          <SmallText>{t("offers.footer")}</SmallText>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Row({ label, value, rtl }: { label: string; value: string; rtl: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, rtl ? styles.rtl : null]}>{label}</Text>
      <Text style={[styles.value, rtl ? styles.rtl : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  stack: { gap: spacing.lg, paddingBottom: spacing.xxl },
  notice: {
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  rights: { gap: 2, marginTop: spacing.sm },
  dt: { color: colors.deepTeal, fontSize: 14, fontWeight: "800" },
  row: { gap: 2, marginTop: spacing.xs },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  value: { color: colors.text, fontSize: 15 },
  rtl: { textAlign: "right", writingDirection: "rtl" }
});
