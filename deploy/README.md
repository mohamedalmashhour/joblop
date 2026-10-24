# JobLop — self-hosting (Docker) template

Run JobLop on your NAS, a mini-PC, or a Canadian cloud VM — identical everywhere. This is the
**reference template** for self-hosting all your platforms (see `docs/infra/SELF_HOSTING_PLAN.md`).

> **Design-for-real, not a production switch.** Nothing here flips a launch or finance gate. Payments
> stay frozen; keep card checkout off. SYBNB is already live elsewhere — don't move live platforms home
> without a migration + rollback plan (see the plan doc).

## What's here
- `Dockerfile` — one image for the whole monorepo (built once).
- `docker-compose.yml` — Postgres + api + worker + employer + admin + Caddy (TLS).
- `Caddyfile` — routes each domain to its app (or use Cloudflare Tunnel instead).
- `.env.example` — copy to `.env` (gitignored) and fill real values.
- `backup.sh` — nightly DB dump to the 12 TB drive (+ offsite).

## Quickstart
```bash
cp deploy/.env.example deploy/.env            # then edit real secrets
docker compose -f deploy/docker-compose.yml --env-file deploy/.env build
# apply migrations once:
docker compose -f deploy/docker-compose.yml --env-file deploy/.env run --rm api \
  pnpm --filter @rwos/database exec prisma migrate deploy
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d
```
Apps listen internally on api:4000, worker:8090, employer:8091, admin:8092; Caddy serves the domains.

## Safety (home exposure)
- Prefer **Cloudflare Tunnel** over opening ports 80/443 — no open ports, your home IP stays hidden,
  free TLS + DDoS protection. Point the tunnel at `worker:8090` / `employer:8091`.
- Keep **admin** OFF the public internet — reach it over **VPN/Tailscale** only.
- Put the `pgdata` volume on an **SSD**, not the USB drive. Use a **UPS**.
- Back up nightly (`backup.sh`) and **test a restore monthly**.

## This is a starting template — test it on the target box
The monorepo build (pnpm workspaces + Prisma + Next) is standard but every environment differs; run the
`build` once on your NAS/VM and fix any environment-specific issues (memory, platform arch) before
relying on it. Tell me your NAS model/CPU/RAM and I'll tune this to it.
