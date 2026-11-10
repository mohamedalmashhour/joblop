import { cookies } from "next/headers";
import { sessionCookieName } from "./api/sessionBoundary";

/**
 * True when the request carries a worker session cookie. Used only to choose where an old public URL
 * goes (a signed-out visitor is sent to Find work); every page still checks the session for real.
 */
export async function hasSessionCookie(): Promise<boolean> {
  const store = await cookies();
  return Boolean(store.get(sessionCookieName)?.value);
}
