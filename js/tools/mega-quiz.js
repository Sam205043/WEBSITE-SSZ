/* ==========================================================================
   Soft Skill Zone — MS Office Mega Quiz
   --------------------------------------------------------------------------
   Wahi 480 sawaal ka bank jo assignments me chalta hai, yahan practice ke
   liye khula hai. Module chuniye, kitne sawaal chahiye chuniye, aur khelein.

   Har baar sawaal naye kram me aate hain aur options bhi shuffle hote hain —
   isliye ratne se kaam nahi chalega, samajhna padega.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { url } from "../core/routes.js";
import { store } from "../core/utils.js";
import { QUESTION_BANK, BANK_MODULES, bankCounts } from "../config/question-bank.js";

const KEYS = ["A", "B", "C", "D"];
const BEST_KEY = "ssz.megaquiz.best";

let quiz = [], index = 0, score = 0, answered = false, wrong = [];
let picked = { module: "all", count: 20 };

/* Fisher-Yates — Array.sort(() => Math.random()-0.5) galat hota hai, wo
   sach me barabar shuffle nahi karta. */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Options bhi ghumate hain, par sahi jawab ka pata rakhte hain. */
function prepare(q) {
  const order = shuffle(q.o.map((_, i) => i));
  return {
    q: q.q,
    m: q.m,
    o: order.map((i) => q.o[i]),
    a: order.indexOf(q.a)
  };
}

function pool() {
  const src = picked.module === "all"
    ? QUESTION_BANK
    : QUESTION_BANK.filter((q) => q.m === picked.module);
  return shuffle(src).slice(0, Math.min(picked.count, src.length)).map(prepare);
}

/* ---------------- Setup screen ---------------- */
function paintSetup() {
  const counts = bankCounts();
  $("#mqHead").textContent = "Quiz shuru karein";

  render($("#mqBody"),
    el("p", { style: { fontSize: ".9rem", color: "var(--text-muted)", marginBottom: "1.25rem" } },
      `Kul ${QUESTION_BANK.length} sawaal ka bank. Module chuniye — har baar naye sawaal aayenge.`),

    el("div", { class: "field" },
      el("label", { class: "field__label", for: "mqModule" }, "Module"),
      el("select", { class: "select-ssz", id: "mqModule" },
        el("option", { value: "all" }, `Sab milakar (${QUESTION_BANK.length} sawaal)`),
        ...BANK_MODULES.map((m) => el("option", { value: m }, `${m} (${counts[m] || 0})`))
      )
    ),

    el("div", { class: "field" },
      el("label", { class: "field__label" }, "Kitne sawaal"),
      el("div", { class: "segment", id: "mqCount", style: { marginBottom: 0 } },
        ...[10, 20, 30, 50].map((n) =>
          el("button", { type: "button", class: n === picked.count ? "is-active" : "", dataset: { n: String(n) } }, String(n)))
      )
    ),

    el("button", { class: "btn-ssz btn-primary-ssz btn-block-ssz btn-lg-ssz", type: "button", id: "mqStart", style: { marginTop: ".5rem" } },
      "Quiz shuru karein"),

    bestLine()
  );

  $("#mqModule").value = picked.module;
}

function bestLine() {
  const best = store.get(BEST_KEY);
  if (!best) return null;
  return el("p", { style: { textAlign: "center", fontSize: ".82rem", color: "var(--text-muted)", marginTop: "1rem" } },
    `Aapka best: ${best}%`);
}

/* ---------------- Question screen ---------------- */
function paintQuestion() {
  const q = quiz[index];
  $("#mqHead").textContent = `Sawaal ${index + 1} / ${quiz.length}`;

  render($("#mqBody"),
    el("div", { class: "quiz-progress" },
      el("span", { class: "review-bar__track", style: { flex: 1 } },
        el("span", { class: "review-bar__fill", style: { width: `${(index / quiz.length) * 100}%`, background: "var(--brand)" } })),
      el("span", {}, `Score: ${score}`)
    ),
    el("span", { class: "badge-ssz", style: { marginBottom: ".75rem", display: "inline-block" } }, q.m),
    el("h2", { style: { fontSize: "var(--fs-md)", margin: "0 0 1.25rem" } }, q.q),
    el("div", { id: "mqOptions" },
      ...q.o.map((opt, i) =>
        el("button", { class: "quiz-option", type: "button", dataset: { i: String(i) } },
          el("span", { class: "quiz-option__key" }, KEYS[i]),
          el("span", {}, opt))
      )
    ),
    el("div", { id: "mqAfter" })
  );
}

function answer(choice) {
  if (answered) return;
  answered = true;
  const q = quiz[index];
  const buttons = $("#mqOptions").querySelectorAll(".quiz-option");

  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === q.a) b.classList.add("is-right");
    else if (i === choice) b.classList.add("is-wrong");
  });

  if (choice === q.a) score++;
  else wrong.push({ q: q.q, right: q.o[q.a] });

  render($("#mqAfter"),
    el("div", { class: "quiz-explain" },
      choice === q.a
        ? el("strong", {}, "Sahi jawab! 👍")
        : el("span", {}, el("strong", {}, "Sahi jawab: "), q.o[q.a])
    ),
    el("button", { class: "btn-ssz btn-primary-ssz btn-block-ssz", type: "button", id: "mqNext", style: { marginTop: "1.25rem" } },
      index + 1 < quiz.length ? "Agla sawaal" : "Result dekhein")
  );
}

/* ---------------- Result ---------------- */
function finish() {
  const pct = Math.round((score / quiz.length) * 100);
  const best = Number(store.get(BEST_KEY) || 0);
  const isBest = pct > best;
  if (isBest) store.set(BEST_KEY, String(pct));

  const verdict = pct >= 85 ? "Shandaar! Aapki taiyari pakki hai."
    : pct >= 60 ? "Achha hai — jo galat hue unhe ek baar dekh lijiye."
    : "Abhi abhyas chahiye. Ghabraiye mat, dobara khelein.";

  $("#mqHead").textContent = "Result";
  render($("#mqBody"),
    el("div", { style: { textAlign: "center" } },
      el("div", {
        class: "empty-state__icon",
        style: {
          margin: "0 auto 1.25rem",
          background: pct >= 60 ? "var(--success-soft)" : "var(--warning-soft)",
          color: pct >= 60 ? "var(--success)" : "var(--warning)"
        },
        html: icon(pct >= 60 ? "award" : "trending", { size: 32 })
      }),
      el("div", { class: "result-hero__value", style: { color: "var(--text-primary)" } }, `${score} / ${quiz.length}`),
      el("p", { style: { fontSize: "var(--fs-md)", margin: ".5rem 0 .35rem" } }, `${pct}% — ${verdict}`),
      isBest ? el("p", { style: { color: "var(--success)", fontWeight: "600", fontSize: ".88rem" } }, "Naya best score! 🎉") : null
    ),

    wrong.length
      ? el("div", { style: { marginTop: "1.75rem", textAlign: "left" } },
          el("h3", { style: { fontSize: ".95rem", marginBottom: ".75rem" } }, `Jo galat hue (${wrong.length})`),
          ...wrong.slice(0, 10).map((w) =>
            el("div", { class: "quiz-explain", style: { marginTop: ".5rem" } },
              el("strong", { style: { display: "block", marginBottom: ".25rem" } }, w.q),
              el("span", {}, "Sahi jawab: " + w.right)))
        )
      : null,

    el("div", { class: "cluster", style: { justifyContent: "center", marginTop: "1.75rem" } },
      el("button", { class: "btn-ssz btn-primary-ssz", type: "button", id: "mqAgain" }, "Dobara khelein"),
      el("a", { class: "btn-ssz btn-secondary-ssz", href: url("courses") }, "Courses dekhein")
    )
  );
}

/* ---------------- Boot ---------------- */
onReady(() => {
  paintSetup();

  on($("#mqBody"), "click", "#mqCount button", (e, btn) => {
    picked.count = Number(btn.dataset.n);
    $("#mqCount").querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
  });

  on($("#mqBody"), "click", "#mqStart", () => {
    picked.module = $("#mqModule").value;
    quiz = pool();
    if (!quiz.length) return;
    index = 0; score = 0; wrong = []; answered = false;
    paintQuestion();
  });

  on($("#mqBody"), "click", ".quiz-option", (e, btn) => answer(Number(btn.dataset.i)));

  on($("#mqBody"), "click", "#mqNext", () => {
    index++;
    answered = false;
    if (index < quiz.length) paintQuestion();
    else finish();
  });

  on($("#mqBody"), "click", "#mqAgain", paintSetup);
});
