/* ==========================================================================
   Soft Skill Zone — Public certificate verification
   Looks up Firestore `certificates` by verifyCode or certificateNo.
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
   Lookup is deliberately by document id — never a query.

   A query would need `list` permission on the certificates collection, and
   anything a visitor can list, a visitor can also page through: every
   student's name, course and grade. Fetching by id means you can only ever
   see a certificate whose number or verify code you already hold.

   Two shapes are accepted:
     SSZ/CERT/2026/0001  ->  certificates/SSZ-CERT-2026-0001
     SSZ-VER-AB12C01     ->  certificateCodes/SSZ-VER-AB12C01 -> certificates/…
   -------------------------------------------------------------------------- */
async function verify(code) {
  const asDocId = code.trim().toUpperCase().replace(/\s+/g, "").replace(/\//g, "-");

  try {
    const { getOne } = await import("../../firebase/db-service.js");
    const { COLLECTIONS } = await import("../core/constants.js");

    // 1. Certificate number — slashes and dashes both land on the same id
    let hit = await getOne(COLLECTIONS.CERTIFICATES, asDocId, { useCache: false });

    // 2. Short verify code -> pointer doc -> certificate
    if (!hit) {
      const pointer = await getOne("certificateCodes", asDocId, { useCache: false });
      if (pointer && pointer.certificateId) {
        hit = await getOne(COLLECTIONS.CERTIFICATES, pointer.certificateId, { useCache: false });
      }
    }

    if (hit) showValid(hit);
    else showInvalid("Is code se koi certificate nahi mila. Code dobara check karein — ho sakta hai koi digit galat ho. Phir bhi na mile to institute se sampark karein.");
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
