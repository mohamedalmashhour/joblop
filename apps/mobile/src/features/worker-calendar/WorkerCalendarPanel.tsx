import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, spacing } from "@rwos/design-system";
import type { WorkerCalendarDto } from "@rwos/shared";
import type { createMobileSessionTransport } from "../../auth/secureSession";
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
import { WorkerCalendarFixturePreview } from "./WorkerCalendarFixturePreview";

type WorkerTransport = ReturnType<typeof createMobileSessionTransport>;
type WorkerState =
  | { status: "loading" | "empty" | "denied" | "error" | "unavailable" | "stale" }
  | { status: "ready"; data: WorkerCalendarDto };

export function WorkerCalendarPanel({
  allowFixturePreview = process.env.EXPO_PUBLIC_RWOS_ENV !== "production",
  offerId,
  transport
}: Readonly<{
  allowFixturePreview?: boolean;
  offerId: string | null;
  transport: WorkerTransport | null;
}>) {
  const [state, setState] = useState<WorkerState>(
    !transport ? { status: "unavailable" } : !offerId ? { status: "empty" } : { status: "loading" }
  );
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [fixturePreview, setFixturePreview] = useState(false);
  const requestGeneration = useRef(0);
  const load = useCallback(async () => {
    const generation = ++requestGeneration.current;
    if (!transport) return setState({ status: "unavailable" });
    if (!offerId) return setState({ status: "empty" });
    setState({ status: "loading" });
    const result = await transport.workerOffer(offerId);
    if (generation === requestGeneration.current) setState(result);
  }, [offerId, transport]);
  useEffect(() => {
    void load();
    return () => {
      requestGeneration.current += 1;
    };
  }, [load]);

  if (fixturePreview && !offerId) {
    return <WorkerCalendarFixturePreview onClose={() => setFixturePreview(false)} />;
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
            title="No persisted offer selected"
            message="Open the worker calendar from an authorized offer link. No fixture offer is substituted as persisted data."
          />
        ) : null}
        {state.status === "unavailable" ? (
          <StateCard
            title="Worker calendar unavailable"
            message="Secure API configuration is unavailable on this build."
          />
        ) : null}
        {allowFixturePreview &&
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
        {state.status === "ready" ? <PersistedOffer offer={state.data} /> : null}
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
    setSubmitting(true);
    setNeedsSignOut(false);
    try {
      const result = await transport.signIn({ email, password });
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

function PersistedOffer({ offer }: Readonly<{ offer: WorkerCalendarDto }>) {
  return (
    <Section title="Authorized offer">
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
        <SmallText>
          Accept and decline are unavailable here until an authorized response API is connected.
        </SmallText>
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
  const start = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: offer.timezone
  }).format(new Date(offer.startAt));
  const end = new Intl.DateTimeFormat("en-CA", {
    timeStyle: "short",
    timeZone: offer.timezone
  }).format(new Date(offer.endAt));
  return `${start}–${end}`;
}

function formatExpiry(expiresAt: string) {
  return `${new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(new Date(expiresAt))} UTC`;
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
