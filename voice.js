// Lightweight wrapper around the browser's SpeechSynthesis API for
// turn-by-turn voice navigation. No audio files, no credits, works offline.

export function isVoiceSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text, opts = {}) {
  if (!isVoiceSupported() || !text) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = opts.rate ?? 0.95;
  utter.pitch = opts.pitch ?? 1;
  utter.volume = opts.volume ?? 1;
  const voices = synth.getVoices();
  const preferred =
    voices.find((v) => /en[-_]?US/i.test(v.lang) && /male|david|daniel|fred/i.test(v.name)) ||
    voices.find((v) => /en[-_]?US/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang));
  if (preferred) utter.voice = preferred;
  synth.speak(utter);
}

export function cancelSpeech() {
  if (isVoiceSupported()) window.speechSynthesis.cancel();
}