// Speech wrapper around the browser's Web Speech API (speechSynthesis).
//
// Why a wrapper:
//  - Voices load ASYNCHRONOUSLY. On many browsers getVoices() is empty on first
//    call and only fills after a "voiceschanged" event. We cache and wait for it.
//  - We want one place to pick a child-friendly default and to cancel any
//    in-progress speech before starting new speech (so rapid taps don't pile up).

let cachedVoices = [];
let chosenVoiceURI = null;

function loadVoices() {
  return new Promise((resolve) => {
    const existing = speechSynthesis.getVoices();
    if (existing.length) {
      cachedVoices = existing;
      resolve(existing);
      return;
    }
    // Wait for the async list.
    const handler = () => {
      cachedVoices = speechSynthesis.getVoices();
      speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(cachedVoices);
    };
    speechSynthesis.addEventListener("voiceschanged", handler);
    // Safety: some browsers never fire the event; resolve after a beat.
    setTimeout(() => {
      cachedVoices = speechSynthesis.getVoices();
      resolve(cachedVoices);
    }, 1000);
  });
}

export async function getVoices() {
  if (!cachedVoices.length) await loadVoices();
  // Prefer English voices first for readability, but keep all available.
  return [...cachedVoices].sort((a, b) => {
    const ae = a.lang.startsWith("en") ? 0 : 1;
    const be = b.lang.startsWith("en") ? 0 : 1;
    return ae - be || a.name.localeCompare(b.name);
  });
}

export function setVoice(voiceURI) {
  chosenVoiceURI = voiceURI || null;
}

export function getChosenVoiceURI() {
  return chosenVoiceURI;
}

export function isSupported() {
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

// Speak text aloud. Cancels anything currently speaking first.
export function speak(text) {
  if (!isSupported() || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95; // a touch slower — clearer for kids and listeners
  u.pitch = 1.05;
  if (chosenVoiceURI) {
    const v = cachedVoices.find((v) => v.voiceURI === chosenVoiceURI);
    if (v) u.voice = v;
  }
  speechSynthesis.speak(u);
}
