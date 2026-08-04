/* ==========================================================================
   Soft Skill Zone — Payment link
   --------------------------------------------------------------------------
   Website khud Razorpay ko nahi bulaati. Wo Cloud Function ko bulaati hai,
   aur function Razorpay ko.

   Kyun? Kyunki Razorpay ka secret key browser me kabhi nahi rakha ja sakta —
   jo bhi page kholega wo use dekh lega. Secret sirf Google ke locker me hai
   aur sirf function use padh sakta hai.

   Aur ek zaroori baat: rakam bhi function hi tay karta hai. Yahan se jo
   amount bhejte hain wo sirf "guzarish" hai — asli fees function Firestore
   se padhta hai aur us par hadd lagata hai. Isliye browser badalne se koi
   ₹10,000 ki fees ₹1 me nahi bhar sakta.

   SDK yahan alag se import hota hai (firebase-init.js se nahi), taaki
   functions ka hissa sirf usi page par download ho jahan payment hota hai —
   baaki 60+ pages ise dhoyein nahi.
   ========================================================================== */

import { FIREBASE_SDK_VERSION } from "./firebase-config.js";
import { app } from "./firebase-init.js";

/* Function asia-south1 me hai — region yahan bhi wahi likhna zaroori hai,
   warna SDK us-central1 par jaayega aur "not found" milega. */
const REGION = "asia-south1";

/* Ek hi naam ka callable baar-baar na bane — SDK sirf pehli baar utarta hai. */
const callables = {};

async function getCallable(name) {
  if (callables[name]) return callables[name];
  const { getFunctions, httpsCallable } = await import(
    `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-functions.js`
  );
  callables[name] = httpsCallable(getFunctions(app, REGION), name);
  return callables[name];
}

/**
 * Razorpay ka ek naya payment link banwata hai.
 *
 * EMAIL KYUN BHEJTE HAIN
 *
 * Function ab bina sabooti ke link nahi banata. Do raaste hain: ya to
 * student apne login se maange, ya us record wala email bheje. Admission ke
 * waqt login mumkin hi nahi hota (account tab bana hi nahi hota), isliye
 * wahan email hi ekmatra sabooti hai — aur wo bhejna zaroori hai.
 *
 * Logged-in student ke liye email bhejna zaroori nahi; SDK khud uska token
 * saath bhej deta hai. Phir bhi bhej dena nuksaandeh nahi — agar kabhi token
 * na juda (session purana pad gaya), to email se kaam chal jaata hai aur
 * student ka payment atakta nahi.
 *
 * @param {"admission"|"student"} kind  admission ka pehla payment, ya baad ki kist
 * @param {string} id                   admission ka id, ya Student ID
 * @param {number} [amount]             kitna bhejna hai (function iski hadd lagata hai)
 * @param {string} [email]              wahi email jo us record me likha hai
 * @returns {Promise<{url:string, amount:number}>}
 */
export async function createPaymentLink(kind, id, amount, email = "") {
  const fn = await getCallable("createPaymentLink");
  const res = await fn({
    kind, id,
    amount: Math.max(0, Math.round(Number(amount) || 0)),
    email: String(email || "").trim()
  });
  const data = res?.data || {};
  if (!data.url) throw new Error("Payment link nahi ban paaya. Thodi der baad try karein.");
  return data;
}

/**
 * "Meri Student ID bani kya?" — payment ke baad admission page yahi poochhta
 * rehta hai. Jab tak paisa nahi pahuncha, `ready: false` aata rehta hai.
 *
 * Email isliye maanga jaata hai kyunki application number sequential hai
 * (0005, 0006…) — sirf number se koi bhi doosron ka record jhaank leta.
 *
 * @param {string} appNo  jaise SSZ-APP-2026-0006
 * @param {string} email  wahi email jo admission form me diya tha
 */
export async function admissionStatus(appNo, email) {
  const fn = await getCallable("admissionStatus");
  const res = await fn({ appNo, email });
  return res?.data || { ready: false };
}

/**
 * Ek "bina juda" payment ko sahi student ke khaate me chadhata hai.
 *
 * Rakam yahan se NAHI jaati. Function wahi rakam maanta hai jo Razorpay ne
 * park karte waqt likhi thi — browser se aayi rakam par bharosa karna wahi
 * galti hoti jo createPaymentLink me theek ki ja chuki hai.
 *
 * @param {string} paymentId  Razorpay ka payment id (pay_xxx)
 * @param {string} studentId  jis student ke khaate me chadhana hai
 */
export async function attachPayment(paymentId, studentId) {
  const fn = await getCallable("attachPayment");
  const res = await fn({ paymentId, studentId });
  return res?.data || {};
}

/**
 * Link banwa kar naye tab me khol deta hai.
 *
 * Tab pehle se khol lete hain aur baad me uska pata bharte hain. Agar link
 * banne ka intezaar karke khole, to phone ka browser use "bina tap ke khula
 * popup" samajh kar rok deta hai — wahi galti pehle Google login me ho chuki
 * hai, isliye yahan pehle se sambhal liya.
 */
export async function openPaymentLink(kind, id, amount, email = "") {
  const tab = window.open("", "_blank");
  try {
    const { url, amount: finalAmount } = await createPaymentLink(kind, id, amount, email);
    if (tab && !tab.closed) tab.location.href = url;
    else window.location.href = url;      // tab ruk gaya — isi page par le jao
    return finalAmount;
  } catch (err) {
    if (tab && !tab.closed) tab.close();
    throw err;
  }
}

/** Firebase callable ki galti ko padhne layak Hindi/Hinglish me badalta hai. */
export function payError(err) {
  const code = String(err?.code || "").replace("functions/", "");
  const map = {
    "not-found": "Aapka record nahi mila. Institute se sampark karein.",
    "failed-precondition": "Koi bakaya nahi hai.",
    "invalid-argument": "Jaankari poori nahi hai. Page refresh karke dobara try karein.",
    "unavailable": "Server se baat nahi ho pa rahi. Internet check karke dobara try karein.",
    "internal": "Payment link banane me dikkat aayi. Thodi der baad try karein."
  };
  return map[code] || err?.message || "Payment link nahi ban paaya. Dobara try karein.";
}
