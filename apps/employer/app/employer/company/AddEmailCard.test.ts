import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { interpolate, supportedEmployerLocales, type EmployerLocale } from "../../i18n/config";
import { dictionaries, type MessageKey } from "../../i18n/messages";
import { AddEmailCardView, type AddEmailCardViewProps } from "./AddEmailCard";

function translator(locale: EmployerLocale) {
  return (key: MessageKey, vars?: Readonly<Record<string, string | number>>) => {
    const value = dictionaries[locale][key];
    if (value === undefined) throw new Error(`Missing ${locale} message: ${key}`);
    return interpolate(value, vars);
  };
}

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");

function render(locale: EmployerLocale, overrides: Partial<AddEmailCardViewProps> = {}) {
  const noop = () => undefined;
  return renderToStaticMarkup(
    createElement(AddEmailCardView, {
      t: translator(locale),
      phase: "form",
      email: "",
      sentTo: "boss@example.test",
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

describe("employer Add your email card", () => {
  it.each(supportedEmployerLocales)("shows one email field and a gold Send button in %s", (locale) => {
    const t = translator(locale);
    const html = render(locale);
    expect(html).toContain(escapeHtml(t("addEmail.title")));
    expect(html).toContain(escapeHtml(t("addEmail.send")));
    expect(html.split("<input").length - 1).toBe(1);
    // Black text on the gold (#F8B808) action button.
    expect(html).toMatch(/background:#(F8B808|f8b808)[^"]*color:#000000/);
  });

  it.each(supportedEmployerLocales)("then says check your inbox, with a resend option, in %s", (locale) => {
    const t = translator(locale);
    const html = render(locale, { phase: "sent" });
    expect(html).toContain(escapeHtml(t("addEmail.checkInbox")));
    expect(html).toContain(escapeHtml(t("addEmail.resend")));
    expect(html).toContain(escapeHtml(t("addEmail.sentTo", { email: "boss@example.test" })));
  });

  it("shows the clear in-use error", () => {
    expect(render("en-CA", { errorKey: "addEmail.inUse" })).toContain("This email is already used by another account");
  });

  it("has every text in EN, FR and AR", () => {
    const keys = (Object.keys(dictionaries["en-CA"]) as MessageKey[]).filter((key) => key.startsWith("addEmail."));
    expect(keys.length).toBeGreaterThanOrEqual(14);
    for (const locale of supportedEmployerLocales) {
      for (const key of keys) expect(typeof dictionaries[locale][key], `${locale} ${key}`).toBe("string");
    }
  });

  it("is placed on the company details page", () => {
    expect(readFileSync(join(__dirname, "page.tsx"), "utf8")).toContain("<AddEmailCard />");
  });
});
