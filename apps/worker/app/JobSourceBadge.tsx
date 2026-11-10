"use client";

import { useT } from "./i18n/LocaleProvider";
import { outsideApplyUrl, outsideSiteName } from "./jobSource";

// One look for "where do I apply?" across the list, the map, the calendar and the job pages:
//   Joblop job    -> gold badge "Joblop job — apply here" and an "Apply here" button.
//   outside site  -> outlined badge "Outside site — you apply on their website" and an
//                    "Apply on <site>" button that opens the listing in a new tab.

export function JoblopJobBadge({ className = "" }: { className?: string }) {
  const t = useT();
  return <span className={`src-badge src-joblop ${className}`.trim()}>{t("src.joblopBadge")}</span>;
}

export function OutsideSiteBadge({ className = "" }: { className?: string }) {
  const t = useT();
  return <span className={`src-badge src-outside ${className}`.trim()}>{t("src.outsideBadge")}</span>;
}

/** "Apply on <site>" — opens the outside listing in a new tab. Renders nothing without a safe address. */
export function OutsideApplyLink({
  url,
  source,
  className = ""
}: {
  url: string | null | undefined;
  source?: string | null | undefined;
  className?: string;
}) {
  const t = useT();
  const href = outsideApplyUrl(url);
  if (!href) return null;
  const site = outsideSiteName(source, href) ?? t("src.theirSite");
  return (
    <a className={`src-apply ${className}`.trim()} href={href} target="_blank" rel="noopener noreferrer" title={t("src.newTab")}>
      {t("src.applyOn", { site })} <span aria-hidden="true">↗</span>
      <span className="sr-only"> ({t("src.newTab")})</span>
    </a>
  );
}
