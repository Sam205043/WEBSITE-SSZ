/* ==========================================================================
   Soft Skill Zone — Chatbot ki AI layer (Firebase AI Logic)
   ==========================================================================
   Ye layer tabhi chalti hai jab knowledge base ko jawab na pata ho.

   KEY KAHAN HAI? — kahin nahi.
   Static site par agar Gemini ki API key JavaScript me daal dein to koi bhi
   page ka source dekh kar use churakar aapke bill par chala sakta hai. Isliye
   yahan Firebase AI Logic use hota hai: request Firebase ke through jaati
   hai, key browser me aati hi nahi, aur App Check pakka karta hai ki request
   sach me aapki website se aayi hai.

   CHALU HO CHUKA HAI (5 Aug 2026):
     1. Firebase AI Logic — "Gemini Developer API" par chaalu. Free tier me
        hai, billing nahi lagti. AI monitoring on hai par sampling 10% par.
     2. App Check — web app "reCAPTCHA Enterprise" se registered. Enforcement
        SIRF AI Logic par hai; Firestore aur Storage par nahi, isliye baaki
        website par iska koi asar nahi.
     3. AI_ENABLED = true.

   AI band karna ho to sirf AI_ENABLED false kar dijiye — chatbot phir bhi
   poori tarah chalta rahega, bas na-samajh aane wale sawaal par AI ke bajaye
   seedhe WhatsApp par bhej dega. Knowledge base wala hissa AI par bilkul
   nirbhar nahi hai.
   ========================================================================== */

import { firebaseConfig } from "../../firebase/firebase-config.js";
import { groundingFacts, BOT_NAME } from "./knowledge.js";
import { INSTITUTE } from "../config/site-data.js";

/* ==========================================================================
   Settings — sirf ye teen lines badalni hoti hain
   ========================================================================== */
export const AI_ENABLED = true;
/* App Check ki site key. Ye PUBLIC hai — page ke source me hi jaati hai,
   chhupane wali cheez nahi. Iska kaam sirf itna hai ki Gemini ki request
   sach me is website se aayi ho. Key Google Cloud -> Security -> reCAPTCHA
   me "softskillzone-web" naam se bani hai, sirf softskillzone.in ke liye. */
const RECAPTCHA_SITE_KEY = "6LeOwHYtAAAAAO9PUgo_J9fPh_4gEwEjB0f4PwWX";
const MODEL = "gemini-3.6-flash";       // tez aur bina billing ke chalta hai

/* AI Logic naye SDK me hai, isliye iska apna version. Baaki project 11.0.2
   par hai — use chhedne ki zaroorat nahi, ye alag Firebase app banata hai
   ("ssz-ai") aur sirf tab load hota hai jab AI sach me chahiye. */
const AI_SDK = "12.4.0";
const CDN = `https://www.gstatic.com/firebasejs/${AI_SDK}`;

/* ==========================================================================
   System prompt — AI ki lagaam
   ==========================================================================
   Sabse zaroori hissa. AI apne aap se fees ya tareekh nahi bana sakta; jo
   niche diye tathya me nahi hai, uske liye use maan lena hai ki pata nahi.
   Ek institute ke naam par galat fees bata dena aur bhi bura hai bajaye "mujhe
   nahi pata" kehne ke. */
function systemPrompt() {
  return [
    `Aapka naam "${BOT_NAME}" hai. Aap ${INSTITUTE.name} (Ara, Bihar) ki website ke sahayak hain.`,
    `Naam poochhe jaane par ${BOT_NAME} batayein, aur ye bhi ki aap ek program hain — insaan nahi. Kabhi insaan hone ka dawa na karein.`,
    "",
    "NIYAM — inse bahar bilkul nahi jaana:",
    "1. Sirf neeche diye TATHYA se jawab dein. Tathya me jo nahi hai, uske baare me kabhi andaaza na lagayein.",
    "2. Fees, tareekh, duration, discount, ya kisi bhi number ke baare me apne aap kuch mat banayein. Agar exact number tathya me nahi hai to kahein ki institute se confirm kar lein.",
    `3. Naukri ki guarantee kabhi mat dein. Sirf 'placement support' kehna hai.`,
    "4. Jo sawaal institute se juda hi nahi hai (homework, general knowledge, kisi aur institute ki baat), us par vinamrata se mana kar dein.",
    `5. Jawab na pata ho to saaf kahein aur WhatsApp number dein: ${INSTITUTE.whatsapp || INSTITUTE.phone}`,
    "6. Kisi student ki niji jaankari (fees, attendance, marks) kabhi mat batayein — wo dashboard me dikhti hai.",
    "",
    "ANDAAZ: Hinglish me — Roman lipi, aam bolchaal ki Hindi. Chhota jawab, 4-5 line se zyada nahi. Seedhi baat, bina lambi bhoomika. Emoji na ke barabar.",
    "",
    "TATHYA:",
    groundingFacts()
  ].join("\n");
}

/* ==========================================================================
   Lazy init
   ========================================================================== */
let modelPromise = null;

async function getModel() {
  if (modelPromise) return modelPromise;

  modelPromise = (async () => {
    const [{ initializeApp, getApps }, { getAI, getGenerativeModel, GoogleAIBackend }] =
      await Promise.all([
        import(`${CDN}/firebase-app.js`),
        import(`${CDN}/firebase-ai.js`)
      ]);

    const existing = getApps().find((a) => a.name === "ssz-ai");
    const app = existing || initializeApp(firebaseConfig, "ssz-ai");

    /* App Check — yahi Gemini ko ajnabi requests se bachata hai. Bina key
       ke AI chalu karna khatarnaak hai: koi bhi aapke project ka quota
       kharch kar sakta hai. Isliye saaf chetavni de dete hain. */
    if (!RECAPTCHA_SITE_KEY) {
      console.warn("[ssz-ai] AI chalu hai par reCAPTCHA key nahi — App Check ke bina Gemini khula pada hai.");
    }
    if (RECAPTCHA_SITE_KEY) {
      try {
        const { initializeAppCheck, ReCaptchaEnterpriseProvider } =
          await import(`${CDN}/firebase-app-check.js`);
        initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY),
          isTokenAutoRefreshEnabled: true
        });
      } catch (err) {
        console.warn("[chat] App Check start nahi hua:", err.message);
      }
    }

    const ai = getAI(app, { backend: new GoogleAIBackend() });
    return getGenerativeModel(ai, {
      model: MODEL,
      systemInstruction: systemPrompt(),
      generationConfig: { temperature: 0.4, maxOutputTokens: 400 }
    });
  })();

  return modelPromise;
}

/* ==========================================================================
   Public API
   ========================================================================== */

export function aiReady() {
  return AI_ENABLED && !!firebaseConfig?.projectId;
}

/**
 * AI se jawab maangta hai. Kuch bhi gadbad ho — SDK na aaye, quota khatam ho,
 * net kat jaye — to null lauta deta hai, exception nahi. Chatbot ka baaki
 * hissa isse rukta nahi.
 *
 * @param {string} question
 * @param {Array<{role:string, text:string}>} history  pichhli baat-cheet
 * @returns {Promise<string|null>}
 */
export async function askAI(question, history = []) {
  if (!aiReady()) return null;

  try {
    const model = await getModel();

    /* Sirf pichhle 6 message bhejte hain — usse zyada se na context behtar
       hota hai na kharcha. Pehla message user ka hona chahiye, warna SDK
       naaraz hota hai. */
    /* Aakhri message wahi sawaal hai jo abhi sendMessage se bhi ja raha
       hai — dono bhejne par model ko ek hi baat do baar milti thi. */
    const trimmed = history.slice(0, -1).slice(-6);
    while (trimmed.length && trimmed[0].role !== "user") trimmed.shift();

    const chat = model.startChat({
      history: trimmed.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }]
      }))
    });

    const result = await chat.sendMessage(question);
    const text = result?.response?.text?.();
    return text && text.trim() ? text.trim() : null;
  } catch (err) {
    console.warn("[chat] AI jawab nahi de paaya:", err?.message || err);
    return null;
  }
}
