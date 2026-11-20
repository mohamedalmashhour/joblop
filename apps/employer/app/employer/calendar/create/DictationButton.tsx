"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "../../../i18n/LocaleProvider";
import { styles } from "../../employerStyles";
import { appendDictation, dictationErrorKey, speechLanguage } from "./dictation";

// The browser's built-in speech recognition. It is not in TypeScript's DOM types yet.
type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  const host = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

// A microphone button for a text box. Hidden where the browser has no speech recognition.
export function DictationButton({
  maxLength,
  onText,
  value
}: {
  maxLength?: number | undefined;
  onText: (value: string) => void;
  value: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const latest = useRef({ onText, value });
  latest.current = { onText, value };

  useEffect(() => {
    setSupported(recognitionConstructor() !== null);
    return () => recognition.current?.stop();
  }, []);

  if (!supported) return null;

  function toggle() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    const session = new Constructor();
    session.lang = speechLanguage(locale);
    session.continuous = true;
    session.interimResults = false;
    session.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result?.isFinal) continue;
        const next = appendDictation(latest.current.value, result[0].transcript, maxLength);
        latest.current = { ...latest.current, value: next };
        latest.current.onText(next);
      }
    };
    session.onerror = (event) => {
      const key = dictationErrorKey(event.error);
      if (key) setProblem(t(key));
    };
    session.onend = () => {
      setListening(false);
      recognition.current = null;
    };
    recognition.current = session;
    setProblem("");
    setListening(true);
    try {
      session.start();
    } catch {
      setListening(false);
      setProblem(t("create.dictateFailed"));
    }
  }

  return (
    <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10 }}>
      <button aria-pressed={listening} onClick={toggle} style={styles.secondaryButton} type="button">
        {listening ? `■ ${t("create.dictateStop")}` : `🎤 ${t("create.dictateStart")}`}
      </button>
      <span aria-live="polite" style={styles.cardText}>
        {problem || (listening ? t("create.dictateListening") : "")}
      </span>
    </span>
  );
}

// Privacy notice, shown once at the top of the form (not under every Speak button): the browser's own
// speech service (not Joblop's filter) receives the audio. Hidden where the browser cannot dictate.
export function DictationPrivacyNote() {
  const t = useT();
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(recognitionConstructor() !== null), []);
  if (!supported) return null;
  return (
    <p style={{ ...styles.cardText, fontSize: 12, fontWeight: 600, margin: "8px 0 0" }}>
      🎤 {t("create.dictatePrivacy")}
    </p>
  );
}
