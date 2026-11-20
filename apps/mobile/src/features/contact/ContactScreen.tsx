import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "../../theme";
import {
  CONTACT_MAX_MESSAGE_LENGTH,
  type ContactConversation,
  type ContactMessage,
  type MobileSessionTransport
} from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, EmptyState, Heading, LoadingState, ScreenContainer, SmallText } from "../../ui/primitives";
import { useLocale } from "../../i18n/LocaleContext";
import { LegalLinks } from "../legal";
import {
  CONTACT_REFRESH_MS,
  EMPTY_DRAFT,
  QUICK_TOPICS,
  applyQuickTopic,
  authorLabelKey,
  canAskForPerson,
  formatContactTime,
  quickTopicKey,
  quickTopicOf,
  statusKey,
  statusTone,
  topicKey,
  type ContactDraft
} from "./contactContent";

type View_ = { mode: "list" } | { mode: "new" } | { mode: "chat"; id: string };
type Failure = "denied" | "offline" | "error";

// "Contact Joblop": the worker's one place to talk to Joblop. The Joblop assistant answers first
// (platform rules + the worker's own records); a staff member takes over for safety, disputes,
// account issues or when the worker asks for a person. Staff replies also arrive by email.
// Real API only (/contact/worker/...). The list and an open chat refresh themselves every ~15 s.
export function ContactScreen({
  transport,
  draft,
  openConversationId
}: {
  transport: MobileSessionTransport | null;
  /** Opens "New message" prefilled, e.g. from a shift card on the calendar. */
  draft?: ContactDraft | null;
  /** Opens one conversation directly, e.g. from a "Joblop staff replied" push notification. */
  openConversationId?: string | null;
}) {
  const [view, setView] = useState<View_>(
    openConversationId ? { mode: "chat", id: openConversationId } : draft ? { mode: "new" } : { mode: "list" }
  );
  const [newDraft, setNewDraft] = useState<ContactDraft>(draft ?? EMPTY_DRAFT);

  // A new prefilled draft (another shift tapped) replaces what is on screen.
  useEffect(() => {
    if (!draft) return;
    setNewDraft(draft);
    setView({ mode: "new" });
  }, [draft]);

  useEffect(() => {
    if (openConversationId) setView({ mode: "chat", id: openConversationId });
  }, [openConversationId]);

  if (view.mode === "chat") {
    return <ContactChat id={view.id} onBack={() => setView({ mode: "list" })} transport={transport} />;
  }
  if (view.mode === "new") {
    return (
      <ContactNew
        draft={newDraft}
        onCancel={() => {
          setNewDraft(EMPTY_DRAFT);
          setView({ mode: "list" });
        }}
        onChange={setNewDraft}
        onStarted={(id) => {
          setNewDraft(EMPTY_DRAFT);
          setView({ mode: "chat", id });
        }}
        transport={transport}
      />
    );
  }
  return (
    <ContactList
      onNew={() => {
        setNewDraft(EMPTY_DRAFT);
        setView({ mode: "new" });
      }}
      onOpen={(id) => setView({ mode: "chat", id })}
      transport={transport}
    />
  );
}

// ── conversation list ────────────────────────────────────────────────────────
function ContactList({
  transport,
  onNew,
  onOpen
}: {
  transport: MobileSessionTransport | null;
  onNew: () => void;
  onOpen: (id: string) => void;
}) {
  const { t, locale, isRtl } = useLocale();
  const [state, setState] = useState<
    { status: "loading" } | { status: "ready"; conversations: readonly ContactConversation[] } | { status: Failure }
  >({ status: "loading" });
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!transport) {
      setState({ status: "denied" });
      return;
    }
    const mine = ++seq.current;
    const result = await transport.listContactConversations();
    if (mine !== seq.current) return;
    if (result.status === "ready") setState({ status: "ready", conversations: result.conversations });
    // A failed background refresh keeps the list already on screen.
    else setState((prev) => (prev.status === "ready" && result.status === "offline" ? prev : { status: result.status }));
  }, [transport]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), CONTACT_REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    void load();
  }, [load]);

  return (
    <ScreenContainer testID="contact-list-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Card>
            <Heading>{t("contact.title")}</Heading>
            <BodyText>{t("contact.intro")}</BodyText>
            {transport ? (
              <View style={styles.row}>
                <Button label={t("contact.new")} onPress={onNew} testID="contact-new" />
                <Button label={t("contact.refresh")} onPress={retry} variant="secondary" testID="contact-refresh" />
              </View>
            ) : null}
          </Card>

          {state.status === "loading" ? <LoadingState label={t("contact.loading")} /> : null}
          {state.status === "denied" ? (
            <Card>
              <BodyText>{t("contact.signIn")}</BodyText>
            </Card>
          ) : null}
          {state.status === "offline" || state.status === "error" ? (
            <FailureCard kind={state.status} onRetry={retry} />
          ) : null}
          {state.status === "ready" && state.conversations.length === 0 ? (
            <EmptyState body={t("contact.empty.body")} title={t("contact.empty.title")} />
          ) : null}
          {state.status === "ready"
            ? state.conversations.map((c) => (
                <Pressable
                  onPress={() => onOpen(c.id)}
                  accessibilityRole="button"
                  key={c.id}
                  style={styles.rowCard}
                  testID="contact-conversation"
                >
                  <View style={styles.chipRow}>
                    <Badge label={t(statusKey(c.status))} tone={statusTone(c.status)} />
                    {c.urgent ? <Badge label={t("contact.urgent")} tone="danger" /> : null}
                    {c.unread ? <Badge label={t("contact.newReply")} tone="success" /> : null}
                  </View>
                  <Text style={[styles.rowTitle, rtl(isRtl)]}>{t(topicKey(c.topic))}</Text>
                  <SmallText>{formatContactTime(c.lastMessageAt, locale)}</SmallText>
                </Pressable>
              ))
            : null}

          <Card testID="contact-legal">
            <Heading>{t("legal.title")}</Heading>
            <SmallText>{t("legal.intro")}</SmallText>
            <LegalLinks />
          </Card>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// ── new conversation ─────────────────────────────────────────────────────────
function ContactNew({
  transport,
  draft,
  onChange,
  onCancel,
  onStarted
}: {
  transport: MobileSessionTransport | null;
  draft: ContactDraft;
  onChange: (next: ContactDraft) => void;
  onCancel: () => void;
  onStarted: (id: string) => void;
}) {
  const { t, locale, isRtl } = useLocale();
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const selected = quickTopicOf(draft);
  const canSend = Boolean(transport) && draft.text.trim().length > 0 && !sending;

  const send = useCallback(async () => {
    if (!transport || !draft.text.trim()) return;
    setSending(true);
    setFailure(null);
    const result = await transport.startContactConversation({
      text: draft.text,
      topic: draft.topic,
      urgent: draft.urgent,
      assignmentId: draft.assignmentId,
      locale
    });
    setSending(false);
    if (result.status === "ready") onStarted(result.id);
    else setFailure(result.status);
  }, [transport, draft, locale, onStarted]);

  return (
    <ScreenContainer testID="contact-new-screen">
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
        <View style={styles.stack}>
          <Card>
            <Heading>{t("contact.newTitle")}</Heading>
            <Text style={[styles.label, rtl(isRtl)]}>{t("contact.quick.title")}</Text>
            <View style={styles.chipRow}>
              {QUICK_TOPICS.map((quick) => {
                const on = selected === quick;
                return (
                  <Pressable
                    onPress={() => onChange({ ...draft, ...applyQuickTopic(quick) })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    key={quick}
                    style={[styles.topic, on ? styles.topicOn : null, quick === "urgent" ? styles.topicUrgent : null]}
                    testID={`contact-topic-${quick}`}
                  >
                    <Text style={[styles.topicText, on ? styles.topicTextOn : null]}>{t(quickTopicKey(quick))}</Text>
                  </Pressable>
                );
              })}
            </View>
            {draft.urgent ? (
              <View accessibilityRole="alert" style={styles.urgentBox}>
                <Text style={[styles.urgentText, rtl(isRtl)]}>{t("contact.urgentNote")}</Text>
              </View>
            ) : null}
            {draft.label ? <SmallText>{t("contact.linkedShift").replace("{label}", draft.label)}</SmallText> : null}
            <TextInput
              accessibilityLabel={t("contact.placeholder")}
              maxLength={CONTACT_MAX_MESSAGE_LENGTH}
              multiline
              onChangeText={(text) => onChange({ ...draft, text })}
              placeholder={t("contact.placeholder")}
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.inputTall, rtl(isRtl)]}
              testID="contact-new-input"
              value={draft.text}
            />
            <Text style={[styles.privacy, rtl(isRtl)]}>{t("contact.privacy")}</Text>
            {failure ? <FailureLine kind={failure} /> : null}
            <View style={styles.row}>
              <Button
                disabled={!canSend}
                label={sending ? t("contact.sending") : t("contact.send")}
                onPress={() => void send()}
                testID="contact-new-send"
              />
              <Button label={t("contact.cancel")} onPress={onCancel} variant="secondary" />
            </View>
          </Card>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// ── one conversation ─────────────────────────────────────────────────────────
function ContactChat({
  transport,
  id,
  onBack
}: {
  transport: MobileSessionTransport | null;
  id: string;
  onBack: () => void;
}) {
  const { t, locale, isRtl } = useLocale();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; conversation: ContactConversation; messages: readonly ContactMessage[] }
    | { status: Failure }
  >({ status: "loading" });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"send" | "person" | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const seq = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!transport) {
      setState({ status: "denied" });
      return;
    }
    const mine = ++seq.current;
    const result = await transport.getContactConversation(id);
    if (mine !== seq.current) return;
    if (result.status === "ready") setState({ status: "ready", conversation: result.conversation, messages: result.messages });
    else setState((prev) => (prev.status === "ready" && result.status === "offline" ? prev : { status: result.status }));
  }, [transport, id]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), CONTACT_REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    void load();
  }, [load]);

  const send = useCallback(async () => {
    if (!transport || !text.trim()) return;
    setBusy("send");
    setFailure(null);
    const result = await transport.sendContactMessage(id, text, locale);
    setBusy(null);
    if (result.status === "ready") {
      setText("");
      await load();
    } else setFailure(result.status);
  }, [transport, id, text, locale, load]);

  const askPerson = useCallback(async () => {
    if (!transport) return;
    setBusy("person");
    setFailure(null);
    const result = await transport.askForPerson(id, locale);
    setBusy(null);
    if (result.status === "ready") await load();
    else setFailure(result.status);
  }, [transport, id, locale, load]);

  const messageCount = state.status === "ready" ? state.messages.length : 0;
  useEffect(() => {
    if (messageCount > 0) scrollRef.current?.scrollToEnd({ animated: false });
  }, [messageCount]);

  const status = state.status === "ready" ? state.conversation.status : null;

  return (
    <ScreenContainer testID="contact-chat-screen">
      <View style={styles.chatTop}>
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.link} testID="contact-back">
          <Text style={styles.linkText}>{`${isRtl ? "›" : "‹"} ${t("contact.back")}`}</Text>
        </Pressable>
        <Pressable onPress={retry} accessibilityRole="button" style={styles.link} testID="contact-chat-refresh">
          <Text style={styles.linkText}>{t("contact.refresh")}</Text>
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" ref={scrollRef} style={styles.scroll}>
        <View style={styles.stack}>
          {state.status === "ready" ? (
            <View style={styles.chipRow}>
              <Text style={[styles.rowTitle, rtl(isRtl)]}>{t(topicKey(state.conversation.topic))}</Text>
              <Badge label={t(statusKey(state.conversation.status))} tone={statusTone(state.conversation.status)} />
              {state.conversation.urgent ? <Badge label={t("contact.urgent")} tone="danger" /> : null}
            </View>
          ) : null}
          {state.status === "loading" ? <LoadingState label={t("contact.loadingChat")} /> : null}
          {state.status === "denied" ? (
            <Card>
              <BodyText>{t("contact.signIn")}</BodyText>
            </Card>
          ) : null}
          {state.status === "offline" || state.status === "error" ? (
            <FailureCard kind={state.status} onRetry={retry} />
          ) : null}
          {state.status === "ready" && state.messages.length === 0 ? <SmallText>{t("contact.noMessages")}</SmallText> : null}
          {state.status === "ready"
            ? state.messages.map((m) => <Bubble isRtl={isRtl} key={m.id} locale={locale} message={m} t={t} />)
            : null}
          {status === "needs_admin" ? <Text style={[styles.note, rtl(isRtl)]}>{t("contact.waitingNote")}</Text> : null}
          {status === "solved" ? <Text style={[styles.note, rtl(isRtl)]}>{t("contact.solvedNote")}</Text> : null}
        </View>
      </ScrollView>

      {state.status === "ready" ? (
        <View style={styles.composer}>
          {status && canAskForPerson(status) ? (
            <Button
              disabled={busy !== null}
              label={t("contact.person")}
              onPress={() => void askPerson()}
              variant="secondary"
              testID="contact-person"
            />
          ) : null}
          {failure ? <FailureLine kind={failure} /> : null}
          <View style={styles.composerRow}>
            <TextInput
              accessibilityLabel={t("contact.placeholder")}
              maxLength={CONTACT_MAX_MESSAGE_LENGTH}
              multiline
              onChangeText={setText}
              placeholder={t("contact.placeholder")}
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.composerInput, rtl(isRtl)]}
              testID="contact-chat-input"
              value={text}
            />
            <Button
              disabled={busy !== null || !text.trim()}
              label={busy === "send" ? t("contact.sending") : t("contact.send")}
              onPress={() => void send()}
              testID="contact-chat-send"
            />
          </View>
          <Text style={[styles.privacy, rtl(isRtl)]}>{t("contact.privacy")}</Text>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function Bubble({
  message,
  locale,
  isRtl,
  t
}: {
  message: ContactMessage;
  locale: string;
  isRtl: boolean;
  t: (key: string) => string;
}) {
  const time = formatContactTime(message.createdAt, locale);
  if (message.authorKind === "system") {
    return (
      <View style={styles.systemNote} testID="contact-bubble-system">
        <Text style={styles.systemText}>{message.body}</Text>
        {time ? <Text style={styles.systemText}>{time}</Text> : null}
      </View>
    );
  }
  const mine = message.authorKind === "requester";
  const labelKey = authorLabelKey(message.authorKind);
  return (
    <View
      style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, message.authorKind === "admin" ? styles.bubbleStaff : null]}
      testID={`contact-bubble-${message.authorKind}`}
    >
      {labelKey ? <Text style={[styles.bubbleLabel, rtl(isRtl)]}>{t(labelKey)}</Text> : null}
      <Text style={[mine ? styles.bubbleTextMine : styles.bubbleText, rtl(isRtl)]}>{message.body}</Text>
      {time ? <Text style={[mine ? styles.bubbleTimeMine : styles.bubbleTime, rtl(isRtl)]}>{time}</Text> : null}
    </View>
  );
}

function FailureCard({ kind, onRetry }: { kind: "offline" | "error"; onRetry: () => void }) {
  const { t } = useLocale();
  return (
    <Card testID="contact-failure">
      <BodyText>{t(kind === "offline" ? "contact.offline" : "contact.error")}</BodyText>
      <View style={styles.row}>
        <Button label={t("contact.retry")} onPress={onRetry} variant="secondary" />
      </View>
    </Card>
  );
}

function FailureLine({ kind }: { kind: Failure }) {
  const { t, isRtl } = useLocale();
  const key = kind === "denied" ? "contact.signIn" : kind === "offline" ? "contact.sendOffline" : "contact.sendFailed";
  return (
    <Text accessibilityRole="alert" style={[styles.failure, rtl(isRtl)]}>
      {t(key)}
    </Text>
  );
}

function rtl(isRtl: boolean) {
  return isRtl ? styles.rtl : null;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  stack: { gap: spacing.md, paddingBottom: spacing.xl },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  chipRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rowCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  rowTitle: { color: colors.text, fontSize: typography.body, fontWeight: "800" },
  label: { color: colors.text, fontSize: typography.small, fontWeight: "700", marginTop: spacing.sm },
  topic: {
    borderColor: colors.muted,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.md
  },
  topicOn: { backgroundColor: colors.deepTeal, borderColor: colors.deepTeal },
  topicUrgent: { borderColor: colors.danger },
  topicText: { color: colors.text, fontSize: typography.small, fontWeight: "700" },
  topicTextOn: { color: "#000000" },
  urgentBox: { backgroundColor: "#241110", borderColor: colors.danger, borderRadius: radii.sm, borderWidth: 1, padding: spacing.sm },
  urgentText: { color: colors.text, fontSize: typography.small, fontWeight: "700" },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  inputTall: { marginTop: spacing.sm, minHeight: 120, textAlignVertical: "top" },
  privacy: { color: colors.muted, fontSize: typography.small, marginTop: spacing.xs },
  failure: { color: colors.danger, fontSize: typography.small, fontWeight: "700" },
  chatTop: { flexDirection: "row", justifyContent: "space-between", paddingBottom: spacing.sm },
  link: { paddingVertical: spacing.xs },
  linkText: { color: colors.actionTeal, fontSize: typography.small, fontWeight: "700" },
  note: { color: colors.muted, fontSize: typography.small, fontStyle: "italic", textAlign: "center" },
  composer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm
  },
  composerRow: { alignItems: "flex-end", flexDirection: "row", gap: spacing.sm },
  composerInput: { flex: 1, maxHeight: 120, minHeight: 44 },
  bubble: { borderRadius: radii.md, gap: 2, maxWidth: "85%", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: colors.deepTeal },
  bubbleTheirs: { alignSelf: "flex-start", backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 },
  bubbleStaff: { borderColor: colors.success },
  bubbleLabel: { color: colors.deepTeal, fontSize: typography.small, fontWeight: "800" },
  bubbleText: { color: colors.text, fontSize: typography.body },
  bubbleTextMine: { color: "#000000", fontSize: typography.body },
  bubbleTime: { color: colors.muted, fontSize: 11 },
  bubbleTimeMine: { color: "#3a2c00", fontSize: 11 },
  systemNote: { alignItems: "center", alignSelf: "center", gap: 2, maxWidth: "90%", paddingVertical: spacing.xs },
  systemText: { color: colors.muted, fontSize: typography.small, textAlign: "center" },
  rtl: { textAlign: "right", writingDirection: "rtl" }
});
