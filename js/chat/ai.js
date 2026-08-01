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

   CHALU KAISE KAREIN — teen kadam, sab Firebase Console me:
     1. Firebase Console -> Build -> AI Logic -> Get started
        "Gemini Developer API" chunein (bina paise ke shuru ho jaata hai).
     2. Console -> Build -> App Check -> apna web app register karein
        reCAPTCHA Enterprise ke saath. Jo site key mile use neeche
        RECAPTCHA_SITE_KEY me paste kar dein.
     3. Neeche AI_ENABLED ko true kar dein.

   Jab tak ye nahi hota, chatbot poori tarah kaam karta hai — bas na-samajh
   aane wale sawaal par AI ke bajaye seedhe WhatsApp par bhej deta hai.
   ========================================================================== */

import { firebaseConfig } from "../../firebase/firebase-config.js";
import { groundingFacts, BOT_NAME } from "./knowledge.js";
import { INSTITUTE } from "../config/site-data.js";

/* ==========================================================================
   Settings — sirf ye teen lines badalni hoti hain
   ========================================================================== */
export const AI_ENABLED = false;
const RECAPTCHA_SITE_KEY = "";          // App Check se milne wali site key
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

    /* App Check — yahi Gemini ko ajnabi requests se bachata hai. */
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
    const trimmed = history.slice(-6);
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
