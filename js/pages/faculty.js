/* ==========================================================================
   Soft Skill Zone — Faculty page
   Firestore `faculty` documents replace the editable defaults in site-data.js
   ========================================================================== */

import { $, el, onReady, render } from "../core/dom.js";
import { initials } from "../core/utils.js";
import { FACULTY_SEED } from "../config/site-data.js";
import { skeletonCards } from "../core/loader.js";

function card(f, i) {
  const photo = f.photoURL
    ? el("img", { class: "faculty-card__photo", src: f.photoURL, alt: f.name, loading: "lazy", decoding: "async" })
    : el("div", { class: "faculty-card__photo" }, initials(f.name));

  return el("div", { "data-reveal": "up", "data-reveal-delay": String(i * 80) },
    el("div", { class: "faculty-card" },
      photo,
      el("h3", {}, f.name),
      el("p", { class: "faculty-card__role" }, f.designation),
      el("p", { class: "faculty-card__bio" }, f.bio),
      el("div", { class: "faculty-card__subjects" },
        ...(f.subjects || []).map((s) => el("span", { class: "badge-ssz badge-brand" }, s)),
        f.experience ? el("span", { class: "badge-ssz" }, f.experience) : null
      )
    )
  );
}

function paint(list) {
  render($("#facultyGrid"), list.map(card));
  document.dispatchEvent(new CustomEvent("ssz:content-rendered", { detail: { scope: $("#facultyGrid") } }));
}

onReady(async () => {
  skeletonCards("#facultyGrid", 4, 300);
  paint(FACULTY_SEED);

  try {
    const { getMany } = await import("../../firebase/db-service.js");
    const { COLLECTIONS } = await import("../core/constants.js");
    const rows = await getMany(COLLECTIONS.FACULTY, { orderBy: ["order", "asc"], ttl: 15 * 60 * 1000 });
    if (rows.length) paint(rows);
  } catch {
    /* Firebase not configured — defaults stay */
  }
});
