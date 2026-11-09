import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  PUBLIC_LANDING_COPY,
  calendarDayKey,
  currentCalendarMonth,
  groupPublicJobsByDay,
  publicCalendarDayTitle,
  publicCalendarJobTime,
  publicCalendarMonthTitle,
  publicCalendarWeekdays,
  publicCalendarWeeks,
  publicCalendarWindow,
  parsePayOfferedView,
  publicCountLabel,
  shiftCalendarMonth,
  type PublicCalendarJob
} from "@rwos/shared";
import type { MobileSessionTransport } from "../../auth/secureSession";
import { formatJobPay } from "../marketplace/marketplaceContent";

// Signed-out first screen, "available jobs calendar" (same as the website's PublicJobsCalendar): a
// month of Joblop's open jobs, public with no account. Each day shows its count; tapping a day lists
// its jobs (role, city and province, time, places left, the worker's own pay). Tapping a job opens
// Create account, like every job card on this screen. It loads on its own: nothing above delays it.

type Load = { status: "loading" } | { status: "ready"; jobs: readonly PublicCalendarJob[] } | { status: "offline" | "error" };

const MONTHS_AHEAD = 2;

const c = {
  panel: "#0b0906",
  cream: "#f4efe4",
  heading: "#fbf7ee",
  sub: "#cabfa8",
  muted: "#b3a894",
  gold: "#f8b808",
  goldLine: "rgba(248, 184, 8, 0.25)",
  goldEdge: "rgba(248, 184, 8, 0.45)",
  goldWash: "rgba(248, 184, 8, 0.1)",
  ink: "#111111",
  meta: "#5c5547",
  places: "#7a5600"
} as const;

export function PublicJobsCalendar({
  transport,
  lang,
  isRtl,
  onOpenJob,
  onCreateAccount
}: {
  transport: MobileSessionTransport | null;
  lang: "en" | "fr" | "ar";
  isRtl: boolean;
  onOpenJob: (job: PublicCalendarJob) => void;
  onCreateAccount: () => void;
}) {
  const t = PUBLIC_LANDING_COPY[lang];
  const today = useMemo(() => currentCalendarMonth(), []);
  const todayKey = useMemo(() => calendarDayKey(new Date()), []);
  const [view, setView] = useState(today);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [selected, setSelected] = useState<string | null>(null);

  const fetchMonth = useCallback(
    async (year: number, month: number) => {
      setLoad({ status: "loading" });
      if (!transport) return setLoad({ status: "error" });
      const result = await transport.listPublicCalendarJobs(publicCalendarWindow(year, month));
      setLoad(result.status === "ready" ? { status: "ready", jobs: result.jobs } : { status: result.status });
    },
    [transport]
  );

  useEffect(() => {
    void fetchMonth(view.year, view.month);
  }, [fetchMonth, view]);

  const byDay = useMemo(() => (load.status === "ready" ? groupPublicJobsByDay(load.jobs) : new Map<string, PublicCalendarJob[]>()), [load]);
  const weeks = useMemo(() => publicCalendarWeeks(view.year, view.month), [view]);
  const weekdays = useMemo(() => publicCalendarWeekdays(lang), [lang]);
  const monthHasJobs = weeks.some((w) => w.some((cell) => cell.inMonth && (byDay.get(cell.key)?.length ?? 0) > 0));

  // Open on the first day with jobs, like the website.
  useEffect(() => {
    if (load.status !== "ready") return;
    const first = weeks.flat().find((cell) => cell.inMonth && (byDay.get(cell.key)?.length ?? 0) > 0);
    setSelected(first?.key ?? null);
  }, [load, weeks, byDay]);

  const isFirstMonth = view.year === today.year && view.month === today.month;
  const last = shiftCalendarMonth(today.year, today.month, MONTHS_AHEAD);
  const isLastMonth = view.year === last.year && view.month === last.month;
  const dayJobs = selected ? (byDay.get(selected) ?? []) : [];
  const rtl = isRtl ? styles.rtl : null;
  const row = isRtl ? styles.rowRtl : styles.row;
  const arrow = isRtl ? "←" : "→";

  return (
    <View style={styles.panel} testID="public-section-calendar">
      <Text style={[styles.eyebrow, rtl]}>{t.calendarEyebrow.toUpperCase()}</Text>
      <Text accessibilityRole="header" style={[styles.title, rtl]}>{t.calendarTitle}</Text>
      <Text style={[styles.sub, rtl]}>{t.calendarSub}</Text>

      <View style={[styles.head, row]}>
        <Pressable
          accessibilityLabel={t.prevMonth}
          accessibilityRole="button"
          disabled={isFirstMonth}
          onPress={() => setView(shiftCalendarMonth(view.year, view.month, -1))}
          style={[styles.nav, isFirstMonth ? styles.navOff : null]}
        >
          <Text style={styles.navText}>{isRtl ? "›" : "‹"}</Text>
        </Pressable>
        <Text accessibilityLiveRegion="polite" style={styles.month}>{publicCalendarMonthTitle(view.year, view.month, lang)}</Text>
        <Pressable
          accessibilityLabel={t.nextMonth}
          accessibilityRole="button"
          disabled={isLastMonth}
          onPress={() => setView(shiftCalendarMonth(view.year, view.month, 1))}
          style={[styles.nav, isLastMonth ? styles.navOff : null]}
        >
          <Text style={styles.navText}>{isRtl ? "‹" : "›"}</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        <View style={row}>
          {weekdays.map((d) => (
            <Text key={d} style={styles.weekday}>{d}</Text>
          ))}
        </View>
        {weeks.map((week) => (
          <View key={week[0]!.key} style={row}>
            {week.map((cell) => {
              const count = cell.inMonth ? (byDay.get(cell.key)?.length ?? 0) : 0;
              const on = selected === cell.key;
              const hasJobs = count > 0;
              const dayLabel = hasJobs
                ? `${publicCalendarDayTitle(cell.key, lang)}: ${publicCountLabel(count, t.dayJobsOne, t.dayJobsMany)}`
                : publicCalendarDayTitle(cell.key, lang);
              const dayStyle = [styles.day, !cell.inMonth ? styles.dayOut : null, hasJobs ? styles.dayHas : null, on ? styles.dayOn : null];
              return (
                <Pressable
                  key={cell.key}
                  onPress={() => setSelected(cell.key)}
                  disabled={!cell.inMonth}
                  accessibilityLabel={dayLabel}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: !cell.inMonth }}
                  style={dayStyle}
                >
                  <Text style={[styles.dayNum, count > 0 ? styles.dayNumHas : null, on ? styles.dayNumOn : null, cell.key === todayKey ? styles.today : null]}>
                    {cell.day}
                  </Text>
                  {count > 0 ? (
                    <Text style={[styles.count, on ? styles.countOn : null]}>{count}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {load.status === "loading" ? (
        <View style={[styles.noteRow, row]}>
          <ActivityIndicator color={c.gold} size="small" />
          <Text style={[styles.note, rtl]}>{t.loading}</Text>
        </View>
      ) : null}
      {load.status === "offline" || load.status === "error" ? (
        <View accessibilityRole="alert">
          <Text style={[styles.note, rtl]}>{t.loadError}</Text>
          <Pressable accessibilityRole="button" onPress={() => void fetchMonth(view.year, view.month)} style={styles.smallOutline}>
            <Text style={styles.smallOutlineText}>{t.retry}</Text>
          </Pressable>
        </View>
      ) : null}
      {load.status === "ready" && !monthHasJobs ? (
        <View style={styles.empty} testID="public-calendar-empty">
          <Text style={[styles.emptyText, rtl]}>{t.empty}</Text>
          <Pressable accessibilityRole="button" onPress={onCreateAccount} style={styles.goldButton}>
            <Text style={styles.goldButtonText}>{t.createAccount}</Text>
          </Pressable>
        </View>
      ) : null}

      {load.status === "ready" && monthHasJobs ? (
        selected ? (
          <View accessibilityLiveRegion="polite" style={styles.list}>
            <Text style={[styles.dayTitle, rtl]}>
              {publicCalendarDayTitle(selected, lang)}
              {dayJobs.length > 0 ? <Text style={styles.dayCount}>{` · ${publicCountLabel(dayJobs.length, t.dayJobsOne, t.dayJobsMany)}`}</Text> : null}
            </Text>
            {dayJobs.length === 0 ? <Text style={[styles.note, rtl]}>{t.noJobsThatDay}</Text> : null}
            {dayJobs.map((job) => (
              <Pressable
                key={job.jobCode}
                accessibilityRole="button"
                onPress={() => onOpenJob(job)}
                style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
                testID={`public-calendar-job-${job.jobCode}`}
              >
                <Text style={[styles.cardTitle, rtl]}>{job.role}</Text>
                <Text style={[styles.meta, rtl]}>{`📍 ${job.areaLabel}`}</Text>
                <Text style={[styles.meta, rtl]}>{`🕒 ${publicCalendarJobTime(job, lang)}`}</Text>
                <Text style={[styles.meta, rtl]}>
                  {formatJobPay({ workerRateMinor: job.workerRateMinor, currency: job.currency ?? "CAD", payOffered: parsePayOfferedView(job.payOffered) }, lang)}
                </Text>
                <View style={[styles.foot, row]}>
                  <Text style={styles.places}>{publicCountLabel(job.placesLeft, t.placesOne, t.placesMany)}</Text>
                  <Text style={styles.open}>{`${t.seeJob} ${arrow}`}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={[styles.note, rtl]}>{t.pickDay}</Text>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: c.panel, borderColor: c.goldLine, borderRadius: 20, borderWidth: 1, padding: 18 },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  row: { flexDirection: "row" },
  rowRtl: { flexDirection: "row-reverse" },
  eyebrow: { color: c.gold, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: c.heading, fontSize: 24, fontWeight: "800", lineHeight: 30, marginTop: 6 },
  sub: { color: c.sub, fontSize: 15, lineHeight: 21, marginBottom: 12, marginTop: 4 },
  head: { alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  nav: { alignItems: "center", borderColor: c.goldEdge, borderRadius: 999, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  navOff: { opacity: 0.35 },
  navText: { color: c.gold, fontSize: 22, fontWeight: "800" },
  month: { color: c.heading, fontSize: 18, fontWeight: "800", textTransform: "capitalize" },
  grid: { gap: 4 },
  weekday: { color: c.muted, flex: 1, fontSize: 11, fontWeight: "700", textAlign: "center" },
  day: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    justifyContent: "center",
    margin: 2,
    minHeight: 46
  },
  dayOut: { opacity: 0.25 },
  dayHas: { borderColor: c.goldEdge },
  dayOn: { backgroundColor: c.gold, borderColor: c.gold },
  dayNum: { color: c.sub, fontSize: 13, fontWeight: "700" },
  dayNumHas: { color: c.heading },
  dayNumOn: { color: c.ink },
  today: { textDecorationLine: "underline" },
  count: { backgroundColor: c.gold, borderRadius: 999, color: c.ink, fontSize: 11, fontWeight: "800", minWidth: 20, overflow: "hidden", paddingHorizontal: 5, textAlign: "center" },
  countOn: { backgroundColor: c.ink, color: c.gold },
  noteRow: { alignItems: "center", gap: 8, marginTop: 12 },
  note: { color: c.sub, fontSize: 15, lineHeight: 21, marginTop: 12 },
  smallOutline: { alignItems: "center", alignSelf: "flex-start", borderColor: c.gold, borderRadius: 999, borderWidth: 1.5, justifyContent: "center", marginTop: 10, minHeight: 44, paddingHorizontal: 18 },
  smallOutlineText: { color: c.gold, fontSize: 15, fontWeight: "800" },
  empty: { backgroundColor: c.goldWash, borderRadius: 12, gap: 12, marginTop: 14, padding: 14 },
  emptyText: { color: c.cream, fontSize: 15, lineHeight: 21 },
  goldButton: { alignItems: "center", backgroundColor: c.gold, borderRadius: 12, justifyContent: "center", minHeight: 50, paddingHorizontal: 18 },
  goldButtonText: { color: c.ink, fontSize: 16, fontWeight: "800", textAlign: "center" },
  list: { gap: 10, marginTop: 14 },
  dayTitle: { color: c.heading, fontSize: 16, fontWeight: "800", textTransform: "capitalize" },
  dayCount: { color: c.gold, textTransform: "none" },
  card: { backgroundColor: "#ffffff", borderColor: c.gold, borderRadius: 14, borderWidth: 2, gap: 5, padding: 14 },
  cardPressed: { opacity: 0.9 },
  cardTitle: { color: c.ink, fontSize: 15, fontWeight: "800" },
  meta: { color: c.meta, fontSize: 13 },
  foot: { alignItems: "center", gap: 8, justifyContent: "space-between", marginTop: 2 },
  places: { color: c.places, flexShrink: 1, fontSize: 14, fontWeight: "700" },
  open: { color: c.ink, fontSize: 14, fontWeight: "700" }
});
