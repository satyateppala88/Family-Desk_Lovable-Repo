import { useCallback, useEffect, useRef, useState } from "react";

interface UseSpeechSynthesisOptions {
  language?: string;
  rate?: number;
  pitch?: number;
}

/**
 * Free browser Speech Synthesis API wrapper.
 * Picks the best en-IN voice when available.
 */
export const useSpeechSynthesis = ({
  language = "en-IN",
  rate = 1,
  pitch = 1,
}: UseSpeechSynthesisOptions = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!isSupported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported]);

  const pickVoice = useCallback(() => {
    if (!voices.length) return null;
    return (
      voices.find((v) => v.lang === language) ||
      voices.find((v) => v.lang.startsWith(language.split("-")[0])) ||
      voices.find((v) => v.default) ||
      voices[0]
    );
  }, [voices, language]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;
      // Cancel any previous utterance
      window.speechSynthesis.cancel();

      const u = new SpeechSynthesisUtterance(text);
      const voice = pickVoice();
      if (voice) u.voice = voice;
      u.lang = language;
      u.rate = rate;
      u.pitch = pitch;
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      utterRef.current = u;
      window.speechSynthesis.speak(u);
    },
    [isSupported, pickVoice, language, rate, pitch]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  // Stop on unmount
  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported };
};
