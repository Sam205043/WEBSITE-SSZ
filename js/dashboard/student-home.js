/* ==========================================================================
   Soft Skill Zone — Student Dashboard: Overview
   ========================================================================== */

import { $, el, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { money, formatDate, formatDateTime, timeAgo, pct, toDate } from "../core/utils.js";
import { initShell, setNotifyCount } from "./shell.js";
import * as data from "./student-data.js";
import {
  DEMO_STUDENT, DEMO_CLASSES, DEMO_ATTENDANCE, DEMO_ASSIGNMENTS,
  DEMO_SUBMISSIONS, DEMO_NOTIFICATIONS
} from "./demo-data.js";
import { getCourse } from "../config/site-data.js";
import { url } from "../core/routes.js";

function statTile({ icon: ic, value, label, tone = "" }) {
  return el("div", { class: `stat-tile${tone ? ` stat-tile--${tone}` : ""}` },
    el("div", { class: "stat-tile__icon", html: icon(ic, { size: 22 }) }),
    el("div", {},
      el("div", { class: "stat-tile__value" }, value),
      el("div", { class: "stat-tile__label" }, label)
    )
  );
}

function nextClassCard(cls) {
  const box = $("#homeNextClass");
  if (!cls) {
    render(box, el("div", { class: "card-ssz" }, el("div", { class: "card-ssz__body" },
      el("h2", { style: { marginBottom: ".4rem", fontSize: "1.1rem" } }, "Koi upcoming class nahi"),
      el("p", { style: { margin: 0, fontSize: ".88rem" } }, "Nayi class schedule hote hi yahan dikhegi — notification bhi aayegi.")
    )));
    return;
  }
  const started = toDate(cls.startsAt)?.getTime() <= Date.now() && toDate(cls.endsAt)?.getTime() >= Date.now();
  render(box,
    el("div", { class: "live-card" },
      el("span", { class: "live-badge" }, started ? "Live Now" : "Next Class"),
      el("h2", { style: { margin: ".9rem 0 .3rem", fontSize: "1.1rem" } }, cls.title),
      el("p", { style: { margin: "0 0 1.25rem", fontSize: ".85rem" } },
        `${formatDateTime(cls.startsAt)} · ${cls.facultyName || ""}`),
      el("a", {
        class: "btn-ssz", style: { background: "#fff", color: "var(--ssz-indigo-700)" },
        href: cls.meetLink, target: "_blank", rel: "noopener"
      }, started ? "JOIN LIVE CLASS" : "Meet Link Kholein",
        el("span", { html: icon("externalLink", { size: 16 }) }))
    )
  );
}

function assignmentRow(a, submission) {
  const due = toDate(a.dueDate);
  const overdue = due && due.getTime() < Date.now() && !submission;
  return el("a", { class: "search-result", href: url("studentAssignments"), style: { marginBottom: 0 } },
    el("span", { class: "search-result__icon", html: icon("clipboard", { size: 20 }) }),
    el("span", { style: { flex: 1 } },
      el("h3", { style: { margin: "0 0 .2rem", fontSize: "1rem" } }, a.title),
      el("p", { style: { margin: 0 } }, `Due: ${formatDate(a.dueDate)} · ${a.totalMarks} marks`)
    ),
    submission
      ? el("span", { class: "badge-ssz badge-success" }, submission.status === "graded" ? `${submission.marks}/${a.totalMarks}` : "Submitted")
      : el("span", { class: `badge-ssz ${overdue ? "badge-danger" : "badge-warning"}` }, overdue ? "Overdue" : "Pending")
  );
}

function courseCardBox(student) {
  const course = getCourse(student.courseId);
  render($("#homeCourseCard"),
    el("div", { class: "card-ssz has-accent" }, el("div", { class: "card-ssz__body" },
      el("p", { class: "eyebrow", style: { marginBottom: ".5rem" } }, "Mera Course"),
      el("h3", { style: { marginBottom: ".35rem", fontSize: "1.05rem" } }, student.courseName),
      el("p", { style: { fontSize: ".85rem", marginBottom: "1rem" } },
        `${student.batchName || student.batchId || ""} · Roll No. ${student.rollNo || "—"}`),
      course ? el("a", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", href: url("courseDetail", { id: course.id }) }, "Syllabus dekhein") : null
    ))
  );
}

function notifyRow(n) {
  return el("div", { class: "card-ssz" }, el("div", { class: "card-ssz__body", style: { padding: "1rem 1.25rem" } },
    el("div", { class: "between", style: { marginBottom: ".25rem" } },
      el("strong", { style: { fontSize: ".9rem" } }, n.title),
      el("span", { class: "badge-ssz", style: { fontSize: ".62rem" } }, timeAgo(n.createdAt))
    ),
    el("p", { style: { margin: 0, fontSize: ".82rem" } }, n.message)
  ));
}

/* ---------------- boot ---------------- */
const { user, mode } = await initShell({ active: "home", title: "Overview" });

let student, classes, attendance, assignments, submissions, notifications;

if (mode === "preview") {
  student = DEMO_STUDENT; classes = [...DEMO_CLASSES]; attendance = [...DEMO_ATTENDANCE];
  assignments = [...DEMO_ASSIGNMENTS]; submissions = [...DEMO_SUBMISSIONS]; notifications = [...DEMO_NOTIFICATIONS];
} else {
  student = await data.getStudent(user);
  if (!student) {
    /* Two different people land here, so offer both doors:
       - already admitted, has a Student ID → link it on the profile page
       - not admitted yet → fill the admission form */
    render($("#dashBody"), el("div", { class: "empty-state" },
      el("div", { class: "empty-state__icon", html: icon("user", { size: 32 }) }),
      el("h2", {}, "Student record abhi link nahi hua"),
      el("p", {}, "Aapka account ban gaya hai, par ye abhi kisi admission se juda nahi hai. Agar institute se Student ID mil chuka hai to niche se jod lein — warna pehle admission form bharein."),
      el("div", { class: "cluster", style: { marginTop: "1.25rem", justifyContent: "center", gap: ".75rem", flexWrap: "wrap" } },
        el("a", { class: "btn-ssz btn-primary-ssz", href: url("studentProfile") }, "Student ID Jodein"),
        el("a", { class: "btn-ssz btn-secondary-ssz", href: url("admission") }, "Online Admission")
      )
    ));
    throw new Error("no-student-record");
  }
  /* Settled, not all — this is the first screen a student sees, and one
     unlucky query (a rule change, a cold index) must not blank the page.
     A section that fails to load simply renders empty. */
  const loaders = [
    ["classes",       data.getClasses(student)],
    ["attendance",    data.getAttendance(student)],
    ["assignments",   data.getAssignments(student)],
    ["submissions",   data.getSubmissions(student)],
    ["notifications", data.getNotifications(student)]
  ];
  const settled = await Promise.allSettled(loaders.map(([, p]) => p));
  settled.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[dashboard] ${loaders[i][0]} load nahi hua:`, r.reason);
    }
  });
  [classes, attendance, assignments, submissions, notifications] =
    settled.map((r) => (r.status === "fulfilled" ? r.value : []));
}

/* stats */
const present = attendance.filter((a) => ["present", "late"].includes(a.status)).length;
const attPct = attendance.length ? pct(present, attendance.length, 0) : "—";
const pendingAsg = assignments.filter((a) => !submissions.some((s) => s.assignmentId === a.id)).length;
const unread = notifications.filter((n) => !(n.readBy || []).includes(student.studentId)).length;
setNotifyCount(unread);

render($("#homeStats"),
  statTile({ icon: "userCheck", value: attPct, label: "Attendance", tone: "success" }),
  statTile({ icon: "wallet", value: money(student.pendingFee || 0), label: "Pending Fees", tone: (student.pendingFee || 0) > 0 ? "warning" : "success" }),
  statTile({ icon: "clipboard", value: String(pendingAsg), label: "Assignments Due", tone: pendingAsg ? "danger" : "success" }),
  statTile({ icon: "bell", value: String(unread), label: "Nayi Notifications", tone: "accent" })
);

/* next / live class */
const upcoming = classes
  .filter((c) => c.status !== "cancelled" && toDate(c.endsAt)?.getTime() > Date.now())
  .sort((a, b) => toDate(a.startsAt) - toDate(b.startsAt));
nextClassCard(upcoming[0] || null);

/* recent assignments */
render($("#homeAssignments"),
  el("div", { class: "stack", style: { gap: ".75rem" } },
    ...assignments.slice(0, 3).map((a) => assignmentRow(a, submissions.find((s) => s.assignmentId === a.id)))
  )
);

courseCardBox(student);
render($("#homeNotify"), notifications.slice(0, 3).map(notifyRow));
