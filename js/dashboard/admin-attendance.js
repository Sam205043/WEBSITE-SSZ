/* ==========================================================================
   Soft Skill Zone — Admin: Attendance register
   Pick batch + date -> mark every student -> save (idempotent per day).
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { dateKey } from "../core/utils.js";
import { initAdminShell } from "./admin-shell.js";
import { DEMO_BATCHES, DEMO_STUDENTS } from "./admin-demo.js";
import { COLLECTIONS, ATTENDANCE_STATUS } from "../core/constants.js";
import toast from "../core/toast.js";

let mode = "preview", batches = [], students = [];
let marks = {};   // studentId -> status

const OPTIONS = [
  { v: ATTENDANCE_STATUS.PRESENT, l: "P", title: "Present", cls: "btn-success-ssz" },
  { v: ATTENDANCE_STATUS.ABSENT,  l: "A", title: "Absent",  cls: "btn-danger-ssz" },
  { v: ATTENDANCE_STATUS.LATE,    l: "L", title: "Late",    cls: "btn-warning-ssz" },
  { v: ATTENDANCE_STATUS.LEAVE,   l: "Lv", title: "Leave",  cls: "btn-secondary-ssz" }
];

const batchStudents = () => students.filter((s) => s.batchId === $("#atBatch").value && s.status === "active");

function paintRows() {
  const list = batchStudents();
  $("#atMeta").textContent = list.length
    ? `${list.length} active students · ${$("#atDate").value}`
    : "Is batch me koi active student nahi hai.";

  render($("#atRows"), list.length ? list.map((s) =>
    el("tr", {},
      el("td", { style: { fontFamily: "var(--font-mono)", fontSize: ".78rem" } }, s.rollNo || "—"),
      el("td", {},
        el("strong", { style: { display: "block", color: "var(--text-primary)" } }, s.fullName),
        el("span", { style: { fontSize: ".72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" } }, s.studentId)),
      el("td", {}, el("span", { class: "cluster", style: { gap: ".35rem" } },
        ...OPTIONS.map((o) => el("button", {
          type: "button",
          title: o.title,
          class: `btn-ssz btn-sm-ssz ${marks[s.studentId] === o.v ? o.cls : "btn-ghost-ssz"}`,
          style: { minHeight: "34px", minWidth: "40px", padding: ".3rem .6rem" },
          dataset: { mark: s.studentId, status: o.v }
        }, o.l))
      ))
    )
  ) : el("tr", {}, el("td", { colspan: "3", style: { textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" } },
    "Batch chunein — students yahan dikhenge.")));
}

async function loadExisting() {
  marks = {};
  const batchId = $("#atBatch").value;
  const date = $("#atDate").value;
  if (!batchId || !date) return paintRows();

  if (mode === "preview") {
    // sample: everyone present by default on load
    batchStudents().forEach((s) => { marks[s.studentId] = ATTENDANCE_STATUS.PRESENT; });
    return paintRows();
  }

  try {
    const { getMany } = await import("../../firebase/db-service.js");
    const rows = await getMany(COLLECTIONS.ATTENDANCE, {
      where: [["batchId", "==", batchId], ["date", "==", date]],
      limit: 200, useCache: false
    });
    rows.forEach((r) => { marks[r.studentId] = r.status; });
  } catch { /* none yet */ }
  paintRows();
}

async function save() {
  const batchId = $("#atBatch").value;
  const date = $("#atDate").value;
  const list = batchStudents();
  if (!batchId || !list.length) return toast.warning("Pehle batch chunein.");

  const missing = list.filter((s) => !marks[s.studentId]);
  if (missing.length) return toast.warning(`${missing.length} students ka status baaki hai.`);

  if (mode === "preview") return toast.info("Preview mode: Firebase ke baad asli save hoga.");

  try {
    const { batchWrite } = await import("../../firebase/db-service.js");
    const batch = batches.find((b) => b.id === batchId);
    await batchWrite(list.map((s) => ({
      type: "set",
      path: COLLECTIONS.ATTENDANCE,
      id: `${date}_${s.studentId}`,
      merge: true,
      data: {
        date, batchId,
        courseId: batch?.courseId || s.courseId || "",
        studentId: s.studentId,
        studentName: s.fullName,
        status: marks[s.studentId],
        markedBy: shell.user.uid || "admin"
      }
    })));
    toast.success(`${list.length} students ki attendance save ho gayi (${date}).`);
  } catch (err) {
    toast.error(err.message || "Save fail ho gaya.");
  }
}

/* ---------------- boot ---------------- */
const shell = await initAdminShell({ active: "attendance", title: "Attendance" });
mode = shell.mode;

if (mode === "preview") {
  batches = [...DEMO_BATCHES];
  students = DEMO_STUDENTS.map((s) => ({ ...s }));
} else {
  const { getMany } = await import("../../firebase/db-service.js");
  [batches, students] = await Promise.all([
    getMany(COLLECTIONS.BATCHES, { limit: 50 }).catch(() => []),
    getMany(COLLECTIONS.STUDENTS, { limit: 500, useCache: false }).catch(() => [])
  ]);
}

const bSel = $("#atBatch");
bSel.appendChild(el("option", { value: "" }, "Batch chunein"));
batches.filter((b) => b.status !== "completed").forEach((b) =>
  bSel.appendChild(el("option", { value: b.id }, b.name)));

$("#atDate").value = dateKey();
$("#atDate").max = dateKey();

bSel.addEventListener("change", loadExisting);
$("#atDate").addEventListener("change", loadExisting);

on($("#atRows"), "click", "[data-mark]", (e, btn) => {
  marks[btn.dataset.mark] = btn.dataset.status;
  paintRows();
});

$("#atAllPresent").addEventListener("click", () => {
  batchStudents().forEach((s) => { marks[s.studentId] = ATTENDANCE_STATUS.PRESENT; });
  paintRows();
});

$("#atSave").addEventListener("click", save);

paintRows();
