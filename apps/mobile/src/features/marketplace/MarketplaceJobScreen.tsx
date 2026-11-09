import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { looksLikePostalCode } from "@rwos/shared";
import { colors, radii, spacing } from "../../theme";
import type { AllowanceLineView, JobInterestState, MarketplaceJobDetail, MobileSessionTransport } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, Divider, ErrorState, Heading, LoadingState, ScreenContainer, Section, SmallText } from "../../ui/primitives";
import { formatJobPay, formatJobWhen, formatLocale, formatOpenings } from "./marketplaceContent";
import { certificateNotice, ineligibleKey, interestPanel, requiredCertificateRows } from "./jobDetailContent";
import { useLocale } from "../../i18n/LocaleContext";
import type { Locale } from "../../i18n/strings";
import { JobLocationLink } from "../maps";

type DetailState =
  | { status: "loading" }
  | { status: "ready"; job: MarketplaceJobDetail }
  | { status: "not_found" | "denied" | "unavailable" | "error" };

type ClaimState =
  | { state: "idle" | "claiming" | "assigned" | "full" | "election_required" | "error" }
  | { state: "ineligible"; reasons: readonly string[] }
  | { state: "overlap"; message: string };

// The signed-in job page — same sections and words as the worker website's job page: facts (where,
// when, openings, the worker's OWN pay), required certificates, allowances, then either "Accept &
// claim" (open short-term shift), "Express interest", or "Apply" for a long-term job with the
// application's status. Never shows Joblop's share or the employer's rate.
export function MarketplaceJobScreen({
  jobRequestId,
  postalCode,
  transport,
  onBack,
  onOpenDocuments,
  onOpenOffers,
  onOpenSchedule,
  onOpenSetup
}: {
  jobRequestId: string;
  postalCode: string | null;
  transport: MobileSessionTransport | null;
  onBack: () => void;
  onOpenDocuments?: () => void;
  onOpenOffers?: () => void;
  onOpenSchedule?: () => void;
  onOpenSetup?: () => void;
}) {
  const { t, locale } = useLocale();
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [interest, setInterest] = useState<JobInterestState | null>(null);
  const [interestBusy, setInterestBusy] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);
  const [claim, setClaim] = useState<ClaimState>({ state: "idle" });
  // Only a postal code goes with an interest (for its distance record); a city does not.
  const interestPostal = postalCode && looksLikePostalCode(postalCode) ? postalCode : undefined;

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
    void transport.jobInterest(jobRequestId).then((result) => {
      if (active && result.status === "ready") setInterest(result.data);
    });
    return () => {
      active = false;
    };
  }, [transport, jobRequestId, postalCode]);

  const express = useCallback(async () => {
    if (!transport) return;
    setInterestBusy(true);
    setInterestError(null);
    try {
      const result = await transport.expressInterest(jobRequestId, interestPostal);
      if (result.status === "ready") {
        setInterest((prev) => ({
          interest: { status: result.interestStatus, employerDecision: null },
          lastEmployerDecision: prev?.lastEmployerDecision ?? null,
          eligibility: prev?.eligibility ?? { eligible: true, reasons: [] }
        }));
      } else if (result.status === "ineligible") {
        setInterest((prev) => ({
          interest: null,
          lastEmployerDecision: prev?.lastEmployerDecision ?? null,
          eligibility: { eligible: false, reasons: result.reasons }
        }));
      } else {
        setInterestError(t("common.somethingWrong"));
      }
    } finally {
      setInterestBusy(false);
    }
  }, [transport, jobRequestId, interestPostal, t]);

  const withdraw = useCallback(async () => {
    if (!transport) return;
    setInterestBusy(true);
    setInterestError(null);
    try {
      const result = await transport.withdrawInterest(jobRequestId);
      if (result.status === "ready") {
        setInterest((prev) => ({
          interest: null,
          lastEmployerDecision: prev?.lastEmployerDecision ?? null,
          eligibility: prev?.eligibility ?? { eligible: true, reasons: [] }
        }));
      } else setInterestError(t("common.somethingWrong"));
    } finally {
      setInterestBusy(false);
    }
  }, [transport, jobRequestId, t]);

  const claimJob = useCallback(async () => {
    if (!transport) return;
    setClaim({ state: "claiming" });
    const result = await transport.claimOpenJob(jobRequestId);
    if (result.status === "assigned") setClaim({ state: "assigned" });
    else if (result.status === "shift_overlap") {
      setClaim({ state: "overlap", message: result.messages[locale] ?? result.messages.en ?? t("jobs.msg.shiftOverlap") });
    } else if (result.status === "full" || result.status === "not_open") setClaim({ state: "full" });
    else if (result.status === "election_required") setClaim({ state: "election_required" });
    else if (result.status === "ineligible") setClaim({ state: "ineligible", reasons: result.reasons });
    else setClaim({ state: "error" });
  }, [transport, jobRequestId, locale, t]);

  return (
    <ScreenContainer testID="marketplace-job-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Button label={t("auth.back")} onPress={onBack} variant="secondary" />

          {state.status === "loading" ? <LoadingState label={t("common.loading")} /> : null}
          {state.status === "not_found" ? <ErrorState title={t("job.noLongerAvailable")} body={t("job.returnToSearch")} /> : null}
          {state.status === "denied" ? <ErrorState title={t("job.signInCta")} body={t("job.signInToView")} /> : null}
          {state.status === "unavailable" || state.status === "error" ? (
            <ErrorState title={t("common.somethingWrong")} body={t("job.loadError")} />
          ) : null}

          {state.status === "ready" ? (
            <JobBody
              job={state.job}
              locale={locale}
              interest={interest}
              interestBusy={interestBusy}
              interestError={interestError}
              claim={claim}
              onExpress={() => void express()}
              onWithdraw={() => void withdraw()}
              onClaim={() => void claimJob()}
              onOpenDocuments={onOpenDocuments}
              onOpenOffers={onOpenOffers}
              onOpenSchedule={onOpenSchedule}
              onOpenSetup={onOpenSetup}
            />
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function JobBody({
  job,
  locale,
  interest,
  interestBusy,
  interestError,
  claim,
  onExpress,
  onWithdraw,
  onClaim,
  onOpenDocuments,
  onOpenOffers,
  onOpenSchedule,
  onOpenSetup
}: {
  job: MarketplaceJobDetail;
  locale: Locale;
  interest: JobInterestState | null;
  interestBusy: boolean;
  interestError: string | null;
  claim: ClaimState;
  onExpress: () => void;
  onWithdraw: () => void;
  onClaim: () => void;
  onOpenDocuments: (() => void) | undefined;
  onOpenOffers: (() => void) | undefined;
  onOpenSchedule: (() => void) | undefined;
  onOpenSetup: (() => void) | undefined;
}) {
  const { t, isRtl } = useLocale();
  const area = [job.city, job.province].filter(Boolean).join(", ");
  const certRows = requiredCertificateRows(job.requiredCertificates, job.missingCertificates, locale);
  const other = job.requiredCertificates?.other ?? null;
  const missingNotice = certificateNotice({ missing: job.missingCertificates ?? [], other }, locale);
  return (
    <>
      <Card>
        <View style={styles.header}>
          <Heading>{job.role}</Heading>
          {job.longTerm ? <Badge label={t("job.longTermChip")} tone="neutral" /> : null}
        </View>
        {job.title && job.title !== job.role ? <SmallText>{job.title}</SmallText> : null}
        <View style={styles.header}>
          <BodyText>{job.employerName}</BodyText>
          {job.verifiedEmployer ? <Badge label={t("job.verified")} tone="success" /> : null}
        </View>
        <Divider />
        <Fact label={t("job.factLocation")} value={area} rtl={isRtl} />
        <JobLocationLink address={area} />
        <Fact label={t("job.factWhen")} value={formatJobWhen(job.startAt, job.endAt, locale)} rtl={isRtl} />
        <Fact label={t("job.factOpenings")} value={formatOpenings(job.openings, locale)} rtl={isRtl} />
        <Fact label={t("job.factPay")} value={formatJobPay(job, locale)} rtl={isRtl} strong />
        <SmallText>{t("job.mapApproxNotice")}</SmallText>
      </Card>

      {job.bonus ? (
        <View style={styles.bonus} accessibilityLabel={t("job.bonusTitle")}>
          <Text style={styles.bonusText}>{`★ ${bonusLabel(job.bonus, locale, t)}`}</Text>
          <SmallText>{t("job.bonusNote")}</SmallText>
        </View>
      ) : null}

      {job.description ? (
        <Section title={t("job.aboutShift")}>
          <Card>
            <BodyText>{job.description}</BodyText>
          </Card>
        </Section>
      ) : null}
      {job.duties ? (
        <Section title={t("job.duties")}>
          <Card>
            <BodyText>{job.duties}</BodyText>
          </Card>
        </Section>
      ) : null}
      {job.safetyNotes ? (
        <Section title={t("job.safetyNotes")}>
          <Card>
            <BodyText>{job.safetyNotes}</BodyText>
          </Card>
        </Section>
      ) : null}
      {job.qualifications.length > 0 ? (
        <Section title={t("job.qualifications")}>
          <Card>
            {job.qualifications.map((q) => (
              <SmallText key={q}>{`• ${q}`}</SmallText>
            ))}
          </Card>
        </Section>
      ) : null}

      {certRows.length > 0 ? (
        <Section title={t("job.certsTitle")}>
          <Card testID="job-required-certificates">
            {certRows.map((row) => (
              <View key={row.key} style={styles.certRow}>
                <Text style={[styles.certLabel, isRtl ? styles.rtl : null]}>{row.label}</Text>
                {row.state === "have" ? <Badge label={t("job.certsHave")} tone="success" /> : null}
                {row.state === "missing" ? <Badge label={t("job.certsMissing")} tone="danger" /> : null}
                {row.state === "staff" ? <SmallText>{t("job.certsOtherStaff")}</SmallText> : null}
              </View>
            ))}
            {missingNotice ? <CertificateNotice text={missingNotice} onOpenDocuments={onOpenDocuments} /> : null}
          </Card>
        </Section>
      ) : null}

      <Section title={t("job.allowancesTitle")}>
        <Card>
          <Allowances job={job} locale={locale} />
        </Card>
      </Section>

      {job.claimable ? (
        <ClaimPanel
          claim={claim}
          blocked={(job.missingCertificates ?? []).length > 0}
          other={other}
          locale={locale}
          onClaim={onClaim}
          onOpenDocuments={onOpenDocuments}
          onOpenSchedule={onOpenSchedule}
          onOpenSetup={onOpenSetup}
        />
      ) : (
        <InterestCard
          state={interest}
          longTerm={job.longTerm}
          busy={interestBusy}
          error={interestError}
          other={other}
          locale={locale}
          onExpress={onExpress}
          onWithdraw={onWithdraw}
          onOpenDocuments={onOpenDocuments}
          onOpenOffers={onOpenOffers}
        />
      )}
    </>
  );
}

function Fact({ label, value, rtl, strong }: { label: string; value: string; rtl: boolean; strong?: boolean }) {
  return (
    <View style={styles.fact}>
      <Text style={[styles.factLabel, rtl ? styles.rtl : null]}>{label}</Text>
      <Text style={[strong ? styles.factStrong : styles.factValue, rtl ? styles.rtl : null]}>{value}</Text>
    </View>
  );
}

function CertificateNotice({ text, onOpenDocuments }: { text: string; onOpenDocuments: (() => void) | undefined }) {
  const { t } = useLocale();
  return (
    <View style={styles.notice} accessibilityRole="alert" testID="job-certificate-notice">
      <BodyText>{text}</BodyText>
      {onOpenDocuments ? <Button label={t("job.certsGoToDocuments")} onPress={onOpenDocuments} variant="secondary" /> : null}
    </View>
  );
}

function bonusLabel(bonus: Readonly<{ kind: string; amountMinor: number }>, locale: Locale, t: (k: string, v?: Readonly<Record<string, string>>) => string): string {
  let amount: string;
  try {
    amount = (bonus.amountMinor / 100).toLocaleString(formatLocale(locale), { style: "currency", currency: "CAD" });
  } catch {
    amount = `$${(bonus.amountMinor / 100).toFixed(2)}`;
  }
  if (bonus.kind === "hourly") return t("job.bonusHourly", { amount });
  if (bonus.kind === "transport") return t("job.bonusTransport", { amount });
  return t("job.bonusOneTime", { amount });
}

function Allowances({ job, locale }: { job: MarketplaceJobDetail; locale: Locale }) {
  const { t } = useLocale();
  const rows: { label: string; line: AllowanceLineView }[] = [];
  if (job.allowances?.transport) rows.push({ label: t("job.allowanceTransport"), line: job.allowances.transport });
  if (job.allowances?.meal) rows.push({ label: t("job.allowanceMeal"), line: job.allowances.meal });
  if (job.allowances?.lodging) rows.push({ label: t("job.allowanceLodging"), line: job.allowances.lodging });
  if (rows.length === 0) return <SmallText>{t("job.allowancesNone")}</SmallText>;
  const describe = (line: AllowanceLineView) => {
    if (line.provision === "provided") return t("job.allowanceProvided");
    if (line.provision === "allowance" && line.amountMinor !== null) {
      let amount: string;
      try {
        amount = (line.amountMinor / 100).toLocaleString(formatLocale(locale), { style: "currency", currency: job.currency || "CAD" });
      } catch {
        amount = `$${(line.amountMinor / 100).toFixed(2)}`;
      }
      return t("job.allowanceAmount", { amount });
    }
    return t("job.allowanceGeneric");
  };
  return (
    <>
      {rows.map((row) => (
        <SmallText key={row.label}>{`${row.label}: ${describe(row.line)}${row.line.note ? ` — ${row.line.note}` : ""}`}</SmallText>
      ))}
    </>
  );
}

// Same panel as the website's InterestPanel.
function InterestCard({
  state,
  longTerm,
  busy,
  error,
  other,
  locale,
  onExpress,
  onWithdraw,
  onOpenDocuments,
  onOpenOffers
}: {
  state: JobInterestState | null;
  longTerm: boolean;
  busy: boolean;
  error: string | null;
  other: string | null;
  locale: Locale;
  onExpress: () => void;
  onWithdraw: () => void;
  onOpenDocuments: (() => void) | undefined;
  onOpenOffers: (() => void) | undefined;
}) {
  const { t } = useLocale();
  const panel = interestPanel(state, longTerm);
  return (
    <Card testID="job-interest-panel">
      {panel.kind === "hired" ? (
        <>
          <Heading>{t("job.appHiredTitle")}</Heading>
          <BodyText>{t("job.appHiredBody")}</BodyText>
        </>
      ) : null}
      {panel.kind === "applied" ? (
        <>
          <Heading>{t("job.appliedTitle")}</Heading>
          <BodyText>{panel.shortlisted ? t("job.appShortlisted") : t("job.appliedBody")}</BodyText>
          <Button disabled={busy} label={t("job.withdrawApplication")} onPress={onWithdraw} variant="secondary" />
        </>
      ) : null}
      {panel.kind === "interest_submitted" ? (
        <>
          <Heading>{t("job.interestSubmittedTitle")}</Heading>
          <BodyText>{t("job.interestSubmittedBody")}</BodyText>
          <Button disabled={busy} label={t("job.withdrawInterest")} onPress={onWithdraw} variant="secondary" />
        </>
      ) : null}
      {panel.kind === "offer" ? (
        <>
          <Heading>{t("job.offerTitle")}</Heading>
          <BodyText>{t("job.offerBody")}</BodyText>
          {onOpenOffers ? <Button label={t("job.goToOffers")} onPress={onOpenOffers} /> : null}
        </>
      ) : null}
      {panel.kind === "apply" ? (
        <>
          <Heading>{longTerm ? t("job.applyTitle") : t("job.interestedTitle")}</Heading>
          {panel.notSelectedBefore ? <SmallText>{t("job.appNotSelected")}</SmallText> : null}
          {panel.eligible ? (
            <>
              <BodyText>{longTerm ? t("job.applyBody") : t("job.interestedBody")}</BodyText>
              <Button
                disabled={busy}
                label={busy ? t("job.submitting") : longTerm ? t("job.applyButton") : t("job.expressInterest")}
                onPress={onExpress}
                testID="job-apply-button"
              />
            </>
          ) : panel.certificateBlocked ? (
            <CertificateNotice
              text={certificateNotice({ reasons: state?.eligibility.reasons ?? [], other }, locale) ?? t("job.inelDefault")}
              onOpenDocuments={onOpenDocuments}
            />
          ) : (
            <SmallText>{t(ineligibleKey(panel.reason))}</SmallText>
          )}
        </>
      ) : null}
      {error ? <SmallText>{error}</SmallText> : null}
    </Card>
  );
}

// Same panel as the website's ClaimPanel: first eligible worker to claim each place gets it.
function ClaimPanel({
  claim,
  blocked,
  other,
  locale,
  onClaim,
  onOpenDocuments,
  onOpenSchedule,
  onOpenSetup
}: {
  claim: ClaimState;
  blocked: boolean;
  other: string | null;
  locale: Locale;
  onClaim: () => void;
  onOpenDocuments: (() => void) | undefined;
  onOpenSchedule: (() => void) | undefined;
  onOpenSetup: (() => void) | undefined;
}) {
  const { t } = useLocale();
  if (claim.state === "assigned") {
    return (
      <Card testID="job-claim-panel">
        <Heading>{t("job.claimAssignedTitle")}</Heading>
        <BodyText>{t("job.claimAssignedBody")}</BodyText>
        {onOpenSchedule ? <Button label={t("job.goToSchedule")} onPress={onOpenSchedule} /> : null}
      </Card>
    );
  }
  const certificateReasons = claim.state === "ineligible" ? claim.reasons.filter((r) => r.startsWith("missing_certificate:")) : [];
  return (
    <Card testID="job-claim-panel">
      <Heading>{t("job.claimTitle")}</Heading>
      <BodyText>{t("job.claimBody")}</BodyText>
      {claim.state === "full" ? <SmallText>{t("job.claimFull")}</SmallText> : null}
      {claim.state === "election_required" ? (
        <>
          <SmallText>{t("job.claimElectionRequired")}</SmallText>
          {onOpenSetup ? <Button label={t("common.setUpWorker")} onPress={onOpenSetup} variant="secondary" /> : null}
        </>
      ) : null}
      {certificateReasons.length > 0 ? (
        <CertificateNotice text={certificateNotice({ reasons: certificateReasons, other }, locale) ?? t("job.inelDefault")} onOpenDocuments={onOpenDocuments} />
      ) : claim.state === "ineligible" ? (
        <SmallText>{t("job.inelDefault")}</SmallText>
      ) : null}
      {claim.state === "overlap" ? (
        <View accessibilityRole="alert" style={styles.notice} testID="job-overlap-notice">
          <BodyText>{claim.message}</BodyText>
        </View>
      ) : null}
      {claim.state === "error" ? <SmallText>{t("job.loadError")}</SmallText> : null}
      {claim.state !== "full" && !blocked && certificateReasons.length === 0 ? (
        <Button
          disabled={claim.state === "claiming"}
          label={claim.state === "claiming" ? t("job.claiming") : t("job.claimButton")}
          onPress={onClaim}
          testID="job-claim-button"
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  stack: { gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" },
  fact: { gap: 2, marginTop: spacing.xs },
  factLabel: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  factValue: { color: colors.text, fontSize: 15 },
  factStrong: { color: colors.deepTeal, fontSize: 15, fontWeight: "800" },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  certRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xs },
  certLabel: { color: colors.text, flexShrink: 1, fontSize: 15 },
  notice: {
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md
  },
  bonus: {
    backgroundColor: colors.cream,
    borderColor: colors.deepTeal,
    borderRadius: radii.md,
    borderWidth: 2,
    gap: spacing.xs,
    padding: spacing.md
  },
  bonusText: { color: colors.deepTeal, fontSize: 15, fontWeight: "800" }
});
