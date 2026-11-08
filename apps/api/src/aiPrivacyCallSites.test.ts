// Every outside-AI call site: the outgoing request body must hold no email, phone, postal code, SIN,
// card, bank or street address from the inputs, while the useful content (role, dates, pay wording) stays.
import type { PrismaClient } from "@rwos/database";
import { describe, expect, it, vi } from "vitest";
import { createClaudeCvProvider } from "./cvBuilderClaude";
import { reviewDocumentImageWithClaude } from "./documentAiReview";
import { createClaudeContactAi, createContactService, type ContactStore, type ConversationRow, type MessageRow } from "./instantContact";
import { createPrismaContactStore } from "./instantContactRoutes";

const PERSONAL = [
  "sam.tremblay@example.ca",
  "514-555-1234",
  "5145551234",
  "438) 555-0199",
  "H2X 1Y4",
  "H2X1Y4",
  "130 692 544",
  "130692544",
  "4111 1111 1111 1111",
  "1234567",
  "1234 rue Sainte-Catherine",
  "Sainte-Catherine",
  "Tremblay",
  "1990-05-12"
];

function expectClean(body: string) {
  for (const value of PERSONAL) expect(body, `leaked ${value}`).not.toContain(value);
}

function capture(responseBody: unknown) {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify(responseBody), { status: 200 }));
  return { fetchImpl: fetchImpl as unknown as typeof fetch, sent: () => String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body) };
}

const silent = { info: vi.fn() };
const contactAnswer = { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ reply: "Ok", handoff: false, urgent: false, summary: "" }) }] };

describe("contact chat call", () => {
  it("masks the message, the history and the facts, and keeps the shift and pay facts", async () => {
    const { fetchImpl, sent } = capture(contactAnswer);
    const logger = { info: vi.fn() };
    const facts = JSON.stringify({
      firstName: "Sam",
      lastName: "Tremblay",
      email: "sam.tremblay@example.ca",
      phone: "514-555-1234",
      exactAddress: "1234 rue Sainte-Catherine Ouest, Montréal, H2X 1Y4",
      shifts: [{ title: "Cook", attendanceStatus: "pending_start", scheduledStart: "2026-11-09T13:00:00.000Z", worksiteCity: "Montréal", note: "gate code at 1234 rue Sainte-Catherine Ouest" }],
      payStatements: [{ periodStart: "2026-10-26", periodEnd: "2026-11-08", currency: "CAD", gross: 950.5, net: 812.4, status: "approved" }]
    });
    await createClaudeContactAi({ apiKey: "k", fetchImpl, logger })({
      audience: "worker",
      topic: "pay",
      facts,
      turns: [
        { role: "user", text: "Hi, my pay is late. Call me at 514-555-1234 or (438) 555-0199, email sam.tremblay@example.ca" },
        { role: "assistant", text: "I can see your pay statement." },
        { role: "user", text: "I moved to 1234 rue Sainte-Catherine Ouest H2X 1Y4, my SIN is 130 692 544 and card 4111 1111 1111 1111" }
      ]
    });
    const body = sent();
    expectClean(body);
    expect(body).toContain("Cook");
    expect(body).toContain("2026-11-09T13:00:00.000Z");
    expect(body).toContain("approved");
    expect(body).toContain("812.4");
    expect(body).toContain("my pay is late");
    expect(body).toContain("[phone]");
    expect(body).toContain("Sam");
    expect(logger.info).toHaveBeenCalledWith("ai.privacy_filter", expect.objectContaining({ feature: "contact_chat" }));
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain("514");
  });
});

describe("staff assistant call (adminAsk)", () => {
  it("masks the conversation it sends", async () => {
    const { fetchImpl, sent } = capture(contactAnswer);
    const now = new Date("2026-11-08T12:00:00.000Z");
    const convo: ConversationRow = {
      id: "c1", requesterUserId: "u1", requesterKind: "worker", organizationId: null, topic: "pay", relatedType: null, relatedId: null,
      status: "needs_admin", urgent: false, handoffReason: "dispute", summary: "Worker at sam.tremblay@example.ca says pay is late.",
      assignedToUserId: null, lastMessageAt: now, requesterReadAt: null, adminReadAt: null, createdAt: now
    };
    const messages: MessageRow[] = [
      { id: "m1", conversationId: "c1", authorKind: "requester", authorUserId: "u1", body: "Pay late for my Cook shift on 2026-11-09. Text 514-555-1234, transit 12345 account 1234567", internal: false, createdAt: now }
    ];
    const store = { getConversation: async () => convo, listMessages: async () => messages } as unknown as ContactStore;
    const service = createContactService({ store, ai: createClaudeContactAi({ apiKey: "k", fetchImpl, logger: silent }), notices: { adminNeeded: async () => {}, adminReplied: async () => {} } });
    await service.adminAsk({ question: "Draft a reply. Their backup number is 438) 555-0199", conversationId: "c1" });
    const body = sent();
    expectClean(body);
    expect(body).toContain("Pay late for my Cook shift on 2026-11-09");
    expect(body).toContain("[bank account]");
  });
});

describe("contact facts (factsFor)", () => {
  it("sends a first name and the worksite city only: no full name or exact address", async () => {
    const prisma = {
      workerIdentity: { findFirst: async () => ({ id: "w1", displayName: "Sam Tremblay", classification: "employee" }) },
      attendanceRecord: {
        findMany: async () => [{
          status: "pending_start", scheduledStartAt: new Date("2026-11-09T13:00:00.000Z"), scheduledEndAt: new Date("2026-11-09T21:00:00.000Z"),
          timezone: "America/Toronto", checkInAt: null, checkOutAt: null, assignment: { confirmedTitle: "Cook" },
          residence: { city: "Montréal", region: "QC", addressLine1: "1234 rue Sainte-Catherine Ouest", postalCode: "H2X 1Y4" }
        }]
      },
      timesheet: { findMany: async () => [{ status: "approved", scheduledStartAt: new Date("2026-11-02T13:00:00.000Z"), payableMinutes: 480 }] },
      payrollCalculation: { findMany: async () => [{ currency: "CAD", grossPayMinor: 95050, totalDeductionsMinor: 13810, netPayMinor: 81240, payrollPeriod: { periodStart: new Date("2026-10-26"), periodEnd: new Date("2026-11-08") } }] },
      hrDocument: { findMany: async () => [{ documentType: "food_safety", status: "approved" }] }
    } as unknown as PrismaClient;
    const facts = await createPrismaContactStore(prisma).factsFor({ userId: "u1", side: "worker", name: "Sam Tremblay", email: "sam.tremblay@example.ca", organizationId: null });
    expectClean(facts);
    const parsed = JSON.parse(facts) as { firstName: string; shifts: { title: string; worksiteCity: string; exactLocationOnShiftPage: boolean }[] };
    expect(parsed.firstName).toBe("Sam");
    expect(parsed.shifts[0]).toMatchObject({ title: "Cook", worksiteCity: "Montréal", exactLocationOnShiftPage: true });
    expect(facts).not.toContain("w1");
  });
});

describe("CV builder call", () => {
  const profile = {
    fullName: "Sam Tremblay",
    headline: "Cuisinier",
    location: "Laval, QC",
    email: "sam.tremblay@example.ca",
    phone: "514-555-1234",
    summary: "Line cook. Reach me at (438) 555-0199 or 1234 rue Sainte-Catherine Ouest H2X 1Y4.",
    skills: ["Grill", "MAPAQ food safety"],
    experience: [{ role: "Line cook", employer: "Resto Laval", start: "2022", end: null, highlights: ["Ran the grill for 120 covers"] }],
    education: [{ credential: "DEP Cuisine", institution: "ITHQ", year: "2021" }],
    language: "fr" as const
  };

  it("sends no name or contact details, then adds them back locally", async () => {
    const modelText = "## Profil\nCuisinier de ligne.\n[phone] · [email]\n\n## Expérience\n**Line cook** — Resto Laval\n===COVER LETTER===\nMadame, Monsieur,\nJe postule.\nCordialement,\n[CANDIDATE_NAME]";
    const { fetchImpl, sent } = capture({ content: [{ type: "text", text: modelText }] });
    const cv = await createClaudeCvProvider({ apiKey: "k", fetchImpl, logger: silent }).generate({
      profile,
      job: { title: "Cuisinier", employer: "Hôtel X", city: "Montréal", description: "Apply: jobs@hotelx.ca or 514-555-1234" }
    });
    const body = sent();
    expectClean(body);
    expect(body).not.toContain("Sam");
    expect(body).not.toContain("jobs@hotelx.ca");
    expect(body).toContain("Line cook");
    expect(body).toContain("Resto Laval");
    expect(body).toContain("ITHQ");
    expect(body).toContain("MAPAQ food safety");
    expect(body).toContain("Laval, QC");
    expect(cv.cvMarkdown.startsWith("# Sam Tremblay\n_Cuisinier · Laval, QC_\nsam.tremblay@example.ca · 514-555-1234")).toBe(true);
    expect(cv.cvMarkdown).not.toContain("[phone]");
    expect(cv.cvMarkdown).toContain("## Expérience");
    expect(cv.coverLetterMarkdown).toContain("Cordialement,\nSam Tremblay");
    expect(cv.coverLetterMarkdown).not.toContain("[CANDIDATE_NAME]");
  });
});

describe("document review call", () => {
  it("sends only a short masked document type with the image", async () => {
    const { fetchImpl, sent } = capture({ content: [{ type: "text", text: "APPROVE" }] });
    await reviewDocumentImageWithClaude(
      { imageBase64: "aGVsbG8=", mediaType: "image/png", documentType: "cv of sam.tremblay@example.ca 514-555-1234 #1234567" },
      { apiKey: "k", fetchImpl, logger: silent }
    );
    const body = sent();
    expectClean(body);
    expect(body).toContain("cv of email phone");
    expect(body).toContain("aGVsbG8=");
  });
});
