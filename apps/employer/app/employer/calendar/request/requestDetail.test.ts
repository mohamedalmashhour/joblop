import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ar, en, fr } from "../../../i18n/messages";
import { requestCertificates } from "./requestDetailText";

const read = (file: string) => readFileSync(join(__dirname, file), "utf8");

describe("request detail certificates", () => {
  const label = (key: string) => (key === "whmis" ? "WHMIS" : key);

  it("shows the certificates chosen on the form", () => {
    expect(requestCertificates(["whmis"], ["old"], label)).toEqual(["WHMIS"]);
  });

  it("falls back to the older list and never shows 'no' as a certificate", () => {
    expect(requestCertificates(null, ["no"], label)).toEqual([]);
    expect(requestCertificates([], ["None", " Forklift "], label)).toEqual(["Forklift"]);
  });
});

describe("request detail page", () => {
  const panel = read("ClientRequestDetailPanel.tsx");
  const page = read("page.tsx");
  const all = ["ClientRequestDetailPanel.tsx", "page.tsx", "DuplicateRequestButton.tsx", "EditRequestPanel.tsx", "AddWorkersPanel.tsx", "ReduceWorkersPanel.tsx", "CancelRequestPanel.tsx"]
    .map(read)
    .join("\n");

  it("has no developer jargon or leftover verification cards", () => {
    for (const jargon of [
      "Connected calendar",
      "Client-authorized",
      "intentionally absent",
      "Persisted client request",
      "Edit persisted draft",
      "Qualifications",
      "Contract verification",
      "Payment readiness",
      "Location verification",
      "request.verification"
    ]) {
      expect(all).not.toContain(jargon);
    }
  });

  it("is translated: the page and its action panels read every label from the catalogue", () => {
    expect(page).toContain('m["page.requestDetailTitle"]');
    expect(panel).toContain('t("create.editDraft")');
    expect(panel).toContain('"detail.certificates"');
    expect(panel).toContain('t("detail.none")');
    for (const key of ["page.requestDetailTitle", "detail.certificates", "detail.none", "detail.duplicate", "cancel.open", "reduce.open", "add.open", "edit.open"] as const) {
      expect(en[key]).toBeTruthy();
      expect(fr[key]).toBeTruthy();
      expect(ar[key]).toBeTruthy();
    }
    expect(en["create.editDraft"]).toBe("Edit draft");
    expect(en["detail.certificates"]).toBe("Required certificates");
    expect(en["detail.none"]).toBe("None");
  });

  it("uses the small status chip and one compact action row", () => {
    expect(panel).toContain("<RequestStatusChip request={request} />");
    expect(panel).not.toContain("statusBadge");
    expect(panel).toContain('className="employer-action-row no-print"');
    expect(panel).not.toContain("marginTop: 14");
  });

  it("offers only Duplicate request on cancelled or finished requests", () => {
    expect(panel).toContain("const closed = isClosedPhase(phase);");
    for (const action of ["<EditRequestPanel", "<AddWorkersPanel", "<ReduceWorkersPanel", "<CancelRequestPanel"]) {
      const line = panel.split("\n").find((text) => text.includes(action)) ?? "";
      const guarded = panel.slice(Math.max(0, panel.indexOf(action) - 80), panel.indexOf(action));
      expect(`${guarded}${line}`).toContain("!closed");
    }
    const duplicate = panel.slice(Math.max(0, panel.indexOf("<DuplicateRequestButton") - 40), panel.indexOf("<DuplicateRequestButton"));
    expect(duplicate).not.toContain("!closed");
  });

  it("never shows worker pay or Joblop's margin", () => {
    expect(all).not.toMatch(/workerPay|payRate|platformMargin|marginMinor|hourlyShare|compensation/i);
  });
});
