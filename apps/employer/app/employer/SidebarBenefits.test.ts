import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { interpolate, supportedEmployerLocales, type EmployerLocale } from "../i18n/config";
import { dictionaries, type MessageKey } from "../i18n/messages";
import {
  CONTACT_JOBLOP_ROUTE,
  REQUEST_WORKERS_ROUTE,
  SIDEBAR_BENEFITS,
  SidebarBenefitsView
} from "./SidebarBenefits";

function translator(locale: EmployerLocale) {
  return (key: MessageKey, vars?: Readonly<Record<string, string | number>>) => {
    const value = dictionaries[locale][key];
    if (value === undefined) throw new Error(`Missing ${locale} message: ${key}`);
    return interpolate(value, vars);
  };
}

function render(locale: EmployerLocale, reducedMotion: boolean) {
  return renderToStaticMarkup(
    createElement(SidebarBenefitsView, {
      dir: locale === "ar" ? "rtl" : "ltr",
      reducedMotion,
      t: translator(locale)
    })
  );
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("sidebar benefits card", () => {
  it.each(supportedEmployerLocales)("renders all 4 benefits in %s", (locale) => {
    const t = translator(locale);
    const html = render(locale, false);
    expect(SIDEBAR_BENEFITS).toHaveLength(4);
    expect(count(html, "data-benefit=")).toBe(4);
    for (const benefit of SIDEBAR_BENEFITS) {
      expect(html).toContain(escapeHtml(t(benefit.titleKey)));
      expect(html).toContain(escapeHtml(t(benefit.textKey)));
    }
    // Rotating mode: one benefit visible, the others hidden, and one dot per benefit.
    expect(count(html, " hidden=")).toBe(3);
    expect(count(html, "aria-pressed=")).toBe(4);
  });

  it("uses the same benefit keys in every language", () => {
    const keys = SIDEBAR_BENEFITS.flatMap((b) => [b.titleKey, b.textKey]).concat([
      "shell.benefits.label",
      "shell.benefits.dot"
    ] as MessageKey[]);
    for (const locale of supportedEmployerLocales) {
      const present = keys.filter((key) => typeof dictionaries[locale][key] === "string");
      expect(present).toHaveLength(keys.length);
    }
  });

  it("shows every benefit as a plain list when reduced motion is preferred", () => {
    const html = render("en-CA", true);
    expect(html).toContain("<ul");
    expect(count(html, "<li")).toBe(4);
    expect(html).not.toContain(" hidden=");
    expect(html).not.toContain("aria-pressed=");
  });

  it("links the gold button to request workers and the help benefit to Contact Joblop", () => {
    const html = render("en-CA", false);
    expect(REQUEST_WORKERS_ROUTE).toBe("/employer/calendar/create");
    expect(html).toContain(`href="${REQUEST_WORKERS_ROUTE}"`);
    expect(html).toContain(">Request workers</a>");
    expect(html).toContain(`href="${CONTACT_JOBLOP_ROUTE}"`);
    expect(html).toContain('background:#F8B808');
  });

  it("keeps the illustration decorative and the Arabic card readable", () => {
    const html = render("ar", false);
    expect(html).toContain('<svg aria-hidden="true"');
    expect(html).toContain("text-align:start");
    expect(html).toContain("طلب عمال");
  });

  it("is placed in the sidebar between the menu and the Secure workspace note", () => {
    const shell = readFileSync(new URL("./EmployerShell.tsx", import.meta.url), "utf8");
    const navEnd = shell.indexOf("</nav>");
    const card = shell.indexOf("<SidebarBenefits />");
    const note = shell.indexOf("styles.sidebarNote");
    expect(navEnd).toBeGreaterThan(0);
    expect(card).toBeGreaterThan(navEnd);
    expect(note).toBeGreaterThan(card);
    const css = readFileSync(new URL("../globals.css", import.meta.url), "utf8");
    expect(css).toMatch(/\(max-width: 720px\)[^{]*\{\s*\.employer-sidebar-benefits\s*\{\s*display: none/);
  });

  it("never mentions worker pay or margin", () => {
    for (const locale of supportedEmployerLocales) {
      const text = render(locale, true).replace(/<[^>]*>/g, " ").toLowerCase();
      expect(text).not.toMatch(/margin|worker pay|marge|salaire|هامش/);
    }
  });

  it("keeps the inline illustration small", () => {
    const source = readFileSync(new URL("./SidebarBenefits.tsx", import.meta.url), "utf8");
    const svg = source.slice(source.indexOf("<svg"), source.indexOf("</svg>") + 6);
    expect(svg.length).toBeLessThan(6 * 1024);
  });
});

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#x27;");
}
