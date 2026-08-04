/* ==========================================================================
   Soft Skill Zone — Public certificate verification
   Verify code se lookup — vistaar `verify()` ke upar likha hai.
   ========================================================================== */

import { $, el, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatDate } from "../core/utils.js";
import { createValidator, rules } from "../core/validators.js";
import { withButton } from "../core/loader.js";
import { param } from "../core/routes.js";

function row(label, value) {
  return el("div", { class: "verify-row" },
    el("dt", {}, label),
    el("dd", {}, value || "—")
  );
}

function showValid(c) {
  render($("#verifyResult"),
    el("div", { class: "verify-result is-valid" },
      el("div", { class: "cluster", style: { marginBottom: "1rem" } },
        el("span", { style: { color: "var(--success)" }, html: icon("checkCircle", { size: 26 }) }),
        el("h2", { style: { margin: 0, fontSize: "1.1rem" } }, "Certificate valid hai")
      ),
      el("dl", { style: { margin: 0 } },
        row("Student name", c.studentName),
        row("Student ID", c.studentId),
        row("Course", c.courseName),
        row("Certificate No.", c.certificateNo),
        row("Issue date", formatDate(c.issueDate)),
        row("Grade", c.grade || (c.percentage ? `${c.percentage}%` : "—"))
      ),
      c.certificateURL
        ? el("a", {
            class: "btn-ssz btn-secondary-ssz", style: { marginTop: "1.25rem" },
            href: c.certificateURL, target: "_blank", rel: "noopener"
          }, "Certificate PDF dekhein")
        : null
    )
  );
}

function showInvalid(message) {
  render($("#verifyResult"),
    el("div", { class: "verify-result is-invalid" },
      el("div", { class: "cluster", style: { marginBottom: ".5rem" } },
        el("span", { style: { color: "var(--danger)" }, html: icon("xCircle", { size: 26 }) }),
        el("h2", { style: { margin: 0, fontSize: "1.1rem" } }, "Verify nahi hua")
      ),
      el("p", { style: { margin: 0 } }, message)
    )
  );
}

/* --------------------------------------------------------------------------
   Verification SIRF verify code se hoti hai — certificate number se nahi.

   PEHLE DONO CHALTE THE, AUR WAHI GALTI THI. Certificate number ginti me
   chalta hai (SSZ/CERT/2026/0001, 0002, 0003 …). Jab tak number se
   verification hoti thi, tab tak `certificates` collection sabke liye khula
   rakhna padta tha — aur khula hone ka matlab tha ki koi bhi 1 se 500 tak
   ghumakar har student ka naam, course aur grade nikal le.

   Verify code (SSZ-VER-AB12C01) random hai. Use ghumaya nahi ja sakta.
   Isliye ab dikhane laayak sab kuchh `certificateCodes/{verifyCode}` me hi
   rakha jaata hai, aur `certificates` sirf admin aur khud us student ke
   liye khula hai.

   Certificate par ye code chhapa hota hai, QR ke saath — to employer ke
   paas wo hamesha hota hai. Koi number type kar de to hum use saaf-saaf
   bata dete hain ki code kahan milega.
   -------------------------------------------------------------------------- */
const looksLikeCertNo = (s) => /^SSZ-CERT-/.test(s);

async function verify(code) {
  const asDocId = code.trim().toUpperCase().replace(/\s+/g, "").replace(/\//g, "-");

  try {
    const { getOne } = await import("../../firebase/db-service.js");
    const hit = await getOne("certificateCodes", asDocId, { useCache: false });

    if (hit) return showValid(hit);

    showInvalid(looksLikeCertNo(asDocId)
      ? "Ye certificate ka number lagta hai. Verify karne ke liye neeche wala " +
        "verification code chahiye — certificate ke neeche daayin taraf, QR ke " +
        "saath likha hota hai (jaise SSZ-VER-AB12C01)."
      : "Is code se koi certificate nahi mila. Code dobara check karein — ho sakta " +
        "hai koi akshar galat ho. Phir bhi na mile to institute se sampark karein.");
  } catch (err) {
    console.error(err);
    showInvalid("Abhi verification service se connect nahi ho pa raha. Internet check karein ya thodi der baad try karein.");
  }
}

onReady(() => {
  const form = $("#verifyForm");
  const input = $("#vCode");

  const validator = createValidator(form, {
    code: [rules.required("Verification code daalein."), rules.minLen(5, "Code chhota lag raha hai — dobara dekhein.")]
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validator.validate()) return;
    await withButton($("#verifyBtn"), () => verify(input.value));
  });

  const preset = param("code");
  if (preset) {
    input.value = preset;
    withButton($("#verifyBtn"), () => verify(preset));
  }
});
