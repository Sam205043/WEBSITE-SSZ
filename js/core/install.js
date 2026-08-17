/* ==========================================================================
   Soft Skill Zone — "App install karein"
   --------------------------------------------------------------------------
   Website pehle se ek installable app hai (manifest + service worker + icon).
   Kami sirf ek thi: install ka koi dikhne wala button nahi tha. Chrome apna
   chhota sa nishan address bar me dikhata hai, jise koi student nahi dekhta.

   TEEN ALAG HAALAT — teeno alag tarah se sambhaale gaye hain:

   1. Android / desktop Chrome, Edge
      Browser `beforeinstallprompt` bhejta hai. Use rok kar rakh lete hain
      aur apna button dikhate hain. Button dabate hi wahi browser wala
      dialog khulta hai.

   2. iPhone / iPad
      Apple ye event bhejta hi nahi. Wahan sirf Safari me, Share (⬆️) se
      "Add to Home Screen" karna padta hai — aur Chrome par to wo bhi nahi
      hota. Isliye iPhone walon ko button ke bajaye saaf-saaf kadam bataye
      jaate hain, aur agar wo Safari me nahi hain to pehle wahi kholne ko
      kaha jata hai.

   3. Pehle se install ho chuka hai
      Kuchh nahi dikhta. Install ho chuke app me dobara "install karein"
      dikhana bewakoofi lagta hai.

   Ek baar band kar dene par 14 din tak dobara nahi poochta — warna roz
   aane wale student ko yahi ek cheez chidha degi.
   ========================================================================== */

const DISMISS_KEY = "ssz.install.dismissed";
const DISMISS_DAYS = 14;

let deferredPrompt = null;
let listeners = [];

/* ------------------------------------------------------- kaun kis haal me */

export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;   // purana iOS
}

export function isIOS() {
  const ua = navigator.userAgent;
  /* iPad ab khud ko Mac batata hai, isliye touch se pehchante hain. */
  return /iPhone|iPad|iPod/.test(ua)
    || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/* iPhone par "Add to Home Screen" sirf Safari me hai. Chrome/Firefox par
   wo option hota hi nahi — student wahan dhoondh kar pareshan hoga. */
export function isIOSSafari() {
  if (!isIOS()) return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (!at) return false;
    return (Date.now() - at) < DISMISS_DAYS * 864e5;
  } catch { return false; }
}

export function dismiss() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* private mode */ }
  notify();
}

/**
 * Kya dikhana hai?
 *   "prompt" — browser taiyar hai, ek button dabao aur ho gaya
 *   "manual" — browser ne nyota nahi diya, par install ho sakta hai —
 *              haath se kadam bataane padenge
 *   ""       — app pehle se khuli hui hai, kuchh mat dikhao
 *
 * Pehle yahan se "" bhi lautt-ta tha jab browser chup rehta tha — aur tab
 * button gayab ho jata tha. Wahi sabse badi gadbad thi: student ko pata hi
 * nahi chalta ki app banayi ja sakti hai. Chrome kai wajah se chup rehta hai
 * (pehle se install ho, ya usne abhi tak tay na kiya ho), aur wo sab haalat
 * hamare liye ek jaisi hain — raasta batana chahiye, chhup nahi jana.
 *
 * Ab sirf ek hi haalat me kuchh nahi dikhta: jab app khud installed roop me
 * chal rahi ho. Wahan "install karein" dikhana bewakoofi hoti.
 */
export function installState() {
  if (isStandalone()) return "";
  if (deferredPrompt) return "prompt";
  return "manual";
}

/** Bada card chhupane ke liye — chhota link phir bhi dikhta rehta hai. */
export function cardDismissed() {
  return dismissedRecently();
}

/* ------------------------------------------------------------- events */

function notify() { listeners.forEach((fn) => { try { fn(installState()); } catch { /* ignore */ } }); }

/** Haalat badalne par bulaya jayega. Hataane ka function wapas milta hai. */
export function onInstallState(fn) {
  listeners.push(fn);
  fn(installState());
  return () => { listeners = listeners.filter((f) => f !== fn); };
}

window.addEventListener("beforeinstallprompt", (e) => {
  /* Rok lete hain taaki browser apna chhota banner na dikhaye — hum apna
     saaf button dikhayenge jise student wakai dekhega. */
  e.preventDefault();
  deferredPrompt = e;
  notify();
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  try { localStorage.removeItem(DISMISS_KEY); } catch { /* ignore */ }
  notify();
});

/**
 * Browser ka apna install dialog kholta hai.
 * @returns {Promise<"accepted"|"dismissed"|"unavailable">}
 */
export async function promptInstall() {
  if (!deferredPrompt) return "unavailable";
  const e = deferredPrompt;
  deferredPrompt = null;          // ek event sirf ek baar chalta hai
  try {
    e.prompt();
    const { outcome } = await e.userChoice;
    notify();
    return outcome === "accepted" ? "accepted" : "dismissed";
  } catch {
    notify();
    return "unavailable";
  }
}

/* --------------------------------------------------- iPhone ke kadam */

/**
 * Jis browser me student baitha hai, usi ke kadam batata hai.
 *
 * Har browser ka raasta alag hai, aur galat raasta batana kuchh na batane se
 * bura hai — student wahan dhoondhta reh jayega jahan wo cheez hai hi nahi.
 * Isliye pehle browser pehchante hain, phir usi ke kadam dete hain.
 */
export function installSteps() {
  const ua = navigator.userAgent;

  if (isIOS()) {
    if (!isIOSSafari()) {
      return {
        title: "iPhone par pehle Safari me kholein",
        steps: [
          "Ye option Apple sirf Safari me deta hai — Chrome ya kisi aur me milegi hi nahi.",
          "Safari kholiye aur softskillzone.in likhiye.",
          "Phir Share (⬆️) → \"Add to Home Screen\" → \"Add\"."
        ]
      };
    }
    return {
      title: "Teen kadam — bas",
      steps: [
        "Niche (ya upar) Share ka nishan dabaayein — teer wala chauhkona ⬆️",
        "List me niche jaakar \"Add to Home Screen\" chunein",
        "\"Add\" dabaayein — icon aapke phone par aa jayega"
      ]
    };
  }

  /* Android par asli suvidha Chrome me hi hai. Instagram/Facebook ke andar
     wale browser me to menu hi nahi hota — wahan pehle Chrome me kholna
     padega, warna student dhoondhta hi reh jayega. */
  const inApp = /FBAN|FBAV|Instagram|Line\/|Twitter/i.test(ua);
  if (inApp) {
    return {
      title: "Pehle Chrome me kholein",
      steps: [
        "Abhi ye page kisi app ke andar khula hai — yahan install ka option hota hi nahi.",
        "Upar dayein kone ke teen bindu (⋮) dabaakar \"Open in Chrome\" chunein.",
        "Chrome me khulne par yahi button dobara dabaayein."
      ]
    };
  }

  if (/Android/i.test(ua)) {
    return {
      title: "Do kadam",
      steps: [
        "Upar dayein kone me teen bindu (⋮) dabaayein",
        "\"Install app\" ya \"Add to Home screen\" chunein",
        "\"Install\" dabaayein — icon phone par aa jayega"
      ]
    };
  }

  return {
    title: "Computer par",
    steps: [
      "Address bar ke dayein kinare install ka chhota nishan (⊕ ya monitor jaisa) dhoondhein",
      "Na mile to upar dayein teen bindu (⋮) → \"Cast, save and share\" → \"Install page as app\"",
      "\"Install\" dabaayein — app alag window me khul jayega"
    ]
  };
}
