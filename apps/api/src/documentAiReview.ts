import {
  type DocumentAiVerdict,
  offlineAdvisoryVerdict,
  parseModelVerdict
} from "@rwos/shared";

// Claude-backed advisory review of a NON-sensitive worker document image (CV, certificate, photo,
// first-aid). Raw HTTP to the Anthropic Messages API (no SDK), activated only when ANTHROPIC_API_KEY is
// set — otherwise the caller uses the offline advisory verdict. Sensitive documents are never passed
// here (the route decides that before calling). Output is ADVISORY; a human HR admin still decides.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export type ClaudeDocReviewConfig = Readonly<{ apiKey: string; model?: string; fetchImpl?: typeof fetch }>;

// Only image types the vision model accepts. PDFs/others -> caller falls back to offline (human) path.
const SUPPORTED_IMAGE_TYPES: ReadonlySet<string> = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function isReviewableImageType(mediaType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.has(mediaType);
}

function parseText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .filter((b): b is { type: string; text: string } => !!b && typeof b === "object" && (b as { type?: string }).type === "text" && typeof (b as { text?: unknown }).text === "string")
    .map((b) => b.text)
    .join(" ")
    .trim();
}

/** Ask Claude for a one-word advisory verdict on a document image. Throws on HTTP/parse failure so the
 *  caller can fall back to the offline advisory verdict (fail-safe, never blocks the worker). */
export async function reviewDocumentImageWithClaude(
  input: { imageBase64: string; mediaType: string; documentType: string },
  config: ClaudeDocReviewConfig
): Promise<DocumentAiVerdict> {
  const model = config.model ?? process.env.DOC_REVIEW_MODEL ?? "claude-opus-5-5";
  const doFetch = config.fetchImpl ?? fetch;
  const prompt = [
    `You are doing an ADVISORY readability pre-check of a worker's uploaded "${input.documentType}" for a staffing platform.`,
    `Do NOT make any identity, legal, or eligibility decision — only judge whether the image is a readable, plausible ${input.documentType}.`,
    `Answer with exactly ONE word:`,
    `APPROVE — it is a clear, readable document that plausibly matches "${input.documentType}".`,
    `REUPLOAD — it is blank, unreadable, cut off, or clearly the wrong kind of document.`,
    `HUMAN — you are unsure.`,
    `Output only that one word.`
  ].join("\n");

  const res = await doFetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": config.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model,
      // Room for the model's thinking as well as the one-word answer, which would otherwise be cut off.
      max_tokens: 2000,
      output_config: { effort: "low" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: input.mediaType, data: input.imageBase64 } },
            { type: "text", text: prompt }
          ]
        }
      ]
    })
  });
  if (!res.ok) throw new Error(`RWOS_DOC_REVIEW_HTTP_${res.status}`);
  const data = (await res.json()) as { content?: unknown };
  const text = parseText(data.content);
  if (!text) throw new Error("RWOS_DOC_REVIEW_EMPTY");
  return parseModelVerdict(text, input.documentType);
}

/** Best-effort advisory review: Claude vision when configured + image readable, else offline advisory.
 *  Never throws — a failed model call degrades to the offline verdict so the worker is never blocked. */
export async function reviewDocumentAdvisory(input: {
  documentType: string;
  expired: boolean;
  image: { base64: string; mediaType: string } | null;
}): Promise<DocumentAiVerdict> {
  // Expired or sensitive/unknown types resolve offline (the offline fn encodes those rules).
  const offline = offlineAdvisoryVerdict(input.documentType, { expired: input.expired });
  if (offline.status !== "ai_approved") return offline; // sensitive/expired/unknown -> don't call the model
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || !input.image || !isReviewableImageType(input.image.mediaType)) return offline;
  try {
    return await reviewDocumentImageWithClaude(
      { imageBase64: input.image.base64, mediaType: input.image.mediaType, documentType: input.documentType },
      { apiKey }
    );
  } catch {
    return offline;
  }
}
