/* ==========================================================================
   Sahayak ki awaaz — bolkar poochhna, bolkar jawab sunna
   --------------------------------------------------------------------------
   Do alag kaam ek hi file me:

     SUNNA  (student bole)  — browser ka apna SpeechRecognition. Iska koi
                              paisa nahi lagta aur ye offline nahi bhi ho to
                              Google ke server se hi chalta hai.
     BOLNA  (sahayak bole)  — Cloud Function `novaSpeak`, jo Google Text-to-
                              Speech se Hindi awaaz banwaakar MP3 laut'ta hai.

   BROWSER KI APNI AWAAZ SE KYUN NAHI

   `speechSynthesis` muft hai, par uski Hindi awaaz har phone par alag hoti
   hai — kahin robot jaisi, kahin hai hi nahi (bahut se Android me hi-IN voice
   install hi nahi rehti). Institute ka sahayak har student ko ek hi awaaz me
   milna chahiye. Isliye asli awaaz server se aati hai.

   Aur agar server mana kar de (din ki hadd poori, ya Google ki galti) to ye
   CHUP ho jaata hai — browser wali muft awaaz jaan-boojh kar nahi lagayi.
   Ek hi jawab beech me doosri, bhaddi awaaz me badal jaana chup rehne se
   kahin bura lagta hai. Jawab likha hua saamne hai hi.

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
   BOLNA — sahayak ka jawab
   ========================================================================== */
let audio = null;                 // abhi baj raha MP3
let turn = 0;                     // har nayi baat ka apna number — purani ruk jaati hai
const memo = new Map();           // tukda -> base64 (is page ke liye)
const MEMO_MAX = 16;

/** Server se aayi awaaz bajao. Jab tak baje, promise rukta hai. */
function playBase64(b64) {
  return new Promise((resolve) => {
    if (audio) { try { audio.pause(); } catch { /* — */ } }
    audio = new Audio(`data:audio/mpeg;base64,${b64}`);
    audio.onended = () => { audio = null; resolve(); };
    audio.onerror = () => { audio = null; resolve(); };
    audio.play().catch(() => { audio = null; resolve(); });
  });
}

/* --------------------------------------------------------------------------
   Lambe jawab ko tukdon me todna

   KYUN — Google ki Chirp awaaz ek request me utna hi text leti hai jitna
   bolne ke baad "khulkar" chhota rahe. Course wali list me har line me daam
   hai, aur "1,947" bolte waqt "ek hazaar nau sau saintalis" ban jaata hai.
   Isliye 550 akshar ka wo jawab mana ho jaata tha, jabki bina number wala
   590 akshar ka jawab aaram se ban jaata tha.

   Pehle mana hote hi browser apni awaaz par chala jaata tha — aur wahi sabse
   bura tha: beech jawab me awaaz badal jaati thi, aur wo bhaddi awaaz Hindi
   ko angrezi lehje me padhti thi. Ab jawab pehle hi chhote tukdon me tootta
   hai aur har tukda alag laakar, ek ke baad ek bajta hai. Ek hi awaaz, poora
   jawab.
   -------------------------------------------------------------------------- */
const CHUNK = 380;      // ek request me itne se zyada nahi
const MAX_CHUNKS = 4;   // ~1500 akshar; usse lamba jawab koi sunta nahi

function chunks(text) {
  const out = [];
  let rest = text;

  while (rest && out.length < MAX_CHUNKS) {
    if (rest.length <= CHUNK) { out.push(rest); break; }

    /* Vaakya ke aakhir par todo. Wahan na mile to aakhri space par —
       shabd ke beech kaatne se awaaz atak-atak kar aati hai. */
    const head = rest.slice(0, CHUNK);
    let at = Math.max(head.lastIndexOf("। "), head.lastIndexOf(". "),
                      head.lastIndexOf("? "), head.lastIndexOf("! "));
    if (at < CHUNK * 0.4) at = head.lastIndexOf(" ");
    if (at < CHUNK * 0.4) at = CHUNK - 1;

    out.push(rest.slice(0, at + 1).trim());
    rest = rest.slice(at + 1).trim();
  }
  return out.filter(Boolean);
}

/**
 * Sahayak se ye text bulwao.
 *
 * Kabhi throw nahi karta — awaaz na aane par chat rukni nahi chahiye, jawab
 * to likha hua saamne hai hi. Aur awaaz na aane par CHUP rehta hai: browser
 * ki apni awaaz jaan-boojh kar nahi lagayi, kyunki ek hi jawab do alag
 * awaazon me sunna toote hue system jaisa lagta hai.
 *
 * @param {string} text
 * @returns {Promise<void>}
 */
export async function speak(text) {
  /* Safai yahin, tukde karne se PEHLE — warna `**` aur nayi line bhi naap me
     gin jaate hain aur tukde asal me bade nikal aate hain. Server dobara
     saaf karta hai; do baar saaf karne se kuch bigadta nahi. */
  const whole = String(text || "")
    .replace(/\*\*/g, "")
    .replace(/https?:\/\/\S+/g, "link")
    .replace(/\s+/g, " ")
    .trim();
  if (!whole) return;

  const parts = chunks(whole);
  stopSpeaking();
  const mine = ++turn;                 // is baar ka token

  for (const part of parts) {
    if (mine !== turn) return;         // beech me koi aur bol pada / rok diya

    let b64 = memo.get(part);
    if (!b64) {
      try {
        const fn = await novaSpeakFn();
        const { data } = await fn({ text: part });
        if (!data?.audio) return;      // capped ya failed — chup
        b64 = data.audio;
        if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value);
        memo.set(part, b64);
      } catch (err) {
        console.warn("[voice]", err?.message || err);
        return;
      }
    }

    if (mine !== turn) return;
    await playBase64(b64);
  }
}

export function stopSpeaking() {
  turn++;                              // chal rahi kadi ko bhi rok deta hai
  if (audio) { try { audio.pause(); } catch { /* — */ } audio = null; }
}

export function isSpeaking() {
  return !!audio;
}

export default { canListen, startListening, stopListening, isListening, speak, stopSpeaking, isSpeaking };
