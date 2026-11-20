import { SIGNED_OUT_SECTIONS, type SignedOutSection } from "@rwos/shared";

// Pure helpers for the signed-out first screen (no React, unit-tested).

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

/** The landing videos, bundled in the app (assets/media), the same two clips as the website front page. */
export const LANDING_VIDEO_FILES = {
  ready: { video: "workers-ready.mp4", poster: "workers-ready.jpg" },
  how: { video: "how-joblop-works.mp4", poster: "how-joblop-works.jpg" }
} as const;

/** True when a box (top y and height, in window points) is at least partly inside a window this tall. */
export function isOnScreen(top: number, height: number, windowHeight: number): boolean {
  return height > 0 && top + height > 0 && top < windowHeight;
}

/**
 * Whether a landing video should be playing: only when the person has not paused it (and, with
 * reduce motion on, has pressed play), it is on screen and the app is in the foreground.
 */
export function shouldVideoPlay(state: { wantsPlay: boolean; onScreen: boolean; appActive: boolean }): boolean {
  return state.wantsPlay && state.onScreen && state.appActive;
}
