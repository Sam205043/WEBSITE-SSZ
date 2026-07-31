/* ==========================================================================
   Soft Skill Zone — Typing Test
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { store } from "../core/utils.js";
import { LS_KEYS } from "../core/constants.js";
import { TYPING_TEXTS, TYPING_TEXTS_HI } from "./tool-data.js";

let target = "", duration = 60, remaining = 60, timer = null, running = false, finished = false;
let lang = "en";

const esc = (c) => c === "<" ? "&lt;" : c === "&" ? "&amp;" : c === " " ? "&nbsp;" : c;

/* English ka best score purani jagah hi rehta hai, taaki jinke pichhle record
   bane hue hain wo mit na jaayein. Hindi ka alag khaana. */
const bestKeyFor = (l) => l === "hi" ? `${LS_KEYS.TYPING_BEST}.hi` : LS_KEYS.TYPING_BEST;

function pickText() {
  const pool = lang === "hi" ? TYPING_TEXTS_HI : TYPING_TEXTS;
  target = pool[Math.floor(Math.random() * pool.length)];
}

function paintText(typed = "") {
  const html = target.split("").map((ch, i) => {
    if (i < typed.length) return `<span class="${typed[i] === ch ? "ok" : "bad"}">${esc(ch)}</span>`;
    if (i === typed.length) return `<span class="cur">${esc(ch)}</span>`;
    return `<span>${esc(ch)}</span>`;
  }).join("");
  $("#typeText").innerHTML = html;
}

function stats(typed) {
  const correct = typed.split("").filter((c, i) => c === target[i]).length;
  const elapsed = duration - remaining;
  /* WPM over the first couple of seconds is meaningless (a 2-second burst
     reads as 400+), so hold the readout until there is enough signal. */
  const ready = elapsed >= 3;
  const wpm = ready ? Math.round((correct / 5) / (elapsed / 60)) : null;
  const acc = typed.length ? Math.round((correct / typed.length) * 100) : 100;
  return { correct, wpm, acc, elapsed: Math.max(elapsed, 1) };
}

function update() {
  const typed = $("#typeInput").value;
  paintText(typed);
  const { wpm, acc } = stats(typed);
  $("#statWpm").textContent = wpm === null ? "…" : String(wpm);
  $("#statAcc").textContent = `${acc}%`;
  $("#statChars").textContent = String(typed.length);
  if (typed.length >= target.length) finish();
}

function tick() {
  remaining--;
  $("#statTime").textContent = String(remaining);
  update();
  if (remaining <= 0) finish();
}

function start() {
  if (running || finished) return;
  running = true;
  timer = setInterval(tick, 1000);
}

function finish() {
  if (finished) return;
  finished = true; running = false;
  clearInterval(timer);
  $("#typeInput").disabled = true;

  const typed = $("#typeInput").value;
  const { correct, acc, elapsed } = stats(typed);
  const wpm = Math.round((correct / 5) / (elapsed / 60));

  /* Hindi aur English ki speed ki aapas me tulna nahi hoti — Devanagari me
     har akshar ke liye zyada key dabani padti hai. Isliye best score dono ka
     alag rakha hai, warna Hindi test English wala record kabhi nahi tod paata
     aur student ko lagta hai wo peechhe ja raha hai. */
  const bestKey = bestKeyFor(lang);
  const best = store.get(bestKey, 0);
  const isBest = wpm > best;
  if (isBest) { store.set(bestKey, wpm); $("#statBest").textContent = String(wpm); }

  /* Hindi ke paimane thode neeche hain — wahi speed Devanagari me zyada
     mehnat maangti hai. */
  const good = lang === "hi" ? 30 : 40;
  const ok = lang === "hi" ? 18 : 25;
  const verdict = wpm >= good ? "Zabardast! Government exam level ke aas-paas."
    : wpm >= ok ? `Achha! Roz 15 minute practice se ${good} WPM tak pahunch sakte hain.`
    : "Shuruaat achhi hai — accuracy pehle, speed baad me.";

  render($("#typeResult"),
    el("div", { class: "quiz-explain", style: { background: "var(--success-soft)" } },
      el("strong", {}, isBest ? "Naya best score! " : "Test poora hua. "),
      `${wpm} WPM, ${acc}% accuracy. ${verdict}`),
    el("button", { class: "btn-ssz btn-primary-ssz btn-block-ssz", type: "button", id: "typeAgain", style: { marginTop: "1rem" } },
      "Dobara test dein")
  );
}

function reset() {
  clearInterval(timer);
  running = false; finished = false;
  remaining = duration;
  pickText();
  $("#typeInput").value = "";
  $("#typeInput").disabled = false;
  $("#statTime").textContent = String(duration);
  $("#statWpm").textContent = "0";
  $("#statAcc").textContent = "100%";
  $("#statChars").textContent = "0";
  render($("#typeResult"));
  paintText();
}

function showBest() {
  $("#statBest").textContent = String(store.get(bestKeyFor(lang), 0) || "-");
}

onReady(() => {
  showBest();
  reset();

  $("#typeInput").addEventListener("input", () => { start(); update(); });

  on($("#typeDuration"), "click", "button", (e, btn) => {
    duration = Number(btn.dataset.sec);
    $("#typeDuration").querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
    reset();
  });

  const langBox = $("#typeLang");
  if (langBox) on(langBox, "click", "button", (e, btn) => {
    lang = btn.dataset.lang;
    langBox.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
    /* Devanagari me akshar jude hue bante hain, isliye thoda bada font aur
       khuli line height rakhte hain — warna matraayein aapas me chipakti hain. */
    $("#typeText").classList.toggle("is-hindi", lang === "hi");
    $("#typeInput").classList.toggle("is-hindi", lang === "hi");
    showBest();
    reset();
  });

  $("#typeRestart").addEventListener("click", reset);
  on($("#typeResult"), "click", "#typeAgain", reset);
});
