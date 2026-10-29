// Embedded job grading — Phase 4 (ACR-0005): advisory parsing of a free-text job description into
// factor-degree SIGNALS. Defines a neutral port; ships a DETERMINISTIC, OFFLINE/SYNTHETIC default (no
// real model, no network) matching the advisory-AI pattern (offline default, real model gated).
//
// Binding: this NEVER auto-assigns the tier. `gradeFromDescription` always returns needsHumanReview =
// true, because a parsed grade is a suggestion for a human reviewer — not an automated decision.

import { COMPENSABLE_FACTORS, gradeRole, type FactorDegree, type FactorDegrees, type GradeResult, type RoleFamily } from "./jobGrading";

export type ParsedGradeSignals = Readonly<{
  degrees: FactorDegrees;
  confidence: number; // 0..1 — synthetic heuristics are intentionally modest
  rationale: string; // human-readable, for the reviewer; never a pay guarantee
}>;

export interface JobGradingParser {
  parse(input: Readonly<{ description: string; family: RoleFamily; locale: "en" | "fr" }>): Promise<ParsedGradeSignals>;
}

// Signal lexicon per factor (lowercased substring match, EN + FR). Each hit lifts the factor one
// degree above the base of 2, capped at 5. Deterministic for a given description.
const SIGNALS: Readonly<Record<(typeof COMPENSABLE_FACTORS)[number], readonly string[]>> = {
  // Qualifications & skill
  skill: ["certified", "certifié", "licensed", "licence", "diploma", "diplôme", "degree", "expert", "senior", "specialist", "spécialiste", "advanced", "avancé", "red seal", "sceau rouge"],
  // Effort — physical and mental demand
  effort: ["physical", "physique", "lift", "lifting", "soulever", "heavy", "lourd", "demanding", "exigeant", "stamina", "endurance", "fast-paced", "deadline", "échéance", "pressure", "pression", "mental", "concentration", "intense"],
  // Responsibilities
  responsibility: ["responsible", "responsable", "liability", "budget", "confidential", "confidentiel", "security", "sécurité des données", "accountable", "imputable", "manage", "gérer", "supervise", "superviser", "team", "équipe", "lead"],
  // Working conditions — environment, hazards, hours
  workingConditions: ["outdoor", "extérieur", "hazard", "danger", "hazardous", "dangereux", "noise", "bruit", "cold", "froid", "heat", "chaleur", "night", "nuit", "weekend", "fin de semaine", "exposure", "exposition", "confined", "espace clos", "heights", "hauteur"]
};

const BASE_DEGREE = 2;

function clampDegree(n: number): FactorDegree {
  return Math.min(5, Math.max(1, Math.round(n))) as FactorDegree;
}

/**
 * Deterministic, offline synthetic parser. Heuristic ONLY — modest confidence by design; its output is
 * always meant for human review. Real LLM providers implement the same port behind a gate (deferred).
 */
export const syntheticJobGradingParser: JobGradingParser = {
  parse: async ({ description }) => {
    const text = (description ?? "").toLowerCase();
    const degrees = {} as Record<(typeof COMPENSABLE_FACTORS)[number], FactorDegree>;
    const matched: string[] = [];
    for (const factor of COMPENSABLE_FACTORS) {
      let hits = 0;
      for (const token of SIGNALS[factor]) {
        if (text.includes(token)) {
          hits += 1;
          matched.push(`${factor}:${token}`);
        }
      }
      degrees[factor] = clampDegree(BASE_DEGREE + Math.min(3, hits));
    }
    const confidence = text.trim().length === 0 ? 0.2 : Math.min(0.6, 0.3 + matched.length * 0.05);
    const rationale = matched.length > 0 ? `Synthetic signals: ${matched.join(", ")}` : "Synthetic parse: no strong signals; base degrees applied.";
    return { degrees, confidence, rationale };
  }
};

export type DescriptionGradeResult =
  | Readonly<{ status: "graded"; grade: Extract<GradeResult, { status: "graded" }>; signals: ParsedGradeSignals }>
  | Readonly<{ status: "invalid"; reason: string }>;

/**
 * Parse a description → factor degrees → deterministic grade. ALWAYS flags human review (a parsed grade
 * is advisory, never an automated decision). Fail-closed if the resulting degrees are somehow invalid.
 */
export async function gradeFromDescription(
  parser: JobGradingParser,
  input: Readonly<{ description: string; family: RoleFamily; locale: "en" | "fr" }>
): Promise<DescriptionGradeResult> {
  const signals = await parser.parse(input);
  const graded = gradeRole(input.family, signals.degrees, { reviewAtOrAboveTier: 1 }); // force review
  if (graded.status !== "graded") return { status: "invalid", reason: graded.reason };
  return {
    status: "graded",
    grade: { ...graded, confidence: Math.min(graded.confidence, signals.confidence), needsHumanReview: true },
    signals
  };
}
