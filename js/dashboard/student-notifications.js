/* ==========================================================================
   Soft Skill Zone — Student: Notifications
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { timeAgo } from "../core/utils.js";
import { initShell, setNotifyCount } from "./shell.js";
import * as data from "./student-data.js";
import { DEMO_STUDENT, DEMO_NOTIFICATIONS } from "./demo-data.js";
import toast from "../core/toast.js";

const TYPE_META = {
  general: { icon: "bell",     cls: "badge-brand",   label: "General" },
  fee:     { icon: "wallet",   cls: "badge-warning", label: "Fee" },
  class:   { icon: "video",    cls: "badge-accent",  label: "Class" },
  exam:    { icon: "clipboard",cls: "badge-danger",  label: "Exam" },
  holiday: { icon: "calendar", cls: "badge-success", label: "Holiday" }
};

let items = [], student, mode = "preview", filter = "all";

const isUnread = (n) => !(n.readBy || []).includes(student.studentId);

function row(n) {
  const meta = TYPE_META[n.type] || TYPE_META.general;
  const unread = isUnread(n);
  return el("div", {
    class: "card-ssz",
    style: unread ? { borderLeft: "3px solid var(--brand)" } : {}
  }, el("div", { class: "card-ssz__body", style: { display: "flex", gap: "1rem", padding: "1.1rem 1.25rem" } },
    el("span", { class: "stat-tile__icon", style: { width: "40px", height: "40px", flexShrink: 0 }, html: icon(meta.icon, { size: 19 }) }),
    el("span", { style: { flex: 1, minWidth: 0 } },
      el("span", { class: "between", style: { marginBottom: ".2rem", gap: ".5rem" } },
        el("strong", { style: { fontSize: ".92rem" } }, n.title),
        el("span", { style: { fontSize: ".72rem", color: "var(--text-muted)", whiteSpace: "nowrap" } }, timeAgo(n.createdAt))
      ),
      el("span", { style: { display: "block", fontSize: ".84rem", color: "var(--text-secondary)", marginBottom: ".5rem" } }, n.message),
      el("span", { class: "cluster", style: { gap: ".4rem" } },
        el("span", { class: `badge-ssz ${meta.cls}` }, meta.label),
        unread ? el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", type: "button", style: { minHeight: "28px", padding: ".2rem .6rem" }, dataset: { read: n.id } }, "Padh liya") : null
      )
    )
  ));
}

function paint() {
  const list = filter === "all" ? items
    : filter === "unread" ? items.filter(isUnread)
    : items.filter((n) => n.type === filter);

  if (!list.length) {
    render($("#ntfList"), el("div", { class: "empty-state" },
      el("div", { class: "empty-state__icon", html: icon("bell", { size: 32 }) }),
      el("h2", {}, "Koi notification nahi"),
      el("p", {}, "Nayi soochna aate hi yahan dikhegi.")
    ));
  } else {
    render($("#ntfList"), list.map(row));
  }
  setNotifyCount(items.filter(isUnread).length);
}

function paintFilters() {
  const filters = [
    { v: "all", l: "Sab" }, { v: "unread", l: "Unread" },
    ...Object.entries(TYPE_META).map(([v, m]) => ({ v, l: m.label }))
  ];
  render($("#ntfFilters"), filters.map((f) =>
    el("button", { type: "button", class: `chip${f.v === filter ? " is-active" : ""}`, dataset: { f: f.v } }, f.l)
  ));
}

/* ---------------- boot ---------------- */
const shell = await initShell({ active: "notifications", title: "Notifications" });
mode = shell.mode;

if (mode === "preview") {
  student = DEMO_STUDENT; items = DEMO_NOTIFICATIONS.map((n) => ({ ...n, readBy: [...n.readBy] }));
} else {
  student = await data.getStudent(shell.user) || { studentId: shell.user.studentId || shell.user.uid };
  items = await data.getNotifications(student);
}

paintFilters();
paint();

on($("#ntfFilters"), "click", ".chip", (e, chip) => {
  filter = chip.dataset.f;
  paintFilters();
  paint();
});

on($("#ntfList"), "click", "[data-read]", async (e, btn) => {
  const n = items.find((x) => x.id === btn.dataset.read);
  if (!n) return;
  n.readBy = [...(n.readBy || []), student.studentId];
  if (mode === "live") {
    data.markNotificationRead(n.id, student.studentId).catch(() => toast.error("Sync nahi ho paya — dobara try karein."));
  }
  paint();
});
