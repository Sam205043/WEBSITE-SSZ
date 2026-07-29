/* ==========================================================================
   Soft Skill Zone — Typing Test
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { store } from "../core/utils.js";
import { LS_KEYS } from "../core/constants.js";
import { TYPING_TEXTS } from "./tool-data.js";

let target = "", duration = 60, remaining = 60, timer = null, running = false, finished = false;

const esc = (c) => c === "<" ? "&lt;" : c === "&" ? "&amp;" : c === " " ? "&nbsp;" : c;

function pickText() {
  target = TYPING_TEXTS[Math.floor(Math.random() * TYPING_TEXTS.length)];
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

  const best = store.get(LS_KEYS.TYPING_BEST, 0);
  const isBest = wpm > best;
  if (isBest) { store.set(LS_KEYS.TYPING_BEST, wpm); $("#statBest").textContent = String(wpm); }

  const verdict = wpm >= 40 ? "Zabardast! Government exam level ke aas-paas."
    : wpm >= 25 ? "Achha! Roz 15 minute practice se 40 WPM tak pahunch sakte hain."
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

onReady(() => {
  $("#statBest").textContent = String(store.get(LS_KEYS.TYPING_BEST, 0) || "-");
  reset();

  $("#typeInput").addEventListener("input", () => { start(); update(); });

  on($("#typeDuration"), "click", "button", (e, btn) => {
    duration = Number(btn.dataset.sec);
    $("#typeDuration").querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
    reset();
  });

  $("#typeRestart").addEventListener("click", reset);
  on($("#typeResult"), "click", "#typeAgain", reset);
});
