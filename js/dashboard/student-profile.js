/* ==========================================================================
   Soft Skill Zone — Student: Profile
   ========================================================================== */

import { $, el, render } from "../core/dom.js";
import { formatDate, formatPhone, initials, money } from "../core/utils.js";
import { createValidator, rules } from "../core/validators.js";
import { withButton } from "../core/loader.js";
import { initShell } from "./shell.js";
import * as data from "./student-data.js";
import { DEMO_STUDENT } from "./demo-data.js";
import toast from "../core/toast.js";

const shell = await initShell({ active: "profile", title: "Profile" });
const { user, mode } = shell;

let student = mode === "preview" ? DEMO_STUDENT : await data.getStudent(user);

function infoRow(k, v) {
  return el("div", { class: "verify-row" }, el("dt", {}, k), el("dd", {}, v || "—"));
}

render($("#profileInfo"),
  el("div", { style: { display: "flex", gap: "1.25rem", alignItems: "center", marginBottom: "1.5rem" } },
    user.photoURL || student?.photoURL
      ? el("img", { class: "avatar avatar-lg", src: user.photoURL || student.photoURL, alt: user.name, decoding: "async" })
      : el("span", { class: "avatar avatar-lg avatar-fallback", style: { fontSize: "1.4rem" } }, initials(user.name)),
    el("span", {},
      el("strong", { style: { display: "block", fontSize: "1.1rem" } }, student?.fullName || user.name),
      el("span", { class: "badge-ssz badge-brand", style: { marginTop: ".3rem" } }, student?.studentId || "ID pending")
    )
  ),
  el("dl", { style: { margin: 0 } },
    infoRow("Course", student?.courseName),
    infoRow("Batch", student?.batchName || student?.batchId),
    infoRow("Roll No.", student?.rollNo),
    infoRow("Father's name", student?.fatherName),
    infoRow("Mother's name", student?.motherName),
    infoRow("Date of birth", student?.dob),
    infoRow("Mobile", formatPhone(student?.mobile || user.phone)),
    infoRow("Email", student?.email || user.email),
    infoRow("Address", student?.address),
    infoRow("Admission date", student?.admissionDate ? formatDate(student.admissionDate) : "—"),
    infoRow("Fee status", student ? `${money(student.paidFee || 0)} / ${money(student.totalFee || 0)} jama` : "—")
  ),
  el("p", { class: "field__hint", style: { marginTop: "1rem" } },
    "Naam, course ya batch me sudhaar ke liye institute office se sampark karein — yeh records admin hi badal sakta hai.")
);

/* contact form */
const form = $("#profileForm");
form.elements.name.value = user.name || "";
form.elements.phone.value = user.phone || student?.mobile || "";

const pv = createValidator(form, {
  name:  [rules.required(), rules.minLen(3)],
  phone: [rules.required(), rules.mobile()]
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!pv.validate()) return;
  if (mode === "preview") return toast.info("Preview mode: Firebase ke baad save hoga.");

  await withButton($("#profileSave"), async () => {
    try {
      const { updateUserProfile } = await import("../../firebase/auth-service.js");
      await updateUserProfile({
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim()
      });
      toast.success("Profile update ho gayi!");
    } catch (err) {
      toast.error(err.message || "Save nahi ho paya.");
    }
  });
});

/* password form */
const pwForm = $("#pwForm");
const pwv = createValidator(pwForm, {
  current: [rules.required("Abhi ka password daalein.")],
  next:    [rules.required("Naya password banayein."), rules.password()]
});

pwForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!pwv.validate()) return;
  if (mode === "preview") return toast.info("Preview mode: Firebase ke baad chalega.");

  await withButton($("#pwSave"), async () => {
    try {
      const { changePassword, authError } = await import("../../firebase/auth-service.js");
      await changePassword(pwForm.elements.current.value, pwForm.elements.next.value);
      pwForm.reset();
      toast.success("Password badal gaya!");
    } catch (err) {
      const { authError } = await import("../../firebase/auth-service.js");
      toast.error(authError(err));
    }
  });
});
