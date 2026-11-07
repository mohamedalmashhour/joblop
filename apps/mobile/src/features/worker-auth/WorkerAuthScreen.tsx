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
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const unavailable = !transport;

  if (verifying) {
    return <WorkerVerifyEmail onDone={onAuthenticated} transport={transport} />;
  }

  const sendCode = async () => {
    if (!transport) return;
    setBusy(true);
    setMessage(null);
    const result = await transport.requestPhoneCode(phone.trim());
    setBusy(false);
    if (result !== "requested") return setMessage("That number could not be used. Check it and try again.");
    setStep("code");
    setCode("");
    setMessage("If this number has an account, a 6-digit code is on its way. It expires in 10 minutes.");
  };

  const verify = async () => {
    if (!transport) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await transport.verifyPhoneCode(phone.trim(), code.trim());
      if (result.status === "authenticated") return onAuthenticated();
      if (result.status === "sign_out_required") return setMessage("You are already signed in on this device. Sign out first.");
      if (result.status === "denied") return setMessage("That code did not work. Check it, or ask for a new one.");
      return setMessage("Sign-in is unavailable right now. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const createAccount = async () => {
    if (!transport) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await transport.signUp({ email: email.trim(), phone: phone.trim(), displayName: fullName.trim() || null });
      // New accounts confirm their email once before continuing.
      if (result.status === "authenticated") return setVerifying(true);
      if (result.status === "sign_out_required") return setMessage("You are already signed in on this device. Sign out first.");
      if (result.status === "registration_closed") return setMessage("Account creation is not open yet.");
      if (result.status === "conflict") return setMessage("That email already has an account. Sign in with your mobile number instead.");
      if (result.status === "invalid") return setMessage("Check your mobile number and email, then try again.");
      if (result.status === "rate_limited") return setMessage("Too many attempts. Please wait a moment and try again.");
      return setMessage("Could not create the account. Check your details and try again.");
    } catch {
      setMessage("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "sign-in" ? "sign-up" : "sign-in");
    setStep("phone");
    setMessage(null);
  };

  return (
    <ScrollView>
      <View style={{ gap: spacing.md, padding: spacing.lg }}>
        <Card>
          <SmallText>Worker access</SmallText>
          <Heading>{mode === "sign-in" ? "Sign in" : "Create your worker account"}</Heading>
          <BodyText>
            {mode === "sign-in"
              ? "Enter your mobile number. We will text you a code. No password needed."
              : "Tell us who you are. You will sign in with your mobile number and a texted code."}
          </BodyText>

          {unavailable ? (
            <SmallText>The account service is not available in this build. Sign-in is unavailable here.</SmallText>
          ) : (
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {mode === "sign-up" ? (
                <>
                  <Input label="Full name" onChangeText={setFullName} placeholder="Your name" value={fullName} />
                  <Input label="Mobile number" onChangeText={setPhone} placeholder="514 555 0199" value={phone} />
                  <Input label="Email (for receipts and pay statements)" onChangeText={setEmail} placeholder="you@example.com" value={email} />
                </>
              ) : step === "phone" ? (
                <Input label="Mobile number" onChangeText={setPhone} placeholder="514 555 0199" value={phone} />
              ) : (
                <Input keyboardType="numeric" label="6-digit code" onChangeText={setCode} placeholder="123456" value={code} />
              )}
              {message ? <BodyText>{message}</BodyText> : null}
              <Button
                disabled={busy}
                label={
                  busy
                    ? "Please wait…"
                    : mode === "sign-up"
                      ? "Create account"
                      : step === "phone"
                        ? "Text me a code"
                        : "Sign in"
                }
                onPress={() => void (mode === "sign-up" ? createAccount() : step === "phone" ? sendCode() : verify())}
              />
              {mode === "sign-in" && step === "code" ? (
                <Button label="Send a new code" onPress={() => void sendCode()} variant="secondary" />
              ) : null}
              <Button
                label={mode === "sign-in" ? "New here? Create an account" : "I already have an account"}
                onPress={switchMode}
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
