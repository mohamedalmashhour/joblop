# First Platform Administrator Bootstrap

Status: **IMPLEMENTED LOCALLY — STAGING EXECUTION REQUIRES OWNER AUTHORIZATION**

The bootstrap is a one-time staging job, not a public API. It is disabled unless
`RWOS_ADMIN_BOOTSTRAP_ENABLED=enabled`, requires `RWOS_ENV=staging`, validates the exact release
SHA, and accepts only an unexpired secret of at least 32 characters supplied through an approved
secret reference.

The PostgreSQL transaction obtains an advisory transaction lock, proves that no Platform
Administrator grant exists, creates one approved user, assigns the direct platform grant, marks
the singleton bootstrap record used, and writes a secret-free audit event. A repeated or concurrent
attempt cannot create a second administrator.

The initial user remains `email_verification_pending`, its identity requires MFA enrollment, and
the authorization resolver withholds the platform grant until the user becomes active through the
approved verification process. The initial password uses the repository scrypt policy. It must be
injected from a secret reference and rotated during verified identity enrollment; `ADMIN_PASSWORD`
is not consumed.

Required variable names:

- `DATABASE_URL`
- `RWOS_ENV`
- `RWOS_RELEASE_SHA`
- `RWOS_ADMIN_BOOTSTRAP_ENABLED`
- `RWOS_ADMIN_BOOTSTRAP_SECRET`
- `RWOS_ADMIN_BOOTSTRAP_SECRET_EXPIRES_AT`
- `RWOS_ADMIN_BOOTSTRAP_EMAIL`
- `RWOS_ADMIN_BOOTSTRAP_DISPLAY_NAME`
- `RWOS_ADMIN_BOOTSTRAP_INITIAL_PASSWORD`

Run only as an authorized singleton staging job:

```sh
pnpm bootstrap:first-admin
```

The command prints only the outcome. It never prints the email, password, secret, hashes, or
database URL.

## Emergency recovery

Emergency recovery is not automatic. A named release owner, security owner, and database owner
must authorize one of these reviewed actions:

1. recover the existing administrator through the approved identity/password process; or
2. add a separately designed, audited platform grant to an already verified user.

Never clear `initial_admin_bootstrap.used_at`, replace its secret digest, delete the existing
administrator, edit `_prisma_migrations`, or reuse the first-admin command. A second bootstrap
requires a new architecture change, migration, release SHA, incident record, and independent
review.
