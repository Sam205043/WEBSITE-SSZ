/* ==========================================================================
   Soft Skill Zone — Contact page
   Contact cards from site-data (upgraded by Firestore settings), and an
   enquiry form that writes straight to Firestore `enquiries`.
   ========================================================================== */

import { $, el, onReady, render, formData } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { createValidator, rules } from "../core/validators.js";
import { withButton } from "../core/loader.js";
import toast from "../core/toast.js";
import { formatPhone, telLink, whatsappLink, mapsLink } from "../core/utils.js";
import { INSTITUTE } from "../config/site-data.js";

function contactCards(data) {
  const items = [
    {
      icon: "mapPin", title: "Address",
      body: el("a", { href: mapsLink(data.mapQuery || data.address), target: "_blank", rel: "noopener" }, data.address)
    },
    {
      icon: "phone", title: "Phone",
      body: el("a", { href: telLink(data.phone) }, formatPhone(data.phone))
    },
    {
      icon: "whatsapp", title: "WhatsApp",
      body: el("a", {
        href: whatsappLink(data.whatsapp || data.phone, "Namaste! Mujhe courses ki jaankari chahiye."),
        target: "_blank", rel: "noopener"
      }, formatPhone(data.whatsapp || data.phone))
    },
    {
      icon: "mail", title: "Email",
      body: el("a", { href: `mailto:${data.email}` }, data.email)
    },
    {
      icon: "clock", title: "Institute Timings",
      body: el("div", {}, ...INSTITUTE.timings.map((t) =>
        el("p", { style: { margin: 0 } }, `${t.day}: ${t.time}`)))
    }
  ];

  render($("#contactInfo"), items.map((it) =>
    el("div", { class: "contact-item" },
      el("div", { class: "contact-item__icon", html: icon(it.icon, { size: 20 }) }),
      el("div", {}, el("h2", {}, it.title), it.body)
    )
  ));
}

onReady(async () => {
  contactCards(INSTITUTE);

  const map = $("#contactMap");
  if (map) {
    map.src = `https://maps.google.com/maps?q=${encodeURIComponent(INSTITUTE.mapQuery || INSTITUTE.address)}&output=embed`;
  }

  const form = $("#contactForm");
  const validator = createValidator(form, {
    name:    [rules.required(), rules.minLen(3)],
    mobile:  [rules.required(), rules.mobile()],
    email:   [rules.email()],
    subject: [rules.required("Topic chunein.")],
    message: [rules.required(), rules.minLen(10, "Thoda detail me likhein (kam se kam 10 characters).")]
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validator.validate()) return;

    await withButton($("#contactSubmit"), async () => {
      const data = formData(form);
      try {
        const { create } = await import("../../firebase/db-service.js");
        const { COLLECTIONS } = await import("../core/constants.js");

        await create(COLLECTIONS.ENQUIRIES, {
          name: data.name,
          mobile: data.mobile,
          email: data.email || "",
          subject: data.subject,
          message: data.message,
          isRead: false,
          source: "contact-page"
        });

        render(form.parentElement,
          el("div", { class: "empty-state", style: { padding: "2.5rem 1rem" } },
            el("div", {
              class: "empty-state__icon",
              style: { background: "var(--success-soft)", color: "var(--success)" },
              html: icon("checkCircle", { size: 32 })
            }),
            el("h2", {}, "Enquiry mil gayi!"),
            el("p", {}, "Hum jald hi aapko call ya WhatsApp karenge. Jaldi hai? Neeche se seedha WhatsApp karein."),
            el("a", {
              class: "btn-ssz btn-primary-ssz",
              style: { marginTop: "1.25rem" },
              href: whatsappLink(INSTITUTE.whatsapp || INSTITUTE.phone,
                `Namaste! Maine website se enquiry bheji hai. Naam: ${data.name}`),
              target: "_blank", rel: "noopener"
            }, "WhatsApp par baat karein")
          )
        );
      } catch (err) {
        toast.error(
          "Enquiry save nahi ho payi — internet ya Firebase setup check karein. " +
          "Aap seedha call ya WhatsApp bhi kar sakte hain."
        );
        console.error(err);
      }
    });
  });

  // Live contact details from Firestore settings/institute
  try {
    const { getOne } = await import("../../firebase/db-service.js");
    const { COLLECTIONS } = await import("../core/constants.js");
    const s = await getOne(COLLECTIONS.SETTINGS, "institute", { ttl: 15 * 60 * 1000 });
    if (s) {
      contactCards({ ...INSTITUTE, ...s });
      if (map) map.src = `https://maps.google.com/maps?q=${encodeURIComponent(s.mapQuery || s.address || INSTITUTE.address)}&output=embed`;
    }
  } catch { /* offline */ }
});
