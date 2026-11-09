import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { PUBLIC_LANDING_COPY } from "@rwos/shared";
import { HOW_IT_WORKS_STEP_MS, nextHowItWorksStep } from "./publicLandingContent";

// Signed-out first screen, "How Joblop works" (the website's how-it-works section, same four steps
// and the same EN/FR/AR words): an in-app animation built with React Native's own Animated, so no
// video package and no new store build. It autoplays (it has no sound, so it is always muted), with
// Pause / Play and Replay. It never fetches anything, so it cannot delay the calendar below.

const useNative = Platform.OS !== "web";
const ICONS = ["📍", "🤝", "⏱️", "💵"] as const;

export function PublicHowItWorks({
  lang,
  isRtl,
  title,
  steps
}: {
  lang: "en" | "fr" | "ar";
  isRtl: boolean;
  title: string;
  steps: readonly { title: string; body: string }[];
}) {
  const copy = PUBLIC_LANDING_COPY[lang];
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const enter = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  // Each step slides in, then a gold bar fills while it plays.
  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: useNative }).start();
  }, [enter, step]);

  useEffect(() => {
    if (!playing) {
      progress.stopAnimation();
      return;
    }
    progress.setValue(0);
    const run = Animated.timing(progress, { toValue: 1, duration: HOW_IT_WORKS_STEP_MS, easing: Easing.linear, useNativeDriver: false });
    run.start(({ finished }) => {
      if (finished) setStep((s) => nextHowItWorksStep(s, steps.length));
    });
    return () => run.stop();
  }, [playing, progress, step, steps.length]);

  const current = steps[step] ?? steps[0]!;
  const shift = isRtl ? -24 : 24;
  const rtl = isRtl ? styles.rtl : null;
  const row = isRtl ? styles.rowRtl : styles.row;

  return (
    <View style={styles.panel} testID="public-section-howitworks">
      <Text accessibilityRole="header" style={[styles.title, rtl]}>{title}</Text>

      <View style={styles.stage}>
        <Animated.View
          style={[
            styles.stepCard,
            { opacity: enter, transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [shift, 0] }) }] }
          ]}
        >
          <View style={[row, styles.stepHead]}>
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>{step + 1}</Text>
            </View>
            <Text style={styles.icon}>{ICONS[step] ?? "✓"}</Text>
          </View>
          <Text style={[styles.stepTitle, rtl]}>{current.title}</Text>
          <Text style={[styles.stepBody, rtl]}>{current.body}</Text>
        </Animated.View>

        <View style={[row, styles.bars]}>
          {steps.map((s, i) => (
            <Pressable
              key={s.title}
              accessibilityLabel={s.title}
              accessibilityRole="button"
              accessibilityState={{ selected: i === step }}
              hitSlop={8}
              onPress={() => {
                setStep(i);
                setPlaying(false);
              }}
              style={styles.bar}
            >
              <Animated.View
                style={[
                  styles.barFill,
                  isRtl ? styles.barFillRtl : null,
                  {
                    width:
                      i < step ? "100%" : i === step ? progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) : "0%"
                  }
                ]}
              />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[row, styles.controls]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setPlaying((p) => !p)}
          style={({ pressed }) => [styles.ctlMain, pressed ? styles.pressed : null]}
          testID="how-it-works-play"
        >
          <Text style={styles.ctlMainText}>{playing ? `⏸ ${copy.pause}` : `▶ ${copy.play}`}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setStep(0);
            setPlaying(true);
          }}
          style={({ pressed }) => [styles.ctl, pressed ? styles.pressed : null]}
          testID="how-it-works-replay"
        >
          <Text style={styles.ctlText}>{`↻ ${copy.replay}`}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: "#0b0906", borderColor: "rgba(248, 184, 8, 0.22)", borderRadius: 20, borderWidth: 1, gap: 14, padding: 18 },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  row: { flexDirection: "row" },
  rowRtl: { flexDirection: "row-reverse" },
  pressed: { opacity: 0.85 },
  title: { color: "#fbf7ee", fontSize: 26, fontWeight: "800" },
  stage: { gap: 12 },
  stepCard: {
    backgroundColor: "#0c0c0c",
    borderColor: "rgba(248, 184, 8, 0.18)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    minHeight: 170,
    padding: 18
  },
  stepHead: { alignItems: "center", justifyContent: "space-between" },
  bubble: { alignItems: "center", backgroundColor: "#f8b808", borderRadius: 999, height: 34, justifyContent: "center", width: 34 },
  bubbleText: { color: "#111111", fontSize: 16, fontWeight: "800" },
  icon: { fontSize: 28 },
  stepTitle: { color: "#f4efe4", fontSize: 19, fontWeight: "800" },
  stepBody: { color: "#cabfa8", fontSize: 15, lineHeight: 22 },
  bars: { gap: 6 },
  bar: { backgroundColor: "rgba(255, 255, 255, 0.12)", borderRadius: 999, flex: 1, height: 5, overflow: "hidden" },
  barFill: { backgroundColor: "#f8b808", height: 5 },
  barFillRtl: { alignSelf: "flex-end" },
  controls: { flexWrap: "wrap", gap: 10, justifyContent: "center" },
  ctlMain: { backgroundColor: "#f8b808", borderRadius: 999, minHeight: 44, justifyContent: "center", paddingHorizontal: 18 },
  ctlMainText: { color: "#1a1406", fontSize: 14, fontWeight: "800" },
  ctl: { backgroundColor: "rgba(255, 255, 255, 0.06)", borderColor: "rgba(255, 255, 255, 0.18)", borderRadius: 999, borderWidth: 1, minHeight: 44, justifyContent: "center", paddingHorizontal: 18 },
  ctlText: { color: "#f0e2c0", fontSize: 14, fontWeight: "700" }
});
