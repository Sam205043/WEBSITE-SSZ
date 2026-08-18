/* ==========================================================================
   Soft Skill Zone — Shortcut Trainer
   --------------------------------------------------------------------------
   Flashcard: kaam dikhta hai → student sochta hai → palat kar keys dekhta
   hai → khud batata hai "aata tha" ya "nahi aata tha".

   "Nahi aata tha" wale card round ke aakhir me DOBARA aate hain. Yahi is
   tarike ki asli taakat hai — jo yaad nahi hua uspar hi zyada baar nazar
   padti hai.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { store } from "../core/utils.js";
import { SHORTCUTS, SHORTCUT_GROUPS, shortcutsFor, shortcutCounts } from "../config/shortcut-bank.js";
import { loadPack } from "../core/i18n.js";

const BEST_KEY = "ssz.shortcut.best";

let deck = [], again = [], current = null, flipped = false;
let done = 0, knew = 0, total = 0, group = "all";

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- Setup ---------------- */
function paintSetup() {
  const counts = shortcutCounts();
  $("#stHead").textContent = "Practice shuru karein";

  render($("#stBody"),
    el("p", { style: { fontSize: ".9rem", color: "var(--text-muted)", marginBottom: "1.25rem" } },
      `${SHORTCUTS.length} shortcuts. Kaam dikhega, aapko keys yaad karni hain — fir card palat kar milaiye.`),

    el("div", { class: "field" },
      el("label", { class: "field__label", for: "stGroup" }, "Kaunsa hissa"),
      el("select", { class: "select-ssz", id: "stGroup" },
        el("option", { value: "all" }, `Sab milakar (${counts.all})`),
        ...SHORTCUT_GROUPS.map((g) => el("option", { value: g }, `${g} (${counts[g]})`))
      )
    ),

    el("button", { class: "btn-ssz btn-primary-ssz btn-block-ssz btn-lg-ssz", type: "button", id: "stStart", style: { marginTop: ".5rem" } },
      "Shuru karein"),

    (() => {
      const best = store.get(BEST_KEY);
      return best ? el("p", { style: { textAlign: "center", fontSize: ".82rem", color: "var(--text-muted)", marginTop: "1rem" } }, `Aapka best: ${best}%`) : null;
    })()
  );

  $("#stGroup").value = group;
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
  $("#stHead").textContent = `${done} / ${total} — ${knew} yaad`;

  render($("#stBody"),
    el("div", { class: "quiz-progress" },
      el("span", { class: "review-bar__track", style: { flex: 1 } },
        el("span", { class: "review-bar__fill", style: { width: `${total ? (done / total) * 100 : 0}%`, background: "var(--brand)" } })),
      el("span", {}, again.length ? `${again.length} dobara` : "")
    ),

    el("div", { class: `flash-card${flipped ? " is-flipped" : ""}`, id: "stCard", role: "button", tabindex: "0" },
      el("span", { class: "flash-card__tag" }, current[0]),
      el("p", { class: "flash-card__q" }, current[1]),
      flipped
        ? el("p", { class: "flash-card__a" }, current[2])
        : el("p", { class: "flash-card__hint" }, "Soch liya? Card par tap karke jawab dekhein")
    ),

    flipped
      ? el("div", { class: "flash-actions" },
          el("button", { class: "btn-ssz btn-danger-ssz", type: "button", id: "stNo" },
            el("span", { html: icon("xCircle", { size: 16 }) }), " Nahi aata tha"),
          el("button", { class: "btn-ssz btn-success-ssz", type: "button", id: "stYes" },
            el("span", { html: icon("checkCircle", { size: 16 }) }), " Aata tha")
        )
      : el("button", { class: "btn-ssz btn-primary-ssz btn-block-ssz", type: "button", id: "stFlip", style: { marginTop: "1.25rem" } },
          "Jawab dikhayein")
  );
}

function mark(knew_it) {
  /* Jo card dobara aaya hai use dobara nahi ginte — warna header
     "130 / 110" jaisa ho jaata tha. */
  if (!again.includes(current)) done++;
  if (knew_it) knew++;
  else again.push(current);   // jo nahi aaya, wo round ke aakhir me phir aayega
  nextCard();
}

function finish() {
  /* Round khatam — card ka nishaan mita dena zaroori hai. Warna result
     screen par Y/N dabate rehne se score badhta rehta tha (110 me se 133),
     aur "dobara" ke baad bhi purana card zinda rehta tha. */
  current = null;
  flipped = false;

  const pct = total ? Math.round((knew / total) * 100) : 0;
  const best = Number(store.get(BEST_KEY) || 0);
  const isBest = pct > best;
  if (isBest) store.set(BEST_KEY, String(pct));

  $("#stHead").textContent = "Ho gaya";
  render($("#stBody"),
    el("div", { style: { textAlign: "center" } },
      el("div", {
        class: "empty-state__icon",
        style: {
          margin: "0 auto 1.25rem",
          background: pct >= 70 ? "var(--success-soft)" : "var(--warning-soft)",
          color: pct >= 70 ? "var(--success)" : "var(--warning)"
        },
        html: icon(pct >= 70 ? "award" : "keyboard", { size: 32 })
      }),
      el("div", { class: "result-hero__value", style: { color: "var(--text-primary)" } }, `${knew} / ${total}`),
      el("p", { style: { fontSize: "var(--fs-md)", margin: ".5rem 0 .35rem" } },
        `${pct}% pehli baar me yaad the`),
      isBest ? el("p", { style: { color: "var(--success)", fontWeight: "600", fontSize: ".88rem" } }, "Naya best! 🎉") : null,
      el("p", { style: { fontSize: ".85rem", color: "var(--text-muted)", marginTop: ".75rem" } },
        "Roz 10 minute dijiye — do hafte me haath apne aap chalne lagega."),
      el("div", { class: "cluster", style: { justifyContent: "center", marginTop: "1.5rem" } },
        el("button", { class: "btn-ssz btn-primary-ssz", type: "button", id: "stAgain" }, "Dobara")
      )
    )
  );
}

/* ---------------- Boot ---------------- */
onReady(() => {

  /* In tools ka saara padhne wala text ek hi anuvaad-file me hai
     (lang/en.tools.json) aur sirf zaroorat par utarta hai. Await nahi kar
     rahe — pack aate hi i18n poore page ka text khud badal deta hai.
     Hinglish par ye line kuch karti hi nahi. */
  loadPack("tools");
  paintSetup();

  on($("#stBody"), "click", "#stStart", () => {
    group = $("#stGroup").value;
    deck = shuffle(shortcutsFor(group));
    total = deck.length;
    again = []; done = 0; knew = 0;
    nextCard();
  });

  on($("#stBody"), "click", "#stFlip", () => { flipped = true; paintCard(); });
  on($("#stBody"), "click", "#stCard", () => { if (!flipped) { flipped = true; paintCard(); } });
  on($("#stBody"), "click", "#stYes", () => mark(true));
  on($("#stBody"), "click", "#stNo", () => mark(false));
  on($("#stBody"), "click", "#stAgain", paintSetup);

  /* Keyboard se chalana — shortcut sikhane wale tool me mouse uthana ajeeb
     lagta hai. Space = palto, Y = aata tha, N = nahi aata tha. */
  document.addEventListener("keydown", (e) => {
    if (!current || e.target.matches("input,select,textarea")) return;
    if (e.code === "Space") { e.preventDefault(); if (!flipped) { flipped = true; paintCard(); } }
    else if (flipped && (e.key === "y" || e.key === "Y")) mark(true);
    else if (flipped && (e.key === "n" || e.key === "N")) mark(false);
  });
});
