import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { AssistantRole } from "./assistantTypes";

// A short-lived, signed proposal. The model never sees it and cannot make one: the server signs it
// after preparing the action, the app shows it as a card, and only the person's Confirm sends it back.
// The confirm endpoint checks the signature (tampering), the expiry, the person and role it was made
// for, and claims the proposal's audit slot once (a replay finds the slot taken).

export const PROPOSAL_TTL_MS = 10 * 60_000;

export type ProposalPayload = Readonly<{
  v: 1;
  /** Proposal id (random). */
  pid: string;
  /** The brain issue row that records the proposal (audit). */
  iid: string;
  uid: string;
  role: AssistantRole;
  /** Employer: the organization at proposal time (must still match at confirm). */
  org: string | null;
  tool: string;
  args: Readonly<Record<string, unknown>>;
  /** Expiry, epoch ms. */
  exp: number;
}>;

const b64url = (buf: Buffer) => buf.toString("base64url");

export type ProposalSigner = Readonly<{
  sign(payload: ProposalPayload): string;
  verify(token: unknown, now: number): { ok: true; payload: ProposalPayload } | { ok: false; reason: "malformed" | "bad_signature" | "expired" };
}>;

/** The key comes from ASSISTANT_PROPOSAL_SECRET (32+ characters). Without it a random key is made per
 *  process: proposals then stop working after a restart, which is safe (the person asks again). */
export function createProposalSigner(secret: string | null | undefined): ProposalSigner {
  const key = secret && secret.trim().length >= 32 ? Buffer.from(secret.trim(), "utf8") : randomBytes(32);
  const mac = (body: string) => createHmac("sha256", key).update(`joblop-assistant-proposal.${body}`).digest();
  return {
    sign(payload) {
      const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
      return `${body}.${b64url(mac(body))}`;
    },
    verify(token, now) {
      if (typeof token !== "string" || token.length > 8000) return { ok: false, reason: "malformed" };
      const parts = token.split(".");
      if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };
      const [body, signature] = parts as [string, string];
      const expected = mac(body);
      const given = Buffer.from(signature, "base64url");
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: "bad_signature" };
      let payload: ProposalPayload;
      try {
        payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ProposalPayload;
      } catch {
        return { ok: false, reason: "malformed" };
      }
      if (
        payload?.v !== 1 || typeof payload.pid !== "string" || typeof payload.iid !== "string" || typeof payload.uid !== "string" ||
        typeof payload.tool !== "string" || typeof payload.exp !== "number" || !payload.args || typeof payload.args !== "object" ||
        (payload.role !== "worker" && payload.role !== "employer" && payload.role !== "staff")
      ) {
        return { ok: false, reason: "malformed" };
      }
      if (now >= payload.exp) return { ok: false, reason: "expired" };
      return { ok: true, payload };
    }
  };
}

export const newProposalId = () => randomBytes(12).toString("hex");
