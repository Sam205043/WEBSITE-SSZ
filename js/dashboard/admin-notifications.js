/* ==========================================================================
   Soft Skill Zone — Admin: Notification broadcast
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { timeAgo } from "../core/utils.js";
import { confirm as confirmModal } from "../core/modal.js";
import { createValidator, rules } from "../core/validators.js";
import { withButton } from "../core/loader.js";
import { initAdminShell } from "./admin-shell.js";
import { DEMO_BATCHES } from "./admin-demo.js";
import { DEMO_NOTIFICATIONS } from "./demo-data.js";
import { COLLECTIONS } from "../core/constants.js";
import toast from "../core/toast.js";

let mode = "preview", sent = [], batches = [];

const TYPE_META = {
  general: ["badge-brand", "General"], fee: ["badge-warning", "Fee"],
  class: ["badge-accent", "Class"], exam: ["badge-danger", "Exam"], holiday: ["badge-success", "Holiday"]
};

function paintSent() {
  render($("#ntfSent"), sent.length ? sent.map((n) => {
    const [cls, label] = TYPE_META[n.type] || TYPE_META.general;
    return el("div", { class: "card-ssz" }, el("div", { class: "card-ssz__body", style: { padding: "1rem 1.25rem" } },
      el("div", { class: "between", style: { marginBottom: ".3rem", gap: ".5rem" } },
        el("strong", { style: { fontSize: ".9rem" } }, n.title),
        el("span", { style: { fontSize: ".72rem", color: "var(--text-muted)", whiteSpace: "nowrap" } }, timeAgo(n.createdAt))),
      el("p", { style: { margin: "0 0 .6rem", fontSize: ".82rem" } }, n.message),
      el("div", { class: "cluster", style: { gap: ".4rem" } },
        el("span", { class: `badge-ssz ${cls}` }, label),
        /* "admin" wale sandesh system khud banata hai (jaise "ek payment kisi
           student se juda nahi") — wo kisi student ko nahi jaate, sirf yahan
           dikhte hain. Iske bina label "Student: undefined" ban jaata tha. */
        el("span", { class: "badge-ssz" },
          n.audience === "admin" ? "Sirf aapke liye"
            : n.audience === "all" ? "Sabhi students"
            : n.audience === "batch" ? `Batch: ${n.batchId}`
            : `Student: ${n.studentId}`),
        el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", style: { color: "var(--danger)", minHeight: "28px", padding: ".2rem .6rem" }, type: "button", dataset: { del: n.id } }, "Delete"))
    ));
  }) : el("div", { class: "card-ssz" }, el("div", { class: "card-ssz__body" },
    el("p", { style: { margin: 0, fontSize: ".88rem", color: "var(--text-muted)" } }, "Abhi kuch nahi bheja gaya."))));
}

/* ---------------- boot ---------------- */
const shell = await initAdminShell({ active: "notify", title: "Notifications" });
mode = shell.mode;

if (mode === "preview") {
  sent = DEMO_NOTIFICATIONS.map((n) => ({ ...n }));
  batches = [...DEMO_BATCHES];
} else {
  const { getMany } = await import("../../firebase/db-service.js");
  [sent, batches] = await Promise.all([
    getMany(COLLECTIONS.NOTIFICATIONS, { orderBy: ["createdAt", "desc"], limit: 50, useCache: false }).catch(() => []),
    getMany(COLLECTIONS.BATCHES, { limit: 50 }).catch(() => [])
  ]);
}

const form = $("#ntfForm");
const bSel = form.querySelector('[name="batchId"]');
batches.forEach((b) => bSel.appendChild(el("option", { value: b.id }, b.name)));

$("#ntfAudience").addEventListener("change", (e) => {
  $("#ntfBatchField").hidden = e.target.value !== "batch";
  $("#ntfStudentField").hidden = e.target.value !== "student";
});

const validator = createValidator(form, {
  title:   [rules.required(), rules.minLen(4)],
  message: [rules.required(), rules.minLen(10, "Message thoda detail me likhein.")]
});

paintSent();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validator.validate()) return;

  const audience = form.elements.audience.value;
  if (audience === "batch" && !bSel.value) return toast.warning("Batch chunein.");
  if (audience === "student" && !form.elements.studentId.value.trim()) return toast.warning("Student ID daalein.");

  const data = {
    title: form.elements.title.value.trim(),
    message: form.elements.message.value.trim(),
    type: form.elements.type.value,
    priority: form.elements.priority.value,
    audience,
    batchId: audience === "batch" ? bSel.value : "",
    studentId: audience === "student" ? form.elements.studentId.value.trim().toUpperCase() : "",
    readBy: [],
    createdBy: shell.user.uid || "admin"
  };

  await withButton($("#ntfSend"), async () => {
    if (mode === "preview") {
      sent.unshift({ id: `tmp-${Date.now()}`, ...data, createdAt: new Date() });
      form.reset();
      $("#ntfBatchField").hidden = true; $("#ntfStudentField").hidden = true;
      paintSent();
      toast.info("Preview mode: Firebase ke baad asli bhejega.");
      return;
    }
    try {
      const { create } = await import("../../firebase/db-service.js");
      const id = await create(COLLECTIONS.NOTIFICATIONS, data);
      sent.unshift({ id, ...data, createdAt: new Date() });
      form.reset();
      $("#ntfBatchField").hidden = true; $("#ntfStudentField").hidden = true;
      paintSent();
      toast.success("Notification bhej di gayi — students ke dashboard me dikhegi.");
    } catch (err) {
      toast.error(err.message || "Bhejne me dikkat aayi.");
    }
  });
});

on($("#ntfSent"), "click", "[data-del]", async (e, btn) => {
  const n = sent.find((x) => x.id === btn.dataset.del);
  if (!n) return;
  const ok = await confirmModal({ title: "Delete karein?", message: `"${n.title}" students ke dashboard se hat jaayegi.`, danger: true, confirmText: "Haan" });
  if (!ok) return;
  if (mode === "live") {
    try {
      const { remove } = await import("../../firebase/db-service.js");
      await remove(COLLECTIONS.NOTIFICATIONS, n.id);
    } catch (err) { return toast.error(err.message || "Fail ho gaya."); }
  }
  sent = sent.filter((x) => x.id !== n.id);
  paintSent();
  toast.success("Delete ho gaya.");
});
