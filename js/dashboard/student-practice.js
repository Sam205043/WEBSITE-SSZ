/* ==========================================================================
   Soft Skill Zone — Student: Practice Tests
   --------------------------------------------------------------------------
   Do tarah ke test yahan milte hain:

   1. Module wise — har module ka apna 25 sawaal ka test. Jitni baar chaahe
      de sakte hain, har baar sawaal naye aate hain. Ye seekhne ke liye hai,
      isliye result ke baad galat jawaalon ka sahi jawab bhi dikh jaata hai.

   2. Poora test — saare module milakar 100 sawaal, 90 minute. Har module se
      utne sawaal aate hain jitna wo course me hai, isliye ye asli imtihaan
      ka sahi andaza deta hai.

   In dono ke marks kahin record NAHI hote. Ye jaanbujh kar hai: jis test se
   record banta hai usme student darta hai aur ek hi baar deta hai. Practice
   ka fayda tabhi hai jab wo bina dar ke baar-baar de. Marks wala imtihaan
   Assignments wale hisse me alag chalta hai.

   Sabse achha score sirf isi browser me rehta hai (localStorage) — server
   par kuchh nahi jaata.
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { store } from "../core/utils.js";
import { initShell } from "./shell.js";
import { open as openModal } from "../core/modal.js";
import { QUESTION_BANK, BANK_MODULES, bankCounts, pickQuestions } from "../config/question-bank.js";
import { runQuiz } from "./quiz-runner.js";

const MODULE_COUNT = 25;
const FULL_COUNT = 100;
const FULL_MINUTES = 90;

const BEST_KEY = "ssz.practice.best";
const best = () => store.get(BEST_KEY, {}) || {};
const saveBest = (key, pct) => {
  const all = best();
  if ((all[key] || 0) < pct) { all[key] = pct; store.set(BEST_KEY, all); }
};

const esc = (s) => String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

/* ==========================================================================
   Poore test ka paper
   --------------------------------------------------------------------------
   Har module se utne sawaal jitna uska hissa bank me hai — Excel bank ka
   sabse bada hissa hai to paper me bhi sabse zyada Excel aayega. Isse paper
   syllabus ka sahi aaina banta hai, na ki har module ke barabar tukde.
   ========================================================================== */
function fullPaper() {
  const counts = bankCounts();
  const total = QUESTION_BANK.length;

  const share = BANK_MODULES.map((m) => ({ m, exact: (counts[m] || 0) / total * FULL_COUNT }));
  const out = share.map((s) => ({ ...s, n: Math.floor(s.exact) }));

  /* Neeche kaat-kaat kar jo sawaal bache, wo unhe milte hain jinka dashamlav
     sabse bada tha — warna paper 100 se kam ka reh jaata. */
  let left = FULL_COUNT - out.reduce((t, s) => t + s.n, 0);
  out.slice().sort((a, b) => (b.exact % 1) - (a.exact % 1)).forEach((s) => {
    if (left > 0) { s.n++; left--; }
  });

  const qs = [];
  out.forEach((s) => { if (s.n > 0) qs.push(...pickQuestions(s.m, s.n)); });

  /* Module ke hisaab se ikatthe na rahein — warna student ko lagta hai ek
     hissa khatam hua, ab agla. Asli paper me sawaal mile-jule aate hain. */
  for (let i = qs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [qs[i], qs[j]] = [qs[j], qs[i]];
  }
  return qs;
}

/* ==========================================================================
   Result
   ========================================================================== */
function resultDialog({ label, qs, answers, byModule }) {
  const right = qs.reduce((n, q, i) => n + (answers[i] === q.a ? 1 : 0), 0);
  const pct = Math.round((right / qs.length) * 100);
  const good = pct >= 40;
  saveBest(label, pct);

  const wrong = qs
    .map((q, i) => ({ q, i }))
    .filter(({ q, i }) => answers[i] !== q.a);

  const body = el("div", { class: "qres" });
  body.innerHTML = `
    <div class="qres__score" style="color:${good ? "var(--success)" : "var(--danger)"}">${right}/${qs.length}</div>
    <p class="qres__pct">${pct}% · ${
      pct >= 80 ? "Zabardast!" : pct >= 60 ? "Achha hai." : good ? "Chal jayega — thoda aur." : "Ek baar phir se padh lijiye."
    }</p>`;

  if (byModule) {
    const tally = {};
    qs.forEach((q, i) => {
      tally[q.m] = tally[q.m] || { r: 0, n: 0 };
      tally[q.m].n++;
      if (answers[i] === q.a) tally[q.m].r++;
    });
    const rows = el("div", { class: "qres__rows" });
    rows.innerHTML = BANK_MODULES.filter((m) => tally[m]).map((m) =>
      `<div class="qres__row"><span>${esc(m)}</span><span>${tally[m].r}/${tally[m].n}</span></div>`).join("");
    body.appendChild(rows);
  }

  const closeBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Theek hai");
  const footer = [closeBtn];

  /* Galat jawab dekhna hi practice ka asli fayda hai. Marks kahin chadh nahi
     rahe, isliye sahi jawab chhupane ka koi matlab nahi. */
  let seeBtn = null;
  if (wrong.length) {
    seeBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" },
      `${wrong.length} galat jawab dekhein`);
    footer.unshift(seeBtn);
  }

  const m = openModal({ title: "Aapka result", body, footer });
  closeBtn.addEventListener("click", () => m.close());

  if (seeBtn) seeBtn.addEventListener("click", () => {
    m.close();
    const list = el("div", { class: "qwrong" });
    list.innerHTML = wrong.map(({ q, i }) => `
      <div class="qwrong__item">
        <p class="qwrong__q">${esc(q.q)}</p>
        <p class="qwrong__line qwrong__bad">Aapka jawab: ${
          answers[i] >= 0 ? esc(q.o[answers[i]]) : "khali chhoda"}</p>
        <p class="qwrong__line qwrong__good">Sahi jawab: ${esc(q.o[q.a])}</p>
      </div>`).join("");
    const ok = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Band karein");
    const m2 = openModal({ title: "Galat jawab", size: "lg", body: list, footer: [ok] });
    ok.addEventListener("click", () => m2.close());
  });
}

/* ==========================================================================
   Test chalana
   ========================================================================== */
async function startModule(mod) {
  const qs = pickQuestions(mod, MODULE_COUNT);
  const answers = await runQuiz({
    title: `${mod} — practice`,
    questions: qs.map((q) => ({ q: q.q, options: q.o })),
    note: "Ye practice test hai — marks kahin record nahi hote. Jitni baar chaahein dijiye, har baar sawaal naye aayenge."
  });
  if (answers) { resultDialog({ label: mod, qs, answers, byModule: false }); paint(); }
}

async function startFull() {
  const qs = fullPaper();
  const answers = await runQuiz({
    title: `Poora Test — ${qs.length} sawaal`,
    questions: qs.map((q) => ({ q: q.q, options: q.o })),
    minutes: FULL_MINUTES,
    note: `Saare module milakar ${qs.length} sawaal, ${FULL_MINUTES} minute. Waqt khatam hote hi jitna bhara hai utna apne aap jama ho jayega.`
  });
  if (answers) { resultDialog({ label: "__full__", qs, answers, byModule: true }); paint(); }
}

/* ==========================================================================
   Cards
   ========================================================================== */
function bestLine(key) {
  const b = best()[key];
  return b === undefined
    ? el("span", { class: "ptest__none" }, "Abhi tak nahi diya")
    : el("span", { class: "ptest__best" }, `Sabse achha: ${b}%`);
}

function moduleCard(mod, have) {
  return el("div", { class: "card-ssz is-hoverable" }, el("div", { class: "card-ssz__body" },
    el("div", { style: { display: "flex", gap: ".9rem", alignItems: "flex-start" } },
      el("span", { class: "stat-tile__icon", style: { flexShrink: 0 }, html: icon("clipboard", { size: 20 }) }),
      el("span", { style: { minWidth: 0, flex: 1 } },
        el("strong", { style: { display: "block", fontSize: ".95rem", marginBottom: ".2rem" } }, mod),
        el("span", { style: { fontSize: ".8rem", color: "var(--text-muted)", display: "block", marginBottom: ".5rem" } },
          `${Math.min(MODULE_COUNT, have)} sawaal · bank me ${have}`),
        bestLine(mod)
      )
    ),
    el("button", {
      class: "btn-ssz btn-secondary-ssz btn-sm-ssz btn-block-ssz", type: "button",
      style: { marginTop: "1rem" }, dataset: { mod }
    }, "Test dein")
  ));
}

function fullCard() {
  return el("div", { class: "card-ssz", style: { borderColor: "var(--brand)" } },
    el("div", { class: "card-ssz__body" },
      el("div", { style: { display: "flex", gap: ".9rem", alignItems: "flex-start" } },
        el("span", { class: "stat-tile__icon", style: { flexShrink: 0, background: "var(--brand)", color: "#fff" }, html: icon("award", { size: 20 }) }),
        el("span", { style: { minWidth: 0, flex: 1 } },
          el("strong", { style: { display: "block", fontSize: ".95rem", marginBottom: ".2rem" } }, "Poora Test — 100 marks"),
          el("span", { style: { fontSize: ".8rem", color: "var(--text-muted)", display: "block", marginBottom: ".5rem" } },
            `Saare module milakar · ${FULL_MINUTES} minute`),
          bestLine("__full__")
        )
      ),
      el("button", {
        class: "btn-ssz btn-primary-ssz btn-block-ssz", type: "button",
        style: { marginTop: "1rem" }, id: "ptFull"
      }, "Poora test shuru karein")
    ));
}

/* ---------------- boot ---------------- */
await initShell({ active: "practice", title: "Practice Test" });

const counts = bankCounts();

/* Test ke baad "sabse achha" wapas likha ja sake, isliye dono jagah ek hi
   jagah se banti hain. */
function paint() {
  render($("#ptFullBox"), fullCard());
  render($("#ptList"), BANK_MODULES.map((m) => moduleCard(m, counts[m] || 0)));
}

paint();

/* Card har baar naye bante hain, isliye click bhi delegation se. */
on($("#ptFullBox"), "click", "#ptFull", startFull);
on($("#ptList"), "click", "[data-mod]", (e, btn) => startModule(btn.dataset.mod));
