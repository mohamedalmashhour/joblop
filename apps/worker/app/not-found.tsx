import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveWorkerLocale } from "./i18n/config";
import { dictionaries, type MessageKey } from "./i18n/messages";

// Branded, localized 404. Rendered inside the root layout, so it inherits <html lang/dir>, the
// locale provider and the footer — this component only supplies the main content. Server component
// (no hooks) so it resolves the locale the same way the layout does.
export default async function NotFound() {
  const store = await cookies();
  const locale = resolveWorkerLocale(store.get(LOCALE_COOKIE)?.value);
  const enDict = dictionaries["en-CA"];
  const m = dictionaries[locale] ?? enDict;
  const tr = (key: MessageKey) => m[key] ?? enDict[key] ?? key;

  return (
    <main className="wrap">
      <div className="state" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <div style={{ fontSize: 56, fontWeight: 800, color: "var(--gold, #f8b808)", lineHeight: 1 }}>404</div>
        <h1 style={{ marginTop: 12 }}>{tr("notFound.title")}</h1>
        <p style={{ marginTop: 6 }}>{tr("notFound.body")}</p>
        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <a className="btn" href="/">{tr("notFound.home")}</a>
          <a className="btn ghost" href="/browse">{tr("notFound.browse")}</a>
        </div>
      </div>
    </main>
  );
}
