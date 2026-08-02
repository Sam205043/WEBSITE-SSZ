/* ==========================================================================
   Soft Skill Zone — Footer behaviour
   Fills contact details from js/config/site-data.js, then upgrades them from
   Firestore settings/institute when that document exists (admin-editable).
   ========================================================================== */

import { $, $$ } from "../core/dom.js";
import { INSTITUTE } from "../config/site-data.js";
import { telLink, whatsappLink, mapsLink, formatPhone } from "../core/utils.js";

function paint(data) {
  const set = (key, value) => {
    $$(`[data-ssz="${key}"]`).forEach((n) => { n.textContent = value; });
  };

  set("phone", formatPhone(data.phone));
  set("email", data.email);
  set("address", data.address);
  set("year", String(new Date().getFullYear()));

  $$("[data-ssz-tel]").forEach((a) => a.setAttribute("href", telLink(data.phone)));
  $$("[data-ssz-mail]").forEach((a) => a.setAttribute("href", `mailto:${data.email}`));
  $$("[data-ssz-map]").forEach((a) => a.setAttribute("href", mapsLink(data.mapQuery || data.address)));

  $$("[data-ssz-whatsapp]").forEach((a) => a.setAttribute(
    "href",
    whatsappLink(data.whatsapp || data.phone,
      `Namaste! Main ${INSTITUTE.name} ke courses ke baare me jaanna chahta/chahti hoon.`)
  ));

  Object.entries(data.social || {}).forEach(([network, link]) => {
    $$(`[data-ssz-social="${network}"]`).forEach((a) => {
      if (link) a.setAttribute("href", link);
      else a.remove();
    });
  });

  /* Saare icon hat jaayein to unki patti bhi hata do — warna footer me ek
     khaali jagah bachi reh jaati hai jo dekhne me galti lagti hai. */
  $$(".social-row").forEach((row) => {
    if (!row.querySelector("a")) row.remove();
  });
}

/**
 * @param {object|null} liveSettings  Firestore settings/institute document
 */
export function initFooter(liveSettings = null) {
  paint({ ...INSTITUTE, ...(liveSettings || {}) });
}

export { paint as paintContactInfo };
