/* ==========================================================================
   Soft Skill Zone — Admin: Live Class scheduler (Google Meet)
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatDateTime, dateTimeLocal, toDate } from "../core/utils.js";
import { open as openModal, confirm as confirmModal } from "../core/modal.js";
import { createValidator, rules } from "../core/validators.js";
import { initAdminShell } from "./admin-shell.js";
import { DEMO_BATCHES } from "./admin-demo.js";
import { DEMO_CLASSES } from "./demo-data.js";
import { COLLECTIONS, CLASS_STATUS } from "../core/constants.js";
import toast from "../core/toast.js";

let mode = "preview", classes = [], batches = [], batchF = "all";

function row(c) {
  const past = toDate(c.endsAt)?.getTime() < Date.now();
  const cancelled = c.status === CLASS_STATUS.CANCELLED;
  return el("div", { class: "card-ssz", style: cancelled ? { opacity: ".6" } : {} },
    el("div", { class: "card-ssz__body", style: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", padding: "1rem 1.25rem" } },
      el("span", { class: "stat-tile__icon", html: icon("video", { size: 20 }) }),
      el("span", { style: { flex: 1, minWidth: "220px" } },
        el("strong", { style: { display: "block", fontSize: ".93rem" } },
          c.title, cancelled ? el("span", { class: "badge-ssz badge-danger", style: { marginLeft: ".5rem" } }, "Cancelled") : null),
        el("span", { style: { fontSize: ".78rem", color: "var(--text-muted)" } },
          `${formatDateTime(c.startsAt)} · ${c.batchName || c.batchId} · ${c.facultyName || ""}`)),
      el("a", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", href: c.meetLink, target: "_blank", rel: "noopener" }, "Meet link"),
      !past && !cancelled ? el("button", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", type: "button", dataset: { edit: c.id } }, "Edit") : null,
      !past && !cancelled ? el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", style: { color: "var(--danger)" }, type: "button", dataset: { cancel: c.id } }, "Cancel") : null
    ));
}

function paint() {
  const list = batchF === "all" ? classes : classes.filter((c) => c.batchId === batchF);
  const upcoming = list.filter((c) => toDate(c.endsAt)?.getTime() >= Date.now())
    .sort((a, b) => toDate(a.startsAt) - toDate(b.startsAt));
  const past = list.filter((c) => toDate(c.endsAt)?.getTime() < Date.now())
    .sort((a, b) => toDate(b.startsAt) - toDate(a.startsAt)).slice(0, 15);

  const empty = (msg) => el("div", { class: "card-ssz" }, el("div", { class: "card-ssz__body" },
    el("p", { style: { margin: 0, fontSize: ".88rem", color: "var(--text-muted)" } }, msg)));

  render($("#lcUpcoming"), upcoming.length ? upcoming.map(row) : empty("Koi upcoming class nahi — upar se schedule karein."));
  render($("#lcPast"), past.length ? past.map(row) : empty("Abhi tak koi class nahi hui."));
}

function classForm(c = null) {
  const isNew = !c;
  const form = el("form", { novalidate: true });
  form.innerHTML = `
    <div class="field">
      <label class="field__label">Class ka title <span class="req">*</span></label>
      <input class="input-ssz" name="title" type="text" placeholder="Jaise: GST 2.0 — Return Filing Practical">
      <div class="field__error"></div>
    </div>
    <div class="adm-row">
      <div class="field">
        <label class="field__label">Batch <span class="req">*</span></label>
        <select class="select-ssz" name="batchId"></select>
        <div class="field__error"></div>
      </div>
      <div class="field">
        <label class="field__label">Faculty</label>
        <input class="input-ssz" name="facultyName" type="text" placeholder="Kaun padhayega">
      </div>
    </div>
    <div class="field">
      <label class="field__label">Google Meet link <span class="req">*</span></label>
      <input class="input-ssz" name="meetLink" type="url" placeholder="https://meet.google.com/xxx-yyyy-zzz">
      <p class="field__hint">Meet me nayi meeting banakar link yahan paste karein.</p>
      <div class="field__error"></div>
    </div>
    <div class="adm-row">
      <div class="field">
        <label class="field__label">Shuru <span class="req">*</span></label>
        <input class="input-ssz" name="startsAt" type="datetime-local">
        <div class="field__error"></div>
      </div>
      <div class="field">
        <label class="field__label">Khatam <span class="req">*</span></label>
        <input class="input-ssz" name="endsAt" type="datetime-local">
        <div class="field__error"></div>
      </div>
    </div>
    <div class="field">
      <label class="field__label">Topic (optional)</label>
      <input class="input-ssz" name="topic" type="text" placeholder="Aaj kya cover hoga">
    </div>`;

  const bSel = form.querySelector('[name="batchId"]');
  bSel.appendChild(el("option", { value: "" }, "Chunein"));
  batches.filter((b) => b.status !== "completed").forEach((b) =>
    bSel.appendChild(el("option", { value: b.id }, b.name)));

  if (c) {
    form.elements.title.value = c.title || "";
    bSel.value = c.batchId || "";
    form.elements.facultyName.value = c.facultyName || "";
    form.elements.meetLink.value = c.meetLink || "";
    form.elements.topic.value = c.topic || "";
    form.elements.startsAt.value = dateTimeLocal(c.startsAt);
    form.elements.endsAt.value = dateTimeLocal(c.endsAt);
  } else {
    const soon = new Date(Date.now() + 3600000); soon.setMinutes(0, 0, 0);
    form.elements.startsAt.value = dateTimeLocal(soon);
    form.elements.endsAt.value = dateTimeLocal(new Date(soon.getTime() + 90 * 60000));
  }

  const validator = createValidator(form, {
    title:    [rules.required(), rules.minLen(4)],
    batchId:  [rules.required("Batch chunein.")],
    meetLink: [rules.required("Meet link daalein."), rules.meetLink()],
    startsAt: [rules.required("Time chunein.")],
    endsAt:   [rules.required("Time chunein."),
               rules.custom((v) => !v || !form.elements.startsAt.value || new Date(v) > new Date(form.elements.startsAt.value),
                 "Khatam hone ka time shuru se baad hona chahiye.")]
  });

  const saveBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, isNew ? "Schedule Karein" : "Save");
  const cancelBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Cancel");
  const m = openModal({ title: isNew ? "Nayi Live Class" : "Class edit karein", size: "lg", body: form, footer: [cancelBtn, saveBtn] });
  cancelBtn.addEventListener("click", () => m.close());

  saveBtn.addEventListener("click", async () => {
    if (!validator.validate()) return;
    const batch = batches.find((b) => b.id === bSel.value);
    const data = {
      title: form.elements.title.value.trim(),
      topic: form.elements.topic.value.trim(),
      batchId: bSel.value,
      batchName: batch?.name || "",
      courseId: batch?.courseId || "",
      facultyName: form.elements.facultyName.value.trim(),
      meetLink: form.elements.meetLink.value.trim(),
      startsAt: new Date(form.elements.startsAt.value),
      endsAt: new Date(form.elements.endsAt.value),
      status: CLASS_STATUS.SCHEDULED
    };

    if (mode === "preview") {
      if (isNew) classes.unshift({ id: `tmp-${Date.now()}`, ...data });
      else Object.assign(c, data);
      m.close(); paint();
      toast.info("Preview mode: Firebase ke baad asli schedule hoga.");
      return;
    }

    try {
      const { create, update } = await import("../../firebase/db-service.js");
      if (isNew) {
        const id = await create(COLLECTIONS.LIVE_CLASSES, data);
        classes.unshift({ id, ...data });
      } else {
        await update(COLLECTIONS.LIVE_CLASSES, c.id, data);
        Object.assign(c, data);
      }
      m.close(); paint();
      toast.success(isNew ? "Class schedule ho gayi! Students ke dashboard me dikhegi." : "Class update ho gayi.");
    } catch (err) {
      toast.error(err.message || "Save fail ho gaya.");
    }
  });
}

/* ---------------- boot ---------------- */
const shell = await initAdminShell({ active: "classes", title: "Live Classes" });
mode = shell.mode;

if (mode === "preview") {
  classes = DEMO_CLASSES.map((c) => ({ ...c }));
  batches = [...DEMO_BATCHES];
} else {
  const { getMany } = await import("../../firebase/db-service.js");
  [classes, batches] = await Promise.all([
    getMany(COLLECTIONS.LIVE_CLASSES, { orderBy: ["startsAt", "desc"], limit: 100, useCache: false }).catch(() => []),
    getMany(COLLECTIONS.BATCHES, { limit: 50 }).catch(() => [])
  ]);
}

const fSel = $("#lcBatch");
batches.forEach((b) => fSel.appendChild(el("option", { value: b.id }, b.name)));
fSel.addEventListener("change", () => { batchF = fSel.value; paint(); });

paint();

$("#lcNew").addEventListener("click", () => classForm(null));
on(document, "click", "[data-edit]", (e, btn) => {
  const c = classes.find((x) => x.id === btn.dataset.edit);
  if (c) classForm(c);
});
on(document, "click", "[data-cancel]", async (e, btn) => {
  const c = classes.find((x) => x.id === btn.dataset.cancel);
  if (!c) return;
  const ok = await confirmModal({ title: "Class cancel karein?", message: `"${c.title}" students ke dashboard se hat jaayegi.`, danger: true, confirmText: "Haan, cancel" });
  if (!ok) return;
  if (mode === "preview") { c.status = "cancelled"; paint(); return toast.info("Preview mode."); }
  try {
    const { update } = await import("../../firebase/db-service.js");
    await update(COLLECTIONS.LIVE_CLASSES, c.id, { status: CLASS_STATUS.CANCELLED });
    c.status = "cancelled"; paint();
    toast.success("Class cancel ho gayi.");
  } catch (err) { toast.error(err.message || "Fail ho gaya."); }
});
