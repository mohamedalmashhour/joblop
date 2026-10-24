-- Launch Workstream D (Stripe TEST-MODE activation): admit the `stripe_test` provider for persisted
-- payment methods. The original fence (20260730010000) pinned employer_payment_methods.provider to
-- 'local_fake' only, which blocked persisting a real Stripe test-mode payment method for the
-- real-provider close. This replaces that single-value CHECK with an explicit two-value allowlist.
--
-- Safety: this ONLY widens the persisted provider allowlist. It does NOT enable live payments:
-- validateStripeTestEnvironment still rejects any non-`sk_test_` key (live keys fail closed), and
-- LOCAL_PAYMENT_ENABLED / STRIPE_TEST_MODE_ENABLED gating is unchanged. No column dropped, no row
-- deleted, no data rewritten — only the provider check constraint is swapped.
ALTER TABLE "employer_payment_methods"
  DROP CONSTRAINT "employer_payment_methods_local_provider_check";

ALTER TABLE "employer_payment_methods"
  ADD CONSTRAINT "employer_payment_methods_provider_check"
  CHECK ("provider" IN ('local_fake', 'stripe_test'));
