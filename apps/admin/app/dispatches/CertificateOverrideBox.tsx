"use client";

import { useEffect, useState } from "react";
import { certificateLabel, isRequiredCertificateKey } from "@rwos/shared";
import { useLocale } from "../i18n/LocaleProvider";
import { usePageText } from "../i18n/pageText";
import type { PageText } from "../i18n/pageTextCore";

// Staff pre-check before offering a job or assigning a worker: lists the required certificates the
// worker misses (verified, unexpired documents only). Staff can proceed only by ticking the override,
// which the API records on the offer and logs in the audit trail (certificate.override).

export type CertificateOverride = Readonly<{ needed: boolean; override: boolean; reason: string }>;

type Copy = { missing: string; otherNote: string; tick: string; reason: string; already: string };
const copyText: PageText<Copy> = {
  en: {
    missing: "This worker does not hold every certificate the job requires:",
    otherNote: "“Other” certificates are checked by hand: open the worker's documents and verify it before overriding.",
    tick: "Override: I checked and approve this worker anyway (logged in the audit trail)",
    reason: "Why (optional)",
    already: "A certificate override is already recorded on this offer."
  },
  fr: {
    missing: "Ce travailleur ne détient pas tous les certificats exigés par l’emploi :",
    otherNote: "Les certificats « Autre » se vérifient à la main : ouvrez les documents du travailleur et vérifiez-le avant de passer outre.",
    tick: "Passer outre : j’ai vérifié et j’approuve quand même ce travailleur (consigné au journal d’audit)",
    reason: "Raison (facultatif)",
    already: "Une dérogation de certificat est déjà consignée pour cette offre."
  },
  ar: {
    missing: "لا يحمل هذا العامل كل الشهادات التي تتطلبها الوظيفة:",
    otherNote: "تُراجَع الشهادات «الأخرى» يدوياً: افتح مستندات العامل وتحقق منها قبل التجاوز.",
    tick: "تجاوز: تحققت وأوافق على هذا العامل رغم ذلك (يُسجَّل في سجل التدقيق)",
    reason: "السبب (اختياري)",
    already: "تجاوز الشهادة مسجَّل بالفعل على هذا العرض."
  }
};

export function CertificateOverrideBox({
  dispatchReviewId,
  workerIdentityId,
  workerOfferId,
  onChange
}: Readonly<{
  dispatchReviewId: string;
  workerIdentityId?: string;
  workerOfferId?: string;
  onChange: (value: CertificateOverride) => void;
}>) {
  const copy = usePageText(copyText);
  const locale = useLocale();
  const [check, setCheck] = useState<{ missing: string[]; other: string | null; overridden: boolean } | null>(null);
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    let live = true;
    const query = workerOfferId ? `workerOfferId=${encodeURIComponent(workerOfferId)}` : workerIdentityId ? `workerIdentityId=${encodeURIComponent(workerIdentityId)}` : null;
    if (!query) return;
    void fetch(`/api/dispatches/${encodeURIComponent(dispatchReviewId)}/certificate-check?${query}`, { cache: "no-store" })
      .then(async (r) => (r.ok ? ((await r.json()) as { missing?: string[]; required?: { other?: string | null }; overridden?: boolean }) : null))
      .then((payload) => {
        if (!live || !payload) return;
        setCheck({ missing: payload.missing ?? [], other: payload.required?.other ?? null, overridden: payload.overridden === true });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [dispatchReviewId, workerIdentityId, workerOfferId]);

  const needed = Boolean(check && check.missing.length > 0 && !check.overridden);
  useEffect(() => {
    onChange({ needed, override, reason });
  }, [needed, override, reason, onChange]);

  if (!check || check.missing.length === 0) return null;
  if (check.overridden) return <small>{copy.already}</small>;
  const names = check.missing.filter(isRequiredCertificateKey).map((key) => certificateLabel(key, locale, check.other));
  return (
    <div role="alert" style={{ border: "1px solid #dc2626", borderRadius: 8, padding: 10, display: "grid", gap: 6 }}>
      <strong>{copy.missing}</strong>
      <span>{names.join(", ")}</span>
      {check.missing.includes("other") ? <small>{copy.otherNote}</small> : null}
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
        <span>{copy.tick}</span>
      </label>
      {override ? (
        <label style={{ display: "grid", gap: 4 }}>
          <span>{copy.reason}</span>
          <input maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      ) : null}
    </div>
  );
}

/** Extra POST body fields for the override (empty unless staff ticked it). */
export function certificateOverrideBody(value: CertificateOverride | null): Record<string, unknown> {
  if (!value?.override) return {};
  return { certificateOverride: true, ...(value.reason.trim() ? { certificateOverrideReason: value.reason.trim() } : {}) };
}
