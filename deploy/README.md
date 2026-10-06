# JobLop — self-host on your Mac (staging tier, free)

Runs the whole platform — API, the three web apps, and Postgres — in Docker on your
Mac, reachable on your domain over HTTPS via a **Cloudflare Tunnel**. No router
port-forwarding, no exposed home IP, no monthly hosting bill.

This runs at the **staging** tier, which is the right fit for a live beta and is the
only tier that allows Stripe **test** mode. It is not a hardened production
deployment (see "Going to production" at the end).

## What you need first

- **Docker Desktop for Mac** — installed and running.
- **A domain** on **Cloudflare** — add your domain to a (free) Cloudflare account and
  point its nameservers to Cloudflare. DNS for the tunnel is created for you.
- Your **Resend** API key + a verified sending domain (for offer emails).
- Your **Google Maps** API key (Static Maps + Distance Matrix + Geocoding enabled).

Keep the Mac awake while serving: `caffeinate -s` in a Terminal, or set
System Settings → Energy to never sleep. Keep Docker Desktop running.

## 1. Create the Cloudflare Tunnel

1. Cloudflare dashboard → **Zero Trust → Networks → Tunnels → Create a tunnel**
   → **Cloudflared** → name it (e.g. `joblop-mac`).
2. Copy the **connector token** it shows (a long string). That goes in `.env` as
   `CLOUDFLARE_TUNNEL_TOKEN`.
3. Under the tunnel's **Public Hostnames**, add these (Service = HTTP, pointing at the
   container names on the tunnel's docker network):

   | Public hostname            | Service                 |
   |----------------------------|-------------------------|
   | `app.yourdomain.ca`        | `http://worker:8080`    |
   | `employer.yourdomain.ca`   | `http://employer:8080`  |
   | `admin.yourdomain.ca`      | `http://admin:8080`     |
   | `api.yourdomain.ca` (opt.) | `http://api:8080`       |

   Because `cloudflared` runs inside this compose stack, it reaches the apps by their
   service names (`worker`, `admin`, …) on the internal network.

## 2. Fill in the environment

```bash
cd deploy
cp .env.example .env
openssl rand -hex 24      # paste as POSTGRES_PASSWORD
```

Edit `.env`: set `POSTGRES_PASSWORD`, `CLOUDFLARE_TUNNEL_TOKEN`, `WORKER_WEB_ORIGIN`
(e.g. `https://app.yourdomain.ca`), `RESEND_API_KEY`, `EMAIL_FROM`, and
`GOOGLE_MAPS_API_KEY`. Leave Stripe disabled until you have test keys.
`deploy/.env` is gitignored — never commit it.

## 3. Start it

```bash
./up.sh
# (equivalently:  docker compose up -d --build )
```

First build compiles everything and can take several minutes. `up.sh` waits for the
API to report healthy and then prints the container status.

## 4. Create your first platform admin

```bash
docker compose exec api pnpm bootstrap:first-admin
```

Then sign in at `https://admin.yourdomain.ca`.

## Day-to-day

- **Logs:** `docker compose logs -f api` (or `admin`, `worker`, `employer`, `cloudflared`).
- **Update after a code change:** `git pull && ./up.sh` (rebuilds changed images).
- **Stop (keep data):** `./down.sh` — **Stop + wipe data:** `./down.sh --wipe`.
- **Backup the database:**
  `docker compose exec -T db pg_dump -U rwos rwos > backup_$(date +%F).sql`
- **Restore:** `cat backup.sql | docker compose exec -T db psql -U rwos -d rwos`

## Turning features on

- **Payments (Stripe test):** set `STRIPE_TEST_MODE_ENABLED=enabled` and the three
  `STRIPE_TEST_*` values in `.env`, then `./up.sh`. Staging allows **test** mode only —
  never put `sk_live_` keys here.
- **Offer emails:** set `RESEND_API_KEY` + `EMAIL_FROM` (verified domain). Offers then
  email workers automatically.
- **Maps + ETA:** set `GOOGLE_MAPS_API_KEY`. The worksite map and travel time appear on
  job orders; geocoding resolves any Canadian postal code.
- **Share links:** set `CONTROL_ROOM_SHARE_SECRET` (≥32 chars) to enable signed
  transaction statements; add `CONTROL_ROOM_MINT_REQUIRE_FINANCE=enabled` to restrict
  who can mint them.

## Going to production (later)

This staging stack is ideal for a beta. A hardened production run (`RWOS_ENV=production`)
additionally requires a remote auth rate-limiter service, HTTPS `INTERNAL_API_ORIGIN`,
and counsel's finalized legal/privacy versions for a real country activation — that's a
separate step on a proper host (or this same Mac with those services added), gated by
design. Until then, staging on the Mac is the recommended way to run a live pilot.
