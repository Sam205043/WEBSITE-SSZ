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
