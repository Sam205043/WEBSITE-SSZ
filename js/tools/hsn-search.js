/* ==========================================================================
   Soft Skill Zone — HSN / SAC code search
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { debounce, highlight, unique } from "../core/utils.js";
import { HSN_DATA } from "./tool-data.js";

let term = "", chapter = "all";

function filtered() {
  const q = term.toLowerCase();
  return HSN_DATA.filter((r) => {
    if (chapter !== "all" && r.chapter !== chapter) return false;
    if (!q) return true;
    return `${r.code} ${r.desc} ${r.chapter}`.toLowerCase().includes(q);
  });
}

function paint() {
  const rows = filtered();
  $("#hsnCount").textContent = `${rows.length} / ${HSN_DATA.length} codes`;

  if (!rows.length) {
    render($("#hsnRows"), el("tr", {}, el("td", { colspan: "4", style: { textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" } },
      "Kuch nahi mila — doosre shabd try karein (jaise 'computer', 'cement', 'service').")));
    return;
  }

  render($("#hsnRows"), rows.map((r) => {
    const tr = el("tr", {});
    tr.innerHTML = `
      <td><span class="hsn-code">${highlight(r.code, term)}</span></td>
      <td>${highlight(r.desc, term)}</td>
      <td><span class="badge-ssz">${r.chapter}</span></td>
      <td class="num"><span class="badge-ssz ${r.gst === 0 ? "badge-success" : r.gst >= 28 ? "badge-danger" : "badge-brand"}">${r.gst}%</span></td>`;
    return tr;
  }));
}

function paintFilters() {
  const chapters = ["all", ...unique(HSN_DATA.map((r) => r.chapter))];
  render($("#hsnFilters"), chapters.map((c) =>
    el("button", { type: "button", class: `chip${c === chapter ? " is-active" : ""}`, dataset: { c } }, c === "all" ? "Sab" : c)
  ));
}

onReady(() => {
  paintFilters();
  paint();

  $("#hsnSearch").addEventListener("input", debounce((e) => { term = e.target.value.trim(); paint(); }, 180));
  on($("#hsnFilters"), "click", ".chip", (e, chip) => { chapter = chip.dataset.c; paintFilters(); paint(); });
});
