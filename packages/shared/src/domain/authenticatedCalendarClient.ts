export type SameOriginSessionFetch = (
  input: string,
  init: Readonly<{ method: "POST" }>
) => Promise<Readonly<{ ok: boolean }>>;

export async function clearWebCalendarSession(request: SameOriginSessionFetch) {
  try {
    const response = await request("/api/session/sign-out", { method: "POST" });
    return response.ok;
  } catch {
    return false;
  }
}
