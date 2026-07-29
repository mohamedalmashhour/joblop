# Public-Bundle Security Policy

Status: **B5.5 IMPLEMENTED LOCALLY — EXTERNAL BUILD EVIDENCE BLOCKED**

This policy covers employer and admin browser code, Worker Expo web/mobile code, their imported
shared packages, public build configuration, emitted JavaScript/CSS/source maps, static metadata
and public Next/Expo manifests.

## Environment classification

`scripts/environment-classification.ts` is the executable source of truth. The local B5.6 scan
classified all 136 environment names discovered in application/package/script source and example
environment files. An unknown name fails validation.

| Classification                   | Public source/bundle | Meaning                                                               |
| -------------------------------- | -------------------- | --------------------------------------------------------------------- |
| Public and safe                  | Allowed              | Explicitly approved non-secret runtime label                          |
| Build-time public                | Allowed              | Explicitly approved Expo/Next public value or `NODE_ENV`              |
| Server-only non-secret           | Denied               | Server configuration or immutable identifier                          |
| Runtime server-only              | Denied               | Private origin, URL, audience, endpoint or secret reference           |
| Server-only secret               | Denied               | Reserved server secret                                                |
| Prohibited from bundles and logs | Denied               | Credentials, tokens, DB/Redis URLs, HMAC material or private identity |

Only the exact allowlisted Expo/Next variables may enter client source. A public prefix is not
accepted as proof of safety: credential-shaped public names are denied. Variable-name hiding,
minification and source-map omission are not security controls.

## Import boundary

Mobile code and any module marked `"use client"` may not import:

- `@rwos/service-auth` or the Google authentication library;
- `@rwos/database` or `@rwos/config`;
- QA reset, limiter, candidate-source or offer-delivery implementations;
- direct service-auth/database implementation paths.

Public applications may use bounded end-user DTOs and explicitly public contracts. Server-only
Next route handlers and server components remain outside the public bundle but are still covered
by workspace and secret scans.

## Credential and output policy

The scanner rejects trusted-service application authorization headers, identity/access token
shapes, private keys, database/Redis configuration, HMAC material, QA-reset credentials, adapter
credentials, service-account/operator identities and regional Secret Manager resource paths.
It scans source plus emitted Expo and Next public artifacts, source maps, CSS/static text, metadata
and public build manifests.

The Worker client legitimately contains the generic HTTP `authorization` field needed to send its
end-user session to the API. That field is not a Google service identity token, application
credential or embedded value. Trusted-service identity acquisition and application authorization
remain prohibited from all public clients.

## Logging

B5 receiver tests assert that tokens, application credentials, raw authorization headers,
complete claims, service identities, personal data and complete reset/candidate/delivery payloads
are absent from logs. Logs retain bounded correlation, operation, result and status fields only.

## CI and local commands

CI installs with the frozen authoritative pnpm lockfile, runs full validation/builds, then runs
`pnpm scan:public-bundles` explicitly against the emitted artifacts. Negative policy tests prove
that prohibited imports, server-only variables, unknown variables and credential material fail.

External image provenance, deployed artifact scanning and real Cloud Run IAM evidence remain B5.7
work and require separate authorization.
