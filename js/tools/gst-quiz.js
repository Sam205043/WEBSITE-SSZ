/* ==========================================================================
   Soft Skill Zone — GST Quiz
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { url } from "../core/routes.js";
import { GST_QUIZ } from "./tool-data.js";

const KEYS = ["A", "B", "C", "D"];
let questions = [], index = 0, score = 0, answered = false;

const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

function start() {
  questions = shuffle([...GST_QUIZ]);
  index = 0; score = 0; answered = false;
  paint();
}

function paint() {
  const q = questions[index];
  $("#quizHead").textContent = `Sawal ${index + 1} / ${questions.length}`;

  render($("#quizBody"),
    el("div", { class: "quiz-progress" },
      el("span", { class: "review-bar__track", style: { flex: 1 } },
        el("span", { class: "review-bar__fill", style: { width: `${(index / questions.length) * 100}%`, background: "var(--brand)" } })),
      el("span", {}, `Score: ${score}`)
    ),
    el("h2", { style: { fontSize: "var(--fs-md)", marginBottom: "1.25rem" } }, q.q),
    el("div", { id: "quizOptions" },
      ...q.options.map((opt, i) =>
        el("button", { class: "quiz-option", type: "button", dataset: { i: String(i) } },
          el("span", { class: "quiz-option__key" }, KEYS[i]),
          el("span", {}, opt))
      )
    ),
    el("div", { id: "quizAfter" })
  );
}

function answer(picked) {
  if (answered) return;
  answered = true;
  const q = questions[index];
  const buttons = $("#quizOptions").querySelectorAll(".quiz-option");

  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === q.answer) b.classList.add("is-right");
    else if (i === picked) b.classList.add("is-wrong");
  });

  if (picked === q.answer) score++;

  render($("#quizAfter"),
    el("div", { class: "quiz-explain" },
      el("strong", {}, picked === q.answer ? "Sahi! " : "Sahi jawab: " + q.options[q.answer] + ". "),
      q.why),
    el("button", { class: "btn-ssz btn-primary-ssz btn-block-ssz", type: "button", id: "quizNext", style: { marginTop: "1.25rem" } },
      index + 1 < questions.length ? "Agla sawal" : "Result dekhein")
  );
}

function finish() {
  const pct = Math.round((score / questions.length) * 100);
  const verdict = pct >= 80 ? "Shandaar! GST par aapki pakad achhi hai."
    : pct >= 50 ? "Theek-thaak — thoda aur abhyas karein."
    : "Shuruaat hai — GST 2.0 course isme bahut madad karega.";

  $("#quizHead").textContent = "Result";
  render($("#quizBody"),
    el("div", { style: { textAlign: "center" } },
      el("div", {
        class: "empty-state__icon",
        style: {
          margin: "0 auto 1.25rem",
          background: pct >= 50 ? "var(--success-soft)" : "var(--warning-soft)",
          color: pct >= 50 ? "var(--success)" : "var(--warning)"
        },
        html: icon(pct >= 50 ? "award" : "trending", { size: 32 })
      }),
      el("div", { class: "result-hero__value", style: { color: "var(--text-primary)" } }, `${score} / ${questions.length}`),
      el("p", { style: { fontSize: "var(--fs-md)", margin: ".5rem 0 1.5rem" } }, `${pct}% — ${verdict}`),
      el("div", { class: "cluster", style: { justifyContent: "center" } },
        el("button", { class: "btn-ssz btn-primary-ssz", type: "button", id: "quizAgain" }, "Dobara khelein"),
        el("a", { class: "btn-ssz btn-secondary-ssz", href: url("courseDetail", { id: "gst-2" }) }, "GST 2.0 course dekhein")
      )
    )
  );
}

onReady(() => {
  start();

  on($("#quizBody"), "click", ".quiz-option", (e, btn) => answer(Number(btn.dataset.i)));

  on($("#quizBody"), "click", "#quizNext", () => {
    index++;
    answered = false;
    if (index < questions.length) paint();
    else finish();
  });

  on($("#quizBody"), "click", "#quizAgain", start);
});
