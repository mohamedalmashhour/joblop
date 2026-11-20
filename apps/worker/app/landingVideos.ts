import { publicLandingLang, type PublicLandingLang } from "@rwos/shared";

// Which landing video each language gets. A video with words on screen only plays in its own
// language. When a language has no video, English is used; when there is no English one either, the
// video is hidden (never the French one shown to an English or Arabic visitor).

export type LandingVideo = Readonly<{ src: string; poster: string }>;
export type LandingVideosByLang = Readonly<Partial<Record<PublicLandingLang, LandingVideo>>>;

/** Hero clip "Des chefs et travailleurs prêts à aider": French words on screen, so French only. */
export const HERO_VIDEO: LandingVideosByLang = {
  fr: { src: "/media/workers-ready.mp4", poster: "/media/workers-ready.jpg" }
};

/** "How Joblop works": English words on screen, used for every language until others exist. */
export const HOW_IT_WORKS_VIDEO: LandingVideosByLang = {
  en: { src: "/media/how-joblop-works.mp4", poster: "/media/how-joblop-works.jpg" }
};

/** The video for the chosen language, else English, else null (hide it). */
export function videoForLocale(videos: LandingVideosByLang, locale: string | null | undefined): LandingVideo | null {
  return videos[publicLandingLang(locale)] ?? videos.en ?? null;
}
