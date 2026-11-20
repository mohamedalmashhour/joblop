import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "../../theme";
import type { MobileSessionTransport, WorkerAttendanceRecord } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, ErrorState, Heading, LoadingState, ScreenContainer, SmallText } from "../../ui/primitives";
import { useLocale } from "../../i18n/LocaleContext";
import { attendanceStatusLabel, attendanceStatusTone } from "../worker-attendance/attendanceScheduleContent";
import { formatShiftWindow } from "../marketplace/marketplaceContent";
import { JobLocationLink } from "../maps";
import { addMonths, buildMonthWeeks, dayNumber, isoDay, monthTitle, weekdayNames } from "./monthGrid";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; byDay: Map<string, WorkerAttendanceRecord[]> }
  | { status: "denied" | "error" };

// The worker's monthly calendar — the screen they land on. A month grid of their shifts (from
// attendance), tap a day to see that day's shifts. Localized month/weekday names via Intl; Arabic
// renders right-to-left (the grid rows reverse under the page direction).
export function MonthCalendarScreen({
  transport,
  onOpenOffers,
  onOpenJob
}: {
  transport: MobileSessionTransport | null;
  onOpenOffers?: () => void;
  /** Opens a booked shift's page (the job screen: details, address, Check in / Check out). */
  onOpenJob?: (jobRequestId: string) => void;
}) {
  const { t, locale } = useLocale();
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(isoDay(today));
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!transport) {
      setState({ status: "denied" });
      return;
    }
    let active = true;
    void transport.workerAttendance().then((result) => {
      if (!active) return;
      if (result.status === "ready") {
        const byDay = new Map<string, WorkerAttendanceRecord[]>();
        for (const r of result.data) {
          const key = isoDay(new Date(r.scheduledStartAt));
          const list = byDay.get(key) ?? [];
          list.push(r);
          byDay.set(key, list);
        }
        setState({ status: "ready", byDay });
      } else if (result.status === "denied") {
        setState({ status: "denied" });
      } else {
        setState({ status: "ready", byDay: new Map() }); // empty/error → empty month, not a hard error
      }
    });
    return () => {
      active = false;
    };
  }, [transport]);

  const weeks = useMemo(() => buildMonthWeeks(view.year, view.month), [view]);
  const byDay = state.status === "ready" ? state.byDay : new Map<string, WorkerAttendanceRecord[]>();
  const todayIso = isoDay(today);
  const selectedShifts = byDay.get(selected) ?? [];

  return (
    <ScreenContainer testID="month-calendar-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <>
              {transport && onOpenOffers ? <Button label={t("calendar.offers")} onPress={onOpenOffers} /> : null}
              <Card>
                <View style={styles.monthBar}>
                  <Pressable accessibilityRole="button" onPress={() => setView((v) => addMonths(v.year, v.month, -1))} style={styles.navBtn} testID="cal-prev">
                    <Heading>‹</Heading>
                  </Pressable>
                  <Heading>{monthTitle(view.year, view.month, locale)}</Heading>
                  <Pressable accessibilityRole="button" onPress={() => setView((v) => addMonths(v.year, v.month, 1))} style={styles.navBtn} testID="cal-next">
                    <Heading>›</Heading>
                  </Pressable>
                </View>

                <View style={styles.weekRow}>
                  {weekdayNames(locale).map((w, i) => (
                    <View key={`${w}-${i}`} style={styles.weekHeadCell}>
                      <SmallText>{w}</SmallText>
                    </View>
                  ))}
                </View>

                {state.status === "loading" ? <LoadingState label="…" /> : null}

                {weeks.map((week, wi) => (
                  <View key={wi} style={styles.weekRow}>
                    {week.map((cell) => {
                      const has = (byDay.get(cell.iso)?.length ?? 0) > 0;
                      const isSelected = cell.iso === selected;
                      const isToday = cell.iso === todayIso;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          key={cell.iso}
                          onPress={() => setSelected(cell.iso)}
                          style={[styles.dayCell, isSelected ? styles.daySelected : null, isToday ? styles.dayToday : null]}
                          testID={`cal-day-${cell.iso}`}
                        >
                          <SmallText>{cell.inMonth ? dayNumber(cell.date, locale) : ""}</SmallText>
                          {has && cell.inMonth ? <View style={styles.dot} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </Card>

              {state.status === "error" ? <ErrorState title="…" body={t("calendar.loadError")} /> : null}

              <View style={styles.dayList}>
                {!transport ? (
                  <Card>
                    <BodyText>{t("calendar.signIn")}</BodyText>
                  </Card>
                ) : selectedShifts.length === 0 ? (
                  <Card>
                    <SmallText>{t("calendar.noShifts")}</SmallText>
                  </Card>
                ) : (
                  selectedShifts.map((r) => (
                    <Card key={r.attendanceRecordId} testID="cal-shift">
                      <View style={styles.row}>
                        <Heading>{r.employerName}</Heading>
                        <Badge label={attendanceStatusLabel(r.status)} tone={attendanceStatusTone(r.status)} />
                      </View>
                      <SmallText>{formatShiftWindow(r.scheduledStartAt, r.scheduledEndAt)}</SmallText>
                      <JobLocationLink address={r.areaLabel} />
                      {onOpenJob && r.jobRequestId && r.status !== "cancelled" ? (
                        <Button label={t("sched.openShift")} onPress={() => onOpenJob(r.jobRequestId!)} testID="cal-open-shift" />
                      ) : null}
                    </Card>
                  ))
                )}
              </View>
            </>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  stack: { gap: spacing.md, paddingBottom: spacing.xxl },
  monthBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  navBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  weekRow: { flexDirection: "row" },
  weekHeadCell: { alignItems: "center", flex: 1, paddingVertical: spacing.xs },
  dayCell: {
    alignItems: "center",
    aspectRatio: 1,
    borderRadius: radii.sm,
    flex: 1,
    gap: 2,
    justifyContent: "center",
    margin: 1,
    paddingVertical: spacing.xs
  },
  daySelected: { backgroundColor: colors.surfaceSubtle, borderColor: colors.deepTeal, borderWidth: 2 },
  dayToday: { backgroundColor: colors.surfaceSubtle },
  dot: { backgroundColor: colors.actionTeal, borderRadius: 4, height: 7, width: 7 },
  dayList: { gap: spacing.sm },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }
});
