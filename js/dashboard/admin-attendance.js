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
      el("td", { "data-label": "Roll", style: { fontFamily: "var(--font-mono)", fontSize: ".78rem" } }, s.rollNo || "—"),
      el("td", { "data-label": "Student" },
        el("strong", { style: { display: "block", color: "var(--text-primary)" } }, s.fullName),
        el("span", { style: { fontSize: ".72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" } }, s.studentId)),
      /* Button ka naam ab do roop me hai: bade screen par chhota (P/A/L/Lv),
         phone par poora (Present/Absent/...). Pehle poora naam sirf `title`
         me tha — aur `title` phone par kabhi dikhta hi nahi, kyunki hover
         hota hi nahi. Yaani phone par admin ko andaza lagana padta tha ki
         "Lv" ka matlab kya hai. */
      el("td", {}, el("span", { class: "cluster", style: { gap: ".35rem" } },
        ...OPTIONS.map((o) => el("button", {
          type: "button",
          title: o.title,
          "aria-label": o.title,
          class: `btn-ssz btn-sm-ssz ${marks[s.studentId] === o.v ? o.cls : "btn-ghost-ssz"}`,
          style: { minHeight: "34px", minWidth: "40px", padding: ".3rem .6rem" },
          dataset: { mark: s.studentId, status: o.v }
        },
          el("span", { class: "at-mark__short" }, o.l),
          el("span", { class: "at-mark__full" }, o.title)))
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
    loadLow();   // aaj ki attendance jodne ke baad list dobara bane
  } catch (err) {
    toast.error(err.message || "Save fail ho gaya.");
  }
}

/* ==========================================================================
   Hazri gir rahi hai
   --------------------------------------------------------------------------
   Pichhle 30 din dekhte hain. "Leave" ko ginti se bahar rakhte hain — chhutti
   li hui thi, wo gair-haazri nahi hai. "Late" ko haazir hi maante hain: der se
   aaya to bhi aaya to hai.

   Kam se kam 5 din ka record hone par hi kisi ko is list me daalte hain,
   warna jo student abhi-abhi juda hai wo pehle hi din laal dikhne lagega.
   ========================================================================== */
const LOW_DAYS = 30;
const LOW_MIN_MARKED = 5;
const LOW_THRESHOLD = 60;      // isse neeche wale hi dikhenge

function lowRows(records) {
  const byStudent = new Map();
  records.forEach((r) => {
    if (r.status === ATTENDANCE_STATUS.LEAVE) return;
    const cur = byStudent.get(r.studentId) || { marked: 0, present: 0 };
    cur.marked++;
    if (r.status === ATTENDANCE_STATUS.PRESENT || r.status === ATTENDANCE_STATUS.LATE) cur.present++;
    byStudent.set(r.studentId, cur);
  });

  return students
    .filter((s) => s.status === "active")
    .map((s) => {
      const c = byStudent.get(s.studentId);
      if (!c || c.marked < LOW_MIN_MARKED) return null;
      const pct = Math.round((c.present / c.marked) * 100);
      return pct < LOW_THRESHOLD ? { s, pct, marked: c.marked, present: c.present } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.pct - b.pct);
}

function lowReminderText(s, pct) {
  const name = (s.fullName || "").split(" ")[0] || "ji";
  return [
    `Namaste ${name} ji, Soft Skill Zone se.`,
    `Pichhle mahine class me aapki attendance ${pct}% rahi hai — hum aapko miss kar rahe hain.`,
    "Padhai ka nuksan na ho, isliye class me aana zaroori hai.",
    "Koi dikkat ho — time, tabiyat ya kuch aur — to bata dijiye, hum raasta nikal lenge."
  ].join("\n");
}

function paintLow(records) {
  const rows = lowRows(records);
  $("#lowSection").hidden = !rows.length;
  $("#lowMeta").textContent = `Pichhle ${LOW_DAYS} din · ${LOW_THRESHOLD}% se kam`;
  if (!rows.length) return;

  render($("#lowList"), rows.map(({ s, pct, marked, present }) => {
    const num = String(s.whatsapp || s.mobile || "").replace(/\D/g, "").slice(-10);
    const link = num.length === 10
      ? `https://wa.me/91${num}?text=${encodeURIComponent(lowReminderText(s, pct))}`
      : null;
    const tone = pct < 40 ? "danger" : "warning";

    return el("div", { class: "card-ssz", style: { borderLeft: `3px solid var(--${tone})` } },
      el("div", { class: "card-ssz__body", style: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", padding: "1rem 1.25rem" } },
        el("span", { style: { flex: 1, minWidth: "200px" } },
          el("strong", { style: { display: "block", fontSize: ".93rem" } }, s.fullName || s.studentId),
          el("span", { style: { fontSize: ".78rem", color: "var(--text-muted)" } },
            `${present}/${marked} din haazir · ${s.batchName || s.batchId || "batch nahi"}`)),
        el("span", { style: { fontWeight: 700, fontSize: "1.1rem", color: `var(--${tone})` } }, `${pct}%`),
        link
          ? el("a", { class: "btn-ssz btn-success-ssz btn-sm-ssz", href: link, target: "_blank", rel: "noopener" }, "WhatsApp")
          : el("span", { style: { fontSize: ".76rem", color: "var(--text-muted)" } }, "Number nahi hai")
      ));
  }));
}

async function loadLow() {
  if (mode === "preview") return;
  const from = new Date();
  from.setDate(from.getDate() - LOW_DAYS);
  try {
    const { getMany } = await import("../../firebase/db-service.js");
    const records = await getMany(COLLECTIONS.ATTENDANCE, {
      where: [["date", ">=", dateKey(from)]],
      limit: 3000, useCache: false
    });
    paintLow(records);
  } catch (err) {
    // Index na ho ya permission na mile to register phir bhi chalta rahe
    console.warn("[attendance] low-attendance list skipped:", err);
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

loadLow();

$("#atAllPresent").addEventListener("click", () => {
  batchStudents().forEach((s) => { marks[s.studentId] = ATTENDANCE_STATUS.PRESENT; });
  paintRows();
});

$("#atSave").addEventListener("click", save);

paintRows();
