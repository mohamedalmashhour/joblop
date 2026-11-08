"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calendarFailureState,
  formatRwosDateTime,
  parseAdminCalendarDto,
  type AdminCalendarDto,
  type AuthenticatedViewState
} from "@rwos/shared";
import { DispatchHandoffPanel } from "./DispatchHandoffPanel";
import { JobLocationMap } from "../shared/maps";
import { usePageText, type PageText } from "../i18n/pageText";

type IntakeAction = "admin-review" | "request-information" | "approve-for-dispatch";
type ActionMessage =
  | "reasonTooShort"
  | "applying"
  | "stale"
  | "authRequired"
  | "failed"
  | "started"
  | "infoRecorded"
  | "approved"
  | "serviceUnavailable";

// This panel's copy stays beside the component: tests/integration/authenticated-calendar-ui.test.ts
// reads this file and checks for the English wording.
const reviewTextEn = {
  referenceRequiredTitle: "Request reference required",
  referenceRequiredMessage: "Open a persisted request from the authenticated administrator calendar.",
  loadingTitle: "Loading review detail",
  loadingMessage: "Checking the persisted administrator-authorized record.",
  deniedTitle: "Administrator access required",
  deniedMessage: "Return to the calendar and sign in with an authorized platform account.",
  unavailableTitle: "Review service unavailable",
  unavailableMessage: "The persisted record could not be reached. No fixture record is substituted.",
  staleTitle: "Review changed",
  staleMessage: "Refresh the persisted record before continuing.",
  errorTitle: "Review detail unavailable",
  errorMessage: "No fixture record is substituted for a persisted administrator request.",
  messages: {
    reasonTooShort: "Enter a clear reason of at least four characters.",
    applying: "Applying the governed intake transition.",
    stale: "This request changed. Load the latest review before acting again.",
    authRequired: "Administrator authorization is required.",
    failed: "The intake action could not be completed.",
    started: "Admin review started.",
    infoRecorded: "Information request recorded for the employer.",
    approved: "Request approved for the dispatch boundary.",
    serviceUnavailable: "The intake service is unavailable. No success is claimed."
  } satisfies Record<ActionMessage, string>,
  eyebrow: "Joblop / Persisted review",
  back: "Back to admin calendar",
  assignmentBoundary: "Assignment records are not connected in this admin view.",
  readinessTitle: "Request readiness",
  rows: {
    requestStatus: "Request status",
    authoritativeStatus: "Authoritative status",
    contract: "Contract",
    paymentMethod: "Payment method",
    location: "Location",
    schedule: "Schedule",
    duties: "Duties",
    qualifications: "Qualifications",
    workers: "Workers",
    addressSummary: "Address summary",
    specialInstructions: "Special instructions",
    reviewReason: "Review reason"
  },
  rawDetailsHidden: (readiness: string) => `${readiness} — raw details hidden`,
  notProvided: "Not provided",
  restrictedOrNotProvided: "Restricted or not provided",
  unavailable: "Unavailable",
  economicsTitle: "Economics separation",
  economicsCopy1:
    "Client economics and worker-offer economics are not included in this calendar persistence DTO.",
  economicsCopy2:
    "Review them only through their separate contract-authoritative sources. No raw payment secrets are available here.",
  intakeTitle: "Governed intake action",
  beginReview: "Begin admin review",
  reasonLabel: "Information request reason",
  openClaim:
    "Open for direct worker claim — eligible workers claim and are assigned instantly (first-come, up to the requested headcount). Leave unchecked to use the manual shortlist → offer path.",
  requestInformation: "Request information",
  approveOpenClaim: "Approve + open claim",
  approveForDispatch: "Approve for dispatch",
  confirmTitle: "Confirm intake transition",
  confirmSuffix: "This does not publish, assign, notify, run payroll, or execute money.",
  cancel: "Cancel",
  applyingButton: "Applying…",
  confirmAction: "Confirm action",
  loadLatest: "Load latest review",
  dispatchTitle: "Dispatch handoff",
  noticeTitle: "Review authority remains bounded",
  noticeCopy:
    "Intake actions change only the governed Job Request state. Publish, worker assignment, repricing, notification delivery, payroll, and payment execution remain separate.",
  stateSubmitted: "This submitted request is ready to begin admin review.",
  stateAdminReview:
    "Review the request, then request information or approve it for the dispatch boundary.",
  stateInformationRequired: (reason: string | null) =>
    `Waiting for employer information.${reason ? ` Reason: ${reason}` : ""}`,
  stateApproved: "Approved for the dispatch boundary. No intake action remains.",
  stateNone: "No intake action is available for this request state.",
  confirmAdminReview: "Begin human admin review for this request.",
  confirmRequestInformation: "Return this request to the employer for clarification.",
  confirmApprove: "Approve this reviewed request for the future dispatch boundary.",
  retry: "Retry"
};

const reviewText = {
  en: reviewTextEn,
  fr: {
    referenceRequiredTitle: "Référence de demande requise",
    referenceRequiredMessage:
      "Ouvrez une demande enregistrée à partir du calendrier administrateur authentifié.",
    loadingTitle: "Chargement du détail de la révision",
    loadingMessage: "Vérification du dossier enregistré autorisé pour les administrateurs.",
    deniedTitle: "Accès administrateur requis",
    deniedMessage:
      "Retournez au calendrier et connectez-vous avec un compte autorisé sur la plateforme.",
    unavailableTitle: "Service de révision non disponible",
    unavailableMessage:
      "Le dossier enregistré est inaccessible. Aucun dossier fictif ne le remplace.",
    staleTitle: "La révision a changé",
    staleMessage: "Actualisez le dossier enregistré avant de continuer.",
    errorTitle: "Détail de la révision non disponible",
    errorMessage: "Aucun dossier fictif ne remplace une demande administrateur enregistrée.",
    messages: {
      reasonTooShort: "Entrez une raison claire d’au moins quatre caractères.",
      applying: "Application du changement d’étape de l’accueil.",
      stale: "Cette demande a changé. Chargez la révision la plus récente avant d’agir de nouveau.",
      authRequired: "Une autorisation d’administrateur est requise.",
      failed: "L’action d’accueil n’a pas pu être effectuée.",
      started: "Révision par l’administration commencée.",
      infoRecorded: "Demande d’information enregistrée pour l’employeur.",
      approved: "Demande approuvée pour la répartition.",
      serviceUnavailable: "Le service d’accueil n’est pas disponible. Aucune réussite n’est confirmée."
    },
    eyebrow: "Joblop / Révision enregistrée",
    back: "Retour au calendrier administrateur",
    assignmentBoundary: "Les dossiers d’attribution ne sont pas reliés à cette vue administrateur.",
    readinessTitle: "Préparation de la demande",
    rows: {
      requestStatus: "Statut de la demande",
      authoritativeStatus: "Statut officiel",
      contract: "Contrat",
      paymentMethod: "Mode de paiement",
      location: "Lieu",
      schedule: "Horaire",
      duties: "Tâches",
      qualifications: "Qualifications",
      workers: "Travailleurs",
      addressSummary: "Résumé de l’adresse",
      specialInstructions: "Consignes particulières",
      reviewReason: "Raison de la révision"
    },
    rawDetailsHidden: (readiness: string) => `${readiness} — détails confidentiels masqués`,
    notProvided: "Non fourni",
    restrictedOrNotProvided: "Restreint ou non fourni",
    unavailable: "Non disponible",
    economicsTitle: "Séparation des conditions financières",
    economicsCopy1:
      "Les conditions financières du client et celles de l’offre au travailleur ne font pas partie des données de ce calendrier.",
    economicsCopy2:
      "Consultez-les seulement dans leurs sources contractuelles distinctes. Aucun renseignement de paiement confidentiel n’est accessible ici.",
    intakeTitle: "Action d’accueil",
    beginReview: "Commencer la révision",
    reasonLabel: "Raison de la demande d’information",
    openClaim:
      "Ouvrir aux travailleurs — les travailleurs admissibles acceptent le quart de travail et y sont attribués immédiatement (premier arrivé, jusqu’au nombre demandé). Laissez décoché pour utiliser la présélection manuelle → offre.",
    requestInformation: "Demander de l’information",
    approveOpenClaim: "Approuver et ouvrir aux travailleurs",
    approveForDispatch: "Approuver pour la répartition",
    confirmTitle: "Confirmer le changement d’étape",
    confirmSuffix:
      "Cela ne publie rien, n’attribue personne, n’envoie aucun avis, n’effectue pas la paie et ne déplace aucun argent.",
    cancel: "Annuler",
    applyingButton: "Application…",
    confirmAction: "Confirmer l’action",
    loadLatest: "Charger la révision la plus récente",
    dispatchTitle: "Transfert à la répartition",
    noticeTitle: "Les pouvoirs de révision restent limités",
    noticeCopy:
      "Les actions d’accueil modifient seulement l’état de la demande de travail. La publication, l’attribution des travailleurs, la modification des tarifs, l’envoi d’avis, la paie et les paiements restent séparés.",
    stateSubmitted: "Cette demande soumise est prête pour la révision par l’administration.",
    stateAdminReview:
      "Révisez la demande, puis demandez de l’information ou approuvez-la pour la répartition.",
    stateInformationRequired: (reason: string | null) =>
      `En attente d’information de l’employeur.${reason ? ` Raison : ${reason}` : ""}`,
    stateApproved: "Approuvée pour la répartition. Aucune action d’accueil ne reste à faire.",
    stateNone: "Aucune action d’accueil n’est possible pour l’état de cette demande.",
    confirmAdminReview: "Commencer la révision humaine de cette demande.",
    confirmRequestInformation: "Retourner cette demande à l’employeur pour des précisions.",
    confirmApprove: "Approuver cette demande révisée pour la répartition à venir.",
    retry: "Réessayer"
  },
  ar: {
    referenceRequiredTitle: "يلزم مرجع الطلب",
    referenceRequiredMessage: "افتح طلبًا محفوظًا من تقويم المسؤول الموثّق.",
    loadingTitle: "جارٍ تحميل تفاصيل المراجعة",
    loadingMessage: "جارٍ التحقق من السجل المحفوظ المصرّح به للمسؤولين.",
    deniedTitle: "يلزم وصول المسؤول",
    deniedMessage: "عد إلى التقويم وسجّل الدخول بحساب مصرّح له على المنصة.",
    unavailableTitle: "خدمة المراجعة غير متاحة",
    unavailableMessage: "تعذّر الوصول إلى السجل المحفوظ. لا يُستبدل بأي سجل تجريبي.",
    staleTitle: "تغيّرت المراجعة",
    staleMessage: "حدّث السجل المحفوظ قبل المتابعة.",
    errorTitle: "تفاصيل المراجعة غير متاحة",
    errorMessage: "لا يُستبدل طلب المسؤول المحفوظ بأي سجل تجريبي.",
    messages: {
      reasonTooShort: "أدخل سببًا واضحًا لا يقل عن أربعة أحرف.",
      applying: "جارٍ تطبيق انتقال مرحلة الاستقبال.",
      stale: "تغيّر هذا الطلب. حمّل أحدث مراجعة قبل اتخاذ إجراء آخر.",
      authRequired: "تلزم صلاحية المسؤول.",
      failed: "تعذّر إتمام إجراء الاستقبال.",
      started: "بدأت مراجعة الإدارة.",
      infoRecorded: "تم تسجيل طلب المعلومات لصاحب العمل.",
      approved: "تمت الموافقة على الطلب للتوزيع.",
      serviceUnavailable: "خدمة الاستقبال غير متاحة. لا يُعلن عن أي نجاح."
    },
    eyebrow: "Joblop / مراجعة محفوظة",
    back: "العودة إلى تقويم الإدارة",
    assignmentBoundary: "سجلات الإسناد غير مرتبطة بهذا العرض الإداري.",
    readinessTitle: "جاهزية الطلب",
    rows: {
      requestStatus: "حالة الطلب",
      authoritativeStatus: "الحالة الرسمية",
      contract: "العقد",
      paymentMethod: "طريقة الدفع",
      location: "الموقع",
      schedule: "الموعد",
      duties: "المهام",
      qualifications: "المؤهلات",
      workers: "العمال",
      addressSummary: "ملخص العنوان",
      specialInstructions: "تعليمات خاصة",
      reviewReason: "سبب المراجعة"
    },
    rawDetailsHidden: (readiness: string) => `${readiness} — التفاصيل الحساسة مخفية`,
    notProvided: "غير متوفر",
    restrictedOrNotProvided: "مقيّد أو غير متوفر",
    unavailable: "غير متاح",
    economicsTitle: "فصل الشروط المالية",
    economicsCopy1: "لا تتضمن بيانات هذا التقويم الشروط المالية للعميل ولا الشروط المالية لعرض العامل.",
    economicsCopy2:
      "راجعها فقط من مصادرها التعاقدية المنفصلة. لا تتوفر هنا أي بيانات دفع حساسة.",
    intakeTitle: "إجراء الاستقبال",
    beginReview: "بدء مراجعة الإدارة",
    reasonLabel: "سبب طلب المعلومات",
    openClaim:
      "فتح الطلب للعمال مباشرة — يقبل العمال المؤهلون المناوبة ويُسند إليهم فورًا (الأسبقية للأول حتى العدد المطلوب). اتركه دون تحديد لاستخدام المسار اليدوي: قائمة مختصرة ← عرض.",
    requestInformation: "طلب معلومات",
    approveOpenClaim: "موافقة + فتح للعمال",
    approveForDispatch: "موافقة للتوزيع",
    confirmTitle: "تأكيد انتقال المرحلة",
    confirmSuffix: "لا يؤدي هذا إلى النشر أو الإسناد أو الإشعار أو تشغيل الرواتب أو تحويل أي أموال.",
    cancel: "إلغاء",
    applyingButton: "جارٍ التطبيق…",
    confirmAction: "تأكيد الإجراء",
    loadLatest: "تحميل أحدث مراجعة",
    dispatchTitle: "التسليم إلى التوزيع",
    noticeTitle: "صلاحيات المراجعة تبقى محدودة",
    noticeCopy:
      "إجراءات الاستقبال تغيّر حالة طلب العمل فقط. يبقى النشر وإسناد العمال وتعديل الأسعار وإرسال الإشعارات والرواتب والمدفوعات منفصلة.",
    stateSubmitted: "هذا الطلب المقدَّم جاهز لبدء مراجعة الإدارة.",
    stateAdminReview: "راجع الطلب، ثم اطلب معلومات أو وافق عليه للتوزيع.",
    stateInformationRequired: (reason: string | null) =>
      `بانتظار معلومات من صاحب العمل.${reason ? ` السبب: ${reason}` : ""}`,
    stateApproved: "تمت الموافقة للتوزيع. لا يتبقى أي إجراء استقبال.",
    stateNone: "لا يتوفر أي إجراء استقبال لحالة هذا الطلب.",
    confirmAdminReview: "بدء المراجعة البشرية لهذا الطلب.",
    confirmRequestInformation: "إعادة هذا الطلب إلى صاحب العمل للتوضيح.",
    confirmApprove: "الموافقة على هذا الطلب المُراجَع للتوزيع لاحقًا.",
    retry: "إعادة المحاولة"
  }
} satisfies PageText<typeof reviewTextEn>;
type ReviewText = typeof reviewTextEn;

export function PersistedAdminReviewPanel({ requestId }: Readonly<{ requestId: string | null }>) {
  const t = usePageText(reviewText);
  const [state, setState] = useState<AuthenticatedViewState<AdminCalendarDto>>({
    status: "loading"
  });
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);
  const [confirmAction, setConfirmAction] = useState<IntakeAction | null>(null);
  const [reason, setReason] = useState("");
  // Hybrid auto-offer: when checked, approving opens the job for direct worker claim (first eligible
  // worker to tap Accept is assigned instantly). Unchecked keeps the manual shortlist→offer path.
  const [openClaim, setOpenClaim] = useState(false);
  const requestGeneration = useRef(0);
  const confirmationDialog = useRef<HTMLDialogElement>(null);
  const confirmationTrigger = useRef<HTMLButtonElement | null>(null);
  const confirmationWasOpen = useRef(false);
  const load = useCallback(async () => {
    if (!requestId) return;
    const generation = ++requestGeneration.current;
    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/calendar/requests/${encodeURIComponent(requestId)}`, {
        cache: "no-store"
      });
      if (generation !== requestGeneration.current) return;
      if (!response.ok) return setState(calendarFailureState(response.status));
      const payload = (await response.json()) as { request?: unknown };
      if (generation !== requestGeneration.current) return;
      setState({ status: "ready", data: parseAdminCalendarDto(payload.request) });
    } catch {
      if (generation !== requestGeneration.current) return;
      setState({ status: "error" });
    }
  }, [requestId]);
  useEffect(() => {
    void load();
    return () => {
      requestGeneration.current += 1;
    };
  }, [load]);
  useEffect(() => {
    if (confirmAction) {
      confirmationWasOpen.current = true;
      if (!confirmationDialog.current?.open) confirmationDialog.current?.showModal();
      return;
    }
    if (confirmationDialog.current?.open) confirmationDialog.current.close();
    if (confirmationWasOpen.current) {
      confirmationWasOpen.current = false;
      confirmationTrigger.current?.focus();
    }
  }, [confirmAction]);

  if (!requestId) {
    return (
      <AdminState
        backLabel={t.back}
        message={t.referenceRequiredMessage}
        retryLabel={t.retry}
        title={t.referenceRequiredTitle}
      />
    );
  }

  if (state.status !== "ready") {
    const copy: readonly [string, string] =
      state.status === "loading"
        ? [t.loadingTitle, t.loadingMessage]
        : state.status === "denied"
          ? [t.deniedTitle, t.deniedMessage]
          : state.status === "unavailable"
            ? [t.unavailableTitle, t.unavailableMessage]
            : state.status === "stale"
              ? [t.staleTitle, t.staleMessage]
              : [t.errorTitle, t.errorMessage];
    return state.status === "denied" ? (
      <AdminState backLabel={t.back} message={copy[1]} retryLabel={t.retry} title={copy[0]} />
    ) : (
      <AdminState
        backLabel={t.back}
        message={copy[1]}
        onRetry={load}
        retryLabel={t.retry}
        title={copy[0]}
      />
    );
  }
  const request = state.data;
  async function performAction(action: IntakeAction) {
    if (action === "request-information" && reason.trim().length < 4) {
      setActionMessage("reasonTooShort");
      return;
    }
    setActionBusy(true);
    setActionMessage("applying");
    try {
      const response = await fetch(`/api/intake/${encodeURIComponent(request.id)}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedVersion: request.versionToken,
          ...(action === "request-information" ? { reason: reason.trim() } : {}),
          ...(action === "approve-for-dispatch" && openClaim ? { openClaim: true } : {})
        })
      });
      if (response.status === 409) {
        setConfirmAction(null);
        setActionMessage("stale");
        return;
      }
      if (!response.ok) {
        setConfirmAction(null);
        setActionMessage(response.status === 401 ? "authRequired" : "failed");
        return;
      }
      setConfirmAction(null);
      setReason("");
      setActionMessage(
        action === "admin-review"
          ? "started"
          : action === "request-information"
            ? "infoRecorded"
            : "approved"
      );
      await load();
    } catch {
      setConfirmAction(null);
      setActionMessage("serviceUnavailable");
    } finally {
      setActionBusy(false);
    }
  }
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>{t.eyebrow}</p>
          <h1 style={styles.title}>{request.title}</h1>
          <p style={styles.lede}>
            {request.requestNumber} · {request.authoritativeStatus.replaceAll("_", " ")}
          </p>
        </div>
        <div style={styles.actionStack}>
          <a href="/calendar" style={styles.secondaryButton}>
            {t.back}
          </a>
          <p style={styles.assignmentBoundary}>{t.assignmentBoundary}</p>
        </div>
      </header>
      <section style={styles.grid}>
        <article style={styles.panel}>
          <h2 style={styles.h2}>{t.readinessTitle}</h2>
          {[
            [t.rows.requestStatus, request.status.replaceAll("_", " ")],
            [t.rows.authoritativeStatus, request.authoritativeStatus.replaceAll("_", " ")],
            [t.rows.contract, request.verification.contract],
            [t.rows.paymentMethod, t.rawDetailsHidden(request.verification.paymentMethodReadiness)],
            [t.rows.location, request.verification.location],
            [t.rows.schedule, formatWindow(request, t.unavailable)],
            [t.rows.duties, request.dutiesSummary ?? t.notProvided],
            [
              t.rows.qualifications,
              request.qualifications.length ? request.qualifications.join(", ") : t.notProvided
            ],
            [t.rows.workers, String(request.numberOfWorkers)],
            [t.rows.addressSummary, request.addressSummary ?? t.restrictedOrNotProvided],
            [t.rows.specialInstructions, request.specialInstructions ?? t.notProvided],
            [t.rows.reviewReason, request.adminReviewReason ?? t.notProvided]
          ].map(([label, value]) => (
            <div key={label} style={styles.row}>
              <strong>{label}</strong>
              <span>{value}</span>
            </div>
          ))}
          <JobLocationMap address={request.addressSummary} />
        </article>
        <article style={styles.panel}>
          <h2 style={styles.h2}>{t.economicsTitle}</h2>
          <p>{t.economicsCopy1}</p>
          <p>{t.economicsCopy2}</p>
        </article>
        <article style={styles.panel}>
          <h2 style={styles.h2}>{t.intakeTitle}</h2>
          <p aria-live="polite" role={actionMessage === "stale" ? "alert" : "status"}>
            {actionMessage
              ? t.messages[actionMessage]
              : intakeStateCopy(t, request.authoritativeStatus, request.adminReviewReason)}
          </p>
          {request.authoritativeStatus === "submitted" ? (
            <button
              disabled={actionBusy}
              onClick={(event) => {
                confirmationTrigger.current = event.currentTarget;
                setConfirmAction("admin-review");
              }}
              style={styles.primaryButton}
              type="button"
            >
              {t.beginReview}
            </button>
          ) : null}
          {request.authoritativeStatus === "admin_review" ? (
            <>
              <label style={styles.label}>
                {t.reasonLabel}
                <textarea
                  disabled={actionBusy}
                  maxLength={1000}
                  onChange={(event) => setReason(event.target.value)}
                  rows={5}
                  style={styles.textarea}
                  value={reason}
                />
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12 }}>
                <input
                  checked={openClaim}
                  disabled={actionBusy}
                  onChange={(event) => setOpenClaim(event.currentTarget.checked)}
                  type="checkbox"
                />
                <span>{t.openClaim}</span>
              </label>
              <div style={styles.actionStack}>
                <button
                  disabled={actionBusy || reason.trim().length < 4}
                  onClick={(event) => {
                    confirmationTrigger.current = event.currentTarget;
                    setConfirmAction("request-information");
                  }}
                  style={styles.secondaryAction}
                  type="button"
                >
                  {t.requestInformation}
                </button>
                <button
                  disabled={actionBusy}
                  onClick={(event) => {
                    confirmationTrigger.current = event.currentTarget;
                    setConfirmAction("approve-for-dispatch");
                  }}
                  style={styles.primaryButton}
                  type="button"
                >
                  {openClaim ? t.approveOpenClaim : t.approveForDispatch}
                </button>
              </div>
            </>
          ) : null}
          {confirmAction ? (
            <dialog
              aria-describedby="confirm-intake-copy"
              aria-labelledby="confirm-intake-action"
              onCancel={() => setConfirmAction(null)}
              ref={confirmationDialog}
              style={styles.confirmation}
            >
              <h3 id="confirm-intake-action" style={styles.h2}>
                {t.confirmTitle}
              </h3>
              <p id="confirm-intake-copy">
                {confirmationCopy(t, confirmAction)} {t.confirmSuffix}
              </p>
              <div style={styles.actionStack}>
                <button
                  autoFocus
                  disabled={actionBusy}
                  onClick={() => setConfirmAction(null)}
                  style={styles.secondaryAction}
                  type="button"
                >
                  {t.cancel}
                </button>
                <button
                  disabled={actionBusy}
                  onClick={() => void performAction(confirmAction)}
                  style={styles.primaryButton}
                  type="button"
                >
                  {actionBusy ? t.applyingButton : t.confirmAction}
                </button>
              </div>
            </dialog>
          ) : null}
          {actionMessage === "stale" ? (
            <button onClick={() => void load()} style={styles.secondaryAction} type="button">
              {t.loadLatest}
            </button>
          ) : null}
        </article>
        {request.authoritativeStatus === "approved_for_dispatch" ? (
          <article style={styles.panel}>
            <h2 style={styles.h2}>{t.dispatchTitle}</h2>
            <DispatchHandoffPanel jobRequestId={request.id} />
          </article>
        ) : null}
      </section>
      <section style={styles.notice}>
        <h2 style={styles.h2}>{t.noticeTitle}</h2>
        <p>{t.noticeCopy}</p>
      </section>
    </main>
  );
}

function intakeStateCopy(
  t: ReviewText,
  status: AdminCalendarDto["authoritativeStatus"],
  reason: string | null
) {
  if (status === "submitted") return t.stateSubmitted;
  if (status === "admin_review") return t.stateAdminReview;
  if (status === "information_required") return t.stateInformationRequired(reason);
  if (status === "approved_for_dispatch") return t.stateApproved;
  return t.stateNone;
}

function confirmationCopy(t: ReviewText, action: IntakeAction) {
  if (action === "admin-review") return t.confirmAdminReview;
  if (action === "request-information") return t.confirmRequestInformation;
  return t.confirmApprove;
}

function formatWindow(request: AdminCalendarDto, unavailableLabel: string) {
  const start = formatRwosDateTime(request.startAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: request.timezone
  });
  const end = formatRwosDateTime(request.endAt, {
    timeStyle: "short",
    timeZone: request.timezone
  });
  // formatRwosDateTime returns the literal "Unavailable" for an unreadable date.
  return start === "Unavailable" || end === "Unavailable"
    ? unavailableLabel
    : `${start}–${end} (${request.timezone})`;
}

function AdminState({
  title,
  message,
  onRetry,
  backLabel,
  retryLabel
}: Readonly<{
  title: string;
  message: string;
  onRetry?: () => Promise<void>;
  backLabel: string;
  retryLabel: string;
}>) {
  return (
    <main style={styles.page}>
      <header aria-live="polite" style={styles.hero}>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.lede}>{message}</p>
        <div style={styles.actionStack}>
          <a href="/calendar" style={styles.secondaryButton}>
            {backLabel}
          </a>
          {onRetry ? (
            <button onClick={() => void onRetry()} style={styles.retryButton} type="button">
              {retryLabel}
            </button>
          ) : null}
        </div>
      </header>
    </main>
  );
}

const styles = {
  page: {
    background: "#000000",
    color: "#f4efe4",
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: "100vh"
  },
  hero: {
    alignItems: "center",
    background: "#000000",
    color: "#fff",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 24,
    justifyContent: "space-between",
    padding: "40px clamp(18px, 5vw, 64px)"
  },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(34px, 5vw, 56px)", margin: "8px 0" },
  lede: { color: "#faf6ec", fontSize: 18, lineHeight: 1.6, maxWidth: 760 },
  secondaryButton: {
    alignItems: "center",
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.3)",
    borderRadius: 8,
    color: "#f4efe4",
    display: "inline-flex",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px",
    textDecoration: "none"
  },
  actionStack: { display: "flex", flexWrap: "wrap" as const, gap: 10 },
  assignmentBoundary: {
    color: "#faf6ec",
    fontSize: 13,
    margin: 0,
    maxWidth: 240
  },
  retryButton: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.3)",
    borderRadius: 8,
    color: "#f4efe4",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  primaryButton: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.3)",
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  secondaryAction: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.3)",
    borderRadius: 8,
    color: "#f4efe4",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  label: { display: "grid", fontWeight: 800, gap: 8, marginTop: 16 },
  textarea: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 8,
    color: "#f4efe4",
    font: "inherit",
    padding: 12,
    resize: "vertical" as const
  },
  confirmation: {
    background: "#0c0c0c",
    border: "1px solid #e8d782",
    borderRadius: 12,
    marginTop: 18,
    padding: 18
  },
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    padding: "24px clamp(18px, 5vw, 64px)"
  },
  panel: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 14, padding: 24 },
  h2: { color: "#f4efe4", fontSize: 25, margin: "6px 0 14px" },
  row: {
    alignItems: "center",
    borderBottom: "1px solid rgba(248, 184, 8, 0.16)",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 12,
    justifyContent: "space-between",
    padding: "12px 0"
  },
  notice: {
    background: "#0c0c0c",
    border: "1px solid #e8d782",
    borderRadius: 14,
    margin: "0 clamp(18px, 5vw, 64px) 48px",
    padding: 24
  }
} as const;
