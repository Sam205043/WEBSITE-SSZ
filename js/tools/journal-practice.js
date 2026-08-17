/* ==========================================================================
   Soft Skill Zone — Journal Entry Practice (Dr / Cr)
   --------------------------------------------------------------------------
   Ek transaction dikhta hai, student do khaate chunta hai — kaun Debit aur
   kaun Credit — aur turant pata chal jaata hai sahi hai ya nahi.

   DO DROPDOWN, MCQ NAHI

   Chaar option wale sawaal me aadha kaam option hi kar deta hai: do to
   dekhte hi kat jaate hain. Asli register ke saamne baithe student ke paas
   koi option nahi hota — use khaata KHUD nikalna padta hai. Isliye yahan
   dono taraf poori list milti hai aur dono khud chunne padte hain.

   Kaam aasan rakhne ke liye list chhoti rakhi gayi hai: sahi jawab wale do
   khaate, aur usi chapter ke kuchh milte-julte khaate — jo galtiyan sach
   me hoti hain, wahi saamne rehti hain (Purchases vs Stock, Ram Traders vs
   Suresh, Input vs Output GST).

   SAMJHAAV HAR BAAR NIYAM SE

   Galat hone par sirf "galat hai" nahi kehta. Dono khaaton ka swabhav
   bataakar niyam dohraata hai — "Purchases ek kharcha hai, aur kharcha
   hamesha Debit". Yahi ek line har baar dohrane se niyam baith jaata hai.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { url } from "../core/routes.js";
import { store } from "../core/utils.js";
import { ACCOUNTS, CHAPTERS, JOURNAL } from "../config/journal-bank.js";

const OPTIONS_PER_SIDE = 7;      // sahi jawab ke saath 6 aur
const LS_BEST = "ssz.journal.best";

let pool = [], index = 0, score = 0, streak = 0, best = 0, answered = false, chapter = "all";

const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

/* ==========================================================================
   Samjhaav — khaate ke swabhav se banta hai
   ========================================================================== */
/**
 * Ek khaate ke liye samjhaav — DO tukdon me.
 *
 * Khaate ka naam aur baaki vaakya alag-alag lautaye jaate hain, aur screen
 * par bhi alag-alag rakhe jaate hain. Wajah bhasha hai: dictionary poore
 * vaakya se milaati hai, isliye "Cash A/c badha — Asset badhe to Debit"
 * jaisa jodkar bana vaakya kabhi match nahi karta aur English chunne par
 * bhi Hinglish hi dikhta. Naam alag hote hi baaki hissa ek sthir vaakya
 * ban jaata hai, jo dono bhasha me theek se badal jaata hai. (Khaate ke
 * naam waise bhi angrezi me hi hote hain — Cash A/c, Purchases A/c.)
 *
 * @param {string} name  khaate ka naam
 * @param {"dr"|"cr"} side
 * @returns {{name: string|null, tail: string}}
 */
function reason(name, side) {
  const acc = ACCOUNTS[name] || {};
  if (acc.note) return { name: null, tail: acc.note };   // jo saanche me nahi baithte

  const t = acc.type || "asset";
  const dr = side === "dr";

  if (t === "expense") return { name, tail: "ek kharcha hai — kharcha hamesha Debit hota hai." };
  if (t === "income")  return { name, tail: "ek aamdani hai — aamdani hamesha Credit hoti hai." };

  if (t === "asset") {
    if (acc.who === "customer") {
      return { name, tail: dr
        ? "(customer) se paisa aana badha — Asset badhe to Debit."
        : "(customer) se paisa aana ghata — Asset ghate to Credit." };
    }
    return { name, tail: dr
      ? "badha — Asset badhe to Debit."
      : "ghata — Asset ghate to Credit." };
  }

  if (t === "liability") {
    if (acc.who === "supplier") {
      return { name, tail: dr
        ? "(supplier) ko dena ghata — Liability ghate to Debit."
        : "(supplier) ko dena badha — Liability badhe to Credit." };
    }
    return { name, tail: dr
      ? "ghata — Liability ghate to Debit."
      : "badha — Liability badhe to Credit." };
  }

  /* capital */
  return { name: null, tail: dr
    ? "Capital ghata — Capital ghate to Debit."
    : "Capital badha — Capital badhe to Credit." };
}

/** Samjhaav ki ek line screen par. */
function reasonLine(name, side) {
  const r = reason(name, side);
  return el("p", { style: { margin: ".35rem 0 0" } },
    r.name ? el("b", {}, r.name) : null,
    r.name ? " " : null,
    r.tail);
}

/* ==========================================================================
   Options — sahi jawab + usi chapter ke milte-julte khaate
   ========================================================================== */
function optionsFor(q, side) {
  const right = side === "dr" ? q.dr : q.cr;

  /* Pehli pasand: usi chapter ke doosre sawaalon me isi taraf jo khaate
     aate hain. Wahi asli confusion hai, isliye wahi option banne chahiye. */
  const near = new Set();
  JOURNAL.filter((x) => x.ch === q.ch).forEach((x) => {
    near.add(side === "dr" ? x.dr : x.cr);
    near.add(side === "dr" ? x.cr : x.dr);   // ulta chunne wali galti bhi mile
  });
  near.delete(right);

  let list = shuffle([...near]).slice(0, OPTIONS_PER_SIDE - 1);

  /* Chapter chhota ho to baaki jagah poori list se bhar do. */
  if (list.length < OPTIONS_PER_SIDE - 1) {
    const rest = shuffle(Object.keys(ACCOUNTS).filter((a) => a !== right && !list.includes(a)));
    list = list.concat(rest.slice(0, OPTIONS_PER_SIDE - 1 - list.length));
  }
  return shuffle([right, ...list]);
}

/* ==========================================================================
   Screen
   ========================================================================== */
function selectFor(id, label, opts) {
  return el("div", { class: "field" },
    el("label", { class: "field__label", for: id }, label),
    el("select", { class: "select-ssz", id },
      el("option", { value: "" }, "Khaata chunein…"),
      ...opts.map((o) => el("option", { value: o }, o))
    )
  );
}

function paint() {
  const q = pool[index];
  $("#jHead").textContent = `Entry ${index + 1} / ${pool.length}`;

  render($("#jBody"),
    el("div", { class: "quiz-progress" },
      el("span", { class: "review-bar__track", style: { flex: 1 } },
        el("span", { class: "review-bar__fill", style: { width: `${(index / pool.length) * 100}%`, background: "var(--brand)" } })),
      /* Ginti wali line dictionary ke {n} wale tarike se — "Sahi: 3" jaisa
         jodkar bana vaakya kabhi match nahi karta. */
      el("span", {}, streak > 1 ? `Sahi: ${score} · lagatar ${streak}` : `Sahi: ${score}`)
    ),

    el("div", { class: "excel-scenario" },
      el("span", { class: "badge-ssz" }, CHAPTERS.find((c) => c.id === q.ch)?.label || ""),
      el("p", { style: { margin: ".6rem 0 0", fontSize: "var(--fs-md)", fontWeight: "var(--fw-semibold)" } }, q.q)
    ),

    el("div", { class: "je-pair" },
      selectFor("jDr", "Debit (Dr)", optionsFor(q, "dr")),
      selectFor("jCr", "Credit (Cr)", optionsFor(q, "cr"))
    ),

    el("button", { class: "btn-ssz btn-primary-ssz btn-block-ssz", type: "button", id: "jCheck" }, "Jawab check karein"),
    el("div", { id: "jAfter" })
  );
}

function check() {
  if (answered) return;
  const q = pool[index];
  const dr = $("#jDr").value, cr = $("#jCr").value;
  if (!dr || !cr) return;

  answered = true;
  const okDr = dr === q.dr, okCr = cr === q.cr, all = okDr && okCr;

  if (all) { score++; streak++; if (streak > best) { best = streak; store.set(LS_BEST, best); } }
  else streak = 0;

  $("#jDr").disabled = true;
  $("#jCr").disabled = true;
  $("#jCheck").remove();

  const picked = (ok, mine) => ok ? null
    : el("span", { class: "je-mine" }, "aapne chuna:", " ", el("b", {}, mine));

  render($("#jAfter"),
    el("div", { class: "quiz-explain", style: { borderColor: all ? "var(--success)" : "var(--danger)" } },
      el("strong", { style: { display: "block", marginBottom: ".5rem" } },
        all ? "Bilkul sahi!" : "Sahi entry ye hai:"),
      el("div", { class: "je-answer" },
        el("div", { class: `je-line${okDr ? " is-right" : " is-wrong"}` },
          el("b", {}, q.dr), picked(okDr, dr), el("span", {}, "Dr")),
        el("div", { class: `je-line${okCr ? " is-right" : " is-wrong"}` },
          el("span", { class: "je-to" }, "To"), el("b", {}, q.cr), picked(okCr, cr), el("span", {}, "Cr"))
      ),
      el("div", { style: { marginTop: ".75rem" } },
        reasonLine(q.dr, "dr"),
        reasonLine(q.cr, "cr"))
    ),
    el("button", { class: "btn-ssz btn-primary-ssz btn-block-ssz", type: "button", id: "jNext", style: { marginTop: "1.25rem" } },
      index + 1 < pool.length ? "Agli entry" : "Result dekhein")
  );
}

function finish() {
  const pct = Math.round((score / pool.length) * 100);
  const verdict = pct >= 80 ? "Shandaar — Dr/Cr aapko baith gaya hai."
    : pct >= 50 ? "Theek-thaak — niyam dohra kar ek baar aur karein."
    : "Abhi shuruaat hai. Har galat entry ka samjhaav dhyan se padhein.";

  $("#jHead").textContent = "Result";
  render($("#jBody"),
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
      el("div", { class: "result-hero__value", style: { color: "var(--text-primary)" } }, `${score} / ${pool.length}`),
      el("p", { style: { fontSize: "var(--fs-md)", margin: ".5rem 0 .25rem" } }, `${pct}% — ${verdict}`),
      el("p", { style: { color: "var(--text-muted)", margin: "0 0 1.5rem" } }, `Sabse lambi lagatar sahi: ${best}`),
      el("div", { class: "cluster", style: { justifyContent: "center" } },
        el("button", { class: "btn-ssz btn-primary-ssz", type: "button", id: "jAgain" }, "Dobara practice karein"),
        el("a", { class: "btn-ssz btn-secondary-ssz", href: url("courseDetail", { id: "ai-tally-prime" }) }, "Tally course dekhein")
      )
    )
  );
}

function start() {
  const set = chapter === "all" ? JOURNAL : JOURNAL.filter((x) => x.ch === chapter);
  pool = shuffle([...set]);
  index = 0; score = 0; streak = 0; answered = false;
  paint();
}

onReady(() => {
  best = Number(store.get(LS_BEST, 0)) || 0;

  /* Chapter chunne wala switch */
  const pick = $("#jChapter");
  if (pick) {
    CHAPTERS.forEach((c) => pick.appendChild(el("option", { value: c.id }, c.label)));
    pick.addEventListener("change", () => { chapter = pick.value; start(); });
  }

  start();

  on($("#jBody"), "click", "#jCheck", check);
  on($("#jBody"), "click", "#jNext", () => {
    index++;
    answered = false;
    if (index < pool.length) paint();
    else finish();
  });
  on($("#jBody"), "click", "#jAgain", start);
});
