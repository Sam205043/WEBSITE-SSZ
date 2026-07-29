/* ==========================================================================
   Soft Skill Zone — Gallery page
   Photos come from Firestore `gallery` (uploaded via the admin dashboard).
   Includes a keyboard-accessible lightbox.
   ========================================================================== */

import { $, el, on, onReady, render, lockScroll } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { url } from "../core/routes.js";
import { GALLERY_CATEGORIES } from "../config/site-data.js";
import { skeletonCards } from "../core/loader.js";

let photos = [];
let category = "all";
let index = 0;

const visible = () => category === "all" ? photos : photos.filter((p) => p.category === category);

function paintFilters() {
  render($("#galleryFilters"), GALLERY_CATEGORIES.map((c) =>
    el("button", { type: "button", class: `chip${c.value === category ? " is-active" : ""}`, dataset: { cat: c.value } }, c.label)
  ));
}

function emptyState() {
  render($("#galleryGrid"),
    el("div", { class: "empty-state", style: { gridColumn: "1/-1" } },
      el("div", { class: "empty-state__icon", html: icon("image", { size: 32 }) }),
      el("h2", {}, "Photos abhi add nahi hui"),
      el("p", {}, "Institute ki photos admin dashboard se upload hone par yahan apne aap dikhne lagengi."),
      el("a", { class: "btn-ssz btn-secondary-ssz", style: { marginTop: "1.25rem" }, href: url("contact") }, "Campus visit karein")
    )
  );
}

function paintGrid() {
  const list = visible();
  if (!list.length) return emptyState();

  render($("#galleryGrid"), list.map((p, i) => {
    const item = el("button", { class: "gallery-item", type: "button", dataset: { index: String(i) }, "aria-label": p.title || "Photo" });
    item.appendChild(el("img", { src: p.thumbURL || p.imageURL, alt: p.title || "Gallery photo", loading: "lazy", decoding: "async" }));
    if (p.title) item.appendChild(el("span", { class: "gallery-item__cap" }, p.title));
    return item;
  }));
}

/* ---------------- Lightbox ---------------- */
function open(i) {
  const list = visible();
  if (!list.length) return;
  index = (i + list.length) % list.length;
  const p = list[index];
  $("#lightboxImg").src = p.imageURL;
  $("#lightboxImg").alt = p.title || "Gallery photo";
  $("#lightboxCap").textContent = `${p.title || ""}${list.length > 1 ? `  (${index + 1}/${list.length})` : ""}`;
  $("#lightbox").classList.add("is-open");
  lockScroll(true);
}

function close() {
  $("#lightbox").classList.remove("is-open");
  $("#lightboxImg").src = "";
  lockScroll(false);
}

onReady(async () => {
  paintFilters();
  skeletonCards("#galleryGrid", 8, 190);

  on($("#galleryFilters"), "click", ".chip", (e, chip) => {
    category = chip.dataset.cat;
    paintFilters();
    paintGrid();
  });

  on($("#galleryGrid"), "click", ".gallery-item", (e, item) => open(Number(item.dataset.index)));
  on(document, "click", "[data-lightbox-close]", close);
  on(document, "click", "[data-lightbox-prev]", () => open(index - 1));
  on(document, "click", "[data-lightbox-next]", () => open(index + 1));

  $("#lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox") close(); });

  document.addEventListener("keydown", (e) => {
    if (!$("#lightbox").classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") open(index - 1);
    if (e.key === "ArrowRight") open(index + 1);
  });

  try {
    const { getMany } = await import("../../firebase/db-service.js");
    const { COLLECTIONS } = await import("../core/constants.js");
    photos = await getMany(COLLECTIONS.GALLERY, { orderBy: ["order", "asc"], limit: 120, ttl: 10 * 60 * 1000 });
  } catch {
    photos = [];
  }
  paintGrid();
});
