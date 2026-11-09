import { SIGNED_OUT_SECTIONS, type SignedOutSection } from "@rwos/shared";

// Pure helpers for the signed-out first screen (no React, unit-tested).

/** How long each "How Joblop works" step plays before the next one. */
export const HOW_IT_WORKS_STEP_MS = 3200;

/** The next step, looping back to the first after the last. */
export function nextHowItWorksStep(step: number, count: number): number {
  return count > 0 ? (step + 1) % count : 0;
}

/** The next JobScanner demo stage (four stages, looping). */
export function nextDemoStage(stage: number): number {
  return (stage + 1) % 4;
}

/** The testID of a section's container on the signed-out screen (same names as the website's data-section). */
export function sectionTestId(section: SignedOutSection): string {
  return `public-section-${section}`;
}

/** Every section's testID, top to bottom. */
export const SIGNED_OUT_SECTION_TEST_IDS: readonly string[] = SIGNED_OUT_SECTIONS.map(sectionTestId);
