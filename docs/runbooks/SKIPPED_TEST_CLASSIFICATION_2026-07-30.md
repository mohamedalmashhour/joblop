# Skipped Test Classification

Status: **EXACT LOCAL CLASSIFICATION — EXTERNAL EVIDENCE NOT CLAIMED**

| Test                                         | Reason skipped in the ordinary suite                           | Technical prerequisite                                    | Policy/legal decision                                            | Safe locally                                                | Staging acceptance evidence                                                  |
| -------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| C1 no buyer-facing economics leak            | Imported Kit helper lacks the consumer forbidden-key policy    | Correct Contract Kit v1.1 artifact/helper invocation      | Contract owner approves the exact forbidden-key policy           | No, not truthfully with the current imported helper         | Signed kit checksum, exact release result, zero forbidden-key leaks          |
| C2 sensitive routes reject unauth/wrong-role | Money-sensitive Kit routes do not exist                        | Approved adapter/route mapping                            | Owners define which financial routes and roles are authoritative | Policy-neutral route guards can be local; Kit result cannot | Staging 401/403 evidence for every mapped route and role                     |
| C4 commission excludes tax                   | STR commission rule is not the current HR marketplace model    | Effective-dated margin/fee adapter binding                | Finance/legal approve fee base and tax treatment                 | Arithmetic infrastructure only                              | Approved configuration snapshot and calculation vectors                      |
| C5 no paid without settlement reference      | No authorized external settlement provider                     | Provider reconciliation and durable settlement evidence   | Merchant, payer, settlement source and reconciliation owner      | Fake-provider invariants only                               | Stripe test event, reconciliation record, audit linkage, no false paid state |
| C5b sandbox ref rejected in production       | No approved sandbox/production reference contract              | Provider-mode/reference classifier                        | Provider/security approve environment separation                 | Fail-closed classifier is safe                              | Production-mode negative test rejecting test references                      |
| C6 fail-closed jurisdiction                  | Jurisdiction policy awaits counsel                             | Effective-dated jurisdiction/tax gate                     | Legal/accounting approve Québec/place-of-supply behavior         | Fail-closed configuration gate only                         | Approved policy version and blocked/unblocked test evidence                  |
| C7 issued terms remain frozen                | Adapter/compliance binding is incomplete                       | Immutable issued snapshot linked to approved terms        | Contract owner approves authoritative terms source               | Snapshot infrastructure is safe                             | Rate-change test proving issued document remains unchanged                   |
| C8 no double booking                         | Kit money fixture is not bound to Assignment                   | Approved adapter fixture mapping                          | No new legal rule; owner must approve Kit analogy/mapping        | Operational PostgreSQL concurrency test is safe             | Concurrent staging test and exact one-winner database evidence               |
| C9 append-only audit                         | Kit money/config/consent model is not bound                    | Durable financial policy/config audit adapter             | Finance/privacy owners approve retention and actor semantics     | Append-only infrastructure is safe                          | Before/after audit event, denied mutation path, retention evidence           |
| PostgreSQL final-slot Worker Offer           | Requires real PostgreSQL serialization                         | Disposable loopback or staging PostgreSQL with migrations | None                                                             | Yes                                                         | Exactly one committed offer and child database cleanup                       |
| PostgreSQL final-slot Assignment             | Requires real PostgreSQL serialization                         | Disposable loopback or staging PostgreSQL with migrations | None                                                             | Yes                                                         | Repeated exactly-one-winner evidence and cleanup                             |
| PostgreSQL overlapping Assignment            | Requires real PostgreSQL serialization                         | Disposable loopback or staging PostgreSQL with migrations | None                                                             | Yes                                                         | Repeated overlap denial evidence and cleanup                                 |
| QA-reset durable PostgreSQL lifecycle        | Requires migrated PostgreSQL and destructive fixture lifecycle | Disposable allowlisted child database                     | Staging manifest/cleanup owner approval externally               | Yes on disposable loopback                                  | 24-entity prepare/inspect/cleanup proof and unrelated-record preservation    |

The four PostgreSQL cases are executed locally through:

```sh
pnpm qa-reset:postgres:validate
```

The script creates a temporary loopback cluster, applies all migrations, verifies rollback and
advisory locking, asks the guarded PostgreSQL runner to create a random child database, runs the
four cases, drops the child database, stops the cluster, and removes its temporary directory.

The nine Contract Kit HR/money cases remain skipped until their stated inputs exist. Their current
skip status is deliberate and must not be converted to a fabricated pass.
