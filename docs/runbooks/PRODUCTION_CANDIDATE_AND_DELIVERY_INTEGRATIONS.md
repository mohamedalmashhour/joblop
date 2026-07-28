# Production Candidate and Offer Delivery Integrations

Status: application contracts implemented; provider credentials and staging exercises are external
launch gates.

## Candidate source

Enable only with both `CANDIDATE_SOURCE_ORIGIN` and `CANDIDATE_SOURCE_TOKEN`. The origin must use
HTTPS. The API otherwise uses the explicit unavailable candidate source.

The provider receives opaque dispatch, organization, work-group, role-definition, and time-window
references. It must return only authorized candidate summaries with:

- the exact requested organization ID;
- an active persisted Worker Identity UUID;
- one opaque source reference;
- approved display name and allowlisted evaluation states;
- a current source-freshness timestamp and positive evaluation version.

The application rejects malformed, cross-tenant, stale, missing-identity, duplicate-source, and
duplicate-worker results. Provider authorization must independently verify the calling service and
tenant scope. Do not return contact details, addresses, credentials, compensation, banking,
resident information, or free-form internal notes.

Before launch, exercise search and evaluation with valid, missing, inactive, revoked, stale,
duplicate, malformed, and cross-tenant records. Reconcile the persisted shortlist provenance and
verify no worker can be offered from an unrelated candidate record.

## Offer delivery

Enable only with both `OFFER_DELIVERY_ORIGIN` and `OFFER_DELIVERY_TOKEN`. The origin must use HTTPS.
Without a provider, send records a retryable delivery failure; it never reports delivered.

The provider receives an opaque Worker Offer ID, Worker Identity ID, and stable idempotency key. It
must resolve the destination inside its own authorized boundary and return exactly `sent`,
`delivered`, or `failed`. A failure may be marked retryable. The application records a truthful
delivery attempt and changes the offer to `delivered` only for that explicit outcome.

Retries reuse `worker-offer:<offer-id>:terms:<terms-id>`. The provider must atomically deduplicate
that key across replicas and retention windows. Never log or expose provider credentials,
destinations, message content, direct worker identifiers, or raw provider errors.

Before launch, prove successful send, asynchronous delivery receipt behavior, permanent failure,
retryable failure, timeout, malformed response, provider outage, duplicate retry, and concurrent
retry across replicas. Configure delivery latency/failure/duplicate alerts and retain only the
approved minimal delivery audit.
