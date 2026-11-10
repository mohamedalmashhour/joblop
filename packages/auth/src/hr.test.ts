import { beforeEach, describe, expect, it } from "vitest";
import {
  createHrService,
  HrError,
  type HrCaseRecord,
  type HrCredentialRecord,
  type HrEventInput,
  type HrIntakeRecord,
  type HrProfileRecord,
  type HrStore,
  type Page
} from "./hr";
import { deriveCredentialStatus, canTransitionCase } from "./hrDomain";

type Mut<T> = { -readonly [K in keyof T]: T[K] };
type StoredCred = Mut<Omit<HrCredentialRecord, "effectiveStatus">>;

function makeStore() {
  const profiles: Mut<HrProfileRecord>[] = [];
  const creds: StoredCred[] = [];
  const cases: Mut<HrCaseRecord>[] = [];
  const events: HrEventInput[] = [];
  const intakes: Record<string, HrIntakeRecord> = {};
  let seq = 0;
  const iso = () => new Date(1_700_000_000_000 + seq * 1000).toISOString();
  const store: HrStore = {
    async getProfile(w) { return profiles.find((p) => p.workerIdentityId === w) ?? null; },
    // Mirrors the unique worker index: a second create for the same worker loses.
    async createProfile(w) { if (profiles.some((p) => p.workerIdentityId === w)) return null; const p = { id: `pr-${seq++}`, workerIdentityId: w, standing: "active" as const, standingReason: null, updatedAt: iso() }; profiles.push(p); return { ...p }; },
    async setStanding({ workerIdentityId, standing, reason }) { const p = profiles.find((x) => x.workerIdentityId === workerIdentityId)!; p.standing = standing; p.standingReason = reason; return { ...p }; },
    async getIntake(w) { return intakes[w] ?? null; },
    async upsertIntake({ workerIdentityId, data }) {
      const prev: HrIntakeRecord = intakes[workerIdentityId] ?? { legalFirstName: null, legalLastName: null, phone: null, addressLine: null, city: null, province: null, postalCode: null, hasDrivingLicence: false, licenceClass: null, licenceExpiry: null, hasVehicle: false, vehicleType: null, canTravelKm: null, transportNotes: null, marketingEmailOptIn: false, updatedAt: iso() };
      const next: HrIntakeRecord = { ...prev, ...data, updatedAt: iso() };
      intakes[workerIdentityId] = next;
      return next;
    },
    async listCredentials(w) { return creds.filter((c) => c.workerIdentityId === w).map((c) => ({ ...c })); },
    async getCredential(id) { const c = creds.find((x) => x.id === id); return c ? { ...c } : null; },
    async addCredential(input) { const c: StoredCred = { id: `cr-${seq++}`, workerIdentityId: input.workerIdentityId, credentialType: input.credentialType, issuer: input.issuer, issuedAt: input.issuedAt?.toISOString() ?? null, expiresAt: input.expiresAt?.toISOString() ?? null, status: "valid", verificationReference: input.verificationReference, supersededById: null, updatedAt: iso() }; creds.push(c); return { ...c }; },
    async setCredentialStatus({ id, status, supersededById }) { const c = creds.find((x) => x.id === id)!; c.status = status; if (supersededById !== undefined) c.supersededById = supersededById; return { ...c }; },
    async createCase(input) { const k: Mut<HrCaseRecord> = { id: `ca-${seq++}`, workerIdentityId: input.workerIdentityId, caseType: input.caseType, status: "opened", reason: input.reason, openedByUserId: input.openedByUserId, createdAt: iso(), updatedAt: iso() }; cases.push(k); return { ...k }; },
    async getCase(id) { const k = cases.find((x) => x.id === id); return k ? { ...k } : null; },
    async setCaseStatus({ id, status }) { const k = cases.find((x) => x.id === id)!; k.status = status; return { ...k }; },
    async listCasesForWorker(w) { return cases.filter((c) => c.workerIdentityId === w).map((c) => ({ ...c })); },
    async listWorkerEvents({ workerIdentityId, limit }) { return { items: events.filter((e) => e.workerIdentityId === workerIdentityId).slice(0, limit).map((e, i) => ({ id: `ev-${i}`, subjectType: e.subjectType, subjectId: e.subjectId, eventType: e.eventType, priorState: e.priorState ?? null, newState: e.newState, reason: e.reason ?? null, source: e.source, actorUserId: e.actorUserId ?? null, correlationId: e.correlationId ?? null, createdAt: iso() })), nextCursor: null }; },
    async pageByStanding({ standings, limit }) { return { items: profiles.filter((p) => standings.includes(p.standing)).slice(0, limit).map((p) => ({ workerIdentityId: p.workerIdentityId, displayName: null, standing: p.standing, updatedAt: p.updatedAt })), nextCursor: null }; },
    async searchWorkers({ limit }) { return { items: profiles.slice(0, limit).map((p) => ({ workerIdentityId: p.workerIdentityId, displayName: null, standing: p.standing, updatedAt: p.updatedAt })), nextCursor: null }; },
    async pageExpiringCredentials({ limit }): Promise<Page<StoredCred>> { return { items: creds.slice(0, limit).map((c) => ({ ...c })), nextCursor: null }; },
    async pageReviewCases({ limit, statuses }): Promise<Page<HrCaseRecord>> { return { items: cases.filter((c) => statuses.includes(c.status)).slice(0, limit).map((c) => ({ ...c })), nextCursor: null }; },
    async appendEvent(e) { events.push(e); }
  };
  return { store, profiles, creds, cases, events };
}

function makeService(over?: { worker?: { workerIdentityId: string } | null }) {
  const ctx = makeStore();
  const service = createHrService({
    workers: { async resolveByUserId() { return over && "worker" in over ? over.worker ?? null : { workerIdentityId: "w-1" }; } },
    store: ctx.store,
    now: () => new Date("2026-08-11T00:00:00.000Z")
  });
  return { service, ...ctx };
}

describe("HR domain rules", () => {
  const now = new Date("2026-08-11T00:00:00.000Z");
  it("credential expiry is first-class: valid → expiring → expired; terminal preserved", () => {
    expect(deriveCredentialStatus({ storedStatus: "valid", expiresAt: null, now })).toBe("valid");
    expect(deriveCredentialStatus({ storedStatus: "valid", expiresAt: "2027-01-01T00:00:00Z", now })).toBe("valid");
    expect(deriveCredentialStatus({ storedStatus: "valid", expiresAt: "2026-08-20T00:00:00Z", now })).toBe("expiring"); // within 30d
    expect(deriveCredentialStatus({ storedStatus: "valid", expiresAt: "2020-01-01T00:00:00Z", now })).toBe("expired");
    // once-verified/terminal history is never recomputed as valid
    expect(deriveCredentialStatus({ storedStatus: "replaced", expiresAt: "2027-01-01T00:00:00Z", now })).toBe("replaced");
    expect(deriveCredentialStatus({ storedStatus: "revoked", expiresAt: "2027-01-01T00:00:00Z", now })).toBe("revoked");
  });
  it("case transitions follow the governed lifecycle", () => {
    expect(canTransitionCase("opened", "under_review")).toBe(true);
    expect(canTransitionCase("opened", "resolved")).toBe(false);
    expect(canTransitionCase("under_review", "action_required")).toBe(true);
    expect(canTransitionCase("resolved", "closed")).toBe(true);
    expect(canTransitionCase("closed", "opened")).toBe(false);
  });
});

describe("HR service", () => {
  let ctx: ReturnType<typeof makeService>;
  beforeEach(() => { ctx = makeService(); });

  it("worker self-view creates a profile lazily and never exposes cases", async () => {
    const view = await ctx.service.getWorkerSelfView({ userId: "u-1" });
    expect(view.standing).toBe("active");
    expect(view.credentials).toEqual([]);
    expect(ctx.profiles).toHaveLength(1);
    expect("cases" in view).toBe(false);
  });

  it("standing is a governed, audited decision — independent of verification", async () => {
    const updated = await ctx.service.setStanding({ actorUserId: "hr-1", workerIdentityId: "w-1", standing: "suspended", reason: "policy" });
    expect(updated.standing).toBe("suspended");
    expect(ctx.events.some((e) => e.eventType === "standing_changed" && e.newState === "suspended" && e.actorUserId === "hr-1")).toBe(true);
  });

  it("two first-time standing changes for the same worker both land (lazy profile create race)", async () => {
    // Neither request sees a profile, both try to create one; the loser must reuse the winner's
    // profile instead of failing and dropping its standing change.
    await Promise.all([
      ctx.service.setStanding({ actorUserId: "hr-a", workerIdentityId: "w-new", standing: "restricted", reason: "A" }),
      ctx.service.setStanding({ actorUserId: "hr-b", workerIdentityId: "w-new", standing: "suspended", reason: "B" })
    ]);
    expect(ctx.profiles.filter((p) => p.workerIdentityId === "w-new")).toHaveLength(1);
    const forWorker = ctx.events.filter((e) => e.workerIdentityId === "w-new");
    expect(forWorker.filter((e) => e.eventType === "standing_changed")).toHaveLength(2);
    expect(forWorker.filter((e) => e.eventType === "profile_created")).toHaveLength(1);
    expect(["restricted", "suspended"]).toContain(ctx.profiles.find((p) => p.workerIdentityId === "w-new")!.standing);
  });

  it("rejects an unknown standing", async () => {
    await expect(ctx.service.setStanding({ actorUserId: "hr-1", workerIdentityId: "w-1", standing: "banana" })).rejects.toMatchObject({ code: "invalid" });
  });

  it("renewing a credential preserves history (old replaced + linked)", async () => {
    const cred = await ctx.service.addCredential({ actorUserId: "hr-1", workerIdentityId: "w-1", credentialType: "food_handler", expiresAt: "2026-09-01T00:00:00Z" });
    const { old, renewed } = await ctx.service.renewCredential({ actorUserId: "hr-1", credentialId: cred.id, expiresAt: "2027-09-01T00:00:00Z" });
    expect(old.status).toBe("replaced");
    expect(old.supersededById).toBe(renewed.id);
    expect(renewed.effectiveStatus).toBe("valid");
    // both the add + replace are audited
    expect(ctx.events.filter((e) => e.subjectType === "credential").length).toBeGreaterThanOrEqual(3);
  });

  it("expired credential reads as expired via effectiveStatus", async () => {
    const cred = await ctx.service.addCredential({ actorUserId: "hr-1", workerIdentityId: "w-1", credentialType: "wl", expiresAt: "2020-01-01T00:00:00Z" });
    const view = await ctx.service.getWorkerHrRecord("w-1");
    const found = view.credentials.find((c) => c.id === cred.id)!;
    expect(found.effectiveStatus).toBe("expired");
  });

  it("case lifecycle is governed + audited; illegal transitions are rejected", async () => {
    const c = await ctx.service.openCase({ actorUserId: "hr-1", workerIdentityId: "w-1", caseType: "conduct", reason: "report" });
    expect(c.status).toBe("opened");
    await expect(ctx.service.transitionCase({ actorUserId: "hr-1", caseId: c.id, to: "resolved" })).rejects.toMatchObject({ code: "conflict" });
    const r1 = await ctx.service.transitionCase({ actorUserId: "hr-1", caseId: c.id, to: "under_review" });
    expect(r1.status).toBe("under_review");
    const r2 = await ctx.service.transitionCase({ actorUserId: "hr-1", caseId: c.id, to: "resolved" });
    expect(r2.status).toBe("resolved");
    expect(ctx.events.filter((e) => e.subjectType === "case").length).toBe(3); // opened + 2 transitions
  });

  it("a non-worker cannot use the worker self-view", async () => {
    const svc = makeService({ worker: null }).service;
    await expect(svc.getWorkerSelfView({ userId: "x" })).rejects.toBeInstanceOf(HrError);
  });

  it("review queue is bounded + only actionable statuses", async () => {
    await ctx.service.openCase({ actorUserId: "hr-1", workerIdentityId: "w-1", caseType: "a" });
    const open = await ctx.service.openCase({ actorUserId: "hr-1", workerIdentityId: "w-1", caseType: "b" });
    await ctx.service.transitionCase({ actorUserId: "hr-1", caseId: open.id, to: "closed" });
    const page = await ctx.service.pageReviewCases({ limit: 10 });
    expect(page.items.every((c) => ["opened", "under_review", "action_required"].includes(c.status))).toBe(true);
    expect(page.items).toHaveLength(1); // the closed one is excluded
  });
});
