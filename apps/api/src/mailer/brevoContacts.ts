// Marketing contact sync to a Brevo list (CASL step 2). Opt-in adds/updates the contact in the
// configured marketing list; opt-out removes them from that list (never deletes the contact or their
// transactional history). Gated: no-op unless the Brevo key + a numeric list id are present AND
// MARKETING_SYNC_ENABLED. Fail-soft — never throws into the caller; marketing sync must never block a
// profile save. SMS/transactional pipelines are unaffected.

export type ContactSyncResult =
  | Readonly<{ status: "synced" }>
  | Readonly<{ status: "skipped"; reason: "not_configured" | "disabled" | "no_recipient" }>
  | Readonly<{ status: "error" }>;

export interface MarketingContactSync {
  readonly configured: boolean;
  readonly enabled: boolean;
  optIn(input: { email: string }): Promise<ContactSyncResult>;
  optOut(input: { email: string }): Promise<ContactSyncResult>;
}

export type ContactsFetch = (
  input: string,
  init: Readonly<{ method: string; headers: Readonly<Record<string, string>>; body: string }>
) => Promise<Readonly<{ ok: boolean; status: number; json(): Promise<unknown> }>>;

const noop: MarketingContactSync = {
  configured: false,
  enabled: false,
  async optIn() {
    return { status: "skipped", reason: "not_configured" };
  },
  async optOut() {
    return { status: "skipped", reason: "not_configured" };
  }
};

export function createMarketingContactSync(options: {
  apiKey: string | undefined;
  listId: number | undefined;
  enabled: boolean;
  fetch?: ContactsFetch;
}): MarketingContactSync {
  const { apiKey, listId, enabled } = options;
  if (!apiKey || !listId || !Number.isInteger(listId)) return noop;
  const doFetch = options.fetch ?? fetch;
  const headers = { "api-key": apiKey, "content-type": "application/json", accept: "application/json" } as const;

  const guard = (email: string): ContactSyncResult | null => {
    if (!enabled) return { status: "skipped", reason: "disabled" };
    if (!email || !email.includes("@")) return { status: "skipped", reason: "no_recipient" };
    return null;
  };

  return {
    configured: true,
    enabled,
    async optIn(input) {
      const blocked = guard(input.email);
      if (blocked) return blocked;
      try {
        // Upsert the contact and ensure they are in the marketing list (updateEnabled = upsert).
        const r = await doFetch("https://api.brevo.com/v3/contacts", {
          method: "POST",
          headers,
          body: JSON.stringify({ email: input.email, listIds: [listId], updateEnabled: true })
        });
        // 201 created, 204 updated; Brevo returns 400 "Contact already exist" only when updateEnabled is
        // false, so with updateEnabled:true any 2xx is success.
        return r.ok ? { status: "synced" } : { status: "error" };
      } catch {
        return { status: "error" };
      }
    },
    async optOut(input) {
      const blocked = guard(input.email);
      if (blocked) return blocked;
      try {
        // Remove from the marketing list only (keeps the contact + its transactional record).
        const r = await doFetch(`https://api.brevo.com/v3/contacts/lists/${listId}/contacts/remove`, {
          method: "POST",
          headers,
          body: JSON.stringify({ emails: [input.email] })
        });
        return r.ok ? { status: "synced" } : { status: "error" };
      } catch {
        return { status: "error" };
      }
    }
  };
}
