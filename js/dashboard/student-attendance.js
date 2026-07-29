/* ==========================================================================
   Soft Skill Zone — Student: Attendance
   ========================================================================== */

import { $, el, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { pct } from "../core/utils.js";
import { initShell } from "./shell.js";
import * as data from "./student-data.js";
import { DEMO_STUDENT, DEMO_ATTENDANCE } from "./demo-data.js";

const STATUS_META = {
  present: { label: "Present", cls: "badge-success" },
  absent:  { label: "Absent",  cls: "badge-danger" },
  late:    { label: "Late",    cls: "badge-warning" },
  leave:   { label: "Leave",   cls: "badge-accent" }
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function tile(ic, value, label, tone) {
  return el("div", { class: `stat-tile stat-tile--${tone}` },
    el("div", { class: "stat-tile__icon", html: icon(ic, { size: 22 }) }),
    el("div", {},
      el("div", { class: "stat-tile__value" }, value),
      el("div", { class: "stat-tile__label" }, label)
    )
  );
}

/* ---------------- boot ---------------- */
const { user, mode } = await initShell({ active: "attendance", title: "Attendance" });

let rows;
if (mode === "preview") {
  rows = [...DEMO_ATTENDANCE].reverse();   // newest first
} else {
  const student = await data.getStudent(user);
  rows = student ? await data.getAttendance(student) : [];
}

const count = (s) => rows.filter((r) => r.status === s).length;
const attended = count("present") + count("late");

render($("#attStats"),
  tile("trending", rows.length ? pct(attended, rows.length, 0) : "—", "Overall Attendance", "success"),
  tile("checkCircle", String(count("present")), "Present", "success"),
  tile("xCircle", String(count("absent")), "Absent", "danger"),
  tile("clock", String(count("late") + count("leave")), "Late / Leave", "warning")
);

/* month filter */
const months = [...new Set(rows.map((r) => r.date?.slice(0, 7)).filter(Boolean))].sort().reverse();
const monthName = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const select = $("#attMonth");
select.appendChild(el("option", { value: "all" }, "Saare mahine"));
months.forEach((m) => select.appendChild(el("option", { value: m }, monthName(m))));

function paint(month) {
  const list = month === "all" ? rows : rows.filter((r) => r.date?.startsWith(month));
  if (!list.length) {
    render($("#attRows"), el("tr", {}, el("td", { colspan: "3", style: { textAlign: "center", padding: "2rem", color: "var(--text-muted)" } },
      "Is period ka koi record nahi hai.")));
    return;
  }
  render($("#attRows"), list.map((r) => {
    const d = new Date(`${r.date}T00:00:00`);
    const meta = STATUS_META[r.status] || { label: r.status, cls: "" };
    return el("tr", {},
      el("td", {}, d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })),
      el("td", {}, DAYS[d.getDay()]),
      el("td", {}, el("span", { class: `badge-ssz badge-dot ${meta.cls}` }, meta.label))
    );
  }));
}

paint("all");
select.addEventListener("change", () => paint(select.value));
