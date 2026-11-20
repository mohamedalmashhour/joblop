import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";

// Save the signed-in worker's language (EN / FR / AR) on their account, so job offers, texts,
// emails and push notices reach them in the language they chose on the website.
export async function PUT(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = (await request.json().catch(() => null)) as { language?: unknown } | null;
  const raw = typeof body?.language === "string" ? body.language.trim().toLowerCase() : "";
  const language = raw.startsWith("ar") ? "ar" : raw.startsWith("fr") ? "fr" : raw.startsWith("en") ? "en" : null;
  if (!language) {
    return Response.json({ status: "invalid", message: "Language must be en, fr or ar." }, { status: 400 });
  }
  const result = await gateway.request("/worker/language", "PUT", token, { language });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json({ language }, { headers: { "cache-control": "private, no-store" } });
}
