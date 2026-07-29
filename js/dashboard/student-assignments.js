/* ==========================================================================
   Soft Skill Zone — Student: Assignments
   List + status + file submission (resubmit allowed until graded).
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatDate, formatDateTime, toDate } from "../core/utils.js";
import { validateFile } from "../core/files.js";
import { initShell } from "./shell.js";
import * as data from "./student-data.js";
import { DEMO_ASSIGNMENTS, DEMO_SUBMISSIONS, DEMO_STUDENT } from "./demo-data.js";
import toast from "../core/toast.js";

let assignments = [], submissions = [], student = null, mode = "preview";
let filter = "all";

const subFor = (a) => submissions.find((s) => s.assignmentId === a.id);
const isOverdue = (a) => toDate(a.dueDate)?.getTime() < Date.now();

function statusOf(a) {
  const s = subFor(a);
  if (s?.status === "graded") return "graded";
  if (s) return "submitted";
  return isOverdue(a) ? "overdue" : "pending";
}

const FILTERS = [
  { value: "all", label: "Sab" },
  { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" },
  { value: "graded", label: "Graded" },
  { value: "overdue", label: "Overdue" }
];

function card(a) {
  const s = subFor(a);
  const st = statusOf(a);
  const badge = {
    pending:   ["badge-warning", "Pending"],
    submitted: ["badge-accent", "Submitted"],
    graded:    ["badge-success", `Graded · ${s?.marks}/${a.totalMarks}`],
    overdue:   ["badge-danger", "Overdue"]
  }[st];

  const box = el("div", { class: "card-ssz" }, el("div", { class: "card-ssz__body" },
    el("div", { class: "between", style: { flexWrap: "wrap", gap: ".5rem", marginBottom: ".5rem" } },
      el("h3", { style: { margin: 0, fontSize: "1rem" } }, a.title),
      el("span", { class: `badge-ssz badge-dot ${badge[0]}` }, badge[1])
    ),
    el("p", { style: { fontSize: ".85rem", marginBottom: ".75rem" } }, a.description || ""),
    el("p", { style: { fontSize: ".78rem", color: "var(--text-muted)", marginBottom: "1rem" } },
      `Due: ${formatDateTime(a.dueDate)} · ${a.totalMarks} marks${s ? ` · Submitted: ${formatDate(s.submittedAt)}` : ""}`),

    a.fileURL ? el("a", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", href: a.fileURL, target: "_blank", rel: "noopener", style: { marginRight: ".5rem" } },
      el("span", { html: icon("download", { size: 16 }) }), a.fileName || "Question file") : null,

    s?.feedback ? el("div", {
      style: { marginTop: ".75rem", padding: ".75rem 1rem", borderRadius: "var(--r-sm)", background: "var(--bg-surface-2)", fontSize: ".82rem" }
    }, el("strong", {}, "Faculty feedback: "), s.feedback) : null,

    st !== "graded" ? el("div", { style: { marginTop: "1rem" } },
      el("input", { type: "file", class: "visually-hidden", id: `file-${a.id}`, "aria-label": `${a.title} ke liye file chunein`, accept: "application/pdf,image/jpeg,image/png,.doc,.docx,.xls,.xlsx" }),
      el("button", { class: "btn-ssz btn-primary-ssz btn-sm-ssz", type: "button", dataset: { pick: a.id } },
        el("span", { html: icon("upload", { size: 16 }) }),
        s ? "Dobara submit karein" : "Submit karein"),
      el("span", { id: `prog-${a.id}`, style: { marginLeft: ".75rem", fontSize: ".8rem", color: "var(--text-muted)" } })
    ) : null
  ));
  return box;
}

function paint() {
  const list = filter === "all" ? assignments : assignments.filter((a) => statusOf(a) === filter);
  if (!list.length) {
    render($("#asgList"), el("div", { class: "empty-state" },
      el("div", { class: "empty-state__icon", html: icon("clipboard", { size: 32 }) }),
      el("h2", {}, "Yahan kuch nahi hai"),
      el("p", {}, filter === "all" ? "Faculty assignment dete hi yahan dikhega." : "Is filter me koi assignment nahi.")
    ));
    return;
  }
  render($("#asgList"), list.map(card));
}

function paintFilters() {
  render($("#asgFilters"), FILTERS.map((f) =>
    el("button", { type: "button", class: `chip${f.value === filter ? " is-active" : ""}`, dataset: { f: f.value } }, f.label)
  ));
}

async function handleUpload(assignmentId, file) {
  const a = assignments.find((x) => x.id === assignmentId);
  if (!a || !file) return;

  const check = validateFile(file, "document");
  if (!check.ok) return toast.error(check.error);

  if (mode === "preview") {
    toast.info("Preview mode: Firebase connect hone ke baad file asli me upload hogi.");
    return;
  }

  const prog = $(`#prog-${assignmentId}`);
  try {
    await data.submitAssignment(student, a, file, subFor(a), (p) => { prog.textContent = `${p}%`; });
    prog.textContent = "";
    toast.success("Assignment submit ho gaya!");
    submissions = await data.getSubmissions(student);
    paint();
  } catch (err) {
    prog.textContent = "";
    toast.error(err.message || "Upload fail ho gaya.");
  }
}

/* ---------------- boot ---------------- */
const shell = await initShell({ active: "assignments", title: "Assignments" });
mode = shell.mode;

if (mode === "preview") {
  assignments = [...DEMO_ASSIGNMENTS]; submissions = [...DEMO_SUBMISSIONS]; student = DEMO_STUDENT;
} else {
  student = await data.getStudent(shell.user);
  if (student) {
    [assignments, submissions] = await Promise.all([data.getAssignments(student), data.getSubmissions(student)]);
  }
}

paintFilters();
paint();

on($("#asgFilters"), "click", ".chip", (e, chip) => {
  filter = chip.dataset.f;
  paintFilters();
  paint();
});

on($("#asgList"), "click", "[data-pick]", (e, btn) => {
  $(`#file-${btn.dataset.pick}`)?.click();
});
on($("#asgList"), "change", 'input[type="file"]', (e, input) => {
  const id = input.id.replace("file-", "");
  handleUpload(id, input.files[0]);
  input.value = "";
});
