// OSM map capsule — isolated + reusable. Free OpenStreetMap, no API key, no billing. Mirrors the STR
// map capsule's surface so it can be lifted into the admin app (same Next.js stack) with only import
// path changes; the worker (React Native) app gets a native equivalent with the same public shape.
export { LocationMap } from "./LocationMap";
export { JobLocationMap } from "./JobLocationMap";
export { directionsUrl, osmViewUrl, embedBbox } from "./directions";
export { geocodeAddress, type GeocodeResult } from "./geocodeClient";
