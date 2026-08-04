/* ==========================================================================
   Soft Skill Zone — Student: Fees
   Totals, due date, Razorpay se pay-now, proof upload, receipts + print.
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

/* pay-service tab pehle se utar liya jaata hai jab payment ka box banta hai.
   Wajah: click ke andar `await import(...)` karne par browser ka "user ne tap
   kiya tha" wala nishaan mit jaata hai aur naya tab block ho jaata hai —
   theek wahi galti Google login me ho chuki hai. Pehle se load hone par
   click ke waqt sirf ek microtask lagta hai, nishaan bacha rehta hai. */
let payMod = null;
const loadPay = () => (payMod ||= import("../../firebase/pay-service.js"));

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

  /* --------------------------------------------------------------------
     SIRF RAZORPAY — seedhi UPI id wala raasta 3 Aug 2026 ko hata diya gaya.

     Wajah: institute ki UPI id ek aam (personal) id hai. Google Pay browser
     se aaye link par aisi id ko payment karne se saaf mana kar deta hai —
     "declined for security reasons". Char students ke saath bilkul yahi hua.
     Bacha raasta tha QR save karke gallery se chunna: chalta to tha, par
     itne kadam the ki student atak jaata tha.

     Razorpay registered merchant hai, isliye wahan ye rok hai hi nahi — UPI,
     card, netbanking sab browser me hi chal jaate hain. Uski fee lagti hai,
     par har student ka payment sach me ho jaana usse zyada zaroori hai.
     -------------------------------------------------------------------- */

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
        el("button", { class: "btn-ssz btn-lg-ssz", style: { background: "#fff", color: "var(--ssz-indigo-700)" }, type: "button", id: "btnPay" },
          el("span", { html: icon("wallet", { size: 18 }) }), " Abhi pay karein"),
        el("button", { class: "btn-ssz btn-glass-ssz", style: { color: "#fff", borderColor: "rgba(255,255,255,.4)" }, type: "button", id: "btnProof" },
          "Payment ki jaankari dein")
      )
    ),
    el("p", { style: { margin: "1rem 0 0", fontSize: ".8rem", opacity: ".85" } },
      "UPI, card ya netbanking — sab isi ek page se. Institute aakar cash bhi de sakte hain.")
  ));

  $("#btnProof").addEventListener("click", () => proofDialog());

  /* --------------------------------------------------------------------
     Ab har baar NAYA payment link banta hai, jisme is student ki pehchaan
     juda hoti hai.

     Pehle yahan ek hi sthir Razorpay link tha. Usse paisa to aa jaata tha,
     par Razorpay ko pata hi nahi chalta tha ki paisa KISKA hai — isliye
     student ko khud "kitna bheja" batana padta tha aur admin ko dashboard
     me milaana padta tha.

     Ab link ke saath Student ID judi rehti hai, isliye paisa aate hi
     Razorpay hamare function ko khabar kar deta hai aur fees apne aap chadh
     jaati hai. "Payment ki jaankari dein" wala button phir bhi rakha hai —
     cash ya kisi aur tarike se diya ho to wahan se bataya ja sake.
     -------------------------------------------------------------------- */
  loadPay();
  $("#btnPay").addEventListener("click", () => amountDialog(pending));
}

/* Abhi kitni kist baaki hai — jitna paisa aa chuka hai use plan me se ghata
   kar pehli aisi kist dhoondhte hain jo poori nahi hui. Yahi rakam dialog me
   pehle se bhari rehti hai, kyunki 90% students utna hi bharte hain. */
function nextInstalment(pending) {
  const plan = Array.isArray(student.feePlan) ? student.feePlan : [];
  let left = Number(student.paidFee) || 0;
  for (const k of plan) {
    const amt = Number(k.amount) || 0;
    if (left >= amt) { left -= amt; continue; }
    return Math.min(pending, amt - left);
  }
  /* Plan hai hi nahi (purane students, jinka admission kist-plan aane se
     pehle hua tha) — to hum apni taraf se koi rakam nahi thopte. 0 ka matlab
     hai: khaana khaali rahega aur student khud likhega. */
  return 0;
}

/* --------------------------------------------------------------------------
   Kitna bharna hai — ye student tay karta hai, hum nahi.

   Pehle button seedha poore bakaye (₹10,000) ka link bana deta tha. Wo galat
   tha: fees mahine-mahine kist me aati hai, ek saath poori dene ki umeed
   rakhna hi galat hai. Ab dialog khulta hai jisme agli kist pehle se bhari
   hai, par student use badal sakta hai.

   Hadd server par bhi lagti hai — function Firestore se asli bakaya padh kar
   uspar clamp karta hai. Yahan ki jaanch sirf student ki suvidha ke liye hai,
   suraksha ke liye nahi.
   -------------------------------------------------------------------------- */
function amountDialog(pending) {
  if (mode === "preview") {
    toast.info("Preview mode: Firebase connect hone ke baad ye chalega.");
    return;
  }

  const kist = nextInstalment(pending);

  /* Kam se kam ₹100 — rukawat ke liye nahi, sirf ₹1,000 ki jagah ₹1 wale typo
     aur ₹5-₹10 wale payment se receipt bhar jaane se bachne ke liye. Bakaya
     isse kam bache to wahi maanga jaata hai. Asli hadd server par lagti hai;
     yahan ki sirf student ko pehle hi bata dene ke liye hai. */
  const minPay = Math.min(pending, 100);

  const body = el("div", {});
  body.innerHTML = `
    <p style="font-size:.88rem;margin-bottom:1rem">
      Kul bakaya <strong>${money(pending)}</strong>. Poora ek saath dena zaroori nahi —
      jitna abhi de sakte hain utna bhar dein.</p>
    <div class="field">
      <label class="field__label" for="payAmt">Kitna pay karna hai? (Rs.) <span class="req">*</span></label>
      <input class="input-ssz" id="payAmt" type="number" min="${minPay}" step="1" inputmode="numeric"
             max="${pending}" placeholder="Jaise: 1000" value="${kist > 0 ? kist : ""}">
      <p class="field__hint" id="payWords"
         style="font-size:.76rem;color:var(--text-muted);margin:.4rem 0 0"></p>
    </div>
    <div class="cluster" style="gap:.5rem;flex-wrap:wrap;margin-top:.25rem">
      ${kist > 0 && kist < pending ? `<button type="button" class="btn-ssz btn-secondary-ssz btn-sm-ssz"
        data-amt="${kist}">Agli kist ${money(kist)}</button>` : ""}
      <button type="button" class="btn-ssz btn-secondary-ssz btn-sm-ssz"
        data-amt="${pending}">Poora bakaya ${money(pending)}</button>
    </div>`;

  const input = body.querySelector("#payAmt");
  const words = body.querySelector("#payWords");

  const showWords = () => {
    const v = Math.round(Number(input.value) || 0);
    words.textContent = v > 0 && v <= pending ? amountInWords(v) : "";
  };
  showWords();
  input.addEventListener("input", showWords);

  body.querySelectorAll("button[data-amt]").forEach((b) => {
    b.addEventListener("click", () => { input.value = b.dataset.amt; showWords(); });
  });

  const goBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Payment page kholein");
  const cancelBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Cancel");
  const m = openModal({ title: "Fees pay karein", body, footer: [cancelBtn, goBtn], size: "sm" });
  cancelBtn.addEventListener("click", () => m.close());

  goBtn.addEventListener("click", async () => {
    const amount = Math.round(Number(input.value) || 0);
    if (!amount) return toast.error("Kitna pay karna hai wo amount daalein.");
    if (amount < minPay) return toast.error(`Kam se kam ${money(minPay)} bharna hoga. Isse kam dena ho to institute aakar cash de sakte hain.`);
    if (amount > pending) return toast.error(`Bakaya sirf ${money(pending)} hai — usse zyada nahi bhar sakte.`);

    goBtn.disabled = true;
    goBtn.textContent = "Link ban raha hai…";
    try {
      /* Tab isi click ke andar khulta hai — pehle await karke kholenge to
         phone ka browser use "bina tap ke popup" samajh kar rok dega. */
      const pay = await loadPay();
      await pay.openPaymentLink("student", student.studentId, amount, student.email);
      m.close();
      toast.info("Payment ka page khul gaya. Poora hote hi fees apne aap chadh jayegi.");
    } catch (err) {
      const pay = await loadPay();
      toast.error(pay.payError(err));
      goBtn.disabled = false;
      goBtn.textContent = "Payment page kholein";
    }
  });
}

/* Screenshot ab zaroori nahi hai — bahut se students phone se pay karke
   turant wapas aate hain aur screenshot lena bhool jaate hain. Sirf amount
   maangte hain, screenshot marzi ka. Bina screenshot ke bhi institute ko
   turant pata chal jaata hai ki kis student ne kitna bheja hai. */
function proofDialog(prefillAmount = 0, payMode = "razorpay", fromPayButton = false) {
  if (mode === "preview") {
    toast.info("Preview mode: Firebase connect hone ke baad ye chalega.");
    return;
  }

  const intro = fromPayButton
    ? "Payment ka page doosre tab me khul gaya hai. Wahan payment poora karne ke baad " +
      "yahan aakar kitna bheja hai wo bata dein — tabhi institute ko pata chalega."
    : "Payment kar diya? Bas kitna bheja hai wo bata dein — institute ko turant pata chal jaayega.";

  const body = el("div", {});
  body.innerHTML = `
    <p style="font-size:.88rem;margin-bottom:1rem">${intro}
    Confirm hote hi aapki fees apne aap update ho jaayegi aur receipt bhi ban jaayegi.</p>
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
        mode: payMode,
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
          const fresh = await data.getStudent(shell.user, { fresh: true }).catch(() => null);
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
