import { foldPlaceText } from "@rwos/shared";

// The "Role" box of the worker job search. Workers type a word ("Nurse", "préposé", "cook") or pick
// a suggestion; jobs store a role key ("psw") and a label ("Personal Support Worker"). A role matches
// when its key is exactly the text, or its label or key contains the text, ignoring accents and case.
// A role filter that matches nothing returns no jobs: it is never silently ignored.

export type RoleRow = Readonly<{ id: string; key: string; displayLabel: string }>;

export function matchingRoleIds(roles: readonly RoleRow[], query: string): string[] {
  const raw = query.trim();
  if (!raw) return [];
  const q = foldPlaceText(raw);
  return roles
    .filter((r) => r.key === raw || (q.length > 0 && (foldPlaceText(r.displayLabel).includes(q) || foldPlaceText(r.key).includes(q))))
    .map((r) => r.id);
}
