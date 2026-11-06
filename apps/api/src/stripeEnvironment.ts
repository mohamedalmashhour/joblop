import { validateStripeTestEnvironment, type StripeTestEnvironment } from "./stripeTestProvider";
import { stripeTestEnvFromProcess } from "./cvProStripeCheckout";

// Resolves which Stripe environment employer-invoice COLLECTION uses. Live is opt-in: it is chosen only
// when STRIPE_LIVE_MODE_ENABLED=enabled, which runtime config already restricts to production with a CPA
// sign-off and Stripe test mode off. Otherwise this is exactly the existing test environment.
// Payouts and CV Pro do not use this resolver and stay test-only.

export function isStripeLiveModeEnabled(): boolean {
  return process.env.STRIPE_LIVE_MODE_ENABLED === "enabled";
}

export function stripeLiveEnvFromProcess(): StripeTestEnvironment {
  return {
    enabled: isStripeLiveModeEnabled(),
    mode: "live",
    secretKey: process.env.STRIPE_LIVE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_LIVE_WEBHOOK_SECRET,
    accountReference: process.env.STRIPE_LIVE_ACCOUNT_REFERENCE
  };
}

export function stripeCollectionEnvFromProcess(): StripeTestEnvironment {
  return isStripeLiveModeEnabled() ? stripeLiveEnvFromProcess() : stripeTestEnvFromProcess();
}

/** True when the selected collection environment is enabled and its keys match its mode. */
export function isStripeCollectionConfigured(): boolean {
  try {
    return validateStripeTestEnvironment(stripeCollectionEnvFromProcess()).enabled;
  } catch {
    return false;
  }
}
