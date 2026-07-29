/* ==========================================================================
   Soft Skill Zone — GST Invoice Generator
   Everything stays in the browser; print/PDF via the browser print dialog.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { money, amountInWords, formatDate, dateKey, store } from "../core/utils.js";
import { LS_KEYS } from "../core/constants.js";

let items = [];
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function blankItem() {
  return { desc: "", hsn: "", qty: 1, rate: 0, gst: 18 };
}

function paintItems() {
  render($("#invItems"), items.map((it, i) =>
    el("div", { class: "item-row" },
      el("div", {}, el("label", { class: "field__label", style: { fontSize: ".72rem" } }, "Item"),
        el("input", { class: "input-ssz", type: "text", value: it.desc, placeholder: "Item ka naam", "aria-label": `Item ${i + 1} — naam`, dataset: { i: String(i), k: "desc" } })),
      el("div", {}, el("label", { class: "field__label", style: { fontSize: ".72rem" } }, "HSN"),
        el("input", { class: "input-ssz", type: "text", value: it.hsn, placeholder: "8471", "aria-label": `Item ${i + 1} — HSN code`, dataset: { i: String(i), k: "hsn" } })),
      el("div", {}, el("label", { class: "field__label", style: { fontSize: ".72rem" } }, "Qty"),
        el("input", { class: "input-ssz", type: "number", min: "0", step: "0.01", value: String(it.qty), "aria-label": `Item ${i + 1} — quantity`, dataset: { i: String(i), k: "qty" } })),
      el("div", {}, el("label", { class: "field__label", style: { fontSize: ".72rem" } }, "Rate"),
        el("input", { class: "input-ssz", type: "number", min: "0", step: "0.01", value: String(it.rate), "aria-label": `Item ${i + 1} — rate`, dataset: { i: String(i), k: "rate" } })),
      el("div", {}, el("label", { class: "field__label", style: { fontSize: ".72rem" } }, "GST%"),
        el("select", { class: "select-ssz", "aria-label": `Item ${i + 1} — GST rate`, dataset: { i: String(i), k: "gst" } },
          ...[0, 5, 12, 18, 28].map((g) => el("option", { value: String(g), selected: g === it.gst }, `${g}%`)))),
      el("button", {
        class: "icon-btn", type: "button", "aria-label": "Item hatayein",
        dataset: { del: String(i) }, html: icon("trash", { size: 16 })
      })
    )
  ));
}

function totals() {
  let taxable = 0, tax = 0;
  const lines = items.map((it) => {
    const amt = round2((Number(it.qty) || 0) * (Number(it.rate) || 0));
    const t = round2((amt * (Number(it.gst) || 0)) / 100);
    taxable += amt; tax += t;
    return { ...it, amount: amt, taxAmount: t, total: round2(amt + t) };
  });
  return { lines, taxable: round2(taxable), tax: round2(tax), grand: round2(taxable + tax) };
}

function paintSheet() {
  const { lines, taxable, tax, grand } = totals();
  const inter = $("#invSupply").value === "inter";
  const half = round2(tax / 2);

  const rows = lines.map((l, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(l.desc) || "-"}</td>
      <td>${esc(l.hsn) || "-"}</td>
      <td class="num">${l.qty}</td>
      <td class="num">${money(l.rate, { decimals: 2 })}</td>
      <td class="num">${money(l.amount, { decimals: 2 })}</td>
      <td class="num">${l.gst}%</td>
      <td class="num">${money(l.taxAmount, { decimals: 2 })}</td>
      <td class="num">${money(l.total, { decimals: 2 })}</td>
    </tr>`).join("");

  const taxRows = inter
    ? `<tr><td>IGST</td><td class="num">${money(tax, { decimals: 2 })}</td></tr>`
    : `<tr><td>CGST</td><td class="num">${money(half, { decimals: 2 })}</td></tr>
       <tr><td>SGST</td><td class="num">${money(round2(tax - half), { decimals: 2 })}</td></tr>`;

  $("#invSheet").innerHTML = `
  <div class="sheet" id="invPrintArea">
    <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:2px solid #4f46e5;padding-bottom:12px;margin-bottom:14px">
      <div>
        <h2 style="margin:0;font-size:1.15rem;color:#312e81">${esc($("#invSeller").value) || "Aapki Firm ka Naam"}</h2>
        <p style="margin:2px 0 0;font-size:.76rem">${esc($("#invSellerAddr").value) || "Aapka pata"}</p>
        ${$("#invSellerGst").value ? `<p style="margin:2px 0 0;font-size:.76rem"><strong>GSTIN:</strong> ${esc($("#invSellerGst").value.toUpperCase())}</p>` : ""}
      </div>
      <div style="text-align:right">
        <p style="margin:0;font-weight:700;letter-spacing:.08em;font-size:.8rem">TAX INVOICE</p>
        <p style="margin:4px 0 0;font-size:.76rem"><strong>No:</strong> ${esc($("#invNo").value) || "-"}</p>
        <p style="margin:2px 0 0;font-size:.76rem"><strong>Date:</strong> ${$("#invDate").value ? formatDate($("#invDate").value) : "-"}</p>
      </div>
    </div>

    <div style="margin-bottom:12px">
      <p style="margin:0;font-size:.72rem;color:#666;text-transform:uppercase;letter-spacing:.06em">Bill to</p>
      <p style="margin:2px 0 0;font-weight:600">${esc($("#invBuyer").value) || "Customer ka naam"}</p>
      ${$("#invBuyerGst").value ? `<p style="margin:2px 0 0;font-size:.76rem">GSTIN: ${esc($("#invBuyerGst").value.toUpperCase())}</p>` : ""}
    </div>

    <table>
      <thead><tr><th>#</th><th>Item</th><th>HSN</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th><th class="num">GST%</th><th class="num">Tax</th><th class="num">Total</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="9" style="text-align:center;color:#888;padding:18px">Abhi koi item nahi</td></tr>'}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-top:14px">
      <table style="width:min(300px,100%)">
        <tr><td>Taxable value</td><td class="num">${money(taxable, { decimals: 2 })}</td></tr>
        ${taxRows}
        <tr style="border-top:2px solid #0f172a"><td style="font-weight:700;padding-top:8px">Grand Total</td><td class="num" style="font-weight:700;padding-top:8px">${money(grand, { decimals: 2 })}</td></tr>
      </table>
    </div>

    <p style="margin-top:12px;font-size:.76rem"><strong>Amount in words:</strong> ${amountInWords(Math.round(grand))}</p>

    <div style="display:flex;justify-content:space-between;margin-top:28px;font-size:.72rem;color:#555">
      <span>E. &amp; O.E.</span>
      <span style="border-top:1px solid #0f172a;padding:4px 20px 0">Authorised Signatory</span>
    </div>
  </div>`;
}

function save() {
  store.set(LS_KEYS.INVOICE_SEQ, {
    seller: $("#invSeller").value, gst: $("#invSellerGst").value, addr: $("#invSellerAddr").value
  });
}

onReady(() => {
  const saved = store.get(LS_KEYS.INVOICE_SEQ);
  if (saved) {
    $("#invSeller").value = saved.seller || "";
    $("#invSellerGst").value = saved.gst || "";
    $("#invSellerAddr").value = saved.addr || "";
  }
  $("#invDate").value = dateKey();
  $("#invNo").value = `INV-${new Date().getFullYear()}-001`;

  items = [blankItem()];
  paintItems();
  paintSheet();

  $("#invAdd").addEventListener("click", () => { items.push(blankItem()); paintItems(); paintSheet(); });

  on($("#invItems"), "input", "input, select", (e, node) => {
    const it = items[Number(node.dataset.i)];
    if (!it) return;
    const k = node.dataset.k;
    it[k] = (k === "qty" || k === "rate" || k === "gst") ? Number(node.value) : node.value;
    paintSheet();
  });

  on($("#invItems"), "click", "[data-del]", (e, btn) => {
    items.splice(Number(btn.dataset.del), 1);
    if (!items.length) items.push(blankItem());
    paintItems(); paintSheet();
  });

  ["#invSeller", "#invSellerGst", "#invSellerAddr", "#invBuyer", "#invBuyerGst", "#invNo", "#invDate"]
    .forEach((sel) => $(sel).addEventListener("input", () => { paintSheet(); save(); }));
  $("#invSupply").addEventListener("change", paintSheet);

  $("#invPrint").addEventListener("click", () => {
    const w = window.open("", "_blank", "width=900,height=1000");
    w.document.write(`<html><head><title>${$("#invNo").value || "Invoice"}</title>
      <style>body{font-family:Arial,sans-serif;margin:24px;color:#0f172a}
      table{width:100%;border-collapse:collapse}
      th,td{padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:12px}
      th{background:#f1f5f9;text-transform:uppercase;font-size:10px;letter-spacing:.06em}
      .num{text-align:right}</style></head><body>${$("#invPrintArea").innerHTML}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  });

  $("#invReset").addEventListener("click", () => {
    items = [blankItem()];
    ["#invBuyer", "#invBuyerGst"].forEach((s) => { $(s).value = ""; });
    paintItems(); paintSheet();
  });
});
