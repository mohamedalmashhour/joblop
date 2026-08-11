# Decision note: location persistence & distance strategy (Canada foundation)

**Decision: numeric latitude/longitude columns + a bounding-box SQL pre-filter, then
exact geodesic (haversine) distance in the domain. NO PostGIS in this phase.**

## Context
The architecture gap report found **PostGIS is not installed**. Introducing it is a
material dependency (extension, migration, ops surface) and the order says: do not add
it silently — decide first, and only add it if it materially improves correctness or
performance at our volumes.

## Why lat/lng + bounding box (not PostGIS) for now
- **Correctness is identical** for radius filtering: the authoritative distance is the
  geodesic (haversine) function in `@rwos/shared` (`geodesicDistanceKm`), already
  tested. PostGIS would compute the same great-circle distance.
- **Performance is adequate at MVP/test volumes.** The query pattern is: pre-filter
  candidate rows with a cheap **bounding box** on indexed `latitude`/`longitude`
  (`lat BETWEEN … AND … AND lng BETWEEN … AND …`), then compute exact geodesic distance
  on the small candidate set and drop rows outside the radius. A B-tree index on
  `(latitude, longitude)` supports the box scan. This avoids full-table geodesic math.
- **No hidden dependency / ops cost.** Keeps the migration reversible and the local/CI
  test DB simple.

## When we would revisit PostGIS
- Job/worksite volume grows to where the bounding-box pre-filter returns too many
  candidates, or we need true **nearest-N ordering at scale**, KNN indexes
  (`geography` + GiST/SP-GiST), or **driving distance/time** (a maps provider, not
  PostGIS). At that point, produce a migration + benchmark before adopting.

## What this phase persists
- Normalized authoritative location fields on the worksite/residence:
  `country='CA'`, `province`, `city`, `postal_code`, `latitude`, `longitude`,
  `geocode_precision`, `geocode_provider`, `geocode_provider_ref`, `geocode_resolved_at`.
- A **bounding-box helper** derives the lat/lng window for a given origin + radius so
  the DB does the cheap cull; the domain does the exact geodesic check + ranking.
- Provider results are **cached** on the worksite record (resolved once, re-rendered
  from stored coordinates) to respect provider licensing and avoid per-render calls.

## Guardrails preserved
- Server validates coordinates (`isValidCoordinate`) + Canada bounds
  (`isWithinCanadaBounds`) before trusting any lat/lng; browser-supplied coordinates
  are never authoritative.
- Distances are labelled **geodesic (straight-line)**, never mixed with driving distance.
