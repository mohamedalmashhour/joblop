import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { spacing } from "@rwos/design-system";

import type { MobileSessionTransport } from "../../auth/secureSession";
import { BodyText, Button, Card, Heading, Input, SmallText } from "../../ui/primitives";

type Phase = "sending" | "ready" | "verifying" | "verified" | "unavailable";

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Post-sign-up "verify your email" step (native). Requests a code via the mobile transport, accepts
 * it, and supports resend with a cooldown. Verification is additive (non-blocking), so "Continue" is
 * always available. Until the backend endpoints are live the transport returns `unavailable`, which
 * flips this to an honest "not enabled yet" state.
 */
export function WorkerVerifyEmail({
  transport,
  onDone
}: {
  transport: MobileSessionTransport | null;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("sending");
  const [message, setMessage] = useState("Sending a verification code to your email…");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((seconds) => {
        if (seconds <= 1 && timer.current) clearInterval(timer.current);
        return Math.max(0, seconds - 1);
      });
    }, 1000);
  }, []);

  const sendCode = useCallback(async () => {
    if (!transport) {
      setPhase("unavailable");
      return setMessage("Verification is not available in this build.");
    }
    setPhase("sending");
    setDevCode(null);
    setMessage("Sending a verification code to your email…");
    const result = await transport.sendEmailCode();
    if (result.status === "sent") {
      setPhase("ready");
      startCooldown();
      if (result.devCode) {
        setDevCode(result.devCode);
        return setMessage("Development mode: use the code below.");
      }
      return setMessage("We sent a code to your email. Enter it below.");
    }
    if (result.status === "unavailable") {
      setPhase("unavailable");
      return setMessage("Email verification isn’t enabled yet. You can continue for now.");
    }
    if (result.status === "rate_limited") {
      setPhase("ready");
      startCooldown();
      return setMessage("Please wait a moment before requesting another code.");
    }
    if (result.status === "denied") {
      setPhase("unavailable");
      return setMessage("Sign in again to verify your email.");
    }
    setPhase("ready");
    setMessage("Couldn’t send a code right now. Retry or continue.");
  }, [transport, startCooldown]);

  useEffect(() => {
    void sendCode();
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [sendCode]);

  const verify = async () => {
    if (!transport) return;
    if (!/^\d{6}$/.test(code.trim())) {
      return setMessage("Enter the numeric code from your email.");
    }
    setPhase("verifying");
    const result = await transport.verifyEmailCode(code.trim());
    if (result.status === "verified") {
      setPhase("verified");
      return setMessage("Email verified. Thank you!");
    }
    if (result.status === "unavailable") {
      setPhase("unavailable");
      return setMessage("Email verification isn’t enabled yet. You can continue for now.");
    }
    if (result.status === "denied") {
      setPhase("unavailable");
      return setMessage("Sign in again to verify your email.");
    }
    setPhase("ready");
    setMessage("That code didn’t match or has expired. Request a new one and try again.");
  };

  const showInputs = phase !== "unavailable" && phase !== "verified";

  return (
    <ScrollView>
      <View style={{ gap: spacing.md, padding: spacing.lg }}>
        <Card>
          <SmallText>Worker access</SmallText>
          <Heading>Verify your email</Heading>
          <BodyText>{message}</BodyText>
          {devCode ? <BodyText>Code: {devCode}</BodyText> : null}

          {showInputs ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <Input
                keyboardType="numeric"
                label="Verification code"
                onChangeText={setCode}
                placeholder="123456"
                value={code}
              />
              <Button
                disabled={phase === "verifying" || phase === "sending"}
                label={phase === "verifying" ? "Verifying…" : "Verify"}
                onPress={() => void verify()}
              />
              <Button
                disabled={cooldown > 0 || phase === "sending"}
                label={cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
                onPress={() => void sendCode()}
                variant="secondary"
              />
            </View>
          ) : null}

          <Button
            label={phase === "verified" ? "Continue" : "Continue — verify later"}
            onPress={onDone}
            variant="secondary"
          />
        </Card>
      </View>
    </ScrollView>
  );
}
