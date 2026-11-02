import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, spacing } from "../../theme";
import { formatRwosDateTime, type WorkerCalendarDto } from "@rwos/shared";
import type { createMobileSessionTransport, WorkerAssignmentDto } from "../../auth/secureSession";
import {
  Badge,
  BodyText,
  Button,
  Card,
  Divider,
  Heading,
  Section,
  SmallText
} from "../../ui/primitives";
import { validateWorkerSignInInput } from "./signInValidation";

type WorkerTransport = ReturnType<typeof createMobileSessionTransport>;
type WorkerState =
  | { status: "loading" | "empty" | "denied" | "error" | "unavailable" | "stale" }
  | { status: "list"; data: readonly WorkerCalendarDto[] }
  | { status: "ready"; data: WorkerCalendarDto };

export function WorkerCalendarPanel({
  allowFixturePreview = process.env.EXPO_PUBLIC_RWOS_ENV !== "production",
  renderFixturePreview,
  offerId,
  transport
}: Readonly<{
  allowFixturePreview?: boolean;
  renderFixturePreview?: (onClose: () => void) => ReactNode;
  offerId: string | null;
  transport: WorkerTransport | null;
}>) {
  const [selectedOfferId, setSelectedOfferId] = useState(offerId);
  const [state, setState] = useState<WorkerState>(
    !transport ? { status: "unavailable" } : { status: "loading" }
  );
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [fixturePreview, setFixturePreview] = useState(false);
  const requestGeneration = useRef(0);
  const load = useCallback(async () => {
    const generation = ++requestGeneration.current;
    if (!transport) return setState({ status: "unavailable" });
    setState({ status: "loading" });
    if (selectedOfferId) {
      const result = await transport.workerOffer(selectedOfferId);
      if (generation === requestGeneration.current) setState(result);
      return;
    }
    const result = await transport.workerOffers();
    if (generation !== requestGeneration.current) return;
    setState(result.status === "ready" ? { status: "list", data: result.data } : result);
  }, [selectedOfferId, transport]);
  useEffect(() => setSelectedOfferId(offerId), [offerId]);
  useEffect(() => {
    void load();
    return () => {
      requestGeneration.current += 1;
    };
  }, [load]);

  if (fixturePreview && !offerId && renderFixturePreview) {
    return renderFixturePreview(() => setFixturePreview(false));
  }

  return (
    <ScrollView style={styles.scroll} testID="worker-connected-calendar">
      <View style={styles.stack}>
        <Card>
          <SmallText>Connected calendar</SmallText>
          <Heading>Worker offers</Heading>
          <BodyText>
            Authenticated worker-authorized offer references only. Client billing, margin, payment
            methods, and internal notes are excluded.
          </BodyText>
        </Card>
        {state.status === "denied" && transport ? (
          <WorkerSignIn initialMessage={sessionNotice} transport={transport} onSignedIn={load} />
        ) : null}
        {state.status === "loading" ? (
          <StateCard title="Loading worker offer" message="Checking your secure worker session." />
        ) : null}
        {state.status === "empty" ? (
          <StateCard
            title="No persisted offers"
            message="There are no worker-authorized offers for this account. No fixture offer is substituted as persisted data."
          />
        ) : null}
        {state.status === "unavailable" ? (
          <StateCard
            title="Worker calendar unavailable"
            message="Secure API configuration is unavailable on this build."
          />
        ) : null}
        {allowFixturePreview &&
        renderFixturePreview &&
        !offerId &&
        (state.status === "empty" || state.status === "unavailable") ? (
          <Button
            label="Open isolated fixture workflow preview"
            onPress={() => setFixturePreview(true)}
            variant="secondary"
          />
        ) : null}
        {state.status === "stale" || state.status === "error" ? (
          <StateCard
            title={state.status === "stale" ? "Offer changed" : "Offer could not be loaded"}
            message="Refresh the authorized offer reference. No fixture data is shown."
            onRetry={load}
          />
        ) : null}
        {state.status === "list" ? (
          <OfferInbox
            offers={state.data}
            onSelect={(workerOfferId) => setSelectedOfferId(workerOfferId)}
          />
        ) : null}
        {state.status === "ready" && transport ? (
          <PersistedOffer
            offer={state.data}
            onUpdated={(data) => setState({ status: "ready", data })}
            transport={transport}
            {...(!offerId ? { onBack: () => setSelectedOfferId(null) } : {})}
          />
        ) : null}
        {transport && state.status !== "denied" ? (
          <WorkerAssignmentList transport={transport} />
        ) : null}
        {transport &&
        state.status !== "loading" &&
        state.status !== "unavailable" &&
        state.status !== "denied" ? (
          <WorkerSessionAction
            onSignedOut={async (notice) => {
              setSessionNotice(notice);
              setState({ status: "denied" });
            }}
            transport={transport}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

function WorkerSignIn({
  transport,
  onSignedIn,
  initialMessage
}: Readonly<{
  transport: WorkerTransport;
  onSignedIn: () => Promise<void>;
  initialMessage: string | null;
}>) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(
    initialMessage ?? "Sign in to access this worker-authorized offer."
  );
  const [needsSignOut, setNeedsSignOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const signIn = async () => {
    const validationMessage = validateWorkerSignInInput(email, password);
    if (validationMessage) {
      setNeedsSignOut(false);
      setMessage(validationMessage);
      return;
    }
    setSubmitting(true);
    setNeedsSignOut(false);
    try {
      const result = await transport.signIn({ email: email.trim(), password });
      setPassword("");
      if (result.status !== "authenticated") {
        setNeedsSignOut(result.status === "sign_out_required");
        return setMessage(
          result.status === "sign_out_required"
            ? "Sign out before changing accounts."
            : "Sign-in failed."
        );
      }
      await onSignedIn();
    } finally {
      setSubmitting(false);
    }
  };
  const signOut = async () => {
    setSubmitting(true);
    try {
      const result = await transport.signOut();
      setNeedsSignOut(false);
      setMessage(
        result.status === "signed_out"
          ? "Secure session cleared. Sign in with the intended worker account."
          : "Local session cleared; remote revocation is unavailable. Sign in only after confirming the prior device session is safe."
      );
    } catch {
      setMessage("Session clearing could not be confirmed. Close the app before retrying.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Section title="Secure sign-in">
      <Card>
        <View accessibilityLiveRegion="polite">
          <SmallText>{message}</SmallText>
        </View>
        <Text style={styles.label}>Email</Text>
        <TextInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoComplete="email"
          editable={!submitting}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="worker@example.com"
          style={styles.input}
          value={email}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          accessibilityLabel="Password"
          autoComplete="current-password"
          editable={!submitting}
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <Button
          disabled={submitting}
          label={submitting ? "Checking account…" : "Sign in securely"}
          onPress={() => void signIn()}
        />
        {needsSignOut ? (
          <Button
            disabled={submitting}
            label="Clear prior session"
            onPress={() => void signOut()}
            variant="secondary"
          />
        ) : null}
      </Card>
    </Section>
  );
}

function OfferInbox({
  offers,
  onSelect
}: Readonly<{
  offers: readonly WorkerCalendarDto[];
  onSelect: (workerOfferId: string) => void;
}>) {
  return (
    <Section title="Your offers">
      {offers.map((offer) => (
        <Card key={offer.workerOfferId}>
          <Badge label={offer.status} tone={workerOfferTone(offer.status)} />
          <Heading>{offer.title ?? "Worker offer"}</Heading>
          <BodyText>{formatWindow(offer)}</BodyText>
          <SmallText>Expires {formatExpiry(offer.expiresAt)}.</SmallText>
          <Button label="Review offer" onPress={() => onSelect(offer.workerOfferId)} />
        </Card>
      ))}
    </Section>
  );
}

function PersistedOffer({
  offer,
  transport,
  onUpdated,
  onBack
}: Readonly<{
  offer: WorkerCalendarDto;
  transport: WorkerTransport;
  onUpdated: (offer: WorkerCalendarDto) => void;
  onBack?: () => void;
}>) {
  const [confirming, setConfirming] = useState<"accept" | "decline" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const actionable = ["sent", "delivered", "viewed"].includes(offer.status);
  const respond = async (decision: "accept" | "decline") => {
    if (confirming !== decision) {
      setConfirming(decision);
      setMessage(
        decision === "accept"
          ? "Confirm acceptance of these exact terms."
          : "Confirm that you want to decline this offer."
      );
      return;
    }
    if (!offer.termsVersionId) {
      setMessage("Current offer terms are unavailable. Refresh before responding.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await transport.respondToWorkerOffer({
        offerId: offer.workerOfferId,
        decision,
        expectedVersion: offer.versionToken,
        expectedTermsVersionId: offer.termsVersionId
      });
      if (result.status === "ready") {
        setConfirming(null);
        setMessage(
          decision === "accept"
            ? "Offer accepted. A confirmed assignment remains a separate step."
            : "Offer declined."
        );
        onUpdated(result.data);
      } else {
        setMessage(
          result.status === "stale"
            ? "The offer changed. Refresh before responding."
            : result.status === "unavailable"
              ? "Offer responses are not enabled in this environment."
              : "The response could not be confirmed. Refresh before trying again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Section title="Authorized offer">
      {onBack ? (
        <Button disabled={submitting} label="Back to offers" onPress={onBack} variant="secondary" />
      ) : null}
      <Card testID="worker-persisted-offer-card">
        <Badge label={offer.status} tone={workerOfferTone(offer.status)} />
        <Heading>{offer.title ?? "Worker offer"}</Heading>
        <BodyText>{offer.summary ?? "No worker-visible summary provided."}</BodyText>
        <Divider />
        <BodyText>{formatWindow(offer)}</BodyText>
        <BodyText>Offer expires {formatExpiry(offer.expiresAt)}.</BodyText>
        <BodyText>{offer.compensationSummary ?? "Compensation terms unavailable"}</BodyText>
        <SmallText>
          {offer.policySummary ?? "No additional worker-visible policy summary."}
        </SmallText>
        <Divider />
        {message ? (
          <View accessibilityLiveRegion="polite">
            <SmallText>{message}</SmallText>
          </View>
        ) : null}
        {actionable ? (
          <>
            <Button
              disabled={submitting}
              label={confirming === "accept" ? "Confirm accept" : "Accept offer"}
              onPress={() => void respond("accept")}
            />
            <Button
              disabled={submitting}
              label={confirming === "decline" ? "Confirm decline" : "Decline offer"}
              onPress={() => void respond("decline")}
              variant="secondary"
            />
          </>
        ) : null}
        <SmallText>
          {
            "Confirmed assignment and attendance remain separate; this offer reference cannot execute attendance."
          }
        </SmallText>
      </Card>
    </Section>
  );
}

function WorkerSessionAction({
  transport,
  onSignedOut
}: Readonly<{ transport: WorkerTransport; onSignedOut: (notice: string) => Promise<void> }>) {
  const [submitting, setSubmitting] = useState(false);
  const signOut = async () => {
    setSubmitting(true);
    let notice = "Local session clearing could not be confirmed. Close the app before retrying.";
    try {
      const result = await transport.signOut();
      notice =
        result.status === "signed_out"
          ? "Secure worker session cleared."
          : "Local session cleared; remote revocation is unavailable.";
    } catch {
      // The authorized view is still cleared below so stale data cannot remain visible.
    } finally {
      await onSignedOut(notice);
      setSubmitting(false);
    }
  };
  return (
    <Button
      disabled={submitting}
      label={submitting ? "Signing out…" : "Switch worker account"}
      onPress={() => void signOut()}
      variant="secondary"
    />
  );
}

function WorkerAssignmentList({ transport }: Readonly<{ transport: WorkerTransport }>) {
  const [state, setState] = useState<
    | { status: "loading" | "empty" | "denied" | "error" | "unavailable" }
    | { status: "ready"; data: readonly WorkerAssignmentDto[] }
  >({ status: "loading" });
  const load = useCallback(async () => setState(await transport.workerAssignments()), [transport]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <Section title="Assignments">
      {state.status === "loading" ? (
        <SmallText>Loading worker-authorized assignments…</SmallText>
      ) : null}
      {state.status === "empty" ? (
        <SmallText>No assignments are available for this worker account.</SmallText>
      ) : null}
      {state.status === "denied" ? (
        <SmallText>Sign in with the assigned worker account to view assignments.</SmallText>
      ) : null}
      {state.status === "unavailable" || state.status === "error" ? (
        <Card>
          <SmallText>
            {state.status === "unavailable"
              ? "Assignment discovery is unavailable in this environment."
              : "Assignments could not be loaded."}
          </SmallText>
          <Button label="Retry assignments" onPress={() => void load()} variant="secondary" />
        </Card>
      ) : null}
      {state.status === "ready"
        ? state.data.map((assignment) => (
            <Card key={assignment.assignmentId}>
              <Badge
                label={assignmentStatusLabel(assignment.status)}
                tone={assignmentStatusTone(assignment.status)}
              />
              <Heading>{assignment.title}</Heading>
              <BodyText>{formatAssignmentWindow(assignment)}</BodyText>
              <BodyText>{assignment.worksiteSummary ?? "Worksite details unavailable"}</BodyText>
              <SmallText>
                Updated {formatAssignmentUpdatedAt(assignment.updatedAt, assignment.timezone)}.
              </SmallText>
              <SmallText>
                Attendance remains separate: {assignment.attendanceBoundary.replaceAll("_", " ")}.
              </SmallText>
            </Card>
          ))
        : null}
    </Section>
  );
}

function workerOfferTone(status: WorkerCalendarDto["status"]) {
  if (status === "accepted") return "success" as const;
  if (
    status === "declined" ||
    status === "cancelled" ||
    status === "expired" ||
    status === "withdrawn"
  ) {
    return "danger" as const;
  }
  if (status === "draft") return "neutral" as const;
  return "warning" as const;
}

function assignmentStatusTone(status: WorkerAssignmentDto["status"]) {
  if (
    status === "confirmed" ||
    status === "worker_acknowledged" ||
    status === "ready_for_attendance" ||
    status === "in_attendance_window"
  ) {
    return "success" as const;
  }
  if (
    status === "worker_withdrawn" ||
    status === "employer_cancelled" ||
    status === "platform_cancelled" ||
    status === "expired_before_start"
  ) {
    return "danger" as const;
  }
  if (status === "replacement_required") return "warning" as const;
  return "neutral" as const;
}

function assignmentStatusLabel(status: WorkerAssignmentDto["status"]) {
  return status.replaceAll("_", " ");
}

function formatAssignmentUpdatedAt(updatedAt: string, timezone: string) {
  return formatRwosDateTime(updatedAt, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short"
  });
}

function StateCard({
  title,
  message,
  onRetry
}: Readonly<{ title: string; message: string; onRetry?: () => Promise<void> }>) {
  return (
    <View accessibilityLiveRegion="polite">
      <Card>
        <Heading>{title}</Heading>
        <BodyText>{message}</BodyText>
        {onRetry ? (
          <Button label="Retry" onPress={() => void onRetry()} variant="secondary" />
        ) : null}
      </Card>
    </View>
  );
}

function formatWindow(offer: WorkerCalendarDto) {
  if (!offer.startAt || !offer.endAt || !offer.timezone) return "Schedule unavailable";
  const start = formatRwosDateTime(offer.startAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: offer.timezone
  });
  const end = formatRwosDateTime(offer.endAt, {
    timeStyle: "short",
    timeZone: offer.timezone
  });
  return start === "Unavailable" || end === "Unavailable"
    ? "Schedule unavailable"
    : `${start}–${end}`;
}

function formatExpiry(expiresAt: string) {
  const formatted = formatRwosDateTime(expiresAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  });
  return formatted === "Unavailable" ? formatted : `${formatted} UTC`;
}

function formatAssignmentWindow(assignment: WorkerAssignmentDto) {
  const start = formatRwosDateTime(assignment.startAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: assignment.timezone
  });
  const end = formatRwosDateTime(assignment.endAt, {
    timeStyle: "short",
    timeZone: assignment.timezone
  });
  return start === "Unavailable" || end === "Unavailable" ? "Unavailable" : `${start}–${end}`;
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  label: {
    color: colors.text,
    fontWeight: "700"
  },
  scroll: { flex: 1 },
  stack: { gap: spacing.lg, padding: spacing.lg }
});
