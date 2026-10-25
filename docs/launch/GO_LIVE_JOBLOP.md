# JobLop — go live & get on Google (runbook)

Everything on the code side is ready and build-verified: the public landing (`/browse`), the
app-icon favicon, `robots.txt`, `sitemap.xml`, and SEO/Open-Graph metadata. The self-hosting stack
(`deploy/`) runs the apps with automatic HTTPS. What remains are the steps that touch **your**
accounts (host, GoDaddy DNS, Google) — those are below, in order.

> **Safety unchanged.** This publishes the site with **payments OFF** (FINANCE_LIVE stays unset) —
> same posture SYBNB launched with. The marketing landing and sign-up go live; no money moves.

Replace `YOURDOMAIN` with your real domain (e.g. `joblop.com`). The worker site is served at
`work.YOURDOMAIN` (keep the admin console OFF the public internet — reach it over Tailscale/VPN).

---

## A — Host (run the stack)
On the host that will serve it (your Synology NAS, a mini-PC, or a Canadian cloud VM with Docker):

```bash
cp deploy/.env.example deploy/.env          # fill real secrets; set WORKER_PUBLIC_URL=https://work.YOURDOMAIN
docker compose -f deploy/docker-compose.yml --env-file deploy/.env build
docker compose -f deploy/docker-compose.yml --env-file deploy/.env run --rm api \
  pnpm --filter @rwos/database exec prisma migrate deploy
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d
```
The worker site now runs internally on `worker:8090`. **Do not** put production payment keys or
`FINANCE_LIVE` in `.env`.

## B — Make it reachable on YOURDOMAIN (pick ONE)

**Option 1 — Cloudflare Tunnel (recommended for a home NAS; no open ports, free TLS):**
1. Add `YOURDOMAIN` as a site in Cloudflare (free plan).
2. Cloudflare shows you **two nameservers**. In **GoDaddy → your domain → Nameservers → Change →
   "I'll use my own nameservers"**, paste Cloudflare's two nameservers. (DNS now managed in Cloudflare.)
3. Create a Tunnel in Cloudflare Zero Trust, run `cloudflared` on the host (see `deploy/cloudflared/`),
   and add a public hostname: `work.YOURDOMAIN` → `http://worker:8090`. TLS is automatic.

**Option 2 — Direct (host has a public IP, e.g. a cloud VM):**
1. In **GoDaddy → DNS**, add an **A record**: host `work` → your server's public IP.
2. Open/forward ports **80 and 443** to the host. Caddy (already in the stack) fetches a Let's Encrypt
   cert for `work.YOURDOMAIN` automatically — just set that domain in `deploy/Caddyfile`.

Verify: `https://work.YOURDOMAIN/browse` loads, and `.../robots.txt` + `.../sitemap.xml` return.

## C — Get indexed on Google
1. Go to **Google Search Console** → **Add property** → **Domain** → enter `YOURDOMAIN`.
2. Google gives a **TXT record** to verify ownership. Add it in **GoDaddy DNS** (or Cloudflare DNS if
   you moved nameservers). Click **Verify**.
3. In Search Console → **Sitemaps** → submit `https://work.YOURDOMAIN/sitemap.xml`.
4. (Optional) **URL Inspection** → enter the `/browse` URL → **Request indexing** to speed it up.

Indexing takes anywhere from hours to a few days. Share the link anywhere meanwhile — it works
immediately once step B is done.

---

## What I (Claude) can and can't do
- **Done + verified:** landing, favicon, robots, sitemap, SEO metadata, deploy env wiring, prod build.
- **Only you can do** (your credentials/accounts): run the stack on your host, change GoDaddy
  nameservers / add DNS records, and verify + submit in Google Search Console. I won't log into your
  GoDaddy or Google accounts or change account settings for you.
- **Hand me after:** once `work.YOURDOMAIN/browse` is live, send me the URL and I'll sanity-check it
  (metadata, robots, sitemap, mobile) and help with Search Console wording.

## Honest caveats before you flip it on
- **Real jobs will be sparse** until real employers post — the Canada-wide spread you saw in the demo
  was seeded local data. Consider seeding a few genuine openings first.
- **Platform launch gates still apply** (legal terms / CNESST, finance go-live). The landing + sign-up
  going public is fine with payments off; the *governed money flow* stays gated until those clear.
