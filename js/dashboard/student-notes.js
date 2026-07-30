/* ==========================================================================
   Soft Skill Zone — Student: Notes download
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatDate, debounce } from "../core/utils.js";
import { formatBytes } from "../core/files.js";
import { initShell } from "./shell.js";
import * as data from "./student-data.js";
import { DEMO_NOTES } from "./demo-data.js";
import { deliver } from "./watermark.js";
import toast from "../core/toast.js";

let notes = [], mode = "preview", term = "", student = null;

function card(n) {
  return el("div", { class: "card-ssz is-hoverable" }, el("div", { class: "card-ssz__body" },
    el("div", { style: { display: "flex", gap: "1rem", alignItems: "flex-start" } },
      el("span", { class: "stat-tile__icon", style: { flexShrink: 0 }, html: icon("fileText", { size: 22 }) }),
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
    el("button", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz btn-block-ssz", type: "button", style: { marginTop: "1rem" }, dataset: { dl: n.id } },
      el("span", { html: icon("download", { size: 16 }) }), "Download")
  ));
}

function paint() {
  const q = term.toLowerCase();
  const list = q ? notes.filter((n) => `${n.title} ${n.description || ""}`.toLowerCase().includes(q)) : notes;
  if (!list.length) {
    render($("#noteList"), el("div", { class: "empty-state", style: { gridColumn: "1/-1" } },
      el("div", { class: "empty-state__icon", html: icon("book", { size: 32 }) }),
      el("h4", {}, q ? "Kuch nahi mila" : "Notes abhi upload nahi hue"),
      el("p", {}, q ? "Doosre shabd try karein." : "Faculty notes daalte hi yahan dikhenge.")
    ));
    return;
  }
  render($("#noteList"), list.map(card));
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
