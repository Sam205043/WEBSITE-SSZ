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

/* Photo ka kram: pehle institute ki, phir login wali.

   Google se login karne par Firebase users doc me photoURL bhar deta hai —
   par jis account par asli photo nahi hai, wahan wo khud ka banaya hua
   akshar wala gola (default-user) hota hai. Wo bhi ek asli image hai,
   isliye "hai ya nahi" wali jaanch use sahi maan leti thi aur admission
   wali asli photo kabhi dikhti hi nahi thi.

   Student portal me institute ka record hi asli maana jayega — wahi photo
   ID card par chhapti hai. Google wali sirf tab, jab institute ke paas
   koi photo na ho. */
const avatarSrc = student?.photoURL || user.photoURL || "";

render($("#profileInfo"),
  el("div", { style: { display: "flex", gap: "1.25rem", alignItems: "center", marginBottom: "1.5rem" } },
    avatarSrc
      ? el("img", { class: "avatar avatar-lg", src: avatarSrc, alt: user.name, decoding: "async" })
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

/* ==========================================================================
   Link a Student ID — only when this account has no student record yet.

   A student can sign up before the admin approves their admission, so the
   login exists while students/{id} does not. Without this box they would be
   stuck on the "record abhi link nahi hua" screen forever, and the admin would
   have to patch Firestore by hand.
   ========================================================================== */
if (mode !== "preview" && !student) {
  const section = $("#linkIdSection");
  section.hidden = false;

  const idForm = $("#linkIdForm");
  const idv = createValidator(idForm, {
    studentId: [
      rules.required("Student ID daalein."),
      rules.minLen(6, "Student ID poora daalein — jaise SSZ2026PYT0001.")
    ]
  });

  idForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!idv.validate()) return;

    await withButton($("#linkIdSave"), async () => {
      try {
        const { claimStudentId } = await import("../../firebase/auth-service.js");
        await claimStudentId(idForm.elements.studentId.value);
        toast.success("ID jud gaya! Dashboard khol raha hoon…");
        setTimeout(() => location.reload(), 900);
      } catch (err) {
        toast.error(err.message || "ID nahi jud paya.");
      }
    });
  });
}

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
