/* ==========================================================================
   Soft Skill Zone — Excel Practice Data
   --------------------------------------------------------------------------
   Asli jaisa data, taaki student asli Excel me kaam karke seekhe. File
   browser me hi banti hai — koi server nahi, koi internet nahi. Ek baar
   page khul gaya to bina net ke bhi download ho jaayegi.

   Har file me "Kaam" naam ki doosri sheet hoti hai jisme us data par karne
   wale sawaal likhe hain. Sirf data de dena kaafi nahi hota — student ko
   pata hona chahiye ki karna kya hai.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { SAMPLE_DATASETS, getDataset } from "../config/sample-datasets.js";
import toast from "../core/toast.js";

let openId = SAMPLE_DATASETS[0].id;
/* Ek hi dataset baar-baar banane ki zaroorat nahi — bana kar rakh lete hain. */
const cache = new Map();

function built(id) {
  if (!cache.has(id)) {
    const d = getDataset(id);
    cache.set(id, d ? d.build() : null);
  }
  return cache.get(id);
}

/* ---------------- Preview table ---------------- */
function fmt(v) {
  if (v === null || v === undefined) return "";
  if (v && typeof v === "object" && v.d instanceof Date) {
    const d = v.d;
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  }
  return String(v);
}

function previewTable(rows, limit = 6) {
  const head = rows[0] || [];
  const body = rows.slice(1, 1 + limit);
  return el("div", { class: "table-wrap ds-preview" },
    el("table", { class: "table-ssz" },
      el("thead", {}, el("tr", {}, head.map((h) => el("th", {}, String(h))))),
      el("tbody", {}, body.map((r) =>
        el("tr", {}, r.map((c, i) =>
          /* Khaali column ko saaf dikhana zaroori hai — yahi to student ko
             bharna hai. Warna wo samajhta hai file adhoori aayi hai. */
          c === null || c === undefined || c === ""
            ? el("td", { class: "ds-blank" }, "aap bharenge")
            : el("td", { class: typeof c === "number" ? "num" : "" }, fmt(c))))))
    ));
}

/* ---------------- Ek dataset ka card ---------------- */
function card(d) {
  const isOpen = d.id === openId;
  const data = isOpen ? built(d.id) : null;

  const head = el("button", {
    class: `ds-head${isOpen ? " is-open" : ""}`, type: "button",
    dataset: { open: d.id }, "aria-expanded": isOpen ? "true" : "false"
  },
    el("span", { class: "ds-icon", style: { background: d.color }, html: icon(d.icon, { size: 19 }) }),
    el("span", { class: "ds-head__text" },
      el("strong", {}, d.title),
      el("span", { class: "ds-head__desc" }, d.desc)),
    el("span", { class: "ds-head__arrow", html: icon("chevronDown", { size: 18 }) })
  );

  if (!isOpen) return el("div", { class: "ds-item" }, head);

  const rowCount = data.rows.length - 1;
  const taskCount = data.tasks.length - 1;

  return el("div", { class: "ds-item is-open" }, head,
    el("div", { class: "ds-body" },
      el("div", { class: "ds-meta" },
        el("span", {}, `${rowCount} rows`),
        el("span", {}, `${data.rows[0].length} columns`),
        el("span", {}, `${taskCount} kaam`)),

      el("div", { class: "ds-learn" }, d.learn.map((t) => el("span", { class: "ds-tag" }, t))),

      el("p", { class: "ds-note" },
        "Neeche jo ", el("em", {}, "\"aap bharenge\""), " likha hai, wo column file me khaali hain — ",
        "wahi aapko formula se banana hai."),

      previewTable(data.rows),

      el("div", { class: "ds-btns" },
        el("button", { class: "btn-ssz btn-primary-ssz", type: "button", dataset: { xlsx: d.id } },
          el("span", { html: icon("download", { size: 17 }) }), " Excel file (.xlsx)"),
        el("button", { class: "btn-ssz btn-secondary-ssz", type: "button", dataset: { csv: d.id } },
          el("span", { html: icon("download", { size: 17 }) }), " CSV")),

      el("details", { class: "ds-tasks" },
        el("summary", {}, `Kya-kya karna hai — ${taskCount} kaam`),
        el("ol", {}, data.tasks.slice(1).map((t) =>
          el("li", {},
            el("span", { class: "ds-task__what" }, String(t[1])),
            t[2] ? el("code", { class: "ds-task__hint" }, String(t[2])) : null))))
    ));
}

function paint() {
  render($("#dsList"), SAMPLE_DATASETS.map(card));
}

/* ---------------- Download ---------------- */
async function downloadXlsx(id) {
  const d = getDataset(id);
  const data = built(id);
  if (!d || !data) return;

  const { buildXlsx, downloadBlob } = await import("./xlsx-writer.js");
  const blob = buildXlsx([
    { name: "Data", rows: data.rows, widths: d.build ? data.widths : [] },
    { name: "Kaam", rows: data.tasks, widths: [5, 62, 34] }
  ]);
  downloadBlob(blob, `${d.file}.xlsx`);
  toast.success("File download ho gayi. Excel me kholein aur \"Kaam\" wali sheet zaroor dekhein.");
}

async function downloadCsv(id) {
  const d = getDataset(id);
  const data = built(id);
  if (!d || !data) return;

  const { buildCsv, downloadBlob } = await import("./xlsx-writer.js");
  downloadBlob(buildCsv(data.rows), `${d.file}.csv`);
  toast.info("CSV me sirf data hai. Kaam ki list is page par hi dekh lein.");
}

/* ---------------- Boot ---------------- */
onReady(() => {
  paint();

  on($("#dsList"), "click", ".ds-head", (e, btn) => {
    openId = openId === btn.dataset.open ? "" : btn.dataset.open;
    paint();
  });

  on($("#dsList"), "click", "[data-xlsx]", async (e, btn) => {
    btn.disabled = true;
    try { await downloadXlsx(btn.dataset.xlsx); }
    catch (err) { toast.error(err.message || "File nahi ban payi."); }
    finally { btn.disabled = false; }
  });

  on($("#dsList"), "click", "[data-csv]", async (e, btn) => {
    btn.disabled = true;
    try { await downloadCsv(btn.dataset.csv); }
    catch (err) { toast.error(err.message || "File nahi ban payi."); }
    finally { btn.disabled = false; }
  });
});
