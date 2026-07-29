/* ==========================================================================
   Soft Skill Zone — Admin: Student Manager
   Search + filters + detail/edit + status change + CSV export.
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { money, formatDate, formatPhone, exportCSV, debounce } from "../core/utils.js";
import { open as openModal } from "../core/modal.js";
import { createValidator, rules } from "../core/validators.js";
import { initAdminShell } from "./admin-shell.js";
import { DEMO_STUDENTS, DEMO_BATCHES } from "./admin-demo.js";
import { COLLECTIONS, STUDENT_STATUS } from "../core/constants.js";
import { COURSES } from "../config/site-data.js";
import toast from "../core/toast.js";

let mode = "preview", students = [], batches = [];
let term = "", courseF = "all", statusF = "all";

const STATUS_BADGE = {
  active:    ["badge-success", "Active"],
  completed: ["badge-accent",  "Completed"],
  dropped:   ["badge-danger",  "Dropped"]
};

function filtered() {
  return students.filter((s) => {
    if (courseF !== "all" && s.courseId !== courseF) return false;
    if (statusF !== "all" && s.status !== statusF) return false;
    if (term) {
      const hay = `${s.fullName} ${s.studentId} ${s.mobile} ${s.fatherName || ""}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
}

function paint() {
  const list = filtered();
  $("#stCount").textContent = `${list.length} / ${students.length} students`;

  if (!list.length) {
    render($("#stRows"), el("tr", {}, el("td", { colspan: "6", style: { textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" } },
      students.length ? "Is filter me koi student nahi mila." : "Abhi koi student nahi — admissions approve karte hi yahan aayenge.")));
    return;
  }

  render($("#stRows"), list.map((s) => {
    const [cls, label] = STATUS_BADGE[s.status] || ["", s.status];
    return el("tr", {},
      el("td", {},
        el("strong", { style: { display: "block", color: "var(--text-primary)" } }, s.fullName),
        el("span", { style: { fontFamily: "var(--font-mono)", fontSize: ".72rem", color: "var(--text-muted)" } }, s.studentId)),
      el("td", {},
        el("span", { style: { display: "block" } }, s.courseName),
        el("span", { style: { fontSize: ".76rem", color: "var(--text-muted)" } }, s.batchName || s.batchId || "Batch pending")),
      el("td", {}, formatPhone(s.mobile)),
      el("td", { class: "num", style: (s.pendingFee || 0) > 0 ? { color: "var(--danger)", fontWeight: 600 } : {} }, money(s.pendingFee || 0)),
      el("td", {}, el("span", { class: `badge-ssz badge-dot ${cls}` }, label)),
      el("td", {}, el("button", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", type: "button", dataset: { view: s.id } }, "Manage"))
    );
  }));
}

function openStudent(s) {
  const body = el("div", {});

  body.appendChild(el("dl", { style: { margin: "0 0 1.25rem" } },
    ...[["Student ID", s.studentId], ["Pita", s.fatherName], ["Course", s.courseName],
        ["Admission", s.admissionDate ? formatDate(s.admissionDate) : "—"],
        ["Fees", `${money(s.paidFee || 0)} / ${money(s.totalFee || 0)} (bakaya ${money(s.pendingFee || 0)})`],
        ["Address", s.address]]
      .map(([k, v]) => el("div", { class: "verify-row" }, el("dt", {}, k), el("dd", {}, v || "—")))
  ));

  const form = el("form", { novalidate: true });
  form.innerHTML = `
    <div class="adm-row">
      <div class="field">
        <label class="field__label">Mobile</label>
        <input class="input-ssz" name="mobile" type="tel" maxlength="10" value="${(s.mobile || "").replace(/"/g, "")}">
        <div class="field__error"></div>
      </div>
      <div class="field">
        <label class="field__label">Batch</label>
        <select class="select-ssz" name="batchId"></select>
      </div>
    </div>
    <div class="field">
      <label class="field__label">Status</label>
      <select class="select-ssz" name="status">
        <option value="active">Active</option>
        <option value="completed">Completed</option>
        <option value="dropped">Dropped</option>
      </select>
    </div>`;

  const batchSel = form.querySelector('[name="batchId"]');
  batchSel.appendChild(el("option", { value: "" }, "Koi batch nahi"));
  batches.filter((b) => b.courseId === s.courseId || !b.courseId).forEach((b) =>
    batchSel.appendChild(el("option", { value: b.id, selected: b.id === s.batchId }, b.name)));
  form.elements.status.value = s.status || "active";
  body.appendChild(form);

  const validator = createValidator(form, { mobile: [rules.required(), rules.mobile()] });

  const saveBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Save");
  const closeBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Band karein");
  const m = openModal({ title: s.fullName, size: "lg", body, footer: [closeBtn, saveBtn] });
  closeBtn.addEventListener("click", () => m.close());

  saveBtn.addEventListener("click", async () => {
    if (!validator.validate()) return;
    const patch = {
      mobile: form.elements.mobile.value.trim(),
      batchId: form.elements.batchId.value,
      batchName: batches.find((b) => b.id === form.elements.batchId.value)?.name || "",
      status: form.elements.status.value
    };
    if (mode === "preview") {
      Object.assign(s, patch);
      m.close(); paint();
      toast.info("Preview mode: Firebase ke baad asli save hoga.");
      return;
    }
    try {
      const { update } = await import("../../firebase/db-service.js");
      await update(COLLECTIONS.STUDENTS, s.id, patch);
      Object.assign(s, patch);
      m.close(); paint();
      toast.success("Student update ho gaya.");
    } catch (err) {
      toast.error(err.message || "Save fail ho gaya.");
    }
  });
}

/* ---------------- boot ---------------- */
const shell = await initAdminShell({ active: "students", title: "Students" });
mode = shell.mode;

if (mode === "preview") {
  students = DEMO_STUDENTS.map((s) => ({ ...s }));
  batches = [...DEMO_BATCHES];
} else {
  const { getMany } = await import("../../firebase/db-service.js");
  [students, batches] = await Promise.all([
    getMany(COLLECTIONS.STUDENTS, { orderBy: ["createdAt", "desc"], limit: 500, useCache: false }).catch(() => []),
    getMany(COLLECTIONS.BATCHES, { limit: 50 }).catch(() => [])
  ]);
}

/* course filter options */
const sel = $("#stCourse");
sel.appendChild(el("option", { value: "all" }, "Sab courses"));
COURSES.forEach((c) => sel.appendChild(el("option", { value: c.id }, c.shortTitle)));

paint();

$("#stSearch").addEventListener("input", debounce((e) => { term = e.target.value.trim().toLowerCase(); paint(); }, 200));
sel.addEventListener("change", () => { courseF = sel.value; paint(); });
$("#stStatus").addEventListener("change", (e) => { statusF = e.target.value; paint(); });

$("#stExport").addEventListener("click", () => {
  const list = filtered();
  if (!list.length) return toast.warning("Export ke liye koi student nahi.");
  exportCSV(list.map((s) => ({
    "Student ID": s.studentId, "Name": s.fullName, "Father": s.fatherName || "",
    "Mobile": s.mobile || "", "Email": s.email || "",
    "Course": s.courseName || "", "Batch": s.batchName || s.batchId || "",
    "Status": s.status || "", "Total Fee": s.totalFee || 0,
    "Paid": s.paidFee || 0, "Pending": s.pendingFee || 0,
    "Admission Date": s.admissionDate ? formatDate(s.admissionDate) : ""
  })), `ssz-students-${new Date().toISOString().slice(0, 10)}.csv`);
  toast.success(`${list.length} students ka CSV download ho gaya (Excel me khul jaayega).`);
});

on($("#stRows"), "click", "[data-view]", (e, btn) => {
  const s = students.find((x) => x.id === btn.dataset.view);
  if (s) openStudent(s);
});
