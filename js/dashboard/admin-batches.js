/* ==========================================================================
   Soft Skill Zone — Admin: Batch Manager (full CRUD)
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatDate, slugify } from "../core/utils.js";
import { open as openModal, confirm as confirmModal } from "../core/modal.js";
import { createValidator, rules } from "../core/validators.js";
import { initAdminShell } from "./admin-shell.js";
import { DEMO_BATCHES } from "./admin-demo.js";
import { COLLECTIONS } from "../core/constants.js";
import { COURSES, getCourse, getCourseCode } from "../config/site-data.js";
import toast from "../core/toast.js";

let mode = "preview", batches = [], statusF = "all";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUS_BADGE = {
  upcoming:  ["badge-accent",  "Upcoming"],
  running:   ["badge-success", "Running"],
  completed: ["badge-warning", "Completed"]
};

function card(b) {
  const [cls, label] = STATUS_BADGE[b.status] || ["", b.status];
  const course = getCourse(b.courseId);
  return el("div", { class: "card-ssz is-hoverable" }, el("div", { class: "card-ssz__body" },
    el("div", { class: "between", style: { marginBottom: ".6rem" } },
      el("strong", { style: { fontSize: ".98rem" } }, b.name),
      el("span", { class: `badge-ssz badge-dot ${cls}` }, label)
    ),
    el("p", { style: { fontSize: ".84rem", margin: "0 0 .75rem", color: "var(--text-secondary)" } },
      `${b.courseName}${b.facultyName ? ` · ${b.facultyName}` : ""}`),
    el("div", { class: "cluster", style: { gap: ".4rem", marginBottom: "1rem" } },
      el("span", { class: "badge-ssz" }, b.timing || "Timing TBD"),
      el("span", { class: "badge-ssz" }, (b.days || []).join(", ") || "—"),
      el("span", { class: "badge-ssz badge-brand" }, b.mode || "offline"),
      el("span", { class: "badge-ssz" }, `${b.enrolled || 0}/${b.capacity || "—"} seats`)
    ),
    el("p", { style: { fontSize: ".76rem", color: "var(--text-muted)", margin: "0 0 1rem" } },
      `${b.startDate ? formatDate(b.startDate) : "—"} se ${b.endDate ? formatDate(b.endDate) : "—"} tak · ID: ${b.id}`),
    el("div", { class: "cluster" },
      el("button", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", type: "button", dataset: { edit: b.id } }, "Edit"),
      el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", type: "button", dataset: { del: b.id }, style: { color: "var(--danger)" } }, "Delete")
    )
  ));
}

function paint() {
  const list = statusF === "all" ? batches : batches.filter((b) => b.status === statusF);
  if (!list.length) {
    render($("#btList"), el("div", { class: "empty-state", style: { gridColumn: "1/-1" } },
      el("div", { class: "empty-state__icon", html: icon("calendar", { size: 32 }) }),
      el("h2", {}, "Koi batch nahi"),
      el("p", {}, "\"+ Naya Batch\" se pehla batch banayein — admission form me bhi dikhne lagega.")
    ));
    return;
  }
  render($("#btList"), list.map(card));
}

/* ==========================================================================
   Create / edit form
   ========================================================================== */
function batchForm(b = null) {
  const isNew = !b;
  const form = el("form", { novalidate: true });
  form.innerHTML = `
    <div class="field">
      <label class="field__label">Batch ka naam <span class="req">*</span></label>
      <input class="input-ssz" name="name" type="text" placeholder="Jaise: DCA Morning (Aug 2026)">
      <div class="field__error"></div>
    </div>
    <div class="adm-row">
      <div class="field">
        <label class="field__label">Course <span class="req">*</span></label>
        <select class="select-ssz" name="courseId"></select>
        <div class="field__error"></div>
      </div>
      <div class="field">
        <label class="field__label">Faculty</label>
        <input class="input-ssz" name="facultyName" type="text" placeholder="Faculty ka naam">
      </div>
    </div>
    <div class="adm-row">
      <div class="field">
        <label class="field__label">Timing <span class="req">*</span></label>
        <input class="input-ssz" name="timing" type="text" placeholder="08:00 AM - 09:30 AM">
        <div class="field__error"></div>
      </div>
      <div class="field">
        <label class="field__label">Mode</label>
        <select class="select-ssz" name="mode">
          <option value="offline">Offline (lab)</option>
          <option value="online">Online (Meet)</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label class="field__label">Din</label>
      <div class="cluster" data-days></div>
    </div>
    <div class="adm-row adm-row--3">
      <div class="field">
        <label class="field__label">Start date</label>
        <input class="input-ssz" name="startDate" type="date">
      </div>
      <div class="field">
        <label class="field__label">End date</label>
        <input class="input-ssz" name="endDate" type="date">
      </div>
      <div class="field">
        <label class="field__label">Capacity</label>
        <input class="input-ssz" name="capacity" type="number" min="1" max="100" value="20">
      </div>
    </div>
    <div class="field">
      <label class="field__label">Status</label>
      <select class="select-ssz" name="status">
        <option value="upcoming">Upcoming</option>
        <option value="running">Running</option>
        <option value="completed">Completed</option>
      </select>
    </div>`;

  const courseSel = form.querySelector('[name="courseId"]');
  courseSel.appendChild(el("option", { value: "" }, "Chunein"));
  COURSES.forEach((c) => courseSel.appendChild(el("option", { value: c.id }, c.title)));

  const daysBox = form.querySelector("[data-days]");
  const picked = new Set(b?.days || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  const paintDays = () => {
    render(daysBox, DAYS.map((d) =>
      el("button", { type: "button", class: `chip${picked.has(d) ? " is-active" : ""}`, dataset: { day: d } }, d)));
  };
  paintDays();
  on(daysBox, "click", ".chip", (e, chip) => {
    e.preventDefault();
    picked.has(chip.dataset.day) ? picked.delete(chip.dataset.day) : picked.add(chip.dataset.day);
    paintDays();
  });

  if (b) {
    form.elements.name.value = b.name || "";
    courseSel.value = b.courseId || "";
    form.elements.facultyName.value = b.facultyName || "";
    form.elements.timing.value = b.timing || "";
    form.elements.mode.value = b.mode || "offline";
    form.elements.capacity.value = b.capacity || 20;
    form.elements.status.value = b.status || "upcoming";
    const iso = (v) => {
      const d = v?.toDate ? v.toDate() : v ? new Date(v.seconds ? v.seconds * 1000 : v) : null;
      return d && !isNaN(d) ? d.toISOString().slice(0, 10) : "";
    };
    form.elements.startDate.value = iso(b.startDate);
    form.elements.endDate.value = iso(b.endDate);
  }

  const validator = createValidator(form, {
    name:     [rules.required(), rules.minLen(4)],
    courseId: [rules.required("Course chunein.")],
    timing:   [rules.required("Timing likhein.")]
  });

  const saveBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, isNew ? "Batch banayein" : "Save");
  const cancelBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Cancel");
  const m = openModal({ title: isNew ? "Naya Batch" : `Edit — ${b.name}`, size: "lg", body: form, footer: [cancelBtn, saveBtn] });
  cancelBtn.addEventListener("click", () => m.close());

  saveBtn.addEventListener("click", async () => {
    if (!validator.validate()) return;

    const data = {
      name: form.elements.name.value.trim(),
      courseId: courseSel.value,
      courseName: getCourse(courseSel.value)?.title || "",
      facultyName: form.elements.facultyName.value.trim(),
      timing: form.elements.timing.value.trim(),
      mode: form.elements.mode.value,
      days: DAYS.filter((d) => picked.has(d)),
      capacity: Number(form.elements.capacity.value) || 20,
      status: form.elements.status.value,
      startDate: form.elements.startDate.value ? new Date(form.elements.startDate.value) : null,
      endDate: form.elements.endDate.value ? new Date(form.elements.endDate.value) : null
    };

    const id = b?.id || `${getCourseCode(data.courseId)}-${slugify(data.name).slice(0, 18)}`.toUpperCase();
    data.batchId = id;
    data.enrolled = b?.enrolled || 0;

    if (mode === "preview") {
      if (isNew) batches.unshift({ id, ...data });
      else Object.assign(b, data);
      m.close(); paint();
      toast.info("Preview mode: Firebase ke baad asli save hoga.");
      return;
    }

    try {
      const { createWithId, update } = await import("../../firebase/db-service.js");
      if (isNew) {
        await createWithId(COLLECTIONS.BATCHES, id, data);
        batches.unshift({ id, ...data });
      } else {
        await update(COLLECTIONS.BATCHES, b.id, data);
        Object.assign(b, data);
      }
      m.close(); paint();
      toast.success(isNew ? `Batch ban gaya: ${id}` : "Batch update ho gaya.");
    } catch (err) {
      toast.error(err.message || "Save fail ho gaya.");
    }
  });
}

/* ---------------- boot ---------------- */
const shell = await initAdminShell({ active: "batches", title: "Batches" });
mode = shell.mode;

if (mode === "preview") {
  batches = DEMO_BATCHES.map((b) => ({ ...b }));
} else {
  const { getMany } = await import("../../firebase/db-service.js");
  batches = await getMany(COLLECTIONS.BATCHES, { orderBy: ["createdAt", "desc"], limit: 100, useCache: false }).catch(() => []);
}

paint();

$("#btStatus").addEventListener("change", (e) => { statusF = e.target.value; paint(); });
$("#btNew").addEventListener("click", () => batchForm(null));

on($("#btList"), "click", "[data-edit]", (e, btn) => {
  const b = batches.find((x) => x.id === btn.dataset.edit);
  if (b) batchForm(b);
});

on($("#btList"), "click", "[data-del]", async (e, btn) => {
  const b = batches.find((x) => x.id === btn.dataset.del);
  if (!b) return;
  const ok = await confirmModal({
    title: "Batch delete karein?",
    message: `"${b.name}" hamesha ke liye hat jaayega. Isme enrolled students par asar nahi padega, par unka batch link toot jaayega.`,
    confirmText: "Haan, delete karein",
    danger: true
  });
  if (!ok) return;

  if (mode === "preview") {
    batches = batches.filter((x) => x.id !== b.id);
    paint();
    toast.info("Preview mode: Firebase ke baad asli delete hoga.");
    return;
  }
  try {
    const { remove } = await import("../../firebase/db-service.js");
    await remove(COLLECTIONS.BATCHES, b.id);
    batches = batches.filter((x) => x.id !== b.id);
    paint();
    toast.success("Batch delete ho gaya.");
  } catch (err) {
    toast.error(err.message || "Delete fail ho gaya.");
  }
});
