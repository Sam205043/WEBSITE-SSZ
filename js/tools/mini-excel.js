/* ==========================================================================
   Soft Skill Zone — Mini Excel (browser me chalne wali sheet)
   --------------------------------------------------------------------------
   Asli cells, asli formula, asli jawab. Bina Excel ke, bina internet ke,
   phone par bhi.

   Do faisle jo mobile ki wajah se liye gaye hain:

   1) Likhne ki jagah SIRF formula bar hai — cell ke andar type karne ka
      jhanjhat nahi. Phone par cell ke andar wala input keyboard ke neeche
      chhup jaata hai, page uchhalta hai, aur bachcha haar maan leta hai.
      Formula bar upar tika rehta hai, hamesha dikhta hai. Bonus: Excel me
      bhi asli kaam formula bar se hi hota hai, to aadat sahi padti hai.

   2) Neeche ek "quick keys" patti hai — = ( ) : , " aur kuchh function.
      Phone ke keyboard par "=" aur "(" doosri-teesri layer me chhupe hote
      hain; har formula ke liye teen baar keyboard badalna padta hai.

   Grid ek hi baar banta hai; badlaav par sirf cells ka text badalta hai.
   Har keystroke par poora table dobara banane se purana phone ruk jaata.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { store } from "../core/utils.js";
import { numToCol, colToNum } from "./formula-parser.js";
import { createSheet, isErr } from "./formula-eval.js";
import { LESSONS, getLesson } from "../config/excel-lessons.js";
import toast from "../core/toast.js";
import { loadPack } from "../core/i18n.js";

const DONE_KEY = "ssz.miniexcel.done";

let lesson = null;
let sheet = null;
let sel = { r: 1, c: 1 };
const tds = new Map();          // "A1" -> <td>
let done = store.get(DONE_KEY, {}) || {};
/* Bar me likhte waqt kaunsi cell "khuli" hai. Blur par isi me likha jaata
   hai — cell badalne se pehle ki halat, na ki badalne ke baad ki. */
let editingRef = null;

const ref = (r, c) => `${numToCol(c)}${r}`;
const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];

/* ==========================================================================
   Grid banana — ek hi baar
   ========================================================================== */
function buildGrid() {
  tds.clear();
  const table = el("table", { class: "mx-table" });

  const head = el("tr", {}, el("th", { class: "mx-corner" }));
  for (let c = 1; c <= lesson.cols; c++) {
    head.appendChild(el("th", { class: "mx-colhead", dataset: { col: String(c) } }, numToCol(c)));
  }
  table.appendChild(el("thead", {}, head));

  const body = el("tbody", {});
  for (let r = 1; r <= lesson.rows; r++) {
    const tr = el("tr", {});
    tr.appendChild(el("th", { class: "mx-rowhead", dataset: { row: String(r) } }, String(r)));
    for (let c = 1; c <= lesson.cols; c++) {
      const key = ref(r, c);
      const td = el("td", { class: "mx-cell", dataset: { ref: key }, tabindex: "-1" });
      tds.set(key, td);
      tr.appendChild(td);
    }
    body.appendChild(tr);
  }
  table.appendChild(body);
  render($("#mxGrid"), table);
}

/* ==========================================================================
   Values dobara likhna (DOM dobara nahi banta)
   ========================================================================== */
function refresh() {
  tds.forEach((td, key) => {
    const v = sheet.value(key);
    const shown = sheet.display(key);
    td.textContent = shown;

    td.classList.toggle("is-err", isErr(v));
    td.classList.toggle("is-num", typeof v === "number" && !isErr(v));
    td.classList.toggle("is-formula", sheet.isFormula(key));
    /* Task wali cells par halka nishaan — student ko pata rahe kahan kaam
       karna hai. Ho jaane par nishaan hara. */
    const t = lesson.tasks.find((x) => x.cell === key);
    td.classList.toggle("is-task", !!t);
    td.classList.toggle("is-ok", !!t && checkTask(t).ok);
  });
  paintSelection();
  paintTasks();
}

function paintSelection() {
  const key = ref(sel.r, sel.c);
  tds.forEach((td, k) => td.classList.toggle("is-sel", k === key));
  $("#mxName").textContent = key;
  const raw = sheet.getRaw(key);
  $("#mxBar").value = raw === "" ? "" : String(raw);

  /* Chuni hui cell ka natija saath me — student ko turant dikhe ki formula
     ne kya diya. */
  const v = sheet.value(key);
  const out = $("#mxOut");
  if (sheet.isFormula(key)) {
    out.hidden = false;
    out.textContent = `= ${sheet.display(key)}`;
    out.classList.toggle("is-err", isErr(v));
  } else {
    out.hidden = true;
  }

  /* Header par bhi ujaala — bade grid me apni jagah dhundhna aasaan */
  $$(".mx-colhead").forEach((th) => th.classList.toggle("is-sel", Number(th.dataset.col) === sel.c));
  $$(".mx-rowhead").forEach((th) => th.classList.toggle("is-sel", Number(th.dataset.row) === sel.r));
}


/* ==========================================================================
   Task jaanchna
   ========================================================================== */
function checkTask(t) {
  const hasFormula = sheet.isFormula(t.cell);
  if (t.needFormula && !hasFormula) {
    return { ok: false, why: sheet.getRaw(t.cell) !== "" ? "formula" : "khaali" };
  }
  const v = sheet.value(t.cell);
  if (isErr(v)) return { ok: false, why: "error" };

  const w = t.want;
  let ok;
  if (w && typeof w === "object" && "near" in w) {
    ok = typeof v === "number" && Math.abs(v - w.near) < 0.6;
  } else if (typeof w === "number") {
    ok = typeof v === "number" && Math.abs(v - w) < 1e-9;
  } else {
    ok = String(v).trim().toLowerCase() === String(w).trim().toLowerCase();
  }
  return { ok, why: ok ? "" : "galat" };
}

const WHY_TEXT = {
  khaali: "abhi khaali hai",
  formula: "jawab haath se likha hai — formula lagayein (= se shuru)",
  error: "formula me error aa raha hai",
  galat: "jawab abhi sahi nahi hai"
};

function paintTasks() {
  const rows = lesson.tasks.map((t, i) => {
    const st = checkTask(t);
    return el("li", { class: `mx-task${st.ok ? " is-done" : ""}`, dataset: { go: t.cell } },
      el("span", { class: "mx-task__mark" }, st.ok ? el("span", { html: icon("checkCircle", { size: 17 }) }) : el("span", { class: "mx-ring" })),
      el("span", { class: "mx-task__body" },
        el("span", { class: "mx-task__say" }, el("code", {}, t.cell), " ", t.say),
        !st.ok && st.why !== "khaali"
          ? el("span", { class: "mx-task__why" }, WHY_TEXT[st.why] || "")
          : null,
        el("button", { class: "mx-task__hint", type: "button", dataset: { hint: String(i) } }, "Ishaara dekhein"),
        el("code", { class: "mx-task__hintbox", hidden: true }, t.hint)
      ));
  });
  render($("#mxTasks"), rows);

  const okCount = lesson.tasks.filter((t) => checkTask(t).ok).length;
  const total = lesson.tasks.length;
  $("#mxCount").textContent = `${okCount} / ${total}`;
  $("#mxFill").style.width = `${Math.round((okCount / total) * 100)}%`;

  const wasDone = done[lesson.id];
  if (okCount === total && !wasDone) {
    done[lesson.id] = true;
    store.set(DONE_KEY, done);
    toast.success("Shabaash! Poora lesson ho gaya.");
    paintLessonList();
  }
  $("#mxAllDone").hidden = okCount !== total;
}

/* ==========================================================================
   Likhna
   ========================================================================== */
function commit(value, move = "down") {
  const key = editingRef || ref(sel.r, sel.c);
  editingRef = null;
  sheet.set(key, value);
  refresh();
  if (move === "down") sel.r = Math.min(lesson.rows, sel.r + 1);
  if (move === "right") sel.c = Math.min(lesson.cols, sel.c + 1);
  paintSelection();
}

function select(r, c) {
  sel.r = Math.max(1, Math.min(lesson.rows, r));
  sel.c = Math.max(1, Math.min(lesson.cols, c));
  paintSelection();
  const td = tds.get(ref(sel.r, sel.c));
  if (td) {
    td.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (document.activeElement && document.activeElement.classList.contains("mx-cell")) {
      td.focus({ preventScroll: true });
    }
  }
}

/* Ctrl+D — upar wali cell ka formula neeche kheenchna. Excel ka ye sabse
   kaam ka shortcut hai aur students ise sabse baad me seekhte hain. */
function fillDown() {
  if (sel.r <= 1) return;
  const from = ref(sel.r - 1, sel.c);
  const raw = sheet.getRaw(from);
  if (raw === "") return;
  const moved = typeof raw === "string" && raw.startsWith("=") ? shiftFormula(raw, 1) : raw;
  sheet.set(ref(sel.r, sel.c), moved);
  refresh();
  toast.info("Upar wali cell se kheench liya.");
}

/* Formula ko ek row neeche khiskaana: relative ref badalte hain, $ wale nahi.
   Yahi Excel ka asli vyavhaar hai, aur yahi $ ka poora matlab hai. */
function shiftFormula(f, dr) {
  return f.replace(/(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})/g, (m, ca, col, ra, row) => {
    const newRow = ra === "$" ? Number(row) : Number(row) + dr;
    return `${ca}${col}${ra}${newRow < 1 ? row : newRow}`;
  });
}

/* ==========================================================================
   Lesson badalna
   ========================================================================== */
function loadLesson(id) {
  lesson = getLesson(id);
  sheet = createSheet(lesson.data);
  sel = { r: 1, c: 1 };
  $("#mxTitle").textContent = lesson.title;
  $("#mxAbout").textContent = lesson.about;
  buildGrid();
  refresh();
  paintLessonList();
}

function paintLessonList() {
  render($("#mxLessons"), LESSONS.map((l) =>
    el("button", {
      type: "button",
      class: `chip${l.id === lesson.id ? " is-active" : ""}${done[l.id] ? " is-done" : ""}`,
      dataset: { lesson: l.id }
    }, done[l.id] ? "✓ " : "", l.title)));
}

/* ==========================================================================
   Boot
   ========================================================================== */
onReady(() => {

  /* In tools ka saara padhne wala text ek hi anuvaad-file me hai
     (lang/en.tools.json) aur sirf zaroorat par utarta hai. Await nahi kar
     rahe — pack aate hi i18n poore page ka text khud badal deta hai.
     Hinglish par ye line kuch karti hi nahi. */
  loadPack("tools");
  loadLesson(LESSONS[0].id);

  const bar = $("#mxBar");

  /* ---- cell chunna ---- */
  on($("#mxGrid"), "click", ".mx-cell", (e, td) => {
    const m = /^([A-Z]+)(\d+)$/.exec(td.dataset.ref);
    select(Number(m[2]), colToNum(m[1]));
    /* Cell ko focus dena zaroori hai: isi se pata chalta hai ki keyboard
       ab grid ka hai. Phone par ye keyboard nahi kholta (td input nahi hai),
       isliye scroll bhi nahi uchhalta. */
    td.focus({ preventScroll: true });
  });

  /* ---- formula bar ---- */
  /* Excel me doosri cell par click karte hi likha hua bas jaata hai. Yahan
     ye aur zaroori hai: phone par "Enter" button ke upar WhatsApp wala
     floating button aa jaata hai, to Enter dabaye bina bhi kaam hona
     chahiye. */
  bar.addEventListener("focus", () => { editingRef = ref(sel.r, sel.c); });
  bar.addEventListener("blur", () => {
    if (!editingRef) return;
    const was = String(sheet.getRaw(editingRef) ?? "");
    if (bar.value !== was) commit(bar.value, "stay");
    else editingRef = null;
  });

  bar.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(bar.value, "down"); bar.blur(); }
    else if (e.key === "Tab") { e.preventDefault(); commit(bar.value, "right"); }
    else if (e.key === "Escape") { e.preventDefault(); editingRef = null; paintSelection(); bar.blur(); }
  });
  $("#mxOk").addEventListener("click", () => { commit(bar.value, "down"); });

  /* ---- keyboard se ghoomna (desktop) ---- */
  document.addEventListener("keydown", (e) => {
    if (document.activeElement === bar) return;
    /* Keyboard tabhi grid ka hai jab koi cell chuni hui ho. Warna page ke
       baaki hisse me "s" dabate hi formula bar me "s" chala jaata tha. */
    if (!document.activeElement || !document.activeElement.classList.contains("mx-cell")) return;

    const k = e.key;
    if (k === "ArrowUp")    { e.preventDefault(); select(sel.r - 1, sel.c); }
    else if (k === "ArrowDown")  { e.preventDefault(); select(sel.r + 1, sel.c); }
    else if (k === "ArrowLeft")  { e.preventDefault(); select(sel.r, sel.c - 1); }
    else if (k === "ArrowRight") { e.preventDefault(); select(sel.r, sel.c + 1); }
    else if (k === "Enter")      { e.preventDefault(); bar.focus(); bar.select(); }
    else if (k === "Delete" || k === "Backspace") { e.preventDefault(); commit("", "stay"); }
    else if ((e.ctrlKey || e.metaKey) && (k === "d" || k === "D")) { e.preventDefault(); fillDown(); }
    else if (!e.ctrlKey && !e.metaKey && !e.altKey && k.length === 1) {
      /* Kuchh bhi type karte hi bar me chala jaata hai — Excel jaisa */
      bar.value = k;
      bar.focus();
      e.preventDefault();
    }
  });

  /* ---- quick keys (phone ke liye) ---- */
  on($("#mxKeys"), "click", "[data-ins]", (e, btn) => {
    const txt = btn.dataset.ins;
    const start = bar.selectionStart ?? bar.value.length;
    const end = bar.selectionEnd ?? bar.value.length;
    bar.value = bar.value.slice(0, start) + txt + bar.value.slice(end);
    const pos = start + txt.length - (txt.endsWith("(") ? 0 : 0);
    bar.focus();
    bar.setSelectionRange(pos, pos);
  });

  /* ---- buttons ---- */
  $("#mxFillDown").addEventListener("click", fillDown);
  $("#mxClear").addEventListener("click", () => { commit("", "stay"); });
  $("#mxReset").addEventListener("click", () => {
    sheet = createSheet(lesson.data);
    refresh();
    toast.info("Sheet phir se pehle jaisi ho gayi.");
  });

  on($("#mxLessons"), "click", ".chip", (e, chip) => loadLesson(chip.dataset.lesson));

  on($("#mxTasks"), "click", "[data-hint]", (e, btn) => {
    e.stopPropagation();
    const box = btn.nextElementSibling;
    box.hidden = !box.hidden;
    btn.textContent = box.hidden ? "Ishaara dekhein" : "Ishaara chhupayein";
  });

  on($("#mxTasks"), "click", ".mx-task", (e, li) => {
    if (e.target.closest("[data-hint]")) return;
    const m = /^([A-Z]+)(\d+)$/.exec(li.dataset.go);
    if (m) { select(Number(m[2]), colToNum(m[1])); $("#mxGrid").scrollIntoView({ behavior: "smooth", block: "center" }); }
  });
});
