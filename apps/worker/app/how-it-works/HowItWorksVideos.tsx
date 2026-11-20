"use client";

import { useLocale, useT } from "../i18n/LocaleProvider";
import { VideoCard } from "../VideoCard";
import { HERO_VIDEO, HOW_IT_WORKS_VIDEO, videoForLocale } from "../landingVideos";

// The landing videos, moved off the simple home page. Each follows the chosen language
// (landingVideos.ts): the French-only clip never shows in English or Arabic.
export function HowItWorksVideos() {
  const t = useT();
  const locale = useLocale();
  const how = videoForLocale(HOW_IT_WORKS_VIDEO, locale);
  const hero = videoForLocale(HERO_VIDEO, locale);
  if (!how && !hero) return null;
  return (
    <section className="hiw-videos" aria-label={t("land.videoHowLabel")}>
      {how ? (
        <VideoCard
          key={how.src}
          src={how.src}
          poster={how.poster}
          label={t("land.videoHowLabel")}
          soundLabel={t("land.videoSoundOn")}
          muteLabel={t("land.videoSoundOff")}
          playLabel={t("land.videoPlay")}
          withSound
        />
      ) : null}
      {hero ? (
        <VideoCard
          key={hero.src}
          src={hero.src}
          poster={hero.poster}
          label={t("land.videoReadyLabel")}
          soundLabel={t("land.videoSoundOn")}
          muteLabel={t("land.videoSoundOff")}
          playLabel={t("land.videoPlay")}
          withSound
        />
      ) : null}
    </section>
  );
}
