-- Instant contact: one private conversation between a worker or employer and Joblop (AI first, then
-- admin staff). Non-destructive: two new tables. Messages are never edited or deleted by the app.
CREATE TABLE "support_conversations" (
    "id" UUID NOT NULL,
    "requester_user_id" UUID NOT NULL,
    "requester_kind" TEXT NOT NULL,
    "organization_id" UUID,
    "topic" TEXT NOT NULL,
    "related_type" TEXT,
    "related_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'ai',
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "handoff_reason" TEXT,
    "summary" TEXT,
    "assigned_to_user_id" UUID,
    "last_message_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requester_read_at" TIMESTAMPTZ(3),
    "admin_read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "support_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "author_kind" TEXT NOT NULL,
    "author_user_id" UUID,
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "support_conversations_requester_idx" ON "support_conversations"("requester_user_id", "last_message_at");
CREATE INDEX "support_conversations_queue_idx" ON "support_conversations"("status", "urgent", "last_message_at");
CREATE INDEX "support_messages_conversation_idx" ON "support_messages"("conversation_id", "created_at");
CREATE INDEX "support_messages_ai_usage_idx" ON "support_messages"("author_kind", "created_at");

ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "support_conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
