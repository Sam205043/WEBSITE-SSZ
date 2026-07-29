/* ==========================================================================
   Soft Skill Zone — Admin Login
   Same credentials flow as student login, plus a hard role check:
   a non-admin account is signed straight back out.
   ========================================================================== */

import { $, onReady } from "../core/dom.js";
import { createValidator, rules } from "../core/validators.js";
import { withButton } from "../core/loader.js";
import { url } from "../core/routes.js";
import { ROLES } from "../core/constants.js";
import { alertBox, clearAlert, initPasswordToggles, requireConfigured } from "./auth-ui.js";

onReady(async () => {
  initPasswordToggles();

  const form = $("#adminForm");
  const validator = createValidator(form, {
    email:    [rules.required("Email daalein."), rules.email()],
    password: [rules.required("Password daalein.")]
  });

  const configured = await requireConfigured();

  // Already an authed admin? Straight to the dashboard.
  if (configured) {
    try {
      const { ready } = await import("../../firebase/auth-service.js");
      const user = await ready();
      if (user?.role === ROLES.ADMIN) location.replace(url("adminHome"));
    } catch { /* stay */ }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert();
    if (!validator.validate() || !configured) return;

    await withButton($("#submitBtn"), async () => {
      const { login, logout, authError } = await import("../../firebase/auth-service.js");
      try {
        const user = await login(
          form.elements.email.value,
          form.elements.password.value,
          $("#remember").checked
        );

        if (user.role !== ROLES.ADMIN) {
          await logout();
          alertBox("error",
            "Yeh account admin nahi hai. Student ho to student login use karein — " +
            "admin access ke liye institute director se sampark karein.");
          return;
        }

        alertBox("success", `Welcome, ${user.name}! Admin panel khul raha hai…`);
        setTimeout(() => location.replace(url("adminHome")), 600);
      } catch (err) {
        alertBox("error", authError(err));
      }
    });
  });
});
