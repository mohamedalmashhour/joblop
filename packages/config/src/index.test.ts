import { describe, expect, it } from "vitest";
import { getRuntimeConfig, validateRuntimeConfig } from "./index";

describe("production runtime configuration", () => {
  it.each([
    [
      {
        RWOS_ENV: "production",
        NODE_ENV: "test",
        DATABASE_URL: "postgres://db",
        INTERNAL_API_ORIGIN: "https://api.example.test"
      }
    ],
    [
      {
        RWOS_ENV: "production",
        NODE_ENV: "production",
        INTERNAL_API_ORIGIN: "https://api.example.test"
      }
    ],
    [
      {
        RWOS_ENV: "production",
        NODE_ENV: "production",
        DATABASE_URL: "postgres://db",
        INTERNAL_API_ORIGIN: "http://127.0.0.1:4100"
      }
    ]
  ])("fails closed for invalid production input", (env) => {
    expect(validateRuntimeConfig(env)).toMatchObject({ success: false });
    expect(() => getRuntimeConfig(env)).toThrow();
  });

  it("accepts explicit production configuration without requiring SESSION_SECRET", () => {
    const env = {
      RWOS_ENV: "production",
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://db.example.test/rwos",
      INTERNAL_API_ORIGIN: "https://api.example.test",
      AUTH_RATE_LIMITER_ORIGIN: "https://rate-limit.example.test",
      AUTH_RATE_LIMITER_TOKEN: "test-rate-limiter-token-at-least-32-characters",
      AUTH_RATE_LIMITER_KEY_SECRET: "test-key-secret-that-is-at-least-32-characters",
      AUTH_RATE_LIMITER_KEY_ID: "key-current",
      AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:production:v1"
    };
    expect(validateRuntimeConfig(env)).toMatchObject({ success: true });
    expect(getRuntimeConfig(env)).toMatchObject({
      rwosEnv: "production",
      nodeEnv: "production",
      hasDatabaseUrl: true,
      hasDistributedAuthRateLimiter: true,
      hasSessionSecret: false
    });
  });

  it("requires the production limiter credential and HMAC key to be distinct", () => {
    const shared = "same-rate-limiter-secret-at-least-32-characters";
    expect(
      validateRuntimeConfig({
        RWOS_ENV: "production",
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://db.example.test/rwos",
        INTERNAL_API_ORIGIN: "https://api.example.test",
        AUTH_RATE_LIMITER_ORIGIN: "https://rate-limit.example.test",
        AUTH_RATE_LIMITER_TOKEN: shared,
        AUTH_RATE_LIMITER_KEY_SECRET: shared
      })
    ).toMatchObject({ success: false });
  });

  it("rejects an insecure production password-reset origin", () => {
    expect(
      validateRuntimeConfig({
        RWOS_ENV: "production",
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://db.example.test/rwos",
        INTERNAL_API_ORIGIN: "https://api.example.test",
        AUTH_RATE_LIMITER_ORIGIN: "https://rate-limit.example.test",
        AUTH_RATE_LIMITER_TOKEN: "test-rate-limiter-token-at-least-32-characters",
        AUTH_RATE_LIMITER_KEY_SECRET: "test-key-secret-that-is-at-least-32-characters",
        AUTH_RATE_LIMITER_KEY_ID: "key-current",
        AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:production:v1",
        PASSWORD_RESET_PUBLIC_ORIGIN: "http://127.0.0.1:3100"
      })
    ).toMatchObject({ success: false });
  });

  it("forbids enabling the Assignment handoff in production and defaults it off elsewhere", () => {
    const production = {
      RWOS_ENV: "production",
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://db.example.test/rwos",
      INTERNAL_API_ORIGIN: "https://api.example.test",
      AUTH_RATE_LIMITER_ORIGIN: "https://rate-limit.example.test",
      AUTH_RATE_LIMITER_TOKEN: "test-rate-limiter-token-at-least-32-characters",
      AUTH_RATE_LIMITER_KEY_SECRET: "test-key-secret-that-is-at-least-32-characters",
      AUTH_RATE_LIMITER_KEY_ID: "key-current",
      AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:production:v1",
      ASSIGNMENT_HANDOFF_ENABLED: "enabled"
    };
    expect(validateRuntimeConfig(production)).toMatchObject({ success: false });
    expect(getRuntimeConfig({ RWOS_ENV: "test" })).toMatchObject({
      assignmentHandoffEnabled: false
    });
    expect(
      getRuntimeConfig({ RWOS_ENV: "test", ASSIGNMENT_HANDOFF_ENABLED: "enabled" })
    ).toMatchObject({ assignmentHandoffEnabled: true });
  });

  it("gates live finance behind a CPA sign-off and a non-local environment", () => {
    // Default: off, parses fine.
    expect(() => getRuntimeConfig({ RWOS_ENV: "test" })).not.toThrow();
    // Enabled without a recorded CPA sign-off is refused.
    expect(() => getRuntimeConfig({ RWOS_ENV: "test", FINANCE_LIVE_ENABLED: "enabled" })).toThrow();
    // Enabled with a sign-off but in a non-staging/production environment is still refused.
    expect(() =>
      getRuntimeConfig({ RWOS_ENV: "test", FINANCE_LIVE_ENABLED: "enabled", FINANCE_LIVE_CPA_SIGNOFF: "cpa-signoff-ref-0001" })
    ).toThrow();
  });

  it.each([
    {
      CANDIDATE_SOURCE_ORIGIN: "http://candidate.example.test",
      CANDIDATE_SOURCE_TOKEN: "x".repeat(32)
    },
    { CANDIDATE_SOURCE_ORIGIN: "https://candidate.example.test" },
    {
      OFFER_DELIVERY_ORIGIN: "http://delivery.example.test",
      OFFER_DELIVERY_TOKEN: "x".repeat(32)
    },
    { OFFER_DELIVERY_ORIGIN: "https://delivery.example.test" }
  ])("fails closed for a partial or insecure production integration", (integration) => {
    expect(
      validateRuntimeConfig({
        RWOS_ENV: "production",
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://db.example.test/rwos",
        INTERNAL_API_ORIGIN: "https://api.example.test",
        AUTH_RATE_LIMITER_ORIGIN: "https://rate-limit.example.test",
        AUTH_RATE_LIMITER_TOKEN: "test-rate-limiter-token-at-least-32-characters",
        AUTH_RATE_LIMITER_KEY_SECRET: "test-key-secret-that-is-at-least-32-characters",
        AUTH_RATE_LIMITER_KEY_ID: "key-current",
        AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:production:v1",
        ...integration
      })
    ).toMatchObject({ success: false });
  });

  it("requires the limiter namespace to match the declared runtime environment", () => {
    expect(
      validateRuntimeConfig({
        RWOS_ENV: "test",
        AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:production:v1"
      })
    ).toMatchObject({ success: false });
    expect(
      validateRuntimeConfig({
        RWOS_ENV: "test",
        AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:test:v1"
      })
    ).toMatchObject({ success: true });
  });

  it.each([
    { CANDIDATE_SOURCE_ORIGIN: "https://candidate.example.test" },
    {
      CANDIDATE_SOURCE_ORIGIN: "http://candidate.example.test",
      CANDIDATE_SOURCE_TOKEN: "x".repeat(32)
    },
    { OFFER_DELIVERY_ORIGIN: "https://delivery.example.test" },
    {
      OFFER_DELIVERY_ORIGIN: "http://delivery.example.test",
      OFFER_DELIVERY_TOKEN: "x".repeat(32)
    }
  ])("fails closed for a partial or insecure staging integration", (integration) => {
    expect(validateRuntimeConfig({ RWOS_ENV: "staging", ...integration })).toMatchObject({
      success: false
    });
  });

  it("keeps Stripe disabled by default and accepts only complete test-mode staging configuration", () => {
    expect(getRuntimeConfig({ RWOS_ENV: "test" })).toMatchObject({
      stripeTestModeEnabled: false,
      stripeAcssDebitEnabled: false
    });
    const staging = {
      RWOS_ENV: "staging",
      STRIPE_TEST_MODE_ENABLED: "enabled",
      STRIPE_TEST_SECRET_KEY: "sk_test_synthetic_reference",
      STRIPE_TEST_WEBHOOK_SECRET: "whsec_synthetic_reference",
      STRIPE_TEST_ACCOUNT_REFERENCE: "acct_test_synthetic"
    };
    expect(validateRuntimeConfig(staging)).toMatchObject({ success: true });
    expect(getRuntimeConfig(staging)).toMatchObject({
      stripeTestModeEnabled: true,
      stripeTestAccountReference: "acct_test_synthetic"
    });
  });

  describe("Stripe live mode gate", () => {
    const production = {
      RWOS_ENV: "production",
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://db.example.test/rwos",
      INTERNAL_API_ORIGIN: "https://api.example.test",
      AUTH_RATE_LIMITER_ORIGIN: "https://rate-limit.example.test",
      AUTH_RATE_LIMITER_TOKEN: "test-rate-limiter-token-at-least-32-characters",
      AUTH_RATE_LIMITER_KEY_SECRET: "test-key-secret-that-is-at-least-32-characters",
      AUTH_RATE_LIMITER_KEY_ID: "key-current",
      AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:production:v1",
      FINANCE_LIVE_ENABLED: "enabled",
      FINANCE_LIVE_CPA_SIGNOFF: "cpa-signoff-ref-0001"
    };
    const live = {
      ...production,
      STRIPE_LIVE_MODE_ENABLED: "enabled",
      STRIPE_LIVE_SECRET_KEY: "rk_live_synthetic_reference",
      STRIPE_LIVE_PUBLISHABLE_KEY: "pk_live_synthetic_reference",
      STRIPE_LIVE_WEBHOOK_SECRET: "whsec_live_synthetic_reference",
      STRIPE_LIVE_ACCOUNT_REFERENCE: "acct_live_synthetic"
    };

    it("is off by default", () => {
      expect(getRuntimeConfig({ RWOS_ENV: "test" })).toMatchObject({
        stripeLiveModeEnabled: false,
        invoiceLiveEnabled: false
      });
    });

    it("accepts a complete production configuration with signed-off live finance", () => {
      expect(validateRuntimeConfig(live)).toMatchObject({ success: true });
      expect(getRuntimeConfig({ ...live, INVOICE_LIVE_ENABLED: "enabled" })).toMatchObject({
        stripeLiveModeEnabled: true,
        stripeLiveAccountReference: "acct_live_synthetic",
        invoiceLiveEnabled: true
      });
    });

    it.each([
      ["outside production", { RWOS_ENV: "staging", AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:staging:v1" }],
      ["without live finance", { FINANCE_LIVE_ENABLED: "disabled" }],
      ["with a test secret key", { STRIPE_LIVE_SECRET_KEY: "sk_test_synthetic_reference" }],
      ["with a test publishable key", { STRIPE_LIVE_PUBLISHABLE_KEY: "pk_test_synthetic_reference" }],
      ["without a webhook secret", { STRIPE_LIVE_WEBHOOK_SECRET: undefined }],
      ["without an account reference", { STRIPE_LIVE_ACCOUNT_REFERENCE: undefined }],
      [
        "with the test webhook secret reused",
        { STRIPE_TEST_WEBHOOK_SECRET: "whsec_live_synthetic_reference" }
      ],
      [
        "alongside Stripe test mode",
        {
          STRIPE_TEST_MODE_ENABLED: "enabled",
          STRIPE_TEST_SECRET_KEY: "sk_test_synthetic_reference",
          STRIPE_TEST_WEBHOOK_SECRET: "whsec_synthetic_reference",
          STRIPE_TEST_ACCOUNT_REFERENCE: "acct_test_synthetic"
        }
      ],
      ["with ACSS debit on", { STRIPE_ACSS_DEBIT_ENABLED: "enabled" }]
    ])("is refused %s", (_label, override) => {
      expect(validateRuntimeConfig({ ...live, ...override })).toMatchObject({ success: false });
    });

    it("refuses live invoice collection without Stripe live mode", () => {
      expect(validateRuntimeConfig({ ...production, INVOICE_LIVE_ENABLED: "enabled" })).toMatchObject({
        success: false
      });
    });
  });

  it("keeps the employer invoice test-mode collection off by default and gates it fully", () => {
    const stripe = {
      STRIPE_TEST_MODE_ENABLED: "enabled",
      STRIPE_TEST_SECRET_KEY: "sk_test_synthetic_reference",
      STRIPE_TEST_WEBHOOK_SECRET: "whsec_synthetic_reference",
      STRIPE_TEST_ACCOUNT_REFERENCE: "acct_test_synthetic"
    };
    // Off by default even with Stripe test mode on.
    expect(getRuntimeConfig({ RWOS_ENV: "test", ...stripe })).toMatchObject({
      invoiceTestModeEnabled: false
    });
    // Enabled only in test/staging alongside Stripe test keys; FINANCE_LIVE stays off.
    const enabled = { RWOS_ENV: "test", ...stripe, INVOICE_TEST_MODE_ENABLED: "enabled" };
    expect(validateRuntimeConfig(enabled)).toMatchObject({ success: true });
    expect(getRuntimeConfig(enabled)).toMatchObject({ invoiceTestModeEnabled: true });
  });

  it.each([
    // Never in production.
    { RWOS_ENV: "production", INVOICE_TEST_MODE_ENABLED: "enabled" },
    // Requires Stripe test mode to be on too.
    { RWOS_ENV: "test", INVOICE_TEST_MODE_ENABLED: "enabled" },
    // Cannot be combined with live finance.
    {
      RWOS_ENV: "staging",
      INVOICE_TEST_MODE_ENABLED: "enabled",
      STRIPE_TEST_MODE_ENABLED: "enabled",
      STRIPE_TEST_SECRET_KEY: "sk_test_synthetic_reference",
      STRIPE_TEST_WEBHOOK_SECRET: "whsec_synthetic_reference",
      STRIPE_TEST_ACCOUNT_REFERENCE: "acct_test_synthetic",
      FINANCE_LIVE_ENABLED: "enabled",
      FINANCE_LIVE_CPA_SIGNOFF: "cpa-signoff-ref-0001"
    }
  ])("rejects an improperly gated employer invoice test-mode configuration", (env) => {
    expect(validateRuntimeConfig(env)).toMatchObject({ success: false });
  });

  it("keeps the worker payout test-mode execution off by default and gates it fully", () => {
    const stripe = {
      STRIPE_TEST_MODE_ENABLED: "enabled",
      STRIPE_TEST_SECRET_KEY: "sk_test_synthetic_reference",
      STRIPE_TEST_WEBHOOK_SECRET: "whsec_synthetic_reference",
      STRIPE_TEST_ACCOUNT_REFERENCE: "acct_test_synthetic"
    };
    // Off by default even with Stripe test mode on.
    expect(getRuntimeConfig({ RWOS_ENV: "test", ...stripe })).toMatchObject({
      payoutTestModeEnabled: false
    });
    // Enabled only in test/staging alongside Stripe test keys; FINANCE_LIVE stays off.
    const enabled = { RWOS_ENV: "test", ...stripe, PAYOUT_TEST_MODE_ENABLED: "enabled" };
    expect(validateRuntimeConfig(enabled)).toMatchObject({ success: true });
    expect(getRuntimeConfig(enabled)).toMatchObject({ payoutTestModeEnabled: true });
    // A configured test connected account surfaces for the transfer path.
    expect(
      getRuntimeConfig({ ...enabled, STRIPE_TEST_PAYOUT_CONNECTED_ACCOUNT: "acct_test_connected" })
    ).toMatchObject({ stripeTestPayoutConnectedAccount: "acct_test_connected" });
  });

  it.each([
    // Never in production.
    { RWOS_ENV: "production", PAYOUT_TEST_MODE_ENABLED: "enabled" },
    // Requires Stripe test mode to be on too.
    { RWOS_ENV: "test", PAYOUT_TEST_MODE_ENABLED: "enabled" },
    // Cannot be combined with live finance.
    {
      RWOS_ENV: "staging",
      PAYOUT_TEST_MODE_ENABLED: "enabled",
      STRIPE_TEST_MODE_ENABLED: "enabled",
      STRIPE_TEST_SECRET_KEY: "sk_test_synthetic_reference",
      STRIPE_TEST_WEBHOOK_SECRET: "whsec_synthetic_reference",
      STRIPE_TEST_ACCOUNT_REFERENCE: "acct_test_synthetic",
      FINANCE_LIVE_ENABLED: "enabled",
      FINANCE_LIVE_CPA_SIGNOFF: "cpa-signoff-ref-0001"
    },
    // A non-acct connected account reference is refused.
    {
      RWOS_ENV: "test",
      PAYOUT_TEST_MODE_ENABLED: "enabled",
      STRIPE_TEST_MODE_ENABLED: "enabled",
      STRIPE_TEST_SECRET_KEY: "sk_test_synthetic_reference",
      STRIPE_TEST_WEBHOOK_SECRET: "whsec_synthetic_reference",
      STRIPE_TEST_ACCOUNT_REFERENCE: "acct_test_synthetic",
      STRIPE_TEST_PAYOUT_CONNECTED_ACCOUNT: "not_an_account"
    }
  ])("rejects an improperly gated worker payout test-mode configuration", (env) => {
    expect(validateRuntimeConfig(env)).toMatchObject({ success: false });
  });

  it.each([
    { RWOS_ENV: "production", STRIPE_TEST_MODE_ENABLED: "enabled" },
    {
      RWOS_ENV: "staging",
      STRIPE_TEST_MODE_ENABLED: "enabled",
      STRIPE_TEST_SECRET_KEY: "sk_live_forbidden",
      STRIPE_TEST_WEBHOOK_SECRET: "whsec_synthetic",
      STRIPE_TEST_ACCOUNT_REFERENCE: "acct_test_synthetic"
    },
    {
      RWOS_ENV: "staging",
      STRIPE_TEST_MODE_ENABLED: "enabled",
      STRIPE_TEST_SECRET_KEY: "sk_test_synthetic"
    }
  ])("rejects incomplete or non-test Stripe configuration", (env) => {
    expect(validateRuntimeConfig(env)).toMatchObject({ success: false });
  });

  it("keeps local document upload disabled by default and requires its complete local boundary", () => {
    expect(getRuntimeConfig({ RWOS_ENV: "local" })).toMatchObject({
      documentLocalUploadEnabled: false
    });
    const enabled = {
      RWOS_ENV: "local",
      DATABASE_URL: "postgresql://localhost/rwos_document_test",
      DOCUMENT_LOCAL_UPLOAD_ENABLED: "enabled",
      DOCUMENT_LOCAL_STORAGE_ROOT: "/tmp/rwos-private-documents",
      DOCUMENT_REFERENCE_SECRET: "synthetic-document-secret-at-least-32-characters"
    };
    expect(validateRuntimeConfig(enabled)).toMatchObject({ success: true });
    expect(getRuntimeConfig(enabled)).toMatchObject({
      documentLocalUploadEnabled: true,
      documentLocalStorageRoot: "/tmp/rwos-private-documents"
    });
  });

  it.each([
    { RWOS_ENV: "local", DOCUMENT_LOCAL_UPLOAD_ENABLED: "enabled" },
    {
      RWOS_ENV: "staging",
      DATABASE_URL: "postgresql://db.example.test/rwos",
      DOCUMENT_LOCAL_UPLOAD_ENABLED: "enabled",
      DOCUMENT_LOCAL_STORAGE_ROOT: "/tmp/rwos-private-documents",
      DOCUMENT_REFERENCE_SECRET: "synthetic-document-secret-at-least-32-characters"
    }
  ])("fails closed for incomplete or external local-document configuration", (env) => {
    expect(validateRuntimeConfig(env)).toMatchObject({ success: false });
  });

  it("keeps local payment disabled by default and requires an isolated signed boundary", () => {
    expect(getRuntimeConfig({ RWOS_ENV: "local" })).toMatchObject({
      localPaymentEnabled: false
    });
    const enabled = {
      RWOS_ENV: "test",
      DATABASE_URL: "postgresql://127.0.0.1/rwos_payment_disposable_test",
      LOCAL_PAYMENT_ENABLED: "enabled",
      LOCAL_PAYMENT_WEBHOOK_SECRET: "synthetic-local-payment-secret-at-least-32-characters"
    };
    expect(validateRuntimeConfig(enabled)).toMatchObject({ success: true });
    expect(getRuntimeConfig(enabled)).toMatchObject({
      localPaymentEnabled: true
    });
  });

  it.each([
    { RWOS_ENV: "local", LOCAL_PAYMENT_ENABLED: "enabled" },
    {
      RWOS_ENV: "staging",
      DATABASE_URL: "postgresql://db.example.test/rwos",
      LOCAL_PAYMENT_ENABLED: "enabled",
      LOCAL_PAYMENT_WEBHOOK_SECRET: "synthetic-local-payment-secret-at-least-32-characters"
    }
  ])("fails closed for incomplete or non-local payment configuration", (env) => {
    expect(validateRuntimeConfig(env)).toMatchObject({ success: false });
  });
});
