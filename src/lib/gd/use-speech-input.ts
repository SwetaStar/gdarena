"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// The Web Speech API's SpeechRecognition is still vendor-prefixed in most
// browsers and isn't in TypeScript's default DOM lib — minimal shape for
// just what we use here.
interface SpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// Browser support never changes after mount, but it's only knowable on
// the client — reading it in an effect+setState would cost an extra
// render and still risk a hydration mismatch. useSyncExternalStore
// (same pattern as useStoredGeminiKey) renders `false` for SSR/first
// paint and picks up the real value on the client with no extra render.
function subscribeNever() {
  return () => {};
}
function getSupportSnapshot() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}
function getServerSupportSnapshot() {
  return false;
}

/**
 * Thin wrapper around the Web Speech API. NOT available in iOS Safari or
 * Firefox — `supported` is false there, and callers should keep the
 * text input as the primary path regardless (it always works everywhere).
 */
export function useSpeechInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const supported = useSyncExternalStore(
    subscribeNever,
    getSupportSnapshot,
    getServerSupportSnapshot
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const start = useCallback(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    setError(null);

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      onTranscriptRef.current(text);
    };
    recognition.onerror = (event) => {
      setError(
        event.error === "not-allowed"
          ? "Microphone access denied."
          : event.error === "no-speech"
            ? "Didn't catch that — try again."
            : "Voice input error. Try again."
      );
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // Stop any in-flight recognition if the component unmounts mid-dictation.
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return { supported, listening, error, start, stop };
}
