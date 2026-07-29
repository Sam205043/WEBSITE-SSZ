/* ==========================================================================
   Soft Skill Zone — Courses listing page
   Category filter + text search + sorting, all client-side over site-data.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { debounce } from "../core/utils.js";
import { courseGrid } from "../components/course-card.js";
import { COURSE_CATEGORIES, activeCourses } from "../config/site-data.js";
import { param } from "../core/routes.js";

let category = param("category", "all");
let term = (param("q", "") || "").toLowerCase();
let sort = "default";

function filtered() {
  let list = activeCourses();

  if (category !== "all") list = list.filter((c) => c.category === category);

  if (term) {
    list = list.filter((c) => {
      const hay = [
        c.title, c.shortTitle, c.tagline, c.description, c.code, c.category,
        ...(c.highlights || []),
        ...(c.careerOptions || []),
        ...(c.modules || []).flatMap((m) => [m.title, ...(m.topics || [])])
      ].join(" ").toLowerCase();
      return hay.includes(term);
    });
  }

  const sorters = {
    "fee-asc":      (a, b) => a.fee - b.fee,
    "fee-desc":     (a, b) => b.fee - a.fee,
    "duration-asc": (a, b) => a.durationMonths - b.durationMonths,
    "title":        (a, b) => a.title.localeCompare(b.title),
    "default":      (a, b) => a.order - b.order
  };
  return [...list].sort(sorters[sort] || sorters.default);
}

function paint() {
  const list = filtered();
  courseGrid("#courseGrid", list);

  const total = activeCourses().length;
  $("#courseCount").textContent = list.length === total
    ? `Saare ${total} courses`
    : `${list.length} / ${total} courses dikh rahe hain`;
}

function paintFilters() {
  render($("#courseFilters"), COURSE_CATEGORIES.map((c) =>
    el("button", {
      type: "button",
      class: `chip${c.value === category ? " is-active" : ""}`,
      dataset: { category: c.value }
    }, c.label)
  ));
}

onReady(() => {
  const search = $("#courseSearch");
  if (term) search.value = term;

  paintFilters();
  paint();

  on($("#courseFilters"), "click", ".chip", (e, chip) => {
    category = chip.dataset.category;
    paintFilters();
    paint();
    history.replaceState(null, "", `?category=${category}${term ? `&q=${encodeURIComponent(term)}` : ""}`);
  });

  search.addEventListener("input", debounce((e) => {
    term = e.target.value.trim().toLowerCase();
    paint();
  }, 220));

  $("#courseSort").addEventListener("change", (e) => {
    sort = e.target.value;
    paint();
  });
});
