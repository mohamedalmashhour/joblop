// Embedded job grading — wizard degree anchors (ACR-0005, Phase 4.5). Static, typed, bilingual
// (EN/FR) descriptions for each factor × degree (1–5), aligned to CNESST's statutory pay-equity
// factors. The employer wizard renders these so what the employer selects matches exactly what the
// backend scores. ACCESSIBLE plain-language tone (the formal/regulatory register lives in the audit
// note). Pure static content — no logic, no money.

import { COMPENSABLE_FACTORS, type CompensableFactor, type FactorDegree } from "./jobGrading";

export type DegreeAnchor = Readonly<{ en: string; fr: string }>;

export const WIZARD_DEGREE_ANCHORS: Readonly<
  Record<CompensableFactor, Readonly<Record<FactorDegree, DegreeAnchor>>>
> = {
  skill: {
    1: { en: "Basic onboarding; little or no prior experience or certification.", fr: "Intégration de base; peu ou pas d'expérience ou de certification." },
    2: { en: "Vocational training, a basic licence, or proven experience in a specific setting.", fr: "Formation professionnelle, permis de base ou expérience éprouvée dans un domaine précis." },
    3: { en: "Advanced trade certification, a diploma, or substantial technical experience.", fr: "Certification de métier avancée, diplôme ou expérience technique importante." },
    4: { en: "Full professional status or complete trade licensure (e.g. Red Seal, senior engineer).", fr: "Statut professionnel complet ou permis de métier complet (p. ex. Sceau rouge, ingénieur senior)." },
    5: { en: "Master-level expertise or a niche specialization with regulatory oversight.", fr: "Expertise de niveau maître ou spécialisation pointue avec surveillance réglementaire." }
  },
  effort: {
    1: { en: "Light tasks with frequent chances to rest or change focus.", fr: "Tâches légères avec occasions fréquentes de se reposer ou de changer de tâche." },
    2: { en: "Moderate physical strain or sustained mental/visual attention.", fr: "Effort physique modéré ou attention mentale/visuelle soutenue." },
    3: { en: "Heavy exertion (regular lifting around 23 kg) or intense, continuous focus.", fr: "Effort physique important (levées régulières d'environ 23 kg) ou concentration intense et continue." },
    4: { en: "High continuous strain or deep, uninterrupted problem-solving.", fr: "Contrainte élevée et continue ou résolution de problèmes soutenue et ininterrompue." },
    5: { en: "Extreme, prolonged physical or mental demand under safety-critical pressure.", fr: "Exigences physiques ou mentales extrêmes et prolongées, en contexte critique pour la sécurité." }
  },
  responsibility: {
    1: { en: "Accountable for your own work only; closely directed and checked.", fr: "Responsable de votre propre travail seulement; dirigé et vérifié de près." },
    2: { en: "Responsible for specific equipment/assets or small client interactions.", fr: "Responsable d'équipements ou de biens précis, ou d'interactions clients limitées." },
    3: { en: "Accountable for deliverables, safety protocols, or coordinating a small team/shift.", fr: "Responsable de livrables, de protocoles de sécurité ou de la coordination d'une petite équipe ou d'un quart." },
    4: { en: "Autonomy to make operational decisions, sign off compliance, or manage budgets/accounts.", fr: "Autonomie pour prendre des décisions opérationnelles, attester la conformité ou gérer des budgets/comptes." },
    5: { en: "Strategic or systemic accountability affecting major finances or liability.", fr: "Responsabilité stratégique ou systémique touchant des finances importantes ou la responsabilité civile." }
  },
  workingConditions: {
    1: { en: "Clean, climate-controlled setting with predictable hours.", fr: "Milieu propre et climatisé, avec un horaire prévisible." },
    2: { en: "Minor discomforts (noise, temperature) or minor schedule variability.", fr: "Inconforts mineurs (bruit, température) ou variabilité d'horaire mineure." },
    3: { en: "Routine hazards, an industrial setting, weather exposure, or high-stress operations.", fr: "Risques courants, milieu industriel, exposition aux intempéries ou opérations à fort stress." },
    4: { en: "High-risk environment requiring PPE, high voltage/machinery, or on-call/night shifts.", fr: "Milieu à risque élevé exigeant un ÉPI, haute tension ou machinerie, ou quarts de nuit/sur appel." },
    5: { en: "Continuous work in exceptionally hazardous, unpredictable conditions.", fr: "Travail continu dans des conditions exceptionnellement dangereuses et imprévisibles." }
  }
};

/** The anchor for one factor + degree (helper for the wizard). */
export function degreeAnchor(factor: CompensableFactor, degree: FactorDegree): DegreeAnchor {
  return WIZARD_DEGREE_ANCHORS[factor][degree];
}

/** Factor keys in the statutory order, for iterating the wizard. */
export const WIZARD_FACTOR_ORDER: readonly CompensableFactor[] = COMPENSABLE_FACTORS;
