# Contributing

> **Binding: [PERMANENT MULTI-COUNTRY PLATFORM POLICY](MULTI_COUNTRY_PLATFORM_POLICY.md).** The
> master is country-neutral; country-specific law/currency/tax/providers/secrets/deployment live in
> isolated `countries/<country>/` implementations and may never be inherited across countries. Fail
> closed without a valid country profile. Read that policy before any change.

Resident Workforce OS changes must follow controlled group delivery.

## Rules

- Do not add business features outside an approved group.
- Do not commit secrets.
- Do not connect production services without written authorization.
- Preserve worker/client/admin data boundaries.
- AI is advisory only.

## Local Validation

Run before review:

```bash
pnpm validate
```
