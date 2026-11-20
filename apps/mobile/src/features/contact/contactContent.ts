import type { ContactAuthor, ContactStatus, ContactTopic } from "../../auth/secureSession";

// Pure helpers for the "Contact Joblop" screens (no React), so they can be unit tested.

/** How often an open conversation or the list refreshes itself while on screen. */
export const CONTACT_REFRESH_MS = 15_000;

/** A message the worker is about to start, e.g. prefilled from a shift card on the calendar. */
export type ContactDraft = Readonly<{
  text: string;
  topic: ContactTopic;
  urgent: boolean;
  /** The worker's own assignment (shift) the conversation is about; the API checks ownership. */
  assignmentId: string | null;
  /** Human label of the linked shift (role · date), shown above the input. */
  label: string | null;
}>;

/** Quick topic buttons on a new conversation. "urgent" maps to topic "other" + urgent=true. */
export const QUICK_TOPICS = ["shift", "pay", "account", "urgent"] as const;
export type QuickTopic = (typeof QUICK_TOPICS)[number];

export function quickTopicKey(quick: QuickTopic): string {
  return quick === "urgent" ? "contact.quick.urgent" : `contact.topic.${quick}`;
}

export function applyQuickTopic(quick: QuickTopic): Readonly<{ topic: ContactTopic; urgent: boolean }> {
  return quick === "urgent" ? { topic: "other", urgent: true } : { topic: quick, urgent: false };
}

export function quickTopicOf(draft: Readonly<{ topic: ContactTopic; urgent: boolean }>): QuickTopic | null {
  if (draft.urgent) return "urgent";
  return draft.topic === "shift" || draft.topic === "pay" || draft.topic === "account" ? draft.topic : null;
}

export const EMPTY_DRAFT: ContactDraft = { text: "", topic: "other", urgent: false, assignmentId: null, label: null };

export function statusKey(status: ContactStatus): string {
  return `contact.status.${status}`;
}

export function statusTone(status: ContactStatus): "neutral" | "success" | "warning" | "danger" {
  if (status === "needs_admin") return "warning";
  if (status === "admin_replied") return "success";
  return "neutral";
}

const KNOWN_TOPICS = ["shift", "pay", "documents", "account", "other"];
export function topicKey(topic: string): string {
  return `contact.topic.${KNOWN_TOPICS.includes(topic) ? topic : "other"}`;
}

/** Label above a bubble; null for the worker's own messages and system notes. */
export function authorLabelKey(author: ContactAuthor): string | null {
  if (author === "ai") return "contact.author.ai";
  if (author === "admin") return "contact.author.admin";
  return null;
}

/** "Talk to a person" only makes sense while the assistant is still answering. */
export function canAskForPerson(status: ContactStatus): boolean {
  return status === "ai";
}

/** Draft for "Contact Joblop about this shift" from a calendar shift card. */
export function shiftDraft(
  shift: Readonly<{ title: string; startAt: string; refId: string | null }>,
  locale: string,
  prefillTemplate: string
): ContactDraft {
  const label = [shift.title.trim() || null, formatShiftDate(shift.startAt, locale)].filter(Boolean).join(" · ");
  return {
    text: prefillTemplate.replace("{label}", label),
    topic: "shift",
    urgent: false,
    assignmentId: shift.refId,
    label
  };
}

export function formatShiftDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
  } catch {
    return date.toISOString().slice(0, 16).replace("T", " ");
  }
}

/** Short date/time for a conversation row or a bubble. */
export function formatContactTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (!iso || !Number.isFinite(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
  } catch {
    return date.toISOString().slice(0, 16).replace("T", " ");
  }
}
