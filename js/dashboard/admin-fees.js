/* ==========================================================================
   Soft Skill Zone — Admin: Fee Management
   Collect fee -> receipt number -> student totals update; verify
   student-uploaded payment proofs; history + search + CSV export; print.
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { money, amountInWords, formatDate, formatPhone, exportCSV, debounce, sum } from "../core/utils.js";
import { open as openModal, confirm as confirmModal } from "../core/modal.js";
import { createValidator, rules } from "../core/validators.js";
import { initAdminShell } from "./admin-shell.js";
import { DEMO_STUDENTS, DEMO_FEE_ROWS } from "./admin-demo.js";
import { COLLECTIONS, ID_FORMATS, FEE_STATUS, PAYMENT_MODES } from "../core/constants.js";
import { INSTITUTE } from "../config/site-data.js";
import toast from "../core/toast.js";

let mode = "preview", fees = [], students = [], term = "";

const MODE_LABEL = Object.fromEntries(PAYMENT_MODES.map((m) => [m.value, m.label]));

/* ==========================================================================
   Tiles
   ========================================================================== */
function tiles() {
  const paid = fees.filter((f) => f.status === "paid");
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const toMs = (v) => v?.toDate ? v.toDate().getTime() : v?.seconds ? v.seconds * 1000 : v ? new Date(v).getTime() : 0;
  const monthTotal = sum(paid.filter((f) => toMs(f.paidOn) >= monthStart.getTime()), "amount");
  const today = new Date().toDateString();
  const todayTotal = sum(paid.filter((f) => new Date(toMs(f.paidOn)).toDateString() === today), "amount");
  const pendingCount = fees.filter((f) => f.status === FEE_STATUS.PENDING).length;
  const totalDue = sum(students.filter((s) => s.status === "active"), "pendingFee");

  const tile = (ic, value, label, tone) => el("div", { class: `stat-tile stat-tile--${tone}` },
    el("div", { class: "stat-tile__icon", html: icon(ic, { size: 22 }) }),
    el("div", {}, el("div", { class: "stat-tile__value" }, value), el("div", { class: "stat-tile__label" }, label)));

  render($("#feeTiles"),
    tile("rupee", money(todayTotal), "Aaj ka collection", "success"),
    tile("trending", money(monthTotal), "Is mahine ka collection", "accent"),
    tile("alert", money(totalDue), "Kul bakaya (active)", totalDue ? "warning" : "success"),
    tile("clock", String(pendingCount), "Verify pending", pendingCount ? "danger" : "success")
  );
}

/* ==========================================================================
   Collect / verify
   ========================================================================== */
async function saveCollection({ student, amount, payMode, remarks, existingFeeId = null, txnRef = "" }) {
  if (mode === "preview") {
    toast.info("Preview mode: Firebase ke baad asli receipt banegi.");
    return null;
  }
  const { nextSequence, createWithId, update, increment } = await import("../../firebase/db-service.js");

  const year = new Date().getFullYear();
  const seq = await nextSequence(`receipts-${year}`);
  const receiptNo = ID_FORMATS.receipt(year, seq);
  const doc = {
    receiptNo,
    studentId: student.studentId,
    studentName: student.fullName,
    courseName: student.courseName || "",
    batchId: student.batchId || "",
    amount,
    mode: payMode,
    txnRef,
    installmentNo: 0,
    paidOn: new Date(),
    status: FEE_STATUS.PAID,
    remarks: remarks || ""
  };

  if (existingFeeId) {
    await update(COLLECTIONS.FEES, existingFeeId, doc);
  } else {
    await createWithId(COLLECTIONS.FEES, receiptNo.replace(/\//g, "-"), doc);
  }

  await update(COLLECTIONS.STUDENTS, student.studentId, {
    paidFee: increment(amount),
    pendingFee: increment(-amount)
  });

  return { ...doc, id: existingFeeId || receiptNo.replace(/\//g, "-") };
}

function collectDialog(preStudent = null) {
  const form = el("form", { novalidate: true });
  form.innerHTML = `
    <div class="field">
      <label class="field__label">Student <span class="req">*</span></label>
      <select class="select-ssz" name="studentId"></select>
      <div class="field__error"></div>
      <p class="field__hint" id="cdDue"></p>
    </div>
    <div class="adm-row">
      <div class="field">
        <label class="field__label">Amount (Rs.) <span class="req">*</span></label>
        <input class="input-ssz" name="amount" type="number" min="1" inputmode="numeric" placeholder="1500">
        <div class="field__error"></div>
      </div>
      <div class="field">
        <label class="field__label">Mode</label>
        <select class="select-ssz" name="mode"></select>
      </div>
    </div>
    <div class="field">
      <label class="field__label">Remarks</label>
      <input class="input-ssz" name="remarks" type="text" placeholder="Jaise: 4th installment">
    </div>`;

  const sSel = form.querySelector('[name="studentId"]');
  sSel.appendChild(el("option", { value: "" }, "Chunein"));
  students.filter((s) => s.status === "active").forEach((s) =>
    sSel.appendChild(el("option", { value: s.studentId, selected: preStudent?.studentId === s.studentId },
      `${s.fullName} — ${s.studentId}`)));

  const mSel = form.querySelector('[name="mode"]');
  PAYMENT_MODES.forEach((m) => mSel.appendChild(el("option", { value: m.value }, m.label)));

  const showDue = () => {
    const s = students.find((x) => x.studentId === sSel.value);
    $("#cdDue") && (form.querySelector("#cdDue").textContent =
      s ? `Bakaya: ${money(s.pendingFee || 0)} (kul ${money(s.totalFee || 0)})` : "");
  };
  sSel.addEventListener("change", showDue);
  showDue();

  const validator = createValidator(form, {
    studentId: [rules.required("Student chunein.")],
    amount:    [rules.required("Amount daalein."), rules.min(1, "Amount 1 se kam nahi ho sakta.")]
  });

  const saveBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Collect + Receipt");
  const cancelBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Cancel");
  const m = openModal({ title: "Fee Collect Karein", body: form, footer: [cancelBtn, saveBtn] });
  cancelBtn.addEventListener("click", () => m.close());

  saveBtn.addEventListener("click", async () => {
    if (!validator.validate()) return;
    const student = students.find((x) => x.studentId === sSel.value);
    const amount = Number(form.elements.amount.value);

    try {
      saveBtn.disabled = true;
      const doc = await saveCollection({
        student, amount,
        payMode: form.elements.mode.value,
        remarks: form.elements.remarks.value.trim()
      });
      m.close();
      if (doc) {
        student.paidFee = (student.paidFee || 0) + amount;
        student.pendingFee = Math.max(0, (student.pendingFee || 0) - amount);
        fees.unshift(doc);
        tiles(); paintRows();
        toast.success(`Receipt ban gayi: ${doc.receiptNo}`);
        receiptView(doc);
      }
    } catch (err) {
      saveBtn.disabled = false;
      toast.error(err.message || "Collect fail ho gaya.");
    }
  });
}

function verifyDialog(f) {
  const student = students.find((s) => s.studentId === f.studentId);
  const body = el("div", {});
  body.appendChild(el("p", { style: { fontSize: ".88rem", marginBottom: "1rem" } },
    `${f.studentName || f.studentId} ne payment proof upload kiya hai${f.txnRef ? ` (Ref: ${f.txnRef})` : ""}. ` +
    "Screenshot check karke amount bharein — receipt ban jaayegi aur student ka bakaya update ho jaayega."));
  if (f.proofURL && f.proofURL !== "#") {
    body.appendChild(el("a", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", style: { marginBottom: "1rem" }, href: f.proofURL, target: "_blank", rel: "noopener" },
      el("span", { html: icon("image", { size: 16 }) }), "Screenshot dekhein"));
  }
  const form = el("form", { novalidate: true });
  form.innerHTML = `
    <div class="field">
      <label class="field__label">Amount (Rs.) <span class="req">*</span></label>
      <input class="input-ssz" name="amount" type="number" min="1" placeholder="Screenshot me jitna hai">
      <div class="field__error"></div>
    </div>`;
  body.appendChild(form);
  const validator = createValidator(form, { amount: [rules.required("Amount daalein."), rules.min(1)] });

  const okBtn = el("button", { class: "btn-ssz btn-success-ssz", type: "button" }, "Verify + Receipt");
  const badBtn = el("button", { class: "btn-ssz btn-danger-ssz", type: "button" }, "Galat hai");
  const m = openModal({ title: "Payment verify karein", body, footer: [badBtn, okBtn] });

  okBtn.addEventListener("click", async () => {
    if (!validator.validate()) return;
    const amount = Number(form.elements.amount.value);
    try {
      okBtn.disabled = true;
      const doc = await saveCollection({ student: student || { studentId: f.studentId, fullName: f.studentName }, amount, payMode: f.mode || "upi", remarks: "Proof verified", existingFeeId: f.id, txnRef: f.txnRef || "" });
      m.close();
      if (doc) {
        Object.assign(f, doc, { status: "paid" });
        if (student) { student.paidFee = (student.paidFee || 0) + amount; student.pendingFee = Math.max(0, (student.pendingFee || 0) - amount); }
        tiles(); paintVerify(); paintRows();
        toast.success(`Verify ho gaya — ${doc.receiptNo}`);
      }
    } catch (err) { okBtn.disabled = false; toast.error(err.message || "Fail ho gaya."); }
  });

  badBtn.addEventListener("click", async () => {
    const ok = await confirmModal({ title: "Failed mark karein?", message: "Yeh payment record failed ho jaayega. Student ko WhatsApp par bata dein.", danger: true, confirmText: "Haan" });
    if (!ok) return;
    if (mode === "preview") { f.status = "failed"; m.close(); paintVerify(); return toast.info("Preview mode."); }
    try {
      const { update } = await import("../../firebase/db-service.js");
      await update(COLLECTIONS.FEES, f.id, { status: FEE_STATUS.FAILED });
      f.status = "failed";
      m.close(); paintVerify(); tiles();
      toast.success("Failed mark ho gaya.");
    } catch (err) { toast.error(err.message || "Fail ho gaya."); }
  });
}

/* ==========================================================================
   Receipt print
   ========================================================================== */
function receiptView(f) {
  const body = el("div", { class: "receipt-sheet" });
  body.innerHTML = `
    <div style="text-align:center;border-bottom:2px solid #4f46e5;padding-bottom:12px;margin-bottom:16px">
      <h2 style="margin:0;font-size:1.3rem;color:#312e81">Soft Skill Zone Institute</h2>
      <p style="margin:2px 0 0;font-size:.8rem">${INSTITUTE.address} · ${formatPhone(INSTITUTE.phone)}</p>
      <p style="margin:6px 0 0;font-weight:700;letter-spacing:.08em;font-size:.8rem">FEE RECEIPT</p>
    </div>
    <table style="width:100%;font-size:.88rem;border-collapse:collapse">
      ${[["Receipt No.", f.receiptNo], ["Date", formatDate(f.paidOn)],
         ["Student", `${f.studentName || ""} (${f.studentId})`], ["Course", f.courseName || "—"],
         ["Mode", MODE_LABEL[f.mode] || f.mode], ["Amount", `${money(f.amount)} — ${amountInWords(f.amount)}`],
         ["Remarks", f.remarks || "—"]]
        .map(([k, v]) => `<tr><td style="padding:6px 0;color:#555;width:32%">${k}</td><td style="padding:6px 0;font-weight:600">${v}</td></tr>`).join("")}
    </table>
    <p style="margin-top:20px;font-size:.72rem;color:#666;text-align:center">Computer-generated receipt.</p>`;

  const printBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Print / PDF");
  const closeBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Band karein");
  const m = openModal({ title: f.receiptNo || "Receipt", size: "lg", body, footer: [closeBtn, printBtn] });
  closeBtn.addEventListener("click", () => m.close());
  printBtn.addEventListener("click", () => {
    const w = window.open("", "_blank", "width=800,height=900");
    w.document.write(`<html><head><title>${f.receiptNo}</title></head><body style="font-family:Arial,sans-serif">${body.innerHTML}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  });
}

/* ==========================================================================
   Lists
   ========================================================================== */
function paintVerify() {
  const pend = fees.filter((f) => f.status === FEE_STATUS.PENDING);
  $("#verifySection").hidden = !pend.length;
  render($("#verifyList"), pend.map((f) =>
    el("div", { class: "card-ssz", style: { borderLeft: "3px solid var(--warning)" } },
      el("div", { class: "card-ssz__body", style: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", padding: "1rem 1.25rem" } },
        el("span", { class: "stat-tile__icon", style: { background: "var(--warning-soft)", color: "var(--warning)" }, html: icon("clock", { size: 20 }) }),
        el("span", { style: { flex: 1, minWidth: "200px" } },
          el("strong", { style: { display: "block", fontSize: ".92rem" } }, f.studentName || f.studentId),
          el("span", { style: { fontSize: ".78rem", color: "var(--text-muted)" } },
            `${f.studentId}${f.txnRef ? ` · Ref: ${f.txnRef}` : ""} · proof uploaded`)),
        el("button", { class: "btn-ssz btn-primary-ssz btn-sm-ssz", type: "button", dataset: { verify: f.id } }, "Verify karein")
      ))));
}

function paintRows() {
  const paid = fees.filter((f) => f.status === "paid");
  const list = term
    ? paid.filter((f) => `${f.studentName || ""} ${f.studentId} ${f.receiptNo || ""}`.toLowerCase().includes(term))
    : paid;

  if (!list.length) {
    render($("#feeRows"), el("tr", {}, el("td", { colspan: "6", style: { textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" } },
      "Koi collection record nahi mila.")));
    return;
  }
  render($("#feeRows"), list.map((f) => el("tr", {},
    el("td", { style: { fontFamily: "var(--font-mono)", fontSize: ".76rem" } }, f.receiptNo || "—"),
    el("td", {},
      el("strong", { style: { display: "block", color: "var(--text-primary)" } }, f.studentName || "—"),
      el("span", { style: { fontSize: ".72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" } }, f.studentId)),
    el("td", {}, formatDate(f.paidOn)),
    el("td", {}, MODE_LABEL[f.mode] || f.mode),
    el("td", { class: "num", style: { fontWeight: 600, color: "var(--text-primary)" } }, money(f.amount)),
    el("td", {}, el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", type: "button", dataset: { print: f.id } }, "Receipt"))
  )));
}

/* ==========================================================================
   Boot
   ========================================================================== */
const shell = await initAdminShell({ active: "fees", title: "Fee Management" });
mode = shell.mode;

if (mode === "preview") {
  fees = DEMO_FEE_ROWS.map((f) => ({ ...f }));
  students = DEMO_STUDENTS.map((s) => ({ ...s }));
} else {
  const { getMany } = await import("../../firebase/db-service.js");
  [fees, students] = await Promise.all([
    getMany(COLLECTIONS.FEES, { orderBy: ["paidOn", "desc"], limit: 300, useCache: false }).catch(() => []),
    getMany(COLLECTIONS.STUDENTS, { limit: 500, useCache: false }).catch(() => [])
  ]);
}

tiles(); paintVerify(); paintRows();

$("#feeCollect").addEventListener("click", () => collectDialog());
$("#feeSearch").addEventListener("input", debounce((e) => { term = e.target.value.trim().toLowerCase(); paintRows(); }, 200));
$("#feeExport").addEventListener("click", () => {
  const paid = fees.filter((f) => f.status === "paid");
  if (!paid.length) return toast.warning("Export ke liye kuch nahi.");
  exportCSV(paid.map((f) => ({
    "Receipt": f.receiptNo || "", "Student ID": f.studentId, "Student": f.studentName || "",
    "Course": f.courseName || "", "Date": formatDate(f.paidOn), "Mode": MODE_LABEL[f.mode] || f.mode,
    "Amount": f.amount, "Txn Ref": f.txnRef || "", "Remarks": f.remarks || ""
  })), `ssz-collections-${new Date().toISOString().slice(0, 10)}.csv`);
  toast.success("Collections ka CSV download ho gaya.");
});

on($("#verifyList"), "click", "[data-verify]", (e, btn) => {
  const f = fees.find((x) => x.id === btn.dataset.verify);
  if (f) verifyDialog(f);
});
on($("#feeRows"), "click", "[data-print]", (e, btn) => {
  const f = fees.find((x) => x.id === btn.dataset.print);
  if (f) receiptView(f);
});
