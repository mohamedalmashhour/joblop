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

## Synology DS923+ (AMD Ryzen R1600, x86-64, 32 GB) — setup
This box is x86-64, so these images run as-is. CPU (2 cores) is the limit, not RAM — great for
dev/staging + light production; keep the busy/live platforms on a Canadian cloud VM (hybrid).
1. **Storage:** add an **M.2 NVMe SSD** storage pool (DSM 7.2 → Storage Manager) and put the Postgres
   `pgdata` volume there. HDD bays (SHR) for bulk; NexStar + 12 TB for backups.
2. **Container Manager:** install the **Container Manager** package (DSM Package Center). It runs Docker
   + Compose "Projects". Create a Project pointing at `deploy/docker-compose.yml`.
3. **Private access (Phase 1, no public exposure):** install **Tailscale** (Package Center) and reach
   everything over the tailnet. Nothing is on the public internet yet.
4. **UPS:** connect a UPS over USB (DSM → Hardware & Power → UPS). Protects the database from power loss.
5. **Public later:** add **Cloudflare Tunnel** (run `cloudflared` as a container) pointing at
   `worker:8090` — no open ports, hides your home IP. Do this only after staging is proven.

Memory limits in the compose keep any one service from starving the others on 2 cores.

## This is a starting template — test it on the target box
The monorepo build (pnpm workspaces + Prisma + Next) is standard but every environment differs; run the
`build` once on your NAS/VM and fix any environment-specific issues (memory, platform arch) before
relying on it. Tell me your NAS model/CPU/RAM and I'll tune this to it.
