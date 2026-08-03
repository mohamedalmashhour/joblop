# Staging IAM diagnostic checkpoint — 2026-08-03

Project: `resident-workforce-os-staging`

Principal inspected: `user:info@sybnb.app`

Decision: **NO-GO for authenticated smoke testing**

This checkpoint records a diagnostic-only organization-policy inspection. It does not authorize
credential minting, QA Reset, authenticated smoke testing, infrastructure changes or broader IAM
access.

## Verified chronology

| Event                                        | UTC timestamp          |
| -------------------------------------------- | ---------------------- |
| Temporary organization viewer access granted | `2026-08-03T02:06:19Z` |
| Cleanup started                              | `2026-08-03T02:08:00Z` |
| Cleanup completed                            | `2026-08-03T02:08:06Z` |

## Verified controls and findings

- `accesscontextmanager.googleapis.com` is enabled.
- The organization IAM policy was semantically restored after cleanup.
- All four temporary bindings were verified absent:
  - `roles/iam.denyReviewer`
  - `roles/iam.principalAccessBoundaryViewer`
  - `roles/iam.workforcePoolViewer`
  - `roles/accesscontextmanager.policyReader`
- Persistent user-managed keys on the inspected staging service account remained at zero.
- Existing project IAM bindings were preserved exactly.
- Project Data Access audit logging is limited to `iam.googleapis.com`, with `ADMIN_READ` and
  `DATA_READ` only.
- The audit configuration has no exempted principals.
- No organization or project IAM deny policy was visible.
- No Access Context Manager access policy or VPC Service Controls perimeter was visible.
- No IAM Condition affected the temporary diagnostic roles.
- Principal Access Boundary visibility is **incomplete**: the authorized list operation returned
  permission denied even though the temporary predefined viewer binding contained the documented
  list permission.
- Workforce Identity visibility is **incomplete** for the same reason.

The narrow `iam.googleapis.com` audit configuration remains enabled only for the next separately
approved credential test. It must not be broadened or disabled without separate approval.

## Actions not performed

- No Service Account Token Creator grant.
- No access token or identity token minted.
- No authenticated smoke test or QA Reset.
- No persistent service-account key.
- No PAB, Workforce Identity, VPC Service Controls, organization-policy or runtime-infrastructure
  change.

## Blocking conclusion

Independent organization-security review is required before credential testing. Until its evidence
and a separate written authorization exist, authenticated smoke and QA Reset remain blocked.
