// Taking a visitor to the start of the sign-up / sign-in form on the home page: the form's top sits
// just below the sticky header (CSS scroll-margin-top on .auth-card) and its first field gets focus.

export type AccountTab = "signin" | "signup";

/** Fired by the header's "Create account" / "Sign in" links when the form is already on the page. */
export const OPEN_ACCOUNT_EVENT = "joblop:open-account";

/** The home-page address that opens the form on a tab (works from any page). */
export function accountHref(tab: AccountTab): string {
  return `/?tab=${tab}#auth-card`;
}

type Focusable = { focus: (options?: FocusOptions) => void };
type FormBox = {
  scrollIntoView: (options?: ScrollIntoViewOptions) => void;
  querySelector: (selector: string) => Focusable | null;
};

export const FIRST_FIELD_SELECTOR = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

/**
 * Scroll the form so its top is just under the sticky header, then focus its first field without a
 * second scroll. `smooth` is false for people who prefer less motion.
 */
export function revealFormStart(box: FormBox | null, smooth = true): void {
  if (!box) return;
  box.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  box.querySelector(FIRST_FIELD_SELECTOR)?.focus({ preventScroll: true });
}

/** False when the visitor asked for less motion. */
export function prefersSmoothScroll(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
