/* ==========================================================================
   Soft Skill Zone — Admin: Certificate issue
   Numbered + verify-coded certificates with a printable certificate view.
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatDate, copyToClipboard, debounce } from "../core/utils.js";
import { open as openModal, confirm as confirmModal } from "../core/modal.js";
import { createValidator, rules } from "../core/validators.js";
import { initAdminShell } from "./admin-shell.js";
import { DEMO_STUDENTS } from "./admin-demo.js";
import { DEMO_CERTIFICATES } from "./demo-data.js";
import { COLLECTIONS, ID_FORMATS } from "../core/constants.js";
import { INSTITUTE } from "../config/site-data.js";
import { url } from "../core/routes.js";
import { qrMatrix, qrSVG } from "../tools/qrcode.js";
import toast from "../core/toast.js";

let mode = "preview", certs = [], students = [], term = "";

/** Verify page ka poora link — QR aur "Link copy" dono isi se bante hain. */
function verifyLink(code) {
  return `${location.origin}${url("verify", { code }).replace(/^(\.\.\/)+/, "/")}`;
}

/* QR seedha SVG me banta hai — inline hone se print aur PDF dono me aata hai,
   aur kisi bhi internet/CDN par nirbhar nahi. Encoder khud project ka hai.
   Level "M" isliye ki chhapaai halki ho jaye tab bhi scan ho jaye. */
function qrTag(code) {
  try {
    const svg = qrSVG(qrMatrix(verifyLink(code), "M"), { margin: 2 });
    return `<span style="display:block;width:76px;height:76px;margin:0 auto 4px">${
      svg.replace("<svg ", '<svg style="width:100%;height:100%;display:block" ')}</span>`;
  } catch {
    /* QR na bhi bane to certificate ruke nahi — code neeche likha hi hai. */
    return "";
  }
}

function certPrintHTML(c) {
  return `
  <div style="border:6px double #4f46e5;padding:34px 40px;text-align:center;background:#fff;color:#0f172a;font-family:Georgia,'Times New Roman',serif">
    <p style="margin:0;font-size:.7rem;letter-spacing:.25em;color:#4f46e5">SOFT SKILL ZONE INSTITUTE</p>
    <p style="margin:2px 0 18px;font-size:.62rem;color:#666">${INSTITUTE.address} · Learn Today. Lead Tomorrow.</p>
    <h1 style="margin:0 0 6px;font-size:1.7rem;letter-spacing:.06em">Certificate of Completion</h1>
    <p style="margin:0 0 18px;font-size:.8rem;color:#555">Yeh pramaanit kiya jaata hai ki</p>
    <p style="margin:0;font-size:1.5rem;font-weight:700;border-bottom:1.5px solid #cbd5e1;display:inline-block;padding:0 24px 4px">${c.studentName}</p>
    <p style="margin:14px auto 4px;font-size:.9rem;max-width:56ch">(${c.studentId}) ne
      <strong>${c.courseName}</strong> safaltapoorvak poora kiya hai${c.grade ? ` — Grade <strong>${c.grade}</strong>` : ""}${c.percentage ? ` (${c.percentage}%)` : ""}.</p>
    <div style="display:flex;justify-content:space-between;margin-top:34px;font-size:.72rem;color:#555">
      <span>Issue date: <strong>${formatDate(c.issueDate)}</strong></span>
      <span>Certificate No: <strong>${c.certificateNo}</strong></span>
    </div>
    <div style="margin-top:26px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px">
      <span style="border-top:1.5px solid #0f172a;padding:4px 18px 0;font-size:.72rem">Director</span>
      <span style="text-align:center;font-size:.58rem;color:#666;line-height:1.5">
        ${qrTag(c.verifyCode)}
        <span style="display:block">Scan karke verify karein</span>
        <strong style="display:block;letter-spacing:.04em">${c.verifyCode}</strong>
      </span>
    </div>
  </div>`;
}

function certView(c) {
  const body = el("div", { html: certPrintHTML(c) });
  const printBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Print / PDF");
  const closeBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Band karein");
  const m = openModal({ title: c.certificateNo, size: "lg", body, footer: [closeBtn, printBtn] });
  closeBtn.addEventListener("click", () => m.close());
  printBtn.addEventListener("click", () => {
    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(`<html><head><title>${c.certificateNo}</title></head><body style="margin:24px">${certPrintHTML(c)}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  });
}

function row(c) {
  return el("div", { class: "card-ssz" },
    el("div", { class: "card-ssz__body", style: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", padding: "1rem 1.25rem" } },
      el("span", { class: "stat-tile__icon", style: { background: "var(--warning-soft)", color: "var(--warning)" }, html: icon("award", { size: 20 }) }),
      el("span", { style: { flex: 1, minWidth: "220px" } },
        el("strong", { style: { display: "block", fontSize: ".93rem" } }, `${c.studentName} — ${c.courseName}`),
        el("span", { style: { fontSize: ".78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" } },
          `${c.certificateNo} · ${c.verifyCode} · ${formatDate(c.issueDate)}`)),
      el("button", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", type: "button", dataset: { view: c.id } }, "Certificate"),
      el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", type: "button", dataset: { copy: c.verifyCode } }, "Link copy"),
      el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", style: { color: "var(--danger)" }, type: "button", dataset: { delCert: c.id } }, "Delete")
    ));
}

function paint() {
  const list = term
    ? certs.filter((c) => `${c.studentName} ${c.studentId} ${c.certificateNo} ${c.verifyCode}`.toLowerCase().includes(term))
    : certs;
  render($("#certAdminList"), list.length ? list.map(row)
    : el("div", { class: "empty-state" },
        el("div", { class: "empty-state__icon", html: icon("award", { size: 32 }) }),
        el("h2", {}, "Abhi koi certificate issue nahi hua"),
        el("p", {}, "\"+ Certificate Issue Karein\" se pehla certificate banayein.")));
}

function issueForm() {
  const form = el("form", { novalidate: true });
  form.innerHTML = `
    <div class="field">
      <label class="field__label">Student <span class="req">*</span></label>
      <select class="select-ssz" name="studentId"></select>
      <div class="field__error"></div>
    </div>
    <div class="adm-row">
      <div class="field">
        <label class="field__label">Grade</label>
        <select class="select-ssz" name="grade">
          <option value="A+">A+</option><option value="A" selected>A</option>
          <option value="B+">B+</option><option value="B">B</option><option value="C">C</option>
        </select>
      </div>
      <div class="field">
        <label class="field__label">Percentage</label>
        <input class="input-ssz" name="percentage" type="number" min="0" max="100" placeholder="optional">
      </div>
    </div>
    <div class="field">
      <label class="field__label">Course name (certificate par)</label>
      <input class="input-ssz" name="courseName" type="text" placeholder="Student chunte hi bhar jaayega">
    </div>`;

  const sSel = form.querySelector('[name="studentId"]');
  sSel.appendChild(el("option", { value: "" }, "Chunein"));
  students.forEach((s) => sSel.appendChild(el("option", { value: s.studentId }, `${s.fullName} — ${s.studentId}`)));
  sSel.addEventListener("change", () => {
    const s = students.find((x) => x.studentId === sSel.value);
    if (s) form.elements.courseName.value = s.courseName || "";
  });

  const validator = createValidator(form, { studentId: [rules.required("Student chunein.")] });

  const saveBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Issue Karein");
  const cancelBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Cancel");
  const m = openModal({ title: "Certificate Issue", body: form, footer: [cancelBtn, saveBtn] });
  cancelBtn.addEventListener("click", () => m.close());

  saveBtn.addEventListener("click", async () => {
    if (!validator.validate()) return;
    const s = students.find((x) => x.studentId === sSel.value);
    const grade = form.elements.grade.value;
    const percentage = form.elements.percentage.value ? Number(form.elements.percentage.value) : null;
    const courseName = form.elements.courseName.value.trim() || s.courseName || "";

    if (mode === "preview") {
      const demo = {
        id: `tmp-${Date.now()}`, certificateNo: "SSZ/CERT/2026/00XX",
        verifyCode: "SSZ-VER-PREVIEW", studentId: s.studentId, studentName: s.fullName,
        courseName, grade, percentage, issueDate: new Date(), certificateURL: ""
      };
      certs.unshift(demo);
      m.close(); paint();
      toast.info("Preview mode: Firebase ke baad asli number banega.");
      certView(demo);
      return;
    }

    try {
      saveBtn.disabled = true;
      const { nextSequence, createWithId } = await import("../../firebase/db-service.js");
      const year = new Date().getFullYear();
      const seq = await nextSequence(`certificates-${year}`);
      const certificateNo = ID_FORMATS.certificate(year, seq);
      const verifyCode = `SSZ-VER-${Math.random().toString(36).slice(2, 7).toUpperCase()}${String(seq).padStart(2, "0")}`;
      const doc = {
        certificateNo, verifyCode,
        studentId: s.studentId, studentName: s.fullName, courseName,
        grade, percentage,
        issueDate: new Date(), completionDate: new Date(),
        certificateURL: "", issuedBy: shell.user.uid || "admin"
      };
      const id = certificateNo.replace(/\//g, "-");
      await createWithId(COLLECTIONS.CERTIFICATES, id, doc);

      /* --------------------------------------------------------------
         Public verification SIRF is chhote document se hoti hai.

         Pehle ye sirf ek pointer tha (certificateId) aur asli record
         `certificates` se padha jaata tha, jo sabke liye khula tha. Us
         khulepan ka fayda uthakar koi bhi certificate number 0001, 0002…
         ghumakar har student ka naam, course aur grade nikal sakta tha —
         kyunki number ginti me chalta hai.

         Ab dikhane laayak sab kuchh yahin rakh dete hain. Verify code
         random hai, isliye ise ghumaya nahi ja sakta. `certificates`
         collection ab sirf admin aur khud us student ke liye khula hai.

         Thoda dohraav hai (wahi data do jagah), par yahan ye theek hai:
         certificate ek baar banta hai aur baad me badalta nahi.

         >>> Aage kabhi certificate ki PDF chadhane ka intezaam banaye, to
         >>> `certificateURL` DONO jagah likhni hogi — warna public verify
         >>> par PDF ka button aayega hi nahi. <<<
         -------------------------------------------------------------- */
      await createWithId("certificateCodes", verifyCode, {
        certificateId: id,
        certificateNo, verifyCode,
        studentId: s.studentId, studentName: s.fullName, courseName,
        grade, percentage,
        issueDate: doc.issueDate,
        certificateURL: ""
      });

      certs.unshift({ id, ...doc });
      m.close(); paint();
      toast.success(`Issue ho gaya: ${certificateNo}`);
      certView({ id, ...doc });
    } catch (err) {
      saveBtn.disabled = false;
      toast.error(err.message || "Issue fail ho gaya.");
    }
  });
}

/* ---------------- boot ---------------- */
const shell = await initAdminShell({ active: "certificates", title: "Certificates" });
mode = shell.mode;

if (mode === "preview") {
  certs = DEMO_CERTIFICATES.map((c) => ({ ...c }));
  students = DEMO_STUDENTS.map((s) => ({ ...s }));
} else {
  const { getMany } = await import("../../firebase/db-service.js");
  [certs, students] = await Promise.all([
    getMany(COLLECTIONS.CERTIFICATES, { orderBy: ["issueDate", "desc"], limit: 200, useCache: false }).catch(() => []),
    getMany(COLLECTIONS.STUDENTS, { limit: 500 }).catch(() => [])
  ]);
}

paint();

$("#certNew").addEventListener("click", issueForm);
$("#certSearch").addEventListener("input", debounce((e) => { term = e.target.value.trim().toLowerCase(); paint(); }, 200));

on($("#certAdminList"), "click", "[data-view]", (e, btn) => {
  const c = certs.find((x) => x.id === btn.dataset.view);
  if (c) certView(c);
});
/* Poora link copy hota hai, sirf code nahi — WhatsApp par yahi bhejna hota hai,
   aur saamne wale ko code kahin type nahi karna padta. */
/* Certificate hataane ka matlab hai ki uska verify link bhi mar jaayega —
   agar wo link kisi employer ko diya ja chuka hai to unhe "nahi mila"
   dikhega. Isliye dialog me yahi baat sabse pehle likhi hai. */
on($("#certAdminList"), "click", "[data-del-cert]", async (e, btn) => {
  const c = certs.find((x) => x.id === btn.dataset.delCert);
  if (!c) return;
  const ok = await confirmModal({
    title: "Certificate hataayein?",
    message: `${c.studentName} ka ${c.certificateNo} mit jaayega. Verify link (${c.verifyCode}) bhi kaam karna band kar dega — agar wo kisi ko diya ja chuka hai to unhe "certificate nahi mila" dikhega.`,
    danger: true, confirmText: "Haan, hata dein"
  });
  if (!ok) return;
  if (mode === "preview") { certs = certs.filter((x) => x.id !== c.id); paint(); return toast.info("Preview mode."); }
  try {
    const { remove } = await import("../../firebase/db-service.js");
    await remove(COLLECTIONS.CERTIFICATES, c.id);
    if (c.filePath) {
      const { deleteFile } = await import("../../firebase/storage-service.js");
      await deleteFile(c.filePath).catch((err) => console.warn("[certs] PDF nahi hati:", err));
    }
    certs = certs.filter((x) => x.id !== c.id);
    paint();
    toast.success("Certificate hat gaya.");
  } catch (err) { toast.error(err.message || "Fail ho gaya."); }
});

on($("#certAdminList"), "click", "[data-copy]", async (e, btn) => {
  const ok = await copyToClipboard(verifyLink(btn.dataset.copy));
  ok ? toast.success("Verify link copy ho gaya — WhatsApp par bhej dein.") : toast.error("Copy nahi ho paya.");
});
