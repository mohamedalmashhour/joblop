import { brand } from "@rwos/design-system";

// Dark-first palette pulled from the single source of truth. Black canvas, dark-raised cards with
// gold hairlines, cream text — no white/cream section backgrounds (the platform-wide dark-first rule).
export const ui = {
  black: brand.black,
  raised: brand.ink, // #0c0c0c dark-raised card
  raisedStrong: brand.charcoal,
  hairline: "rgba(248, 184, 8, 0.22)", // gold hairline
  hairlineSoft: "rgba(250, 246, 236, 0.1)",
  gold: brand.gold,
  goldSoft: brand.goldSoft,
  text: brand.onBlack, // cream #faf6ec
  muted: "#b8ad97",
  danger: brand.danger,
  success: brand.success,
  onGold: brand.onGold
} as const;

export const STAGES = ["new", "contacted", "qualified", "active", "dormant"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  active: "Active",
  dormant: "Dormant"
};

export const CONTACT_TYPES = ["worker", "employer", "lead"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const TYPE_LABEL: Record<ContactType, string> = {
  worker: "Worker",
  employer: "Employer",
  lead: "Lead"
};
