// The staff screen's text for a refused offer or assignment when the worker already holds a shift at
// that time (409 RWOS_SHIFT_OVERLAP). The API writes the message in EN / FR / AR; pick the screen's.
export async function readShiftOverlapNotice(response: Response, locale: string): Promise<string | null> {
  if (response.status !== 409) return null;
  try {
    const body = (await response.clone().json()) as { error?: unknown; message?: unknown; messages?: Record<string, unknown> };
    if (body.error !== "RWOS_SHIFT_OVERLAP") return null;
    const lang = locale === "ar" ? "ar" : locale.startsWith("fr") ? "fr" : "en";
    const localized = body.messages?.[lang];
    if (typeof localized === "string" && localized) return localized;
    return typeof body.message === "string" ? body.message : null;
  } catch {
    return null;
  }
}
