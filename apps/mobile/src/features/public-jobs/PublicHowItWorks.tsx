import { StyleSheet, Text, View } from "react-native";
import howVideo from "../../../assets/media/how-joblop-works.mp4";
import howPoster from "../../../assets/media/how-joblop-works.jpg";
import { VideoCard } from "./VideoCard";

// Signed-out first screen, "How Joblop works" (the website's how-it-works section): the website's
// real "How Joblop works" video first (bundled in the app, autoplays muted with Sound on / off and
// Play), then the same four steps as numbered cards with the same EN/FR/AR words. It never fetches
// anything, so it cannot delay the calendar below.

const ICONS = ["📍", "🤝", "⏱️", "💵"] as const;

export function PublicHowItWorks({
  isRtl,
  title,
  steps,
  video
}: {
  isRtl: boolean;
  title: string;
  steps: readonly { title: string; body: string }[];
  video: { label: string; soundOn: string; soundOff: string; play: string; pause: string };
}) {
  const rtl = isRtl ? styles.rtl : null;
  const row = isRtl ? styles.rowRtl : styles.row;

  return (
    <View style={styles.panel} testID="public-section-howitworks">
      <Text accessibilityRole="header" style={[styles.title, rtl]}>{title}</Text>

      <VideoCard
        source={howVideo}
        poster={howPoster}
        label={video.label}
        soundOnLabel={video.soundOn}
        soundOffLabel={video.soundOff}
        playLabel={video.play}
        pauseLabel={video.pause}
        testID="how-it-works-video"
      />

      <View style={styles.steps}>
        {steps.map((s, i) => (
          <View key={s.title} style={styles.stepCard}>
            <View style={[row, styles.stepHead]}>
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>{i + 1}</Text>
              </View>
              <Text style={styles.icon}>{ICONS[i] ?? "✓"}</Text>
            </View>
            <Text style={[styles.stepTitle, rtl]}>{s.title}</Text>
            <Text style={[styles.stepBody, rtl]}>{s.body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: "#0b0906", borderColor: "rgba(248, 184, 8, 0.22)", borderRadius: 20, borderWidth: 1, gap: 16, padding: 18 },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  row: { flexDirection: "row" },
  rowRtl: { flexDirection: "row-reverse" },
  title: { color: "#fbf7ee", fontSize: 26, fontWeight: "800" },
  steps: { gap: 10 },
  stepCard: {
    backgroundColor: "#0c0c0c",
    borderColor: "rgba(248, 184, 8, 0.18)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 16
  },
  stepHead: { alignItems: "center", justifyContent: "space-between" },
  bubble: { alignItems: "center", backgroundColor: "#f8b808", borderRadius: 999, height: 32, justifyContent: "center", width: 32 },
  bubbleText: { color: "#111111", fontSize: 15, fontWeight: "800" },
  icon: { fontSize: 24 },
  stepTitle: { color: "#f4efe4", fontSize: 18, fontWeight: "800" },
  stepBody: { color: "#cabfa8", fontSize: 15, lineHeight: 22 }
});
