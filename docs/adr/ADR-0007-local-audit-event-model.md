# ADR-0007 - Local Audit Event Model

**Status:** Accepted for RWO-G02  
**Date:** 2026-07-13

## Decision

Record local audit events for G02 worker commitment actions in the mock repository.

Audited actions include:

- application submitted
- duplicate application blocked
- application withdrawn
- offer accepted
- offer declined
- expired offer or confirmation blocked
- final confirmation accepted
- final confirmation declined
- confirmation conflict blocked

## Reason

G02 is still local and synthetic, but worker commitment actions should already be modeled as
observable state changes. This gives future API work a clear audit contract without connecting
production services.

## Consequences

- Audit events are local only and not production evidence.
- The model is ready for future API persistence.
- The UI remains human-controlled; no AI or system actor confirms a worker shift in G02.
- Production audit storage remains outside this milestone.
