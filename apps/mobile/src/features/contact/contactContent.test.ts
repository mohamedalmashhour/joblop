import { describe, expect, it } from "vitest";
import { dictionaries, LOCALES, translate } from "../../i18n/strings";
import {
  QUICK_TOPICS,
  applyQuickTopic,
  authorLabelKey,
  canAskForPerson,
  quickTopicKey,
  quickTopicOf,
  shiftDraft,
  statusKey,
  statusTone,
  topicKey
} from "./contactContent";

describe("contact content", () => {
  it("maps the quick topics to API topics, with urgent as topic other + urgent", () => {
    expect(applyQuickTopic("shift")).toEqual({ topic: "shift", urgent: false });
    expect(applyQuickTopic("pay")).toEqual({ topic: "pay", urgent: false });
    expect(applyQuickTopic("account")).toEqual({ topic: "account", urgent: false });
    expect(applyQuickTopic("urgent")).toEqual({ topic: "other", urgent: true });
    expect(quickTopicOf({ topic: "other", urgent: true })).toBe("urgent");
    expect(quickTopicOf({ topic: "documents", urgent: false })).toBeNull();
  });

  // The chips now use the website's words (owner rule: the app copies the website), round 7.
  it("uses the website's chip wording for each status", () => {
    expect(translate("en", statusKey("ai"))).toBe("With AI assistant");
    expect(translate("en", statusKey("needs_admin"))).toBe("Waiting for the Joblop team");
    expect(translate("en", statusKey("admin_replied"))).toBe("Joblop team replied");
    expect(translate("en", statusKey("solved"))).toBe("Solved");
    expect(statusTone("needs_admin")).toBe("warning");
  });

  it("labels assistant and staff bubbles, not the worker's or system notes", () => {
    expect(dictionaries.en[authorLabelKey("ai") ?? ""]).toBe("Joblop assistant");
    expect(dictionaries.en[authorLabelKey("admin") ?? ""]).toBe("Joblop team");
    expect(authorLabelKey("requester")).toBeNull();
    expect(authorLabelKey("system")).toBeNull();
  });

  it("offers Talk to a person only while the assistant is answering", () => {
    expect(canAskForPerson("ai")).toBe(true);
    expect(canAskForPerson("needs_admin")).toBe(false);
    expect(canAskForPerson("admin_replied")).toBe(false);
    expect(canAskForPerson("solved")).toBe(false);
  });

  it("has a translation for every topic and quick topic key in all locales", () => {
    const keys = [...QUICK_TOPICS.map(quickTopicKey), topicKey("documents"), topicKey("other"), topicKey("unknown")];
    // Some topics now come from the website's words (WEB_COPY), so check what the app shows.
    for (const locale of LOCALES) {
      for (const key of keys) expect(translate(locale, key), `${locale} ${key}`).not.toBe(key);
    }
    expect(topicKey("unknown")).toBe("contact.topic.other");
  });

  it("prefills a shift draft linked to the assignment", () => {
    const draft = shiftDraft({ title: "Line cook", startAt: "2026-11-10T14:00:00.000Z", refId: "a1" }, "en", "About my shift: {label}. ");
    expect(draft.topic).toBe("shift");
    expect(draft.assignmentId).toBe("a1");
    expect(draft.label).toContain("Line cook");
    expect(draft.text.startsWith("About my shift: Line cook · ")).toBe(true);
  });
});
