/* ==========================================================================
   Soft Skill Zone — Shared auth-page helpers
   Used by student-login, student-signup, forgot-password and admin-login.
   ========================================================================== */

import { $, $$, on } from "../core/dom.js";

/** Inline alert above the form. type: "error" | "success" | "info" */
export function alertBox(type, message) {
  const box = $("#authAlert");
  if (!box) return;
  box.className = `auth-alert auth-alert--${type} is-visible`;
  $("#authAlertMsg").textContent = message;
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function clearAlert() {
  const box = $("#authAlert");
  if (box) box.classList.remove("is-visible");
}

/** Wire every [data-toggle-pw] button to its password input. */
export function initPasswordToggles() {
  on(document, "click", "[data-toggle-pw]", (e, btn) => {
    const input = document.getElementById(btn.dataset.togglePw);
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.setAttribute("aria-label", show ? "Password chhupayein" : "Password dikhayein");
    btn.style.color = show ? "var(--brand)" : "";
  });
}

/**
 * If Firebase keys are not pasted yet, explain it and disable the submit
 * button — a cryptic SDK error would otherwise confuse the user.
 * @returns {Promise<boolean>} true when Firebase is usable
 */
export async function requireConfigured() {
  try {
    const { isFirebaseConfigured } = await import("../../firebase/firebase-config.js");
    if (isFirebaseConfigured) return true;
  } catch { /* fall through */ }

  alertBox("info",
    "Online login abhi setup ho raha hai — Firebase keys firebase/firebase-config.js me " +
    "paste hone ke baad yeh page kaam karega (guide: docs/FIREBASE-SETUP.md).");
  const btn = $("#submitBtn");
  if (btn) btn.disabled = true;
  return false;
}

/** Already signed in? Send the user to the right dashboard. */
export async function skipIfAuthed() {
  try {
    const { redirectIfAuthed } = await import("../core/guard.js");
    await redirectIfAuthed();
  } catch { /* not configured — stay on the page */ }
}

/** Password strength: 0–4. */
export function pwStrength(pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export function initPwMeter(inputId = "password") {
  const input = document.getElementById(inputId);
  const meter = $("#pwMeter");
  const label = $("#pwLabel");
  if (!input || !meter) return;

  const labels = ["", "Kamzor", "Theek-thaak", "Achha", "Bahut strong"];
  input.addEventListener("input", () => {
    const s = pwStrength(input.value);
    meter.dataset.level = String(s);
    if (label) label.textContent = input.value ? labels[s] || "" : "";
  });
}

/* ==========================================================================
   Google se ek-tap login
   --------------------------------------------------------------------------
   Login aur signup dono page par wahi button hai — dono ka matlab ek hi hai:
   "andar aa jao". Naya student ho to profile khud ban jaata hai, aur Student
   ID email se apne aap jud jaati hai. Isliye yahan naam/phone/password kuch
   nahi maanga jaata.
   ========================================================================== */
export function initGoogleButton(configured) {
  const btn = $("#googleBtn");
  if (!btn) return;
  if (!configured) { btn.disabled = true; return; }

  /* --------------------------------------------------------------------
     Module PEHLE se laad lete hain — click ke andar nahi.

     Yahi wo galti thi jisse student ka Google login toot raha tha. Browser
     popup sirf tab kholne deta hai jab wo us tap ka seedha nateeja ho. Pehle
     click ke andar `await import(...)` hota tha, jo phone ke internet par
     aadha second bhi le sakta hai — tab tak "tap ka haq" khatam ho jaata tha
     aur Chrome popup rok deta tha. Popup ruka to code redirect par gir jaata
     tha, aur redirect Chrome ki storage-partitioning ki wajah se
     "missing initial state" wala safed error page dikha deta tha.

     Ab page khulte hi module aa jaata hai, isliye click par ek bhi intezaar
     nahi bachta aur popup seedha khul jaata hai.
     -------------------------------------------------------------------- */
  const authMod = import("../../firebase/auth-service.js");
  authMod.catch(() => { /* niche wale try/catch me sambhal jaayega */ });

  /* Purane redirect se wapas aaye hon to session yahin poora ho jaata hai. */
  (async () => {
    try {
      const { completeGoogleRedirect } = await authMod;
      const user = await completeGoogleRedirect();
      if (!user) return;
      const { goHomeFor } = await import("../core/guard.js");
      alertBox("success", `Swagat hai, ${user.name}! Dashboard khul raha hai…`);
      setTimeout(() => goHomeFor(user), 700);
    } catch (err) {
      const { authError } = await authMod;
      alertBox("error", authError(err));
    }
  })();

  btn.addEventListener("click", async () => {
    clearAlert();
    btn.disabled = true;
    btn.classList.add("is-loading");
    try {
      const { loginWithGoogle } = await authMod;
      const user = await loginWithGoogle();
      if (!user) return;                 // redirect chal pada, page badal raha hai
      const { goHomeFor } = await import("../core/guard.js");

      if (user.role === "student" && !user.studentId) {
        alertBox("info",
          `Swagat hai, ${user.name}! Aapka admission record abhi juda nahi hai — ` +
          `agar aapne abhi-abhi form bhara hai to approve hote hi apne aap jud jaayega.`);
        setTimeout(() => goHomeFor(user), 3000);
        return;
      }
      alertBox("success", `Swagat hai, ${user.name}! Dashboard khul raha hai…`);
      setTimeout(() => goHomeFor(user), 700);
    } catch (err) {
      const { authError } = await authMod;
      alertBox("error", authError(err));
      btn.disabled = false;
      btn.classList.remove("is-loading");
    }
  });
}

/** Uppercase-as-you-type for Student ID fields. */
export function initUppercase(id) {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener("input", () => {
    const pos = input.selectionStart;
    input.value = input.value.toUpperCase();
    try { input.setSelectionRange(pos, pos); } catch { /* ignore */ }
  });
}
