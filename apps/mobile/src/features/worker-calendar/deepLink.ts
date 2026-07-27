export function readWorkerCalendarOfferId(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const authorizedRoute =
      parsed.protocol === "rwos:" &&
      parsed.hostname === "worker" &&
      parsed.pathname === "/calendar";
    if (!authorizedRoute) return null;
    const offer = parsed.searchParams.get("offer");
    return offer && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(offer) ? offer : null;
  } catch {
    return null;
  }
}
