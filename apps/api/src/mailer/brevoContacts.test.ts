import { describe, expect, it } from "vitest";

import { createMarketingContactSync, type ContactsFetch } from "./brevoContacts";

describe("marketing contact sync", () => {
  it("is a no-op when key or list id is missing", async () => {
    expect(createMarketingContactSync({ apiKey: undefined, listId: 7, enabled: true }).configured).toBe(false);
    const s = createMarketingContactSync({ apiKey: "k", listId: undefined, enabled: true });
    expect(s.configured).toBe(false);
    await expect(s.optIn({ email: "a@b.test" })).resolves.toEqual({ status: "skipped", reason: "not_configured" });
  });

  it("GATE: configured but disabled never calls the API", async () => {
    let called = false;
    const fetchImpl: ContactsFetch = async () => { called = true; return { ok: true, status: 201, async json() { return {}; } }; };
    const s = createMarketingContactSync({ apiKey: "k", listId: 7, enabled: false, fetch: fetchImpl });
    expect(s.configured).toBe(true);
    await expect(s.optIn({ email: "a@b.test" })).resolves.toEqual({ status: "skipped", reason: "disabled" });
    await expect(s.optOut({ email: "a@b.test" })).resolves.toEqual({ status: "skipped", reason: "disabled" });
    expect(called).toBe(false);
  });

  it("optIn upserts the contact into the list", async () => {
    let captured: Parameters<ContactsFetch> | null = null;
    const fetchImpl: ContactsFetch = async (u, i) => { captured = [u, i]; return { ok: true, status: 201, async json() { return {}; } }; };
    const s = createMarketingContactSync({ apiKey: "secret", listId: 42, enabled: true, fetch: fetchImpl });
    await expect(s.optIn({ email: "w@x.test" })).resolves.toEqual({ status: "synced" });
    expect(captured![0]).toBe("https://api.brevo.com/v3/contacts");
    expect(captured![1].headers["api-key"]).toBe("secret");
    const body = JSON.parse(captured![1].body) as Record<string, unknown>;
    expect(body.email).toBe("w@x.test");
    expect(body.listIds).toEqual([42]);
    expect(body.updateEnabled).toBe(true);
  });

  it("optOut removes the contact from the list only", async () => {
    let url = "";
    const fetchImpl: ContactsFetch = async (u) => { url = u; return { ok: true, status: 204, async json() { return {}; } }; };
    const s = createMarketingContactSync({ apiKey: "secret", listId: 42, enabled: true, fetch: fetchImpl });
    await expect(s.optOut({ email: "w@x.test" })).resolves.toEqual({ status: "synced" });
    expect(url).toBe("https://api.brevo.com/v3/contacts/lists/42/contacts/remove");
  });

  it("returns error (not throw) when the provider rejects", async () => {
    const s = createMarketingContactSync({ apiKey: "k", listId: 7, enabled: true, fetch: async () => ({ ok: false, status: 400, async json() { return {}; } }) });
    await expect(s.optIn({ email: "a@b.test" })).resolves.toEqual({ status: "error" });
  });
});
