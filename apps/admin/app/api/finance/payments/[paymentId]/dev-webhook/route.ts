import { createHmac } from "node:crypto";
import { randomUUID } from "node:crypto";
import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../../sessionBoundary";
import { readOrganizationId } from "../../../financeBoundary";

// LOCAL/TEST ONLY. Delivers a signed local-fake provider webhook to terminalize a payment attempt
// that is in `processing` (the async provider outcome the local fake provider leaves pending). This
// mirrors what a real payment provider's webhook would do; it is hard-gated off in production and
// uses the local webhook signing secret. Session-gated + same-origin CSRF. org via ?organizationId=.
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ paymentId: string }> }>
) {
  if (process.env.RWOS_ENV === "production") return sessionFailure("not_found");
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const organizationId = readOrganizationId(request);
  if (!organizationId) {
    return Response.json({ status: "invalid", message: "A valid organization reference is required." }, { status: 400, headers: { "cache-control": "private, no-store" } });
  }
  const secret = process.env.LOCAL_PAYMENT_WEBHOOK_SECRET;
  const apiOrigin = process.env.INTERNAL_API_ORIGIN;
  if (!secret || !apiOrigin) return sessionFailure("unavailable");
  const { paymentId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const newState = typeof body.newState === "string" ? body.newState : "succeeded";

  // Read current attempt to discover its exact version + amount (webhook guards on both).
  const current = await gateway.request(
    `/organizations/${encodeURIComponent(organizationId)}/payments/${encodeURIComponent(paymentId)}`,
    "GET",
    token
  );
  if (current.status !== "ok") return sessionFailure(current.status);
  const payment = (current.payload as { payment?: Record<string, unknown> }).payment ?? (current.payload as Record<string, unknown>);
  const expectedVersion = Number(payment.version);
  const amountMinor = Number(payment.amountMinor);
  if (!Number.isSafeInteger(expectedVersion) || !Number.isSafeInteger(amountMinor)) {
    return sessionFailure("error");
  }

  const eventId = randomUUID();
  const occurredAtEpochSeconds = Math.floor(Date.now() / 1000);
  const canonical = [eventId, organizationId, paymentId, String(expectedVersion), String(amountMinor), newState, String(occurredAtEpochSeconds)].join(":");
  const signature = createHmac("sha256", secret).update(canonical).digest("hex");

  const delivered = await fetch(`${apiOrigin}/payments/webhooks/local-fake`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-rwos-payment-signature": signature },
    body: JSON.stringify({ eventId, paymentId, organizationId, expectedVersion, amountMinor, newState, occurredAtEpochSeconds })
  });
  const text = await delivered.text();
  let payload: unknown; try { payload = JSON.parse(text); } catch { payload = text; }
  return Response.json({ deliveredStatus: delivered.status, sentExpectedVersion: expectedVersion, newState, payload }, { status: delivered.ok ? 200 : 502, headers: { "cache-control": "private, no-store" } });
}
