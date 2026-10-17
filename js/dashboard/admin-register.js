/* ==========================================================================
   Soft Skill Zone — Admin: Register (Offline)
   --------------------------------------------------------------------------
   Paper register wale students (SZA15xx), unki fees aur Google Form /
   Telegram wali enquiries Google Sheet "SSZ Institute Data" me rehti hain —
   wahi Sheet jise Telegram bot Nova padhta aur likhta hai. Ye page usi Sheet
   ko dikhata hai, taaki website ke admin panel se sab ek jagah dikhe.

   Data kaise aata hai:
     page -> Firebase login ka ID token -> Apps Script web app (doPost)
     Apps Script token se uid nikaalta hai, phir Firestore REST se users/{uid}
     padhta hai — Firestore khud token verify karta hai. role == "admin" ho
     tabhi Sheet ka data lautata hai. Koi secret browser me nahi hai.

   Likhna (fee jodna, admission) abhi bhi Telegram (Nova) ya Sheet se hota
   hai — ye page sirf dekhne ke liye hai.

   Fee pichhe ka niyam (Rule B, Nova aur Excel dashboard jaisa hi):
     kist = website ka hi niyam — admission par 10% (100 ke round figure, kam se
     kam 500), baaki barabar mahine-mahine (Duration_Months - 1) kist mein, max 9.
     Duration har student ki apni hai (Sheet ka Duration_Months column).
     pichhe = ab tak aana chahiye - ab tak mila   (sirf Active, baaki > 0)
     pichhe = ab tak aana chahiye - ab tak mila   (sirf Active, baaki > 0)
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { money, formatPhone, whatsappLink, telLink, debounce, digits } from "../core/utils.js";
import { open as openModal } from "../core/modal.js";
import { initAdminShell } from "./admin-shell.js";
import toast from "../core/toast.js";

const API = "https://script.google.com/macros/s/AKfycbzAyU3lMxRnHEam8sEuy8jJ1uWhhSMcSF5uRBI7sqG00JetyhHg3a-NatPignmTrjOrXQ/exec";
/** Kist plan — functions/index.js ke buildFeePlan aur Nova ke plan() jaisa */
function feePlan(net, months) {
  const total = Math.max(0, Math.round(net));
  if (!total) return null;
  const first = Math.min(total, Math.max(500, Math.ceil((total * 0.10) / 100) * 100));
  const k = Math.max(1, Math.min(9, (Number(months) || 12) - 1));
  const rest = total - first;
  const base = Math.floor(rest / k);
  return { total, first, n: k, base, extra: rest - base * k };
}
/** m mahine (30-30 din) baad tak kitna aa jaana chahiye tha */
const expectedBy = (p, m) => !p ? 0 : Math.min(p.total, p.first + (m >= 1 ? p.extra : 0) + Math.min(m, p.n) * p.base);
const INST = "Soft Skill Zone (Gym Town Pakri, Ara)";

const TABS = [
  ["due", "Fee pichhe"],
  ["students", "Students"],
  ["payments", "Payments"],
  ["enquiries", "Enquiries"],
  ["courses", "Courses"]
];

let mode = "preview";
let tab = "due", term = "", status = "Active";
let data = { students: [], payments: [], enquiries: [], courses: [], at: null };
let rows = [];   // students + hisaab

/* ---------------- helpers ---------------- */
const n = (v) => { const x = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return isNaN(x) ? 0 : x; };

/** "2026-03-05", "05/03/2026", Excel serial — sab ko local Date banao */
function pd(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v > 20000 ? new Date(Math.round((v - 25569) * 864e5)) : null;
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (m) return new Date(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]);
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const fmt = (d) => d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const days = (a, b) => Math.floor((b - a) / 864e5);

function compute() {
  const paidBy = {}, paysBy = {};
  for (const p of data.payments) {
    const id = String(p.Student_ID || "").trim();
    if (!id) continue;
    paidBy[id] = (paidBy[id] || 0) + n(p.Amount);
    (paysBy[id] = paysBy[id] || []).push(p);
  }
  const t = today0();
  rows = data.students.map((s) => {
    const id = String(s.Student_ID || "").trim();
    const net = n(s.Total_Fee) - n(s.Discount);
    const paid = paidBy[id] || 0;
    const bal = net - paid;
    const adm = pd(s.Admission_Date);
    const active = String(s.Status || "").trim() === "Active";
    let behind = 0, since = 0;
    const plan = feePlan(net, s.Duration_Months);
    if (active && bal > 0 && adm) {
      const k = Math.max(0, Math.floor(days(adm, t) / 30));
      behind = Math.max(0, expectedBy(plan, k) - paid);
      if (behind > 0) {
        let j = 0; while (j < k && expectedBy(plan, j) <= paid) j++;
        since = Math.max(0, days(new Date(adm.getTime() + j * 30 * 864e5), t));
      }
    }
    return { s, id, net, paid, bal, adm, active, behind, since, plan, pays: (paysBy[id] || []).slice() };
  });
}

const matches = (...vals) => !term || vals.some((v) => String(v ?? "").toLowerCase().includes(term));

function feeMsg(r) {
  return `Namaste ${r.s.Name}, ${INST} se reminder: aapki ${money(Math.min(r.behind || (r.plan ? r.plan.base : r.bal), r.bal))} ki fee installment due hai. Total baaki: ${money(r.bal)}. Thank you!`;
}

function actions(phone, msg) {
  const d = digits(phone).slice(-10);
  if (d.length !== 10) return el("span", { class: "text-muted-c", style: { fontSize: ".78rem" } }, "phone nahi");
  return el("div", { class: "cluster", style: { gap: ".35rem" } },
    el("a", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", href: telLink(d) }, "Call"),
    el("a", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", target: "_blank", rel: "noopener", href: whatsappLink(d, msg) }, "WhatsApp"));
}

function table(head, body) {
  return el("div", { class: "table-wrap" },
    el("table", { class: "table-ssz" },
      el("thead", {}, el("tr", {}, ...head.map(([h, cls]) => el("th", { class: cls || null }, h)))),
      el("tbody", {}, ...body)));
}

function empty(text) {
  return el("div", { class: "empty-state" },
    el("div", { class: "empty-state__icon", html: icon("clipboard", { size: 32 }) }),
    el("h2", {}, "Kuch nahi mila"),
    el("p", {}, text));
}

function statusBadge(st) {
  const s = String(st || "").trim();
  const cls = s === "Active" ? "badge-success" : s === "Left" ? "badge-danger" : "badge-brand";
  return el("span", { class: `badge-ssz ${cls}` }, s || "—");
}

/* ---------------- stats ---------------- */
function tile(ic, value, label, tone) {
  return el("div", { class: `stat-tile stat-tile--${tone}` },
    el("div", { class: "stat-tile__icon", html: icon(ic, { size: 22 }) }),
    el("div", {},
      el("div", { class: "stat-tile__value" }, value),
      el("div", { class: "stat-tile__label" }, label)));
}

function paintStats() {
  const act = rows.filter((r) => r.active);
  const t = today0();
  const mStart = new Date(t.getFullYear(), t.getMonth(), 1);
  let month = 0, todayAmt = 0;
  for (const p of data.payments) {
    const d = pd(p.Date); if (!d) continue;
    if (d >= mStart && d <= t) month += n(p.Amount);
    if (d.getTime() === t.getTime()) todayAmt += n(p.Amount);
  }
  const newEnq = data.enquiries.filter((e) => ["New", "Follow-up"].includes(String(e.Status || "").trim())).length;
  render($("#regStats"),
    tile("users", String(act.length), "Active students", "accent"),
    tile("wallet", money(act.reduce((a, r) => a + Math.max(0, r.bal), 0)), "Baaki fee (Active)", "danger"),
    tile("alert", String(act.filter((r) => r.behind > 0).length), "Installment pichhe", "warning"),
    tile("rupee", money(month), "Is mahine collection", "success"),
    tile("receipt", money(todayAmt), "Aaj ka collection", "success"),
    tile("mail", String(newEnq), "Enquiry (call baaki)", "accent"));
}

/* ---------------- tabs ---------------- */
function paintTabs() {
  const count = {
    due: rows.filter((r) => r.behind > 0).length,
    students: data.students.length,
    payments: data.payments.length,
    enquiries: data.enquiries.length,
    courses: data.courses.length
  };
  render($("#regTabs"), TABS.map(([k, l]) =>
    el("button", { type: "button", class: `chip${k === tab ? " is-active" : ""}`, dataset: { tab: k } }, `${l} (${count[k]})`)));
  $("#regStatus").hidden = tab !== "students";
  $("#regToolbar").hidden = tab === "courses";
}

function paintDue() {
  const list = rows.filter((r) => r.behind > 0 && matches(r.s.Name, r.id, r.s.Phone, r.s.Course))
    .sort((a, b) => b.behind - a.behind || b.since - a.since);
  $("#regCount").textContent = `${list.length} students ki installment pichhe hai (sabse zyada pichhe wale upar).`;
  return list.length ? table(
    [["Student"], ["Course"], ["Pichhe", "num"], ["Baaki", "num"], ["Kab se"], [""]],
    list.map((r) => el("tr", {},
      el("td", { dataset: { label: "Student" } }, el("button", { type: "button", class: "link-btn", dataset: { sid: r.id }, style: { fontWeight: 600, background: "none", border: 0, padding: 0, color: "var(--brand)", cursor: "pointer", textAlign: "left" } }, `${r.s.Name} (${r.id})`)),
      el("td", { dataset: { label: "Course" } }, r.s.Course || "—"),
      el("td", { class: "num", dataset: { label: "Pichhe" }, style: { color: "var(--danger)", fontWeight: 700 } }, money(r.behind)),
      el("td", { class: "num", dataset: { label: "Baaki" } }, money(r.bal)),
      el("td", { dataset: { label: "Kab se" } }, `${r.since} din`),
      el("td", {}, actions(r.s.Phone, feeMsg(r)))
    ))) : empty("Kisi active student ki installment pichhe nahi hai.");
}

function paintStudents() {
  const list = rows.filter((r) => (status === "all" || String(r.s.Status || "").trim() === status)
    && matches(r.s.Name, r.id, r.s.Phone, r.s.Phone2, r.s.Course, r.s.Father_Name))
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));
  $("#regCount").textContent = `${list.length} students`;
  return list.length ? table(
    [["Student"], ["Course"], ["Mobile"], ["Net fee", "num"], ["Mila", "num"], ["Baaki", "num"], ["Status"]],
    list.map((r) => el("tr", {},
      el("td", { dataset: { label: "Student" } }, el("button", { type: "button", dataset: { sid: r.id }, style: { fontWeight: 600, background: "none", border: 0, padding: 0, color: "var(--brand)", cursor: "pointer", textAlign: "left" } }, `${r.s.Name} (${r.id})`)),
      el("td", { dataset: { label: "Course" } }, r.s.Course || "—"),
      el("td", { dataset: { label: "Mobile" } }, formatPhone(r.s.Phone)),
      el("td", { class: "num", dataset: { label: "Net fee" } }, money(r.net)),
      el("td", { class: "num", dataset: { label: "Mila" } }, money(r.paid)),
      el("td", { class: "num", dataset: { label: "Baaki" }, style: r.bal > 0 ? { color: "var(--danger)", fontWeight: 600 } : {} }, money(r.bal)),
      el("td", { dataset: { label: "Status" } }, statusBadge(r.s.Status))
    ))) : empty("Is search/filter se koi student nahi mila.");
}

function paintPayments() {
  const list = data.payments.filter((p) => matches(p.Name, p.Student_ID, p.Receipt_No, p.Mode))
    .map((p) => ({ p, d: pd(p.Date) }))
    .sort((a, b) => (b.d ? b.d.getTime() : 0) - (a.d ? a.d.getTime() : 0));
  const total = list.reduce((a, x) => a + n(x.p.Amount), 0);
  $("#regCount").textContent = `${list.length} payments · kul ${money(total)}`;
  return list.length ? table(
    [["Date"], ["Receipt"], ["Student"], ["Amount", "num"], ["Mode"], ["Note"]],
    list.slice(0, 300).map(({ p, d }) => el("tr", {},
      el("td", { dataset: { label: "Date" } }, fmt(d)),
      el("td", { dataset: { label: "Receipt" } }, String(p.Receipt_No ?? "—")),
      el("td", { dataset: { label: "Student" } }, `${p.Name || ""} (${p.Student_ID || ""})`),
      el("td", { class: "num", dataset: { label: "Amount" }, style: { fontWeight: 600 } }, money(n(p.Amount))),
      el("td", { dataset: { label: "Mode" } }, p.Mode || "—"),
      el("td", { dataset: { label: "Note" }, style: { fontSize: ".8rem", color: "var(--text-muted)" } }, p.Note || "")
    ))) : empty("Koi payment nahi mili.");
}

function paintEnquiries() {
  const list = data.enquiries.filter((e) => matches(e.Name, e.Phone, e.Enquiry_ID, e.Course_Interest, e.Source))
    .sort((a, b) => String(b.Enquiry_ID).localeCompare(String(a.Enquiry_ID), undefined, { numeric: true }));
  $("#regCount").textContent = `${list.length} enquiries`;
  return list.length ? table(
    [["Enquiry"], ["Course"], ["Source"], ["Status"], ["Agla follow-up"], [""]],
    list.map((e) => el("tr", {},
      el("td", { dataset: { label: "Enquiry" } }, el("strong", {}, e.Name || "—"), el("div", { style: { fontSize: ".75rem", color: "var(--text-muted)" } }, `${e.Enquiry_ID} · ${fmt(pd(e.Date))}`)),
      el("td", { dataset: { label: "Course" } }, e.Course_Interest || "—"),
      el("td", { dataset: { label: "Source" } }, e.Source || "—"),
      el("td", { dataset: { label: "Status" } }, el("span", { class: `badge-ssz ${String(e.Status).trim() === "New" ? "badge-danger" : "badge-brand"}` }, e.Status || "—")),
      el("td", { dataset: { label: "Agla follow-up" } }, fmt(pd(e.Next_Followup))),
      el("td", {}, actions(e.Phone, `Hello ${e.Name}, this is ${INST}. Thank you for your enquiry${e.Course_Interest ? ` for ${e.Course_Interest}` : ""}. Can you visit the institute this week?`))
    ))) : empty("Koi enquiry nahi mili.");
}

function paintCourses() {
  $("#regCount").textContent = `${data.courses.length} courses (Sheet ke Courses tab se)`;
  return data.courses.length ? table(
    [["Course"], ["Duration", "num"], ["Offline fee", "num"], ["Online fee", "num"], ["Active students", "num"]],
    data.courses.map((c) => el("tr", {},
      el("td", { dataset: { label: "Course" }, style: { fontWeight: 600 } }, c.Course_Name),
      el("td", { class: "num", dataset: { label: "Duration" } }, c.Duration_Months ? `${c.Duration_Months} mahine` : "—"),
      el("td", { class: "num", dataset: { label: "Offline fee" } }, money(n(c.Fee_Offline))),
      el("td", { class: "num", dataset: { label: "Online fee" } }, money(n(c.Fee_Online))),
      el("td", { class: "num", dataset: { label: "Active students" } }, String(rows.filter((r) => r.active && String(r.s.Course || "").trim() === String(c.Course_Name).trim()).length))
    ))) : empty("Sheet me Courses tab khaali hai.");
}

function paint() {
  paintTabs();
  const view = { due: paintDue, students: paintStudents, payments: paintPayments, enquiries: paintEnquiries, courses: paintCourses }[tab];
  render($("#regBody"), view());
}

function showStudent(id) {
  const r = rows.find((x) => x.id === id);
  if (!r) return;
  const s = r.s;
  const line = (k, v) => el("div", { class: "between", style: { padding: ".35rem 0", borderBottom: "1px solid var(--border)", gap: "1rem" } },
    el("span", { class: "text-muted-c", style: { fontSize: ".82rem" } }, k), el("strong", { style: { fontSize: ".86rem", textAlign: "right" } }, v || "—"));
  const pays = r.pays.map((p) => ({ p, d: pd(p.Date) })).sort((a, b) => (a.d ? a.d.getTime() : 0) - (b.d ? b.d.getTime() : 0));
  openModal({
    title: `${s.Name} (${r.id})`,
    size: "lg",
    body: el("div", { class: "stack", style: { gap: "1rem" } },
      el("div", {},
        line("Pita ka naam", s.Father_Name),
        line("Mobile", [s.Phone, s.Phone2].filter(Boolean).map(formatPhone).join(", ")),
        line("Pata", s.Address),
        line("Course", s.Course),
        line("Admission", fmt(r.adm)),
        line("Net fee", money(r.net)),
        line("Mila", money(r.paid)),
        line("Baaki", money(r.bal)),
        r.plan ? line("Kist", `${money(r.plan.first)} admission + ${r.plan.n} × ${money(r.plan.base)} (${s.Duration_Months || 12} mahine)`) : null,
        r.behind > 0 ? line("Installment pichhe", `${money(r.behind)} · ${r.since} din se`) : null,
        line("Status", s.Status),
        s.Notes ? line("Note", s.Notes) : null),
      el("div", {},
        el("h4", { style: { fontSize: ".95rem", margin: "0 0 .5rem" } }, `Payments (${pays.length})`),
        pays.length ? table([["Date"], ["Receipt"], ["Amount", "num"], ["Mode"]],
          pays.map(({ p, d }) => el("tr", {},
            el("td", { dataset: { label: "Date" } }, fmt(d)),
            el("td", { dataset: { label: "Receipt" } }, String(p.Receipt_No ?? "—")),
            el("td", { class: "num", dataset: { label: "Amount" } }, money(n(p.Amount))),
            el("td", { dataset: { label: "Mode" } }, p.Mode || "—"))))
          : el("p", { class: "text-muted-c" }, "Abhi koi payment nahi.")),
      r.bal > 0 ? actions(s.Phone, feeMsg(r)) : null)
  });
}

/* ---------------- load ---------------- */
async function load() {
  $("#regMeta").textContent = "Google Sheet se data aa raha hai…";
  try {
    const { auth } = await import("../../firebase/firebase-init.js");
    if (!auth.currentUser) throw new Error("Login nahi mila. Dobara login karein.");
    const token = await auth.currentUser.getIdToken();
    // text/plain = "simple request", isliye browser preflight nahi bhejta (Apps Script OPTIONS nahi sambhalta)
    const res = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ token }) });
    const out = await res.json();
    if (!out.ok) throw new Error(out.error || "Data nahi aaya.");
    data = { students: [], payments: [], enquiries: [], courses: [], ...out.data };
    compute(); paintStats(); paint();
    const at = data.at ? new Date(data.at) : new Date();
    $("#regMeta").textContent = `Google Sheet se · ${at.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} par liya gaya`;
  } catch (err) {
    $("#regMeta").textContent = "Data nahi aa paya.";
    render($("#regBody"), empty(err.message || "Internet check karke Refresh dabayein."));
    toast.error(err.message || "Data nahi aaya.");
  }
}

/* ---------------- boot ---------------- */
const shell = await initAdminShell({ active: "register", title: "Register (Offline)" });
mode = shell.mode;

on($("#regTabs"), "click", ".chip", (e, chip) => { tab = chip.dataset.tab; paint(); });
on($("#regBody"), "click", "[data-sid]", (e, btn) => showStudent(btn.dataset.sid));
$("#regSearch").addEventListener("input", debounce((e) => { term = e.target.value.trim().toLowerCase(); paint(); }, 200));
$("#regStatus").addEventListener("change", (e) => { status = e.target.value; paint(); });
$("#regRefresh").addEventListener("click", load);

if (mode === "preview") {
  $("#regMeta").textContent = "Preview mode — asli data ke liye admin login karein.";
  paintTabs();
  render($("#regBody"), empty("Ye page login ke baad Google Sheet ka data dikhata hai."));
} else {
  load();
}
