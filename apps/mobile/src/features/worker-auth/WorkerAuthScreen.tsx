import { useState } from "react";
import { ScrollView, View } from "react-native";
import { spacing } from "../../theme";

import type { MobileSessionTransport } from "../../auth/secureSession";
import { BodyText, Button, Card, Heading, Input, SmallText } from "../../ui/primitives";
import { WorkerVerifyEmail } from "./WorkerVerifyEmail";

type Mode = "sign-in" | "sign-up";

/**
 * Worker sign-in / sign-up capsule (native). Wraps the real mobile session transport, which posts to
 * the backend `/auth/sign-in` and `/auth/register` and stores the session token in the device secure
 * store (Keychain / Keystore) — never in plain storage. Sign-in works in every environment;
 * registration is gated to non-production by the backend, so a closed registration is stated plainly
 * rather than pretended. On success the parent is told the worker is authenticated.
 */
export function WorkerAuthScreen({
  transport,
  onAuthenticated,
  onBack,
  initialMode = "sign-in"
}: {
  transport: MobileSessionTransport | null;
  onAuthenticated: () => void;
  onBack: () => void;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const unavailable = !transport;

  if (verifying) {
    return <WorkerVerifyEmail onDone={onAuthenticated} transport={transport} />;
  }

  const submit = async () => {
    if (!transport) return;
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "sign-in") {
        const result = await transport.signIn({ email, password });
        setPassword("");
        if (result.status === "authenticated") return onAuthenticated();
        if (result.status === "sign_out_required") {
          return setMessage("You are already signed in on this device. Sign out first.");
        }
        if (result.status === "denied") {
          return setMessage("Sign-in failed. Check your email and password.");
        }
        return setMessage("Sign-in is unavailable right now. Try again.");
      }

      const result = await transport.signUp({
        email,
        password,
        displayName: fullName || null
      });
      setPassword("");
      // New accounts go through the additive email-verification step before continuing.
      if (result.status === "authenticated") return setVerifying(true);
      if (result.status === "sign_out_required") {
        return setMessage("You are already signed in on this device. Sign out first.");
      }
      if (result.status === "registration_closed") {
        return setMessage("Account creation is not open in this environment yet.");
      }
      if (result.status === "conflict") {
        return setMessage("That email is already registered — try signing in instead.");
      }
      if (result.status === "invalid") {
        return setMessage("Choose a stronger password and try again.");
      }
      if (result.status === "rate_limited") {
        return setMessage("Too many attempts. Please wait a moment and try again.");
      }
      return setMessage("Could not create the account. Check your details and try again.");
    } catch {
      setMessage("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView>
      <View style={{ gap: spacing.md, padding: spacing.lg }}>
        <Card>
          <SmallText>Worker access</SmallText>
          <Heading>{mode === "sign-in" ? "Sign in" : "Create your worker account"}</Heading>
          <BodyText>
            {mode === "sign-in"
              ? "Sign in to see your matched offers, confirmations, and shift directions."
              : "Create an account to start worker onboarding. Account creation is available in non-production environments."}
          </BodyText>

          {unavailable ? (
            <SmallText>
              The account service is not configured in this build (no API origin). Sign-in and sign-up
              are unavailable here.
            </SmallText>
          ) : (
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {mode === "sign-up" ? (
                <Input
                  label="Full name"
                  onChangeText={setFullName}
                  placeholder="Your name"
                  value={fullName}
                />
              ) : null}
              <Input
                label="Work email"
                onChangeText={setEmail}
                placeholder="you@example.com"
                value={email}
              />
              <Input
                label="Password"
                onChangeText={setPassword}
                placeholder={mode === "sign-in" ? "Your password" : "Create a password"}
                value={password}
              />
              {message ? <BodyText>{message}</BodyText> : null}
              <Button
                disabled={busy}
                label={
                  busy
                    ? "Please wait…"
                    : mode === "sign-in"
                      ? "Sign in"
                      : "Create account"
                }
                onPress={() => void submit()}
              />
              <Button
                label={
                  mode === "sign-in"
                    ? "New here? Create an account"
                    : "I already have an account"
                }
                onPress={() => {
                  setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                  setMessage(null);
                }}
                variant="secondary"
              />
            </View>
          )}

          <Button label="Back" onPress={onBack} variant="secondary" />
        </Card>
      </View>
    </ScrollView>
  );
}
