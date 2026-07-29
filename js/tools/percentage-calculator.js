/* ==========================================================================
   Soft Skill Zone — Percentage Calculator (3 modes)
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { num } from "../core/utils.js";

let mode = "marks";

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

function paintFields() {
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
  const a = Number($("#pA").value);
  const b = Number($("#pB").value);

  if (mode === "marks") {
    if (!b) { $("#pctHero").textContent = "-"; return; }
    const pct = (a / b) * 100;
    $("#pctLabel").textContent = "Percentage";
    $("#pctHero").textContent = `${fmt(pct)}%`;
    $("#pctSub").textContent = `${fmt(a)} out of ${fmt(b)}`;
    const division = pct >= 60 ? "First Division" : pct >= 45 ? "Second Division" : pct >= 33 ? "Third Division" : "Fail";
    render($("#pctBreak"),
      row("Prapt ank", fmt(a)),
      row("Kul ank", fmt(b)),
      row("Kam ank", fmt(b - a)),
      row("Division (aam niyam)", division)
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
});
