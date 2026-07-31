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
import { buildPlan, currentDue, nextDueFrom, planDate, planDateStr } from "../core/fee-plan.js";
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
    </div>
    <div class="field">
      <label class="field__label">Fees ka schedule</label>
      <p class="field__hint" style="font-size:.76rem;color:var(--text-muted);margin:0 0 .6rem">
        Kitni kisto me deni hai aur pehli kist kab tak. Iske bina system ye nahi bata
        paata ki kis par kab tak kitna baaki hai — aur reminder bhi nahi nikalte.
      </p>
      <div class="adm-row">
        <div class="field" style="margin:0">
          <label class="field__label" style="font-size:.76rem">Kitni kisten</label>
          <input class="input-ssz" name="planCount" type="number" min="1" max="24" value="1">
        </div>
        <div class="field" style="margin:0">
          <label class="field__label" style="font-size:.76rem">Pehli kist kab tak</label>
          <input class="input-ssz" name="planFirst" type="date">
        </div>
        <div class="field" style="margin:0">
          <label class="field__label" style="font-size:.76rem">Har kitne mahine</label>
          <input class="input-ssz" name="planGap" type="number" min="1" max="6" value="1">
        </div>
      </div>
      <button class="btn-ssz btn-secondary-ssz btn-sm-ssz" type="button" id="stuPlanBtn"
              style="margin-top:.6rem">Schedule banayein</button>
      <div id="stuPlanOut" style="margin-top:.75rem"></div>
    </div>`;

  const batchSel = form.querySelector('[name="batchId"]');
  batchSel.appendChild(el("option", { value: "" }, "Koi batch nahi"));
  batches.filter((b) => b.courseId === s.courseId || !b.courseId).forEach((b) =>
    batchSel.appendChild(el("option", { value: b.id, selected: b.id === s.batchId }, b.name)));
  form.elements.status.value = s.status || "active";
  body.appendChild(form);

  /* ---------------- Fees ka schedule ----------------
     Plan sirf yahan banta hai; "abhi kaunsi kist baaki hai" kahin save nahi
     hota — wo paidFee se har baar khud nikal aata hai (js/core/fee-plan.js).
     Isliye payment jama hote hi schedule apne aap sahi ho jaata hai. */
  let plan = Array.isArray(s.feePlan) ? [...s.feePlan] : [];
  const planOut = form.querySelector("#stuPlanOut");

  const showPlan = () => {
    if (!plan.length) {
      render(planOut, el("p", { style: { margin: 0, fontSize: ".78rem", color: "var(--text-muted)" } },
        "Abhi koi schedule nahi bana."));
      return;
    }
    const due = currentDue({ ...s, feePlan: plan });
    render(planOut,
      el("div", { style: { border: "1px solid var(--border-subtle)", borderRadius: "var(--r-sm)", overflow: "hidden" } },
        ...plan.map((inst) => {
          const isCurrent = due && due.no === inst.no;
          return el("div", {
            style: {
              display: "flex", justifyContent: "space-between", gap: ".75rem",
              padding: ".5rem .75rem", fontSize: ".8rem",
              borderTop: inst.no > 1 ? "1px solid var(--border-subtle)" : "none",
              background: isCurrent ? "var(--warning-soft)" : "transparent",
              fontWeight: isCurrent ? "600" : "400"
            }
          },
            el("span", {}, `Kist ${inst.no}`),
            el("span", {}, formatDate(planDate(inst.dueDate))),
            el("span", {}, money(inst.amount)));
        })),
      el("p", { style: { margin: ".4rem 0 0", fontSize: ".76rem", color: "var(--text-muted)" } },
        due ? `Abhi kist ${due.no} chal rahi hai — ${money(due.remaining)} baaki.`
            : "Saari kisten jama ho chuki hain."));
  };

  const firstInput = form.elements.planFirst;
  if (plan.length) {
    form.elements.planCount.value = String(plan.length);
    firstInput.value = plan[0].dueDate;
  } else {
    const d = new Date(); d.setDate(d.getDate() + 7);
    firstInput.value = planDateStr(d);
  }
  showPlan();

  form.querySelector("#stuPlanBtn").addEventListener("click", () => {
    const next = buildPlan(
      s.totalFee || 0,
      form.elements.planCount.value,
      firstInput.value,
      form.elements.planGap.value
    );
    if (!next.length) return toast.warning("Pehle total fee aur pehli kist ki tareekh sahi karein.");
    plan = next;
    showPlan();
    toast.info("Schedule ban gaya — niche Save dabana na bhoolein.");
  });

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
      status: form.elements.status.value,
      feePlan: plan,
      // Student dashboard "Agli due date" isi field se dikhata hai
      nextDueDate: nextDueFrom({ ...s, feePlan: plan })
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
