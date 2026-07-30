// Native map capsule — free, keyless. Links a job address to real GPS directions via the device map
// app. The web (Next.js) counterpart is an embedded OSM map with the same "job address → directions"
// job; here on device we defer display + routing to the platform maps app.
export { JobLocationLink } from "./JobLocationLink";
export { directionsUrl, mapSearchUrl } from "./mapUrls";
