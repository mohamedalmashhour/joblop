import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type {
  ShiftDiscoveryRecord,
  ShiftDiscoveryRepository,
  ShiftOfferSnapshot,
  WorkerApplicationRepository,
  WorkerApplicationSummary
} from "@rwos/shared";
import { colors, spacing } from "@rwos/design-system";
import {
  Badge,
  BodyText,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Heading,
  Input,
  LoadingState,
  ScreenContainer,
  Section,
  SmallText
} from "../../ui/primitives";
import {
  formatDurationHours,
  formatMoney,
  formatShiftDate,
  formatShiftTimeRange
} from "../shifts/formatters";
import { mockShiftDiscoveryRepository } from "../shifts/mockShiftDiscoveryRepository";
import { demoWorkerId } from "./repository";
import { mockWorkerApplicationRepository } from "./mockWorkerApplicationRepository";

type AppRepositoryProps = {
  applicationRepository?: WorkerApplicationRepository;
};

type ShiftRepositoryProps = {
  shiftRepository?: ShiftDiscoveryRepository;
};

export function ApplicationSummaryScreen({
  applicationRepository = mockWorkerApplicationRepository,
  onBack,
  onSubmitted,
  shiftId,
  shiftRepository = mockShiftDiscoveryRepository
}: AppRepositoryProps &
  ShiftRepositoryProps & {
    onBack: () => void;
    onSubmitted: (applicationId: string) => void;
    shiftId: string;
  }) {
  const [shift, setShift] = useState<ShiftDiscoveryRecord | null>(null);
  const [workerNote, setWorkerNote] = useState("");
  const [reviewAccepted, setReviewAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadShift() {
      try {
        const record = await shiftRepository.getShiftById(shiftId);
        if (!mounted) return;
        setShift(record);
        setError(record ? null : "This shift is no longer available for application review.");
      } catch {
        if (mounted) setError("Unable to load the shift before application review.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadShift();
    return () => {
      mounted = false;
    };
  }, [shiftId, shiftRepository]);

  const submit = async () => {
    if (!shift || submitting) return;
    if (!reviewAccepted) {
      setReviewAccepted(true);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const summary = await applicationRepository.submitApplication({
        shiftId: shift.id,
        workerId: demoWorkerId,
        workerNote
      });
      onSubmitted(summary.application.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Application could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <Button label="Back" onPress={onBack} variant="secondary" />
        <LoadingState label="Loading application review" />
      </ScreenContainer>
    );
  }

  if (error && !shift) {
    return (
      <ScreenContainer>
        <Button label="Back" onPress={onBack} variant="secondary" />
        <ErrorState body={error} title="Application unavailable" />
      </ScreenContainer>
    );
  }

  if (!shift) return null;

  return (
    <ScreenContainer testID="application-summary-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Button label="Back to shift" onPress={onBack} variant="secondary" />
          <Section title="Application review">
            <Card>
              <Heading>{shift.title}</Heading>
              <SmallText>
                {shift.employerName} - {shift.city}, {shift.province}
              </SmallText>
              <Divider />
              <BodyText>
                {formatShiftDate(shift.startAt)} - {formatShiftTimeRange(shift)} -{" "}
                {formatDurationHours(shift)}
              </BodyText>
              <BodyText>
                {formatMoney(shift.hourlyRate)}/hr - {formatMoney(shift.estimatedTotal)} estimated
              </BodyText>
              <SmallText>Deadline: {formatShiftDate(shift.applicationDeadline)}</SmallText>
            </Card>
          </Section>

          <Section title="Worker note">
            <Input
              label="Optional note to dispatcher"
              onChangeText={setWorkerNote}
              placeholder="Example: I can work alone in a prepared kitchen."
              value={workerNote}
            />
          </Section>

          <Section title="Commitment boundary">
            <Card>
              <Heading>
                {reviewAccepted ? "Final review active" : "Review before submitting"}
              </Heading>
              <BodyText>
                Submitting means you want this shift. It does not create a confirmed shift until an
                offer is accepted and the final confirmation is completed.
              </BodyText>
              <SmallText>
                Application Submitted != Selected. Fixture-backed submission does not claim server
                persistence.
              </SmallText>
              {error ? <SmallText testID="application-error">{error}</SmallText> : null}
              <Button
                disabled={submitting}
                label={reviewAccepted ? "Submit application" : "Continue review"}
                onPress={submit}
                testID="submit-application"
              />
            </Card>
          </Section>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

export function ApplicationSuccessScreen({
  applicationId,
  onOpenApplication,
  onOpenMyShifts
}: {
  applicationId: string;
  onOpenApplication: (applicationId: string) => void;
  onOpenMyShifts: () => void;
}) {
  return (
    <ScreenContainer testID="application-success-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Card>
            <Badge label="submitted" tone="success" />
            <Heading>Application submitted</Heading>
            <BodyText>
              Your application was recorded locally for the G02 worker commitment flow. A dispatcher
              review may create an offer, and a final confirmation is still required before the
              shift becomes confirmed.
            </BodyText>
            <SmallText>Application Submitted != Selected. Selected != Assigned.</SmallText>
            <SmallText>Application ID: {applicationId}</SmallText>
            <Button label="View application" onPress={() => onOpenApplication(applicationId)} />
            <Button label="Go to My Shifts" onPress={onOpenMyShifts} variant="secondary" />
          </Card>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

export function MyShiftsScreen({
  applicationRepository = mockWorkerApplicationRepository,
  onOpenApplication,
  onOpenConfirmation,
  onOpenOffer
}: AppRepositoryProps & {
  onOpenApplication: (applicationId: string) => void;
  onOpenConfirmation: (confirmationId: string) => void;
  onOpenOffer: (offerId: string) => void;
}) {
  const [summaries, setSummaries] = useState<readonly WorkerApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      setSummaries(await applicationRepository.listWorkerApplications(demoWorkerId));
      setError(null);
    } catch {
      setError("Unable to load local G02 applications.");
    } finally {
      setLoading(false);
    }
  }, [applicationRepository]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const buckets = useMemo(() => {
    const offers = summaries.filter((summary) => summary.offer?.status === "pending");
    const confirmations = summaries.filter((summary) => summary.confirmation?.status === "pending");
    const confirmed = summaries.filter((summary) => summary.application.status === "confirmed");
    const applications = summaries.filter((summary) =>
      ["submitted", "under_review", "offered", "accepted"].includes(summary.application.status)
    );
    return { applications, confirmed, confirmations, offers };
  }, [summaries]);

  return (
    <ScreenContainer testID="my-shifts-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <View style={styles.headerRow}>
            <View>
              <Heading>My Shifts</Heading>
              <SmallText>G02 applications, offers and confirmations only.</SmallText>
            </View>
            <Button label="Refresh" onPress={loadApplications} variant="secondary" />
          </View>

          {loading ? <LoadingState label="Loading applications" /> : null}
          {error ? <ErrorState body={error} title="Applications unavailable" /> : null}
          {!loading && !error && summaries.length === 0 ? (
            <EmptyState
              body="Applications submitted in G02 appear here."
              title="No applications yet"
            />
          ) : null}

          <ApplicationList
            cta="View application"
            items={buckets.applications}
            onOpen={(summary) => onOpenApplication(summary.application.id)}
            title="Applications"
          />
          <ApplicationList
            cta="Review offer"
            items={buckets.offers}
            onOpen={(summary) => (summary.offer ? onOpenOffer(summary.offer.id) : undefined)}
            title="Offers"
          />
          <ApplicationList
            cta="Confirm shift"
            items={buckets.confirmations}
            onOpen={(summary) =>
              summary.confirmation ? onOpenConfirmation(summary.confirmation.id) : undefined
            }
            title="To confirm"
          />
          <ApplicationList
            cta="View confirmed"
            items={buckets.confirmed}
            onOpen={(summary) => onOpenApplication(summary.application.id)}
            title="Confirmed"
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

export function ApplicationDetailsScreen({
  applicationId,
  applicationRepository = mockWorkerApplicationRepository,
  onBack
}: AppRepositoryProps & {
  applicationId: string;
  onBack: () => void;
}) {
  const [summary, setSummary] = useState<WorkerApplicationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setSummary(await applicationRepository.getApplicationById(applicationId));
    setLoading(false);
  }, [applicationId, applicationRepository]);

  useEffect(() => {
    void load();
  }, [load]);

  const withdraw = async () => {
    try {
      setSummary(await applicationRepository.withdrawApplication(applicationId));
      setMessage("Application withdrawn.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Application could not be withdrawn.");
    }
  };

  return (
    <DetailsFrame loading={loading} onBack={onBack} testID="application-details-screen">
      {summary ? (
        <View style={styles.stack}>
          <SummaryCard summary={summary} />
          <Section title="Application state">
            <Card>
              <Badge
                label={summary.application.status}
                tone={statusTone(summary.application.status)}
              />
              <SmallText>Submitted: {summary.application.submittedAt ?? "Not submitted"}</SmallText>
              <SmallText>Updated: {summary.application.updatedAt}</SmallText>
              {summary.application.workerNote ? (
                <BodyText>Worker note: {summary.application.workerNote}</BodyText>
              ) : null}
              {message ? <SmallText>{message}</SmallText> : null}
              {["submitted", "under_review", "offered"].includes(summary.application.status) ? (
                <Button label="Withdraw application" onPress={withdraw} variant="danger" />
              ) : null}
            </Card>
          </Section>
        </View>
      ) : (
        <ErrorState
          body="The application was not found in the G02 local repository."
          title="Not found"
        />
      )}
    </DetailsFrame>
  );
}

export function OfferDetailsScreen({
  applicationRepository = mockWorkerApplicationRepository,
  offerId,
  onBack,
  onDone
}: AppRepositoryProps & {
  offerId: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [summary, setSummary] = useState<WorkerApplicationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<"accept" | "decline" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const all = await applicationRepository.listWorkerApplications(demoWorkerId);
    setSummary(all.find((item) => item.offer?.id === offerId) ?? null);
    setLoading(false);
  }, [applicationRepository, offerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (decision: "accept" | "decline") => {
    if (!confirming) {
      setConfirming(decision);
      return;
    }

    try {
      const next =
        decision === "accept"
          ? await applicationRepository.acceptOffer(offerId)
          : await applicationRepository.declineOffer(offerId);
      setSummary(next);
      setMessage(
        decision === "accept"
          ? "Offer accepted. Final confirmation may be required."
          : "Offer declined."
      );
      setConfirming(null);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Offer response failed.");
    }
  };

  return (
    <DetailsFrame loading={loading} onBack={onBack} testID="offer-details-screen">
      {summary?.offer ? (
        <View style={styles.stack}>
          <SummaryCard summary={summary} />
          <Section title="Offer review">
            <Card>
              <Badge label={summary.offer.status} tone={statusTone(summary.offer.status)} />
              <BodyText>
                {summary.offer.message ?? "Review the final terms before responding."}
              </BodyText>
              <TermsComparison
                current={summary.offer.currentShiftSnapshot}
                original={summary.offer.originalShiftSnapshot}
              />
              <SmallText>Expires: {summary.offer.expiresAt}</SmallText>
              {confirming ? (
                <SmallText>
                  Final review active for {confirming}. Press the same action again to record the
                  decision.
                </SmallText>
              ) : null}
              {message ? <SmallText>{message}</SmallText> : null}
              {summary.offer.status === "pending" ? (
                <View style={styles.buttonRow}>
                  <Button label="Accept offer" onPress={() => respond("accept")} />
                  <Button label="Decline" onPress={() => respond("decline")} variant="danger" />
                </View>
              ) : null}
              <Button label="Back to My Shifts" onPress={onDone} variant="secondary" />
            </Card>
          </Section>
        </View>
      ) : (
        <ErrorState body="The offer was not found in the G02 local repository." title="Not found" />
      )}
    </DetailsFrame>
  );
}

export function ConfirmationDetailsScreen({
  applicationRepository = mockWorkerApplicationRepository,
  confirmationId,
  onBack,
  onDone
}: AppRepositoryProps & {
  confirmationId: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [summary, setSummary] = useState<WorkerApplicationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<"confirm" | "decline" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const all = await applicationRepository.listWorkerApplications(demoWorkerId);
    setSummary(all.find((item) => item.confirmation?.id === confirmationId) ?? null);
    setLoading(false);
  }, [applicationRepository, confirmationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (decision: "confirm" | "decline") => {
    if (!confirming) {
      setConfirming(decision);
      return;
    }

    try {
      const next =
        decision === "confirm"
          ? await applicationRepository.confirmShift(confirmationId)
          : await applicationRepository.declineConfirmation(confirmationId);
      setSummary(next);
      setMessage(decision === "confirm" ? "Shift confirmed." : "Final confirmation declined.");
      setConfirming(null);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Confirmation response failed.");
    }
  };

  return (
    <DetailsFrame loading={loading} onBack={onBack} testID="confirmation-details-screen">
      {summary?.confirmation ? (
        <View style={styles.stack}>
          <SummaryCard summary={summary} />
          <Section title="Final confirmation">
            <Card>
              <Badge
                label={summary.confirmation.status}
                tone={statusTone(summary.confirmation.status)}
              />
              <BodyText>
                Confirm only if you can work the shift under the final terms shown here. Attendance,
                punch in, punch out and post-shift work logs remain outside G02.
              </BodyText>
              <SmallText>Requested: {summary.confirmation.requestedAt}</SmallText>
              <SmallText>Expires: {summary.confirmation.expiresAt}</SmallText>
              {confirming ? (
                <SmallText>
                  Final review active for {confirming}. Press the same action again to record the
                  decision.
                </SmallText>
              ) : null}
              {message ? <SmallText>{message}</SmallText> : null}
              {summary.confirmation.status === "pending" ? (
                <View style={styles.buttonRow}>
                  <Button label="Confirm shift" onPress={() => respond("confirm")} />
                  <Button label="Decline" onPress={() => respond("decline")} variant="danger" />
                </View>
              ) : null}
              <Button label="Back to My Shifts" onPress={onDone} variant="secondary" />
            </Card>
          </Section>
        </View>
      ) : (
        <ErrorState
          body="The confirmation was not found in the G02 local repository."
          title="Not found"
        />
      )}
    </DetailsFrame>
  );
}

function DetailsFrame({
  children,
  loading,
  onBack,
  testID
}: {
  children: ReactNode;
  loading: boolean;
  onBack: () => void;
  testID: string;
}) {
  if (loading) {
    return (
      <ScreenContainer>
        <Button label="Back" onPress={onBack} variant="secondary" />
        <LoadingState label="Loading details" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer testID={testID}>
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Button label="Back" onPress={onBack} variant="secondary" />
          {children}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function ApplicationList({
  cta,
  items,
  onOpen,
  title
}: {
  cta: string;
  items: readonly WorkerApplicationSummary[];
  onOpen: (summary: WorkerApplicationSummary) => void | undefined;
  title: string;
}) {
  if (items.length === 0) return null;

  return (
    <Section title={`${title} (${items.length})`}>
      {items.map((summary) => (
        <Card key={`${title}-${summary.application.id}`}>
          <SummaryHeader summary={summary} />
          <Button label={cta} onPress={() => onOpen(summary)} variant="secondary" />
        </Card>
      ))}
    </Section>
  );
}

function SummaryCard({ summary }: { summary: WorkerApplicationSummary }) {
  return (
    <Section title="Shift summary">
      <Card>
        <SummaryHeader summary={summary} />
        <Divider />
        <BodyText>
          {formatShiftDate(summary.shift.startAt)} - {formatShiftTimeRange(summary.shift)} -{" "}
          {formatDurationHours(summary.shift)}
        </BodyText>
        <SmallText>
          Worker-facing estimate: {formatMoney(summary.shift.estimatedTotal)} at{" "}
          {formatMoney(summary.shift.hourlyRate)}/hr
        </SmallText>
      </Card>
    </Section>
  );
}

function SummaryHeader({ summary }: { summary: WorkerApplicationSummary }) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.titleColumn}>
        <Heading>{summary.shift.title}</Heading>
        <SmallText>
          {summary.shift.employerName} - {summary.shift.city}, {summary.shift.province}
        </SmallText>
      </View>
      <Badge label={summary.application.status} tone={statusTone(summary.application.status)} />
    </View>
  );
}

function TermsComparison({
  current,
  original
}: {
  current: ShiftOfferSnapshot;
  original: ShiftOfferSnapshot;
}) {
  const rows = [
    {
      label: "Time",
      current: `${formatShiftTimeRange(current)} (${formatDurationHours(current)})`,
      original: `${formatShiftTimeRange(original)} (${formatDurationHours(original)})`
    },
    {
      label: "Estimated total",
      current: formatMoney(current.estimatedTotal),
      original: formatMoney(original.estimatedTotal)
    },
    {
      label: "Cancellation",
      current: current.cancellationPolicy,
      original: original.cancellationPolicy
    }
  ];

  return (
    <View style={styles.termsTable}>
      {rows.map((row) => {
        const changed = row.current !== row.original;
        return (
          <View key={row.label} style={[styles.termRow, changed ? styles.changedTermRow : null]}>
            <SmallText>{row.label}</SmallText>
            <BodyText>{row.current}</BodyText>
            {changed ? <SmallText>Changed from: {row.original}</SmallText> : null}
          </View>
        );
      })}
    </View>
  );
}

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" {
  if (["confirmed", "accepted", "submitted"].includes(status)) return "success";
  if (["pending", "under_review", "offered"].includes(status)) return "warning";
  if (["withdrawn", "rejected", "expired", "cancelled", "declined"].includes(status))
    return "danger";
  return "neutral";
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1
  },
  stack: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  titleColumn: {
    flex: 1,
    gap: spacing.xs
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  termsTable: {
    gap: spacing.sm
  },
  termRow: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  changedTermRow: {
    backgroundColor: "#fff8ea",
    borderColor: colors.warning
  }
});
