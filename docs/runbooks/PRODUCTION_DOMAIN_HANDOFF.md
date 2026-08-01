# Resident Workforce OS production domain handoff

Status: configuration preparation only. This document does not authorize DNS changes or deployment.

## Owner-provided public domains

| Audience                                | Approved domain | Application              |
| --------------------------------------- | --------------- | ------------------------ |
| Employers/clients searching for workers | `joblop.com`    | Employer web application |
| Workers searching for jobs              | `rezekme.com`   | Worker web application   |

The canonical public origins are therefore proposed as:

- `https://joblop.com`
- `https://rezekme.com`

Both `www.joblop.com` and `www.rezekme.com` require an explicit canonical redirect decision before
DNS or certificates are configured.

## Separate service origins requiring final owner approval

To avoid mixing privileged and public surfaces, use separate hostnames:

| Service        | Proposed origin            | Exposure                                              |
| -------------- | -------------------------- | ----------------------------------------------------- |
| Platform Admin | `https://admin.joblop.com` | Restricted authenticated web surface                  |
| API            | `https://api.joblop.com`   | Public entry only for explicitly supported API routes |

Internal services—including authentication limiter, candidate source, offer delivery and QA reset—
must not receive public custom domains. They remain private service-to-service origins protected by
the approved identity and audience contracts.

## Runtime mapping

- Employer and Admin: `INTERNAL_API_ORIGIN=https://api.joblop.com`
- Worker production build: `EXPO_PUBLIC_RWOS_API_ORIGIN=https://api.joblop.com`
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
- Approve or modify `admin.joblop.com` and `api.joblop.com`.
- Select the canonical `www` redirect behavior for both public domains.
- Verify DNS records, TLS issuance and renewal without exposing registrar credentials.
- Restrict CORS, authentication redirects, password-reset links and email links to the exact approved
  HTTPS origins.
- Rebuild the Worker artifact after injecting the final public API origin.
- Re-run secret and public-bundle scans against the immutable release artifacts.
- Run authenticated staging smoke tests before production approval.

Production DNS, deployment, live providers and real user traffic remain prohibited until separately
authorized.
