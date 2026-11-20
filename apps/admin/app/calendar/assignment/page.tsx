import { adminAssignmentVisibility, adminCalendarBoundaries } from "../adminCalendarContent";
import type { PageText } from "../../i18n/pageTextCore";
import { serverPageText } from "../../i18n/serverPageText";
import { calendarText } from "../text";

// This page's copy stays beside it: tests/integration/authenticated-calendar-ui.test.ts reads this
// file and checks for the English wording. The fixture values themselves stay as they are.
const assignmentTextEn = {
  eyebrow: "Connected calendar / Admin assignment",
  title: "Operational assignment visibility",
  persistedLede: (request: string) =>
    `Request ${request} is persisted, but assignment-read persistence is not connected in this phase. No fixture assignment is substituted.`,
  fixtureLede:
    "Full fixture operational status for authorized administrators. This projection cannot mutate Assignment or begin Attendance.",
  back: "Back to request review",
  persistenceTitle: "Assignment persistence boundary",
  persistenceCopy:
    "Unavailable until a separately authorized role-scoped assignment read endpoint exists.",
  attendanceTitle: "Attendance boundary",
  attendanceCopy:
    "Handoff only. No attendance, timesheet, payroll, or payment execution is available.",
  authority: (value: string) => `Authority: ${value}`,
  execution: (value: string) => `Execution: ${value}`,
  // Headings for the fixture fields; unknown keys fall back to the spaced-out key name.
  fieldLabels: {} as Record<string, string>
};

const assignmentText = {
  en: assignmentTextEn,
  fr: {
    eyebrow: "Calendrier connecté / Attribution (administration)",
    title: "État opérationnel de l’attribution",
    persistedLede: (request: string) =>
      `La demande ${request} est enregistrée, mais la lecture des attributions n’est pas encore reliée à cette étape. Aucune attribution fictive ne la remplace.`,
    fixtureLede:
      "État opérationnel fictif complet pour les administrateurs autorisés. Cette vue ne peut pas modifier l’attribution ni commencer la prise des présences.",
    back: "Retour à la révision de la demande",
    persistenceTitle: "Limite de l’enregistrement des attributions",
    persistenceCopy:
      "Non disponible tant qu’un point d’accès distinct et autorisé pour lire les attributions n’existe pas.",
    attendanceTitle: "Limite des présences",
    attendanceCopy:
      "Transfert seulement. Aucune présence, feuille de temps, paie ni aucun paiement ne peut être effectué.",
    authority: (value: string) => `Autorité : ${value}`,
    execution: (value: string) => `Exécution : ${value}`,
    fieldLabels: {
      assignmentId: "ID de l’attribution",
      requestId: "ID de la demande",
      status: "Statut",
      workerDisplayName: "Nom affiché du travailleur",
      roleLabel: "Poste",
      operationalStatus: "État opérationnel",
      clientVisibility: "Visible par le client",
      workerVisibility: "Visible par le travailleur"
    }
  },
  ar: {
    eyebrow: "التقويم المتصل / إسناد الإدارة",
    title: "الحالة التشغيلية للإسناد",
    persistedLede: (request: string) =>
      `الطلب ${request} محفوظ، لكن قراءة سجلات الإسناد غير مرتبطة في هذه المرحلة. لا يُستبدل بأي إسناد تجريبي.`,
    fixtureLede:
      "حالة تشغيلية تجريبية كاملة للمسؤولين المصرّح لهم. لا يمكن لهذا العرض تعديل الإسناد أو بدء تسجيل الحضور.",
    back: "العودة إلى مراجعة الطلب",
    persistenceTitle: "حدود حفظ الإسناد",
    persistenceCopy: "غير متاح حتى يتوفر منفذ منفصل ومصرّح به لقراءة سجلات الإسناد.",
    attendanceTitle: "حدود الحضور",
    attendanceCopy: "تسليم فقط. لا يتوفر تنفيذ الحضور أو سجلات الدوام أو الرواتب أو المدفوعات.",
    authority: (value: string) => `الصلاحية: ${value}`,
    execution: (value: string) => `التنفيذ: ${value}`,
    fieldLabels: {
      assignmentId: "معرّف الإسناد",
      requestId: "معرّف الطلب",
      status: "الحالة",
      workerDisplayName: "اسم العامل المعروض",
      roleLabel: "الوظيفة",
      operationalStatus: "الحالة التشغيلية",
      clientVisibility: "ما يراه العميل",
      workerVisibility: "ما يراه العامل"
    }
  }
} satisfies PageText<typeof assignmentTextEn>;

export default async function AdminCalendarAssignmentPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ request?: string }> }>) {
  const request = (await searchParams).request ?? null;
  const t = await serverPageText(assignmentText);
  const boundaries = (await serverPageText(calendarText)).boundaries;
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>{t.eyebrow}</p>
        <h1 style={styles.title}>{t.title}</h1>
        <p style={styles.lede}>
          {request ? t.persistedLede(request) : t.fixtureLede}
        </p>
        <a href={request ? `/calendar/request?request=${encodeURIComponent(request)}` : "/calendar/request"} style={styles.button}>{t.back}</a>
      </header>
      {request ? <section style={styles.grid}>
        <article style={styles.card}>
          <strong>{t.persistenceTitle}</strong>
          <p>{t.persistenceCopy}</p>
        </article>
        <article style={styles.card}>
          <strong>{t.attendanceTitle}</strong>
          <p>{t.attendanceCopy}</p>
        </article>
      </section> : <section style={styles.grid}>
        {Object.entries(adminAssignmentVisibility)
          .filter(([key]) => key !== "attendance")
          .map(([label, value]) => (
            <article key={label} style={styles.card}>
              <strong>{t.fieldLabels[label] ?? label.replaceAll(/([A-Z])/g, " $1")}</strong>
              <p>{String(value)}</p>
            </article>
          ))}
        <article style={styles.card}>
          <strong>{t.attendanceTitle}</strong>
          <p>{t.authority(adminAssignmentVisibility.attendance.authority)}</p>
          <p>{t.execution(adminAssignmentVisibility.attendance.execution)}</p>
        </article>
      </section>}
      {!request ? <section style={styles.grid}>
        {adminCalendarBoundaries.map((boundary, index) => (
          <article key={boundary} style={styles.card}>{boundaries[index] ?? boundary}</article>
        ))}
      </section> : null}
    </main>
  );
}

const styles = {
  page: { background: "#000000", color: "#f4efe4", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  hero: { background: "#000000", color: "#fff", padding: "48px clamp(18px, 5vw, 64px)" },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(36px, 5vw, 58px)", margin: "8px 0" },
  lede: { color: "#faf6ec", fontSize: 18, lineHeight: 1.6, maxWidth: 820 },
  button: { alignItems: "center", background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.3)", borderRadius: 8, color: "#f4efe4", display: "inline-flex", fontWeight: 800, marginTop: 12, minHeight: 44, padding: "0 16px", textDecoration: "none" },
  grid: { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", padding: "28px clamp(18px, 5vw, 64px) 0" },
  card: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 12, padding: 20 }
} as const;
