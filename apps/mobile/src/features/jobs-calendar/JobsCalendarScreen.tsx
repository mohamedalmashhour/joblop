import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../../theme";
import type { CalendarHubItem, CalendarHubToday, MobileSessionTransport } from "../../auth/secureSession";
import { BodyText, Button, Card, Heading, LoadingState, ScreenContainer, SmallText } from "../../ui/primitives";
import { useLocale } from "../../i18n/LocaleContext";
import { shiftDraft, type ContactDraft } from "../contact/contactContent";
import { addMonths, buildMonthWeeks, dayNumber, isoDay, monthTitle, weekdayNames } from "../calendar-month/monthGrid";
import {
  HUB_LAYERS,
  PAY_STATUSES,
  SHIFT_STATUSES,
  claimMessage,
  formatBonus,
  formatHourlyRate,
  formatHubTime,
  formatMoney,
  gridWindow,
  groupHubByDay,
  hubLayer,
  hubStatusKey,
  placesLeftLabel,
  summarizeHubDay,
  type ClaimMessage,
  type HubLayer
} from "./jobsCalendarContent";

// Shared hub colours (web + phone). No blue or teal (brand rule).
const GOLD = "#f8b808";
const GREEN = "#3ddc84";
const RED = "#e4756b";
const CREAM = "#f4efe4";
const GREY = "#8f8574";

const LAYER_COLOR: Record<HubLayer, string> = { available: GOLD, shift: GREEN, pay: CREAM, cancelled: RED };

type LoadState =
  | { status: "loading" }
  | { status: "ready"; items: readonly CalendarHubItem[]; today: readonly CalendarHubToday[] }
  | { status: "denied" | "offline" | "error" };

// The worker's "My calendar" tab (GET /worker/calendar-hub): ONE month grid with open Joblop jobs
// to accept (gold count, ★ bonus), the worker's confirmed shifts (green), cancelled shifts (red)
// and pay days ("$"), a "Today" panel on top, filter chips and a legend. Tap a day to list its
// items; open jobs keep the Accept flow (POST .../claim) after an inline confirm. The month reloads
// after every accept attempt so counts stay true.
export function JobsCalendarScreen({
  transport,
  onOpenSetup,
  onOpenSearch,
  onOpenSchedule,
  onOpenPay,
  onOpenOffers,
  onContactAboutShift
}: {
  transport: MobileSessionTransport | null;
  onOpenSetup?: () => void;
  onOpenSearch?: () => void;
  onOpenSchedule?: () => void;
  onOpenPay?: () => void;
  onOpenOffers?: () => void;
  /** Opens "Contact Joblop" with a new message about this shift (linked to the assignment). */
  onContactAboutShift?: (draft: ContactDraft) => void;
}) {
  const { t, locale, isRtl } = useLocale();
  const today = useMemo(() => new Date(), []);
  const todayIso = isoDay(today);
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(todayIso);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [shown, setShown] = useState<Record<HubLayer, boolean>>({ available: true, shift: true, pay: true, cancelled: true });
  const [reloadTick, setReloadTick] = useState(0);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [message, setMessage] = useState<ClaimMessage | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!transport) {
      setState({ status: "denied" });
      return;
    }
    const seq = ++requestSeq.current;
    setState((prev) => (prev.status === "ready" ? prev : { status: "loading" }));
    void transport.getCalendarHub(gridWindow(view.year, view.month)).then((result) => {
      if (seq !== requestSeq.current) return; // a newer month/reload superseded this one
      if (result.status === "ready") setState({ status: "ready", items: result.items, today: result.today });
      else setState({ status: result.status });
    });
  }, [transport, view, reloadTick]);

  const reload = useCallback(() => setReloadTick((n) => n + 1), []);

  const changeMonth = useCallback((delta: number) => {
    setView((v) => addMonths(v.year, v.month, delta));
    setConfirmingId(null);
    setState({ status: "loading" });
  }, []);

  const goToDay = useCallback(
    (date: Date) => {
      const sameView = date.getFullYear() === view.year && date.getMonth() === view.month;
      if (!sameView) {
        setView({ year: date.getFullYear(), month: date.getMonth() });
        setState({ status: "loading" });
      }
      setSelected(isoDay(date));
      setConfirmingId(null);
    },
    [view]
  );

  const accept = useCallback(
    async (jobRequestId: string) => {
      if (!transport) return;
      setClaimingId(jobRequestId);
      setMessage(null);
      const result = await transport.claimOpenJob(jobRequestId);
      setClaimingId(null);
      setConfirmingId(null);
      setMessage(claimMessage(result));
      reload();
    },
    [transport, reload]
  );

  const weeks = useMemo(() => buildMonthWeeks(view.year, view.month), [view]);
  const byDay = useMemo(
    () => (state.status === "ready" ? groupHubByDay(state.items, shown) : new Map<string, CalendarHubItem[]>()),
    [state, shown]
  );
  const dayItems = byDay.get(selected) ?? [];
  const perHour = t("jobs.perHour");
  const bonusTemplates = { hourly: t("jobs.bonusHourly"), transport: t("jobs.bonusTransport"), oneTime: t("jobs.bonusOneTime") };

  return (
    <ScreenContainer testID="jobs-calendar-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Card>
            <Heading>{t("jobs.title")}</Heading>
            <BodyText>{t("jobs.intro")}</BodyText>
            {transport && onOpenSearch ? (
              <View style={styles.topAction}>
                <Button label={t("jobs.searchByPostal")} onPress={onOpenSearch} variant="secondary" />
              </View>
            ) : null}
            {transport && onOpenOffers ? (
              <View style={styles.topAction}>
                <Button label={t("hub.myOffers")} onPress={onOpenOffers} variant="secondary" />
              </View>
            ) : null}
          </Card>

          {state.status === "ready" ? (
            <Card testID="hub-today">
              <Text style={[styles.todayTitle, rtlText(isRtl)]}>{t("hub.today")}</Text>
              {state.today.length === 0 ? <SmallText>{t("hub.todayEmpty")}</SmallText> : null}
              {state.today.map((item, i) => (
                <View
                  key={`${item.type}-${item.refId ?? item.jobRequestId ?? ""}-${i}`}
                  style={[styles.todayItem, styles[`today_${item.severity}`]]}
                  testID="hub-today-item"
                >
                  <Text style={[styles.todayItemTitle, rtlText(isRtl)]}>{item.title}</Text>
                  {item.detail ? <Text style={[styles.todayItemDetail, rtlText(isRtl)]}>{item.detail}</Text> : null}
                  {item.startAt ? (
                    <Pressable
                      onPress={() => goToDay(new Date(item.startAt ?? ""))}
                      accessibilityRole="button"
                      style={styles.todayGo}
                    >
                      <Text style={styles.todayGoText}>{t("hub.showDay")}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </Card>
          ) : null}

          {message ? (
            <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.banner, styles[`${message.tone}Banner`]]} testID="jobs-message">
              <Text style={[styles.bannerText, rtlText(isRtl)]}>{t(message.key)}</Text>
              {message.reasons.map((reason) => (
                <Text key={reason} style={[styles.bannerReason, rtlText(isRtl)]}>{`• ${reason}`}</Text>
              ))}
              {message.key === "jobs.msg.assigned" && onOpenSchedule ? (
                <View style={styles.topAction}>
                  <Button label={t("hub.openSchedule")} onPress={onOpenSchedule} variant="secondary" />
                </View>
              ) : null}
              {message.key === "jobs.msg.ineligible" && onOpenSetup ? (
                <View style={styles.topAction}>
                  <Button label={t("jobs.openSetup")} onPress={onOpenSetup} />
                </View>
              ) : null}
            </View>
          ) : null}

          <View accessibilityLabel={t("hub.filters")} style={styles.chips}>
            {HUB_LAYERS.map((layer) => {
              const on = shown[layer];
              return (
                <Pressable
                  onPress={() => setShown((prev) => ({ ...prev, [layer]: !prev[layer] }))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  key={layer}
                  style={[styles.chip, on ? styles.chipOn : null]}
                  testID={`hub-chip-${layer}`}
                >
                  <View style={[styles.chipDot, { backgroundColor: LAYER_COLOR[layer] }]} />
                  <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{t(`hub.layer.${layer}`)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Card>
            <View style={styles.monthBar}>
              <Pressable
                onPress={() => changeMonth(-1)}
                accessibilityLabel={t("jobs.prevMonth")}
                accessibilityRole="button"
                style={styles.navBtn}
                testID="jobs-prev"
              >
                <Heading>{isRtl ? "›" : "‹"}</Heading>
              </Pressable>
              <Heading>{monthTitle(view.year, view.month, locale)}</Heading>
              <Pressable
                onPress={() => goToDay(new Date())}
                accessibilityRole="button"
                style={styles.todayBtn}
                testID="hub-today-button"
              >
                <Text style={styles.todayBtnText}>{t("hub.todayButton")}</Text>
              </Pressable>
              <Pressable
                onPress={() => changeMonth(1)}
                accessibilityLabel={t("jobs.nextMonth")}
                accessibilityRole="button"
                style={styles.navBtn}
                testID="jobs-next"
              >
                <Heading>{isRtl ? "‹" : "›"}</Heading>
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {weekdayNames(locale).map((w, i) => (
                <View key={`${w}-${i}`} style={styles.weekHeadCell}>
                  <SmallText>{w}</SmallText>
                </View>
              ))}
            </View>

            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((cell) => {
                  const summary = summarizeHubDay(byDay.get(cell.iso) ?? []);
                  const parts = [dayNumber(cell.date, locale)];
                  if (summary.available > 0) parts.push(t("jobs.countLabel").replace("{n}", String(summary.available)));
                  if (summary.bonus) parts.push(t("jobs.bonusDay"));
                  if (summary.shift) parts.push(t("hub.dayShift"));
                  if (summary.pay) parts.push(t("hub.dayPay"));
                  if (summary.cancelled) parts.push(t("hub.dayCancelled"));
                  const dayLabel = parts.join(" · ");
                  const isSelected = cell.iso === selected;
                  const isToday = cell.iso === todayIso;
                  return (
                    <Pressable
                      onPress={() => {
                        setSelected(cell.iso);
                        setConfirmingId(null);
                      }}
                      accessibilityLabel={dayLabel}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={cell.iso}
                      style={[
                        styles.dayCell,
                        summary.shift ? styles.dayShift : null,
                        isToday ? styles.dayToday : null,
                        isSelected ? styles.daySelected : null
                      ]}
                      testID={`jobs-day-${cell.iso}`}
                    >
                      <Text style={[styles.dayText, !cell.inMonth ? styles.dayTextOut : null, isToday ? styles.dayTextToday : null]}>
                        {dayNumber(cell.date, locale)}
                      </Text>
                      {summary.bonus ? <Text style={styles.dayStar}>★</Text> : null}
                      <View style={styles.marks}>
                        {summary.available > 0 ? (
                          <View style={styles.countBadge}>
                            <Text style={styles.countText}>{summary.available}</Text>
                          </View>
                        ) : null}
                        {summary.shift ? <View style={[styles.dot, { backgroundColor: GREEN }]} /> : null}
                        {summary.pay ? (
                          <View style={styles.payChip}>
                            <Text style={styles.payChipText}>$</Text>
                          </View>
                        ) : null}
                        {summary.cancelled ? <View style={[styles.dot, { backgroundColor: RED }]} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}

            <View accessibilityLabel={t("hub.legend.title")} style={styles.legend} testID="hub-legend">
              <View style={styles.legendRow}>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>2</Text>
                </View>
                <SmallText>{t("hub.legend.available")}</SmallText>
              </View>
              <View style={styles.legendRow}>
                <Text style={styles.legendStar}>★</Text>
                <SmallText>{t("hub.legend.bonus")}</SmallText>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: GREEN }]} />
                <SmallText>{t("hub.legend.shift")}</SmallText>
              </View>
              <View style={styles.legendRow}>
                <View style={styles.payChip}>
                  <Text style={styles.payChipText}>$</Text>
                </View>
                <SmallText>{t("hub.legend.pay")}</SmallText>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: RED }]} />
                <SmallText>{t("hub.legend.cancelled")}</SmallText>
              </View>
            </View>
          </Card>

          {state.status === "loading" ? <LoadingState label={t("jobs.loading")} /> : null}

          {state.status === "denied" ? (
            <Card>
              <BodyText>{t("jobs.signIn")}</BodyText>
            </Card>
          ) : null}

          {state.status === "offline" || state.status === "error" ? (
            <Card>
              <BodyText>{t(state.status === "offline" ? "jobs.msg.offline" : "jobs.loadError")}</BodyText>
              <View style={styles.topAction}>
                <Button label={t("jobs.retry")} onPress={reload} variant="secondary" />
              </View>
            </Card>
          ) : null}

          {state.status === "ready" && dayItems.length === 0 ? (
            <Card>
              <SmallText>{t("jobs.noJobs")}</SmallText>
            </Card>
          ) : null}

          {state.status === "ready"
            ? dayItems.map((item) => {
                const layer = hubLayer(item.type);
                if (!layer) return null;
                const time = formatHubTime(item.startAt, item.endAt, locale);

                if (layer === "shift") {
                  return (
                    <Card key={item.id} testID="hub-card-shift">
                      <KindPill color={GREEN} label={`✓ ${t("hub.kind.shift")} · ${t(hubStatusKey("shift", item.status, SHIFT_STATUSES))}`} />
                      <Heading>{item.title}</Heading>
                      {item.subtitle ? <BodyText>{item.subtitle}</BodyText> : null}
                      <SmallText>{time}</SmallText>
                      {onOpenSchedule ? (
                        <View style={styles.topAction}>
                          <Button label={t("hub.openSchedule")} onPress={onOpenSchedule} variant="secondary" />
                        </View>
                      ) : null}
                      <ContactShiftLink item={item} onContact={onContactAboutShift} />
                    </Card>
                  );
                }

                if (layer === "pay") {
                  return (
                    <Card key={item.id} testID="hub-card-pay">
                      <KindPill color={CREAM} label={`$ ${t("hub.kind.pay")} · ${t(hubStatusKey("pay", item.status, PAY_STATUSES))}`} />
                      <Heading>{item.title}</Heading>
                      {item.subtitle ? <BodyText>{item.subtitle}</BodyText> : null}
                      {item.amountMinor !== null ? <Text style={styles.amount}>{formatMoney(item.amountMinor, locale)}</Text> : null}
                      {onOpenPay ? (
                        <View style={styles.topAction}>
                          <Button label={t("hub.openPay")} onPress={onOpenPay} variant="secondary" />
                        </View>
                      ) : null}
                    </Card>
                  );
                }

                if (layer === "cancelled") {
                  return (
                    <Card key={item.id} testID="hub-card-cancelled">
                      <KindPill color={RED} label={`✕ ${t("hub.kind.cancelled")}`} />
                      <Text style={[styles.struckTitle, rtlText(isRtl)]}>{item.title}</Text>
                      {item.subtitle ? <Text style={[styles.struck, rtlText(isRtl)]}>{item.subtitle}</Text> : null}
                      <Text style={[styles.struck, rtlText(isRtl)]}>{time}</Text>
                      <Text style={[styles.cancelNote, rtlText(isRtl)]}>{t("hub.cancelledNote")}</Text>
                      <ContactShiftLink item={item} onContact={onContactAboutShift} />
                    </Card>
                  );
                }

                // Open job to accept.
                const jobId = item.jobRequestId;
                const rate = formatHourlyRate(item.amountMinor, locale, perHour);
                const confirming = jobId !== null && confirmingId === jobId;
                const claiming = jobId !== null && claimingId === jobId;
                const bonus = formatBonus(item.bonus, locale, bonusTemplates);
                return (
                  <Card key={item.id} testID="jobs-card">
                    <KindPill color={GOLD} label={t("hub.kind.available")} />
                    <Heading>{item.title}</Heading>
                    {item.subtitle ? <BodyText>{item.subtitle}</BodyText> : null}
                    <SmallText>{time}</SmallText>
                    <View style={styles.metaRow}>
                      {rate ? <Text style={styles.rate}>{rate}</Text> : null}
                      {bonus ? (
                        <View style={styles.bonusPill} testID="jobs-bonus">
                          <Text style={styles.bonusText}>{`★ ${bonus}`}</Text>
                        </View>
                      ) : null}
                      {item.placesLeft !== null ? (
                        <SmallText>{placesLeftLabel(item.placesLeft, t("jobs.placeLeft"), t("jobs.placesLeft"))}</SmallText>
                      ) : null}
                    </View>
                    {jobId === null ? null : confirming ? (
                      <View style={styles.confirmBox} testID="jobs-confirm">
                        <Text style={[styles.confirmTitle, rtlText(isRtl)]}>{t("jobs.confirmTitle")}</Text>
                        <SmallText>{t("jobs.confirmBody")}</SmallText>
                        <View style={styles.confirmRow}>
                          <Button disabled={claiming} label={t("jobs.confirmYes")} onPress={() => void accept(jobId)} />
                          <Button disabled={claiming} label={t("jobs.cancel")} onPress={() => setConfirmingId(null)} variant="secondary" />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.topAction}>
                        <Button
                          disabled={claimingId !== null}
                          label={t("jobs.accept")}
                          onPress={() => {
                            setMessage(null);
                            setConfirmingId(jobId);
                          }}
                        />
                      </View>
                    )}
                  </Card>
                );
              })
            : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// Small "Contact Joblop about this shift" link on the worker's own (or cancelled) shift cards.
function ContactShiftLink({ item, onContact }: { item: CalendarHubItem; onContact?: ((draft: ContactDraft) => void) | undefined }) {
  const { t, locale } = useLocale();
  if (!onContact) return null;
  // Only my_shift / cancelled_shift carry the worker's own assignment id in refId.
  const ownShift = item.type === "my_shift" || item.type === "cancelled_shift";
  if (!ownShift) return null;
  return (
    <Pressable
      onPress={() => onContact(shiftDraft(item, locale, t("contact.shiftPrefill")))}
      accessibilityRole="button"
      style={styles.contactLink}
      testID="hub-contact-shift"
    >
      <Text style={styles.contactLinkText}>{t("contact.aboutShift")}</Text>
    </Pressable>
  );
}

function KindPill({ color, label }: { color: string; label: string }) {
  return (
    <View style={[styles.kindPill, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.kindText}>{label}</Text>
    </View>
  );
}

function rtlText(isRtl: boolean) {
  return isRtl ? styles.rtl : null;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  stack: { gap: spacing.md, paddingBottom: spacing.xxl },
  topAction: { marginTop: spacing.sm },
  todayTitle: { color: GOLD, fontSize: typography.body, fontWeight: "800", marginBottom: spacing.xs },
  todayItem: { borderLeftWidth: 4, borderRadius: radii.sm, gap: 2, marginTop: spacing.xs, padding: spacing.sm },
  today_urgent: { backgroundColor: "#2a1312", borderLeftColor: RED },
  today_attention: { backgroundColor: "#241c08", borderLeftColor: GOLD },
  today_info: { backgroundColor: "#1a1814", borderLeftColor: CREAM },
  todayItemTitle: { color: colors.text, fontSize: typography.body, fontWeight: "700" },
  todayItemDetail: { color: colors.muted, fontSize: typography.small },
  todayGo: { alignSelf: "flex-start", marginTop: spacing.xs, paddingVertical: spacing.xs },
  todayGoText: { color: GOLD, fontSize: typography.small, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    alignItems: "center",
    borderColor: GREY,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: spacing.md
  },
  chipOn: { backgroundColor: CREAM, borderColor: CREAM },
  chipText: { color: colors.muted, fontSize: typography.small, fontWeight: "700" },
  chipTextOn: { color: "#000000" },
  chipDot: { borderColor: GREY, borderRadius: 5, borderWidth: 1, height: 10, width: 10 },
  monthBar: { alignItems: "center", flexDirection: "row", gap: spacing.xs, justifyContent: "space-between", marginBottom: spacing.sm },
  navBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  todayBtn: { borderColor: GOLD, borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  todayBtnText: { color: GOLD, fontSize: typography.small, fontWeight: "700" },
  weekRow: { flexDirection: "row" },
  weekHeadCell: { alignItems: "center", flex: 1, paddingVertical: spacing.xs },
  dayCell: {
    alignItems: "center",
    aspectRatio: 1,
    borderColor: "transparent",
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    justifyContent: "center",
    margin: 1
  },
  dayShift: { borderBottomColor: GREEN, borderBottomWidth: 3 },
  dayToday: { borderColor: GOLD, borderWidth: 2 },
  daySelected: { backgroundColor: colors.cream },
  dayText: { color: colors.text, fontSize: typography.small, fontWeight: "600" },
  dayTextOut: { color: colors.muted, opacity: 0.5 },
  dayTextToday: { color: GOLD, fontWeight: "800" },
  marks: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 2, justifyContent: "center", minHeight: 16 },
  countBadge: {
    alignItems: "center",
    backgroundColor: GOLD,
    borderRadius: 8,
    height: 16,
    justifyContent: "center",
    minWidth: 16,
    paddingHorizontal: 3
  },
  countText: { color: "#000000", fontSize: 10, fontWeight: "800" },
  dot: { borderRadius: 4, height: 8, width: 8 },
  payChip: { alignItems: "center", backgroundColor: CREAM, borderRadius: 3, height: 14, justifyContent: "center", minWidth: 12, paddingHorizontal: 2 },
  payChipText: { color: "#000000", fontSize: 9, fontWeight: "800" },
  dayStar: { color: GOLD, fontSize: 10, position: "absolute", right: 3, top: 1 },
  legend: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing.xs, marginTop: spacing.sm, paddingTop: spacing.sm },
  legendRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  legendStar: { color: GOLD, fontSize: typography.body, width: 16 },
  kindPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  kindText: { color: colors.text, fontSize: typography.small, fontWeight: "700" },
  struckTitle: { color: RED, fontSize: typography.body, fontWeight: "800", textDecorationLine: "line-through" },
  struck: { color: RED, fontSize: typography.small, textDecorationLine: "line-through" },
  cancelNote: { color: RED, fontSize: typography.small, fontWeight: "800", marginTop: spacing.xs },
  amount: { color: CREAM, fontSize: 22, fontWeight: "800", marginTop: spacing.xs },
  bonusPill: { backgroundColor: GOLD, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  bonusText: { color: "#000000", fontSize: typography.small, fontWeight: "800" },
  metaRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  rate: { color: GOLD, fontSize: typography.body, fontWeight: "800" },
  confirmBox: {
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.md
  },
  confirmTitle: { color: colors.text, fontSize: typography.body, fontWeight: "800" },
  confirmRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  banner: { borderRadius: radii.md, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  successBanner: { backgroundColor: "#0f1f15", borderColor: colors.success },
  warningBanner: { backgroundColor: colors.cream, borderColor: colors.warning },
  dangerBanner: { backgroundColor: "#241110", borderColor: colors.danger },
  bannerText: { color: colors.text, fontSize: typography.body, fontWeight: "800" },
  bannerReason: { color: colors.muted, fontSize: typography.small },
  contactLink: { alignSelf: "flex-start", marginTop: spacing.sm, paddingVertical: spacing.xs },
  contactLinkText: { color: GOLD, fontSize: typography.small, fontWeight: "700", textDecorationLine: "underline" },
  rtl: { textAlign: "right", writingDirection: "rtl" }
});
