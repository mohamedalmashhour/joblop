import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { certificateLabel, workerProfileRating } from "@rwos/shared";
import { colors, radii, spacing } from "../../theme";
import type { MobileSessionTransport, WorkerDocument } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, ErrorState, Heading, LoadingState, ScreenContainer, Section, SmallText } from "../../ui/primitives";
import { useLocale } from "../../i18n/LocaleContext";
import { formatLocale } from "../marketplace/marketplaceContent";
import {
  CERTIFICATE_TYPES,
  DOCUMENT_TYPES,
  MAX_CERTIFICATES,
  MAX_FILE_BYTES,
  activeDocuments,
  allowedFileType,
  documentStatusKey,
  documentStatusTone,
  documentTypeLabel,
  formatExpiry
} from "./documentsContent";
import { pickDocument, type PickedFile } from "./pickDocument";

type State =
  | { status: "loading" }
  | { status: "ready"; documents: readonly WorkerDocument[] }
  | { status: "denied" | "needs_setup" | "error" };

const TIER_KEY: Readonly<Record<string, string>> = { starter: "doc.tierStarter", good: "doc.tierGood", strong: "doc.tierStrong", top: "doc.tierTop" };

// "My documents" — the website's Documents page in the app: the profile rating, upload (one file at
// a time from the phone), the list with each document's status, and the expiry date Joblop staff set
// when they verify it. Includes the certificate types employers can require on a job (cert_*).
// Joblop reviews every document; the worker can never approve their own.
export function DocumentsScreen({
  transport,
  onOpenSetup,
  onOpenSearch
}: {
  transport: MobileSessionTransport | null;
  onOpenSetup?: () => void;
  onOpenSearch?: () => void;
}) {
  const { t, locale, isRtl } = useLocale();
  const [state, setState] = useState<State>({ status: "loading" });
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [replacing, setReplacing] = useState<WorkerDocument | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!transport) return setState({ status: "denied" });
    const result = await transport.workerDocuments();
    if (result.status === "ready") setState({ status: "ready", documents: result.data });
    else if (result.status === "denied" || result.status === "needs_setup") setState({ status: result.status });
    else setState({ status: "error" });
  }, [transport]);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = useCallback(async () => {
    setError(null);
    try {
      const picked = await pickDocument();
      if (!picked) return;
      if (!allowedFileType(picked.name, picked.mimeType)) return setError(t("doc.fileTypeNotAllowed", { name: picked.name }));
      if ((picked.size ?? 0) > MAX_FILE_BYTES) return setError(t("doc.fileTooLarge", { name: picked.name }));
      setFile(picked);
    } catch {
      setError(t("doc.uploadFailed"));
    }
  }, [t]);

  const upload = useCallback(async () => {
    if (!transport || state.status !== "ready") return;
    if (!docType) return;
    if (!file) return setError(t("doc.chooseFileFirst"));
    if (docType === "certificate" && !replacing) {
      const existing = activeDocuments(state.documents).filter((d) => d.documentType === "certificate").length;
      if (existing + 1 > MAX_CERTIFICATES) return setError(t("doc.certLimit"));
    }
    const contentType = allowedFileType(file.name, file.mimeType);
    if (!contentType) return setError(t("doc.fileTypeNotAllowed", { name: file.name }));
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await transport.uploadWorkerDocument({
        documentType: docType,
        fileName: file.name,
        contentType,
        dataBase64: file.dataBase64,
        replace: replacing !== null
      });
      if (result.status !== "ready") {
        setError(
          result.status === "upload_failed"
            ? t("doc.uploadFailed")
            : result.status === "submit_failed"
              ? t("doc.submitFailed")
              : result.status === "offline"
                ? t("doc.uploadUnreachable")
                : t("doc.startFailed")
        );
        return;
      }
      // The API only supersedes an accepted document, so retire a not-yet-accepted original here.
      if (replacing && replacing.effectiveStatus !== "accepted") await transport.removeWorkerDocument(replacing.id);
      setNotice(replacing ? t("doc.replacementSubmitted") : t("doc.submitted"));
      setDocType("");
      setFile(null);
      setReplacing(null);
      await load();
    } finally {
      setBusy(false);
    }
  }, [transport, state, docType, file, replacing, load, t]);

  const remove = useCallback(
    async (id: string) => {
      if (!transport) return;
      setBusy(true);
      setConfirmDelete(null);
      setError(null);
      try {
        const result = await transport.removeWorkerDocument(id);
        if (result.status !== "ready") return setError(t("doc.removeFailed"));
        setNotice(t("doc.removed"));
        await load();
      } finally {
        setBusy(false);
      }
    },
    [transport, load, t]
  );

  const loc = formatLocale(locale);
  return (
    <ScreenContainer testID="documents-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Card>
            <Heading>{t("doc.title")}</Heading>
            <BodyText>{t("doc.intro")}</BodyText>
          </Card>
          {state.status === "loading" ? <LoadingState label={t("common.loading")} /> : null}
          {state.status === "denied" ? <ErrorState title={t("job.signInCta")} body={t("doc.signInPrompt")} /> : null}
          {state.status === "needs_setup" ? (
            <ErrorState
              title={t("common.setUpWorker")}
              body={t("common.needsWorkerSetup")}
              action={onOpenSetup ? <Button label={t("common.setUpWorker")} onPress={onOpenSetup} /> : undefined}
            />
          ) : null}
          {state.status === "error" ? (
            <ErrorState title={t("common.somethingWrong")} body={t("doc.loadError")} action={<Button label={t("common.retry")} onPress={() => void load()} variant="secondary" />} />
          ) : null}

          {notice ? (
            <View accessibilityLiveRegion="polite" style={styles.ok}>
              <BodyText>{notice}</BodyText>
            </View>
          ) : null}
          {error ? (
            <View accessibilityRole="alert" style={styles.err}>
              <BodyText>{error}</BodyText>
            </View>
          ) : null}

          {state.status === "ready" ? (
            <>
              <RatingCard documents={state.documents} onPick={(type) => { setReplacing(null); setDocType(type); setError(null); }} />

              <Card testID="documents-upload">
                <Text style={[styles.label, isRtl ? styles.rtl : null]}>{t("doc.documentType")}</Text>
                {replacing ? (
                  <BodyText>{documentTypeLabel(replacing.documentType, locale, t)}</BodyText>
                ) : (
                  <>
                    <View style={styles.chips}>
                      {DOCUMENT_TYPES.map((d) => (
                        <Chip key={d.value} label={t(d.labelKey)} on={docType === d.value} onPress={() => setDocType(d.value)} />
                      ))}
                    </View>
                    <Text style={[styles.label, isRtl ? styles.rtl : null]}>{t("job.certsTitle")}</Text>
                    <View style={styles.chips}>
                      {CERTIFICATE_TYPES.map((c) => (
                        <Chip key={c.value} label={certificateLabel(c.key, locale)} on={docType === c.value} onPress={() => setDocType(c.value)} />
                      ))}
                    </View>
                  </>
                )}
                <Text style={[styles.label, isRtl ? styles.rtl : null]}>{t("doc.file")}</Text>
                <Button label={file ? file.name : t("doc.chooseFile")} onPress={() => void choose()} variant="secondary" />
                <SmallText>{t("doc.formHelp")}</SmallText>
                {replacing ? <SmallText>{t("doc.chooseNewToReplace")}</SmallText> : null}
                <Button
                  disabled={busy || !docType || !file}
                  label={busy ? t("doc.uploading") : t("doc.uploadDocument")}
                  onPress={() => void upload()}
                  testID="documents-upload-button"
                />
                {replacing ? (
                  <Button
                    label={t("doc.cancel")}
                    onPress={() => {
                      setReplacing(null);
                      setDocType("");
                      setFile(null);
                    }}
                    variant="secondary"
                  />
                ) : null}
              </Card>

              <Section title={t("nav.documents")}>
                {activeDocuments(state.documents).length === 0 ? (
                  <Card>
                    <BodyText>{t("doc.none")}</BodyText>
                  </Card>
                ) : (
                  activeDocuments(state.documents).map((d) => {
                    const typeLabel = documentTypeLabel(d.documentType, locale, t);
                    return (
                      <Card key={d.id} testID="document-row">
                        <Heading>{d.fileName ?? typeLabel}</Heading>
                        {d.fileName ? <SmallText>{typeLabel}</SmallText> : null}
                        <View style={styles.chips}>
                          <Badge label={t(documentStatusKey(d.effectiveStatus))} tone={documentStatusTone(d.effectiveStatus)} />
                          {d.expiresAt ? <Badge label={t("common.expires", { date: formatExpiry(d.expiresAt, loc) })} tone="neutral" /> : null}
                        </View>
                        {confirmDelete === d.id ? (
                          <View accessibilityRole="alert" style={styles.err}>
                            <BodyText>{t("doc.confirmDelete")}</BodyText>
                            <Button disabled={busy} label={t("doc.confirmYes")} onPress={() => void remove(d.id)} variant="danger" />
                            <Button label={t("doc.cancel")} onPress={() => setConfirmDelete(null)} variant="secondary" />
                          </View>
                        ) : (
                          <View style={styles.actions}>
                            <Button
                              disabled={busy}
                              label={t("doc.replace")}
                              onPress={() => {
                                setReplacing(d);
                                setDocType(d.documentType);
                                setFile(null);
                                setError(null);
                                setNotice(null);
                              }}
                              variant="secondary"
                            />
                            <Button disabled={busy} label={t("doc.remove")} onPress={() => setConfirmDelete(d.id)} variant="secondary" />
                          </View>
                        )}
                      </Card>
                    );
                  })
                )}
              </Section>

              {activeDocuments(state.documents).length > 0 ? (
                <Card>
                  <Heading>{t("doc.doneTitle")}</Heading>
                  <BodyText>{t("doc.doneBody")}</BodyText>
                  {onOpenSearch ? <Button label={t("doc.nextStep")} onPress={onOpenSearch} /> : null}
                </Card>
              ) : null}
              <SmallText>{t("doc.footer")}</SmallText>
            </>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function RatingCard({ documents, onPick }: { documents: readonly WorkerDocument[]; onPick: (documentType: string) => void }) {
  const { t, locale } = useLocale();
  const rating = workerProfileRating(documents);
  return (
    <Card testID="documents-rating">
      <Heading>{t("doc.ratingTitle", { score: rating.score, tier: t(TIER_KEY[rating.tier] ?? "doc.tierStarter") })}</Heading>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: rating.score }} style={styles.track}>
        <View style={[styles.fill, { width: `${rating.score}%` }]} />
      </View>
      <SmallText>{rating.jobLimit === null ? t("doc.ratingAllJobs") : t("doc.ratingJobs", { count: rating.jobLimit })}</SmallText>
      {rating.items.map((item) => (
        <View key={item.key} style={styles.ratingRow}>
          <Text style={styles.ratingText}>{`${item.done ? "✅" : "⬜"} ${documentTypeLabel(item.key, locale, t)} +${item.points}`}</Text>
          {item.done ? (
            <Badge label={t("doc.itemDone")} tone="success" />
          ) : (
            <Pressable accessibilityRole="button" onPress={() => onPick(item.key)} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>{t("doc.itemUpload")}</Text>
            </Pressable>
          )}
        </View>
      ))}
    </Card>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={onPress} style={[styles.chip, on ? styles.chipOn : null]}>
      <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{on ? `✓ ${label}` : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  stack: { gap: spacing.lg, paddingBottom: spacing.xxl },
  label: { color: colors.text, fontSize: 14, fontWeight: "800", marginTop: spacing.sm },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginVertical: spacing.xs },
  chip: { borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  chipOn: { backgroundColor: colors.deepTeal, borderColor: colors.deepTeal },
  chipText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  chipTextOn: { color: "#000000", fontWeight: "800" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  ok: { backgroundColor: colors.cream, borderColor: colors.success, borderRadius: radii.md, borderWidth: 1, padding: spacing.md },
  err: { backgroundColor: colors.cream, borderColor: colors.danger, borderRadius: radii.md, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  track: { backgroundColor: colors.cream, borderRadius: 999, height: 8, overflow: "hidden" },
  fill: { backgroundColor: colors.deepTeal, height: "100%" },
  ratingRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" },
  ratingText: { color: colors.text, flexShrink: 1, fontSize: 14 },
  smallBtn: { borderColor: colors.deepTeal, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 4 },
  smallBtnText: { color: colors.deepTeal, fontSize: 13, fontWeight: "800" }
});
