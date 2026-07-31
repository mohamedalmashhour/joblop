# Nominatim Public Service Review — 2026-07-30

Status: **LOCAL REVIEW — PRODUCTION USE NOT APPROVED**

## Decision

Resident Workforce OS keeps its current OpenStreetMap/Nominatim mapping capsule for local and
controlled staging validation. The public `nominatim.openstreetmap.org` service is not approved for
production at the current implementation state. No provider migration is made by this review.

## Current implementation

- Employer and Admin render a single-location OpenStreetMap iframe.
- Their same-origin `/api/geocode` routes call the public Nominatim search endpoint.
- Requests include the identifying User-Agent
  `resident-workforce-os/1.0 (+https://sybnb.app; info@sybnb.app)`.
- Each application instance has an in-memory cache for successful and no-match lookups.
- Lookups are user-triggered by rendering a job address; there is no autocomplete or bulk-geocoding
  workflow.
- Worker mobile opens Google Maps directions as an ordinary external URL and does not call a Maps
  API or use an API key.

## Policy assessment

The OpenStreetMap Foundation Nominatim Usage Policy requires, among other conditions:

- an absolute maximum of one request per second for the application;
- a valid identifying Referer or User-Agent;
- clear attribution;
- caching and the ability to switch providers where possible;
- no client-side autocomplete, systematic queries, or bulk use;
- no personal or confidential material submitted to the public service.

Source reviewed 2026-07-30:
<https://operations.osmfoundation.org/policies/nominatim/>

| Requirement                                     | Current evidence                                                                      | Result                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------- |
| Identifying User-Agent                          | Explicit application URL and contact address                                          | Meets locally           |
| User-triggered lookups                          | Job-detail map rendering only                                                         | Meets locally           |
| No autocomplete/bulk/systematic search          | No such code path found                                                               | Meets                   |
| Cache repeated queries                          | Per-process in-memory positive and negative cache                                     | Partial                 |
| Maximum 1 request/second across the application | No shared limiter across Cloud Run instances                                          | Does not meet           |
| Clear attribution for geocoding results         | OSM iframe/link exists, but the geocoding result has no explicit attribution contract | Partial                 |
| Provider switch without client release          | Endpoint is proxied, but provider selection is not configured                         | Partial                 |
| Avoid personal/confidential input               | Free-text job addresses may identify a workplace                                      | Requires privacy review |

## Required production gate

Before production, choose and validate one of:

1. A managed geocoding provider with contractual capacity, privacy terms, effective-dated
   configuration, quotas, monitoring, and a documented failover policy.
2. A separately operated Nominatim deployment with capacity, updates, monitoring, backups, and ODbL
   compliance owned by the platform.

If the public Nominatim service remains enabled for staging, add a shared rate limiter capped below
one request per second across all instances, durable caching, explicit attribution, address-data
minimization, monitoring, and a configuration-controlled provider switch. This does not authorize
production use.

## Google Maps credential disposition

The repository currently has no Google Maps API dependency. Employer and Admin use OSM; Worker uses
an external directions link requiring no key. The existing broad 35-API credential is externally
owned and excluded from RWOS: it must not be disabled, deleted, rotated, exposed, copied,
integrated, or modified by this project. Any future RWOS migration requires separate approval and a
new staging-specific credential with exact API and application restrictions. No Google Maps key may
enter Git, public bundles, Terraform output, logs, or documentation. Secret and public-bundle scans
reject the standard Google API key format.
