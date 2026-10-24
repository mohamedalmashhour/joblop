# Self-hosting all platforms — home server plan

**Goal:** run JobLop, SYBNB, Millo, PortiqAI, Carcad in ONE place you control (your NAS), data in
Québec (good for Loi 25), everything "under your eyes." This plan is honest about what that takes.

**Status: plan + templates. Nothing here deploys to production or flips a launch/finance gate.**

---

## 0. The honest reality (read first)
- **A home NAS is excellent for:** development, **staging**, **backups/archives**, internal tools, and a
  **control dashboard** to see all platforms. Low risk, high value.
- **Home-hosting *public production* is risky:** residential internet has a **dynamic IP**, often
  **blocked inbound ports (80/443)**, **slow upload** (which is what serving needs), and **no uptime
  guarantee** (power/internet blips). A NAS exposed to the internet is a known **ransomware target**.
  **SYBNB is already live publicly** — do not move it home without a migration + rollback plan.
- **Recommended shape — hybrid:**
  - **On the NAS:** all platforms for **dev/staging**, **backups**, and one **status dashboard**.
  - **Public production:** either keep on a **Canadian cloud VM** you control (data stays in Canada), or
    expose the NAS **only** through **Cloudflare Tunnel** (no open ports, hides your IP, free TLS + DDoS
    protection) and accept home-uptime limits for lower-stakes platforms first.
- **Never self-host the card-data path.** When payments open, use Stripe (they carry PCI). Frozen now.

## 1. What you need (hardware)
| Need | Why | Note |
|---|---|---|
| **Enough compute** | 5 platforms × (web apps + API + DB) is a lot | A consumer NAS CPU/RAM may not be enough. **Tell me your NAS model + CPU + RAM.** Ideal: **16–32 GB RAM**, x86-64 (not ARM) for easy Docker images. A **mini-PC/NUC or small tower** often beats a NAS for running many apps. |
| **Fast internal storage (SSD)** for databases | Postgres on spinning/USB disk is slow and risky | Live DBs on **internal SSD in RAID** (redundancy), not the external drive |
| **The 12 TB external** → **backups/archives only** | USB drives disconnect; bad for a live DB | Great as one backup copy (not the live data) |
| **UPS (battery backup)** | A power blip can **corrupt a database** | **Non-negotiable** for any machine running Postgres |
| **A second, offsite backup** | Fire/theft/ransomware at home = total loss | 3-2-1 rule (below) |

## 2. What you need (network)
- A **domain per platform** (you have sybnb.app, etc.).
- **Cloudflare (free)** in front: DNS, TLS, DDoS protection, and **Cloudflare Tunnel** so the NAS needs
  **no open ports** and your home IP stays hidden. This is the single biggest safety win for home hosting.
- If not using Cloudflare Tunnel: a **static IP or dynamic-DNS**, plus careful firewall + reverse proxy.

## 3. What you need (software) — the stack
- **Docker** (NAS "Container Manager"/Portainer, or Docker Engine on a mini-PC). Everything runs in
  containers, so it's identical on the NAS, a cloud VM, or your Mac.
- Per platform: its **web app(s)** + **API** + its **Postgres** (or one Postgres server with a database
  per platform). A **reverse proxy** (Caddy = automatic TLS, simplest) or Cloudflare Tunnel routes
  each domain to the right container.
- **One `docker-compose` per platform** (JobLop template ships with this plan under `deploy/`).

## 4. Proposed layout (all platforms, one box)
```
NAS / mini-PC (Docker)
├── caddy or cloudflared        → routes each domain to the right app, TLS
├── postgres (one server)       → db: joblop, sybnb, millo, portiqai, carcad (SSD volume)
├── joblop:   api + worker + employer + admin
├── sybnb:    api + web
├── millo:    app
├── portiqai: app   (test-only; no live cards)
├── carcad:   app
└── backups:  nightly pg_dump of every db → 12 TB drive → + offsite copy
```
One **status dashboard** (e.g. Uptime Kuma, free) shows every platform's health in one screen — the
"under your eyes" part.

## 5. Backups — the 3-2-1 rule (do this before any production)
- **3 copies** of data, **2 media**, **1 offsite**.
- Nightly automated `pg_dump` of every database → **(a)** the NAS, **(b)** the **12 TB external**,
  **(c)** an **offsite** copy (encrypted to a cloud bucket, or a drive you rotate off-site).
- Test a **restore** monthly. A backup you've never restored is not a backup.

## 6. Security checklist (home exposure)
- Expose **only** via Cloudflare Tunnel (or, if ports, only 443; everything else firewalled).
- NAS admin UI **never** on the public internet; reach it over **VPN/Tailscale** only.
- Separate the DB container from the internet (no public port; only the APIs talk to it).
- Keep the OS/NAS firmware patched; unique strong admin passwords; 2FA on the NAS.
- Secrets in a `.env` per platform (not in git), file-permission locked.
- PII + Loi 25: data in Canada ✅ (it's your home), but **breach response** is now your duty — backups +
  patching + least exposure are the controls.

## 7. Phased plan (low risk → higher)
1. **Phase 1 — NAS as dev/staging + backups.** Run every platform on the NAS internally (Tailscale/VPN
   only), nightly backups to the 12 TB drive + offsite. Zero public exposure. **Start here.**
2. **Phase 2 — status dashboard** (Uptime Kuma) so you see all platforms in one place.
3. **Phase 3 — public-expose the lowest-stakes platform** via Cloudflare Tunnel, watch uptime for a few
   weeks. Keep SYBNB (live) where it is until you trust the setup.
4. **Phase 4 — decide per platform:** home-prod via Tunnel, or Canadian cloud VM for the ones that need
   real uptime. Payments/finance gates unchanged (frozen until CPA + your go).

## 8. What I need from you to tailor this
- **NAS make/model, CPU, RAM, free SSD space** (decides how much can run on it).
- Whether you'll use **Cloudflare** (recommended) and have a **UPS**.
- Which platform to **containerize first** (JobLop is templated here).

*Starter templates for JobLop live under `deploy/` (docker-compose + Caddyfile + Dockerfiles).*
