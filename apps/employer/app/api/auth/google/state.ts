// Shared CSRF-state cookie name/path for the Google OAuth start→callback handshake. Kept out of the
// route files because Next.js route modules may only export HTTP handlers + route config.
export const GOOGLE_STATE_COOKIE = "rwos_google_oauth_state";
export const GOOGLE_STATE_PATH = "/api/auth/google";
