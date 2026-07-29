/* ==========================================================================
   Soft Skill Zone — Admin: Overview
   ========================================================================== */

import { $, el, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { money, timeAgo, sum, groupBy } from "../core/utils.js";
import { url } from "../core/routes.js";
import { initAdminShell, watchPendingAdmissions } from "./admin-shell.js";
import { DEMO_ADMISSIONS, DEMO_STUDENTS, DEMO_FEE_ROWS, DEMO_ENQUIRIES } from "./admin-demo.js";
import { COLLECTIONS } from "../core/constants.js";

function tile(ic, value, label, tone, href) {
  const t = el(href ? "a" : "div", { class: `stat-tile stat-tile--${tone}`, href: href || null },
    el("div", { class: "stat-tile__icon", html: icon(ic, { size: 22 }) }),
    el("div", {},
      el("div", { class: "stat-tile__value" }, value),
      el("div", { class: "stat-tile__label" }, label)
    )
  );
  return t;
}

const { mode } = await initAdminShell({ active: "home", title: "Overview" });

let students = [], fees = [], enquiries = [], pendingApps = [];

if (mode === "preview") {
  students = [...DEMO_STUDENTS];
  fees = [...DEMO_FEE_ROWS];
  enquiries = [...DEMO_ENQUIRIES];
  pendingApps = DEMO_ADMISSIONS.filter((a) => a.status === "pending");
} else {
  const { getMany } = await import("../../firebase/db-service.js");
  [students, fees, enquiries] = await Promise.all([
    getMany(COLLECTIONS.STUDENTS, { limit: 500 }).catch(() => []),
    getMany(COLLECTIONS.FEES, { orderBy: ["paidOn", "desc"], limit: 200, useCache: false }).catch(() => []),
    getMany(COLLECTIONS.ENQUIRIES, { where: [["isRead", "==", false]], limit: 50, useCache: false }).catch(() => [])
  ]);
}

/* Month collection */
const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
const toMs = (v) => v?.toDate ? v.toDate().getTime() : v?.seconds ? v.seconds * 1000 : v ? new Date(v).getTime() : 0;
const monthTotal = sum(fees.filter((f) => f.status === "paid" && toMs(f.paidOn) >= monthStart.getTime()), "amount");
const activeStudents = students.filter((s) => s.status === "active");
const totalPending = sum(activeStudents, "pendingFee");

function paintStats(pendingCount) {
  render($("#adminStats"),
    tile("users", String(activeStudents.length), "Active Students", "success", url("adminStudents")),
    tile("userPlus", String(pendingCount), "Pending Admissions", pendingCount ? "warning" : "success", url("adminAdmissions")),
    tile("rupee", money(monthTotal), "Is mahine ka collection", "accent"),
    tile("alert", money(totalPending), "Kul bakaya fees", totalPending ? "danger" : "success"),
    tile("mail", String(enquiries.length), "Nayi enquiries", enquiries.length ? "warning" : "success")
  );
}

function paintApps(rows) {
  if (!rows.length) {
    render($("#recentApps"), el("div", { class: "card-ssz" }, el("div", { class: "card-ssz__body" },
      el("p", { style: { margin: 0, fontSize: ".88rem", color: "var(--text-muted)" } },
        "Abhi koi pending application nahi. Nayi application aate hi yahan turant dikhegi."))));
    return;
  }
  render($("#recentApps"), rows.slice(0, 5).map((a) =>
    el("a", { class: "search-result", href: url("adminAdmissions"), style: { marginBottom: 0 } },
      el("span", { class: "search-result__icon", html: icon("userPlus", { size: 20 }) }),
      el("span", { style: { flex: 1 } },
        el("h3", { style: { margin: "0 0 .2rem", fontSize: "1rem" } }, a.fullName),
        el("p", { style: { margin: 0 } }, `${a.courseName} · ${a.mobile} · ${timeAgo(a.createdAt)}`)
      ),
      a.isRead ? null : el("span", { class: "badge-ssz badge-danger badge-dot" }, "New")
    )
  ));
}

/* course-wise table */
const byCourse = groupBy(activeStudents, "courseName");
const courseRows = Object.entries(byCourse)
  .map(([course, list]) => ({ course, count: list.length, pending: sum(list, "pendingFee") }))
  .sort((a, b) => b.count - a.count);

render($("#courseRows"), courseRows.length
  ? courseRows.map((r) => el("tr", {},
      el("td", { style: { fontWeight: 600, color: "var(--text-primary)" } }, r.course),
      el("td", { class: "num" }, String(r.count)),
      el("td", { class: "num" }, money(r.pending))
    ))
  : el("tr", {}, el("td", { colspan: "3", style: { textAlign: "center", padding: "2rem", color: "var(--text-muted)" } },
      "Abhi koi active student nahi hai.")));

/* realtime pending apps drive both the tile and the list */
watchPendingAdmissions((rows) => {
  pendingApps = rows;
  paintStats(rows.length);
  paintApps(rows);
});
paintStats(pendingApps.length);
paintApps(pendingApps);
