import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../../theme";

import type { MobileSessionTransport } from "../../auth/secureSession";
import { BodyText, Button, Card, Heading, Input, SmallText } from "../../ui/primitives";
import { WorkerVerifyEmail } from "./WorkerVerifyEmail";
import { useLocale } from "../../i18n/LocaleContext";
import { ACCEPTED_LEGAL_VERSION, canCreateAccount, LegalLinks } from "../legal";

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
  const { t } = useLocale();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  // Same consent as the worker website sign-up: the Terms/Privacy box must be ticked first.
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const unavailable = !transport;

  if (verifying) {
    return <WorkerVerifyEmail onDone={onAuthenticated} transport={transport} />;
  }

  const sendCode = async () => {
    if (!transport) return;
    if (phone.replace(/\D/g, "").length < 10) return setMessage(t("auth.msg.shortNumber"));
    setBusy(true);
    setMessage(null);
    const result = await transport.requestPhoneCode(phone.trim());
    setBusy(false);
    if (result === "offline") return setMessage(t("auth.msg.offline"));
    if (result === "rate_limited") return setMessage(t("auth.msg.rateLimited"));
    if (result !== "requested") return setMessage(t("auth.msg.serverDown"));
    setStep("code");
    setCode("");
    setMessage(t("auth.msg.codeSent"));
  };

  const verify = async () => {
    if (!transport) return;
    if (!/^\d{6}$/.test(code.trim())) return setMessage(t("auth.msg.enterCode"));
    setBusy(true);
    setMessage(null);
    try {
      const result = await transport.verifyPhoneCode(phone.trim(), code.trim());
      if (result.status === "offline") return setMessage(t("auth.msg.offline"));
      if (result.status === "rate_limited") return setMessage(t("auth.msg.rateLimited"));
      if (result.status === "authenticated") return onAuthenticated();
      if (result.status === "sign_out_required") return setMessage(t("auth.msg.signedIn"));
      if (result.status === "denied") return setMessage(t("auth.msg.badCode"));
      return setMessage(t("auth.msg.serverDown"));
    } finally {
      setBusy(false);
    }
  };

  const createAccount = async () => {
    if (!transport) return;
    if (!canCreateAccount(accepted)) return setMessage(t("auth.mustAccept"));
    setBusy(true);
    setMessage(null);
    try {
      const result = await transport.signUp({
        email: email.trim(),
        phone: phone.trim(),
        displayName: fullName.trim() || null,
        acceptedLegalVersion: ACCEPTED_LEGAL_VERSION
      });
      // New accounts confirm their email once before continuing.
      if (result.status === "authenticated") return setVerifying(true);
      if (result.status === "sign_out_required") return setMessage(t("auth.msg.signedIn"));
      if (result.status === "registration_closed") return setMessage(t("auth.msg.closed"));
      if (result.status === "conflict") return setMessage(t("auth.msg.conflict"));
      if (result.status === "invalid") return setMessage(t("auth.msg.invalid"));
      if (result.status === "rate_limited") return setMessage(t("auth.msg.rateLimited"));
      return setMessage(t("auth.msg.createFailed"));
    } catch {
      setMessage(t("auth.msg.error"));
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
          <SmallText>{t("auth.workerAccess")}</SmallText>
          <Heading>{mode === "sign-in" ? t("auth.signIn") : t("auth.signUpTitle")}</Heading>
          <BodyText>
            {mode === "sign-in"
              ? t("auth.signInIntro")
              : t("auth.signUpIntro")}
          </BodyText>

          {unavailable ? (
            <SmallText>{t("auth.unavailable")}</SmallText>
          ) : (
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {mode === "sign-up" ? (
                <>
                  <Input label={t("auth.fullName")} onChangeText={setFullName} placeholder={t("auth.fullNamePh")} value={fullName} />
                  <Input label={t("auth.mobile")} onChangeText={setPhone} placeholder="514 555 0199" value={phone} />
                  <SmallText testID="signup-sms-consent">{t("auth.smsConsent")}</SmallText>
                  <Input label={t("auth.email")} onChangeText={setEmail} placeholder="you@example.com" value={email} />
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: accepted }}
                    onPress={() => setAccepted((value) => !value)}
                    style={styles.checkRow}
                    testID="signup-accept"
                  >
                    <View style={[styles.box, accepted ? styles.boxOn : null]}>
                      {accepted ? <Text style={styles.tick}>✓</Text> : null}
                    </View>
                    <Text style={styles.checkLabel}>{t("auth.accept")}</Text>
                  </Pressable>
                  <LegalLinks pages={["terms", "privacy"]} />
                </>
              ) : step === "phone" ? (
                <Input label={t("auth.mobile")} onChangeText={setPhone} placeholder="514 555 0199" value={phone} />
              ) : (
                <Input keyboardType="numeric" label={t("auth.code")} onChangeText={setCode} placeholder="123456" value={code} />
              )}
              {message ? <BodyText>{message}</BodyText> : null}
              <Button
                disabled={busy || (mode === "sign-up" && !canCreateAccount(accepted))}
                label={
                  busy
                    ? t("auth.wait")
                    : mode === "sign-up"
                      ? t("auth.createAccount")
                      : step === "phone"
                        ? t("auth.textCode")
                        : t("auth.signIn")
                }
                onPress={() => void (mode === "sign-up" ? createAccount() : step === "phone" ? sendCode() : verify())}
              />
              {mode === "sign-in" && step === "code" ? (
                <Button label={t("auth.newCode")} onPress={() => void sendCode()} variant="secondary" />
              ) : null}
              <Button
                label={mode === "sign-in" ? t("auth.toSignUp") : t("auth.toSignIn")}
                onPress={switchMode}
                variant="secondary"
              />
            </View>
          )}

          <Button label={t("auth.back")} onPress={onBack} variant="secondary" />
          <LegalLinks />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  checkRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  box: {
    alignItems: "center",
    borderColor: colors.deepTeal,
    borderRadius: 4,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  boxOn: { backgroundColor: colors.deepTeal },
  tick: { color: "#000000", fontSize: 16, fontWeight: "800" },
  checkLabel: { color: colors.text, flex: 1, fontSize: 15 }
});
