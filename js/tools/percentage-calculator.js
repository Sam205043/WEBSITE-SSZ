/* ==========================================================================
   Soft Skill Zone — Percentage & Marks Calculator (4 modes)
   --------------------------------------------------------------------------
   "Subject-wise" mode hi poora Marks Calculator hai — har vishay ke marks
   bharein, total, percentage, grade aur division turant. Iske liye alag page
   nahi banaya: hisaab wahi hai, aur do jagah ek jaisi cheez rakhne se student
   bhram me padta hai ki kaunsa istemaal kare.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { num } from "../core/utils.js";

let mode = "marks";

let subjects = [
  { name: "Hindi", got: 78, max: 100 },
  { name: "English", got: 65, max: 100 },
  { name: "Maths", got: 82, max: 100 },
  { name: "Science", got: 71, max: 100 },
  { name: "Computer", got: 88, max: 100 }
];

/* Aam Indian board ka paimana. Har board ka apna niyam hota hai — isliye
   page par saaf disclaimer bhi diya hua hai. */
function gradeOf(pct) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  if (pct >= 33) return "E";
  return "Fail";
}

function divisionOf(pct) {
  if (pct < 33) return "Fail";
  if (pct >= 60) return "First Division";
  if (pct >= 45) return "Second Division";
  return "Third Division";
}

const FIELDS = {
  marks: [
    { id: "pA", label: "Prapt ank (obtained marks)", value: 425 },
    { id: "pB", label: "Kul ank (total marks)", value: 500 }
  ],
  of: [
    { id: "pA", label: "Percentage (%)", value: 18 },
    { id: "pB", label: "Kis number ka", value: 2500 }
  ],
  change: [
    { id: "pA", label: "Purana value", value: 4000 },
    { id: "pB", label: "Naya value", value: 5000 }
  ]
};

const row = (k, v) => el("div", { class: "result-row" }, el("dt", {}, k), el("dd", {}, v));
const fmt = (n) => num(Math.round((n + Number.EPSILON) * 100) / 100, 2).replace(/\.00$/, "");

/* ---------------- Subject-wise (Marks Calculator) ---------------- */
function paintSubjects() {
  render($("#pctFields"),
    el("div", { class: "subj-list", id: "subjList" },
      el("div", { class: "subj-row subj-row--head" },
        el("span", {}, "Vishay"), el("span", {}, "Prapt"), el("span", {}, "Kul"), el("span", {})),
      ...subjects.map((s, i) =>
        el("div", { class: "subj-row", dataset: { i: String(i) } },
          el("input", { class: "input-ssz", type: "text", value: s.name, "data-f": "name", "aria-label": "Vishay ka naam" }),
          el("input", { class: "input-ssz", type: "number", value: String(s.got), min: "0", inputmode: "numeric", "data-f": "got", "aria-label": "Prapt ank" }),
          el("input", { class: "input-ssz", type: "number", value: String(s.max), min: "1", inputmode: "numeric", "data-f": "max", "aria-label": "Kul ank" }),
          el("button", {
            class: "subj-del", type: "button", "data-del": String(i),
            "aria-label": `${s.name || "Vishay"} hatayein`, title: "Hatayein"
          }, "×")
        )
      )
    ),
    el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", type: "button", id: "subjAdd", style: { marginTop: ".75rem" } },
      "+ Vishay jodein")
  );
}

function calcSubjects() {
  const valid = subjects.filter((s) => Number(s.max) > 0);
  const got = valid.reduce((t, s) => t + (Number(s.got) || 0), 0);
  const max = valid.reduce((t, s) => t + (Number(s.max) || 0), 0);

  if (!max) {
    $("#pctLabel").textContent = "Percentage";
    $("#pctHero").textContent = "-";
    $("#pctSub").textContent = "";
    render($("#pctBreak"));
    return;
  }

  const pct = (got / max) * 100;
  $("#pctLabel").textContent = "Kul Percentage";
  $("#pctHero").textContent = `${fmt(pct)}%`;
  $("#pctSub").textContent = `${fmt(got)} out of ${fmt(max)} · ${valid.length} vishay`;

  const fails = valid.filter((s) => (Number(s.got) / Number(s.max)) * 100 < 33);

  render($("#pctBreak"),
    row("Kul prapt ank", fmt(got)),
    row("Kul poornank", fmt(max)),
    row("Grade", gradeOf(pct)),
    row("Division", divisionOf(pct)),
    ...valid.map((s) => row(s.name || "Vishay", `${fmt(s.got)} / ${fmt(s.max)} — ${fmt((s.got / s.max) * 100)}%`)),
    fails.length
      ? row("Dhyan dein", `${fails.map((f) => f.name || "Vishay").join(", ")} me 33% se kam`)
      : null
  );
}

function paintFields() {
  if (mode === "subjects") return paintSubjects();

  render($("#pctFields"), FIELDS[mode].map((f) =>
    el("div", { class: "field" },
      el("label", { class: "field__label", for: f.id }, f.label),
      el("input", { class: "input-ssz", id: f.id, type: "number", step: "0.01", inputmode: "decimal", value: String(f.value) })
    )
  ));
  $("#pA").addEventListener("input", calc);
  $("#pB").addEventListener("input", calc);
}

function calc() {
  if (mode === "subjects") return calcSubjects();

  const a = Number($("#pA").value);
  const b = Number($("#pB").value);

  if (mode === "marks") {
    if (!b) { $("#pctHero").textContent = "-"; return; }
    const pct = (a / b) * 100;
    $("#pctLabel").textContent = "Percentage";
    $("#pctHero").textContent = `${fmt(pct)}%`;
    $("#pctSub").textContent = `${fmt(a)} out of ${fmt(b)}`;
    render($("#pctBreak"),
      row("Prapt ank", fmt(a)),
      row("Kul ank", fmt(b)),
      row("Kam ank", fmt(b - a)),
      row("Grade (aam niyam)", gradeOf(pct)),
      row("Division (aam niyam)", divisionOf(pct))
    );
  } else if (mode === "of") {
    const res = (a / 100) * b;
    $("#pctLabel").textContent = `${fmt(a)}% of ${fmt(b)}`;
    $("#pctHero").textContent = fmt(res);
    $("#pctSub").textContent = "";
    render($("#pctBreak"),
      row("Poora value", fmt(b)),
      row(`${fmt(a)}% hissa`, fmt(res)),
      row("Bacha hua", fmt(b - res))
    );
  } else {
    if (!a) { $("#pctHero").textContent = "-"; return; }
    const change = ((b - a) / a) * 100;
    $("#pctLabel").textContent = change >= 0 ? "Badhotari" : "Kami";
    $("#pctHero").textContent = `${fmt(Math.abs(change))}%`;
    $("#pctSub").textContent = `${fmt(a)} se ${fmt(b)}`;
    render($("#pctBreak"),
      row("Antar", fmt(Math.abs(b - a))),
      row("Purana", fmt(a)),
      row("Naya", fmt(b)),
      row("Kya hua", change >= 0 ? "Badha" : "Ghata")
    );
  }
}

onReady(() => {
  paintFields();
  calc();

  on($("#pctMode"), "click", "button", (e, btn) => {
    mode = btn.dataset.mode;
    $("#pctMode").querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
    paintFields();
    calc();
  });

  $("#pctCalc").addEventListener("click", calc);

  /* Subject-wise ke inputs har baar naye bante hain, isliye delegation. */
  on($("#pctFields"), "input", ".subj-row input", function () {
    const i = Number(this.closest(".subj-row").dataset.i);
    const f = this.dataset.f;
    if (!subjects[i]) return;
    subjects[i][f] = f === "name" ? this.value : Number(this.value);
    calcSubjects();
  });

  on($("#pctFields"), "click", "#subjAdd", () => {
    subjects.push({ name: "", got: 0, max: 100 });
    paintSubjects();
    calcSubjects();
    $("#subjList").lastElementChild?.querySelector("input")?.focus();
  });

  on($("#pctFields"), "click", ".subj-del", function () {
    if (subjects.length <= 1) return;      // ek to bacha rehna chahiye
    subjects.splice(Number(this.dataset.del), 1);
    paintSubjects();
    calcSubjects();
  });
});
