import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { spacing } from "../../theme";
import type { MobileSessionTransport } from "../../auth/secureSession";
import { BodyText, Button, Card, Heading, SmallText } from "../../ui/primitives";
import { useLocale } from "../../i18n/LocaleContext";
import { requestAccountDeletion } from "./deleteAccountRules";

type Step = "idle" | "confirm" | "sending" | "sent";

/**
 * "Delete my account", started and confirmed inside the app (no website, no email to write). It
 * says what is deleted, what the law makes Joblop keep and how long it takes, asks once more, then
 * sends the request to Joblop staff and signs the person out.
 */
export function DeleteAccountCard({
  transport,
  onSignOut
}: {
  transport: MobileSessionTransport | null;
  onSignOut: () => void;
}) {
  const { t, locale } = useLocale();
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const send = async () => {
    if (!transport) return setError(t("deleteAccount.error.failed"));
    setStep("sending");
    setError(null);
    const result = await requestAccountDeletion(transport, locale, pendingId);
    if (result.status === "sent") return setStep("sent");
    setPendingId(result.conversationId);
    setError(t(`deleteAccount.error.${result.status}`));
    setStep("confirm");
  };

  if (step === "sent") {
    return (
      <Card>
        <Heading>{t("deleteAccount.sentTitle")}</Heading>
        <BodyText>{t("deleteAccount.sentBody")}</BodyText>
        <Button label={t("deleteAccount.signOut")} onPress={onSignOut} testID="delete-account-sign-out" />
      </Card>
    );
  }

  return (
    <Card>
      <Heading>{t("deleteAccount.title")}</Heading>
      <BodyText>{t("deleteAccount.intro")}</BodyText>
      {step === "idle" ? (
        <Button label={t("legal.deleteAccount")} onPress={() => setStep("confirm")} variant="danger" testID="delete-account-start" />
      ) : (
        <View style={styles.stack}>
          <SmallText>{t("deleteAccount.deleted")}</SmallText>
          <SmallText>{t("deleteAccount.kept")}</SmallText>
          <SmallText>{t("deleteAccount.timing")}</SmallText>
          {error ? <SmallText>{error}</SmallText> : null}
          <Button
            disabled={step === "sending"}
            label={step === "sending" ? t("auth.wait") : t("deleteAccount.confirm")}
            onPress={() => void send()}
            variant="danger"
            testID="delete-account-confirm"
          />
          <Button
            disabled={step === "sending"}
            label={t("deleteAccount.cancel")}
            onPress={() => {
              setStep("idle");
              setError(null);
            }}
            variant="secondary"
            testID="delete-account-cancel"
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm }
});
