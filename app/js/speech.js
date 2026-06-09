// Speech wrapper around the browser's Web Speech API (speechSynthesis).
//
// Why a wrapper:
//  - Voices load ASYNCHRONOUSLY. On many browsers getVoices() is empty on first
//    call and only fills after a "voiceschanged" event — and Firefox desktop never
//    fires it, so we also poll for up to 2 seconds.
//  - Desktop Chrome silently stops long utterances (~200+ chars). The known-safe
//    fix is chunking text by sentence and queueing chunks; the pause()/resume()
//    keep-alive trick is FORBIDDEN here because pause() acts as cancel on Android.
//  - One place to cancel in-progress speech before new speech (rapid taps),
//    apply the user's voice + rate, and prefer offline (localService) voices.

let cachedVoices = [];
let chosenVoiceURI = null;
let rate = 0.95; // a touch slower — clearer for kids and listeners

function loadVoices() {
  return new Promise((resolve) => {
    const existing = speechSynthesis.getVoices();
    if (existing.length) {
      cachedVoices = existing;
      resolve(existing);
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      const v = speechSynthesis.getVoices();
      if (v.length) {
        settled = true;
        cachedVoices = v;
        speechSynthesis.removeEventListener("voiceschanged", finish);
        clearInterval(poll);
        resolve(v);
      }
    };
    speechSynthesis.addEventListener("voiceschanged", finish);
    // Poll fallback for browsers that never fire voiceschanged (Firefox desktop,
    // older Safari). Give up after 2s and resolve with whatever we have.
    const poll = setInterval(finish, 250);
    setTimeout(() => {
      if (!settled) {
        settled = true;
        speechSynthesis.removeEventListener("voiceschanged", finish);
        clearInterval(poll);
        cachedVoices = speechSynthesis.getVoices();
        resolve(cachedVoices);
      }
    }, 2000);
  });
}

export async function getVoices() {
  if (!cachedVoices.length) await loadVoices();
  // Offline (localService) English voices first — they keep working with no
  // internet, which matters for a communication device. Then online English,
  // then everything else.
  return [...cachedVoices].sort((a, b) => {
    const rank = (v) => (v.lang.toLowerCase().startsWith("en") ? 0 : 2) + (v.localService ? 0 : 1);
    return rank(a) - rank(b) || a.name.localeCompare(b.name);
  });
}

export function setVoice(voiceURI) {
  chosenVoiceURI = voiceURI || null;
}

export function getChosenVoiceURI() {
  return chosenVoiceURI;
}

export function setRate(r) {
  const n = parseFloat(r);
  if (n >= 0.5 && n <= 2) rate = n;
}

export function getRate() {
  return rate;
}

export function isSupported() {
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

// Split long text into sentence-sized chunks Chrome won't choke on.
function chunkText(text) {
  if (text.length <= 200) return [text];
  const parts = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
  // Merge tiny fragments so we don't get choppy delivery.
  const chunks = [];
  let cur = "";
  for (const p of parts) {
    if ((cur + p).length > 200 && cur) {
      chunks.push(cur.trim());
      cur = p;
    } else {
      cur += p;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

function makeUtterance(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = 1.05;
  if (chosenVoiceURI) {
    const v = cachedVoices.find((v) => v.voiceURI === chosenVoiceURI);
    if (v) {
      u.voice = v;       // iOS honors voice
      u.lang = v.lang;   // Android Chrome needs lang too
    }
  }
  return u;
}

// Speak text aloud. Cancels anything currently speaking first.
// opts.onend fires after the LAST chunk finishes (or on error, so callers
// waiting on it never hang).
export function speak(text, opts = {}) {
  if (!isSupported() || !text) return;
  speechSynthesis.cancel();
  const chunks = chunkText(text);
  let done = 0;
  for (const chunk of chunks) {
    const u = makeUtterance(chunk);
    const finish = () => {
      done += 1;
      if (done === chunks.length && opts.onend) opts.onend();
    };
    u.onend = finish;
    u.onerror = finish;
    speechSynthesis.speak(u);
  }
}
