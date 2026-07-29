/* ==========================================================================
   Soft Skill Zone — Student: Fees
   Totals, due date, Razorpay/UPI pay-now, proof upload, receipts + print.
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { money, amountInWords, formatDate, formatPhone } from "../core/utils.js";
import { validateFile } from "../core/files.js";
import { initShell } from "./shell.js";
import * as data from "./student-data.js";
import { DEMO_STUDENT, DEMO_FEES } from "./demo-data.js";
import { INSTITUTE } from "../config/site-data.js";
import { open as openModal } from "../core/modal.js";
import toast from "../core/toast.js";

let student, fees = [], mode = "preview", settings = null;

const MODE_LABEL = { cash: "Cash", upi: "UPI", razorpay: "Razorpay", bank: "Bank", cheque: "Cheque" };

function tile(ic, value, label, tone) {
  return el("div", { class: `stat-tile stat-tile--${tone}` },
    el("div", { class: "stat-tile__icon", html: icon(ic, { size: 22 }) }),
    el("div", {},
      el("div", { class: "stat-tile__value" }, value),
      el("div", { class: "stat-tile__label" }, label)
    )
  );
}

function payBox() {
  const pending = student.pendingFee || 0;
  const box = $("#feePayBox");
  if (pending <= 0) {
    render(box, el("div", { class: "card-ssz" }, el("div", { class: "card-ssz__body", style: { display: "flex", gap: "1rem", alignItems: "center" } },
      el("span", { style: { color: "var(--success)" }, html: icon("checkCircle", { size: 28 }) }),
      el("span", {},
        el("strong", { style: { display: "block" } }, "Poori fees jama hai!"),
        el("span", { style: { fontSize: ".85rem", color: "var(--text-muted)" } }, "Koi bakaya nahi — dhanyavaad.")
      ))));
    return;
  }

  const rzp = settings?.razorpayLink || INSTITUTE.payments.razorpayLink;
  const upi = settings?.upiId || INSTITUTE.payments.upiId;

  render(box, el("div", { class: "live-card" },
    el("div", { class: "between", style: { flexWrap: "wrap", gap: "1rem" } },
      el("span", {},
        el("span", { class: "live-badge", style: { marginBottom: ".75rem", display: "inline-flex" } }, "Payment Due"),
        el("p", { style: { margin: ".5rem 0 .2rem", fontSize: "1.3rem", fontWeight: "700", fontFamily: "var(--font-display)" } }, money(pending)),
        el("p", { style: { margin: 0, fontSize: ".85rem" } },
          `Due date: ${student.nextDueDate ? formatDate(student.nextDueDate) : "jald hi"} · ${amountInWords(pending)}`)
      ),
      el("span", { class: "cluster" },
        rzp ? el("a", { class: "btn-ssz", style: { background: "#fff", color: "var(--ssz-indigo-700)" }, href: rzp, target: "_blank", rel: "noopener" },
          "Pay Now (Razorpay)") : null,
        upi ? el("button", { class: "btn-ssz btn-glass-ssz", style: { color: "#fff", borderColor: "rgba(255,255,255,.4)" }, type: "button", id: "btnUpiQr" },
          "UPI QR") : null,
        el("button", { class: "btn-ssz btn-glass-ssz", style: { color: "#fff", borderColor: "rgba(255,255,255,.4)" }, type: "button", id: "btnProof" },
          "Payment proof upload karein")
      )
    ),
    upi ? el("p", { style: { margin: "1rem 0 0", fontSize: ".8rem", opacity: ".85" } }, `UPI se bhi bhej sakte hain: ${upi}`) : null
  ));

  $("#btnProof").addEventListener("click", proofDialog);
  if (upi) $("#btnUpiQr").addEventListener("click", () => upiQrDialog(upi, pending));
}

/* --------------------------------------------------------------------------
   UPI QR — payee, amount, aur student ka reference pehle se bhara hua.
   QR encoder project ka apna hai (js/tools/qrcode.js), koi external API nahi —
   isliye UPI id aur amount kabhi browser se bahar nahi jaate.
   -------------------------------------------------------------------------- */
function upiPayload(upiId, amount) {
  const name = settings?.accountName || INSTITUTE.payments.accountName || INSTITUTE.name;
  const note = `Fee ${student.studentId || ""}`.trim();
  const q = new URLSearchParams({
    pa: upiId,
    pn: name,
    cu: "INR"
  });
  if (amount > 0) q.set("am", String(amount));
  if (note) q.set("tn", note);
  // URLSearchParams "+" ke saath encode karta hai; UPI apps %20 expect karti hain
  return `upi://pay?${q.toString().replace(/\+/g, "%20")}`;
}

async function upiQrDialog(upiId, pending) {
  const body = el("div", { style: { textAlign: "center" } });
  body.appendChild(el("p", { style: { fontSize: ".88rem", marginBottom: "1rem" } },
    "Koi bhi UPI app (PhonePe, Google Pay, Paytm) se scan karein — amount aur reference pehle se bhara hua hai."));

  const canvas = el("canvas", { style: { maxWidth: "100%", height: "auto", borderRadius: "8px" } });
  const holder = el("div", { style: { background: "#fff", padding: "16px", borderRadius: "12px", display: "inline-block" } }, canvas);
  body.appendChild(holder);

  body.appendChild(el("p", { style: { margin: "1rem 0 .25rem", fontWeight: "600" } }, upiId));
  body.appendChild(el("p", { style: { margin: 0, fontSize: ".85rem", color: "var(--text-muted)" } },
    pending > 0 ? `${money(pending)} · ${student.studentId || ""}` : (student.studentId || "")));
  body.appendChild(el("p", { style: { margin: "1rem 0 0", fontSize: ".78rem", color: "var(--text-muted)" } },
    "Payment ke baad screenshot upload karna na bhoolein — tabhi receipt banegi."));

  const closeBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Band karein");
  const m = openModal({ title: "UPI se pay karein", body, footer: [closeBtn] });
  closeBtn.addEventListener("click", () => m.close(null));

  try {
    const { qrMatrix, drawQR } = await import("../tools/qrcode.js");
    drawQR(canvas, qrMatrix(upiPayload(upiId, pending), "M"), { scale: 6, margin: 3 });
  } catch {
    holder.replaceChildren(el("p", { style: { color: "#0f172a", fontSize: ".85rem", margin: 0 } },
      `QR nahi ban paaya. Seedhe is UPI id par bhej dein: ${upiId}`));
  }
}

function proofDialog() {
  if (mode === "preview") {
    toast.info("Preview mode: Firebase connect hone ke baad proof upload chalega.");
    return;
  }

  const body = el("div", {});
  body.innerHTML = `
    <p style="font-size:.88rem;margin-bottom:1rem">UPI/Razorpay se payment karne ke baad uska
    screenshot yahan upload karein — admin verify karke receipt bana dega.</p>
    <div class="field">
      <label class="field__label">Screenshot <span class="req">*</span></label>
      <input class="input-ssz" type="file" id="proofFile" accept="image/jpeg,image/png,image/webp" style="padding:.6rem">
    </div>
    <div class="field">
      <label class="field__label" for="proofRef">UPI / Transaction Ref No.</label>
      <input class="input-ssz" id="proofRef" type="text" placeholder="Jaise: 4209XXXXXX">
    </div>
    <div class="progress-ssz" hidden id="proofProg"><div class="progress-ssz__bar"></div></div>`;

  const submitBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Upload karein");
  const cancelBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Cancel");
  const m = openModal({ title: "Payment proof", body, footer: [cancelBtn, submitBtn] });
  cancelBtn.addEventListener("click", () => m.close());

  submitBtn.addEventListener("click", async () => {
    const file = body.querySelector("#proofFile").files[0];
    const check = validateFile(file, "image");
    if (!check.ok) return toast.error(check.error);

    try {
      submitBtn.disabled = true;
      const progWrap = body.querySelector("#proofProg");
      const bar = progWrap.querySelector(".progress-ssz__bar");
      progWrap.hidden = false;

      // A proof needs a fee record to attach to — reuse today's pending one or create is admin's job;
      // here we attach to the latest record awaiting verification, else create-side is handled by admin.
      const { create } = await import("../../firebase/db-service.js");
      const { COLLECTIONS, FEE_STATUS } = await import("../core/constants.js");
      const feeId = await create(COLLECTIONS.FEES, {
        studentId: student.studentId,
        studentName: student.fullName || "",
        courseName: student.courseName || "",
        batchId: student.batchId || "",
        amount: 0,
        mode: "upi",
        installmentNo: 0,
        status: FEE_STATUS.PENDING,
        paidOn: null,
        remarks: "Student-uploaded proof — amount verify karke bharein"
      });

      await data.uploadFeeProof(student, feeId, file, body.querySelector("#proofRef").value.trim(),
        (p) => { bar.style.width = `${p}%`; });

      m.close();
      toast.success("Proof upload ho gaya! Admin verify karke receipt bana dega.");
      fees = await data.getFees(student);
      paintRows();
    } catch (err) {
      submitBtn.disabled = false;
      toast.error(err.message || "Upload fail ho gaya.");
    }
  });
}

function receiptView(f) {
  const body = el("div", { class: "receipt-sheet" });
  body.innerHTML = `
    <div style="text-align:center;border-bottom:2px solid #4f46e5;padding-bottom:12px;margin-bottom:16px">
      <h2 style="margin:0;font-size:1.3rem;color:#312e81">Soft Skill Zone Institute</h2>
      <p style="margin:2px 0 0;font-size:.8rem">${INSTITUTE.address} · ${formatPhone(INSTITUTE.phone)}</p>
      <p style="margin:6px 0 0;font-weight:700;letter-spacing:.08em;font-size:.8rem">FEE RECEIPT</p>
    </div>
    <table style="width:100%;font-size:.88rem;border-collapse:collapse">
      ${[
        ["Receipt No.", f.receiptNo || "—"],
        ["Date", formatDate(f.paidOn)],
        ["Student", `${student.fullName} (${student.studentId})`],
        ["Course", student.courseName || "—"],
        ["Payment mode", MODE_LABEL[f.mode] || f.mode],
        ["Amount", `${money(f.amount)} — ${amountInWords(f.amount)}`],
        ["Remarks", f.remarks || "—"]
      ].map(([k, v]) => `<tr><td style="padding:6px 0;color:#555;width:34%">${k}</td><td style="padding:6px 0;font-weight:600">${v}</td></tr>`).join("")}
    </table>
    <p style="margin-top:20px;font-size:.72rem;color:#666;text-align:center">
      Yeh computer-generated receipt hai. Kisi bhi sawaal ke liye institute se sampark karein.
    </p>`;

  const printBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Print / PDF");
  const closeBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Band karein");
  const m = openModal({ title: `Receipt ${f.receiptNo || ""}`, size: "lg", body, footer: [closeBtn, printBtn] });
  closeBtn.addEventListener("click", () => m.close());
  printBtn.addEventListener("click", () => {
    const w = window.open("", "_blank", "width=800,height=900");
    w.document.write(`<html><head><title>${f.receiptNo || "Receipt"}</title></head><body style="font-family:Arial,sans-serif">${body.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  });
}

function paintRows() {
  if (!fees.length) {
    render($("#feeRows"), el("tr", {}, el("td", { colspan: "6", style: { textAlign: "center", padding: "2rem", color: "var(--text-muted)" } },
      "Abhi tak koi payment record nahi hai.")));
    return;
  }
  render($("#feeRows"), fees.map((f) => el("tr", {},
    el("td", { style: { fontFamily: "var(--font-mono)", fontSize: ".78rem" } }, f.receiptNo || "—"),
    el("td", {}, f.paidOn ? formatDate(f.paidOn) : "—"),
    el("td", {}, MODE_LABEL[f.mode] || f.mode || "—"),
    el("td", { class: "num", style: { fontWeight: 600, color: "var(--text-primary)" } }, money(f.amount)),
    el("td", {}, f.status === "paid"
      ? el("span", { class: "badge-ssz badge-dot badge-success" }, "Paid")
      : f.status === "pending-verification"
        ? el("span", { class: "badge-ssz badge-dot badge-warning" }, "Verify ho raha hai")
        : el("span", { class: "badge-ssz badge-dot badge-danger" }, "Failed")),
    el("td", {}, f.status === "paid"
      ? el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", type: "button", dataset: { receipt: f.id } }, "Receipt")
      : "")
  )));
}

/* ---------------- boot ---------------- */
const shell = await initShell({ active: "fees", title: "Meri Fees" });
mode = shell.mode;

if (mode === "preview") {
  student = DEMO_STUDENT; fees = [...DEMO_FEES];
} else {
  student = await data.getStudent(shell.user);
  if (student) {
    [fees, settings] = await Promise.all([data.getFees(student), data.getSettings().catch(() => null)]);
  } else {
    student = { pendingFee: 0, totalFee: 0, paidFee: 0 };
  }
}

render($("#feeStats"),
  tile("wallet", money(student.totalFee || 0), "Total Fees", "accent"),
  tile("checkCircle", money(student.paidFee || 0), "Jama ho chuki", "success"),
  tile("alert", money(student.pendingFee || 0), "Bakaya", (student.pendingFee || 0) > 0 ? "warning" : "success"),
  tile("calendar", student.nextDueDate ? formatDate(student.nextDueDate) : "—", "Agli due date", "danger")
);

payBox();
paintRows();

on($("#feeRows"), "click", "[data-receipt]", (e, btn) => {
  const f = fees.find((x) => x.id === btn.dataset.receipt);
  if (f) receiptView(f);
});
