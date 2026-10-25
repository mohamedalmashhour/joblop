# Monday — NAS setup checklist (Synology DS923+)

Goal: get the NAS running with a redundant drive array, Docker ready, so we can deploy JobLop and
point joblop.com at it. ~1–2 hours, mostly waiting on the array to initialize.

## 0 — Buy (recap)
- **2 × 8 TB** NAS-rated **CMR** drives — Synology **HAT3300**, WD **Red Plus**, or Seagate **IronWolf**.
  (NOT plain WD Red / Blue / Barracuda — those are SMR.)
- Keep the **8 TB NexStar** + **12 TB** drive for backups (not the internal array).

## 1 — Install the drives
1. Power off, slide both drives into bays **1 and 2**, power on.
2. In **DSM → Storage Manager → Storage Pool → Create**:
   - Choose **SHR** (gives 1-drive fault tolerance with 2 drives = a mirror; easy to expand later).
   - Create the **Volume** on it (Btrfs recommended — it supports snapshots).
   - Let it run the parity/consistency check in the background (hours; usable meanwhile).
3. Result: **~8 TB usable, redundant** (one drive can fail with no data loss).

## 2 — Hardening (quick)
- **DSM → Control Panel → Security**: enable the firewall, auto-block, and HTTPS for DSM.
- Create a **non-admin user** for daily use; keep the admin account for setup only.
- **Control Panel → Update & Restore**: install the latest DSM + security updates.
- Do **NOT** expose DSM (port 5000/5001) to the internet.

## 3 — Install Docker + Tailscale
- **Package Center → install "Container Manager"** (Synology's Docker).
- **Package Center → install "Tailscale"** (Synology has an official package) → sign in. This is how
  you'll reach the **admin console** privately and manage the NAS off-site — never over the open web.

## 4 — Get the code onto the NAS
- Enable **SSH** (Control Panel → Terminal & SNMP) temporarily, or use Git in Container Manager.
- Clone the repo (or copy the `deploy/` folder + a built image). We'll do this step together.

## 5 — Then (we do this together, remotely)
- `cp deploy/.env.example deploy/.env` → fill secrets; set `WORKER_PUBLIC_URL=https://joblop.com`.
  **Leave payments/finance OFF** (no `FINANCE_LIVE`, no production card keys).
- Build + migrate + `up` (commands in `GO_LIVE_JOBLOP.md`).
- Point **joblop.com** (GoDaddy → Cloudflare Tunnel, or A record) → verify `https://joblop.com/browse`.
- Submit to **Google Search Console**.

## Notes
- The NAS easily runs this (32 GB RAM); the databases are only gigabytes.
- Nightly DB backups go to the 8 TB / 12 TB drives via `deploy/backup.sh` — set that up once live.
- Admin app stays Tailscale-only. Worker + employer are the only public sites.

When the drives are in and the array is up, ping me and we'll do steps 4–5 together.
