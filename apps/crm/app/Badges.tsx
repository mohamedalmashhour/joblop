import { TYPE_LABEL, ui, type ContactType } from "./ui";

// Display-only consent badge. In this phase the CRM never sends anything; this only surfaces whether
// the linked user has given CASL marketing consent (users.marketing_email_opt_in_at), so staff know
// before the separate marketing phase is built. Green = opted in, grey = no consent on file.
export function ConsentBadge({ optedIn }: Readonly<{ optedIn: boolean }>) {
  return (
    <span
      title={
        optedIn
          ? "CASL marketing consent on file (display only — the CRM does not send in this phase)"
          : "No CASL marketing consent on file — never email this contact until they opt in"
      }
      style={{
        ...badgeBase,
        background: optedIn ? "rgba(23, 107, 71, 0.18)" : "rgba(250, 246, 236, 0.07)",
        border: `1px solid ${optedIn ? "rgba(23, 107, 71, 0.5)" : ui.hairlineSoft}`,
        color: optedIn ? "#6fd3a3" : ui.muted
      }}
    >
      {optedIn ? "✓ Opted in" : "No consent"}
    </span>
  );
}

export function TypeBadge({ type }: Readonly<{ type: ContactType }>) {
  return (
    <span style={{ ...badgeBase, background: "rgba(248, 184, 8, 0.12)", border: `1px solid ${ui.hairline}`, color: ui.goldSoft }}>
      {TYPE_LABEL[type]}
    </span>
  );
}

const badgeBase = {
  borderRadius: 999,
  display: "inline-block",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.02em",
  padding: "3px 9px",
  whiteSpace: "nowrap" as const
};
