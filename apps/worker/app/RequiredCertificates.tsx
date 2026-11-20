"use client";

import {
  certificateKeysFromReasons,
  certificateLabel,
  isRequiredCertificateKey,
  missingCertificatesNotice,
  type RequiredCertificateKey
} from "@rwos/shared";
import { useLocale, useT } from "./i18n/LocaleProvider";

// The certificates an employer requires on a job, as the worker sees them (EN / FR / AR), and the
// notice when the worker misses one ("This job needs: PAB certificate. Add it on your Documents page.").
// The server decides; this only shows what it said.

export type RequiredCertificatesData = Readonly<{ keys: readonly string[]; other: string | null }>;

export function cleanKeys(keys: readonly string[] | null | undefined): RequiredCertificateKey[] {
  return (keys ?? []).filter(isRequiredCertificateKey);
}

/** Small chip for a job card. */
export function CertificateChip({ required }: { required: RequiredCertificatesData | null | undefined }) {
  const t = useT();
  const locale = useLocale();
  const keys = cleanKeys(required?.keys);
  if (keys.length === 0) return null;
  const names = keys.map((k) => certificateLabel(k, locale, required?.other)).join(", ");
  return (
    <span className="chip" title={names}>
      <span aria-hidden="true">🎓 </span>
      {t("job.certsChip")}: <bdi>{names}</bdi>
    </span>
  );
}

/** Notice + link to Documents for missing certificates (from the API's list or its reason codes). */
export function MissingCertificatesNotice({
  missing,
  reasons,
  other
}: {
  missing?: readonly string[] | null;
  reasons?: readonly string[] | null;
  other?: string | null;
}) {
  const t = useT();
  const locale = useLocale();
  const keys = missing ? cleanKeys(missing) : certificateKeysFromReasons(reasons ?? []);
  const notice = missingCertificatesNotice(keys, locale, other ?? null);
  if (!notice) return null;
  return (
    <p className="notice" role="status">
      <bdi>{notice}</bdi>{" "}
      <a href="/documents">{t("job.certsGoToDocuments")}</a>
    </p>
  );
}

/** Section on the job page: each required certificate, with whether the worker has it. */
export function RequiredCertificatesSection({
  required,
  missing
}: {
  required: RequiredCertificatesData | null | undefined;
  missing: readonly string[] | null | undefined;
}) {
  const t = useT();
  const locale = useLocale();
  const keys = cleanKeys(required?.keys);
  if (keys.length === 0) return null;
  const missingSet = new Set(cleanKeys(missing));
  return (
    <section className="detail-section" aria-labelledby="required-certs">
      <h2 id="required-certs">{t("job.certsTitle")}</h2>
      <ul className="quals">
        {keys.map((key) => (
          <li key={key}>
            <bdi>{certificateLabel(key, locale, required?.other)}</bdi>
            {missing === null || missing === undefined ? null : key === "other" ? (
              <span className="muted"> — {t("job.certsOtherStaff")}</span>
            ) : missingSet.has(key) ? (
              <span className="chip status-rejected" style={{ marginInlineStart: 8 }}>{t("job.certsMissing")}</span>
            ) : (
              <span className="chip status-verified" style={{ marginInlineStart: 8 }}>{t("job.certsHave")}</span>
            )}
          </li>
        ))}
      </ul>
      <MissingCertificatesNotice missing={missing ?? []} other={required?.other ?? null} />
    </section>
  );
}
