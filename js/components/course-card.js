/* ==========================================================================
   Soft Skill Zone — Course card component
   --------------------------------------------------------------------------
   One renderer used by the landing page, the Courses page (Phase 3) and the
   admission form's course picker. Cards are built from data, never hard-coded.

     courseGrid(container, COURSES)          // render a set
     courseCard(course)                      // single DOM node
   ========================================================================== */

import { el, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { money } from "../core/utils.js";
import { url } from "../core/routes.js";
import { azadiOn } from "../core/azadi.js";

/* Kaata hua daam sirf tab dikhta hai jab course par `mrp` ho AUR offer ki
   tareekhein chal rahi hon. Dono shart ek saath isliye ki offer khatam hone
   par kaate hue daam apne aap gayab ho jaayein — kisi ko yaad rakhkar
   hataana na pade. `mrp` ka style bhi css/azadi.css me hai, jo offer band
   hote hi load hona band ho jaati hai; isliye markup aur style hamesha
   saath-saath aate-jaate hain. */
const showOffer = (c) => Boolean(c.mrp) && c.mrp > c.fee && azadiOn();

const LEVEL_LABEL = {
  beginner: "Beginner friendly",
  intermediate: "Intermediate",
  advanced: "Advanced"
};

/** Duration in a human phrase: 24 -> "2 years", 6 -> "6 months". */
export function durationLabel(months) {
  const m = Number(months) || 0;
  if (m >= 12 && m % 12 === 0) return `${m / 12} year${m / 12 > 1 ? "s" : ""}`;
  if (m >= 12) return `${(m / 12).toFixed(1)} years`;
  return `${m} month${m > 1 ? "s" : ""}`;
}

/**
 * @param {object} course entry from js/config/site-data.js COURSES
 * @returns {HTMLElement}
 */
export function courseCard(course) {
  const offer = showOffer(course);

  const card = el("a", {
    class: `course-card${offer ? " is-azadi" : ""}`,
    href: url("courseDetail", { id: course.id }),
    "aria-label": `${course.title} — details dekhein`
  });

  /* ---- coloured header ---- */
  const top = el("div", {
    class: "course-card__top",
    style: { background: `linear-gradient(135deg, ${course.colorFrom}, ${course.colorTo})` }
  });

  top.appendChild(el("span", { class: "course-card__icon", html: icon(course.icon, { size: 21 }) }));

  const flags = el("div", { class: "course-card__flags" });
  if (offer) flags.appendChild(el("span", { class: "course-card__flag course-card__flag--azadi" }, "Azadi Offer"));
  if (course.isNew)     flags.appendChild(el("span", { class: "course-card__flag" }, "New"));
  if (course.isPopular) flags.appendChild(el("span", { class: "course-card__flag" }, "Popular"));
  if (flags.children.length) top.appendChild(flags);

  top.appendChild(el("span", { class: "course-card__code" }, `COURSE CODE · ${course.code}`));
  card.appendChild(top);

  /* ---- body ---- */
  const body = el("div", { class: "course-card__body" });
  body.appendChild(el("h3", { class: "course-card__title" }, course.title));
  body.appendChild(el("p", { class: "course-card__tagline line-clamp-2" }, course.tagline));

  const meta = el("div", { class: "course-card__meta" });
  meta.appendChild(el("span", { class: "badge-ssz" }, durationLabel(course.durationMonths)));
  meta.appendChild(el("span", { class: "badge-ssz badge-brand" }, LEVEL_LABEL[course.level] || course.level));
  meta.appendChild(el("span", { class: "badge-ssz badge-accent" }, `${course.modules.length} modules`));
  body.appendChild(meta);

  const foot = el("div", { class: "course-card__foot" });
  foot.appendChild(el("div", { class: "course-card__fee" },
    offer ? el("span", { class: "course-card__mrp" }, money(course.mrp)) : null,
    money(course.fee),
    el("small", {}, offer ? "Azadi offer price" : "Full course fee")
  ));
  foot.appendChild(el("span", {
    class: "btn-ssz btn-secondary-ssz btn-sm-ssz",
    html: `Details ${icon("arrowRight", { size: 16 })}`
  }));
  body.appendChild(foot);

  card.appendChild(body);
  return card;
}

/**
 * Render a grid of course cards, with a staggered reveal.
 * @param {HTMLElement|string} container
 * @param {Array} courses
 */
export function courseGrid(container, courses) {
  const node = typeof container === "string" ? document.querySelector(container) : container;
  if (!node) return;

  if (!courses.length) {
    render(node, el("p", { class: "text-muted-c", style: { gridColumn: "1/-1", textAlign: "center" } },
      "Is category me abhi koi course nahi hai."));
    return;
  }

  const frag = document.createDocumentFragment();
  courses.forEach((c, i) => {
    const wrap = el("div", { "data-reveal": "up", "data-reveal-delay": String(Math.min(i, 5) * 70) });
    wrap.appendChild(courseCard(c));
    frag.appendChild(wrap);
  });

  node.replaceChildren(frag);
  document.dispatchEvent(new CustomEvent("ssz:content-rendered", { detail: { scope: node } }));
}
