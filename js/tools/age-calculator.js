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

  /* Udhaar JANM ke mahine ka lena hota hai, target se pehle wale mahine ka
     nahi. Warna 31 tarikh ko paida hue aadmi ka hisaab February se udhaar
     leta tha aur din MINUS me chala jaata tha —
     "26 saal, 1 mahine, -2 din" jaisa. */
  if (days < 0) {
    months--;
    days += new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate();
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
  /* 29 February wale ka janmdin aam saal me 1 March par phisal jaata tha.
     Us mahine me jitne din hain, usi hisaab se din ko seemit kar dete hain. */
  const birthdayIn = (year) => {
    const dim = new Date(year, dob.getMonth() + 1, 0).getDate();
    return new Date(year, dob.getMonth(), Math.min(dob.getDate(), dim));
  };
  let next = birthdayIn(till.getFullYear());
  if (next < till) next = birthdayIn(till.getFullYear() + 1);
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
