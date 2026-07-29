/* ==========================================================================
   Soft Skill Zone — Age Calculator
   ========================================================================== */

import { $, el, onReady, render } from "../core/dom.js";
import { dateKey, num } from "../core/utils.js";
import { showError, clearError } from "../core/validators.js";

const DAY = 86400000;
const row = (k, v) => el("div", { class: "result-row" }, el("dt", {}, k), el("dd", {}, v));

function diff(from, to) {
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();

  if (days < 0) {
    months--;
    days += new Date(to.getFullYear(), to.getMonth(), 0).getDate();
  }
  if (months < 0) { years--; months += 12; }
  return { years, months, days };
}

function calc() {
  const dobInput = $("#ageDob");
  const dob = dobInput.value ? new Date(dobInput.value + "T00:00:00") : null;
  const till = $("#ageTill").value ? new Date($("#ageTill").value + "T00:00:00") : new Date();

  if (!dob || isNaN(dob)) { showError(dobInput, "Janm tithi chunein."); return; }
  if (dob > till) { showError(dobInput, "Janm tithi target date se baad ki nahi ho sakti."); return; }
  clearError(dobInput);

  const { years, months, days } = diff(dob, till);
  const totalDays = Math.floor((till - dob) / DAY);

  $("#ageHero").textContent = `${years} saal, ${months} mahine, ${days} din`;
  $("#ageSub").textContent = `${dob.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} se aaj tak`;

  /* next birthday */
  let next = new Date(till.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < till) next = new Date(till.getFullYear() + 1, dob.getMonth(), dob.getDate());
  const toGo = Math.ceil((next - till) / DAY);

  render($("#ageBreak"),
    row("Kul mahine", num(years * 12 + months)),
    row("Kul hafte", num(Math.floor(totalDays / 7))),
    row("Kul din", num(totalDays)),
    row("Kul ghante", num(totalDays * 24)),
    row("Agla janmdin", next.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })),
    row("Janmdin me bache din", toGo === 0 ? "Aaj hi hai! 🎉" : `${num(toGo)} din`),
    row("Janm ka din", dob.toLocaleDateString("en-IN", { weekday: "long" }))
  );
}

onReady(() => {
  $("#ageTill").value = dateKey();
  $("#ageCalc").addEventListener("click", calc);
  $("#ageDob").addEventListener("change", calc);
  $("#ageTill").addEventListener("change", calc);
});
