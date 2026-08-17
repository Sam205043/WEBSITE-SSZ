/* ==========================================================================
   Soft Skill Zone — Student: Notes download
   --------------------------------------------------------------------------
   Pehle saare notes ek hi lambi list me pade the. Poori book kahan hai aur
   aaj ka module kahan — dono ek jaise dikhte the, aur student ko dhoondhna
   padta tha.

   Ab do hisse hain:
     1. Poori book upar, alag se — jise ek hi file me sab chahiye.
     2. Module wise — har module ka apna hissa, aur uske saath usi module ka
        practice test ka link. Padha, aur wahin se test de diya.

   Module ka naam wahi hota hai jo admin ne note par likha — ya to us course
   ka apna module, ya sawaalon ke bank wala naam. Test ka link sirf doosri
   soorat me dikhta hai, kyunki test bank se hi banta hai.
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatDate, debounce, driveFileId } from "../core/utils.js";
import { formatBytes } from "../core/files.js";
import { url } from "../core/routes.js";
import { open as openModal } from "../core/modal.js";
import { initShell } from "./shell.js";
import * as data from "./student-data.js";
import { DEMO_NOTES } from "./demo-data.js";
import { BANK_MODULES, bankCounts } from "../config/question-bank.js";
import { deliver } from "./watermark.js";
import toast from "../core/toast.js";

let notes = [], mode = "preview", term = "", student = null;

function card(n, { big = false } = {}) {
  const isAudio = n.kind === "audio";

  /* Audiobook aur PDF ek hi list me rehte hain — dono padhai ka saamaan hain
     — par pehli nazar me alag dikhne chahiye: headphone ka icon, apna badge,
     aur "Download" ki jagah "Sunein". */
  const badges = isAudio
    ? [
        el("span", { class: "badge-ssz badge-accent" }, "Audiobook"),
        n.durationMin ? el("span", { class: "badge-ssz" }, `${n.durationMin} min`) : null,
        el("span", { class: "badge-ssz" }, formatDate(n.createdAt))
      ]
    : [
        el("span", { class: "badge-ssz" }, formatBytes(n.fileSize || 0)),
        el("span", { class: "badge-ssz" }, formatDate(n.createdAt)),
        el("span", { class: "badge-ssz badge-brand" }, `${n.downloads || 0} downloads`)
      ];

  return el("div", { class: "card-ssz is-hoverable", style: big ? { borderColor: "var(--brand)" } : null },
    el("div", { class: "card-ssz__body" },
      el("div", { style: { display: "flex", gap: "1rem", alignItems: "flex-start" } },
        el("span", {
          class: "stat-tile__icon",
          style: big ? { flexShrink: 0, background: "var(--brand)", color: "#fff" } : { flexShrink: 0 },
          html: icon(isAudio ? "headphones" : big ? "book" : "fileText", { size: 22 })
        }),
        el("span", { style: { minWidth: 0 } },
          el("strong", { style: { display: "block", fontSize: ".95rem", marginBottom: ".2rem" } }, n.title),
          el("span", { style: { fontSize: ".8rem", color: "var(--text-muted)", display: "block", marginBottom: ".6rem" } },
            n.description || ""),
          el("span", { class: "cluster", style: { gap: ".4rem" } }, ...badges.filter(Boolean))
        )
      ),
      el("button", {
        class: `btn-ssz ${big ? "btn-primary-ssz" : "btn-secondary-ssz btn-sm-ssz"} btn-block-ssz`,
        type: "button", style: { marginTop: "1rem" },
        dataset: isAudio ? { listen: n.id } : { dl: n.id }
      },
        el("span", { html: icon(isAudio ? "play" : "download", { size: 16 }) }),
        isAudio ? " Sunein" : " Download")
    ));
}

/* --------------------------------------------------------------------------
   Audiobook ka player

   Wahi tareeka jo class recording me lagaya tha: Drive ka `/preview` roop
   iframe me chalta hai. Usme Drive ka Download button hota hi nahi, aur link
   student ko dikhta bhi nahi.

   EK BAAT SAAF RAKHNI CHAHIYE — aur ye video se zyada sach hai:

   Ye download "mushkil" karta hai, "namumkin" nahi. Video par hum watermark
   laga sakte the — student ka apna naam upar ghoomta rehta tha, jisse leak
   karne wale ki apni pehchaan us video par likhi rehti thi. Awaaz par aisa
   koi nishaan nahi lagaya ja sakta. Isliye audiobook ki hifaazat recording se
   kamzor hai, aur ye jaan kar hi ise rakhna chahiye.
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
    el("div", { class: "empty-state__icon", html: icon("book", { size: 32 }) }),
    el("h4", {}, q ? "Kuch nahi mila" : "Notes abhi upload nahi hue"),
    el("p", {}, q ? "Doosre shabd try karein." : "Faculty notes daalte hi yahan dikhenge.")
  );
}

/* Kis module ke sawaal sach me maujood hain. Ek baar gin liya, har paint
   par dobara 480 sawaal ginne ki zaroorat nahi. */
const BANK_COUNTS = bankCounts();

/** Ek module ka poora hissa — heading, uske notes, aur test ka link. */
function moduleBlock(mod, list) {
  /* Test ka link SIRF tab, jab us module ke sawaal bank me hon.
     Sawaal-bank ADCA/DCA wale computer module ka hai. Naye course (jaise AI
     Automation Pro) ke module ka koi test abhi hai hi nahi — wahan link
     dikhana student ko khaali page par bhej deta, aur khaali page se bura
     lagta hai ki kuchh toota hua hai. */
  const hasTest = (BANK_COUNTS[mod] || 0) > 0;

  return el("section", { style: { marginBottom: "2rem" } },
    el("div", {
      style: { display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: ".85rem" }
    },
      el("h3", { style: { margin: 0, fontSize: "1rem" } }, mod),
      /* Padhne ke turant baad test — isliye link seedha usi module ke test
         par jaata hai, list par nahi. */
      hasTest ? el("a", {
        class: "btn-ssz btn-ghost-ssz btn-sm-ssz",
        style: { marginInlineStart: "auto" },
        href: url("studentPractice", { module: mod })
      }, "Is module ka test dein") : null
    ),
    el("div", { class: "auto-grid" }, ...list.map((n) => card(n)))
  );
}

function paint() {
  const q = term.toLowerCase();
  const list = q
    ? notes.filter((n) => `${n.title} ${n.description || ""} ${n.module || ""}`.toLowerCase().includes(q))
    : notes;

  const box = $("#noteList");
  if (!list.length) return render(box, empty(q));

  /* Jinka module nahi likha — wahi "poori book" wale hain. */
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

  /* Module wahi kram me jo bank me hai — aur agar koi note kisi anjaane
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
const shell = await initShell({ active: "notes", title: "Notes" });
mode = shell.mode;

if (mode === "preview") {
  notes = [...DEMO_NOTES];
} else {
/* Ek bhi query mana ho jaye (rule badla ho, index thanda ho, ya account
   abhi kisi student record se juda hi na ho) to page KHAALI nahi chhodna.
   Pehle yahan `.catch` tha hi nahi, aur ye file top-level `await` par chalti
   hai — matlab reject hote hi poora module wahin ruk jaata tha aur student
   ko bilkul khaali page milta tha, bina ye jaane ki hua kya. Ab section
   khaali dikhta hai aur ek saaf sandesh chala jaata hai. */
  /* PEHLE YAHAN CHUPCHAAP `null` LAUT AATA THA, AUR WAHI SABSE BURA JAWAB
     THA. Student ka record na khul paaye to neeche wali list bhi nahi
     chalti — aur uske saath us list wala sandesh bhi nahi chalta. Natija:
     page bilkul saada khaali dikhta ("Abhi tak koi class nahi hui"), jaise
     sach me kuchh hai hi nahi. Jiske paas poora record hai use ye jhooth
     dikhta tha, bina kisi galti ke.

     Ab is galti ki apni khabar jaati hai. */
  student = await data.getStudent(shell.user).catch((err) => {
    console.error("[student] apna record nahi khula:", err);
    toast.warning("Aapka record abhi nahi khul paya. Thodi der baad dobara kholein — baar-baar ho to institute ko bata dein.", { duration: 9000 });
    return null;
  });
  notes = student
    ? await data.getNotes(student).catch((err) => {
        console.error("[notes] load nahi hue:", err);
    toast.warning("Study material ki list abhi nahi khul payi. Agar ye baar-baar ho to institute ko bata dein — ho sakta hai aapka login abhi kisi batch se juda na ho.", { duration: 9000 });
        return [];
      })
    : [];
}

paint();

$("#noteSearch").addEventListener("input", debounce((e) => { term = e.target.value.trim(); paint(); }, 200));

on($("#noteList"), "click", "[data-listen]", (e, btn) => {
  const n = notes.find((x) => x.id === btn.dataset.listen);
  if (n) listen(n);
});

on($("#noteList"), "click", "[data-dl]", async (e, btn) => {
  const n = notes.find((x) => x.id === btn.dataset.dl);
  if (!n) return;
  const hasFile = n.filePath || (n.fileURL && n.fileURL !== "#");
  if (mode === "preview" || !hasFile) {
    toast.info("Preview mode: asli file Firebase connect hone ke baad download hogi.");
    return;
  }

  /* The link is asked for here rather than kept inside the note, so Storage
     rules check the reader before one is handed out. Older notes still carry
     a fileURL — those keep working. */
  let url = n.fileURL;
  if (n.filePath) {
    btn.disabled = true;
    try {
      const { urlForPath } = await import("../../firebase/storage-service.js");
      url = await urlForPath(n.filePath);
    } catch (err) {
      toast.error(err.message || "File nahi khul payi — dobara login karke try karein.");
      return;
    } finally {
      btn.disabled = false;
    }
  }

  data.bumpNoteDownloads(n.id);
  await deliver(btn, n, url, student, shell.user);
});
