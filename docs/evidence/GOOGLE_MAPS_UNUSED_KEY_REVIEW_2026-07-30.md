# Google Maps Unused-Key Review — 2026-07-30

Status: **ZERO RWOS TRAFFIC VERIFIED; EXTERNALLY OWNED AND EXCLUDED**

Project: `resident-workforce-os-staging`

## Evidence

- The credential named `Maps Platform API Key` was created on 2026-07-30 and was shown as
  restricted to 35 APIs.
- Google Maps Platform metrics for the Maps JavaScript API, with the one-day window selected and
  all credentials/platforms/domains included, displayed:
  `No data is available for the selected time frame.`
- Repository inspection found no Google Maps SDK/API-key dependency. Employer and Admin use the
  current OpenStreetMap/Nominatim capsule. Worker mobile opens an ordinary Google Maps directions
  URL that does not require a key.
- No key value was opened, copied, printed, stored, or committed during this review.

## Owner decision

Keep the credential enabled because it may be required by another project. Resident Workforce OS
must not delete, disable, rotate, expose, copy, integrate, or otherwise modify it.

The credential is classified as externally owned and excluded from RWOS. Its continued enabled
state does not authorize RWOS use. Usage and billing remain subject to owner monitoring outside the
RWOS release boundary.

Google Maps APIs and credentials are not part of the current staging architecture. Any future
migration requires a separate provider decision and approval, plus a new staging-specific
credential with exact API and application restrictions. The broad 35-API credential must not be
repurposed.

`X1_STAGING_AUTHORIZED=NOT_YET`
