import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { dictionaries, LOCALES } from "../../i18n/strings";
import { ACCOUNT_DELETION_REQUEST_TEXT, requestAccountDeletion } from "./deleteAccountRules";

const here = __dirname;
const card = readFileSync(join(here, "DeleteAccountCard.tsx"), "utf8");
const profileScreen = readFileSync(join(here, "../profile/ProfileScreen.tsx"), "utf8");
const navigator = readFileSync(join(here, "../../navigation/WorkerNavigator.tsx"), "utf8");

function transport(over: { start?: unknown; person?: unknown } = {}) {
  return {
    startContactConversation: vi.fn(async () => (over.start ?? { status: "ready", id: "conv-1" }) as never),
    askForPerson: vi.fn(async () => (over.person ?? { status: "ready" }) as never)
  };
}

describe("in-app account deletion request", () => {
  it("writes the request as an account conversation and hands it to a person", async () => {
    const t = transport();
    expect(await requestAccountDeletion(t, "fr")).toEqual({ status: "sent" });
    expect(t.startContactConversation).toHaveBeenCalledWith({ text: ACCOUNT_DELETION_REQUEST_TEXT, topic: "account", locale: "fr" });
    expect(t.askForPerson).toHaveBeenCalledWith("conv-1", "fr");
  });

  it("is not sent when the request could not be written", async () => {
    for (const status of ["offline", "denied", "error"] as const) {
      const t = transport({ start: { status } });
      expect(await requestAccountDeletion(t, "en")).toEqual({ status: status === "error" ? "failed" : status, conversationId: null });
      expect(t.askForPerson).not.toHaveBeenCalled();
    }
  });

  it("is not sent until staff have it, and a retry does not write it twice", async () => {
    const first = transport({ person: { status: "offline" } });
    expect(await requestAccountDeletion(first, "en")).toEqual({ status: "offline", conversationId: "conv-1" });
    const retry = transport();
    expect(await requestAccountDeletion(retry, "en", "conv-1")).toEqual({ status: "sent" });
    expect(retry.startContactConversation).not.toHaveBeenCalled();
    expect(retry.askForPerson).toHaveBeenCalledWith("conv-1", "en");
  });

  it("has every word in English, French and Arabic", () => {
    const keys = Object.keys(dictionaries.en).filter((key) => key.startsWith("deleteAccount."));
    expect(keys.length).toBe(13);
    for (const locale of LOCALES) {
      for (const key of keys) expect(dictionaries[locale][key]?.length ?? 0).toBeGreaterThan(3);
    }
  });

  it("is on the signed-in Profile screen, asks before sending, then signs out", () => {
    expect(profileScreen).toContain("<DeleteAccountCard transport={transport} onSignOut={onSignOut} />");
    expect(navigator).toContain("onSignOut={() => void signOut()}");
    expect(card).toContain('testID="delete-account-start"');
    expect(card).toContain('testID="delete-account-confirm"');
    expect(card).toContain('testID="delete-account-cancel"');
    expect(card).toContain("deleteAccount.kept");
    expect(card).toContain("deleteAccount.timing");
    // Nothing leaves the app: no website link and no email to write.
    expect(card).not.toContain("Linking");
    expect(card).not.toContain("mailto:");
  });
});
