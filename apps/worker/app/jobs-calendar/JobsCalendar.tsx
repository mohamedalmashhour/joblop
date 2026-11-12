"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { calendarDayKey, formatRwosCurrency } from "@rwos/shared";
import { useLocale, useT } from "../i18n/LocaleProvider";
import { payOfferedLabel } from "../payOfferedLabel";
import { shiftOverlapNotice } from "../shiftOverlapNotice";
import { nearestDayWithJobs } from "../calendarDays";
import { accountHref } from "../authScroll";
import { JoblopJobBadge } from "../JobSourceBadge";
import { shiftPageHref } from "../shiftPage";

// "My calendar" hub: one calendar that shows the worker everything with a date on it —
// open Joblop jobs they can accept (bonus ★), their confirmed shifts, cancelled shifts and pay
// days — plus a "Today" panel of things that need attention now. The server is authoritative for
// every item and for the claim itself; this component only displays and asks.

type Bonus = Readonly<{ kind: string; amountMinor: number }>;

type HubItem = Readonly<{
  id: string;
  type: string;
  startAt: string;
  endAt: string | null;
  title: string;
  subtitle: string | null;
  status: string | null;
  amountMinor: number | null;
  bonus: Bonus | null;
  placesLeft: number | null;
  placesAsked: number | null;
  placesTaken: number | null;
  jobRequestId: string | null;
  refId: string | null;
  // Long-term listing only: the pay the employer offers and pays directly (no Joblop hourly rate).
  payOffered?: unknown;
}>;

type TodayItem = Readonly<{
  type: string;
  title: string;
  detail: string | null;
  severity: "info" | "attention" | "urgent";
  startAt: string | null;
  jobRequestId: string | null;
  refId: string | null;
}>;

type Layer = "available" | "shift" | "pay" | "cancelled";
const LAYERS: readonly Layer[] = ["available", "shift", "pay", "cancelled"];

function layerOf(type: string): Layer | null {
  if (type === "available_job") return "available";
  if (type === "my_shift") return "shift";
  if (type === "pay_day") return "pay";
  if (type === "cancelled_shift") return "cancelled";
  return null;
}

type Lang = "en" | "fr" | "ar";

type Notice =
  | { kind: "accepted" }
  | { kind: "taken" }
  | { kind: "election" }
  | { kind: "ineligible"; reasons: string[] }
  // Already holding a shift at that time; the message names it (from the API, in EN / FR / AR).
  | { kind: "overlap"; message: string }
  | { kind: "error" };

const TEXT = {
  en: {
    title: "My calendar",
    sub: "Everything in one place: jobs you can accept, your shifts, pay days and cancellations. Tap a day to see it.",
    prev: "Previous month",
    next: "Next month",
    today: "Today",
    todayTitle: "Today",
    todayEmpty: "Nothing needs your attention right now.",
    showDay: "Show this day",
    loading: "Loading your calendar…",
    loadError: "We could not load your calendar. Please try again.",
    retry: "Try again",
    signedOut: "Create a free account to see your calendar",
    signedOutCta: "Create my free account",
    pickDay: "Tap a day to see what is on it.",
    nothingDay: "Nothing on this day.",
    nothingMonth: "Nothing on your calendar this month yet. Check the next month or come back soon.",
    itemsOn: (n: number, day: string) => (n === 1 ? `1 item on ${day}` : `${n} items on ${day}`),
    dayCount: (n: number) => (n === 1 ? "1 job to accept" : `${n} jobs to accept`),
    dayShift: "you work",
    dayPay: "pay day",
    dayCancelled: "cancelled shift",
    places: (n: number) => (n === 1 ? "1 place left" : `${n} places left`),
    perHour: (amount: string) => `${amount}/h`,
    money: (amount: string) => amount,
    payLocale: "en-CA",
    paidByEmployer: "paid directly by the employer",
    employerPaysDirectly: "Pay set and paid directly by the employer",
    payPending: "Hourly pay: confirmed before you're offered the shift",
    bonusHourly: (amount: string) => `+ ${amount}/h bonus`,
    bonusTransport: (amount: string) => `+ ${amount} transport`,
    bonusOneTime: (amount: string) => `+ ${amount} bonus`,
    bonusDay: "has a bonus job",
    layers: { available: "Available", shift: "My shifts", pay: "Pay", cancelled: "Cancelled" } as Record<Layer, string>,
    filterLabel: "Show on the calendar",
    legendTitle: "Legend",
    legend: {
      available: "Jobs you can accept (number = how many)",
      bonus: "Job with a bonus",
      shift: "My confirmed shift",
      pay: "Pay day",
      cancelled: "Cancelled shift"
    },
    kind: { available: "Job to accept", shift: "My shift", pay: "Pay day", cancelled: "Cancelled" } as Record<Layer, string>,
    shiftStatus: {
      pending_start: "Confirmed",
      checked_in: "Checked in",
      checked_out: "Checked out",
      completed: "Completed",
      missed: "Missed",
      exception: "Needs review",
      other: "Confirmed"
    } as Record<string, string>,
    payStatus: { scheduled: "Scheduled", sent: "Sent", paid: "Paid", held: "On hold", other: "Planned" } as Record<string, string>,
    cancelledStatus: "This shift was cancelled.",
    openShift: "Open this shift",
    openPay: "Open my pay",
    accept: "Accept this job",
    accepting: "Accepting…",
    details: "View details",
    confirmTitle: "Accept this job?",
    confirmBody: "It will be added to your schedule and the employer will be told.",
    confirmYes: "Yes, accept",
    confirmNo: "Cancel",
    accepted: "Job accepted! It is in your schedule.",
    goSchedule: "Open my schedule",
    taken: "Sorry, this job was just taken.",
    election: "Before you take a job, choose and sign your pay agreement.",
    ineligibleIntro: "You can't accept this job right now:",
    finishSetup: "Finish setting up",
    seeOffers: "See my offers",
    error: "Something went wrong. Please try again.",
    reasons: {
      already_assigned: "You already have this job.",
      active_offer_exists: "You already have an offer for this job.",
      worker_schedule_conflict: "You already have another shift at that time.",
      not_a_worker: "Your worker profile is not set up yet.",
      worker_inactive: "Your worker account is not active yet.",
      job_not_open: "This job is no longer open.",
      job_not_found: "This job is no longer available.",
      other: "This job is not available for you."
    } as Record<string, string>
  },
  fr: {
    title: "Mon calendrier",
    sub: "Tout au même endroit : les emplois à accepter, vos quarts, vos jours de paie et les annulations. Touchez une journée pour la voir.",
    prev: "Mois précédent",
    next: "Mois suivant",
    today: "Aujourd’hui",
    todayTitle: "Aujourd’hui",
    todayEmpty: "Rien ne demande votre attention pour le moment.",
    showDay: "Voir cette journée",
    loading: "Chargement de votre calendrier…",
    loadError: "Impossible de charger votre calendrier. Veuillez réessayer.",
    retry: "Réessayer",
    signedOut: "Créez un compte gratuit pour voir votre calendrier",
    signedOutCta: "Créer mon compte gratuit",
    pickDay: "Touchez une journée pour voir ce qu’il y a.",
    nothingDay: "Rien cette journée.",
    nothingMonth: "Rien dans votre calendrier ce mois-ci pour l’instant. Regardez le mois suivant ou revenez bientôt.",
    itemsOn: (n: number, day: string) => (n === 1 ? `1 élément le ${day}` : `${n} éléments le ${day}`),
    dayCount: (n: number) => (n === 1 ? "1 emploi à accepter" : `${n} emplois à accepter`),
    dayShift: "vous travaillez",
    dayPay: "jour de paie",
    dayCancelled: "quart annulé",
    places: (n: number) => (n === 1 ? "1 place restante" : `${n} places restantes`),
    perHour: (amount: string) => `${amount}/h`,
    money: (amount: string) => amount,
    payLocale: "fr-CA",
    paidByEmployer: "payé directement par l'employeur",
    employerPaysDirectly: "Salaire fixé et payé directement par l'employeur",
    payPending: "Salaire horaire : confirmé avant qu'on vous offre le quart",
    bonusHourly: (amount: string) => `+ ${amount}/h de prime`,
    bonusTransport: (amount: string) => `+ ${amount} transport`,
    bonusOneTime: (amount: string) => `+ ${amount} de prime`,
    bonusDay: "emploi avec prime",
    layers: { available: "Disponibles", shift: "Mes quarts", pay: "Paie", cancelled: "Annulés" } as Record<Layer, string>,
    filterLabel: "Afficher dans le calendrier",
    legendTitle: "Légende",
    legend: {
      available: "Emplois à accepter (nombre = combien)",
      bonus: "Emploi avec prime",
      shift: "Mon quart confirmé",
      pay: "Jour de paie",
      cancelled: "Quart annulé"
    },
    kind: { available: "Emploi à accepter", shift: "Mon quart", pay: "Jour de paie", cancelled: "Annulé" } as Record<Layer, string>,
    shiftStatus: {
      pending_start: "Confirmé",
      checked_in: "Arrivée enregistrée",
      checked_out: "Départ enregistré",
      completed: "Terminé",
      missed: "Manqué",
      exception: "À vérifier",
      other: "Confirmé"
    } as Record<string, string>,
    payStatus: { scheduled: "Prévu", sent: "Envoyé", paid: "Payé", held: "En attente", other: "Prévu" } as Record<string, string>,
    cancelledStatus: "Ce quart a été annulé.",
    openShift: "Ouvrir ce quart",
    openPay: "Ouvrir ma paie",
    accept: "Accepter cet emploi",
    accepting: "Acceptation…",
    details: "Voir les détails",
    confirmTitle: "Accepter cet emploi?",
    confirmBody: "Il sera ajouté à votre horaire et l’employeur sera avisé.",
    confirmYes: "Oui, accepter",
    confirmNo: "Annuler",
    accepted: "Emploi accepté! Il est dans votre horaire.",
    goSchedule: "Ouvrir mon horaire",
    taken: "Désolé, cet emploi vient d’être pris.",
    election: "Avant de prendre un emploi, choisissez et signez votre entente de paie.",
    ineligibleIntro: "Vous ne pouvez pas accepter cet emploi pour le moment :",
    finishSetup: "Terminer mon inscription",
    seeOffers: "Voir mes offres",
    error: "Une erreur est survenue. Veuillez réessayer.",
    reasons: {
      already_assigned: "Vous avez déjà cet emploi.",
      active_offer_exists: "Vous avez déjà une offre pour cet emploi.",
      worker_schedule_conflict: "Vous avez déjà un autre quart à cette heure-là.",
      not_a_worker: "Votre profil de travailleur n’est pas encore configuré.",
      worker_inactive: "Votre compte de travailleur n’est pas encore actif.",
      job_not_open: "Cet emploi n’est plus ouvert.",
      job_not_found: "Cet emploi n’est plus disponible.",
      other: "Cet emploi n’est pas disponible pour vous."
    } as Record<string, string>
  },
  ar: {
    title: "تقويمي",
    sub: "كل شيء في مكان واحد: وظائف يمكنك قبولها، نوباتك، أيام الدفع والإلغاءات. اضغط على يوم لتراه.",
    prev: "الشهر السابق",
    next: "الشهر التالي",
    today: "اليوم",
    todayTitle: "اليوم",
    todayEmpty: "لا شيء يحتاج انتباهك الآن.",
    showDay: "اعرض هذا اليوم",
    loading: "جارٍ تحميل تقويمك…",
    loadError: "تعذّر تحميل تقويمك. حاول مرة أخرى.",
    retry: "حاول مرة أخرى",
    signedOut: "أنشئ حسابًا مجانيًا لترى تقويمك",
    signedOutCta: "أنشئ حسابي المجاني",
    pickDay: "اضغط على يوم لترى ما فيه.",
    nothingDay: "لا شيء في هذا اليوم.",
    nothingMonth: "لا شيء في تقويمك هذا الشهر بعد. انظر الشهر التالي أو عد قريبًا.",
    itemsOn: (n: number, day: string) => (n === 1 ? `عنصر واحد يوم ${day}` : `${n} عناصر يوم ${day}`),
    dayCount: (n: number) => (n === 1 ? "وظيفة واحدة للقبول" : `${n} وظائف للقبول`),
    dayShift: "لديك نوبة",
    dayPay: "يوم دفع",
    dayCancelled: "نوبة ملغاة",
    places: (n: number) => (n === 1 ? "بقي مكان واحد" : `بقي ${n} أماكن`),
    perHour: (amount: string) => `${amount} / ساعة`,
    money: (amount: string) => amount,
    payLocale: "en-CA",
    paidByEmployer: "يدفعه صاحب العمل مباشرة",
    employerPaysDirectly: "يحدد صاحب العمل الأجر ويدفعه مباشرة",
    payPending: "الأجر بالساعة: يُؤكَّد قبل أن تُعرض عليك المناوبة",
    bonusHourly: (amount: string) => `+ ${amount} مكافأة في الساعة`,
    bonusTransport: (amount: string) => `+ ${amount} للمواصلات`,
    bonusOneTime: (amount: string) => `+ ${amount} مكافأة`,
    bonusDay: "فيه وظيفة بمكافأة",
    layers: { available: "المتاحة", shift: "نوباتي", pay: "الدفع", cancelled: "الملغاة" } as Record<Layer, string>,
    filterLabel: "اعرض في التقويم",
    legendTitle: "دليل الرموز",
    legend: {
      available: "وظائف يمكنك قبولها (الرقم = عددها)",
      bonus: "وظيفة بمكافأة",
      shift: "نوبتي المؤكدة",
      pay: "يوم الدفع",
      cancelled: "نوبة ملغاة"
    },
    kind: { available: "وظيفة للقبول", shift: "نوبتي", pay: "يوم الدفع", cancelled: "ملغاة" } as Record<Layer, string>,
    shiftStatus: {
      pending_start: "مؤكدة",
      checked_in: "تم تسجيل الحضور",
      checked_out: "تم تسجيل الانصراف",
      completed: "مكتملة",
      missed: "فائتة",
      exception: "بحاجة إلى مراجعة",
      other: "مؤكدة"
    } as Record<string, string>,
    payStatus: { scheduled: "مجدول", sent: "مُرسل", paid: "مدفوع", held: "معلّق", other: "مخطط" } as Record<string, string>,
    cancelledStatus: "أُلغيت هذه النوبة.",
    openShift: "افتح هذه المناوبة",
    openPay: "افتح أجري",
    accept: "اقبل هذه الوظيفة",
    accepting: "جارٍ القبول…",
    details: "عرض التفاصيل",
    confirmTitle: "هل تقبل هذه الوظيفة؟",
    confirmBody: "ستُضاف إلى جدولك وسيتم إبلاغ صاحب العمل.",
    confirmYes: "نعم، أقبل",
    confirmNo: "إلغاء",
    accepted: "تم قبول الوظيفة! إنها في جدولك.",
    goSchedule: "افتح جدولي",
    taken: "عذرًا، أُخذت هذه الوظيفة للتو.",
    election: "قبل أن تأخذ وظيفة، اختر ووقّع اتفاقية الدفع الخاصة بك.",
    ineligibleIntro: "لا يمكنك قبول هذه الوظيفة الآن:",
    finishSetup: "أكمل التسجيل",
    seeOffers: "عرض عروضي",
    error: "حدث خطأ. حاول مرة أخرى.",
    reasons: {
      already_assigned: "لديك هذه الوظيفة بالفعل.",
      active_offer_exists: "لديك عرض لهذه الوظيفة بالفعل.",
      worker_schedule_conflict: "لديك نوبة أخرى في نفس الوقت.",
      not_a_worker: "ملفك كعامل غير مكتمل بعد.",
      worker_inactive: "حسابك كعامل غير مفعّل بعد.",
      job_not_open: "هذه الوظيفة لم تعد مفتوحة.",
      job_not_found: "هذه الوظيفة لم تعد متاحة.",
      other: "هذه الوظيفة غير متاحة لك."
    } as Record<string, string>
  }
};

type Text = (typeof TEXT)[Lang];

const ONBOARDING_REASONS = new Set(["not_a_worker", "worker_inactive"]);

function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function intlLocale(lang: Lang): string {
  return lang === "ar" ? "ar-u-nu-latn" : lang === "fr" ? "fr-CA" : "en-CA";
}

function hasBonus(item: HubItem): boolean {
  return item.type === "available_job" && Boolean(item.bonus && item.bonus.amountMinor > 0);
}

function bonusLabel(item: HubItem, t: Text): string | null {
  if (!item.bonus || !(item.bonus.amountMinor > 0)) return null;
  const amount = formatAmount(item.bonus.amountMinor, t.payLocale);
  if (item.bonus.kind === "hourly") return t.bonusHourly(amount);
  if (item.bonus.kind === "transport") return t.bonusTransport(amount);
  return t.bonusOneTime(amount);
}

/** Money in the screen's money locale: "$1,234.50" (English and Arabic) or "1 234,50 $" (French). */
export function formatAmount(minor: number, payLocale: string): string {
  return formatRwosCurrency(minor / 100, "CAD", { locale: payLocale });
}

// Monday-first grid: leading blanks, then each day of the month.
function monthCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isHubItem(value: unknown): value is HubItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.type === "string" && typeof v.startAt === "string" && typeof v.title === "string";
}

function isTodayItem(value: unknown): value is TodayItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.title === "string" && typeof v.type === "string";
}

export function JobsCalendar() {
  const locale = useLocale();
  const lang: Lang = locale === "ar" ? "ar" : locale.startsWith("fr") ? "fr" : "en";
  const t = TEXT[lang];
  const tr = useT();
  const loc = intlLocale(lang);

  // "Today" is the Québec day, like the jobs on the calendar.
  const [todayKey] = useState(() => calendarDayKey(new Date()));
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(() => dayKey(new Date()));
  const [status, setStatus] = useState<"loading" | "ready" | "signed_out" | "error">("loading");
  const [items, setItems] = useState<HubItem[]>([]);
  const [todayItems, setTodayItems] = useState<TodayItem[]>([]);
  const [shown, setShown] = useState<Record<Layer, boolean>>({ available: true, shift: true, pay: true, cancelled: true });
  const [reloadTick, setReloadTick] = useState(0);
  const [confirming, setConfirming] = useState<HubItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notices, setNotices] = useState<Record<string, Notice>>({});
  const [banner, setBanner] = useState<Notice | null>(null);

  const reload = useCallback(() => setReloadTick((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    const from = new Date(view.year, view.month, 1);
    const to = new Date(view.year, view.month + 1, 1);
    const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    if (reloadTick === 0) setStatus("loading");
    fetch(`/api/calendar-hub?${qs.toString()}`, { cache: "no-store" })
      .then(async (r) => {
        if (!active) return;
        if (r.status === 401) return setStatus("signed_out");
        if (!r.ok) return setStatus("error");
        const body = (await r.json()) as { items?: unknown; today?: unknown };
        if (!active) return;
        const list = Array.isArray(body.items) ? body.items.filter(isHubItem) : [];
        // An open job with no place left can't be accepted, so it is not shown.
        setItems(list.filter((i) => i.type !== "available_job" || (i.placesLeft ?? 0) > 0));
        setTodayItems(Array.isArray(body.today) ? body.today.filter(isTodayItem) : []);
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [view, reloadTick]);

  const byDay = useMemo(() => {
    const map = new Map<string, HubItem[]>();
    for (const item of items) {
      const layer = layerOf(item.type);
      if (!layer || !shown[layer]) continue;
      // Each shift sits on its Québec (America/Toronto) day, whatever the device's time zone.
      const key = calendarDayKey(item.startAt);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.startAt.localeCompare(b.startAt));
    return map;
  }, [items, shown]);

  const cells = useMemo(() => monthCells(view.year, view.month), [view]);
  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(loc, { weekday: "narrow" });
    // 2024-01-01 is a Monday.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
  }, [loc]);
  const monthLabel = new Intl.DateTimeFormat(loc, { month: "long", year: "numeric" }).format(
    new Date(view.year, view.month, 1)
  );

  const goToDate = useCallback(
    (d: Date, selectKey?: string) => {
      const now = new Date();
      const isCurrentMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      const sameView = d.getFullYear() === view.year && d.getMonth() === view.month;
      if (!sameView) {
        setView({ year: d.getFullYear(), month: d.getMonth() });
        setStatus("loading");
      }
      setSelected(selectKey ?? dayKey(isCurrentMonth ? now : d));
      setBanner(null);
    },
    [view]
  );

  const changeMonth = (delta: number) => goToDate(new Date(view.year, view.month + delta, 1));
  const goToday = () => goToDate(new Date(), dayKey(new Date()));

  const timeFmt = useMemo(() => new Intl.DateTimeFormat(loc, { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" }), [loc]);
  // For a shift's own start (an instant), in Québec time; dayFmt stays for the grid's calendar days.
  const shiftDayFmt = useMemo(() => new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long", timeZone: "America/Toronto" }), [loc]);
  const dayFmt = useMemo(() => new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long" }), [loc]);

  const timeRange = (item: HubItem) =>
    item.endAt
      ? `${timeFmt.format(new Date(item.startAt))} – ${timeFmt.format(new Date(item.endAt))}`
      : timeFmt.format(new Date(item.startAt));

  const accept = useCallback(
    async (item: HubItem) => {
      const jobId = item.jobRequestId;
      if (!jobId) return;
      setConfirming(null);
      setBusyId(item.id);
      setBanner(null);
      let notice: Notice;
      try {
        const r = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/claim`, { method: "POST" });
        const body = (await r.json().catch(() => ({}))) as { error?: string; reasons?: unknown };
        const overlap = r.status === 409 ? shiftOverlapNotice(body, locale) : null;
        if (overlap) {
          notice = { kind: "overlap", message: overlap };
        } else if (r.status === 201) {
          notice = { kind: "accepted" };
          setItems((current) => current.filter((i) => i.id !== item.id));
          setBanner(notice);
        } else if (r.status === 409 && body.error === "RWOS_CLASSIFICATION_ELECTION_REQUIRED") {
          notice = { kind: "election" };
        } else if (r.status === 409 || r.status === 404) {
          notice = { kind: "taken" };
          setItems((current) => current.filter((i) => i.id !== item.id));
          setBanner(notice);
        } else if (r.status === 401) {
          setStatus("signed_out");
          return;
        } else if (r.status === 422) {
          const reasons = Array.isArray(body.reasons) ? body.reasons.filter((x): x is string => typeof x === "string") : [];
          notice = { kind: "ineligible", reasons };
        } else {
          notice = { kind: "error" };
        }
      } catch {
        notice = { kind: "error" };
      } finally {
        setBusyId(null);
      }
      setNotices((prev) => ({ ...prev, [item.id]: notice }));
      if (notice.kind === "accepted" || notice.kind === "taken") reload();
    },
    [reload, locale]
  );

  // Close the confirm dialog with Escape.
  useEffect(() => {
    if (!confirming) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirming(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming]);

  const selectedItems = selected ? byDay.get(selected) ?? [] : [];
  const selectedDate = selected ? new Date(`${selected}T12:00:00`) : null;
  const visibleCount = Array.from(byDay.values()).reduce((n, list) => n + list.length, 0);
  // A chosen day with no open job: point to the nearest day this month that has one.
  const jobDays = Array.from(byDay.entries())
    .filter(([, list]) => list.some((x) => x.type === "available_job"))
    .map(([key]) => key);
  const selectedHasJobs = selectedItems.some((x) => x.type === "available_job");
  const nearestJobDay = selected && !selectedHasJobs ? nearestDayWithJobs(jobDays, selected) : null;

  return (
    <section className="jc" aria-labelledby="jc-title">
      <style>{STYLES}</style>
      <h1 id="jc-title" className="jc-title">{t.title}</h1>
      <p className="jc-sub">{t.sub}</p>

      {status === "signed_out" ? (
        <div className="jc-panel">
          <p>{t.signedOut}</p>
          <a className="jc-btn" href={accountHref("signin")}>{t.signedOutCta}</a>
        </div>
      ) : (
        <>
          {status === "ready" ? (
            <div className="jc-todaybox" aria-labelledby="jc-today-title">
              <h2 id="jc-today-title" className="jc-today-title">{t.todayTitle}</h2>
              {todayItems.length === 0 ? <p className="jc-today-empty">{t.todayEmpty}</p> : null}
              {todayItems.length > 0 ? (
                <ul className="jc-today-list">
                  {todayItems.map((item, i) => (
                    <li key={`${item.type}-${item.refId ?? item.jobRequestId ?? i}-${i}`} className={`jc-ti jc-ti-${item.severity}`}>
                      <div className="jc-ti-text">
                        <strong>{item.title}</strong>
                        {item.detail ? <span>{item.detail}</span> : null}
                      </div>
                      {item.startAt ? (
                        <button
                          type="button"
                          className="jc-ti-go"
                          onClick={() => {
                            const d = new Date(item.startAt as string);
                            goToDate(d, dayKey(d));
                          }}
                        >
                          {t.showDay}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {banner ? <BannerView notice={banner} t={t} onClose={() => setBanner(null)} /> : null}

          <div className="jc-chips" role="group" aria-label={t.filterLabel}>
            {LAYERS.map((layer) => (
              <button
                key={layer}
                type="button"
                className={`jc-chip jc-chip-${layer}${shown[layer] ? " jc-chip-on" : ""}`}
                aria-pressed={shown[layer]}
                onClick={() => setShown((prev) => ({ ...prev, [layer]: !prev[layer] }))}
              >
                <span className="jc-chip-dot" aria-hidden="true" />
                {t.layers[layer]}
              </button>
            ))}
          </div>

          <div className="jc-cal">
            <div className="jc-head">
              <button type="button" className="jc-nav" aria-label={t.prev} onClick={() => changeMonth(-1)}>
                <span aria-hidden="true">{lang === "ar" ? "›" : "‹"}</span>
              </button>
              <h2 className="jc-month" aria-live="polite">{monthLabel}</h2>
              <button type="button" className="jc-todaybtn" onClick={goToday}>{t.today}</button>
              <button type="button" className="jc-nav" aria-label={t.next} onClick={() => changeMonth(1)}>
                <span aria-hidden="true">{lang === "ar" ? "‹" : "›"}</span>
              </button>
            </div>
            <div className="jc-grid">
              {weekdays.map((w, i) => (
                <div key={`w${i}`} className="jc-wd" aria-hidden="true">{w}</div>
              ))}
              {cells.map((date, i) => {
                if (!date) return <div key={`b${i}`} className="jc-cell jc-blank" aria-hidden="true" />;
                const key = dayKey(date);
                const dayItems = byDay.get(key) ?? [];
                const count = dayItems.filter((x) => x.type === "available_job").length;
                const dayHasBonus = dayItems.some(hasBonus);
                const hasShift = dayItems.some((x) => x.type === "my_shift");
                const hasPay = dayItems.some((x) => x.type === "pay_day");
                const hasCancelled = dayItems.some((x) => x.type === "cancelled_shift");
                const isToday = key === todayKey;
                const isPast = key < todayKey;
                const isSelected = key === selected;
                const cls = [
                  "jc-cell",
                  isToday ? "jc-today" : "",
                  isPast ? "jc-past" : "",
                  isSelected ? "jc-selected" : "",
                  hasShift ? "jc-has-shift" : ""
                ].join(" ");
                const label = [
                  dayFmt.format(date),
                  count > 0 ? t.dayCount(count) : "",
                  dayHasBonus ? t.bonusDay : "",
                  hasShift ? t.dayShift : "",
                  hasPay ? t.dayPay : "",
                  hasCancelled ? t.dayCancelled : ""
                ]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <button
                    key={key}
                    type="button"
                    className={cls}
                    aria-pressed={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={label}
                    onClick={() => {
                      setSelected(key);
                      setBanner(null);
                    }}
                  >
                    {dayHasBonus ? <span className="jc-star" aria-hidden="true">★</span> : null}
                    <span className="jc-num">{date.getDate()}</span>
                    <span className="jc-marks" aria-hidden="true">
                      {count > 0 ? <span className="jc-badge">{count}</span> : null}
                      {hasShift ? <span className="jc-dot jc-dot-shift" /> : null}
                      {hasPay ? <span className="jc-paychip">$</span> : null}
                      {hasCancelled ? <span className="jc-dot jc-dot-cancelled" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            {status === "loading" ? <p className="jc-note">{t.loading}</p> : null}
            <div className="jc-legend" aria-label={t.legendTitle}>
              <span><span className="jc-badge" aria-hidden="true">2</span> {t.legend.available}</span>
              <span><span className="jc-star-inline" aria-hidden="true">★</span> {t.legend.bonus}</span>
              <span><span className="jc-dot jc-dot-shift" aria-hidden="true" /> {t.legend.shift}</span>
              <span><span className="jc-paychip" aria-hidden="true">$</span> {t.legend.pay}</span>
              <span><span className="jc-dot jc-dot-cancelled" aria-hidden="true" /> {t.legend.cancelled}</span>
            </div>
          </div>

          {status === "error" ? (
            <div className="jc-panel" role="alert">
              <p>{t.loadError}</p>
              <button type="button" className="jc-btn" onClick={reload}>{t.retry}</button>
            </div>
          ) : null}

          {status === "ready" && visibleCount === 0 ? <p className="jc-note">{t.nothingMonth}</p> : null}

          {status === "ready" ? (
            <div className="jc-list" aria-live="polite">
              {selected && selectedDate ? (
                <>
                  <h3 className="jc-day-title">
                    {selectedItems.length > 0 ? t.itemsOn(selectedItems.length, dayFmt.format(selectedDate)) : dayFmt.format(selectedDate)}
                  </h3>
                  {!selectedHasJobs ? (
                    <div className="jc-noday">
                      <p className="jc-note">{selectedItems.length === 0 ? t.nothingDay : tr("cal.noJobsDay")}</p>
                      {nearestJobDay ? (
                        <button
                          type="button"
                          className="jc-link jc-nearest"
                          onClick={() => {
                            setSelected(nearestJobDay);
                            setBanner(null);
                          }}
                        >
                          {tr("cal.nearestDay", { day: dayFmt.format(new Date(`${nearestJobDay}T12:00:00`)) })} {lang === "ar" ? "←" : "→"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {selectedItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      t={t}
                      timeText={timeRange(item)}
                      notice={notices[item.id]}
                      busy={busyId === item.id}
                      onAccept={() => setConfirming(item)}
                    />
                  ))}
                </>
              ) : (
                <p className="jc-note">{t.pickDay}</p>
              )}
            </div>
          ) : null}
        </>
      )}

      {confirming ? (
        <div className="jc-overlay" onClick={() => setConfirming(null)}>
          <div
            className="jc-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="jc-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="jc-confirm-title">{t.confirmTitle}</h3>
            <p className="jc-dialog-job">
              <strong>{confirming.title}</strong>
              {confirming.subtitle ? <> · {confirming.subtitle}</> : null}
              <br />
              <bdi>
                {shiftDayFmt.format(new Date(confirming.startAt))}, {timeRange(confirming)}
              </bdi>
            </p>
            <p>{t.confirmBody}</p>
            <div className="jc-dialog-actions">
              <button type="button" className="jc-btn-ghost" onClick={() => setConfirming(null)}>{t.confirmNo}</button>
              <button type="button" className="jc-btn" autoFocus onClick={() => void accept(confirming)}>{t.confirmYes}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ItemCard({
  item,
  t,
  timeText,
  notice,
  busy,
  onAccept
}: {
  item: HubItem;
  t: Text;
  timeText: string;
  notice: Notice | undefined;
  busy: boolean;
  onAccept: () => void;
}) {
  const layer = layerOf(item.type);
  if (!layer) return null;

  if (layer === "available") {
    const bonus = bonusLabel(item, t);
    return (
      <article className="jc-card jc-card-available">
        <JoblopJobBadge />
        <span className="jc-kind jc-kind-available">{t.kind.available}</span>
        <h4 className="jc-role">{item.title}</h4>
        {item.subtitle ? <p className="jc-meta">📍 {item.subtitle}</p> : null}
        <p className="jc-meta">🕒 <bdi>{timeText}</bdi></p>
        <div className="jc-facts">
          {item.payOffered !== undefined ? (
            <span className="jc-pay"><bdi>{payOfferedLabel(item.payOffered, t.payLocale, t)}</bdi></span>
          ) : item.amountMinor !== null && item.amountMinor !== undefined && item.amountMinor > 0 ? (
            <span className="jc-pay"><bdi>{t.perHour(formatAmount(item.amountMinor, t.payLocale))}</bdi></span>
          ) : (
            <span className="jc-pay"><bdi>{t.payPending}</bdi></span>
          )}
          {bonus ? <span className="jc-bonus"><span aria-hidden="true">★ </span><bdi>{bonus}</bdi></span> : null}
          {item.placesLeft !== null ? <span className="jc-places">{t.places(item.placesLeft)}</span> : null}
        </div>
        {notice ? <NoticeView notice={notice} t={t} /> : null}
        {item.jobRequestId ? (
          <div className="jc-actions">
            <button type="button" className="jc-btn" disabled={busy} onClick={onAccept}>
              {busy ? t.accepting : t.accept}
            </button>
            <a className="jc-link" href={`/jobs/${encodeURIComponent(item.jobRequestId)}`}>{t.details}</a>
          </div>
        ) : null}
      </article>
    );
  }

  if (layer === "shift") {
    const statusText = t.shiftStatus[item.status ?? ""] ?? t.shiftStatus.other;
    return (
      <article className="jc-card jc-card-shift">
        <span className="jc-kind jc-kind-shift">✓ {t.kind.shift} · {statusText}</span>
        <h4 className="jc-role">{item.title}</h4>
        {item.subtitle ? <p className="jc-meta">📍 {item.subtitle}</p> : null}
        <p className="jc-meta">🕒 <bdi>{timeText}</bdi></p>
        <div className="jc-actions">
          {/* A booked shift opens its shift page (details, address, Check in / Check out). */}
          <a className="jc-link" href={item.jobRequestId ? shiftPageHref(item.jobRequestId) : "/schedule"}>{t.openShift}</a>
        </div>
      </article>
    );
  }

  if (layer === "pay") {
    const statusText = t.payStatus[item.status ?? ""] ?? t.payStatus.other;
    return (
      <article className="jc-card jc-card-pay">
        <span className="jc-kind jc-kind-pay">$ {t.kind.pay} · {statusText}</span>
        <h4 className="jc-role">{item.title}</h4>
        {item.subtitle ? <p className="jc-meta">{item.subtitle}</p> : null}
        {item.amountMinor !== null && item.amountMinor !== undefined ? (
          <p className="jc-amount"><bdi>{t.money(formatAmount(item.amountMinor, t.payLocale))}</bdi></p>
        ) : null}
        <div className="jc-actions">
          <a className="jc-link" href="/pay">{t.openPay}</a>
        </div>
      </article>
    );
  }

  return (
    <article className="jc-card jc-card-cancelled">
      <span className="jc-kind jc-kind-cancelled">✕ {t.kind.cancelled}</span>
      <h4 className="jc-role jc-strike">{item.title}</h4>
      {item.subtitle ? <p className="jc-meta jc-strike">📍 {item.subtitle}</p> : null}
      <p className="jc-meta jc-strike">🕒 <bdi>{timeText}</bdi></p>
      <p className="jc-cancel-reason">{t.cancelledStatus}</p>
    </article>
  );
}

function BannerView({ notice, t, onClose }: { notice: Notice; t: Text; onClose: () => void }) {
  if (notice.kind === "accepted") {
    return (
      <div className="jc-banner jc-ok" role="status">
        <span>✓ {t.accepted}</span>
        <a className="jc-banner-link" href="/schedule">{t.goSchedule}</a>
        <button type="button" className="jc-x" aria-label="×" onClick={onClose}>×</button>
      </div>
    );
  }
  if (notice.kind === "taken") {
    return (
      <div className="jc-banner jc-warn" role="status">
        <span>{t.taken}</span>
        <button type="button" className="jc-x" aria-label="×" onClick={onClose}>×</button>
      </div>
    );
  }
  return null;
}

function NoticeView({ notice, t }: { notice: Notice; t: Text }) {
  if (notice.kind === "election") {
    return (
      <div className="jc-notice" role="alert">
        <p>{t.election}</p>
        <a href="/onboarding">{t.finishSetup}</a>
      </div>
    );
  }
  if (notice.kind === "ineligible") {
    const reasons = notice.reasons.length > 0 ? notice.reasons : ["other"];
    const needsSetup = reasons.some((r) => ONBOARDING_REASONS.has(r));
    const hasOffer = reasons.includes("active_offer_exists");
    return (
      <div className="jc-notice" role="alert">
        <p>{t.ineligibleIntro}</p>
        <ul>
          {reasons.map((r) => (
            <li key={r}>{t.reasons[r] ?? t.reasons.other}</li>
          ))}
        </ul>
        {needsSetup ? <a href="/onboarding">{t.finishSetup}</a> : null}
        {hasOffer ? <a href="/offers">{t.seeOffers}</a> : null}
      </div>
    );
  }
  if (notice.kind === "overlap") {
    return (
      <div className="jc-notice" role="alert">
        <p>{notice.message}</p>
      </div>
    );
  }
  if (notice.kind === "error") {
    return (
      <div className="jc-notice" role="alert">
        <p>{t.error}</p>
      </div>
    );
  }
  return null;
}

// Shared hub colours: gold #f8b808 (available, bonus ★), green #3ddc84 (my shift),
// red #e4756b (cancelled), cream #f4efe4 ("$" pay day), grey #8f8574 (waiting). No blue or teal.
const STYLES = `
.jc { color: #f4efe4; max-width: 760px; margin: 0 auto; padding: 8px 0 40px; }
.jc-title { font-size: 1.6rem; margin: 8px 0 4px; color: #f4efe4; }
.jc-sub { margin: 0 0 16px; color: rgba(244,239,228,0.75); line-height: 1.45; }
.jc-todaybox { background: #141414; border: 1px solid rgba(248,184,8,0.45); border-radius: 16px; padding: 12px 14px; margin-bottom: 12px; }
.jc-today-title { margin: 0 0 8px; font-size: 1.1rem; color: #f8b808; }
.jc-today-empty { margin: 0; color: rgba(244,239,228,0.75); }
.jc-today-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.jc-ti { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 12px; border-inline-start: 5px solid #f4efe4; background: #f4efe4; color: #1a1a1a; }
.jc-ti-urgent { border-inline-start-color: #e4756b; background: #fbe3e0; }
.jc-ti-attention { border-inline-start-color: #f8b808; background: #fdf3d4; }
.jc-ti-info { border-inline-start-color: #8f8574; background: #f4efe4; }
.jc-ti-text { flex: 1 1 200px; display: flex; flex-direction: column; gap: 2px; font-size: 0.92rem; }
.jc-ti-text span { color: #444; }
.jc-ti-go { min-height: 36px; padding: 0 12px; border-radius: 999px; border: 1px solid #1a1a1a; background: transparent; color: #1a1a1a; font: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.jc-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.jc-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid rgba(244,239,228,0.35); background: transparent; color: rgba(244,239,228,0.7); font: inherit; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
.jc-chip-on { background: #f4efe4; color: #111; border-color: #f4efe4; }
.jc-chip:focus-visible { outline: 2px solid #f8b808; outline-offset: 2px; }
.jc-chip-dot { width: 10px; height: 10px; border-radius: 999px; background: #8f8574; }
.jc-chip-available .jc-chip-dot { background: #f8b808; }
.jc-chip-shift .jc-chip-dot { background: #3ddc84; }
.jc-chip-pay .jc-chip-dot { background: #f4efe4; border: 1px solid #8f8574; }
.jc-chip-cancelled .jc-chip-dot { background: #e4756b; }
.jc-cal { background: #141414; border: 1px solid rgba(248,184,8,0.25); border-radius: 16px; padding: 12px; }
.jc-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.jc-month { margin: 0; font-size: 1.1rem; text-transform: capitalize; color: #f4efe4; text-align: center; flex: 1; }
.jc-nav { width: 40px; height: 40px; border-radius: 999px; border: 1px solid rgba(248,184,8,0.5); background: transparent; color: #f8b808; font-size: 1.4rem; line-height: 1; cursor: pointer; }
.jc-nav:hover, .jc-nav:focus-visible { background: rgba(248,184,8,0.12); }
.jc-todaybtn { min-height: 36px; padding: 0 12px; border-radius: 999px; border: 1px solid rgba(248,184,8,0.5); background: transparent; color: #f8b808; font: inherit; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
.jc-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.jc-wd { text-align: center; font-size: 0.75rem; font-weight: 600; color: rgba(244,239,228,0.6); padding: 4px 0; }
.jc-cell { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-height: 50px; padding: 4px 0; border-radius: 10px; border: 1px solid transparent; background: rgba(255,255,255,0.04); color: #f4efe4; font: inherit; cursor: pointer; }
.jc-cell:hover, .jc-cell:focus-visible { border-color: rgba(248,184,8,0.6); outline: none; }
.jc-blank { background: transparent; cursor: default; }
.jc-num { font-size: 0.9rem; font-weight: 600; }
.jc-past { opacity: 0.45; }
.jc-today { border-color: #f8b808; }
.jc-today .jc-num { color: #f8b808; }
.jc-has-shift { box-shadow: inset 0 -3px 0 #3ddc84; }
.jc-selected { background: #f8b808; color: #111; border-color: #f8b808; opacity: 1; }
.jc-selected .jc-num { color: #111; }
.jc-marks { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 2px; min-height: 18px; }
.jc-badge { display: inline-block; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: #f8b808; color: #111; font-size: 0.7rem; font-weight: 700; line-height: 18px; text-align: center; }
.jc-selected .jc-badge { background: #111; color: #f8b808; }
.jc-dot { display: inline-block; width: 8px; height: 8px; border-radius: 999px; }
.jc-dot-shift { background: #3ddc84; }
.jc-dot-cancelled { background: #e4756b; }
.jc-selected .jc-dot { outline: 1px solid #111; }
.jc-paychip { display: inline-block; min-width: 16px; height: 16px; padding: 0 3px; border-radius: 4px; background: #f4efe4; color: #111; border: 1px solid #8f8574; font-size: 0.65rem; font-weight: 800; line-height: 14px; text-align: center; }
.jc-star { position: absolute; top: 2px; inset-inline-end: 4px; color: #f8b808; font-size: 0.75rem; line-height: 1; }
.jc-selected .jc-star { color: #111; }
.jc-star-inline { color: #f8b808; font-size: 0.95rem; }
.jc-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(244,239,228,0.12); font-size: 0.8rem; color: rgba(244,239,228,0.8); }
.jc-legend > span { display: inline-flex; align-items: center; gap: 6px; }
.jc-note { color: rgba(244,239,228,0.75); margin: 12px 0 0; }
.jc-panel { margin-top: 12px; background: #141414; border: 1px solid rgba(248,184,8,0.3); border-radius: 16px; padding: 16px; }
.jc-panel p { margin: 0 0 12px; }
.jc-list { margin-top: 16px; display: flex; flex-direction: column; gap: 12px; }
.jc-day-title { margin: 0; font-size: 1.05rem; color: #f4efe4; }
.jc-card { background: #fff; color: #1a1a1a; border-radius: 14px; padding: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.3); border-inline-start: 6px solid #8f8574; }
.jc-card-available { border-inline-start-color: #f8b808; }
.jc-card-shift { border-inline-start-color: #3ddc84; }
.jc-card-pay { border-inline-start-color: #f4efe4; background: #fbf8f1; }
.jc-card-cancelled { border-inline-start-color: #e4756b; }
.jc-kind { display: inline-block; margin-bottom: 6px; padding: 2px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
.jc-kind-available { background: #fdf3d4; color: #6b4e00; }
.jc-kind-shift { background: #e3f9ec; color: #14532d; }
.jc-kind-pay { background: #f4efe4; color: #3d3528; border: 1px solid #8f8574; }
.jc-kind-cancelled { background: #fbe3e0; color: #8a2a20; }
.jc-role { margin: 0 0 6px; font-size: 1.05rem; color: #111; }
.jc-strike { text-decoration: line-through; color: #8a2a20; }
.jc-cancel-reason { margin: 8px 0 0; color: #b03a2e; font-weight: 700; font-size: 0.92rem; }
.jc-meta { margin: 2px 0; color: #444; font-size: 0.92rem; }
.jc-amount { margin: 4px 0 0; font-size: 1.3rem; font-weight: 800; color: #111; }
.jc-facts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.jc-pay { background: #111; color: #f8b808; font-weight: 700; padding: 3px 10px; border-radius: 999px; font-size: 0.85rem; }
.jc-bonus { background: #f8b808; color: #111; font-weight: 800; padding: 3px 10px; border-radius: 999px; font-size: 0.85rem; }
.jc-places { background: #fdf3d4; color: #6b4e00; font-weight: 600; padding: 3px 10px; border-radius: 999px; font-size: 0.85rem; }
.jc-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 12px; }
.jc-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 18px; border-radius: 999px; border: 0; background: #f8b808; color: #111; font: inherit; font-weight: 700; text-decoration: none; cursor: pointer; }
.jc-btn:disabled { opacity: 0.6; cursor: wait; }
.jc-btn:focus-visible, .jc-btn-ghost:focus-visible { outline: 2px solid #f4efe4; outline-offset: 2px; }
.jc-btn-ghost { min-height: 44px; padding: 0 18px; border-radius: 999px; border: 1px solid #999; background: transparent; color: #333; font: inherit; font-weight: 600; cursor: pointer; }
.jc-link { color: #6b4e00; font-weight: 600; font-size: 0.9rem; }
.jc-noday { margin-top: 10px; padding: 12px 14px; border-radius: 12px; background: rgba(248,184,8,0.1); }
.jc-noday .jc-note { margin: 0 0 6px; font-weight: 700; color: #f4efe4; }
.jc-nearest { appearance: none; border: 0; background: none; padding: 0; cursor: pointer; font: inherit; font-weight: 800; color: #f8b808; text-decoration: underline; text-underline-offset: 3px; }
.jc-card .src-badge { margin-bottom: 6px; }
.jc-notice { margin-top: 10px; padding: 10px 12px; border-radius: 10px; background: #fff4e5; border: 1px solid #f0b46a; color: #5a3400; font-size: 0.9rem; }
.jc-notice p { margin: 0 0 4px; }
.jc-notice ul { margin: 4px 0; padding-inline-start: 20px; }
.jc-notice a { display: inline-block; margin-top: 4px; margin-inline-end: 12px; color: #5a3400; font-weight: 700; }
.jc-banner { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 12px; padding: 12px 14px; border-radius: 12px; font-weight: 600; }
.jc-ok { background: #e3f9ec; color: #14532d; }
.jc-warn { background: #fff4e5; color: #5a3400; }
.jc-banner span { flex: 1 1 200px; }
.jc-banner-link { color: inherit; font-weight: 700; }
.jc-x { background: transparent; border: 0; color: inherit; font-size: 1.3rem; line-height: 1; cursor: pointer; padding: 0 4px; }
.jc-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,0.7); }
.jc-dialog { width: 100%; max-width: 420px; background: #fff; color: #1a1a1a; border-radius: 16px; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
.jc-dialog h3 { margin: 0 0 10px; color: #111; }
.jc-dialog p { margin: 0 0 10px; line-height: 1.45; }
.jc-dialog-job { background: #f6f3ea; border-radius: 10px; padding: 10px 12px; font-size: 0.92rem; }
.jc-dialog-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
@media (min-width: 640px) {
  .jc-cell { min-height: 66px; }
  .jc-num { font-size: 1rem; }
  .jc-cal { padding: 16px; }
}
`;
