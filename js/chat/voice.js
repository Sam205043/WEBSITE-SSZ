/* ==========================================================================
   Nova ki awaaz — bolkar poochhna, bolkar jawab sunna
   --------------------------------------------------------------------------
   Do alag kaam ek hi file me:

     SUNNA  (student bole)  — browser ka apna SpeechRecognition. Iska koi
                              paisa nahi lagta aur ye offline nahi bhi ho to
                              Google ke server se hi chalta hai.
     BOLNA  (Nova bole)     — Cloud Function `novaSpeak`, jo Google Text-to-
                              Speech se Hindi awaaz banwaakar MP3 laut'ta hai.

   BROWSER KI APNI AWAAZ SE KYUN NAHI

   `speechSynthesis` muft hai, par uski Hindi awaaz har phone par alag hoti
   hai — kahin robot jaisi, kahin hai hi nahi (bahut se Android me hi-IN voice
   install hi nahi rehti). Institute ka sahayak har student ko ek hi awaaz me
   milna chahiye. Isliye asli awaaz server se aati hai.

   Par muft wali ko pheka bhi nahi gaya: agar server mana kar de (din ki hadd
   poori, ya Google ki galti), to browser apni awaaz se bol deta hai. Student
   ko chup-chaap kuch na milne se ye behtar hai.

   PAISA

   Har jawab ke akshar ginte hain aur din ki hadd Function me lagi hai. Yahan
   bhi ek chhoti yaadash (cache) hai — wahi jawab dobara bolne par server ko
   dobara paisa nahi dena padta (greeting sabse zyada bolti hai).

   Ye file lazy hai: chat khulne se kuch nahi hota, sirf jab student mic ya
   speaker dabaye tab utarti hai.
   ========================================================================== */

import { FIREBASE_SDK_VERSION } from "../../firebase/firebase-config.js";

/* Function asia-south1 me hai — region na dein to SDK us-central1 dhoondhega
   aur "not found" milega. */
const REGION = "asia-south1";

let _callable = null;
async function novaSpeakFn() {
  if (_callable) return _callable;
  const [{ app }, { getFunctions, httpsCallable }] = await Promise.all([
    import("../../firebase/firebase-init.js"),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-functions.js`)
  ]);
  _callable = httpsCallable(getFunctions(app, REGION), "novaSpeak");
  return _callable;
}

/* ==========================================================================
   SUNNA — student ka sawaal
   ========================================================================== */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;

/** Kya is browser me bolkar poochhna chalta hai? */
export function canListen() { return !!SR; }

let rec = null;

/**
 * Mic chalu karein.
 *
 * `interimResults` isliye chahiye ki student ko input box me apne shabd
 * likhte hue dikhein — warna 3-4 second tak lagta hai ki kuch hua hi nahi
 * aur wo mic dobara daba deta hai.
 *
 * @param {object} cb
 * @param {(t:string)=>void} cb.onPartial  beech ka andaaza (badal sakta hai)
 * @param {(t:string)=>void} cb.onFinal    pakka sawaal
 * @param {(e:string)=>void} cb.onError    "no-speech" | "not-allowed" | ...
 * @param {()=>void} cb.onEnd
 */
export function startListening({ onPartial, onFinal, onError, onEnd } = {}) {
  if (!SR) { onError?.("unsupported"); return; }
  stopListening();

  rec = new SR();
  rec.lang = "hi-IN";          // Hinglish bhi isi me sahi pakda jaata hai
  rec.interimResults = true;
  rec.continuous = false;      // ek sawaal, phir apne aap band
  rec.maxAlternatives = 1;

  let finalText = "";

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t;
      else interim += t;
    }
    if (interim) onPartial?.(interim);
  };

  rec.onerror = (e) => onError?.(e.error || "error");

  rec.onend = () => {
    rec = null;
    const t = finalText.trim();
    if (t) onFinal?.(t);
    onEnd?.();
  };

  try { rec.start(); }
  catch { rec = null; onError?.("busy"); onEnd?.(); }
}

export function stopListening() {
  if (!rec) return;
  try { rec.stop(); } catch { /* pehle hi band */ }
  rec = null;
}

export function isListening() { return !!rec; }

/* ==========================================================================
   BOLNA — Nova ka jawab
   ========================================================================== */
let audio = null;                 // abhi baj raha MP3
const memo = new Map();           // text -> base64 (is page ke liye)
const MEMO_MAX = 12;

/** Server se aayi awaaz bajao. Jab tak baje, promise rukta hai. */
function playBase64(b64) {
  return new Promise((resolve) => {
    stopSpeaking();
    audio = new Audio(`data:audio/mpeg;base64,${b64}`);
    audio.onended = () => { audio = null; resolve(); };
    audio.onerror = () => { audio = null; resolve(); };
    audio.play().catch(() => { audio = null; resolve(); });
  });
}

/* Browser ki apni awaaz — sirf tab jab server se kuch na mile. */
function playFallback(text) {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) return resolve();
    try {
      synth.cancel();
      /* Server wali safai yahan dobara — warna browser "star star" aur poora
         URL padhkar sunata hai. */
      const clean = String(text)
        .replace(/\*\*/g, "")
        .replace(/https?:\/\/\S+/g, "link")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 600);
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = "hi-IN";
      u.rate = 0.98;
      const hi = synth.getVoices().find((v) => /^hi/i.test(v.lang));
      if (hi) u.voice = hi;
      u.onend = resolve;
      u.onerror = resolve;
      synth.speak(u);
    } catch { resolve(); }
  });
}

/**
 * Nova se ye text bulwao.
 *
 * Kabhi throw nahi karta — awaaz na aane par chat rukni nahi chahiye, jawab
 * to likha hua saamne hai hi.
 *
 * @param {string} text
 * @returns {Promise<void>}
 */
export async function speak(text) {
  const t = String(text || "").trim();
  if (!t) return;

  if (memo.has(t)) return playBase64(memo.get(t));

  try {
    const fn = await novaSpeakFn();
    const { data } = await fn({ text: t });

    if (data?.audio) {
      if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value);
      memo.set(t, data.audio);
      return playBase64(data.audio);
    }
    /* capped / failed — muft wali awaaz par chale jao */
    return playFallback(t);
  } catch (err) {
    console.warn("[voice]", err?.message || err);
    return playFallback(t);
  }
}

export function stopSpeaking() {
  if (audio) { try { audio.pause(); } catch { /* — */ } audio = null; }
  try { window.speechSynthesis?.cancel(); } catch { /* — */ }
}

export function isSpeaking() {
  return !!audio || !!window.speechSynthesis?.speaking;
}

export default { canListen, startListening, stopListening, isListening, speak, stopSpeaking, isSpeaking };
