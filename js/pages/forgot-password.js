/* ==========================================================================
   Soft Skill Zone — Forgot Password
   ========================================================================== */

import { $, onReady, render, el } from "../core/dom.js";
import { initI18n } from "../core/i18n.js";
import { icon } from "../core/icons.js";
import { createValidator, rules } from "../core/validators.js";
import { withButton } from "../core/loader.js";
import { url } from "../core/routes.js";
import { alertBox, clearAlert, requireConfigured } from "./auth-ui.js";

onReady(async () => {
  /* Student ne portal me jo bhasha chuni thi wahi yahan bhi chale —
     warna logout karte hi page Hinglish par lautt jata. */
  await initI18n();
  const form = $("#forgotForm");
  const validator = createValidator(form, {
    email: [rules.required("Email daalein."), rules.email()]
  });

  const configured = await requireConfigured();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert();
    if (!validator.validate() || !configured) return;

    const email = form.elements.email.value.trim();

    await withButton($("#submitBtn"), async () => {
      try {
        const { resetPassword, authError } = await import("../../firebase/auth-service.js");
        await resetPassword(email);

        render(form,
          el("div", { class: "empty-state", style: { padding: "1.5rem 0" } },
            el("div", {
              class: "empty-state__icon",
              style: { background: "var(--success-soft)", color: "var(--success)" },
              html: icon("mail", { size: 30 })
            }),
            el("h2", {}, "Email bhej diya!"),
            el("p", {}, `${email} par reset link gaya hai. Inbox (aur spam folder) check karein — link 1 ghante tak valid hai.`),
            el("a", { class: "btn-ssz btn-primary-ssz", style: { marginTop: "1.25rem" }, href: url("studentLogin") }, "Login par wapas jaayein")
          )
        );
      } catch (err) {
        const { authError } = await import("../../firebase/auth-service.js");
        alertBox("error", authError(err));
      }
    });
  });
});
