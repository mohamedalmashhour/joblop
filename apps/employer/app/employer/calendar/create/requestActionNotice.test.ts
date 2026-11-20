import { describe, expect, it } from "vitest";
import type { Translate } from "../../../i18n/LocaleProvider";
import { requestActionNotice } from "./requestActionNotice";

const t = ((key: string, vars?: Record<string, string>) =>
  vars ? `${key}:${vars.fields}` : key) as unknown as Translate;

const base = { editing: true, message: "status line", rateUnpriced: false, missingFields: [], t };

describe("requestActionNotice", () => {
  it("explains a disabled button when the contract does not price the role", () => {
    expect(requestActionNotice({ ...base, rateUnpriced: true, missingFields: ["Title"] })).toBe(
      "create.gateUnpriced"
    );
  });

  it("lists what is still missing while editing", () => {
    expect(requestActionNotice({ ...base, missingFields: ["Title", "Starts"] })).toBe(
      "create.msgCompleteList:Title, Starts"
    );
  });

  it("repeats the status line once the form is complete", () => {
    expect(requestActionNotice(base)).toBe("status line");
  });

  it("shows the submit result rather than an old form problem after editing ends", () => {
    expect(
      requestActionNotice({
        ...base,
        editing: false,
        message: "Request JR-1 was submitted for review.",
        rateUnpriced: true,
        missingFields: ["Title"]
      })
    ).toBe("Request JR-1 was submitted for review.");
  });
});
