"use client";

import { LOCALE_COOKIE } from "./config";

// Keep the worker's account language in step with the website language, so job offers, texts,
// emails and push notices reach them in the language they read (EN / FR / AR). Best-effort: a
// signed-out visitor or a network error changes nothing on the page.

const SYNCED_KEY = "joblop_language_synced";

export async function saveAccountLanguage(locale: string): Promise<void> {
  try {
    const response = await fetch("/api/profile/language", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language: locale })
    });
    if (response.ok) {
      try {
        window.sessionStorage.setItem(SYNCED_KEY, locale);
      } catch {
        /* storage blocked: we simply sync again next time */
      }
    }
  } catch {
    /* offline: try again next time */
  }
}

/** For a signed-in page: save the chosen language once per visit, only if the worker chose one. */
export function syncAccountLanguageOnce(locale: string): void {
  const chosen = document.cookie.split("; ").some((c) => c.startsWith(`${LOCALE_COOKIE}=`));
  if (!chosen) return;
  try {
    if (window.sessionStorage.getItem(SYNCED_KEY) === locale) return;
  } catch {
    /* storage blocked: sync anyway */
  }
  void saveAccountLanguage(locale);
}
