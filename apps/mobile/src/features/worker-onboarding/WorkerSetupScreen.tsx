import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "../../theme";
import type { MobileSessionTransport, WorkerElection } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, ErrorState, Heading, LoadingState, ScreenContainer, SmallText } from "../../ui/primitives";
import { agreementVersionFor, classificationOptions, setupCopyFor, type Classification } from "./setupContent";
import { useLocale } from "../../i18n/LocaleContext";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; election: WorkerElection | null; versions: Readonly<{ employee: string; contractor: string }> }
  | { status: "denied" | "error" };

export function WorkerSetupScreen({ transport, onBack }: { transport: MobileSessionTransport | null; onBack: () => void }) {
  // Same words as the website's setup page, in EN / FR / AR. The agreement's version code is sent
  // with the signature but no longer shown (audit S16).
  const { locale } = useLocale();
  const setupCopy = setupCopyFor(locale);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [choice, setChoice] = useState<Classification | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!transport) {
      setState({ status: "denied" });
      return;
    }
    const result = await transport.workerClassification();
    setState(result.status === "ready" ? { status: "ready", election: result.election, versions: result.agreementVersions } : { status: result.status });
  }, [transport]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (active) await load();
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const submit = useCallback(async () => {
    if (!transport || !choice || state.status !== "ready") return;
    setBusy(true);
    setNotice(null);
    const result = await transport.electClassification({
      classification: choice,
      agreementVersion: agreementVersionFor(choice, state.versions),
      agreementAccepted: accepted
    });
    setBusy(false);
    if (result.status === "ready") {
      setChoice(null);
      setAccepted(false);
      await load();
    } else {
      setNotice(
        result.status === "stale"
          ? setupCopy.staleNote
          : result.status === "invalid"
            ? setupCopy.invalidNote
            : result.status === "denied"
              ? setupCopy.signInRequired
              : setupCopy.submitError
      );
      if (result.status === "stale") await load();
    }
  }, [transport, choice, accepted, state, load, setupCopy]);

  return (
    <ScreenContainer testID="worker-setup-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Button label={setupCopy.back} onPress={onBack} variant="secondary" />
          <Card>
            <Heading>{setupCopy.title}</Heading>
            <BodyText>{setupCopy.intro}</BodyText>
            {notice ? <SmallText>{notice}</SmallText> : null}
          </Card>

          {state.status === "loading" ? <LoadingState label={setupCopy.loading} /> : null}
          {state.status === "denied" ? <ErrorState title={setupCopy.title} body={setupCopy.signInRequired} /> : null}
          {state.status === "error" ? <ErrorState title={setupCopy.title} body={setupCopy.loadError} /> : null}

          {state.status === "ready" && state.election ? (
            <Card testID="setup-complete">
              <Badge label={setupCopy.done} tone="success" />
              <Heading>{setupCopy.successTitle}</Heading>
              <BodyText>
                {setupCopy.setUpAs.replace(
                  "{type}",
                  state.election.classification === "contractor" ? setupCopy.contractorTitle : setupCopy.employeeTitle
                )}
              </BodyText>
              <SmallText>{setupCopy.alreadyNote}</SmallText>
            </Card>
          ) : null}

          {state.status === "ready" && !state.election ? (
            <>
              <Heading>{setupCopy.chooseCta}</Heading>
              {classificationOptions.map((opt) => {
                const selected = choice === opt.id;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={opt.id}
                    onPress={() => setChoice(opt.id)}
                    style={[styles.option, selected ? styles.optionSelected : null]}
                    testID={`setup-choice-${opt.id}`}
                  >
                    <View style={styles.optionHead}>
                      <Heading>{opt.id === "employee" ? setupCopy.employeeTitle : setupCopy.contractorTitle}</Heading>
                      {selected ? <Badge label={setupCopy.selected} tone="success" /> : null}
                    </View>
                    <BodyText>{opt.id === "employee" ? setupCopy.employeeSummary : setupCopy.contractorSummary}</BodyText>
                  </Pressable>
                );
              })}

              {choice ? (
                <Card>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: accepted }}
                    onPress={() => setAccepted((a) => !a)}
                    style={styles.accept}
                    testID="setup-accept"
                  >
                    <View style={[styles.checkbox, accepted ? styles.checkboxOn : null]}>
                      {accepted ? <SmallText>✓</SmallText> : null}
                    </View>
                    <BodyText>{choice === "employee" ? setupCopy.acceptEmployee : setupCopy.acceptContractor}</BodyText>
                  </Pressable>
                  <Button label={busy ? setupCopy.submitting : setupCopy.submitCta} onPress={() => void submit()} disabled={busy || !accepted} />
                </Card>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  stack: { gap: spacing.md, paddingBottom: spacing.xxl },
  option: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 2,
    gap: spacing.xs,
    padding: spacing.lg
  },
  optionSelected: { borderColor: colors.deepTeal },
  optionHead: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  accept: { alignItems: "center", flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  checkbox: {
    alignItems: "center",
    borderColor: colors.deepTeal,
    borderRadius: 6,
    borderWidth: 2,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  checkboxOn: { backgroundColor: colors.actionTeal, borderColor: colors.actionTeal }
});
