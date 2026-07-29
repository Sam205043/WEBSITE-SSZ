/* ==========================================================================
   Soft Skill Zone — Student Signup
   Creates the Firebase Auth account + users/{uid} profile (role: student).
   ========================================================================== */

import { $, onReady } from "../core/dom.js";
import { createValidator, rules } from "../core/validators.js";
import { withButton } from "../core/loader.js";
import { alertBox, clearAlert, initPasswordToggles, initPwMeter, initUppercase, requireConfigured, skipIfAuthed } from "./auth-ui.js";

onReady(async () => {
  initPasswordToggles();
  initPwMeter("password");
  initUppercase("studentId");

  const form = $("#signupForm");
  const validator = createValidator(form, {
    name:     [rules.required(), rules.minLen(3)],
    email:    [rules.required("Email daalein."), rules.email()],
    phone:    [rules.required(), rules.mobile()],
    studentId:[rules.pattern(/^$|^SSZ[A-Z0-9/-]{6,}$/i, "Student ID ka format sahi nahi lag raha (SSZ se shuru hota hai).")],
    password: [rules.required("Password banayein."), rules.password()],
    confirm:  [rules.required("Password dobara daalein."),
               rules.matches(() => form.elements.password.value, "Dono passwords same nahi hain.")]
  });

  const configured = await requireConfigured();
  if (configured) skipIfAuthed();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert();
    if (!validator.validate() || !configured) return;

    if (!$("#agree").checked) {
      alertBox("error", "Aage badhne ke liye Terms aur Privacy Policy se sehmat hona zaroori hai.");
      return;
    }

    await withButton($("#submitBtn"), async () => {
      try {
        const { registerStudent, authError } = await import("../../firebase/auth-service.js");
        const { goHomeFor } = await import("../core/guard.js");

        const user = await registerStudent({
          name:  form.elements.name.value.trim(),
          email: form.elements.email.value.trim(),
          phone: form.elements.phone.value.trim(),
          studentId: form.elements.studentId.value.trim().toUpperCase(),
          password: form.elements.password.value
        });

        if (user.idClaimRejected) {
          alertBox("info",
            `Account ban gaya, ${user.name}! Lekin jo Student ID aapne daali hai wo is email se ` +
            `match nahi kar rahi, isliye abhi jodi nahi gayi — admin check karke jod dega. ` +
            `Tab tak dashboard khul raha hai…`);
          setTimeout(() => goHomeFor(user), 3400);
          return;
        }

        alertBox("success", `Account ban gaya, ${user.name}! Dashboard khul raha hai…`);
        setTimeout(() => goHomeFor(user), 700);
      } catch (err) {
        const { authError } = await import("../../firebase/auth-service.js");
        alertBox("error", authError(err));
      }
    });
  });
});
