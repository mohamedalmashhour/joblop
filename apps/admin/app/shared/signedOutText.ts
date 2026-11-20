import type { PageText } from "../i18n/pageTextCore";

// Copy for the one shared "please sign in" block shown on every staff page when the visitor is
// signed out (or signed in without staff access). English, French (Québec) and Arabic.

export type SignedOutCopy = {
  title: string;
  body: string;
  signIn: string;
};

export const signedOutText: PageText<SignedOutCopy> = {
  en: {
    title: "Please sign in",
    body: "This page is for Joblop staff. Sign in with your staff account and you'll come right back here.",
    signIn: "Sign in"
  },
  fr: {
    title: "Veuillez vous connecter",
    body: "Cette page est réservée au personnel de Joblop. Connectez-vous avec votre compte du personnel et vous reviendrez ici.",
    signIn: "Se connecter"
  },
  ar: {
    title: "يُرجى تسجيل الدخول",
    body: "هذه الصفحة مخصّصة لفريق Joblop. سجّل الدخول بحساب الفريق وستعود إلى هذه الصفحة مباشرة.",
    signIn: "تسجيل الدخول"
  }
};

/**
 * The sign-in link with a return path. Only a same-site path is kept (it must start with one "/"
 * and must not point back at the sign-in page), so the link can never send staff to another site.
 */
export function signInHref(returnTo: string | null | undefined): string {
  const next = safeReturnPath(returnTo);
  return next ? `/signin?next=${encodeURIComponent(next)}` : "/signin";
}

export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if ([...value].some((ch) => ch.charCodeAt(0) < 0x20)) return null;
  if (value === "/signin" || value.startsWith("/signin?") || value.startsWith("/signin/")) return null;
  if (value.startsWith("/api/")) return null;
  return value;
}
