import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { HOW_IT_WORKS_MOVIE_COPY, JOB_SCANNER_DEMO, JOB_SCANNER_DEMO_STEP_MS } from "@rwos/shared";
import { nextDemoStage } from "./publicLandingContent";

// The website's JobScanner demo (browse/JobScannerDemo + HowItWorksMovie), drawn with React Native's
// own Animated and the same EN/FR/AR words from @rwos/shared: a phone frame looping through "search
// once → JobScanner scans the market → ranked matches → apply free", with Pause / Watch and Replay.

const useNative = Platform.OS !== "web";

export function JobScannerDemo({ lang, isRtl }: { lang: "en" | "fr" | "ar"; isRtl: boolean }) {
  const d = JOB_SCANNER_DEMO[lang];
  const frame = HOW_IT_WORKS_MOVIE_COPY[lang];
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(true);
  const fade = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setStage(nextDemoStage), JOB_SCANNER_DEMO_STEP_MS[stage] ?? 2400);
    return () => clearTimeout(id);
  }, [stage, playing]);

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: useNative }).start();
  }, [fade, stage]);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: useNative }));
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rtl = isRtl ? styles.rtl : null;
  const row = isRtl ? styles.rowRtl : styles.row;
  const rise = { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] };
  const top = d.jobs[0];

  return (
    <View style={styles.panel}>
      <Text style={[styles.eyebrow, rtl]}>{frame.eyebrow}</Text>
      <Text style={[styles.title, rtl]}>{frame.title}</Text>
      <Text style={[styles.sub, rtl]}>{frame.sub}</Text>

      <View style={styles.phone}>
        <View style={styles.screen}>
          <View style={[styles.bar, row]}>
            <View style={styles.dot} />
            <Text style={styles.barText}>JobScanner</Text>
          </View>
          <Animated.View style={[styles.stage, rise]}>
            {stage === 0 ? (
              <>
                <View style={[styles.search, row]}>
                  <Text>🔎</Text>
                  <Text style={styles.typed}>{`${d.typed}|`}</Text>
                </View>
                <Text style={styles.hint}>{d.steps[0]}</Text>
              </>
            ) : null}
            {stage === 1 ? (
              <>
                <View style={styles.radar}>
                  <Animated.View
                    style={[styles.sweep, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }]}
                  />
                </View>
                <View style={styles.chips}>
                  {d.chips.map((chip) => (
                    <Text key={chip} style={styles.chip}>{chip}</Text>
                  ))}
                </View>
                <Text style={styles.hint}>{d.scanning}</Text>
              </>
            ) : null}
            {stage === 2 ? (
              <>
                <Text style={[styles.rank, rtl]}>{d.ranked.toUpperCase()}</Text>
                {d.jobs.map((job, i) => (
                  <View key={i} style={[styles.card, row]}>
                    <Text style={styles.ic}>🩺</Text>
                    <View style={styles.cmain}>
                      <Text style={[styles.cRole, rtl]}>{job.role}</Text>
                      <Text style={[styles.cArea, rtl]}>{job.area}</Text>
                    </View>
                    {job.urgent ? <Text style={styles.urgent}>{d.urgent.toUpperCase()}</Text> : null}
                    <Text style={styles.pay}>{job.pay}</Text>
                  </View>
                ))}
              </>
            ) : null}
            {stage === 3 ? (
              <>
                <View style={[styles.card, row, styles.cardTop]}>
                  <Text style={styles.ic}>🩺</Text>
                  <View style={styles.cmain}>
                    <Text style={[styles.cRole, rtl]}>{top.role}</Text>
                    <Text style={[styles.cArea, rtl]}>{top.area}</Text>
                  </View>
                  <Text style={styles.pay}>{top.pay}</Text>
                </View>
                <View style={styles.apply}>
                  <Text style={styles.applyText}>{d.apply}</Text>
                </View>
                <Text style={styles.applied}>{d.applied}</Text>
              </>
            ) : null}
          </Animated.View>
        </View>
      </View>

      <View style={[styles.steps, row]}>
        {d.steps.map((s, i) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityState={{ selected: stage === i }}
            onPress={() => {
              setStage(i);
              setPlaying(false);
            }}
            style={[styles.step, stage === i ? styles.stepOn : null]}
          >
            <Text style={[styles.stepText, stage === i ? styles.stepTextOn : stage > i ? styles.stepTextDone : null]}>
              {`${stage > i ? "✓" : i + 1}  ${s}`}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.controls, row]}>
        <Pressable accessibilityRole="button" onPress={() => setPlaying((p) => !p)} style={styles.ctlMain}>
          <Text style={styles.ctlMainText}>{playing ? `⏸ ${d.pause}` : `▶ ${d.watch}`}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setStage(0);
            setPlaying(true);
          }}
          style={styles.ctl}
        >
          <Text style={styles.ctlText}>{`↻ ${d.replay}`}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { alignItems: "center", backgroundColor: "#0b0906", borderColor: "rgba(248, 184, 8, 0.22)", borderRadius: 20, borderWidth: 1, gap: 14, padding: 18 },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  row: { flexDirection: "row" },
  rowRtl: { flexDirection: "row-reverse" },
  eyebrow: { alignSelf: "stretch", color: "#f8b808", fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  title: { alignSelf: "stretch", color: "#fbf7ee", fontSize: 24, fontWeight: "800" },
  sub: { alignSelf: "stretch", color: "#cabfa8", fontSize: 15, lineHeight: 22 },
  phone: { backgroundColor: "#15110b", borderRadius: 34, height: 400, padding: 10, width: 236 },
  screen: { backgroundColor: "#16120b", borderRadius: 26, flex: 1, overflow: "hidden" },
  bar: { alignItems: "center", gap: 7, paddingHorizontal: 16, paddingBottom: 10, paddingTop: 20 },
  dot: { backgroundColor: "#f8b808", borderRadius: 4, height: 7, width: 7 },
  barText: { color: "#f0e2c0", fontSize: 13, fontWeight: "800" },
  stage: { flex: 1, paddingHorizontal: 14, paddingVertical: 8 },
  search: { alignItems: "center", backgroundColor: "rgba(255, 255, 255, 0.1)", borderColor: "rgba(255, 255, 255, 0.14)", borderRadius: 12, borderWidth: 1, gap: 8, marginTop: 40, padding: 13 },
  typed: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  hint: { color: "#cbb482", fontSize: 12.5, marginTop: "auto", paddingBottom: 6, textAlign: "center" },
  radar: { alignSelf: "center", backgroundColor: "rgba(248, 184, 8, 0.06)", borderColor: "rgba(224, 195, 110, 0.5)", borderRadius: 75, borderWidth: 1, height: 150, marginBottom: 6, marginTop: 14, overflow: "hidden", width: 150 },
  sweep: { borderLeftColor: "transparent", borderRadius: 75, borderTopColor: "rgba(240, 217, 160, 0.6)", borderWidth: 75, height: 150, position: "absolute", width: 150, borderRightColor: "transparent", borderBottomColor: "transparent" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginVertical: 4 },
  chip: { backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: 999, color: "#f0e2c0", fontSize: 11, fontWeight: "700", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 4 },
  rank: { color: "#f8b808", fontSize: 11, fontWeight: "800", letterSpacing: 0.6, marginBottom: 10, marginTop: 30 },
  card: { alignItems: "center", backgroundColor: "#ffffff", borderRadius: 11, gap: 8, marginBottom: 8, padding: 10 },
  cardTop: { marginTop: 50 },
  ic: { fontSize: 15 },
  cmain: { flex: 1, minWidth: 0 },
  cRole: { color: "#171511", fontSize: 13, fontWeight: "800" },
  cArea: { color: "#6b6356", fontSize: 11 },
  urgent: { backgroundColor: "#fdece5", borderRadius: 999, color: "#e8562a", fontSize: 9, fontWeight: "800", overflow: "hidden", paddingHorizontal: 6, paddingVertical: 2 },
  pay: { color: "#e0a500", fontSize: 13, fontWeight: "800" },
  apply: { alignItems: "center", backgroundColor: "#f8b808", borderRadius: 12, marginTop: 14, padding: 13 },
  applyText: { color: "#1a1406", fontWeight: "800" },
  applied: { color: "#58f0a8", fontSize: 14, fontWeight: "800", marginTop: 12, textAlign: "center" },
  steps: { flexWrap: "wrap", gap: 8, justifyContent: "center" },
  step: { backgroundColor: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.1)", borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  stepOn: { borderColor: "#f8b808" },
  stepText: { color: "#b3a894", fontSize: 12.5, fontWeight: "700" },
  stepTextOn: { color: "#ffffff" },
  stepTextDone: { color: "#58f0a8" },
  controls: { flexWrap: "wrap", gap: 10, justifyContent: "center" },
  ctlMain: { backgroundColor: "#f8b808", borderRadius: 999, justifyContent: "center", minHeight: 44, paddingHorizontal: 16 },
  ctlMainText: { color: "#1a1406", fontSize: 13, fontWeight: "800" },
  ctl: { backgroundColor: "rgba(255, 255, 255, 0.06)", borderColor: "rgba(255, 255, 255, 0.18)", borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 16 },
  ctlText: { color: "#f0e2c0", fontSize: 13, fontWeight: "700" }
});
