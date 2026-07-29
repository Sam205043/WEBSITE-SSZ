/* ==========================================================================
   Soft Skill Zone — FAQ page
   Accordion + live text search + category filter.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { debounce, highlight, unique, whatsappLink } from "../core/utils.js";
import { FAQ_SEED, INSTITUTE } from "../config/site-data.js";

let all = FAQ_SEED.slice();
let activeCategory = "all";
let term = "";

function matches(item) {
  const inCategory = activeCategory === "all" || item.category === activeCategory;
  if (!inCategory) return false;
  if (!term) return true;
  const hay = `${item.question} ${item.answer} ${item.category}`.toLowerCase();
  return hay.includes(term);
}

function paint() {
  const list = all.filter(matches);
  const box = $("#faqList");

  if (!list.length) {
    render(box, el("div", { class: "empty-state" },
      el("div", { class: "empty-state__icon", html: icon("search", { size: 32 }) }),
      el("h2", {}, "Koi jawab nahi mila"),
      el("p", {}, "Doosre shabdon se try karein, ya humse seedha poochh lein.")
    ));
    return;
  }

  render(box, list.map((item, i) => {
    const node = el("div", { class: `faq-item${i === 0 && term ? " is-open" : ""}` });
    node.innerHTML = `
      <button class="faq-item__q" type="button" aria-expanded="${i === 0 && term ? "true" : "false"}">
        <span></span>
        <span class="faq-item__icon">${icon("plus", { size: 20 })}</span>
      </button>
      <div class="faq-item__a"><p></p></div>`;
    node.querySelector(".faq-item__q span").innerHTML = highlight(item.question, term);
    node.querySelector(".faq-item__a p").innerHTML = highlight(item.answer, term);
    return node;
  }));
}

function paintFilters() {
  const cats = ["all", ...unique(all.map((f) => f.category))];
  render($("#faqFilters"), cats.map((c) =>
    el("button", {
      type: "button",
      class: `chip${c === activeCategory ? " is-active" : ""}`,
      dataset: { cat: c }
    }, c === "all" ? "Sab" : c)
  ));
}

onReady(async () => {
  paintFilters();
  paint();

  const wa = $("#faqWhatsapp");
  if (wa) wa.href = whatsappLink(INSTITUTE.whatsapp || INSTITUTE.phone, "Namaste! Mujhe ek sawal poochhna tha.");

  on($("#faqFilters"), "click", ".chip", (e, chip) => {
    activeCategory = chip.dataset.cat;
    paintFilters();
    paint();
  });

  on($("#faqList"), "click", ".faq-item__q", (e, btn) => {
    const item = btn.closest(".faq-item");
    const open = item.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(open));
  });

  $("#faqSearch").addEventListener("input", debounce((e) => {
    term = e.target.value.trim().toLowerCase();
    paint();
  }, 220));

  // Live FAQ from Firestore takes over when the admin adds entries
  try {
    const { getMany } = await import("../../firebase/db-service.js");
    const { COLLECTIONS } = await import("../core/constants.js");
    const rows = await getMany(COLLECTIONS.FAQ, { orderBy: ["order", "asc"], ttl: 15 * 60 * 1000 });
    if (rows.length) {
      all = rows;
      paintFilters();
      paint();
    }
  } catch { /* offline / not configured */ }
});
