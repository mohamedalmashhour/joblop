import { describe, expect, it, vi } from "vitest";
import { createMobileSessionTransport, readUploadSignature, type SecureSessionVault } from "./secureSession";

vi.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn()
}));

// Launch step 7: the app calls the same API routes as the worker website for the job page, offers,
// documents, profile and CV builder. These tests pin the requests and the parsed answers.

const origin = "https://api.example.com";
const JOB = "11111111-1111-4111-8111-111111111111";

function vault(token: string | null = "session-token-step7"): SecureSessionVault {
  let stored = token;
  return {
    read: async () => stored,
    write: async (next) => {
      stored = next;
    },
    clear: async () => {
      stored = null;
    }
  };
}

function response(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
}

function transportWith(fetchMock: ReturnType<typeof vi.fn>, token: string | null = "session-token-step7") {
  return createMobileSessionTransport({ apiOrigin: origin, vault: vault(token), fetch: fetchMock as never });
}

describe("job page transport", () => {
  it("parses required certificates, long-term, claimable, bonus and allowances; never an employer rate", async () => {
    const fetchMock = vi.fn(async () =>
      response(200, {
        job: {
          jobRequestId: JOB,
          role: "PAB",
          title: "Night PAB",
          employerName: "Résidence A",
          verifiedEmployer: true,
          city: "Laval",
          province: "QC",
          startAt: "2026-12-01T03:00:00.000Z",
          endAt: "2026-12-01T11:00:00.000Z",
          openings: 2,
          workerRateMinor: 2400,
          employerRateMinor: 4100,
          currency: "CAD",
          safetyNotes: "Badge at the front desk.",
          qualifications: [],
          claimable: true,
          longTerm: false,
          requiredCertificates: { keys: ["pab", "other"], other: "Vaccination record" },
          missingCertificates: ["pab"],
          bonus: { kind: "hourly", amountMinor: 250 },
          allowances: { transport: { provision: "allowance", amountMinor: 1500, note: null }, meal: null, lodging: null }
        }
      })
    );
    const result = await transportWith(fetchMock).marketplaceJob(JOB, "H7N 1A1");
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.data).toMatchObject({
      workerRateMinor: 2400,
      claimable: true,
      longTerm: false,
      safetyNotes: "Badge at the front desk.",
      requiredCertificates: { keys: ["pab", "other"], other: "Vaccination record" },
      missingCertificates: ["pab"],
      bonus: { kind: "hourly", amountMinor: 250 }
    });
    expect(result.data.allowances?.transport).toEqual({ provision: "allowance", amountMinor: 1500, note: null });
    expect(JSON.stringify(result.data)).not.toContain("4100");
  });

  it("reads the application state (long-term employer choice) and withdraws it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(200, {
          interest: { status: "shortlisted", employerDecision: "shortlisted" },
          lastEmployerDecision: "shortlisted",
          eligibility: { eligible: true, reasons: [] }
        })
      )
      .mockResolvedValueOnce(response(200, { withdrawn: true }));
    const transport = transportWith(fetchMock);
    const state = await transport.jobInterest(JOB);
    expect(state).toEqual({
      status: "ready",
      data: {
        interest: { status: "shortlisted", employerDecision: "shortlisted" },
        lastEmployerDecision: "shortlisted",
        eligibility: { eligible: true, reasons: [] }
      }
    });
    expect((await transport.withdrawInterest(JOB)).status).toBe("ready");
    expect(fetchMock).toHaveBeenLastCalledWith(`${origin}/marketplace/jobs/${JOB}/interest`, expect.objectContaining({ method: "DELETE" }));
  });

  it("returns the missing-certificate reasons when applying is refused", async () => {
    const fetchMock = vi.fn(async () => response(422, { error: "RWOS_INTEREST_INELIGIBLE", reasons: ["missing_certificate:pab"] }));
    expect(await transportWith(fetchMock).expressInterest(JOB)).toEqual({ status: "ineligible", reasons: ["missing_certificate:pab"] });
  });

  it("tells a missing pay choice apart from a full shift when claiming", async () => {
    const election = vi.fn(async () => response(409, { error: "RWOS_CLASSIFICATION_ELECTION_REQUIRED" }));
    expect((await transportWith(election).claimOpenJob(JOB)).status).toBe("election_required");
    const full = vi.fn(async () => response(409, { status: "full" }));
    expect((await transportWith(full).claimOpenJob(JOB)).status).toBe("full");
  });

  it("searches by city or postal code with the website's `place` field", async () => {
    const fetchMock = vi.fn(async () => response(200, { jobs: [], total: 0 }));
    await transportWith(fetchMock).marketplaceSearch({ postalCode: "Montréal" });
    const body = JSON.parse(((fetchMock.mock.calls[0] as unknown[])[1] as { body: string }).body) as Record<string, unknown>;
    expect(body.place).toBe("Montréal");
    expect(body).not.toHaveProperty("postalCode");
  });
});

describe("offers transport", () => {
  it("returns the API's own shift-overlap message (EN / FR / AR) when accepting", async () => {
    const fetchMock = vi.fn(async () =>
      response(409, {
        error: "RWOS_SHIFT_OVERLAP",
        message: "You already have a shift then.",
        messages: { en: "You already have a shift then.", fr: "Vous avez déjà un quart à ce moment.", ar: "لديك مناوبة في هذا الوقت." }
      })
    );
    const result = await transportWith(fetchMock).respondToWorkerOffer({
      offerId: "offer-1",
      decision: "accept",
      expectedVersion: 2,
      expectedTermsVersionId: "terms-1"
    });
    expect(result).toEqual({
      status: "shift_overlap",
      messages: { en: "You already have a shift then.", fr: "Vous avez déjà un quart à ce moment.", ar: "لديك مناوبة في هذا الوقت." }
    });
  });

  it("keeps any other 409 as a changed offer", async () => {
    const fetchMock = vi.fn(async () => response(409, { error: "RWOS_OFFER_STALE" }));
    const result = await transportWith(fetchMock).respondToWorkerOffer({ offerId: "offer-1", decision: "decline", expectedVersion: 2, expectedTermsVersionId: "terms-1" });
    expect(result.status).toBe("stale");
  });
});

describe("documents transport", () => {
  it("lists the worker's documents with status and the expiry staff set; 403 means not set up yet", async () => {
    const ok = vi.fn(async () =>
      response(200, {
        documents: [
          { id: "doc-1", documentType: "cert_pab", fileName: "pab.pdf", expiresAt: "2027-06-30T00:00:00.000Z", effectiveStatus: "accepted", storageReference: "secret" }
        ]
      })
    );
    const result = await transportWith(ok).workerDocuments();
    expect(result).toEqual({
      status: "ready",
      data: [{ id: "doc-1", documentType: "cert_pab", fileName: "pab.pdf", expiresAt: "2027-06-30T00:00:00.000Z", effectiveStatus: "accepted" }]
    });
    expect((await transportWith(vi.fn(async () => response(403, {}))).workerDocuments()).status).toBe("needs_setup");
    expect((await transportWith(vi.fn(async () => response(401, {}))).workerDocuments()).status).toBe("denied");
  });

  it("uploads like the website: signed reference, the bytes, then the submission", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(200, { storageReference: "w1/cert_pab/abc", uploadUrl: "/api/documents/blob?ref=w1%2Fcert_pab%2Fabc&sig=s1g" }))
      .mockResolvedValueOnce(response(200, { ok: true }))
      .mockResolvedValueOnce(response(201, { document: { id: "doc-2" } }));
    const result = await transportWith(fetchMock).uploadWorkerDocument({
      documentType: "cert_pab",
      fileName: "pab.pdf",
      contentType: "application/pdf",
      dataBase64: "JVBERi0x"
    });
    expect(result.status).toBe("ready");
    const calls = fetchMock.mock.calls as unknown as [string, { body: string }][];
    expect(calls.map((c) => c[0])).toEqual([`${origin}/hr/documents/upload-reference`, `${origin}/hr/documents/blob`, `${origin}/hr/documents`]);
    expect(JSON.parse(calls[1]![1].body)).toMatchObject({ ref: "w1/cert_pab/abc", sig: "s1g", contentType: "application/pdf", dataBase64: "JVBERi0x" });
    expect(JSON.parse(calls[2]![1].body)).toEqual({ documentType: "cert_pab", storageReference: "w1/cert_pab/abc" });
  });

  it("reads the upload signature out of the API's upload URL", () => {
    expect(readUploadSignature("/api/documents/blob?ref=a%2Fb&sig=xyz")).toEqual({ ref: "a/b", sig: "xyz" });
    expect(readUploadSignature("https://fixture-storage.local/upload?ref=a")).toBeNull();
  });
});

describe("profile and CV transport", () => {
  it("reads the HR profile and saves the details with PUT /hr/worker", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(200, {
          standing: "active",
          credentials: [{ id: "c1", credentialType: "PAB", expiresAt: null, effectiveStatus: "valid" }],
          intake: { legalFirstName: "Marie", hasDrivingLicence: true, licenceExpiry: "2028-01-01T00:00:00.000Z" }
        })
      )
      .mockResolvedValueOnce(response(200, { intake: {} }));
    const transport = transportWith(fetchMock);
    const profile = await transport.workerProfile();
    expect(profile.status).toBe("ready");
    if (profile.status === "ready") {
      expect(profile.data.standing).toBe("active");
      expect(profile.data.intake).toMatchObject({ legalFirstName: "Marie", hasDrivingLicence: true, licenceExpiry: "2028-01-01" });
    }
    expect((await transport.saveWorkerIntake({ city: "Laval" })).status).toBe("ready");
    expect(fetchMock).toHaveBeenLastCalledWith(`${origin}/hr/worker`, expect.objectContaining({ method: "PUT" }));
  });

  it("builds a CV and keeps the API's fallback note in EN / FR / AR", async () => {
    const fetchMock = vi.fn(async () =>
      response(200, {
        cv: { headline: "Cook", cvMarkdown: "# Marie", coverLetterMarkdown: "Hello" },
        providerKind: "synthetic",
        pro: true,
        saved: true,
        fallback: { reason: "daily_limit", message: { en: "Daily limit reached.", fr: "Limite quotidienne atteinte.", ar: "تم بلوغ الحد اليومي." } }
      })
    );
    const result = await transportWith(fetchMock).buildCv({ profile: { fullName: "Marie" }, jobTitle: "Cook" });
    expect(result).toEqual({
      status: "ready",
      data: {
        headline: "Cook",
        cvMarkdown: "# Marie",
        coverLetterMarkdown: "Hello",
        aiWritten: false,
        saved: true,
        pro: true,
        fallback: { reason: "daily_limit", message: { en: "Daily limit reached.", fr: "Limite quotidienne atteinte.", ar: "تم بلوغ الحد اليومي." } }
      }
    });
  });

  it("reads Worker Pro status only (no price, no purchase)", async () => {
    const fetchMock = vi.fn(async () =>
      response(200, { pro: true, entitlement: { plan: "pro", source: "trial", expiresAt: "2026-11-20T00:00:00.000Z" }, price: { amount: 1299 } })
    );
    expect(await transportWith(fetchMock).cvPlan()).toEqual({ status: "ready", data: { pro: true, source: "trial", expiresAt: "2026-11-20T00:00:00.000Z" } });
  });

  it("asks nothing of the network without a session", async () => {
    const fetchMock = vi.fn();
    const transport = transportWith(fetchMock, null);
    expect((await transport.workerDocuments()).status).toBe("denied");
    expect((await transport.cvPlan()).status).toBe("denied");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
