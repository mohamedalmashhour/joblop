// HR-3 Compliance evaluator — centralized + explainable. Requirements are DATA (rows) keyed
// by jurisdiction/role/worksite/effective-date, resolved through an adapter — there are NO
// hard-coded country rules. This does not "know the law"; it evaluates the configured
// requirements against a worker's accepted documents + valid credentials.
//
// Architecture is ready for Canada→province and later country→region, because the resolver
// selects requirement rows by jurisdiction rather than branching on `if country === ...`.

export type ComplianceResult = "compliant" | "action_required" | "expiring_soon" | "non_compliant" | "review_required";

export type ComplianceRequirementRecord = Readonly<{
  id: string;
  key: string;
  jurisdiction: string;
  roleCategory: string | null;
  worksiteRef: string | null;
  requiredDocumentType: string | null;
  requiredCredentialType: string | null;
}>;

export type ComplianceReason = Readonly<{
  requirementKey: string;
  requiredType: string;
  kind: "document" | "credential";
  satisfied: boolean;
  detail: "accepted" | "valid" | "expiring" | "under_review" | "expired" | "rejected" | "missing";
}>;

export type ComplianceEvaluation = Readonly<{
  result: ComplianceResult;
  jurisdiction: string;
  roleCategory: string | null;
  evaluatedAt: string;
  reasons: readonly ComplianceReason[];
}>;

export type ComplianceEvidence = Readonly<{
  documents: readonly { documentType: string; effectiveStatus: string }[];
  credentials: readonly { credentialType: string; effectiveStatus: string }[];
}>;

// ── Ports (adapter mechanism) ──

export type ComplianceRequirementResolver = Readonly<{
  // Requirements applicable to (jurisdiction, role, worksite) effective on `date`.
  applicable(input: { jurisdiction: string; roleCategory: string | null; worksiteRef: string | null; date: Date }): Promise<readonly ComplianceRequirementRecord[]>;
}>;

export type ComplianceEvidenceReader = Readonly<{
  read(workerIdentityId: string): Promise<ComplianceEvidence>;
}>;

export type ComplianceDeps = Readonly<{
  requirements: ComplianceRequirementResolver;
  evidence: ComplianceEvidenceReader;
  now?: () => Date;
}>;

const RESULT_RANK: Record<ComplianceResult, number> = {
  compliant: 0,
  expiring_soon: 1,
  review_required: 2,
  action_required: 3,
  non_compliant: 4
};

function worstOf(a: ComplianceResult, b: ComplianceResult): ComplianceResult {
  return RESULT_RANK[a] >= RESULT_RANK[b] ? a : b;
}

export function createComplianceEvaluator(deps: ComplianceDeps) {
  const now = deps.now ?? (() => new Date());
  return {
    async evaluateWorkerCompliance(input: { workerIdentityId: string; jurisdiction: string; roleCategory?: string | null; worksiteRef?: string | null; date?: Date }): Promise<ComplianceEvaluation> {
      const date = input.date ?? now();
      const roleCategory = input.roleCategory ?? null;
      const worksiteRef = input.worksiteRef ?? null;
      const [reqs, evidence] = await Promise.all([
        deps.requirements.applicable({ jurisdiction: input.jurisdiction, roleCategory, worksiteRef, date }),
        deps.evidence.read(input.workerIdentityId)
      ]);

      const reasons: ComplianceReason[] = [];
      let result: ComplianceResult = "compliant";

      for (const req of reqs) {
        if (req.requiredDocumentType) {
          const docs = evidence.documents.filter((d) => d.documentType === req.requiredDocumentType);
          const { satisfied, detail, contribution } = classifyDocument(docs.map((d) => d.effectiveStatus));
          reasons.push({ requirementKey: req.key, requiredType: req.requiredDocumentType, kind: "document", satisfied, detail });
          result = worstOf(result, contribution);
        }
        if (req.requiredCredentialType) {
          const creds = evidence.credentials.filter((c) => c.credentialType === req.requiredCredentialType);
          const { satisfied, detail, contribution } = classifyCredential(creds.map((c) => c.effectiveStatus));
          reasons.push({ requirementKey: req.key, requiredType: req.requiredCredentialType, kind: "credential", satisfied, detail });
          result = worstOf(result, contribution);
        }
      }

      return { result, jurisdiction: input.jurisdiction, roleCategory, evaluatedAt: date.toISOString(), reasons };
    }
  };
}

function classifyDocument(statuses: readonly string[]): { satisfied: boolean; detail: ComplianceReason["detail"]; contribution: ComplianceResult } {
  if (statuses.includes("accepted")) return { satisfied: true, detail: "accepted", contribution: "compliant" };
  if (statuses.includes("expiring")) return { satisfied: true, detail: "expiring", contribution: "expiring_soon" };
  if (statuses.some((s) => s === "submitted" || s === "under_review")) return { satisfied: false, detail: "under_review", contribution: "review_required" };
  if (statuses.includes("expired")) return { satisfied: false, detail: "expired", contribution: "non_compliant" };
  if (statuses.includes("rejected")) return { satisfied: false, detail: "rejected", contribution: "action_required" };
  return { satisfied: false, detail: "missing", contribution: "non_compliant" };
}

function classifyCredential(statuses: readonly string[]): { satisfied: boolean; detail: ComplianceReason["detail"]; contribution: ComplianceResult } {
  if (statuses.includes("valid")) return { satisfied: true, detail: "valid", contribution: "compliant" };
  if (statuses.includes("expiring")) return { satisfied: true, detail: "expiring", contribution: "expiring_soon" };
  if (statuses.includes("expired")) return { satisfied: false, detail: "expired", contribution: "non_compliant" };
  return { satisfied: false, detail: "missing", contribution: "non_compliant" };
}

// ── Prisma adapters ──

type CompliancePrisma = {
  complianceRequirement: { findMany(args: unknown): Promise<ComplianceRequirementRow[]> };
  hrDocument: { findMany(args: unknown): Promise<{ documentType: string; status: string; expiresAt: Date | null }[]> };
  hrCredential: { findMany(args: unknown): Promise<{ credentialType: string; status: string; expiresAt: Date | null }[]> };
};
type ComplianceRequirementRow = { id: string; key: string; jurisdiction: string; roleCategory: string | null; worksiteRef: string | null; requiredDocumentType: string | null; requiredCredentialType: string | null };

// Resolver: select active requirement rows by jurisdiction (+ role when the row is role-scoped)
// effective on the date. Role-agnostic rows (roleCategory NULL) apply to everyone.
export function createPrismaComplianceRequirementResolver(prisma: CompliancePrisma): ComplianceRequirementResolver {
  return {
    async applicable({ jurisdiction, roleCategory, worksiteRef, date }) {
      const rows = await prisma.complianceRequirement.findMany({
        where: {
          jurisdiction,
          active: true,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
          AND: [
            { OR: [{ roleCategory: null }, ...(roleCategory ? [{ roleCategory }] : [])] },
            { OR: [{ worksiteRef: null }, ...(worksiteRef ? [{ worksiteRef }] : [])] }
          ]
        }
      });
      return rows.map((r) => ({ id: r.id, key: r.key, jurisdiction: r.jurisdiction, roleCategory: r.roleCategory, worksiteRef: r.worksiteRef, requiredDocumentType: r.requiredDocumentType, requiredCredentialType: r.requiredCredentialType }));
    }
  };
}

// Evidence reader — derives effective (expiry-applied) statuses for the worker's documents +
// credentials so the evaluator sees the same truth the rest of HR does.
export function createPrismaComplianceEvidenceReader(prisma: CompliancePrisma, deps?: { now?: () => Date; warningDays?: number }): ComplianceEvidenceReader {
  const now = deps?.now ?? (() => new Date());
  const warnMs = (deps?.warningDays ?? 30) * 24 * 60 * 60 * 1000;
  const effDoc = (status: string, expiresAt: Date | null): string => {
    if (status !== "accepted" || !expiresAt) return status;
    const t = expiresAt.getTime();
    if (t <= now().getTime()) return "expired";
    if (t <= now().getTime() + warnMs) return "expiring";
    return "accepted";
  };
  const effCred = (status: string, expiresAt: Date | null): string => {
    if (status !== "valid" || !expiresAt) return status;
    const t = expiresAt.getTime();
    if (t <= now().getTime()) return "expired";
    if (t <= now().getTime() + warnMs) return "expiring";
    return "valid";
  };
  return {
    async read(workerIdentityId) {
      const [docs, creds] = await Promise.all([
        prisma.hrDocument.findMany({ where: { workerIdentityId }, select: { documentType: true, status: true, expiresAt: true } }),
        prisma.hrCredential.findMany({ where: { workerIdentityId }, select: { credentialType: true, status: true, expiresAt: true } })
      ]);
      return {
        documents: docs.map((d) => ({ documentType: d.documentType, effectiveStatus: effDoc(d.status, d.expiresAt) })),
        credentials: creds.map((c) => ({ credentialType: c.credentialType, effectiveStatus: effCred(c.status, c.expiresAt) }))
      };
    }
  };
}
