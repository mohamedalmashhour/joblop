import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@rwos/database";
import {
  createPushSender,
  EXPO_PUSH_URL,
  isExpoPushToken,
  isPushPlatform,
  pushToWorkers,
  workerPushMessage,
  type PushFetch,
  type PushSender
} from "./pushSender";
import { sendsPush } from "./noticeChannels";

type Row = { token: string; userId: string; revokedAt: Date | null; language: string | null };

function fakePrisma(rows: Row[]) {
  const prisma = {
    pushToken: {
      findMany: async ({ where }: { where: { userId: { in: string[] }; revokedAt: null } }) =>
        rows
          .filter((r) => where.userId.in.includes(r.userId) && r.revokedAt === null)
          .map((r) => ({ token: r.token, user: { primaryLanguage: r.language } })),
      updateMany: async ({ where, data }: { where: { token: { in: string[] } }; data: { revokedAt: Date } }) => {
        let count = 0;
        for (const r of rows) {
          if (where.token.in.includes(r.token) && r.revokedAt === null) {
            r.revokedAt = data.revokedAt;
            count += 1;
          }
        }
        return { count };
      }
    }
  };
  return prisma as unknown as PrismaClient;
}

const token = (i: number) => `ExponentPushToken[device${String(i).padStart(6, "0")}]`;

describe("push token format", () => {
  it("accepts Expo push tokens and rejects anything else", () => {
    expect(isExpoPushToken("ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]")).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[abcDEF123_-xyz]")).toBe(true);
    expect(isExpoPushToken("ExponentPushToken[]")).toBe(false);
    expect(isExpoPushToken("ExponentPushToken[abc def]")).toBe(false);
    expect(isExpoPushToken("fcm:abcdefghijklmnop")).toBe(false);
    expect(isExpoPushToken(`ExponentPushToken[${"a".repeat(300)}]`)).toBe(false);
    expect(isExpoPushToken(42)).toBe(false);
    expect(isPushPlatform("ios")).toBe(true);
    expect(isPushPlatform("android")).toBe(true);
    expect(isPushPlatform("web")).toBe(true);
    expect(isPushPlatform("windows")).toBe(false);
  });
});

describe("Expo push sender", () => {
  it("batches at most 100 messages per request, with the access token when set", async () => {
    const rows: Row[] = Array.from({ length: 205 }, (_, i) => ({ token: token(i), userId: `u${i}`, revokedAt: null, language: null }));
    const calls: { url: string; headers: Record<string, string>; body: { to: string; title: string; data: unknown }[] }[] = [];
    const fetch: PushFetch = async (url, init) => {
      const body = JSON.parse(init.body) as { to: string; title: string; data: unknown }[];
      calls.push({ url, headers: { ...init.headers }, body });
      return { ok: true, status: 200, json: async () => ({ data: body.map(() => ({ status: "ok", id: "t" })) }) };
    };
    const sender = createPushSender({ prisma: fakePrisma(rows), fetch, accessToken: "expo-secret" });
    const result = await sender.send(rows.map((r) => r.userId), { title: "Hi", body: "There", data: { screen: "calendar" } });
    expect(result).toEqual({ sent: 205, failed: 0, revoked: 0 });
    expect(calls.map((c) => c.body.length)).toEqual([100, 100, 5]);
    expect(calls.every((c) => c.url === EXPO_PUSH_URL)).toBe(true);
    expect(calls[0]?.headers.authorization).toBe("Bearer expo-secret");
    expect(calls[0]?.body[0]).toMatchObject({ to: token(0), title: "Hi", data: { screen: "calendar" } });
  });

  it("sends nothing without a token, and no bearer header without EXPO_ACCESS_TOKEN", async () => {
    let called = 0;
    let auth: string | undefined;
    const fetch: PushFetch = async (_url, init) => {
      called += 1;
      auth = init.headers.authorization;
      return { ok: true, status: 200, json: async () => ({ data: [{ status: "ok" }] }) };
    };
    const sender = createPushSender({ prisma: fakePrisma([{ token: token(1), userId: "a", revokedAt: null, language: null }]), fetch });
    expect(await sender.send(["nobody"], { title: "t", body: "b", data: { screen: "pay" } })).toEqual({ sent: 0, failed: 0, revoked: 0 });
    expect(called).toBe(0);
    await sender.send(["a"], { title: "t", body: "b", data: { screen: "pay" } });
    expect(auth).toBeUndefined();
  });

  it("revokes a token Expo reports as DeviceNotRegistered, and stops sending to it", async () => {
    const rows: Row[] = [
      { token: token(1), userId: "a", revokedAt: null, language: null },
      { token: token(2), userId: "a", revokedAt: null, language: null }
    ];
    const sent: string[][] = [];
    const fetch: PushFetch = async (_url, init) => {
      const body = JSON.parse(init.body) as { to: string }[];
      sent.push(body.map((m) => m.to));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: body.map((m) =>
            m.to === token(2) ? { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } } : { status: "ok" }
          )
        })
      };
    };
    const sender = createPushSender({ prisma: fakePrisma(rows), fetch });
    expect(await sender.send(["a"], { title: "t", body: "b", data: { screen: "contact" } })).toEqual({ sent: 1, failed: 1, revoked: 1 });
    expect(rows[1]?.revokedAt).toBeInstanceOf(Date);
    await sender.send(["a"], { title: "t", body: "b", data: { screen: "contact" } });
    expect(sent[1]).toEqual([token(1)]);
  });

  it("never throws: a network failure or a bad answer is counted, not raised", async () => {
    const rows: Row[] = [{ token: token(1), userId: "a", revokedAt: null, language: null }];
    const down = createPushSender({ prisma: fakePrisma(rows), fetch: async () => { throw new Error("offline"); } });
    expect(await down.send(["a"], { title: "t", body: "b", data: { screen: "pay" } })).toEqual({ sent: 0, failed: 1, revoked: 0 });
    const http500 = createPushSender({ prisma: fakePrisma(rows), fetch: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
    expect((await http500.send(["a"], { title: "t", body: "b", data: { screen: "pay" } })).failed).toBe(1);
    const brokenDb = createPushSender({
      prisma: { pushToken: { findMany: async () => { throw new Error("db"); } } } as unknown as PrismaClient,
      fetch: async () => ({ ok: true, status: 200, json: async () => ({}) })
    });
    expect(await brokenDb.send(["a"], { title: "t", body: "b", data: { screen: "pay" } })).toEqual({ sent: 0, failed: 0, revoked: 0 });
  });

  it("writes each device's message in its owner's language, French by default", async () => {
    const rows: Row[] = [
      { token: token(1), userId: "fr-user", revokedAt: null, language: null },
      { token: token(2), userId: "en-user", revokedAt: null, language: "en" }
    ];
    let body: { to: string; title: string }[] = [];
    const fetch: PushFetch = async (_url, init) => {
      body = JSON.parse(init.body) as { to: string; title: string }[];
      return { ok: true, status: 200, json: async () => ({ data: body.map(() => ({ status: "ok" })) }) };
    };
    await pushToWorkers(createPushSender({ prisma: fakePrisma(rows), fetch }), ["fr-user", "en-user"], "shift_confirmed", { role: "Cook", jobRequestId: "job-1" });
    expect(body.find((m) => m.to === token(1))?.title).toBe("Vous avez obtenu le travail");
    expect(body.find((m) => m.to === token(2))?.title).toBe("You got the job");
  });
});

describe("worker push copy", () => {
  it("is short and opens the right screen", () => {
    for (const language of ["fr", "en"] as const) {
      const confirmed = workerPushMessage("shift_confirmed", language, { role: "Préposé", jobRequestId: "j1" });
      expect(confirmed.data).toEqual({ screen: "calendar", jobRequestId: "j1" });
      expect(workerPushMessage("shift_reminder", language, { jobRequestId: "j1" }).data.screen).toBe("calendar");
      expect(workerPushMessage("shift_cancelled", language).data.screen).toBe("calendar");
      expect(workerPushMessage("shift_changed", language).data.screen).toBe("calendar");
      expect(workerPushMessage("staff_replied", language, { conversationId: "c1" }).data).toEqual({ screen: "contact", conversationId: "c1" });
      expect(workerPushMessage("payout_paid", language).data).toEqual({ screen: "pay" });
      for (const kind of ["shift_confirmed", "shift_reminder", "shift_cancelled", "shift_changed", "staff_replied", "payout_paid"] as const) {
        const message = workerPushMessage(kind, language, { role: "A role name" });
        expect(message.title.length).toBeLessThanOrEqual(40);
        expect(message.body.length).toBeLessThanOrEqual(120);
      }
    }
  });

  it("push is a channel only for urgent and shift notices, staff replies and pay sent", () => {
    expect(sendsPush("shift_confirmed")).toBe(true);
    expect(sendsPush("shift_cancelled")).toBe(true);
    expect(sendsPush("staff_replied")).toBe(true);
    expect(sendsPush("payout_paid")).toBe(true);
    expect(sendsPush("invoice_sent")).toBe(false);
    expect(sendsPush("sign_in_code")).toBe(false);
  });

  it("a push failure never reaches the caller", async () => {
    const failing: PushSender = { send: async () => { throw new Error("boom"); } };
    await expect(pushToWorkers(failing, ["a"], "payout_paid")).resolves.toEqual({ sent: 0, failed: 0, revoked: 0 });
    await expect(pushToWorkers(undefined, ["a"], "payout_paid")).resolves.toEqual({ sent: 0, failed: 0, revoked: 0 });
  });
});
