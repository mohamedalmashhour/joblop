import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState, Dimensions, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useEvent } from "expo";
import { VideoView, useVideoPlayer } from "expo-video";
import { isOnScreen, shouldVideoPlay } from "./publicLandingContent";

// The website's VideoCard (apps/worker/app/VideoCard.tsx) for the phone app: a short phone-shaped
// clip bundled in the app (no network), played inline with expo-video. It autoplays muted and loops;
// sound only plays when the person asks for it ("Sound on" / "Sound off"). The poster shows until the
// first frame is drawn. With reduce motion on it never autoplays: the poster and a Play button show
// until the person presses play. It pauses while scrolled off screen and while the app is in the background.

/** The screen's scroll, so a card can check whether it is still on screen. */
export type LandingScroll = { subscribe: (listener: () => void) => () => void };
export const LandingScrollContext = createContext<LandingScroll | null>(null);

export function VideoCard({
  source,
  poster,
  label,
  soundOnLabel,
  soundOffLabel,
  playLabel,
  pauseLabel,
  testID
}: {
  source: number;
  poster: number;
  label: string;
  soundOnLabel: string;
  soundOffLabel: string;
  playLabel: string;
  pauseLabel: string;
  testID?: string;
}) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
  });
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });
  const { status } = useEvent(player, "statusChange", { status: player.status });

  // Starts "not wanted" until the reduce-motion setting is known, so it never flashes into motion.
  const [wantsPlay, setWantsPlay] = useState(false);
  const [muted, setMuted] = useState(true);
  const [firstFrame, setFirstFrame] = useState(false);
  const [started, setStarted] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [appActive, setAppActive] = useState(AppState.currentState !== "background");
  const box = useRef<View>(null);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (alive && !reduced) setWantsPlay(true);
      })
      .catch(() => {
        if (alive) setWantsPlay(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => setAppActive(next === "active"));
    return () => sub.remove();
  }, []);

  const scroll = useContext(LandingScrollContext);
  const check = useCallback(() => {
    box.current?.measureInWindow((_x, y, _w, h) => setOnScreen(isOnScreen(y, h, Dimensions.get("window").height)));
  }, []);
  useEffect(() => (scroll ? scroll.subscribe(check) : undefined), [scroll, check]);

  const play = shouldVideoPlay({ wantsPlay, onScreen, appActive });
  useEffect(() => {
    if (play) player.play();
    else player.pause();
  }, [play, player]);

  useEffect(() => {
    if (isPlaying) setStarted(true);
  }, [isPlaying]);

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  const toggleSound = () => {
    setMuted((m) => !m);
    setWantsPlay(true); // like the website: turning the sound on also plays a paused clip
  };

  // The poster stays until the clip has started and its picture is ready (first frame, or ready to play).
  const showPoster = !(started && (firstFrame || status === "readyToPlay"));

  return (
    <View ref={box} style={styles.card} testID={testID} onLayout={check}>
      <VideoView
        accessibilityLabel={label}
        allowsPictureInPicture={false}
        contentFit="cover"
        fullscreenOptions={{ enable: false }}
        nativeControls={false}
        onFirstFrameRender={() => setFirstFrame(true)}
        player={player}
        playsInline
        style={styles.video}
      />
      {showPoster ? <Image accessibilityIgnoresInvertColors accessibilityLabel={label} resizeMode="cover" source={poster} style={styles.poster} /> : null}
      {!isPlaying ? (
        <Pressable
          accessibilityLabel={playLabel}
          accessibilityRole="button"
          onPress={() => setWantsPlay(true)}
          style={({ pressed }) => [styles.bigPlay, pressed ? styles.pressed : null]}
          testID={testID ? `${testID}-play` : undefined}
        >
          <Text style={styles.bigPlayText}>▶</Text>
        </Pressable>
      ) : null}
      <View style={styles.controls}>
        <Pressable
          accessibilityLabel={isPlaying ? pauseLabel : playLabel}
          accessibilityRole="button"
          hitSlop={6}
          onPress={() => setWantsPlay(!isPlaying)}
          style={({ pressed }) => [styles.chip, pressed ? styles.pressed : null]}
          testID={testID ? `${testID}-toggle` : undefined}
        >
          <Text style={styles.chipText}>{isPlaying ? "⏸" : "▶"}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ checked: !muted }}
          hitSlop={6}
          onPress={toggleSound}
          style={({ pressed }) => [styles.chip, pressed ? styles.pressed : null]}
          testID={testID ? `${testID}-sound` : undefined}
        >
          <Text style={styles.chipText}>{muted ? `🔈 ${soundOnLabel}` : `🔇 ${soundOffLabel}`}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "center",
    aspectRatio: 9 / 16,
    backgroundColor: "#000000",
    borderColor: "#1a1a1a",
    borderRadius: 28,
    borderWidth: 6,
    maxWidth: 280,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    width: "100%"
  },
  video: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  poster: { bottom: 0, height: "100%", left: 0, position: "absolute", right: 0, top: 0, width: "100%" },
  pressed: { opacity: 0.85 },
  bigPlay: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(248, 184, 8, 0.92)",
    borderRadius: 999,
    height: 64,
    justifyContent: "center",
    position: "absolute",
    top: "50%",
    marginTop: -32,
    width: 64
  },
  bigPlayText: { color: "#000000", fontSize: 22, marginLeft: 4 },
  controls: {
    bottom: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0
  },
  chip: {
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 14
  },
  chipText: { color: "#ffffff", fontSize: 13, fontWeight: "700" }
});
