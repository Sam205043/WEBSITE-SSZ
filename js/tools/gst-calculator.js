/* ==========================================================================
   Soft Skill Zone — GST Calculator
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { money, copyToClipboard } from "../core/utils.js";
import toast from "../core/toast.js";

const RATES = [0, 5, 12, 18, 28];
let mode = "exclusive", supply = "intra", rate = 18;

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function paintRates() {
  render($("#gstRates"), RATES.map((r) =>
    el("button", { type: "button", class: `chip${r === rate ? " is-active" : ""}`, dataset: { rate: String(r) } }, `${r}%`)
  ));
}

function row(label, value, cls = "") {
  return el("div", { class: `result-row ${cls}` }, el("dt", {}, label), el("dd", {}, value));
}

function calc() {
  const amount = Number($("#gstAmount").value) || 0;
  const custom = $("#gstCustom").value;
  const r = custom !== "" ? Number(custom) : rate;

  let base, gst, total;
  if (mode === "exclusive") {
    base = amount;
    gst = round2((amount * r) / 100);
    total = round2(base + gst);
  } else {
    total = amount;
    base = round2((amount * 100) / (100 + r));
    gst = round2(total - base);
  }

  $("#heroLabel").textContent = mode === "exclusive" ? "Total (GST ke saath)" : "Base amount (GST ke bina)";
  $("#heroValue").textContent = money(mode === "exclusive" ? total : base, { decimals: 2 });
  $("#heroSub").textContent = `${r}% GST · ${supply === "intra" ? "Same state" : "Other state"}`;

  const half = round2(gst / 2);
  render($("#gstBreak"),
    row("Base amount (taxable value)", money(base, { decimals: 2 })),
    supply === "intra"
      ? [row(`CGST @ ${r / 2}%`, money(half, { decimals: 2 })), row(`SGST @ ${r / 2}%`, money(round2(gst - half), { decimals: 2 }))]
      : row(`IGST @ ${r}%`, money(gst, { decimals: 2 })),
    row("Total GST", money(gst, { decimals: 2 })),
    row("Invoice total", money(total, { decimals: 2 }), "result-row--total")
  );

  return { base, gst, total, r };
}

onReady(() => {
  paintRates();
  calc();

  on($("#gstRates"), "click", ".chip", (e, chip) => {
    rate = Number(chip.dataset.rate);
    $("#gstCustom").value = "";
    paintRates();
    calc();
  });

  on($("#gstMode"), "click", "button", (e, btn) => {
    mode = btn.dataset.mode;
    $("#gstMode").querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
    calc();
  });

  on($("#gstSupply"), "click", "button", (e, btn) => {
    supply = btn.dataset.supply;
    $("#gstSupply").querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
    calc();
  });

  ["#gstAmount", "#gstCustom"].forEach((sel) => $(sel).addEventListener("input", calc));

  $("#gstCopy").addEventListener("click", async () => {
    const { base, gst, total, r } = calc();
    const text = `GST calculation (${r}%)\nBase: ${money(base, { decimals: 2 })}\nGST: ${money(gst, { decimals: 2 })}\nTotal: ${money(total, { decimals: 2 })}`;
    const ok = await copyToClipboard(text);
    ok ? toast.success("Result copy ho gaya.") : toast.error("Copy nahi ho paya.");
  });
});
