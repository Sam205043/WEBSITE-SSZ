/* ==========================================================================
   Soft Skill Zone — Excel Formula Practice
   --------------------------------------------------------------------------
   Asli daftar wale scenario diye jaate hain, student formula type karta hai,
   aur turant pata chal jaata hai sahi hai ya nahi.

   Jaanch me hum chhoti baaton par sakhti nahi karte — space, chhote-bade
   akshar, single ya double quote, aur ; ki jagah , — ye sab chala lete hain.
   Sikhne wale ko formula ki soch par dhyan dena chahiye, viraam-chinh par
   nahi. Kai sawaalon me ek se zyada sahi jawab bhi maane jaate hain.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { store } from "../core/utils.js";
import { EXCEL_QUESTIONS, EXCEL_LEVELS, questionsFor, isCorrect } from "../config/excel-bank.js";

const BEST_KEY = "ssz.excel.best";

let set = [], index = 0, score = 0, tries = 0, level = "all", shown = false;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const counts = () => {
  const o = { all: EXCEL_QUESTIONS.length };
  EXCEL_LEVELS.forEach((l) => { o[l] = questionsFor(l).length; });
  return o;
};

/* ---------------- Setup ---------------- */
function paintSetup() {
  const c = counts();
  $("#exHead").textContent = "Practice shuru karein";

  render($("#exBody"),
    el("p", { style: { fontSize: ".9rem", color: "var(--text-muted)", marginBottom: "1.25rem" } },
      `${EXCEL_QUESTIONS.length} sawaal — daftar ke asli kaam par bane. Formula type kijiye, turant jaanch ho jayegi.`),

    el("div", { class: "field" },
      el("label", { class: "field__label", for: "exLevel" }, "Level"),
      el("select", { class: "select-ssz", id: "exLevel" },
        el("option", { value: "all" }, `Sab (${c.all})`),
        ...EXCEL_LEVELS.map((l) => el("option", { value: l }, `${l} (${c[l]})`))
      )
    ),

    el("button", { class: "btn-ssz btn-primary-ssz btn-block-ssz btn-lg-ssz", type: "button", id: "exStart", style: { marginTop: ".5rem" } },
      "Shuru karein"),

    (() => {
      const best = store.get(BEST_KEY);
      return best ? el("p", { style: { textAlign: "center", fontSize: ".82rem", color: "var(--text-muted)", marginTop: "1rem" } }, `Aapka best: ${best}%`) : null;
    })(),

    el("div", { class: "tool-note", style: { marginTop: "1.5rem" } },
      el("span", { html: icon("info", { size: 17 }) }),
      el("span", {}, "Formula = se shuru kijiye. Chhote-bade akshar aur space se koi farq nahi padta."))
  );

  $("#exLevel").value = level;
}

/* ---------------- Question ---------------- */
function paintQuestion() {
  const q = set[index];
  $("#exHead").textContent = `Sawaal ${index + 1} / ${set.length}`;
  shown = false;

  render($("#exBody"),
    el("div", { class: "quiz-progress" },
      el("span", { class: "review-bar__track", style: { flex: 1 } },
        el("span", { class: "review-bar__fill", style: { width: `${(index / set.length) * 100}%`, background: "var(--brand)" } })),
      el("span", {}, `Sahi: ${score}`)
    ),

    el("span", { class: "badge-ssz", style: { marginBottom: ".75rem", display: "inline-block" } }, q.lvl),
    el("p", { class: "excel-scenario" }, q.q),

    el("form", { class: "excel-form", id: "exForm", autocomplete: "off" },
      el("input", {
        class: "input-ssz excel-input", id: "exInput", type: "text",
        placeholder: "=SUM(...)", spellcheck: "false",
        autocapitalize: "off", autocorrect: "off", "aria-label": "Apna formula likhein"
      }),
      el("button", { class: "btn-ssz btn-primary-ssz", type: "submit" }, "Check")
    ),

    el("div", { id: "exResult" }),

    el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", type: "button", id: "exShow", style: { marginTop: ".85rem" } },
      "Jawab dikhayein")
  );

  setTimeout(() => $("#exInput")?.focus(), 60);
}

function check() {
  const q = set[index];
  const given = $("#exInput").value;
  if (!given.trim()) return;

  tries++;
  const ok = isCorrect(given, q);
  if (ok && !shown) score++;

  $("#exInput").disabled = true;
  render($("#exResult"),
    el("div", {
      class: "quiz-explain",
      style: {
        background: ok ? "var(--success-soft)" : "var(--danger-soft)",
        marginTop: "1rem"
      }
    },
      el("strong", { style: { display: "block", marginBottom: ".35rem" } }, ok ? "Bilkul sahi! 👍" : "Ye theek nahi hai."),
      ok ? null : el("span", {}, "Sahi formula: ", el("code", { class: "excel-answer" }, q.a))
    ),
    el("button", { class: "btn-ssz btn-primary-ssz btn-block-ssz", type: "button", id: "exNext", style: { marginTop: "1rem" } },
      index + 1 < set.length ? "Agla sawaal" : "Result dekhein")
  );
  $("#exShow")?.remove();
}

function reveal() {
  const q = set[index];
  shown = true;
  $("#exInput").disabled = true;
  render($("#exResult"),
    el("div", { class: "quiz-explain", style: { marginTop: "1rem" } },
      el("strong", { style: { display: "block", marginBottom: ".35rem" } }, "Jawab:"),
      el("code", { class: "excel-answer" }, q.a)),
    el("button", { class: "btn-ssz btn-primary-ssz btn-block-ssz", type: "button", id: "exNext", style: { marginTop: "1rem" } },
      index + 1 < set.length ? "Agla sawaal" : "Result dekhein")
  );
  $("#exShow")?.remove();
}

/* ---------------- Result ---------------- */
function finish() {
  const pct = Math.round((score / set.length) * 100);
  const best = Number(store.get(BEST_KEY) || 0);
  const isBest = pct > best;
  if (isBest) store.set(BEST_KEY, String(pct));

  const verdict = pct >= 80 ? "Excel par aapki pakad achhi hai — interview me ye kaam aayega."
    : pct >= 50 ? "Theek chal rahe hain. Jo galat hue, unhe Excel me khud bana kar dekhein."
    : "Abhi shuruaat hai. Har formula ko sheet me khud likh kar dekhein — usi se baithta hai.";

  $("#exHead").textContent = "Result";
  render($("#exBody"),
    el("div", { style: { textAlign: "center" } },
      el("div", {
        class: "empty-state__icon",
        style: {
          margin: "0 auto 1.25rem",
          background: pct >= 60 ? "var(--success-soft)" : "var(--warning-soft)",
          color: pct >= 60 ? "var(--success)" : "var(--warning)"
        },
        html: icon(pct >= 60 ? "award" : "calculator", { size: 32 })
      }),
      el("div", { class: "result-hero__value", style: { color: "var(--text-primary)" } }, `${score} / ${set.length}`),
      el("p", { style: { fontSize: "var(--fs-md)", margin: ".5rem 0 .35rem" } }, `${pct}% — ${verdict}`),
      isBest ? el("p", { style: { color: "var(--success)", fontWeight: "600", fontSize: ".88rem" } }, "Naya best! 🎉") : null,
      el("div", { class: "cluster", style: { justifyContent: "center", marginTop: "1.5rem" } },
        el("button", { class: "btn-ssz btn-primary-ssz", type: "button", id: "exAgain" }, "Dobara")
      )
    )
  );
}

/* ---------------- Boot ---------------- */
onReady(() => {
  paintSetup();

  on($("#exBody"), "click", "#exStart", () => {
    level = $("#exLevel").value;
    set = shuffle(questionsFor(level));
    index = 0; score = 0; tries = 0;
    paintQuestion();
  });

  on($("#exBody"), "submit", "#exForm", (e) => { e.preventDefault(); check(); });
  on($("#exBody"), "click", "#exShow", reveal);

  on($("#exBody"), "click", "#exNext", () => {
    index++;
    if (index < set.length) paintQuestion();
    else finish();
  });

  on($("#exBody"), "click", "#exAgain", paintSetup);
});
