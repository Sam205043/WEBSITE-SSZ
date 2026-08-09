/* ==========================================================================
   Soft Skill Zone — Student: Attendance
   ========================================================================== */

import { $, el, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { pct } from "../core/utils.js";
import { initShell } from "./shell.js";
import * as data from "./student-data.js";
import toast from "../core/toast.js";
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
/* Ek bhi query mana ho jaye (rule badla ho, index thanda ho, ya account
   abhi kisi student record se juda hi na ho) to page KHAALI nahi chhodna.
   Ye file top-level `await` par chalti hai — matlab reject hote hi poora
   module wahin ruk jaata tha aur student ko bilkul khaali page milta tha,
   bina ye jaane ki hua kya. Ab list khaali dikhti hai aur ek saaf sandesh
   chala jaata hai. */
  const student = await data.getStudent(user).catch(() => null);
  rows = student
    ? await data.getAttendance(student).catch((err) => {
        console.error("[attendance] load nahi hui:", err);
        toast.warning("Haazri ka record abhi nahi khul paya. Agar ye baar-baar ho to institute ko bata dein.", { duration: 9000 });
        return [];
      })
    : [];
}

const count = (s) => rows.filter((r) => r.status === s).length;
const attended = count("present") + count("late");

render($("#attStats"),
  /* "Overall" tabhi likhte hain jab sach me poora ho.

     student-data.js aakhri 120 haazri hi laata hai (roz class wale batch me
     kareeb paanch mahina). Utne record aa gaye ho to ye ginti poore course
     ki nahi hai — aur "Overall" likhna use jhootha bana deta hai, khaaskar
     tab jab shuru me haazri kamzor rahi ho aur baad me sudhri ho. Aisi
     halat me hum saaf likh dete hain ki kitne tak ki ginti hai. */
  tile("trending", rows.length ? pct(attended, rows.length, 0) : "—",
       rows.length >= 120 ? "Attendance (aakhri 120 class)" : "Overall Attendance", "success"),
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
