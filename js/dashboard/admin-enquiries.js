/* ==========================================================================
   Soft Skill Zone — Admin: Enquiries inbox (contact-form submissions)
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { timeAgo, formatPhone, whatsappLink } from "../core/utils.js";
import { confirm as confirmModal } from "../core/modal.js";
import { initAdminShell } from "./admin-shell.js";
import { DEMO_ENQUIRIES } from "./admin-demo.js";
import { COLLECTIONS } from "../core/constants.js";
import toast from "../core/toast.js";

let mode = "preview", items = [], filter = "unread";

function row(q) {
  return el("div", { class: "card-ssz", style: !q.isRead ? { borderLeft: "3px solid var(--brand)" } : {} },
    el("div", { class: "card-ssz__body", style: { padding: "1.1rem 1.25rem" } },
      el("div", { class: "between", style: { flexWrap: "wrap", gap: ".5rem", marginBottom: ".3rem" } },
        el("strong", { style: { fontSize: ".92rem" } },
          q.name, " ", !q.isRead ? el("span", { class: "badge-ssz badge-danger", style: { marginLeft: ".3rem" } }, "New") : null),
        el("span", { style: { fontSize: ".74rem", color: "var(--text-muted)" } }, timeAgo(q.createdAt))),
      el("p", { style: { margin: "0 0 .3rem", fontSize: ".8rem", color: "var(--text-muted)" } },
        `${formatPhone(q.mobile)}${q.email ? ` · ${q.email}` : ""} · ${q.subject || "General"}`),
      el("p", { style: { margin: "0 0 .75rem", fontSize: ".86rem" } }, q.message),
      el("div", { class: "cluster" },
        el("a", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", href: `tel:+91${(q.mobile || "").slice(-10)}` }, "Call"),
        el("a", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", target: "_blank", rel: "noopener",
          href: whatsappLink(q.mobile, `Namaste ${q.name}! Soft Skill Zone se. Aapne poochha tha: "${(q.message || "").slice(0, 80)}"`) }, "WhatsApp"),
        !q.isRead ? el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", type: "button", dataset: { read: q.id } }, "Padh liya") : null,
        el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", style: { color: "var(--danger)" }, type: "button", dataset: { del: q.id } }, "Delete"))
    ));
}

function paint() {
  const list = filter === "all" ? items : filter === "unread" ? items.filter((q) => !q.isRead) : items.filter((q) => q.isRead);
  render($("#enqList"), list.length ? list.map(row)
    : el("div", { class: "empty-state" },
        el("div", { class: "empty-state__icon", html: icon("mail", { size: 32 }) }),
        el("h2", {}, "Inbox khaali hai"),
        el("p", {}, "Website ke Contact form se aayi enquiries yahan dikhengi.")));
}

function paintFilters() {
  const F = [["unread", "Unread"], ["read", "Padh li"], ["all", "Sab"]];
  render($("#enqFilters"), F.map(([v, l]) => {
    const count = v === "all" ? items.length : v === "unread" ? items.filter((q) => !q.isRead).length : items.filter((q) => q.isRead).length;
    return el("button", { type: "button", class: `chip${v === filter ? " is-active" : ""}`, dataset: { f: v } }, `${l} (${count})`);
  }));
}

/* ---------------- boot ---------------- */
const shell = await initAdminShell({ active: "enquiries", title: "Enquiries" });
mode = shell.mode;

if (mode === "preview") {
  items = DEMO_ENQUIRIES.map((q) => ({ ...q }));
} else {
  const { getMany } = await import("../../firebase/db-service.js");
  items = await getMany(COLLECTIONS.ENQUIRIES, { orderBy: ["createdAt", "desc"], limit: 100, useCache: false }).catch(() => []);
}

paintFilters(); paint();

on($("#enqFilters"), "click", ".chip", (e, chip) => { filter = chip.dataset.f; paintFilters(); paint(); });

on($("#enqList"), "click", "[data-read]", async (e, btn) => {
  const q = items.find((x) => x.id === btn.dataset.read);
  if (!q) return;
  q.isRead = true;
  if (mode === "live") {
    try {
      const { update } = await import("../../firebase/db-service.js");
      await update(COLLECTIONS.ENQUIRIES, q.id, { isRead: true });
    } catch { /* non-fatal */ }
  }
  paintFilters(); paint();
});

on($("#enqList"), "click", "[data-del]", async (e, btn) => {
  const q = items.find((x) => x.id === btn.dataset.del);
  if (!q) return;
  const ok = await confirmModal({ title: "Enquiry delete karein?", message: `${q.name} ki enquiry hamesha ke liye hat jaayegi.`, danger: true, confirmText: "Haan" });
  if (!ok) return;
  if (mode === "live") {
    try {
      const { remove } = await import("../../firebase/db-service.js");
      await remove(COLLECTIONS.ENQUIRIES, q.id);
    } catch (err) { return toast.error(err.message || "Fail ho gaya."); }
  }
  items = items.filter((x) => x.id !== q.id);
  paintFilters(); paint();
  toast.success("Delete ho gaya.");
});
