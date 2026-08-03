/* ==========================================================================
   Soft Skill Zone — Student Signup
   Creates the Firebase Auth account + users/{uid} profile (role: student).
   ========================================================================== */

import { $, onReady } from "../core/dom.js";
import { param } from "../core/routes.js";
import { initI18n } from "../core/i18n.js";
import { createValidator, rules } from "../core/validators.js";
import { withButton } from "../core/loader.js";
import { alertBox, clearAlert, initGoogleButton, initPasswordToggles, initPwMeter, requireConfigured, skipIfAuthed } from "./auth-ui.js";

onReady(async () => {
  /* Student ne portal me jo bhasha chuni thi wahi yahan bhi chale —
     warna logout karte hi page Hinglish par lautt jata. */
  await initI18n();
  initPasswordToggles();
  initPwMeter("password");

  /* Student ID ab poochi hi nahi jaati. Admission form me jo email diya tha
     wahi email yahan daalte hi system khud uska record dhoondh kar jod deta
     hai — na ID yaad rakhni, na type karni, na galat padne ka darr. */
  const form = $("#signupForm");

  /* Admission ke turant baad student yahan `?email=...` ke saath aata hai.
     Wahi email bhar dete hain — wahi to record se jodne wala dhaaga hai, aur
     ek akshar bhi galat hua to jud nahi payega. Cursor seedha naam wale khaane
     par rakh dete hain, taaki bhara hua khaana dobara na bharna pade. */
  const preEmail = String(param("email", "") || "").trim();
  if (preEmail && form.elements.email) {
    form.elements.email.value = preEmail;
    setTimeout(() => form.elements.name?.focus(), 60);
  }

  const validator = createValidator(form, {
    name:     [rules.required(), rules.minLen(3)],
    email:    [rules.required("Email daalein."), rules.email()],
    phone:    [rules.required(), rules.mobile()],
    password: [rules.required("Password banayein."), rules.password()],
    confirm:  [rules.required("Password dobara daalein."),
               rules.matches(() => form.elements.password.value, "Dono passwords same nahi hain.")]
  });

  const configured = await requireConfigured();
  if (configured) skipIfAuthed();
  initGoogleButton(configured);

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
          password: form.elements.password.value
        });

        /* Record na mila — matlab admission abhi approve nahi hua, ya email
           form wale email se alag hai. Account phir bhi ban gaya; approve
           hote hi agle login par ID khud jud jaayegi. */
        if (!user.studentId) {
          alertBox("info",
            `Account ban gaya, ${user.name}! Aapka admission record abhi juda nahi hai — ` +
            `approve hote hi apne aap jud jaayega. Dhyan rakhein ki wahi email ho jo ` +
            `admission form me diya tha. Dashboard khul raha hai…`);
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
