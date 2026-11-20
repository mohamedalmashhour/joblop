import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEGAL_DOCUMENTS_VERSION } from "@rwos/shared";
import { dictionaries, LOCALES } from "../../i18n/strings";
import { ACCEPTED_LEGAL_VERSION, canCreateAccount, DEFAULT_WORKER_ORIGIN, legalUrl, workerOrigin } from "./legalLinkRules";

const here = __dirname;
const authScreen = readFileSync(join(here, "../worker-auth/WorkerAuthScreen.tsx"), "utf8");
const contactScreen = readFileSync(join(here, "../contact/ContactScreen.tsx"), "utf8");
const workerMessages = readFileSync(join(here, "../../../../worker/app/i18n/messages.ts"), "utf8");

describe("phone app legal links", () => {
  it("opens the worker website pages in the app's language", () => {
    expect(workerOrigin(undefined)).toBe(DEFAULT_WORKER_ORIGIN);
    expect(workerOrigin("http://insecure.example")).toBe(DEFAULT_WORKER_ORIGIN);
    expect(workerOrigin("https://joblop.com/")).toBe("https://joblop.com");
    expect(legalUrl("https://joblop.com", "privacy", "fr")).toBe("https://joblop.com/privacy?lang=fr");
    expect(legalUrl("https://joblop.com", "account-deletion", "ar")).toBe("https://joblop.com/account-deletion?lang=ar");
  });

  it("has Terms, Privacy and Delete my account words in English, French and Arabic", () => {
    for (const locale of LOCALES) {
      for (const key of ["legal.terms", "legal.privacy", "legal.deleteAccount", "legal.title", "auth.accept", "auth.mustAccept", "auth.smsConsent"]) {
        expect(dictionaries[locale][key]?.length ?? 0).toBeGreaterThan(3);
      }
    }
  });

  it("shows the links on sign-in/sign-up and on the signed-in Contact tab", () => {
    expect(authScreen).toContain("<LegalLinks />");
    expect(authScreen).toContain('<LegalLinks pages={["terms", "privacy"]} />');
    expect(contactScreen).toContain("<LegalLinks />");
  });
});

describe("phone app sign-up consent", () => {
  it("blocks sign-up until the box is ticked", () => {
    expect(canCreateAccount(false)).toBe(false);
    expect(canCreateAccount(true)).toBe(true);
    expect(authScreen).toContain('if (!canCreateAccount(accepted)) return setMessage(t("auth.mustAccept"));');
    expect(authScreen).toContain('disabled={busy || (mode === "sign-up" && !canCreateAccount(accepted))}');
    expect(authScreen).toContain('accessibilityRole="checkbox"');
  });

  it("sends the accepted Terms/Privacy version with the sign-up", () => {
    expect(ACCEPTED_LEGAL_VERSION).toBe(LEGAL_DOCUMENTS_VERSION);
    expect(authScreen).toContain("acceptedLegalVersion: ACCEPTED_LEGAL_VERSION");
  });

  it("uses the exact consent and SMS words of the worker website sign-up", () => {
    const pairs: readonly (readonly [string, string])[] = [
      ["auth.smsConsent", "hr.smsConsent"],
      ["auth.accept", "signup.accept"],
      ["auth.mustAccept", "signup.mustAccept"]
    ];
    for (const locale of LOCALES) {
      for (const [mobileKey, webKey] of pairs) {
        const text = dictionaries[locale][mobileKey]!;
        expect(workerMessages).toContain(`"${webKey}": ${JSON.stringify(text)}`);
      }
    }
    expect(dictionaries.en["auth.smsConsent"]).toContain("Reply STOP to cancel or HELP for help.");
  });
});
