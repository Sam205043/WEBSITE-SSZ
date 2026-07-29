/* ==========================================================================
   Soft Skill Zone — EMI Calculator
   ========================================================================== */

import { $, el, onReady, render } from "../core/dom.js";
import { money, num } from "../core/utils.js";

const row = (k, v, cls = "") => el("div", { class: `result-row ${cls}` }, el("dt", {}, k), el("dd", {}, v));

function calc() {
  const P = Number($("#emiAmount").value) || 0;
  const annual = Number($("#emiRate").value) || 0;
  const years = Number($("#emiYears").value) || 0;
  const n = years * 12;
  const r = annual / 12 / 100;

  if (!P || !n) { $("#emiHero").textContent = "-"; return; }

  const emi = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const total = emi * n;
  const interest = total - P;

  $("#emiHero").textContent = money(Math.round(emi));
  $("#emiSub").textContent = `${n} mahine · ${annual}% per year`;

  render($("#emiBreak"),
    row("Loan amount (principal)", money(P)),
    row("Kul byaaj (interest)", money(Math.round(interest))),
    row("Kul mahine", num(n)),
    row("Kul chukana hoga", money(Math.round(total)), "result-row--total")
  );

  $("#emiBar").style.width = `${(P / total) * 100}%`;
}

function link(numId, rangeId) {
  const a = $(numId), b = $(rangeId);
  a.addEventListener("input", () => { b.value = a.value; calc(); });
  b.addEventListener("input", () => { a.value = b.value; calc(); });
}

onReady(() => {
  link("#emiAmount", "#emiAmountRange");
  link("#emiRate", "#emiRateRange");
  link("#emiYears", "#emiYearsRange");
  calc();
});
