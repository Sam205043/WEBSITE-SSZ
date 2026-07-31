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
import { COLLECTIONS } from "../core/constants.js";
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

/* Jo payments student bata chuka hai par admin ne abhi confirm nahi kiye.
   Ye rakam bakaya me se abhi nahi ghatti — paisa account me pahuncha ya nahi,
   ye admin hi confirm karta hai. Isliye alag se dikhate hain. */
function claimTotal() {
  return fees
    .filter((f) => f.status === "pending-verification")
    .reduce((t, f) => t + (Number(f.claimedAmount) || 0), 0);
}

function claimStrip() {
  const claim = claimTotal();
  if (claim <= 0) return null;
  return el("div", {
    class: "card-ssz",
    style: { borderLeft: "3px solid var(--warning)", marginBottom: "1rem" }
  },
    el("div", { class: "card-ssz__body", style: { display: "flex", gap: ".9rem", alignItems: "center", padding: "1rem 1.25rem" } },
      el("span", { style: { color: "var(--warning)", flexShrink: 0 }, html: icon("clock", { size: 24 }) }),
      el("span", {},
        el("strong", { style: { display: "block", fontSize: ".92rem" } }, `${money(claim)} verify ho raha hai`),
        el("span", { style: { fontSize: ".8rem", color: "var(--text-muted)" } },
          "Institute confirm karte hi aapka bakaya apne aap update ho jaayega aur yahin notification aa jaayegi.")
      )
    )
  );
}

function payBox() {
  const pending = student.pendingFee || 0;
  const box = $("#feePayBox");
  if (pending <= 0) {
    render(box,
      claimStrip(),
      el("div", { class: "card-ssz" }, el("div", { class: "card-ssz__body", style: { display: "flex", gap: "1rem", alignItems: "center" } },
        el("span", { style: { color: "var(--success)" }, html: icon("checkCircle", { size: 28 }) }),
        el("span", {},
          el("strong", { style: { display: "block" } }, "Poori fees jama hai!"),
          el("span", { style: { fontSize: ".85rem", color: "var(--text-muted)" } }, "Koi bakaya nahi — dhanyavaad.")
        ))));
    return;
  }

  const rzp = settings?.razorpayLink || INSTITUTE.payments.razorpayLink;
  const upi = settings?.upiId || INSTITUTE.payments.upiId;

  render(box,
    claimStrip(),
    el("div", { class: "live-card" },
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
          "Payment ki jaankari dein")
      )
    ),
    upi ? el("p", { style: { margin: "1rem 0 0", fontSize: ".8rem", opacity: ".85" } }, `UPI se bhi bhej sakte hain: ${upi}`) : null
  ));

  $("#btnProof").addEventListener("click", () => proofDialog());
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

/* Student jitna bhej sakta hai utna bheje — poori fees ka dabav nahi. Amount
   badalte hi QR dobara ban jaata hai. Amount khaali chhodne par QR bina rakam
   ke banta hai, taaki student apni UPI app me khud type kar le. */
async function upiQrDialog(upiId, pending) {
  const body = el("div", { style: { textAlign: "center" } });
  body.appendChild(el("p", { style: { fontSize: ".88rem", marginBottom: "1rem" } },
    "Jitna abhi de sakte hain utna amount daalein — poori fees ek saath dena zaroori nahi. " +
    "Phir koi bhi UPI app (PhonePe, Google Pay, Paytm) se scan karein."));

  const amtInput = el("input", {
    class: "input-ssz", type: "number", id: "upiAmt",
    min: "1", step: "1", inputmode: "numeric",
    placeholder: "Jaise 2000",
    value: pending > 0 ? String(pending) : "",
    style: { textAlign: "center", fontSize: "1.05rem", fontWeight: "600" }
  });
  body.appendChild(el("div", { class: "field", style: { maxWidth: "240px", margin: "0 auto .75rem" } },
    el("label", { class: "field__label", for: "upiAmt" }, "Kitna bhej rahe hain? (₹)"),
    amtInput
  ));

  /* Jaldi ke liye — sirf wahi option jo is student ke bakaya par bante hain. */
  const presets = [];
  if (pending > 0) presets.push(["Poora bakaya", pending]);
  if (pending >= 2000) presets.push(["Aadha", Math.round(pending / 2)]);
  [500, 1000, 2000, 5000].forEach((v) => { if (v < pending) presets.push([money(v), v]); });
  presets.push(["App me khud daalunga", 0]);

  const chips = el("div", { class: "cluster", style: { justifyContent: "center", gap: ".4rem", marginBottom: "1rem" } },
    ...presets.map(([label, v]) =>
      el("button", { type: "button", class: "chip", dataset: { amt: String(v) } }, label))
  );
  body.appendChild(chips);

  /* Phone par ye sabse seedha raasta hai: dabate hi PhonePe/GPay/Paytm khud
     khul jaati hai, amount aur reference bhare hue. QR sirf tab chahiye jab
     student kisi doosre phone se scan kar raha ho — ya laptop par ho, jahan
     upi:// link koi app nahi kholta. */
  const payBtn = el("a", { class: "btn-ssz btn-primary-ssz btn-block-ssz", href: "#" },
    el("span", { html: icon("wallet", { size: 18 }) }), "UPI app me pay karein");
  body.appendChild(payBtn);
  body.appendChild(el("p", { style: { margin: ".5rem 0 1.25rem", fontSize: ".76rem", color: "var(--text-muted)" } },
    "App na khule to niche wala QR kisi bhi UPI app se scan kar lein."));

  const canvas = el("canvas", { style: { maxWidth: "100%", height: "auto", borderRadius: "8px" } });
  const holder = el("div", { style: { background: "#fff", padding: "16px", borderRadius: "12px", display: "inline-block" } }, canvas);
  body.appendChild(holder);

  body.appendChild(el("p", { style: { margin: "1rem 0 .25rem", fontWeight: "600" } }, upiId));
  const caption = el("p", { style: { margin: 0, fontSize: ".85rem", color: "var(--text-muted)" } });
  body.appendChild(caption);
  const hint = el("p", { style: { margin: ".4rem 0 0", fontSize: ".78rem", color: "var(--warning, #b45309)" } });
  body.appendChild(hint);
  body.appendChild(el("p", { style: { margin: "1rem 0 0", fontSize: ".78rem", color: "var(--text-muted)" } },
    "Payment ho jaane ke baad niche \"Ho gaya\" dabaayein — tabhi institute ko pata chalega aur receipt banegi."));

  /* Payment karne ke turant baad wahi se bata dena sabse aasaan hai — amount
     bhi apne aap agli screen me chala jaata hai, dobara type nahi karna. */
  const doneBtn = el("button", { class: "btn-ssz btn-success-ssz", type: "button" }, "Ho gaya — bata dein");
  const closeBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Band karein");
  const m = openModal({ title: "UPI se pay karein", body, footer: [closeBtn, doneBtn] });
  closeBtn.addEventListener("click", () => m.close(null));
  doneBtn.addEventListener("click", () => {
    const amt = Math.max(0, Math.round(Number(amtInput.value) || 0));
    m.close(null);
    setTimeout(() => proofDialog(amt), 220);
  });

  let lib = null;
  let failed = false;
  const redraw = async () => {
    const amt = Math.max(0, Math.round(Number(amtInput.value) || 0));
    payBtn.href = upiPayload(upiId, amt);
    payBtn.lastChild.textContent = amt > 0
      ? ` ${money(amt)} pay karein`
      : " UPI app me pay karein";
    caption.textContent = amt > 0
      ? `${money(amt)} · ${student.studentId || ""}`
      : `Amount app me daalein · ${student.studentId || ""}`;
    hint.textContent = (pending > 0 && amt > pending)
      ? `Aapka bakaya sirf ${money(pending)} hai.`
      : "";
    if (failed) return;
    try {
      lib = lib || await import("../tools/qrcode.js");
      lib.drawQR(canvas, lib.qrMatrix(upiPayload(upiId, amt), "M"), { scale: 6, margin: 3 });
    } catch {
      failed = true;
      holder.replaceChildren(el("p", { style: { color: "#0f172a", fontSize: ".85rem", margin: 0 } },
        `QR nahi ban paaya. Seedhe is UPI id par bhej dein: ${upiId}`));
    }
  };

  let t = null;
  amtInput.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(redraw, 250);
  });
  on(chips, "click", ".chip", (e, chip) => {
    const v = Number(chip.dataset.amt) || 0;
    amtInput.value = v > 0 ? String(v) : "";
    redraw();
  });

  redraw();
}

/* Screenshot ab zaroori nahi hai — bahut se students phone se pay karke
   turant wapas aate hain aur screenshot lena bhool jaate hain. Sirf amount
   maangte hain, screenshot marzi ka. Bina screenshot ke bhi institute ko
   turant pata chal jaata hai ki kis student ne kitna bheja hai. */
function proofDialog(prefillAmount = 0) {
  if (mode === "preview") {
    toast.info("Preview mode: Firebase connect hone ke baad ye chalega.");
    return;
  }

  const body = el("div", {});
  body.innerHTML = `
    <p style="font-size:.88rem;margin-bottom:1rem">Payment kar diya? Bas kitna bheja hai wo
    bata dein — institute ko turant pata chal jaayega. Confirm hote hi aapki fees apne aap
    update ho jaayegi aur receipt bhi ban jaayegi.</p>
    <div class="field">
      <label class="field__label" for="proofAmt">Kitna bheja? (Rs.) <span class="req">*</span></label>
      <input class="input-ssz" id="proofAmt" type="number" min="1" step="1" inputmode="numeric"
             placeholder="Jaise: 2000" value="${prefillAmount > 0 ? prefillAmount : ""}">
      <p class="field__hint" style="font-size:.76rem;color:var(--text-muted);margin:.3rem 0 0">
        Poori fees ek saath dena zaroori nahi — jitna bheja hai wahi likhein.</p>
    </div>
    <div class="field">
      <label class="field__label" for="proofRef">UPI / Transaction Ref No.</label>
      <input class="input-ssz" id="proofRef" type="text" placeholder="Jaise: 4209XXXXXX">
    </div>
    <div class="field">
      <label class="field__label">Screenshot <span style="font-weight:400;color:var(--text-muted)">(marzi ka)</span></label>
      <input class="input-ssz" type="file" id="proofFile" accept="image/jpeg,image/png,image/webp" style="padding:.6rem">
      <p class="field__hint" style="font-size:.76rem;color:var(--text-muted);margin:.3rem 0 0">
        Laga denge to confirm hone me aur jaldi hogi.</p>
    </div>
    <div class="progress-ssz" hidden id="proofProg"><div class="progress-ssz__bar"></div></div>`;

  const submitBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Bhej dein");
  const cancelBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Cancel");
  const m = openModal({ title: "Payment ki jaankari", body, footer: [cancelBtn, submitBtn] });
  cancelBtn.addEventListener("click", () => m.close());

  submitBtn.addEventListener("click", async () => {
    /* Student jitna bheja hai wahi likhta hai — partial payment bhi chalega.
       Admin apne bank/PhonePe se milaakar isi rakam ko confirm karta hai. */
    const paidAmount = Math.round(Number(body.querySelector("#proofAmt").value) || 0);
    if (paidAmount < 1) return toast.error("Kitna bheja hai wo amount daalein.");

    const file = body.querySelector("#proofFile").files[0];
    if (file) {
      const check = validateFile(file, "image");
      if (!check.ok) return toast.error(check.error);
    }

    try {
      submitBtn.disabled = true;
      const progWrap = body.querySelector("#proofProg");
      const bar = progWrap.querySelector(".progress-ssz__bar");
      const txnRef = body.querySelector("#proofRef").value.trim();

      const { create, update } = await import("../../firebase/db-service.js");
      const { FEE_STATUS } = await import("../core/constants.js");
      const feeId = await create(COLLECTIONS.FEES, {
        studentId: student.studentId,
        studentName: student.fullName || "",
        courseName: student.courseName || "",
        batchId: student.batchId || "",
        amount: 0,
        claimedAmount: paidAmount,
        mode: "upi",
        installmentNo: 0,
        status: FEE_STATUS.PENDING,
        paidOn: null,
        remarks: `Student ne ${money(paidAmount)} bheja bataya hai — apne bank se milaakar confirm karein`
      });

      if (file) {
        progWrap.hidden = false;
        await data.uploadFeeProof(student, feeId, file, txnRef, (p) => { bar.style.width = `${p}%`; });
      } else if (txnRef) {
        await update(COLLECTIONS.FEES, feeId, { txnRef });
      }

      m.close();
      toast.success("Institute ko bata diya gaya! Confirm hote hi yahin dikh jaayega.");
      fees = await data.getFees(student);
      paintRows();
      payBox();
    } catch (err) {
      submitBtn.disabled = false;
      toast.error(err.message || "Bhejne me dikkat aayi.");
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
  /* Firestore paidOn se sort karta hai aur confirm hone se pehle paidOn khaali
     rehta hai, isliye nayi payment sabse niche chali jaati. Jo confirm hona
     baaki hai use sabse upar rakhte hain — wahi to dekhna hota hai. */
  fees.sort((a, b) => {
    const pa = a.status === "pending-verification" ? 0 : 1;
    const pb = b.status === "pending-verification" ? 0 : 1;
    return pa - pb;
  });
  if (!fees.length) {
    render($("#feeRows"), el("tr", {}, el("td", { colspan: "6", style: { textAlign: "center", padding: "2rem", color: "var(--text-muted)" } },
      "Abhi tak koi payment record nahi hai.")));
    return;
  }
  render($("#feeRows"), fees.map((f) => el("tr", {},
    el("td", { style: { fontFamily: "var(--font-mono)", fontSize: ".78rem" } }, f.receiptNo || "—"),
    el("td", {}, f.paidOn ? formatDate(f.paidOn) : "—"),
    el("td", {}, MODE_LABEL[f.mode] || f.mode || "—"),
    /* Jab tak confirm nahi hua tab tak amount 0 hi rehta hai — us waqt wahi
       rakam dikhate hain jo student ne batayi thi, warna row "₹0" lagta hai. */
    el("td", { class: "num", style: { fontWeight: 600, color: "var(--text-primary)" } },
      f.status === "paid" ? money(f.amount) : money(Number(f.claimedAmount) || f.amount || 0)),
    el("td", {}, f.status === "paid"
      ? el("span", { class: "badge-ssz badge-dot badge-success" }, "Paid")
      : f.status === "pending-verification"
        ? el("span", { class: "badge-ssz badge-dot badge-warning" }, "Confirm hona baaki")
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

function paintStats() {
  render($("#feeStats"),
    tile("wallet", money(student.totalFee || 0), "Total Fees", "accent"),
    tile("checkCircle", money(student.paidFee || 0), "Jama ho chuki", "success"),
    tile("alert", money(student.pendingFee || 0), "Bakaya", (student.pendingFee || 0) > 0 ? "warning" : "success"),
    tile("calendar", student.nextDueDate ? formatDate(student.nextDueDate) : "—", "Agli due date", "danger")
  );
}

paintStats();
payBox();
paintRows();

/* --------------------------------------------------------------------------
   Live confirmation — jaise hi institute payment confirm karta hai, ye page
   khud badal jaata hai: totals update, receipt ka button aa jaata hai, aur
   student ko wahin toast dikhta hai. Page refresh karne ki zaroorat nahi.
   -------------------------------------------------------------------------- */
if (mode === "live" && student?.studentId) {
  try {
    const { watchMany } = await import("../../firebase/db-service.js");
    const wasPaid = new Set(fees.filter((f) => f.status === "paid").map((f) => f.id));
    let first = true;

    watchMany(
      COLLECTIONS.FEES,
      { where: [["studentId", "==", student.studentId]], orderBy: ["paidOn", "desc"], limit: 60 },
      async (rows) => {
        fees = rows;
        const freshlyPaid = rows.filter((f) => f.status === "paid" && !wasPaid.has(f.id));
        rows.filter((f) => f.status === "paid").forEach((f) => wasPaid.add(f.id));

        if (!first && freshlyPaid.length) {
          // Totals students/{id} me rehte hain — admin unhe update karta hai
          const fresh = await data.getStudent(shell.user).catch(() => null);
          if (fresh) student = fresh;
          freshlyPaid.forEach((f) => toast.success(
            `${money(f.amount)} jama ho gaya · Receipt ${f.receiptNo || ""}`.trim(),
            { title: "Payment confirm ho gaya!" }
          ));
          paintStats();
        }
        first = false;
        payBox();
        paintRows();
      }
    );
  } catch (err) {
    console.warn("[fees] live watch unavailable:", err);
  }
}

on($("#feeRows"), "click", "[data-receipt]", (e, btn) => {
  const f = fees.find((x) => x.id === btn.dataset.receipt);
  if (f) receiptView(f);
});
