import type { BrainMode, SummaryCopy } from "@rwos/brain";
import type { EmailMessage } from "../mailer/emailSender";
import type { WorkerLanguage } from "../notifications/workerLanguage";
import { noticeSms, smsLanguage } from "../notifications/smsBrand";
import { formatHoursReportDeadline } from "../hoursReport";

// Every word the Joblop brain sends, in plain short English and French. Messages to workers and
// employers never carry money: no rates, no Joblop share, nothing about the other side's pay.

// Arabic texts use Latin digits, like every other worker notice (intlLocale).
const LOCALE: Record<WorkerLanguage, string> = { en: "en-CA", fr: "fr-CA", ar: "ar-u-nu-latn" };

function formatWhen(at: Date, language: WorkerLanguage, timeZone: string, style: "time" | "date"): string {
  const options: Intl.DateTimeFormatOptions = style === "time" ? { timeStyle: "short" } : { dateStyle: "medium" };
  try {
    return new Intl.DateTimeFormat(LOCALE[language], { ...options, timeZone }).format(at);
  } catch {
    return new Intl.DateTimeFormat(LOCALE[language], options).format(at);
  }
}

/** Worker SMS: the shift started and there is no check-in yet. */
export function checkInReminderSmsText(raw: { language: WorkerLanguage; title: string; startAt: Date; timezone: string }): string {
  const params = { ...raw, language: smsLanguage(raw.language) };
  const time = formatWhen(params.startAt, params.language, params.timezone, "time");
  if (params.language === "en") {
    return noticeSms("en", `your shift "${params.title}" started at ${time}. Please check in now in the app. Can't make it? Tell us right away.`);
  }
  if (params.language === "ar") {
    return noticeSms("ar", `بدأت مناوبتك «${params.title}» الساعة ${time}. سجّل وصولك في التطبيق. لا تستطيع الحضور؟ أخبرنا فورًا.`);
  }
  return noticeSms("fr", `votre quart "${params.title}" a commencé à ${time}. Pointez votre arrivée dans l'app. Un problème? Dites-le-nous tout de suite.`);
}

/** Employer email: hours from a finished shift are waiting for their confirmation. */
export function timesheetReminderEmail(params: {
  to: string;
  language: WorkerLanguage;
  jobCode: string;
  title: string;
  shiftStart: Date;
  timezone: string;
}): EmailMessage {
  const day = formatWhen(params.shiftStart, params.language, params.timezone, "date");
  if (params.language === "en") {
    return {
      to: params.to,
      subject: `Joblop — please confirm the hours (${params.jobCode})`,
      text:
        `Please confirm the worker's hours for "${params.title}" on ${day} (job code ${params.jobCode}).\n\n` +
        `Sign in to Joblop and open Timesheets. If something is wrong, you can say so there.\n\n— Joblop`
    };
  }
  if (params.language === "ar") {
    return {
      to: params.to,
      subject: `Joblop — يُرجى تأكيد الساعات (${params.jobCode})`,
      text:
        `يُرجى تأكيد ساعات العامل لـ«${params.title}» يوم ${day} (رمز المهمة ${params.jobCode}).\n\n` +
        `سجّل الدخول إلى Joblop وافتح «كشوف الدوام». إذا كان هناك خطأ، يمكنك الإبلاغ عنه هناك.\n\n— Joblop`
    };
  }
  return {
    to: params.to,
    subject: `Joblop — veuillez confirmer les heures (${params.jobCode})`,
    text:
      `Veuillez confirmer les heures du travailleur pour « ${params.title} » le ${day} (code de mission ${params.jobCode}).\n\n` +
      `Connectez-vous à Joblop et ouvrez Feuilles de temps. Si quelque chose ne va pas, vous pouvez le signaler là.\n\n— Joblop`
  };
}

/** Employer email: their booked worker has not checked in yet, and Joblop is on it. */
export function noShowEmployerEmail(params: {
  to: string;
  language: WorkerLanguage;
  jobCode: string;
  title: string;
  startAt: Date;
  timezone: string;
}): EmailMessage {
  const time = formatWhen(params.startAt, params.language, params.timezone, "time");
  if (params.language === "en") {
    return {
      to: params.to,
      subject: `Joblop — your worker has not checked in yet (${params.jobCode})`,
      text:
        `The worker booked for "${params.title}" (start ${time}, job code ${params.jobCode}) has not checked in yet.\n\n` +
        `Joblop is on it: we are contacting the worker and will keep you posted. No need to do anything for now.\n\n— Joblop`
    };
  }
  if (params.language === "ar") {
    return {
      to: params.to,
      subject: `Joblop — لم يسجّل عاملك وصوله بعد (${params.jobCode})`,
      text:
        `العامل المحجوز لـ«${params.title}» (البداية ${time}، رمز المهمة ${params.jobCode}) لم يسجّل وصوله بعد.\n\n` +
        `Joblop تتابع الأمر: نتواصل مع العامل وسنُبقيك على اطلاع. لا داعي لأي إجراء منك الآن.\n\n— Joblop`
    };
  }
  return {
    to: params.to,
    subject: `Joblop — votre travailleur n'a pas encore fait son arrivée (${params.jobCode})`,
    text:
      `Le travailleur prévu pour « ${params.title} » (début ${time}, code de mission ${params.jobCode}) n'a pas encore fait son arrivée.\n\n` +
      `Joblop s'en occupe : nous contactons le travailleur et vous tiendrons au courant. Vous n'avez rien à faire pour l'instant.\n\n— Joblop`
  };
}

/** Worker email: their own hours from a finished shift are waiting for their confirmation. */
export function workerTimesheetReminderEmail(params: { to: string; language: WorkerLanguage; title: string; shiftStart: Date; timezone: string }): EmailMessage {
  const language = params.language;
  const day = formatWhen(params.shiftStart, language, params.timezone, "date");
  if (language === "en") {
    return {
      to: params.to,
      subject: "Joblop — please confirm your hours",
      text:
        `Please confirm your hours for "${params.title}" on ${day}.\n\n` +
        `Sign in to Joblop and open Timesheets. If something is wrong, you can say so there.\n\n— Joblop`
    };
  }
  if (language === "ar") {
    return {
      to: params.to,
      subject: "Joblop — يُرجى تأكيد ساعاتك",
      text:
        `يُرجى تأكيد ساعاتك لـ«${params.title}» يوم ${day}.\n\n` +
        `سجّل الدخول إلى Joblop وافتح «كشوف الدوام». إذا كان هناك خطأ، يمكنك الإبلاغ عنه هناك.\n\n— Joblop`
    };
  }
  return {
    to: params.to,
    subject: "Joblop — veuillez confirmer vos heures",
    text:
      `Veuillez confirmer vos heures pour « ${params.title} » le ${day}.\n\n` +
      `Connectez-vous à Joblop et ouvrez Feuilles de temps. Si quelque chose ne va pas, vous pouvez le signaler là.\n\n— Joblop`
  };
}

/** Worker SMS twin, for a worker with no email. */
export function workerTimesheetReminderSmsText(raw: { language: WorkerLanguage; title: string; shiftStart: Date; timezone: string }): string {
  const params = { ...raw, language: smsLanguage(raw.language) };
  const day = formatWhen(params.shiftStart, params.language, params.timezone, "date");
  if (params.language === "en") return noticeSms("en", `please confirm your hours for "${params.title}" on ${day}, in the app under Timesheets.`);
  if (params.language === "ar") return noticeSms("ar", `يُرجى تأكيد ساعاتك لـ«${params.title}» يوم ${day}، في التطبيق ضمن كشوف الدوام.`);
  return noticeSms("fr", `veuillez confirmer vos heures pour "${params.title}" le ${day}, dans l'app sous Feuilles de temps.`);
}

// ── "Report my hours": a shift ended with no check-in (12-hour window, HOURS_REPORT_WINDOW_HOURS) ──

type ReportNoticeParams = { language: WorkerLanguage; title: string; deadline: Date; link: string | null; last: boolean };

/** Worker email: the shift ended with no check-in; report the hours before the deadline or it is not recorded or paid. */
export function reportHoursNoticeEmail(params: ReportNoticeParams & { to: string; shiftStart: Date; timezone: string }): EmailMessage {
  const day = formatWhen(params.shiftStart, params.language, params.timezone, "date");
  const until = formatHoursReportDeadline(params.deadline, params.language);
  if (params.language === "en") {
    return {
      to: params.to,
      subject: params.last ? "Joblop — last reminder: report your hours" : "Joblop — no check-in recorded: report your hours",
      text:
        `No check-in was recorded for your shift "${params.title}" on ${day}.\n\n` +
        `If you worked it, report your arrival and departure times before ${until} (Eastern time). After that, this shift will not be recorded or paid.\n\n` +
        `${params.link ? `Report your hours: ${params.link}` : "Open Joblop, go to My schedule and tap \"Report my hours\"."}\n\n— Joblop`
    };
  }
  if (params.language === "ar") {
    return {
      to: params.to,
      subject: params.last ? "Joblop — تذكير أخير: أبلغ عن ساعاتك" : "Joblop — لم يُسجَّل حضورك: أبلغ عن ساعاتك",
      text:
        `لم يُسجَّل أي حضور لمناوبتك «${params.title}» يوم ${day}.\n\n` +
        `إذا عملت فيها، أبلغ عن وقت وصولك ومغادرتك قبل ${until} (توقيت الشرق). بعد ذلك لن تُسجَّل هذه المناوبة ولن تُدفع.\n\n` +
        `${params.link ? `أبلغ عن ساعاتك: ${params.link}` : "افتح Joblop، ثم «جدولي» واضغط «أبلغ عن ساعاتي»."}\n\n— Joblop`
    };
  }
  return {
    to: params.to,
    subject: params.last ? "Joblop — dernier rappel : déclarez vos heures" : "Joblop — aucun pointage : déclarez vos heures",
    text:
      `Aucun pointage n'a été enregistré pour votre quart « ${params.title} » le ${day}.\n\n` +
      `Si vous l'avez travaillé, déclarez vos heures d'arrivée et de départ avant le ${until} (heure de l'Est). Après, ce quart ne sera ni enregistré ni payé.\n\n` +
      `${params.link ? `Déclarer mes heures : ${params.link}` : "Ouvrez Joblop, allez dans Mon horaire et touchez « Déclarer mes heures »."}\n\n— Joblop`
  };
}

/** Worker SMS twin (Arabic readers get the French text). Kept to at most 2 segments. */
export function reportHoursNoticeSmsText(raw: ReportNoticeParams): string {
  const params = { ...raw, language: smsLanguage(raw.language) };
  const until = formatHoursReportDeadline(params.deadline, params.language);
  const link = params.link ? ` ${params.link}` : "";
  if (params.language === "en") return noticeSms("en", `${params.last ? "last reminder: " : ""}no check-in for "${params.title}". Report your hours before ${until} or the shift is not paid.${link}`);
  if (params.language === "ar") return noticeSms("ar", `${params.last ? "تذكير أخير: " : ""}لا حضور مسجّل لـ«${params.title}». أبلغ عن ساعاتك قبل ${until} وإلا لن تُدفع المناوبة.${link}`);
  return noticeSms("fr", `${params.last ? "dernier rappel : " : ""}aucun pointage pour "${params.title}". Déclarez vos heures avant le ${until}, sinon le quart n'est pas payé.${link}`);
}

/** Employer email: no hours were reported in time for a shift, so it is not recorded and will not be invoiced. */
export function shiftNotRecordedEmployerEmail(params: { to: string; language: WorkerLanguage; jobCode: string; title: string; shiftStart: Date; timezone: string }): EmailMessage {
  const day = formatWhen(params.shiftStart, params.language, params.timezone, "date");
  if (params.language === "en") {
    return {
      to: params.to,
      subject: `Joblop — shift not recorded (${params.jobCode})`,
      text:
        `No hours were recorded for the shift "${params.title}" on ${day} (job code ${params.jobCode}): the worker did not check in and did not report their hours in time.\n\n` +
        `This shift will not be invoiced. If the worker did work it, contact Joblop.\n\n— Joblop`
    };
  }
  if (params.language === "ar") {
    return {
      to: params.to,
      subject: `Joblop — مناوبة غير مسجّلة (${params.jobCode})`,
      text:
        `لم تُسجَّل أي ساعات لمناوبة «${params.title}» يوم ${day} (رمز المهمة ${params.jobCode}): لم يسجّل العامل حضوره ولم يبلغ عن ساعاته في الوقت المحدد.\n\n` +
        `لن تُفوتَر هذه المناوبة. إذا كان العامل قد عمل فيها، تواصل مع Joblop.\n\n— Joblop`
    };
  }
  return {
    to: params.to,
    subject: `Joblop — quart non enregistré (${params.jobCode})`,
    text:
      `Aucune heure n'a été enregistrée pour le quart « ${params.title} » le ${day} (code de mission ${params.jobCode}) : le travailleur n'a pas pointé et n'a pas déclaré ses heures à temps.\n\n` +
      `Ce quart ne sera pas facturé. Si le travailleur l'a bien travaillé, communiquez avec Joblop.\n\n— Joblop`
  };
}

type Titles = Readonly<{ en: string; fr: string; ar: string }>;

export const RULE_TITLES: Record<string, Titles> = {
  job_unfilled_soon: { en: "Approved job starting soon with open places", fr: "Mission approuvée bientôt, places libres", ar: "مهمة موافَق عليها تبدأ قريبًا وفيها أماكن شاغرة" },
  worker_not_checked_in: { en: "Worker not checked in 10 min after start", fr: "Travailleur sans arrivée 10 min après le début", ar: "عامل لم يسجّل وصوله بعد 10 دقائق من البداية" },
  delivery_failed: { en: "Email or text that failed", fr: "Courriel ou texto non envoyé", ar: "بريد أو رسالة نصية لم تُرسَل" },
  request_waiting_review: { en: "Request waiting for staff review", fr: "Demande en attente de révision", ar: "طلب ينتظر مراجعة الفريق" },
  timesheet_unconfirmed: { en: "Hours not confirmed after 24 h (worker or employer)", fr: "Heures non confirmées après 24 h (travailleur ou employeur)", ar: "ساعات غير مؤكدة بعد 24 ساعة (العامل أو صاحب العمل)" },
  hours_not_reported: { en: "Shift ended with no check-in: worker has 12 h to report hours", fr: "Quart terminé sans pointage : le travailleur a 12 h pour déclarer ses heures", ar: "مناوبة انتهت دون تسجيل حضور: أمام العامل 12 ساعة للإبلاغ عن ساعاته" },
  shift_not_recorded: { en: "Not recorded: no hours reported in time", fr: "Non enregistré : aucune heure déclarée à temps", ar: "غير مسجّلة: لم يُبلَغ عن أي ساعات في الوقت المحدد" },
  hours_not_prepared: { en: "Shift ended over 2 h ago with no hours prepared", fr: "Quart terminé depuis plus de 2 h sans heures préparées", ar: "مناوبة انتهت منذ أكثر من ساعتين دون تحضير الساعات" },
  timesheet_ready: { en: "Hours ready for approval", fr: "Heures prêtes à approuver", ar: "ساعات جاهزة للموافقة" },
  invoice_overdue: { en: "Overdue invoice", fr: "Facture en retard", ar: "فاتورة متأخرة" },
  job_missing_info: { en: "Job submitted with missing information", fr: "Mission soumise avec des informations manquantes", ar: "مهمة أُرسلت بمعلومات ناقصة" },
  // Phase 2: one row per action card the assistant showed (resolved at once; not a problem).
  assistant: { en: "Assistant action cards shown", fr: "Cartes d'action de l'assistant affichées", ar: "بطاقات إجراءات المساعد المعروضة" }
};

export const ACTION_TITLES: Record<string, Titles> = {
  resend_failed_message: { en: "Re-send a failed email or text", fr: "Renvoyer un courriel ou texto non envoyé", ar: "إعادة إرسال بريد أو رسالة لم تُرسَل" },
  remind_worker_check_in: { en: "Text a worker to check in", fr: "Texter un travailleur pour qu'il fasse son arrivée", ar: "مراسلة عامل ليسجّل وصوله" },
  remind_employer_timesheet: { en: "Email an employer to confirm hours", fr: "Écrire à un employeur pour confirmer les heures", ar: "مراسلة صاحب عمل لتأكيد الساعات" },
  remind_worker_timesheet: { en: "Remind a worker to confirm their hours", fr: "Rappeler à un travailleur de confirmer ses heures", ar: "تذكير عامل بتأكيد ساعاته" },
  offer_employer_bonus: { en: "Offer the employer a bonus for an unfilled job", fr: "Proposer une prime à l'employeur pour une mission non pourvue", ar: "اقتراح مكافأة على صاحب العمل لمهمة غير مغطاة" },
  auto_approve_request: { en: "Approve a request that passes every check", fr: "Approuver une demande qui passe toutes les vérifications", ar: "الموافقة على طلب اجتاز كل الفحوص" },
  auto_approve_timesheet: { en: "Approve hours with check-in and check-out and no problems", fr: "Approuver des heures avec arrivée, départ et aucun problème", ar: "الموافقة على ساعات فيها تسجيل وصول وانصراف دون مشاكل" },
  notify_worker_report_hours: { en: "Tell a worker with no check-in to report their hours (12 h)", fr: "Aviser un travailleur sans pointage de déclarer ses heures (12 h)", ar: "إبلاغ عامل دون تسجيل حضور بالإبلاغ عن ساعاته (12 ساعة)" },
  close_unreported_shift: { en: "Close a shift with no hours reported in time (not recorded; employer told)", fr: "Fermer un quart sans heures déclarées à temps (non enregistré; employeur avisé)", ar: "إغلاق مناوبة لم يُبلَغ عن ساعاتها في الوقت المحدد (غير مسجّلة؛ يُبلَّغ صاحب العمل)" },
  daily_summary_email: { en: "Daily summary email to staff", fr: "Résumé quotidien par courriel au personnel", ar: "ملخص يومي بالبريد إلى الفريق" },
  // Phase 2: actions a person confirmed on an assistant card.
  "assistant.claim_open_job": { en: "Assistant: worker claimed a job", fr: "Assistant : un travailleur a pris une mission", ar: "المساعد: عامل أخذ مهمة" },
  "assistant.cancel_my_shift": { en: "Assistant: worker cancelled a shift", fr: "Assistant : un travailleur a annulé un quart", ar: "المساعد: عامل ألغى مناوبة" },
  "assistant.confirm_shift": { en: "Assistant: worker confirmed a shift", fr: "Assistant : un travailleur a confirmé un quart", ar: "المساعد: عامل أكّد مناوبة" },
  "assistant.create_draft_request": { en: "Assistant: employer created a draft request", fr: "Assistant : un employeur a créé un brouillon", ar: "المساعد: صاحب عمل أنشأ مسودة طلب" },
  "assistant.submit_draft": { en: "Assistant: employer submitted a request", fr: "Assistant : un employeur a soumis une demande", ar: "المساعد: صاحب عمل أرسل طلبًا" },
  "assistant.confirm_timesheet": { en: "Assistant: employer confirmed hours", fr: "Assistant : un employeur a confirmé des heures", ar: "المساعد: صاحب عمل أكّد الساعات" },
  "assistant.duplicate_request": { en: "Assistant: employer copied a request", fr: "Assistant : un employeur a copié une demande", ar: "المساعد: صاحب عمل نسخ طلبًا" },
  "assistant.brain_do_it": { en: "Assistant: staff ran a Brain action", fr: "Assistant : le personnel a lancé une action du cerveau", ar: "المساعد: الفريق شغّل إجراءً من العقل" },
  "assistant.approve_request": { en: "Assistant: staff approved a request", fr: "Assistant : le personnel a approuvé une demande", ar: "المساعد: الفريق وافق على طلب" },
  "assistant.approve_timesheet": { en: "Assistant: staff approved hours", fr: "Assistant : le personnel a approuvé des heures", ar: "المساعد: الفريق وافق على الساعات" }
};

const title = (table: Record<string, Titles>, key: string, language: WorkerLanguage) => table[key]?.[language] ?? key;

const MODE_LINE: Record<WorkerLanguage, Record<BrainMode, string>> = {
  en: {
    off: "The brain is OFF (kill switch): it only lists problems.",
    watch: "The brain is in WATCH mode: it records what it would have done and does nothing.",
    live: "The brain is LIVE: it acts only where its switch is on."
  },
  fr: {
    off: "Le cerveau est ARRÊTÉ (arrêt d'urgence) : il ne fait que lister les problèmes.",
    watch: "Le cerveau est en mode OBSERVATION : il note ce qu'il aurait fait et ne fait rien.",
    live: "Le cerveau est ACTIF : il agit seulement là où son interrupteur est allumé."
  },
  ar: {
    off: "العقل متوقف (زر الإيقاف): يكتفي بعرض المشاكل.",
    watch: "العقل في وضع المراقبة: يسجّل ما كان سيفعله ولا يفعل شيئًا.",
    live: "العقل يعمل: يتصرف فقط حيث يكون مفتاحه مفعّلًا."
  }
};

const SUMMARY_WORDS: Record<WorkerLanguage, Readonly<{ subject: string; intro: string; found: string; done: string; simulated: string; failed: string; needs: string; none: string; open: (count: number) => string }>> = {
  en: {
    subject: "Joblop brain — daily summary",
    intro: "Here is what the brain found and did in the last 24 hours.",
    found: "Found", done: "Done", simulated: "Would have done (watch mode)", failed: "Failed", needs: "Needs a person", none: "nothing",
    open: (count) => `Open issues now: ${count}. Open the Brain page in the staff site.`
  },
  fr: {
    subject: "Cerveau Joblop — résumé quotidien",
    intro: "Voici ce que le cerveau a trouvé et fait au cours des 24 dernières heures.",
    found: "Trouvé", done: "Fait", simulated: "Aurait fait (mode observation)", failed: "Échoué", needs: "Demande une personne", none: "rien",
    open: (count) => `Problèmes ouverts : ${count}. Ouvrez la page Cerveau du site du personnel.`
  },
  ar: {
    subject: "عقل Joblop — الملخص اليومي",
    intro: "هذا ما وجده العقل وما فعله خلال آخر 24 ساعة.",
    found: "ما وُجد", done: "ما أُنجز", simulated: "ما كان سيفعله (وضع المراقبة)", failed: "ما فشل", needs: "يحتاج إلى شخص", none: "لا شيء",
    open: (count) => `المشاكل المفتوحة الآن: ${count}. افتح صفحة العقل في موقع الفريق.`
  }
};

export function summaryCopy(language: WorkerLanguage): SummaryCopy {
  const words = SUMMARY_WORDS[language];
  return {
    subject: words.subject,
    intro: words.intro,
    modeLine: (mode) => MODE_LINE[language][mode],
    foundHeading: words.found,
    doneHeading: words.done,
    simulatedHeading: words.simulated,
    failedHeading: words.failed,
    needsHeading: words.needs,
    none: words.none,
    openLine: words.open,
    ruleTitle: (key) => title(RULE_TITLES, key, language),
    actionTitle: (key) => title(ACTION_TITLES, key, language),
    closing: "— Joblop"
  };
}
