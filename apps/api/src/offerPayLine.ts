import { isLongTermListingJob, longTermPaySentence, type WorkerPayRow } from "./longTermWorkerPay";
import { hourlyPayLine, inLanguage, type WorkerLanguage } from "./notifications/workerLanguage";

// The pay line written on a worker's job offer (the offer terms, the offer email and, once accepted,
// the schedule), in the WORKER's language. An offer is made to one worker, so the line is written
// once, when the offer is created, in the language stored on their account.
//
// Only the worker's own pay: the hourly rate W from the approval snapshot for a short-term job, or
// the employer's pay offer ("paid directly by the employer") for a long-term listing. Never the
// employer rate and never Joblop's share.

export type OfferPayJob = WorkerPayRow &
  Readonly<{
    pricingSnapshot: Readonly<{ workerHourlyRateMinor: number; currency: string; jobLength?: string | null }> | null;
  }>;

/** The pay part of an offer ("$25.00/h", "22 $/h, payé directement par l'employeur"), or null. */
export function offerPayLine(job: OfferPayJob, language: WorkerLanguage): string | null {
  if (isLongTermListingJob(job)) return longTermPaySentence(job, language);
  const snapshot = job.pricingSnapshot;
  if (!snapshot) return null;
  if (snapshot.jobLength === "long_term") {
    return inLanguage(language, {
      en: "Pay agreed and paid directly by the employer",
      fr: "Salaire convenu et payé directement par l'employeur",
      ar: "أجر متفق عليه يدفعه صاحب العمل مباشرة"
    });
  }
  return hourlyPayLine(snapshot.workerHourlyRateMinor, snapshot.currency, language);
}

/** The default offer compensation: pay, employer and area ("$25.00/h at Résidence X, Laval, QC"). */
export function defaultOfferCompensationLine(
  job: OfferPayJob & Readonly<{ organization: Readonly<{ displayName: string }>; residence: Readonly<{ city: string | null; province: string | null }> }>,
  language: WorkerLanguage
): string | null {
  const pay = offerPayLine(job, language);
  if (!pay) return null;
  const area = [job.residence.city, job.residence.province].filter(Boolean).join(", ");
  const where = `${job.organization.displayName}${area ? `, ${area}` : ""}`;
  return inLanguage(language, {
    en: `${pay} at ${where}`,
    fr: `${pay} chez ${where}`,
    ar: `${pay} لدى ${where}`
  });
}
