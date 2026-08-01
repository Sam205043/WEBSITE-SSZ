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

   Module ke naam wahi hain jo sawaalon ke bank me hain, isliye dono taraf ek
   hi bhaasha rehti hai.
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatDate, debounce } from "../core/utils.js";
import { formatBytes } from "../core/files.js";
import { url } from "../core/routes.js";
import { initShell } from "./shell.js";
import * as data from "./student-data.js";
import { DEMO_NOTES } from "./demo-data.js";
import { BANK_MODULES } from "../config/question-bank.js";
import { deliver } from "./watermark.js";
import toast from "../core/toast.js";

let notes = [], mode = "preview", term = "", student = null;

function card(n, { big = false } = {}) {
  return el("div", { class: "card-ssz is-hoverable", style: big ? { borderColor: "var(--brand)" } : null },
    el("div", { class: "card-ssz__body" },
      el("div", { style: { display: "flex", gap: "1rem", alignItems: "flex-start" } },
        el("span", {
          class: "stat-tile__icon",
          style: big ? { flexShrink: 0, background: "var(--brand)", color: "#fff" } : { flexShrink: 0 },
          html: icon(big ? "book" : "fileText", { size: 22 })
        }),
        el("span", { style: { minWidth: 0 } },
          el("strong", { style: { display: "block", fontSize: ".95rem", marginBottom: ".2rem" } }, n.title),
          el("span", { style: { fontSize: ".8rem", color: "var(--text-muted)", display: "block", marginBottom: ".6rem" } },
            n.description || ""),
          el("span", { class: "cluster", style: { gap: ".4rem" } },
            el("span", { class: "badge-ssz" }, formatBytes(n.fileSize || 0)),
            el("span", { class: "badge-ssz" }, formatDate(n.createdAt)),
            el("span", { class: "badge-ssz badge-brand" }, `${n.downloads || 0} downloads`)
          )
        )
      ),
      el("button", {
        class: `btn-ssz ${big ? "btn-primary-ssz" : "btn-secondary-ssz btn-sm-ssz"} btn-block-ssz`,
        type: "button", style: { marginTop: "1rem" }, dataset: { dl: n.id }
      }, el("span", { html: icon("download", { size: 16 }) }), " Download")
    ));
}

function empty(q) {
  return el("div", { class: "empty-state", style: { gridColumn: "1/-1" } },
    el("div", { class: "empty-state__icon", html: icon("book", { size: 32 }) }),
    el("h4", {}, q ? "Kuch nahi mila" : "Notes abhi upload nahi hue"),
    el("p", {}, q ? "Doosre shabd try karein." : "Faculty notes daalte hi yahan dikhenge.")
  );
}

/** Ek module ka poora hissa — heading, uske notes, aur test ka link. */
function moduleBlock(mod, list) {
  return el("section", { style: { marginBottom: "2rem" } },
    el("div", {
      style: { display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: ".85rem" }
    },
      el("h3", { style: { margin: 0, fontSize: "1rem" } }, mod),
      /* Padhne ke turant baad test — isliye link seedha usi module ke test
         par jaata hai, list par nahi. */
      el("a", {
        class: "btn-ssz btn-ghost-ssz btn-sm-ssz",
        style: { marginInlineStart: "auto" },
        href: url("studentPractice", { module: mod })
      }, "Is module ka test dein")
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
  student = await data.getStudent(shell.user);
  notes = student ? await data.getNotes(student) : [];
}

paint();

$("#noteSearch").addEventListener("input", debounce((e) => { term = e.target.value.trim(); paint(); }, 200));

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
