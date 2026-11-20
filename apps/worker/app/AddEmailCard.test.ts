import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AddEmailCardView, isPlausibleEmail, type AddEmailCardViewProps } from "./AddEmailCard";
import { ConfirmEmailView, isConfirmToken, type ConfirmEmailPhase } from "./confirm-email/ConfirmEmail";
import { interpolate, supportedWorkerLocales, type WorkerLocale } from "./i18n/config";
import { dictionaries, type MessageKey } from "./i18n/messages";

function translator(locale: WorkerLocale) {
  return (key: MessageKey, vars?: Readonly<Record<string, string | number>>) => {
    const value = dictionaries[locale][key];
    if (value === undefined) throw new Error(`Missing ${locale} message: ${key}`);
    return interpolate(value, vars);
  };
}

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");

function renderCard(locale: WorkerLocale, overrides: Partial<AddEmailCardViewProps> = {}) {
  const noop = () => undefined;
  return renderToStaticMarkup(
    createElement(AddEmailCardView, {
      t: translator(locale),
      phase: "form",
      email: "",
      sentTo: "worker@example.test",
      cooldown: 0,
      errorKey: null,
      devLink: null,
      onEmailChange: noop,
      onSend: noop,
      onChange: noop,
      ...overrides
    })
  );
}

const read = (path: string) => readFileSync(join(__dirname, path), "utf8");

describe("worker Add your email card", () => {
  it.each(supportedWorkerLocales)("shows one email field and a Send button in %s", (locale) => {
    const t = translator(locale);
    const html = renderCard(locale);
    expect(html).toContain(escapeHtml(t("addEmail.title")));
    expect(html).toContain(escapeHtml(t("addEmail.body")));
    expect(html).toContain(escapeHtml(t("addEmail.send")));
    expect(html.split("<input").length - 1).toBe(1);
    expect(html).toContain('type="email"');
    expect(html).toContain('class="btn"');
  });

  it.each(supportedWorkerLocales)("then says check your inbox, with a resend option, in %s", (locale) => {
    const t = translator(locale);
    const html = renderCard(locale, { phase: "sent" });
    expect(html).toContain(escapeHtml(t("addEmail.checkInbox")));
    expect(html).toContain(escapeHtml(t("addEmail.sentTo", { email: "worker@example.test" })));
    expect(html).toContain(escapeHtml(t("addEmail.resend")));
    expect(html).not.toContain("<input");
    const waiting = renderCard(locale, { phase: "sent", cooldown: 42 });
    expect(waiting).toContain(escapeHtml(t("addEmail.resendIn", { seconds: 42 })));
  });

  it("shows the clear in-use error", () => {
    expect(renderCard("en-CA", { errorKey: "addEmail.inUse" })).toContain(
      "This email is already used by another account"
    );
  });

  it("has every add/confirm text in EN, FR and AR", () => {
    const keys = (Object.keys(dictionaries["en-CA"]) as MessageKey[]).filter(
      (key) => key.startsWith("addEmail.") || key.startsWith("confirmEmail.")
    );
    expect(keys.length).toBeGreaterThanOrEqual(20);
    for (const locale of supportedWorkerLocales) {
      for (const key of keys) expect(typeof dictionaries[locale][key], `${locale} ${key}`).toBe("string");
    }
  });

  it("never mentions Joblop's share or rates", () => {
    for (const locale of supportedWorkerLocales) {
      for (const [key, value] of Object.entries(dictionaries[locale])) {
        if (key.startsWith("addEmail.") || key.startsWith("confirmEmail.")) {
          expect(value).not.toMatch(/%|\$|rate|taux|commission|share|part de|نسبة|عمولة/i);
        }
      }
    }
  });

  it("is placed on the dashboard and the HR profile page", () => {
    expect(read("MarketplaceExplorer.tsx")).toContain("<AddEmailCard />");
    expect(read("hr/page.tsx")).toContain("<AddEmailCard />");
  });

  it("checks email shape before sending", () => {
    expect(isPlausibleEmail("person@example.com")).toBe(true);
    expect(isPlausibleEmail("person@example")).toBe(false);
    expect(isPlausibleEmail("no at sign")).toBe(false);
  });
});

describe("worker confirm-email page", () => {
  const phases: ConfirmEmailPhase[] = ["ready", "done", "failed", "missing"];
  it.each(supportedWorkerLocales)("renders every state in %s", (locale) => {
    const t = translator(locale);
    const html = (phase: ConfirmEmailPhase) =>
      renderToStaticMarkup(createElement(ConfirmEmailView, { t, phase, onConfirm: () => undefined }));
    for (const phase of phases) expect(html(phase)).toContain(escapeHtml(t("confirmEmail.title")));
    expect(html("ready")).toContain(escapeHtml(t("confirmEmail.button")));
    expect(html("done")).toContain(escapeHtml(t("confirmEmail.done")));
    expect(html("failed")).toContain(escapeHtml(t("confirmEmail.failed")));
    expect(html("missing")).toContain(escapeHtml(t("confirmEmail.missing")));
  });

  it("only accepts a well-formed token", () => {
    expect(isConfirmToken("a".repeat(43))).toBe(true);
    expect(isConfirmToken("")).toBe(false);
    expect(isConfirmToken("abc")).toBe(false);
  });
});
