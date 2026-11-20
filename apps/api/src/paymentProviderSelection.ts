import type { PaymentProviderPort } from "@rwos/shared";

// money-golive-readiness — payment-provider SELECTION (pure, side-effect-free, fully testable).
//
// This is the single decision that binds a payment provider into the payment repository. It exists so the
// choice "local fake vs real Stripe" is explicit, auditable, and fail-closed, instead of a hardcoded
// provider. The rule is deliberately narrow:
//
//   REAL Stripe is used ONLY when BOTH are true:
//     1. the finance go-live gate is OPEN (FINANCE_LIVE_ENABLED=enabled, which the config schema only
//        permits in staging/production WITH a recorded CPA sign-off), AND
//     2. a complete, test-mode Stripe credential set is present (sk_test_ secret + whsec_ webhook secret
//        + an approved acct_ reference), surfaced as `stripeConfigured`.
//   In EVERY other case — gate closed, or any credential missing — the LOCAL FAKE provider is used.
//
// Because the committed configuration never opens the gate, the default runtime path is always the local
// fake and is byte-for-byte unchanged. Flipping the gate is a separate, deliberate, human-gated step
// (staging first, CPA sign-off, controlled test transaction); this function only encodes the mechanism.
//
// It moves no money and constructs nothing itself: the caller supplies thunks so the (network-touching)
// Stripe client is only built on the real branch.

export type PaymentProviderKind = "local_fake" | "stripe_test";

export type PaymentProviderSelection = Readonly<{
  provider: PaymentProviderPort;
  kind: PaymentProviderKind;
}>;

export function selectPaymentProvider(input: {
  // Is the finance go-live gate OPEN? (FINANCE_LIVE_ENABLED=enabled)
  financeLive: boolean;
  // Are ALL Stripe test-mode credentials present and well-formed? (see isStripeProviderConfigured)
  stripeConfigured: boolean;
  // Lazily build the local fake provider (default path).
  createLocalFake: () => PaymentProviderPort;
  // Lazily build the real Stripe provider — invoked ONLY on the gated real branch, so no Stripe client is
  // constructed (and no key is read) unless both conditions hold.
  createStripe: () => PaymentProviderPort;
}): PaymentProviderSelection {
  if (input.financeLive && input.stripeConfigured) {
    return { provider: input.createStripe(), kind: "stripe_test" };
  }
  return { provider: input.createLocalFake(), kind: "local_fake" };
}

// Are the Stripe test-mode credentials complete enough to bind a real provider? Fail closed: a single
// missing or malformed value → false → the fake is kept. (The Stripe client itself re-validates and
// rejects any non-test / live secret, so this is defense-in-depth, not the only guard.)
export function isStripeProviderConfigured(config: {
  stripeTestModeEnabled: boolean;
  // `| undefined` (not just optional) so this accepts the runtime config, whose fields are always
  // present but may be undefined, under exactOptionalPropertyTypes.
  stripeTestSecretKey?: string | undefined;
  stripeTestWebhookSecret?: string | undefined;
  stripeTestAccountReference?: string | undefined;
}): boolean {
  return (
    config.stripeTestModeEnabled &&
    typeof config.stripeTestSecretKey === "string" &&
    config.stripeTestSecretKey.startsWith("sk_test_") &&
    typeof config.stripeTestWebhookSecret === "string" &&
    config.stripeTestWebhookSecret.startsWith("whsec_") &&
    typeof config.stripeTestAccountReference === "string" &&
    config.stripeTestAccountReference.length > 0
  );
}
