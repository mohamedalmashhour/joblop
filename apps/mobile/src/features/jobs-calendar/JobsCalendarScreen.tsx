import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../../theme";
import type { MobileSessionTransport, OpenJob } from "../../auth/secureSession";
import { BodyText, Button, Card, Heading, LoadingState, ScreenContainer, SmallText } from "../../ui/primitives";
import { useLocale } from "../../i18n/LocaleContext";
import { addMonths, buildMonthWeeks, dayNumber, isoDay, monthTitle, weekdayNames } from "../calendar-month/monthGrid";
import {
  bonusLabel,
  claimMessage,
  formatHourlyRate,
  formatJobTime,
  gridWindow,
  groupJobsByDay,
  hasBonus,
  isUrgent,
  placesLeftLabel,
  type ClaimMessage
} from "./jobsCalendarContent";

const GOLD = "#f8b808";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; byDay: Map<string, OpenJob[]> }
  | { status: "denied" | "offline" | "error" };

// The worker's "Available" tab: a month grid of REAL open Joblop jobs (GET /marketplace/open-jobs).
// Each day shows how many jobs are open; tap a day to list them and accept one (POST .../claim)
// after an inline confirm. The month reloads after every accept attempt so counts stay true.
export function JobsCalendarScreen({
  transport,
  onOpenSetup,
  onOpenSearch
}: {
  transport: MobileSessionTransport | null;
  onOpenSetup?: () => void;
  onOpenSearch?: () => void;
}) {
  const { t, locale, isRtl } = useLocale();
  const today = useMemo(() => new Date(), []);
  const todayIso = isoDay(today);
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(todayIso);
  const [state, setState] = useState<LoadState>({ status: "loading" });
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
    void transport.listOpenJobs(gridWindow(view.year, view.month)).then((result) => {
      if (seq !== requestSeq.current) return; // a newer month/reload superseded this one
      if (result.status === "ready") setState({ status: "ready", byDay: groupJobsByDay(result.jobs) });
      else setState({ status: result.status });
    });
  }, [transport, view, reloadTick]);

  const reload = useCallback(() => setReloadTick((n) => n + 1), []);

  const changeMonth = useCallback((delta: number) => {
    setView((v) => addMonths(v.year, v.month, delta));
    setConfirmingId(null);
    setState({ status: "loading" });
  }, []);

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
  const byDay = state.status === "ready" ? state.byDay : new Map<string, OpenJob[]>();
  const dayJobs = byDay.get(selected) ?? [];
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
          </Card>

          {message ? (
            <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.banner, styles[`${message.tone}Banner`]]} testID="jobs-message">
              <Text style={[styles.bannerText, rtlText(isRtl)]}>{t(message.key)}</Text>
              {message.reasons.map((reason) => (
                <Text key={reason} style={[styles.bannerReason, rtlText(isRtl)]}>{`• ${reason}`}</Text>
              ))}
              {message.key === "jobs.msg.ineligible" && onOpenSetup ? (
                <View style={styles.topAction}>
                  <Button label={t("jobs.openSetup")} onPress={onOpenSetup} />
                </View>
              ) : null}
            </View>
          ) : null}

          <Card>
            <View style={styles.monthBar}>
              <Pressable
                accessibilityLabel={t("jobs.prevMonth")}
                accessibilityRole="button"
                onPress={() => changeMonth(-1)}
                style={styles.navBtn}
                testID="jobs-prev"
              >
                <Heading>{isRtl ? "›" : "‹"}</Heading>
              </Pressable>
              <Heading>{monthTitle(view.year, view.month, locale)}</Heading>
              <Pressable
                accessibilityLabel={t("jobs.nextMonth")}
                accessibilityRole="button"
                onPress={() => changeMonth(1)}
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
                  const count = byDay.get(cell.iso)?.length ?? 0;
                  const dayHasBonus = (byDay.get(cell.iso) ?? []).some(hasBonus);
                  const dayLabel = count === 0 ? dayNumber(cell.date, locale) : `${dayNumber(cell.date, locale)} · ${t("jobs.countLabel").replace("{n}", String(count))}`;
                  const isSelected = cell.iso === selected;
                  const isToday = cell.iso === todayIso;
                  return (
                    <Pressable
                      accessibilityLabel={dayHasBonus ? `${dayLabel} · ${t("jobs.bonusDay")}` : dayLabel}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={cell.iso}
                      onPress={() => {
                        setSelected(cell.iso);
                        setConfirmingId(null);
                      }}
                      style={[styles.dayCell, isToday ? styles.dayToday : null, isSelected ? styles.daySelected : null]}
                      testID={`jobs-day-${cell.iso}`}
                    >
                      <Text style={[styles.dayText, !cell.inMonth ? styles.dayTextOut : null, isToday ? styles.dayTextToday : null]}>
                        {dayNumber(cell.date, locale)}
                      </Text>
                      {dayHasBonus ? <Text style={styles.dayStar}>★</Text> : null}
                      {count > 0 ? (
                        <View style={styles.countBadge}>
                          <Text style={styles.countText}>{count}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
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

          {state.status === "ready" && dayJobs.length === 0 ? (
            <Card>
              <SmallText>{t("jobs.noJobs")}</SmallText>
            </Card>
          ) : null}

          {state.status === "ready"
            ? dayJobs.map((job) => {
                const rate = formatHourlyRate(job.workerRateMinor, locale, perHour);
                const confirming = confirmingId === job.jobRequestId;
                const claiming = claimingId === job.jobRequestId;
                const bonus = bonusLabel(job, locale, bonusTemplates);
                return (
                  <Card key={job.jobRequestId} testID="jobs-card">
                    <View style={styles.cardHead}>
                      <Heading>{job.role}</Heading>
                      {isUrgent(job) ? (
                        <View style={styles.urgentPill}>
                          <Text style={styles.urgentText}>{t("jobs.urgent")}</Text>
                        </View>
                      ) : null}
                    </View>
                    {job.areaLabel ? <BodyText>{job.areaLabel}</BodyText> : null}
                    <SmallText>{formatJobTime(job.startAt, job.endAt, locale)}</SmallText>
                    <View style={styles.metaRow}>
                      {rate ? <Text style={styles.rate}>{rate}</Text> : null}
                      {bonus ? (
                        <View style={styles.bonusPill} testID="jobs-bonus">
                          <Text style={styles.bonusText}>{`★ ${bonus}`}</Text>
                        </View>
                      ) : null}
                      <SmallText>{placesLeftLabel(job.placesLeft, t("jobs.placeLeft"), t("jobs.placesLeft"))}</SmallText>
                    </View>
                    {confirming ? (
                      <View style={styles.confirmBox} testID="jobs-confirm">
                        <Text style={[styles.confirmTitle, rtlText(isRtl)]}>{t("jobs.confirmTitle")}</Text>
                        <SmallText>{t("jobs.confirmBody")}</SmallText>
                        <View style={styles.confirmRow}>
                          <Button
                            disabled={claiming}
                            label={t("jobs.confirmYes")}
                            onPress={() => void accept(job.jobRequestId)}
                          />
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
                            setConfirmingId(job.jobRequestId);
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

function rtlText(isRtl: boolean) {
  return isRtl ? styles.rtl : null;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  stack: { gap: spacing.md, paddingBottom: spacing.xxl },
  topAction: { marginTop: spacing.sm },
  monthBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  navBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
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
  dayToday: { borderColor: GOLD, borderWidth: 2 },
  daySelected: { backgroundColor: colors.cream },
  dayText: { color: colors.text, fontSize: typography.small, fontWeight: "600" },
  dayTextOut: { color: colors.muted, opacity: 0.5 },
  dayTextToday: { color: GOLD, fontWeight: "800" },
  countBadge: {
    alignItems: "center",
    backgroundColor: GOLD,
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 4
  },
  dayStar: { color: GOLD, fontSize: 10, position: "absolute", right: 3, top: 1 },
  bonusPill: { backgroundColor: GOLD, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  bonusText: { color: "#000000", fontSize: typography.small, fontWeight: "800" },
  countText: { color: "#000000", fontSize: 11, fontWeight: "800" },
  cardHead: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  urgentPill: { backgroundColor: colors.urgent, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  urgentText: { color: "#000000", fontSize: typography.small, fontWeight: "800" },
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
  rtl: { textAlign: "right", writingDirection: "rtl" }
});
