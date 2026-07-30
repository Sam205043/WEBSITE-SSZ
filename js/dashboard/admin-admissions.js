/* ==========================================================================
   Soft Skill Zone — Admin: Admissions Inbox
   Realtime list, application detail, approve (generates the Student ID and
   creates the student record atomically-numbered) or reject with remarks.
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { money, formatDate, formatDateTime, timeAgo, formatPhone, whatsappLink } from "../core/utils.js";
import { open as openModal, confirm as confirmModal, prompt as promptModal } from "../core/modal.js";
import { initAdminShell, watchPendingAdmissions, setAdmissionBadge } from "./admin-shell.js";
import { DEMO_ADMISSIONS } from "./admin-demo.js";
import { COLLECTIONS, ID_FORMATS, ADMISSION_STATUS, STUDENT_STATUS } from "../core/constants.js";
import { getCourseCode } from "../config/site-data.js";
import toast from "../core/toast.js";

let mode = "preview";
let all = [];          // full list (all statuses)
let filter = "pending";

const FILTERS = [
  { v: "pending", l: "Pending" },
  { v: "approved", l: "Approved" },
  { v: "rejected", l: "Rejected" },
  { v: "all", l: "Sab" }
];

/* ==========================================================================
   List rendering
   ========================================================================== */
const STATUS_BADGE = {
  pending:  ["badge-warning", "Pending"],
  approved: ["badge-success", "Approved"],
  rejected: ["badge-danger",  "Rejected"]
};

function row(a) {
  const [cls, label] = STATUS_BADGE[a.status] || ["", a.status];
  return el("div", { class: "card-ssz", style: !a.isRead && a.status === "pending" ? { borderLeft: "3px solid var(--brand)" } : {} },
    el("div", { class: "card-ssz__body", style: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", padding: "1.1rem 1.25rem" } },
      el("span", { class: "avatar avatar-md avatar-fallback", style: { flexShrink: 0 } },
        (a.fullName || "?").trim()[0]?.toUpperCase() || "?"),
      el("span", { style: { flex: 1, minWidth: "220px" } },
        el("strong", { style: { display: "block", fontSize: ".95rem" } },
          a.fullName, " ",
          !a.isRead && a.status === "pending" ? el("span", { class: "badge-ssz badge-danger", style: { marginLeft: ".4rem" } }, "New") : null,
          a.documentsPending ? el("span", { class: "badge-ssz badge-warning", style: { marginLeft: ".4rem" } }, "Docs pending") : null),
        el("span", { style: { fontSize: ".8rem", color: "var(--text-muted)" } },
          `${a.applicationNo} · ${a.courseName} · ${formatPhone(a.mobile)} · ${timeAgo(a.createdAt)}`)
      ),
      el("span", { class: `badge-ssz badge-dot ${cls}` }, label),
      el("button", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", type: "button", dataset: { view: a.id } }, "Kholein")
    )
  );
}

function paint() {
  const list = filter === "all" ? all : all.filter((a) => a.status === filter);
  if (!list.length) {
    render($("#appList"), el("div", { class: "empty-state" },
      el("div", { class: "empty-state__icon", html: icon("userPlus", { size: 32 }) }),
      el("h4", {}, filter === "pending" ? "Inbox khaali hai!" : "Yahan kuch nahi hai"),
      el("p", {}, filter === "pending"
        ? "Nayi application aate hi yahan turant dikhegi — page refresh ki zaroorat nahi."
        : "Is filter me koi application nahi.")
    ));
    return;
  }
  render($("#appList"), list.map(row));
}

function paintFilters() {
  render($("#appFilters"), FILTERS.map((f) => {
    const count = f.v === "all" ? all.length : all.filter((a) => a.status === f.v).length;
    return el("button", { type: "button", class: `chip${f.v === filter ? " is-active" : ""}`, dataset: { f: f.v } },
      `${f.l} (${count})`);
  }));
}

/* ==========================================================================
   Detail + actions
   ========================================================================== */
function detailBody(a) {
  const rows = (pairs) => el("dl", { style: { margin: 0 } },
    ...pairs.map(([k, v]) => el("div", { class: "verify-row" }, el("dt", {}, k), el("dd", {}, v || "—"))));

  /* The admission form uploads files but never asks for their download URL —
     it has no permission to read that folder back. The admin does, so the
     URL is resolved here, on demand. */
  async function resolveUrl(path) {
    if (!path) return "";
    try {
      const { storage, storageRef, getDownloadURL } = await import("../../firebase/firebase-init.js");
      return await getDownloadURL(storageRef(storage, path));
    } catch (err) {
      console.warn("[admissions] file link nahi mila:", path, err);
      return "";
    }
  }

  const body = el("div", {});
  if (a.photoURL || a.photoPath) {
    const img = el("img", {
      src: a.photoURL || "", alt: a.fullName,
      style: { width: "96px", height: "116px", objectFit: "cover", borderRadius: "10px", marginBottom: "1rem", border: "1px solid var(--border-subtle)", background: "var(--bg-surface-2)" }
    });
    body.appendChild(img);
    if (!a.photoURL) resolveUrl(a.photoPath).then((u) => { if (u) img.src = u; });
  }
  body.appendChild(rows([
    ["Application No.", a.applicationNo],
    ["Naam", a.fullName],
    ["Pita / Mata", `${a.fatherName} / ${a.motherName}`],
    ["DOB · Gender", `${a.dob} · ${a.gender}`],
    ["Mobile / WhatsApp", `${formatPhone(a.mobile)} / ${formatPhone(a.whatsapp)}`],
    ["Email", a.email],
    ["Address", `${a.address}, ${a.city} - ${a.pincode}`],
    ["Qualification", a.qualification],
    ["Course", `${a.courseName} (${money(a.courseFee || 0)} + ${money(a.admissionFee || 0)})`],
    ["Batch preference", a.batchPref],
    ["Submitted", formatDateTime(a.createdAt)],
    a.status === "approved" ? ["Student ID", a.studentId] : null,
    a.status === "rejected" ? ["Reject remarks", a.remarks] : null
  ].filter(Boolean)));

  if (a.documentsPending) {
    body.appendChild(el("div", { class: "tool-note", style: { marginTop: "1rem" } },
      el("span", { html: icon("alert", { size: 17 }) }),
      el("span", {},
        el("strong", {}, "Photo aur documents online upload nahi hue. "),
        "Student ko WhatsApp par bhejne ko kaha gaya tha — inbox check kar lein. ",
        "(File upload chalu karne ke liye Firebase par Cloud Storage enable karna hoga.)")
    ));
  }

  if (a.documents?.length) {
    body.appendChild(el("p", { style: { margin: "1rem 0 .4rem", fontWeight: 600, fontSize: ".85rem" } }, "Documents"));
    body.appendChild(el("div", { class: "cluster" },
      ...a.documents.map((d) => {
        const link = el("a", {
          class: "btn-ssz btn-ghost-ssz btn-sm-ssz",
          href: d.url || "#", target: "_blank", rel: "noopener"
        }, el("span", { html: icon("fileText", { size: 15 }) }), d.name);
        if (!d.url && d.path) {
          link.setAttribute("aria-busy", "true");
          resolveUrl(d.path).then((u) => {
            if (u) { link.href = u; link.removeAttribute("aria-busy"); }
            else { link.textContent = `${d.name} — link nahi mila`; }
          });
        }
        return link;
      })
    ));
  }
  return body;
}

async function markRead(a) {
  if (a.isRead || mode === "preview") return;
  try {
    const { update } = await import("../../firebase/db-service.js");
    await update(COLLECTIONS.ADMISSIONS, a.id, { isRead: true });
  } catch { /* non-fatal */ }
}

/**
 * Approve: sequence -> Student ID -> students/{id} -> admission update.
 * The counter transaction guarantees two admins can never mint the same ID.
 */
async function approve(a, modal) {
  const ok = await confirmModal({
    title: "Application approve karein?",
    message: `${a.fullName} ka admission ${a.courseName} me confirm hoga aur Student ID ban jaayegi.`,
    confirmText: "Haan, approve karein"
  });
  if (!ok) return;

  if (mode === "preview") {
    toast.info("Preview mode: Firebase ke baad yahan asli Student ID banegi.");
    return;
  }

  try {
    const { nextSequence, createWithId, update } = await import("../../firebase/db-service.js");
    const year = new Date().getFullYear();
    const code = getCourseCode(a.courseId);
    const seq = await nextSequence(`students-${year}-${code}`);
    const studentId = ID_FORMATS.student(year, code, seq);

    await createWithId(COLLECTIONS.STUDENTS, studentId, {
      studentId,
      uid: "",                                 // linked when the student signs up / by admin
      rollNo: String(seq).padStart(2, "0"),
      admissionId: a.id,
      fullName: a.fullName, fatherName: a.fatherName, motherName: a.motherName,
      dob: a.dob, gender: a.gender,
      mobile: a.mobile, whatsapp: a.whatsapp,
      // Lower-cased so it matches the Firebase Auth email when the student
      // links this record to their login. Older admissions may hold mixed case.
      email: (a.email || "").trim().toLowerCase(),
      address: `${a.address}, ${a.city} - ${a.pincode}`,
      qualification: a.qualification,
      courseId: a.courseId, courseName: a.courseName,
      batchId: a.batchId || "", batchName: "", batchPref: a.batchPref || "",
      photoURL: a.photoURL || "", documents: a.documents || [],
      admissionDate: new Date(),
      status: STUDENT_STATUS.ACTIVE,
      totalFee: (a.courseFee || 0) + (a.admissionFee || 0),
      paidFee: 0,
      pendingFee: (a.courseFee || 0) + (a.admissionFee || 0),
      nextDueDate: null
    });

    await update(COLLECTIONS.ADMISSIONS, a.id, {
      status: ADMISSION_STATUS.APPROVED, studentId, isRead: true
    });

    modal.close();
    toast.success(`Approve ho gaya! Student ID: ${studentId}`, { duration: 7000 });

    // One-click WhatsApp to inform the student
    const wa = whatsappLink(a.whatsapp || a.mobile,
      `Namaste ${a.fullName}! Soft Skill Zone me aapka admission confirm ho gaya hai.\n` +
      `Student ID: ${studentId}\nCourse: ${a.courseName}\n` +
      `Ab website par is ID se student account bana lein. Dhanyavaad!`);
    window.open(wa, "_blank", "noopener");
  } catch (err) {
    console.error(err);
    toast.error(err.message || "Approve fail ho gaya — dobara try karein.");
  }
}

async function reject(a, modal) {
  const remarks = await promptModal({
    title: "Reject karein?",
    label: "Wajah (student ko batane ke liye)",
    placeholder: "Jaise: documents adhoore hain — office aakar poora karein",
    confirmText: "Reject karein"
  });
  if (remarks === null) return;

  if (mode === "preview") {
    toast.info("Preview mode: Firebase ke baad asli reject hoga.");
    return;
  }

  try {
    const { update } = await import("../../firebase/db-service.js");
    await update(COLLECTIONS.ADMISSIONS, a.id, {
      status: ADMISSION_STATUS.REJECTED, remarks, isRead: true
    });
    modal.close();
    toast.success("Application reject ho gayi.");
  } catch (err) {
    toast.error(err.message || "Reject fail ho gaya.");
  }
}

function openDetail(a) {
  markRead(a);
  a.isRead = true;
  paint(); paintFilters();
  setAdmissionBadge(all.filter((x) => x.status === "pending" && !x.isRead).length);

  const footer = [];
  const callBtn = el("a", { class: "btn-ssz btn-ghost-ssz", href: `tel:+91${(a.mobile || "").slice(-10)}` }, "Call");
  const waBtn = el("a", {
    class: "btn-ssz btn-secondary-ssz",
    href: whatsappLink(a.whatsapp || a.mobile, `Namaste ${a.fullName}! Soft Skill Zone se — aapki admission application (${a.applicationNo}) ke baare me.`),
    target: "_blank", rel: "noopener"
  }, "WhatsApp");
  footer.push(callBtn, waBtn);

  if (a.status === "pending") {
    const rejectBtn = el("button", { class: "btn-ssz btn-danger-ssz", type: "button" }, "Reject");
    const approveBtn = el("button", { class: "btn-ssz btn-success-ssz", type: "button" }, "Approve + ID banayein");
    footer.push(rejectBtn, approveBtn);
    const m = openModal({ title: a.fullName, size: "lg", body: detailBody(a), footer });
    rejectBtn.addEventListener("click", () => reject(a, m));
    approveBtn.addEventListener("click", () => approve(a, m));
  } else {
    openModal({ title: a.fullName, size: "lg", body: detailBody(a), footer });
  }
}

/* ==========================================================================
   Boot
   ========================================================================== */
const shell = await initAdminShell({ active: "admissions", title: "Admissions Inbox" });
mode = shell.mode;

async function loadAll() {
  if (mode === "preview") {
    all = DEMO_ADMISSIONS.map((a) => ({ ...a }));
  } else {
    const { getMany } = await import("../../firebase/db-service.js");
    all = await getMany(COLLECTIONS.ADMISSIONS, {
      orderBy: ["createdAt", "desc"], limit: 100, useCache: false
    });
  }
  paintFilters();
  paint();
}

await loadAll();

/* realtime: pending set updates merge into the full list */
watchPendingAdmissions((rows) => {
  const others = all.filter((a) => a.status !== "pending");
  const merged = [...rows, ...others];
  // keep newest-first ordering
  all = merged;
  paintFilters();
  paint();
});

on($("#appFilters"), "click", ".chip", (e, chip) => {
  filter = chip.dataset.f;
  paintFilters();
  paint();
});

on($("#appList"), "click", "[data-view]", (e, btn) => {
  const a = all.find((x) => x.id === btn.dataset.view);
  if (a) openDetail(a);
});
