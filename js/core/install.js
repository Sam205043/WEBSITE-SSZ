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
 * Kya abhi install ka nyota dikhana chahiye?
 *   "prompt" — browser taiyar hai, ek button kaafi hai
 *   "ios"    — iPhone, haath se kadam batane padenge
 *   ""       — kuchh mat dikhao
 */
export function installState() {
  if (isStandalone()) return "";
  if (dismissedRecently()) return "";
  if (deferredPrompt) return "prompt";
  if (isIOS()) return "ios";
  return "";
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

/** iPhone par kya karna hai — Safari me hain ya nahi, uske hisaab se. */
export function iosSteps() {
  if (!isIOSSafari()) {
    return {
      title: "Pehle Safari me kholein",
      steps: [
        "Ye page Safari browser me kholein — Chrome ya kisi aur me ye suvidha Apple deta hi nahi.",
        "Safari me softskillzone.in kholein.",
        "Phir niche wale teen kadam dohrayein."
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
