/* ==========================================================================
   Soft Skill Zone — Interview & Viva Q&A Practice
   --------------------------------------------------------------------------
   Sawaal aata hai → student BOL kar jawab deta hai (aaine ke saamne sabse
   achha) → card palat kar milata hai.

   Bol kar jawab dena zaroori hai. Mann hi mann sochne me har jawab "aata
   tha" lagta hai; asli imtihaan tab hota hai jab shabd zubaan par aayein.
   Jo sawaal atak jayein wo round ke aakhir me dobara aate hain.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { store } from "../core/utils.js";
import { INTERVIEW_QA, QA_TOPICS } from "../config/interview-bank.js";
import { loadPack } from "../core/i18n.js";

const BEST_KEY = "ssz.interview.best";
const ROUND = 20;   // ek baithak me itne sawaal — 480 ek saath dena bekaar hai

let deck = [], again = [], current = null, flipped = false;
let done = 0, easy = 0, total = 0, topic = "all";

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const forTopic = (t) => (t === "all" ? INTERVIEW_QA.slice() : INTERVIEW_QA.filter((x) => x.t === t));

function counts() {
  const o = { all: INTERVIEW_QA.length };
  QA_TOPICS.forEach((t) => { o[t] = INTERVIEW_QA.filter((x) => x.t === t).length; });
  return o;
}

/* ---------------- Setup ---------------- */
function paintSetup() {
  const c = counts();
  $("#iqHead").textContent = "Practice shuru karein";

  render($("#iqBody"),
    el("p", { style: { fontSize: ".9rem", color: "var(--text-muted)", marginBottom: "1.25rem" } },
      `${INTERVIEW_QA.length} sawaal — computer, Tally, GST aur HR. Ek baithak me ${ROUND} sawaal aayenge.`),

    el("div", { class: "field" },
      el("label", { class: "field__label", for: "iqTopic" }, "Topic"),
      el("select", { class: "select-ssz", id: "iqTopic" },
        el("option", { value: "all" }, `Sab milakar (${c.all})`),
        ...QA_TOPICS.map((t) => el("option", { value: t }, `${t} (${c[t]})`))
      )
    ),

    el("button", { class: "btn-ssz btn-primary-ssz btn-block-ssz btn-lg-ssz", type: "button", id: "iqStart", style: { marginTop: ".5rem" } },
      "Shuru karein"),

    (() => {
      const best = store.get(BEST_KEY);
      return best ? el("p", { style: { textAlign: "center", fontSize: ".82rem", color: "var(--text-muted)", marginTop: "1rem" } }, `Aapka best: ${best}%`) : null;
    })(),

    el("div", { class: "tool-note", style: { marginTop: "1.5rem" } },
      el("span", { html: icon("info", { size: 17 }) }),
      el("span", {}, "Jawab mann me mat sochiye — BOL kar dijiye. Interview me zubaan chalni chahiye, dimaag to waise bhi chalta hai."))
  );

  $("#iqTopic").value = topic;
}

/* ---------------- Card ---------------- */
function nextCard() {
  if (!deck.length && again.length) {
    deck = shuffle(again);
    again = [];
  }
  if (!deck.length) return finish();

  current = deck.shift();
  flipped = false;
  paintCard();
}

function paintCard() {
  $("#iqHead").textContent = `${done} / ${total} — ${easy} aaye`;

  render($("#iqBody"),
    el("div", { class: "quiz-progress" },
      el("span", { class: "review-bar__track", style: { flex: 1 } },
        el("span", { class: "review-bar__fill", style: { width: `${total ? (done / total) * 100 : 0}%`, background: "var(--brand)" } })),
      el("span", {}, again.length ? `${again.length} dobara` : "")
    ),

    el("div", { class: `flash-card flash-card--qa${flipped ? " is-flipped" : ""}`, id: "iqCard", role: "button", tabindex: "0" },
      el("span", { class: "flash-card__tag" }, current.t),
      el("p", { class: "flash-card__q" }, current.q),
      flipped
        ? el("p", { class: "flash-card__a flash-card__a--long" }, current.a)
        : el("p", { class: "flash-card__hint" }, "Bol kar jawab dijiye, fir card par tap karein")
    ),

    flipped
      ? el("div", { class: "flash-actions" },
          el("button", { class: "btn-ssz btn-danger-ssz", type: "button", id: "iqHard" },
            el("span", { html: icon("xCircle", { size: 16 }) }), " Atak gaya"),
          el("button", { class: "btn-ssz btn-success-ssz", type: "button", id: "iqEasy" },
            el("span", { html: icon("checkCircle", { size: 16 }) }), " Aa gaya")
        )
      : el("button", { class: "btn-ssz btn-primary-ssz btn-block-ssz", type: "button", id: "iqFlip", style: { marginTop: "1.25rem" } },
          "Jawab dekhein")
  );
}

function mark(wasEasy) {
  /* Dobara aaye card ko dobara nahi ginte — warna header "130 / 110"
     jaisa ho jaata tha. */
  if (!again.includes(current)) done++;
  if (wasEasy) easy++;
  else again.push(current);
  nextCard();
}

/* ---------------- Result ---------------- */
function finish() {
  /* Round khatam — card ka nishaan mita dena zaroori hai. Warna result
     screen par Y/N dabate rehne se score badhta rehta tha (110 me se 133),
     aur "dobara" ke baad bhi purana card zinda rehta tha. */
  current = null;
  flipped = false;

  const pct = total ? Math.round((easy / total) * 100) : 0;
  const best = Number(store.get(BEST_KEY) || 0);
  const isBest = pct > best;
  if (isBest) store.set(BEST_KEY, String(pct));

  const verdict = pct >= 80 ? "Aap interview ke liye taiyaar lag rahe hain."
    : pct >= 50 ? "Achhi shuruaat — jo atke, unhe zor se bol kar dobara kijiye."
    : "Ghabraiye mat. Roz 15 minute dijiye, ek hafte me farq dikhega.";

  $("#iqHead").textContent = "Round poora";
  render($("#iqBody"),
    el("div", { style: { textAlign: "center" } },
      el("div", {
        class: "empty-state__icon",
        style: {
          margin: "0 auto 1.25rem",
          background: pct >= 60 ? "var(--success-soft)" : "var(--warning-soft)",
          color: pct >= 60 ? "var(--success)" : "var(--warning)"
        },
        html: icon(pct >= 60 ? "award" : "users", { size: 32 })
      }),
      el("div", { class: "result-hero__value", style: { color: "var(--text-primary)" } }, `${easy} / ${total}`),
      /* Ginti aur vaakya alag node me — jodkar bana vaakya dictionary se
         match nahi karta aur English chunne par bhi Hinglish reh jata hai. */
      el("p", { style: { fontSize: "var(--fs-md)", margin: ".5rem 0 .35rem" } }, `${pct}%`, " — ", verdict),
      isBest ? el("p", { style: { color: "var(--success)", fontWeight: "600", fontSize: ".88rem" } }, "Naya best! 🎉") : null,
      el("div", { class: "cluster", style: { justifyContent: "center", marginTop: "1.5rem" } },
        el("button", { class: "btn-ssz btn-primary-ssz", type: "button", id: "iqAgain" }, "Naya round")
      )
    )
  );
}

/* ---------------- Boot ---------------- */
onReady(() => {
  paintSetup();

  /* 480 sawaal aur unke jawab ka anuvaad alag file me rehta hai
     (lang/en.interview.json) aur sirf yahin mangwaya jaata hai — homepage
     kholne wale ke phone par ye 130 KB bhejna bekaar hai.

     Await nahi kar rahe: pack aate hi i18n poore page ka text khud badal
     deta hai. Hinglish par ye line kuch karti hi nahi. */
  loadPack("interview");

  on($("#iqBody"), "click", "#iqStart", () => {
    topic = $("#iqTopic").value;
    deck = shuffle(forTopic(topic)).slice(0, ROUND);
    total = deck.length;
    again = []; done = 0; easy = 0;
    nextCard();
  });

  on($("#iqBody"), "click", "#iqFlip", () => { flipped = true; paintCard(); });
  on($("#iqBody"), "click", "#iqCard", () => { if (!flipped) { flipped = true; paintCard(); } });
  on($("#iqBody"), "click", "#iqEasy", () => mark(true));
  on($("#iqBody"), "click", "#iqHard", () => mark(false));
  on($("#iqBody"), "click", "#iqAgain", paintSetup);

  document.addEventListener("keydown", (e) => {
    if (!current || e.target.matches("input,select,textarea")) return;
    if (e.code === "Space") { e.preventDefault(); if (!flipped) { flipped = true; paintCard(); } }
    else if (flipped && (e.key === "y" || e.key === "Y")) mark(true);
    else if (flipped && (e.key === "n" || e.key === "N")) mark(false);
  });
});
