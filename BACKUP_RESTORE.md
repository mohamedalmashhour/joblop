# Resident Workforce OS Backup and Restore

Status: repository safeguards are implemented; production backup/PITR evidence is not available.

Required approved targets:

- RPO: set by the database and business owners.
- RTO: set by the database, operations, and business owners.
- Retention and encryption: set by security/privacy/legal and verified in the provider.

The repository supplies checksum validation and a guarded disposable-target restore rehearsal. It
does not configure provider backups, create production credentials, choose a PITR timestamp, or
authorize cutover.

Before launch, a named operator and witness must:

1. prove provider backup and PITR are enabled, encrypted, monitored, and retained for the approved
   period;
2. restore a recent recovery point into a new isolated database with the required sentinel;
3. apply/verify migrations, safe counts, constraints, tenant isolation, and authenticated read-only
   canaries;
4. record backup duration, restore duration, recovery point age, measured RPO, measured RTO, and
   non-secret provider job references;
5. destroy the disposable target through the provider’s approved process after evidence retention.

Exact commands, refusal safeguards, and the evidence template are in
`docs/runbooks/DATABASE_BACKUP_RESTORE_AND_MIGRATIONS.md`.

## Database-owner evidence checklist

- [ ] Provider, region, encryption policy, schedule, retention and PITR window recorded.
- [ ] Source recovery-point identifier and isolated target identifier recorded.
- [ ] Restore target confirmed non-production and source-unequal.
- [ ] Restore start/end and recovery-point timestamps recorded.
- [ ] Migration checksums and applied history verified.
- [ ] Constraints, safe aggregate counts and tenant-isolation canaries verified.
- [ ] API readiness and authenticated read-only critical-workflow canaries passed.
- [ ] Recovery point age recorded as measured RPO.
- [ ] Restore start to verified service readiness recorded as measured RTO.
- [ ] Monitoring/alerting behavior during restore recorded.
- [ ] Disposable target destruction and retained non-secret evidence recorded.
- [ ] Database owner and independent witness sign and date the result.
