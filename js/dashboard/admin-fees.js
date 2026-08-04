/* ==========================================================================
   Soft Skill Zone — Admin: Fee Management
   Collect fee -> receipt number -> student totals update; verify
   student-uploaded payment proofs; history + search + CSV export; print.
   ========================================================================== */

import { $, el, on, render, escapeHtml } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { money, amountInWords, formatDate, formatPhone, exportCSV, debounce, sum } from "../core/utils.js";
import { open as openModal, confirm as confirmModal } from "../core/modal.js";
import { createValidator, rules } from "../core/validators.js";
import { initAdminShell, watchPendingFees } from "./admin-shell.js";
import { DEMO_STUDENTS, DEMO_FEE_ROWS } from "./admin-demo.js";
import { COLLECTIONS, ID_FORMATS, FEE_STATUS, PAYMENT_MODES } from "../core/constants.js";
import { INSTITUTE } from "../config/site-data.js";
import { currentDue, feeStatus, nextDueFrom, FEE_STATUS_LABEL } from "../core/fee-plan.js";
import toast from "../core/toast.js";

let mode = "preview", fees = [], students = [], unmatched = [], term = "";

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
/* Student ke dashboard par turant dikhne wali khabar. Fees confirm hote hi
   uski fees page khud update ho jaati hai, par notification bell me bhi ek
   pakka record reh jaata hai jise wo baad me dekh sake. */
async function notifyStudent(studentId, title, message) {
  if (mode === "preview" || !studentId) return;
  try {
    const { create } = await import("../../firebase/db-service.js");
    await create(COLLECTIONS.NOTIFICATIONS, {
      title, message,
      type: "fee",
      priority: "normal",
      audience: "student",
      studentId,
      batchId: "",
      readBy: [],
      createdBy: "admin"
    });
  } catch (err) {
    // Notification na jaaye to bhi payment to jama ho hi chuki hai
    console.warn("[fees] notification failed:", err);
  }
}

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

  /* Payment jama hote hi agli kist badal jaati hai — nayi due date wahin se
     nikaal kar likh dete hain, taaki student ke dashboard par aur reminder
     wali list me sahi tareekh dikhe. */
  const after = {
    ...student,
    paidFee: (Number(student.paidFee) || 0) + amount,
    pendingFee: Math.max(0, (Number(student.pendingFee) || 0) - amount)
  };
  await update(COLLECTIONS.STUDENTS, student.studentId, {
    paidFee: increment(amount),
    pendingFee: increment(-amount),
    nextDueDate: nextDueFrom(after)
  });

  const left = Math.max(0, (Number(student.pendingFee) || 0) - amount);
  await notifyStudent(student.studentId,
    `${money(amount)} jama ho gaya`,
    `Aapka ${money(amount)} ka payment confirm ho gaya hai. Receipt No. ${receiptNo}. ` +
    (left > 0 ? `Ab bakaya ${money(left)} hai.` : "Aapki poori fees jama ho chuki hai — dhanyavaad!"));

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
        tiles(); paintDue(); paintRows();
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
  /* Student jitna bheja bataya hai wahi pehle se bhar dete hain — aksar wahi
     sahi hota hai. Screenshot alag dikhaye to yahin badal dein. */
  const claimed = Number(f.claimedAmount) || 0;
  const form = el("form", { novalidate: true });
  form.innerHTML = `
    <div class="field">
      <label class="field__label">Amount (Rs.) <span class="req">*</span></label>
      <input class="input-ssz" name="amount" type="number" min="1" placeholder="Screenshot me jitna hai"
             value="${claimed > 0 ? claimed : ""}">
      <div class="field__error"></div>
      ${claimed > 0 ? `<p style="font-size:.76rem;color:var(--text-muted);margin:.3rem 0 0">Student ne ${money(claimed)} bataya hai.</p>` : ""}
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
        tiles(); paintVerify(); paintDue(); paintRows();
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
      await notifyStudent(f.studentId, "Payment confirm nahi ho paaya",
        "Aapne jo payment bataya tha wo humein nahi mila. Kripya transaction reference ke saath institute se sampark karein — koi paisa kata ho to wo wapas aa jaayega.");
      f.status = "failed";
      m.close(); paintVerify(); tiles();
      toast.success("Failed mark ho gaya — student ko bata diya gaya.");
    } catch (err) { toast.error(err.message || "Fail ho gaya."); }
  });
}

/* ==========================================================================
   Receipt print
   ========================================================================== */
/* Receipt ki har line bahar se aayi hai — studentName seedha public admission
   form se aata hai, remarks admin ya webhook se, courseName record se. Inhe
   bina escape kiye HTML me daalna admin ke apne browser me script chalane ka
   raasta khol deta tha: naam ki jagah `<img src=x onerror="...">` bhar do,
   admin receipt kholte hi wo chal jaata. Isliye har value escapeHtml() se
   guzarti hai. Key (bayan taraf ka label) hamare apne likhe hue hain, phir
   bhi ek hi niyam rakhna aasan aur surakshit hai. */
function receiptView(f) {
  const rows = [
    ["Receipt No.", f.receiptNo],
    ["Date", formatDate(f.paidOn)],
    ["Student", `${f.studentName || ""} (${f.studentId || ""})`],
    ["Course", f.courseName || "—"],
    ["Mode", MODE_LABEL[f.mode] || f.mode],
    ["Amount", `${money(f.amount)} — ${amountInWords(f.amount)}`],
    ["Remarks", f.remarks || "—"]
  ];

  const body = el("div", { class: "receipt-sheet" });
  body.innerHTML = `
    <div style="text-align:center;border-bottom:2px solid #4f46e5;padding-bottom:12px;margin-bottom:16px">
      <h2 style="margin:0;font-size:1.3rem;color:#312e81">Soft Skill Zone Institute</h2>
      <p style="margin:2px 0 0;font-size:.8rem">${escapeHtml(INSTITUTE.address)} · ${escapeHtml(formatPhone(INSTITUTE.phone))}</p>
      <p style="margin:6px 0 0;font-weight:700;letter-spacing:.08em;font-size:.8rem">FEE RECEIPT</p>
    </div>
    <table style="width:100%;font-size:.88rem;border-collapse:collapse">
      ${rows.map(([k, v]) =>
        `<tr><td style="padding:6px 0;color:#555;width:32%">${escapeHtml(k)}</td><td style="padding:6px 0;font-weight:600">${escapeHtml(v)}</td></tr>`
      ).join("")}
    </table>
    <p style="margin-top:20px;font-size:.72rem;color:#666;text-align:center">Computer-generated receipt.</p>`;

  const printBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Print / PDF");
  const closeBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Band karein");
  const m = openModal({ title: f.receiptNo || "Receipt", size: "lg", body, footer: [closeBtn, printBtn] });
  closeBtn.addEventListener("click", () => m.close());
  printBtn.addEventListener("click", () => {
    /* body.innerHTML ab escape ho chuka hai, par <title> me receiptNo alag se
       jaata hai — use bhi escape karna zaroori hai. */
    const w = window.open("", "_blank", "width=800,height=900");
    w.document.write(`<html><head><title>${escapeHtml(f.receiptNo || "Receipt")}</title></head><body style="font-family:Arial,sans-serif">${body.innerHTML}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  });
}

/* ==========================================================================
   Bakaya — kiske paas kitna, aur kab se
   --------------------------------------------------------------------------
   Sabse upar wo naam jinki tareekh sabse pehle nikal chuki hai. Har naam ke
   aage WhatsApp ka button, message pehle se likha hua — sirf bhejna hai.
   ========================================================================== */
function dueRows() {
  return students
    .filter((s) => s.status === "active" && (Number(s.pendingFee) || 0) > 0)
    .map((s) => ({ s, due: currentDue(s), state: feeStatus(s) }))
    .filter((r) => r.state === "overdue" || r.state === "today" || r.state === "unplanned")
    .sort((a, b) => (b.due?.overdueDays || 0) - (a.due?.overdueDays || 0));
}

/** WhatsApp par bhejne wala message — chhota, seedha aur izzat ke saath. */
function reminderText(s, due) {
  const name = (s.fullName || "").split(" ")[0] || "ji";
  const days = due?.overdueDays || 0;
  const amt = due ? money(due.remaining) : money(s.pendingFee || 0);

  const lines = [`Namaste ${name} ji, Soft Skill Zone se.`];
  if (days > 0) lines.push(`Aapki ${amt} ki fees ki tareekh ${days} din pehle nikal chuki hai.`);
  else if (due)  lines.push(`Aapki ${amt} ki fees aaj tak jama karni hai.`);
  else           lines.push(`Aapki ${amt} ki fees abhi baaki hai.`);
  lines.push("Website par login karke UPI se bhej sakte hain, ya institute aakar de sakte hain.");
  lines.push("Koi dikkat ho to bata dijiye — hum raasta nikal lenge.");
  return lines.join("\n");
}

function waLink(s, due) {
  const num = String(s.whatsapp || s.mobile || "").replace(/\D/g, "").slice(-10);
  if (num.length !== 10) return null;
  return `https://wa.me/91${num}?text=${encodeURIComponent(reminderText(s, due))}`;
}

function paintDue() {
  const rows = dueRows();
  $("#dueSection").hidden = !rows.length;
  if (!rows.length) return;

  render($("#dueList"), rows.map(({ s, due, state }) => {
    const [badgeCls, badgeText] = FEE_STATUS_LABEL[state];
    const link = waLink(s, due);
    const sub = state === "unplanned"
      ? "Fees ka schedule nahi bana — Students page se bana dein"
      : (due.overdueDays > 0
          ? `${due.overdueDays} din se bakaya · kist ${due.no} · due thi ${formatDate(due.dueDate)}`
          : `Aaj due hai · kist ${due.no}`);

    return el("div", { class: "card-ssz", style: { borderLeft: `3px solid var(--${state === "overdue" ? "danger" : "warning"})` } },
      el("div", { class: "card-ssz__body", style: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", padding: "1rem 1.25rem" } },
        el("span", { style: { flex: 1, minWidth: "220px" } },
          el("strong", { style: { display: "block", fontSize: ".93rem" } },
            s.fullName || s.studentId,
            el("span", { class: `badge-ssz ${badgeCls}`, style: { marginLeft: ".5rem", fontSize: ".62rem" } }, badgeText)),
          el("span", { style: { fontSize: ".78rem", color: "var(--text-muted)" } }, sub)),
        el("span", { class: "num", style: { fontWeight: 700, fontSize: "1rem", color: "var(--danger)" } },
          money(due ? due.remaining : s.pendingFee || 0)),
        el("span", { class: "cluster", style: { gap: ".5rem" } },
          link
            ? el("a", { class: "btn-ssz btn-success-ssz btn-sm-ssz", href: link, target: "_blank", rel: "noopener" },
                el("span", { html: icon("mail", { size: 15 }) }), " WhatsApp")
            : el("span", { style: { fontSize: ".76rem", color: "var(--text-muted)" } }, "Mobile number nahi hai"),
          el("button", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", type: "button", dataset: { collectFor: s.studentId } },
            "Fee lein"))
      ));
  }));
}

/** Sabhi bakaya walon ko unke dashboard par reminder — bina WhatsApp khole. */
async function notifyAllDue(btn) {
  const rows = dueRows();
  if (!rows.length) return toast.info("Abhi kisi ka bakaya nahi hai.");

  const ok = await confirmModal({
    title: `${rows.length} students ko yaad dilayein?`,
    message: "Har student ke dashboard par fees ka reminder chala jayega. WhatsApp alag se bhejna hoga.",
    confirmText: "Haan, bhej dein"
  });
  if (!ok) return;
  if (mode === "preview") return toast.info("Preview mode: Firebase ke baad asli jayega.");

  btn.disabled = true;
  let sent = 0;
  for (const { s, due } of rows) {
    const amt = due ? money(due.remaining) : money(s.pendingFee || 0);
    const msg = due && due.overdueDays > 0
      ? `Aapki ${amt} ki fees ki tareekh ${due.overdueDays} din pehle nikal chuki hai. Kripya jald jama kar dein.`
      : `Aapki ${amt} ki fees jama karni hai. Website se UPI se bhej sakte hain.`;
    await notifyStudent(s.studentId, "Fees ka reminder", msg);
    sent++;
  }
  btn.disabled = false;
  toast.success(`${sent} students ko reminder bhej diya gaya.`);
}

/* ==========================================================================
   Lists
   ========================================================================== */
/* Ek tap me confirm — student ne jo rakam batayi hai wahi jama ho jaati hai.
   Rakam badalni ho, screenshot dekhna ho ya reject karna ho to "Details". */
function paintVerify() {
  const pend = fees.filter((f) => f.status === FEE_STATUS.PENDING);
  $("#verifySection").hidden = !pend.length;
  render($("#verifyList"), pend.map((f) => {
    const claimed = Number(f.claimedAmount) || 0;
    const bits = [f.studentId];
    if (f.txnRef) bits.push(`Ref: ${f.txnRef}`);
    bits.push(f.proofURL && f.proofURL !== "#" ? "screenshot laga hai" : "screenshot nahi hai");

    return el("div", { class: "card-ssz", style: { borderLeft: "3px solid var(--warning)" } },
      el("div", { class: "card-ssz__body", style: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", padding: "1rem 1.25rem" } },
        el("span", { class: "stat-tile__icon", style: { background: "var(--warning-soft)", color: "var(--warning)" }, html: icon("clock", { size: 20 }) }),
        el("span", { style: { flex: 1, minWidth: "200px" } },
          el("strong", { style: { display: "block", fontSize: ".92rem" } },
            `${f.studentName || f.studentId}${claimed ? ` — ${money(claimed)}` : ""}`),
          el("span", { style: { fontSize: ".78rem", color: "var(--text-muted)" } }, bits.join(" · "))),
        el("span", { class: "cluster", style: { gap: ".5rem" } },
          el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", type: "button", dataset: { verify: f.id } }, "Details"),
          claimed > 0
            ? el("button", { class: "btn-ssz btn-success-ssz btn-sm-ssz", type: "button", dataset: { quick: f.id } },
                el("span", { html: icon("checkCircle", { size: 16 }) }), ` ${money(claimed)} confirm`)
            : el("button", { class: "btn-ssz btn-primary-ssz btn-sm-ssz", type: "button", dataset: { verify: f.id } }, "Verify karein")
        )
      ));
  }));
}

/* ==========================================================================
   ₹1 ka test link — sirf admin ke liye
   --------------------------------------------------------------------------
   Payment ka poora raasta — paisa jaana, Razorpay ka webhook aana, fees
   chadhna, receipt banna — asli paise se ek baar jaanche bina bharosa nahi
   kiya ja sakta. Wo test ₹1 me ho jaana chahiye.

   Chhoot server par hai (functions/index.js): jab link maangne wala admin ho
   to kam se kam rakam ₹1. Student ke liye hadd wahi 10% / ₹100 rehti hai,
   isliye is button se koi khatra nahi banta — koi visitor ise chhoo hi nahi
   sakta, aur uske apne dashboard se ₹1 ka link banta hi nahi.
   ========================================================================== */
async function testLinkDialog() {
  if (mode === "preview") return toast.info("Preview mode — asli link Firebase ke baad banega.");

  /* Do tarah ke test hote hain, aur zyada zaroori DOOSRA wala hai:

     - KIST ka test: bane hue student par ₹1. Isse webhook aur receipt
       jaanche jaate hain.
     - ADMISSION ka test: jis form ka payment abhi hua hi nahi. Isse poora
       raasta jaanchta hai — paisa -> webhook -> Student ID banna -> batch
       lagna -> kist plan banna -> receipt. Isi raaste par sabse zyada cheezein
       ek saath hoti hain, isliye asli bharosa yahi test deta hai.

     Admissions yahan ki list me nahi hote (ye fees ka page hai), isliye
     dialog khulte waqt hi mangaate hain. */
  const openBtnLabel = "₹1 ka link banayein";
  let pendingAdms = [];
  try {
    const { getMany } = await import("../../firebase/db-service.js");
    const rows = await getMany(COLLECTIONS.ADMISSIONS, { limit: 100, useCache: false });
    /* Jinki Student ID ban chuki hai wo ab "admission" nahi rahe — unka
       payment student wale raaste se hota hai. */
    pendingAdms = rows.filter((a) => !a.studentId);
  } catch { /* na mile to sirf students wali list dikhegi */ }

  const withDue = students.filter((s) => (Number(s.pendingFee) || 0) > 0);

  if (!withDue.length && !pendingAdms.length) {
    return toast.warning("Na koi bakaya wala student hai, na koi bina payment wala admission — test link ke liye in dono me se ek chahiye.");
  }

  const body = el("div", {});
  const sel = el("select", { class: "select-ssz" });

  if (pendingAdms.length) {
    const g = el("optgroup", { label: "Admission (poora raasta jaanchega)" });
    pendingAdms.forEach((a) => {
      const total = (Number(a.courseFee) || 0) + (Number(a.admissionFee) || 0);
      g.appendChild(el("option", { value: `admission:${a.applicationNo || a.id}` },
        `${a.fullName || a.applicationNo || a.id} — ${a.applicationNo || a.id}${total ? ` (kul ${money(total)})` : ""}`));
    });
    sel.appendChild(g);
  }
  if (withDue.length) {
    const g = el("optgroup", { label: "Kist (bane hue student)" });
    withDue.forEach((s) => g.appendChild(el("option", { value: `student:${s.studentId}` },
      `${s.fullName || s.studentId} — ${s.studentId} (bakaya ${money(s.pendingFee)})`)));
    sel.appendChild(g);
  }

  body.appendChild(el("p", { style: { fontSize: ".88rem", marginBottom: ".9rem" } },
    "₹1 ka asli payment link banega. Ye chhoot sirf aapke admin login par hai — " +
    "student ya visitor ke liye hadd wahi 10% / ₹100 rehti hai."));
  body.appendChild(el("div", { class: "field" },
    el("label", { class: "field__label" }, "Kiske naam par?"), sel));
  body.appendChild(el("p", { style: { fontSize: ".78rem", color: "var(--text-muted)", margin: ".7rem 0 0" } },
    "Admission wala chunenge to payment poora hote hi Student ID, batch aur kist plan apne aap ban jayenge — " +
    "wahi jaanchne layak asli cheez hai. Test Mode me paisa nahi katta; Live hone ke baad ye ₹1 sach me kategaa."));

  const goBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, openBtnLabel);
  const m = openModal({ title: "₹1 Test Link", body, footer: [goBtn] });

  goBtn.addEventListener("click", async () => {
    const [kind, id] = String(sel.value || "").split(":");
    if (!kind || !id) return;
    goBtn.disabled = true;
    goBtn.textContent = "Link ban raha hai…";
    try {
      const pay = await import("../../firebase/pay-service.js");
      const { url, amount } = await pay.createPaymentLink(kind, id, 1);
      m.close();
      /* Link naye tab me nahi kholte — click ke andar await ho chuka hai,
         browser use "bina tap ke popup" samajh kar rok dega. Isliye link
         dikha dete hain aur copy karne ka button de dete hain. */
      showLink(url, amount, id);
    } catch (err) {
      goBtn.disabled = false;
      goBtn.textContent = openBtnLabel;
      const { payError } = await import("../../firebase/pay-service.js");
      toast.error(payError(err));
    }
  });
}

function showLink(url, amount, sid) {
  const body = el("div", {});
  body.appendChild(el("p", { style: { fontSize: ".88rem", marginBottom: ".8rem" } },
    `${money(amount)} ka link ban gaya — ${sid} ke naam par.`));
  const input = el("input", { class: "input-ssz", type: "text", value: url, readonly: true });
  body.appendChild(input);

  const copyBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Copy karein");
  const openBtn = el("a", { class: "btn-ssz btn-primary-ssz", href: url, target: "_blank", rel: "noopener" }, "Kholein");
  openModal({ title: "Test link taiyar", body, footer: [copyBtn, openBtn] });

  copyBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copy ho gaya."); }
    catch { input.select(); toast.info("Link chun liya — Ctrl+C dabayein."); }
  });
}

/* ==========================================================================
   Bina jude payment — paisa aa gaya, par kiska?
   --------------------------------------------------------------------------
   Ye wo payments hain jinke saath hamare `notes` nahi aaye — aksar tab jab
   link Razorpay dashboard se haath se banaya gaya ho. Pehle webhook inhe
   chupchaap chhod deta tha: paisa bank me aa jaata aur kahin darj hi nahi
   hota. Ab wo yahan aa jaate hain.

   Code jaanbujh kar KHUD nahi jodta. Email ya mobile se apne aap milaana
   aasan hota, par ek hi number do bhai-behen ka ho sakta hai — aur galat
   khaate me paisa chadhana kho dene se bhi bura hai. Isliye faisla aapka,
   aur code sirf sabse mumkin naam upar dikha deta hai.

   Rakam yahan se kabhi nahi bheji jaati. Function wahi rakam maanta hai jo
   Razorpay ne park karte waqt likhi thi.
   ========================================================================== */
function paintUnmatched() {
  const open = unmatched.filter((u) => u.status !== "attached");
  $("#unmatchedSection").hidden = !open.length;
  if (!open.length) return;

  render($("#unmatchedList"), open.map((u) => {
    const bits = [];
    if (u.payerContact) bits.push(u.payerContact);
    if (u.payerEmail) bits.push(u.payerEmail);
    if (u.description) bits.push(u.description);
    bits.push(formatDate(u.paidOn));

    const select = el("select", { class: "select-ssz", style: { minWidth: "220px" }, dataset: { pick: u.id } },
      el("option", { value: "" }, "Student chunein…"),
      ...guessOrder(u).map((s) =>
        el("option", { value: s.studentId }, `${s.fullName || s.studentId} — ${s.studentId}`)));

    return el("div", { class: "card-ssz", style: { borderLeft: "3px solid var(--danger)" } },
      el("div", { class: "card-ssz__body", style: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", padding: "1rem 1.25rem" } },
        el("span", { class: "stat-tile__icon", style: { background: "var(--danger-soft)", color: "var(--danger)" }, html: icon("alert", { size: 20 }) }),
        el("span", { style: { flex: 1, minWidth: "220px" } },
          el("strong", { style: { display: "block", fontSize: ".92rem" } },
            `${money(u.amount)}${u.payerName ? ` — ${u.payerName}` : ""}`),
          el("span", { style: { fontSize: ".78rem", color: "var(--text-muted)" } }, bits.join(" · "))),
        el("span", { class: "cluster", style: { gap: ".5rem", flexWrap: "wrap" } },
          select,
          el("button", { class: "btn-ssz btn-primary-ssz btn-sm-ssz", type: "button", dataset: { attach: u.id } }, "Jodein"))
      ));
  }));
}

/* Sabse mumkin naam sabse upar — mobile ya email milne par. Ye sirf list ka
   kram hai, chunav aapka hi rehta hai. */
function guessOrder(u) {
  const phone = String(u.payerContact || "").replace(/\D/g, "").slice(-10);
  const email = String(u.payerEmail || "").toLowerCase();
  const score = (s) => {
    let n = 0;
    if (phone && [s.mobile, s.whatsapp].some((x) => String(x || "").replace(/\D/g, "").slice(-10) === phone)) n += 2;
    if (email && String(s.email || "").toLowerCase() === email) n += 2;
    if ((Number(s.pendingFee) || 0) > 0) n += 1;
    return n;
  };
  return [...students].sort((a, b) => score(b) - score(a) || String(a.fullName || "").localeCompare(String(b.fullName || "")));
}

async function attachUnmatched(u, btn) {
  const sel = $(`[data-pick="${u.id}"]`);
  const studentId = sel?.value || "";
  if (!studentId) return toast.warning("Pehle student chunein.");

  const s = students.find((x) => x.studentId === studentId);
  const ok = await confirmModal({
    title: "Payment jodein?",
    message: `${money(u.amount)} ${s?.fullName || studentId} (${studentId}) ke khaate me chadh jayega aur receipt ban jayegi. ` +
      "Ye wapas nahi hota — galat student chuna ho to abhi rok dein.",
    confirmText: "Haan, jod dein"
  });
  if (!ok) return;

  if (mode === "preview") {
    u.status = "attached";
    paintUnmatched();
    return toast.info("Preview mode — kuchh save nahi hua.");
  }

  try {
    btn.disabled = true;
    const { attachPayment } = await import("../../firebase/pay-service.js");
    const res = await attachPayment(u.razorpayPaymentId, studentId);

    u.status = "attached";
    u.studentId = studentId;
    if (s) {
      s.paidFee = (Number(s.paidFee) || 0) + u.amount;
      s.pendingFee = Math.max(0, (Number(s.pendingFee) || 0) - u.amount);
    }
    paintUnmatched(); tiles(); paintDue();

    toast.success(res?.alreadyDone
      ? "Ye payment pehle hi jud chuka tha."
      : `${money(u.amount)} ${s?.fullName || studentId} ke khaate me chadh gaya.`);

    /* Nayi receipt list me laane ke liye — poora page refresh karne se
       behtar hai sirf fees dobara padh lena. */
    if (!res?.alreadyDone) await reloadFees();
  } catch (err) {
    btn.disabled = false;
    const { payError } = await import("../../firebase/pay-service.js");
    toast.error(payError(err));
  }
}

async function reloadFees() {
  try {
    const { getMany } = await import("../../firebase/db-service.js");
    fees = await getMany(COLLECTIONS.FEES, { orderBy: ["paidOn", "desc"], limit: 300, useCache: false });
    tiles(); paintRows();
  } catch { /* list purani reh jayegi, par jodna ho chuka hai — koi nuksaan nahi */ }
}

/** Ek tap wala raasta — student ki batayi rakam seedhe jama kar deta hai. */
async function quickConfirm(f, btn) {
  const claimed = Number(f.claimedAmount) || 0;
  if (claimed < 1) return verifyDialog(f);

  const student = students.find((s) => s.studentId === f.studentId);
  const ok = await confirmModal({
    title: `${money(claimed)} confirm karein?`,
    message: `${f.studentName || f.studentId} ka ${money(claimed)} jama maan liya jaayega — receipt ban jaayegi aur student ko notification chali jaayegi. ` +
             "Pehle apne bank/PhonePe me dekh lein ki paisa aa gaya hai.",
    confirmText: "Haan, aa gaya hai"
  });
  if (!ok) return;

  try {
    btn && (btn.disabled = true);
    const doc = await saveCollection({
      student: student || { studentId: f.studentId, fullName: f.studentName },
      amount: claimed,
      payMode: f.mode || "upi",
      remarks: "Student ki batayi rakam confirm ki gayi",
      existingFeeId: f.id,
      txnRef: f.txnRef || ""
    });
    if (!doc) return;
    Object.assign(f, doc, { status: "paid" });
    if (student) {
      student.paidFee = (student.paidFee || 0) + claimed;
      student.pendingFee = Math.max(0, (student.pendingFee || 0) - claimed);
    }
    tiles(); paintVerify(); paintDue(); paintRows();
    toast.success(`${money(claimed)} jama ho gaya — ${doc.receiptNo}`);
  } catch (err) {
    btn && (btn.disabled = false);
    toast.error(err.message || "Confirm nahi ho paaya.");
  }
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
  [fees, students, unmatched] = await Promise.all([
    getMany(COLLECTIONS.FEES, { orderBy: ["paidOn", "desc"], limit: 300, useCache: false }).catch(() => []),
    getMany(COLLECTIONS.STUDENTS, { limit: 500, useCache: false }).catch(() => []),
    /* Naya collection hai — purane project me index ya permission na hone par
       poora page khaali na ho jaye, isliye alag se catch. */
    getMany(COLLECTIONS.UNMATCHED_PAYMENTS, { orderBy: ["createdAt", "desc"], limit: 100, useCache: false }).catch(() => [])
  ]);
}

tiles(); paintUnmatched(); paintVerify(); paintDue(); paintRows();

$("#feeCollect").addEventListener("click", () => collectDialog());
$("#feeTestLink").addEventListener("click", () => testLinkDialog());
$("#dueNotifyAll").addEventListener("click", (e) => notifyAllDue(e.currentTarget));

on($("#dueList"), "click", "[data-collect-for]", (e, btn) => {
  const s = students.find((x) => x.studentId === btn.dataset.collectFor);
  if (s) collectDialog(s);
});
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

on($("#unmatchedList"), "click", "[data-attach]", (e, btn) => {
  const u = unmatched.find((x) => x.id === btn.dataset.attach);
  if (u) attachUnmatched(u, btn);
});

on($("#verifyList"), "click", "[data-verify]", (e, btn) => {
  const f = fees.find((x) => x.id === btn.dataset.verify);
  if (f) verifyDialog(f);
});
on($("#verifyList"), "click", "[data-quick]", (e, btn) => {
  const f = fees.find((x) => x.id === btn.dataset.quick);
  if (f) quickConfirm(f, btn);
});

/* Student ke payment batate hi ye list khud bhar jaati hai — page refresh
   karne ki zaroorat nahi. Toast admin-shell se aata hai. */
watchPendingFees((rows) => {
  const fresh = rows.filter((r) => !fees.some((f) => f.id === r.id));
  if (fresh.length) fees.unshift(...fresh);
  rows.forEach((r) => {
    const local = fees.find((f) => f.id === r.id);
    if (local && local.status === FEE_STATUS.PENDING) Object.assign(local, r);
  });

  /* Jo row ab pending list me nahi aayi — matlab kisi aur ne use confirm kar
     diya (doosra admin, ya isi admin ka doosra tab). Use apni local list se
     bhi hataana zaroori hai. Warna wo card yahan "verify pending" me pada
     rehta hai, aur dobara confirm dabate hi ek AUR receipt ban jaata hai —
     student ke paidFee me wahi rakam do baar chadh jaati hai. */
  const live = new Set(rows.map((r) => r.id));
  fees = fees.filter((f) => f.status !== FEE_STATUS.PENDING || live.has(f.id));

  tiles(); paintVerify();
});
on($("#feeRows"), "click", "[data-print]", (e, btn) => {
  const f = fees.find((x) => x.id === btn.dataset.print);
  if (f) receiptView(f);
});
