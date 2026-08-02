/* ==========================================================================
   Soft Skill Zone — Student Login
   ========================================================================== */

import { $, onReady } from "../core/dom.js";
import { initI18n } from "../core/i18n.js";
import { createValidator, rules } from "../core/validators.js";
import { withButton } from "../core/loader.js";
import { alertBox, clearAlert, initGoogleButton, initPasswordToggles, requireConfigured, skipIfAuthed } from "./auth-ui.js";

onReady(async () => {
  /* Student ne portal me jo bhasha chuni thi wahi yahan bhi chale —
     warna logout karte hi page Hinglish par lautt jata. */
  await initI18n();
  initPasswordToggles();

  const form = $("#loginForm");
  const validator = createValidator(form, {
    email:    [rules.required("Email daalein."), rules.email()],
    password: [rules.required("Password daalein.")]
  });

  const configured = await requireConfigured();
  if (configured) skipIfAuthed();
  initGoogleButton(configured);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert();
    if (!validator.validate() || !configured) return;

    await withButton($("#submitBtn"), async () => {
      try {
        const { login, authError } = await import("../../firebase/auth-service.js");
        const { goHomeFor } = await import("../core/guard.js");

        const user = await login(
          form.elements.email.value,
          form.elements.password.value,
          $("#remember").checked
        );

        alertBox("success", `Welcome, ${user.name}! Dashboard khul raha hai…`);
        setTimeout(() => goHomeFor(user), 600);
      } catch (err) {
        const { authError } = await import("../../firebase/auth-service.js");
        alertBox("error", authError(err));
      }
    });
  });
});
