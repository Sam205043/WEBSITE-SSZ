/* ==========================================================================
   Soft Skill Zone — Student: Audiobooks
   --------------------------------------------------------------------------
   Book padhne ka waqt sabke paas nahi hota. Dukaan par baitha ladka, khet se
   lautta bachcha, bus me safar karti ladki — sab padh nahi sakte, par sun
   sakte hain. Isliye har book ka audio roop yahan alag rakha gaya hai.

   Audiobook wahi `notes` collection me rehte hain jahan PDF rehte hain, bas
   unpar `kind: "audio"` likha hota hai. Alag collection nahi banaya, aur ye
   soch-samajh kar hai: `notes` par rules, index aur course wali rok pehle se
   chal rahi hai. Nayi collection ka matlab hota teen jagah nayi ijaazat
   likhna, aur teenon me se ek bhi chhoot jaati to page chup-chaap khaali
   dikhta — bina koi galti bataye.

   Pehle ye cards Notes page ki usi list me PDF ke beech me bikhre rehte the.
   Dono padhai ka saamaan hain, par student jab "sunna" chahta hai to use
   sunne wali cheezein ek jagah chahiye — beech-beech me PDF nahi.

   HIFAAZAT KI EK SAAF BAAT

   Player Drive ka `/preview` hai, iframe me. Usme Drive ka apna Download
   button hota hi nahi, aur file ka link student ko dikhta bhi nahi. Phir
   bhi — ye download ko MUSHKIL karta hai, NAMUMKIN nahi.

   Video par hum student ka naam ghoomta hua upar chipka dete hain, isliye
   leak karne wale ki pehchaan usi video par likhi reh jaati hai. Awaaz par
   aisa koi nishaan nahi lagaya ja sakta. Isliye audiobook ki hifaazat
   recording se kamzor hai — ye jaan kar hi ise rakha gaya hai.
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatDate, debounce, driveFileId } from "../core/utils.js";
import { open as openModal } from "../core/modal.js";
import { initShell } from "./shell.js";
import * as data from "./student-data.js";
import { DEMO_NOTES } from "./demo-data.js";
import { BANK_MODULES } from "../config/question-bank.js";
import toast from "../core/toast.js";

let books = [], mode = "preview", term = "", student = null;

/* --------------------------------------------------------------------------
   Ek audiobook ka card
   -------------------------------------------------------------------------- */
function card(n, { big = false } = {}) {
  return el("div", { class: "card-ssz is-hoverable", style: big ? { borderColor: "var(--brand)" } : null },
    el("div", { class: "card-ssz__body" },
      el("div", { style: { display: "flex", gap: "1rem", alignItems: "flex-start" } },
        el("span", {
          class: "stat-tile__icon",
          style: big
            ? { flexShrink: 0, background: "var(--brand)", color: "#fff" }
            : { flexShrink: 0 },
          html: icon("headphones", { size: 22 })
        }),
        el("span", { style: { minWidth: 0 } },
          el("strong", { style: { display: "block", fontSize: ".95rem", marginBottom: ".2rem" } }, n.title),
          el("span", { style: { fontSize: ".8rem", color: "var(--text-muted)", display: "block", marginBottom: ".6rem" } },
            n.description || ""),
          el("span", { class: "cluster", style: { gap: ".4rem" } },
            n.durationMin ? el("span", { class: "badge-ssz badge-accent" }, `${n.durationMin} min`) : null,
            el("span", { class: "badge-ssz" }, formatDate(n.createdAt))
          )
        )
      ),
      el("button", {
        class: `btn-ssz ${big ? "btn-primary-ssz" : "btn-secondary-ssz btn-sm-ssz"} btn-block-ssz`,
        type: "button", style: { marginTop: "1rem" },
        dataset: { listen: n.id }
      },
        el("span", { html: icon("play", { size: 16 }) }),
        " Sunein")
    ));
}

/* --------------------------------------------------------------------------
   Player — upar wali tippani dekhein
   -------------------------------------------------------------------------- */
function listen(n) {
  const id = n.audioFileId || driveFileId(n.audioURL);
  if (!id) return toast.error("Is audiobook ka link theek nahi hai — institute ko bata dein.");

  const body = el("div", {});
  body.appendChild(el("p", { style: { fontSize: ".84rem", color: "var(--text-muted)", margin: "0 0 .9rem" } },
    n.description || `${n.module || "Poori book"}${n.durationMin ? ` · ${n.durationMin} min` : ""}`));

  /* Drive ka audio preview chhoti height me aata hai; 180px me player aur
     file ka naam dono aa jaate hain. */
  body.appendChild(el("iframe", {
    src: `https://drive.google.com/file/d/${id}/preview`,
    style: { width: "100%", height: "180px", border: "0", borderRadius: "12px", background: "#000" },
    allow: "autoplay",
    referrerpolicy: "no-referrer",
    title: n.title || "Audiobook"
  }));

  body.appendChild(el("p", { style: { fontSize: ".76rem", color: "var(--text-muted)", margin: ".9rem 0 0" } },
    "Ye audiobook sirf yahin sunne ke liye hai — kisi aur ko bhejna ya kahin aur chadhana mana hai."));

  openModal({ title: n.title || "Audiobook", size: "md", body });
}

function empty(q) {
  return el("div", { class: "empty-state", style: { gridColumn: "1/-1" } },
    el("div", { class: "empty-state__icon", html: icon("headphones", { size: 32 }) }),
    el("h4", {}, q ? "Kuch nahi mila" : "Audiobook abhi upload nahi hue"),
    el("p", {}, q
      ? "Doosre shabd try karein."
      : "Book ka audio roop taiyaar hote hi yahan dikhne lagega. Tab tak Notes se book padh sakte hain.")
  );
}

/** Ek module ka poora hissa — heading aur uske audiobooks. */
function moduleBlock(mod, list) {
  return el("section", { style: { marginBottom: "2rem" } },
    el("h3", { style: { margin: "0 0 .85rem", fontSize: "1rem" } }, mod),
    el("div", { class: "auto-grid" }, ...list.map((n) => card(n)))
  );
}

function paint() {
  const q = term.toLowerCase();
  const list = q
    ? books.filter((n) => `${n.title} ${n.description || ""} ${n.module || ""}`.toLowerCase().includes(q))
    : books;

  const box = $("#abList");
  if (!list.length) return render(box, empty(q));

  /* Jinka module nahi likha — wahi "poori book" wale hain, aur wahi upar
     bade card me aate hain. Bilkul waise hi jaise Notes page par. */
  const whole = list.filter((n) => !n.module);
  const byMod = {};
  list.filter((n) => n.module).forEach((n) => { (byMod[n.module] ||= []).push(n); });

  const parts = [];

  if (whole.length) {
    parts.push(el("section", { style: { marginBottom: "2.25rem" } },
      el("h3", { style: { margin: "0 0 .85rem", fontSize: "1rem" } }, "Poori book"),
      el("div", { class: "auto-grid" }, ...whole.map((n) => card(n, { big: true })))
    ));
  }

  /* Module wahi kram me jo bank me hai — aur agar koi audiobook kisi anjaane
     module ka ho to wo bhi chhoote nahi. */
  const known = BANK_MODULES.filter((m) => byMod[m]);
  const extra = Object.keys(byMod).filter((m) => !BANK_MODULES.includes(m));
  const mods = [...known, ...extra];

  if (mods.length) {
    parts.push(el("h2", { style: { fontSize: "1.05rem", margin: "0 0 1rem" } }, "Module wise"));
    mods.forEach((m) => parts.push(moduleBlock(m, byMod[m])));
  }

  render(box, ...parts);
}

/* ---------------- boot ---------------- */
const shell = await initShell({ active: "audiobooks", title: "Audiobooks" });
mode = shell.mode;

/* Sirf `kind: "audio"` wale. Baaki (PDF) Notes page ka kaam hai. */
const onlyAudio = (list) => list.filter((n) => n.kind === "audio");

if (mode === "preview") {
  books = onlyAudio(DEMO_NOTES);
} else {
  /* Ek bhi query mana ho jaye (rule badla ho, index thanda ho, ya account
     abhi kisi student record se juda hi na ho) to page KHAALI nahi chhodna —
     khaali page se student ko lagta hai ki kuchh hai hi nahi, jabki asal me
     galti humari taraf hai. Isliye har naakami ki apni khabar jaati hai. */
  student = await data.getStudent(shell.user).catch((err) => {
    console.error("[student] apna record nahi khula:", err);
    toast.warning("Aapka record abhi nahi khul paya. Thodi der baad dobara kholein — baar-baar ho to institute ko bata dein.", { duration: 9000 });
    return null;
  });
  books = student
    ? onlyAudio(await data.getNotes(student).catch((err) => {
        console.error("[audiobooks] load nahi hue:", err);
        toast.warning("Audiobook ki list abhi nahi khul payi. Agar ye baar-baar ho to institute ko bata dein — ho sakta hai aapka login abhi kisi course se juda na ho.", { duration: 9000 });
        return [];
      }))
    : [];
}

paint();

$("#abSearch").addEventListener("input", debounce((e) => { term = e.target.value.trim(); paint(); }, 200));

on($("#abList"), "click", "[data-listen]", (e, btn) => {
  const n = books.find((x) => x.id === btn.dataset.listen);
  if (!n) return;
  if (mode === "preview") {
    toast.info("Preview mode: asli audiobook Firebase connect hone ke baad chalega.");
    return;
  }
  listen(n);
});
