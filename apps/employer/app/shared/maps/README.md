# Map capsule (OpenStreetMap, isolated + reusable)

Free OpenStreetMap — **no API key, no billing, no Google**. This is the RWOS counterpart of the STR
map capsule, kept isolated so it can be lifted into other surfaces with only import-path changes.

## Public surface

| Export | Kind | Purpose |
| --- | --- | --- |
| `LocationMap` | client component | Show one place: an OSM embed centred on `lat`/`lon` with a marker. |
| `JobLocationMap` | client component | Bind the map to a job's free-text address — geocodes it, renders the map + a **Get directions** link, and self-hides when the address is restricted/absent. |
| `geocodeAddress` | function | Browser → `/api/geocode` proxy (never Nominatim directly). |
| `directionsUrl` / `osmViewUrl` / `embedBbox` | functions | External routing + view links, bbox math. |

## How it fits together

- **`/api/geocode`** (`app/api/geocode/route.ts`) — server-side Nominatim proxy with a descriptive
  User-Agent, timeout, and in-memory cache. Browsers cannot call Nominatim directly (it blocks browser
  User-Agents), so all geocoding goes through here. RWOS has no geocode backend otherwise.
- **No coordinates in the domain.** Jobs carry a free-text `addressSummary`, so the map geocodes that
  string. The result is labelled *approximate* and *not a verified worksite*, to respect the app's
  location-verification framework.
- **CSP / policy.** The app's CSP is `frame-ancestors 'none'` only, so the OSM embed iframe and tiles
  load fine. `Permissions-Policy` disables in-app geolocation, so there is no "locate me" control —
  directions are handled by openstreetmap.org from the viewer's side.

## Reuse

- **Admin app (Next.js):** copy this folder + the `/api/geocode` route; identical surface.
- **Worker app (React Native):** provide a native `LocationMap`/`JobLocationMap` with the same public
  shape (react-native-maps or a WebView OSM embed) so callers are framework-agnostic.
