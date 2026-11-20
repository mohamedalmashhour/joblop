// Pure helpers for the in-app "Delete my account" request (no React, so they are unit-tested
// directly). The request is filed from inside the app as a conversation handed straight to Joblop
// staff, who verify and delete the account. Nothing is deleted on the device itself.
import type { MobileSessionTransport } from "../../auth/secureSession";

type DeletionTransport = Pick<MobileSessionTransport, "startContactConversation" | "askForPerson">;

/** The message staff read. Kept in English on purpose so every staff member can act on it. */
export const ACCOUNT_DELETION_REQUEST_TEXT =
  "ACCOUNT DELETION REQUEST (sent from the phone app). I confirm that I want my Joblop account and its personal information deleted.";

export type DeletionRequestResult =
  | Readonly<{ status: "sent" }>
  /** `conversationId` is set when the request was written but not yet handed to staff; pass it back to retry. */
  | Readonly<{ status: "offline" | "denied" | "failed"; conversationId: string | null }>;

/**
 * Files the request: writes it as an "account" conversation, then hands that conversation to a
 * person. It only counts as sent when staff have it. A retry reuses the conversation already
 * written, so a flaky connection never files the request twice.
 */
export async function requestAccountDeletion(
  transport: DeletionTransport,
  locale: string,
  existingConversationId: string | null = null
): Promise<DeletionRequestResult> {
  let conversationId = existingConversationId;
  if (!conversationId) {
    const started = await transport.startContactConversation({ text: ACCOUNT_DELETION_REQUEST_TEXT, topic: "account", locale });
    if (started.status !== "ready") return { status: failure(started.status), conversationId: null };
    conversationId = started.id;
  }
  const handed = await transport.askForPerson(conversationId, locale);
  if (handed.status !== "ready") return { status: failure(handed.status), conversationId };
  return { status: "sent" };
}

function failure(status: string): "offline" | "denied" | "failed" {
  return status === "offline" || status === "denied" ? status : "failed";
}
