# Resident Workforce OS production domain handoff

Status: configuration preparation only. This document does not authorize DNS changes or deployment.

## Owner-provided public domains

| Audience                                | Approved domain | Application              |
| --------------------------------------- | --------------- | ------------------------ |
| Employers/clients searching for workers | `joblop.com`    | Employer web application |
| Workers searching for jobs              | `rezekme.com`   | Worker web application   |

The canonical public origins are:

- `https://joblop.com`
- `https://rezekme.com`

Both `www.joblop.com` and `www.rezekme.com` require an explicit canonical redirect decision before
DNS or certificates are configured.

These domains are separate product boundaries:

- `joblop.com` must not host or redirect to the Worker application.
- `rezekme.com` must not host or redirect to the Employer application.
- Authentication redirects and cookies must not create an unintended shared-domain boundary between
  the two products.

## Shared Platform Admin and API origins remain unassigned

One shared Platform Admin application manages both product surfaces. It is not duplicated per
domain. The Admin and API origins remain external inputs:

| Service        | Approved origin  | Exposure                                              |
| -------------- | ---------------- | ----------------------------------------------------- |
| Platform Admin | Not yet supplied | Restricted authenticated web surface                  |
| API            | Not yet supplied | Public entry only for explicitly supported API routes |

The shared Admin must preserve role authorization, audit attribution and organization isolation.
Managing both product surfaces does not grant an employer access to worker-only records or one
employer organization access to another organization.

Internal services—including authentication limiter, candidate source, offer delivery and QA reset—
must not receive public custom domains. They remain private service-to-service origins protected by
the approved identity and audience contracts.

## Runtime mapping pending the separate API origin

- Employer and Admin: `INTERNAL_API_ORIGIN=<approved-separate-api-origin>`
- Worker production build: `EXPO_PUBLIC_RWOS_API_ORIGIN=<approved-separate-api-origin>`
- Worker production build: `EXPO_PUBLIC_RWOS_ENV=production`
- Employer/Admin production runtime: `RWOS_ENV=production`
- Admin public environment: `NEXT_PUBLIC_RWOS_ENV=production`

Only origin values are documented here. No credential, token or secret belongs in a public build
variable.

## Node.js baseline

The reviewed launch baseline remains Node.js 20. The repository engine contract selects Node 20 on
Vercel even though Node 24 is the default for new Vercel projects. Docker images remain pinned to
the reviewed Node.js 20 patch release until a separate Node 24 compatibility change is validated.

## Required external checks before activation

- Confirm ownership and registrar access for both apex domains.
- Supply the shared Platform Admin origin and the API origin, or approve private provider-generated
  origins for them.
- Select the canonical `www` redirect behavior for both public domains.
- Verify DNS records, TLS issuance and renewal without exposing registrar credentials.
- Restrict CORS, authentication redirects, password-reset links and email links to the exact approved
  HTTPS origins.
- Rebuild the Worker artifact after injecting the final public API origin.
- Re-run secret and public-bundle scans against the immutable release artifacts.
- Run authenticated staging smoke tests before production approval.

Production DNS, deployment, live providers and real user traffic remain prohibited until separately
authorized.
