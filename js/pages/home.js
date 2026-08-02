/* ==========================================================================
   Soft Skill Zone — Landing page controller (index.html)
   --------------------------------------------------------------------------
   Every section is rendered from js/config/site-data.js, so adding a course or
   a tool is a one-line data change — no markup edits.
   Approved reviews from Firestore (collection `reviews`) replace the seed
   testimonials automatically once the institute starts collecting them.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon, iconFilled } from "../core/icons.js";
import { initials, whatsappLink } from "../core/utils.js";
import { url } from "../core/routes.js";
import { courseGrid } from "../components/course-card.js";
import { installCard } from "../components/install-ui.js";
import {
  INSTITUTE, STATS, COURSES, COURSE_CATEGORIES, FEATURES,
  JOURNEY, TESTIMONIALS, TOOLS, HERO_BADGES, coursesByCategory
} from "../config/site-data.js";

/* ==========================================================================
   Hero
   ========================================================================== */
function renderHeroBadges() {
  const box = $("#heroBadges");
  if (!box) return;
  render(box, HERO_BADGES.map((b) =>
    el("span", { class: "hero__badge" },
      el("span", { html: icon(b.icon, { size: 17 }) }),
      b.label
    )
  ));
}

function renderHeroVisual() {
  const box = $("#heroCourses");
  if (!box) return;

  // Three most popular courses as a glass stack
  const picks = COURSES.filter((c) => c.isPopular).slice(0, 3);

  /* Poori line link hai — sirf "Open" wala nishan nahi.

     "Open" ka matlab hai "is course me admission khula hai" — wo haalat
     batata hai, kahin le nahi jata. Pehle poori line saada div thi, isliye
     dabaane par kuchh hota hi nahi tha, aur log gol-hare "Open" ko button
     samajh kar dabate rahte the. Ab angootha line par kahin bhi pade,
     course ka page khul jata hai — phone par yahi sabse aasan hai. */
  render(box, picks.map((c) =>
    el("a", {
      class: "hero-card__row",
      href: url("courseDetail", { id: c.id }),
      "aria-label": `${c.title} — poora syllabus aur fees dekhein`
    },
      el("span", {
        class: "hero-card__icon",
        style: { background: `linear-gradient(135deg, ${c.colorFrom}, ${c.colorTo})` },
        html: icon(c.icon, { size: 20 })
      }),
      el("span", { class: "hero-card__text" },
        el("span", { class: "hero-card__title", style: { display: "block" } }, c.title),
        el("span", { class: "hero-card__sub" }, `${c.durationMonths} months · ${c.modules.length} modules`)
      ),
      el("span", { class: "badge-ssz badge-success", style: { marginLeft: "auto" } }, "Open"),
      el("span", { class: "hero-card__go", "aria-hidden": "true", html: icon("chevronRight", { size: 16 }) })
    )
  ));
}

/* ==========================================================================
   Announcement strip (duplicated once so the marquee loops seamlessly)
   ========================================================================== */
function renderStrip() {
  const track = $("#stripTrack");
  if (!track) return;

  const items = [
    `Admission Open ${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}`,
    "AI-Powered Syllabus",
    "Google Meet Live Classes",
    "Verified Certificate",
    "Installment Facility",
    "Morning & Evening Batches",
    "100% Practical Training"
  ];

  const build = () => items.map((text) =>
    el("span", { class: "strip__item" },
      el("span", { html: icon("sparkles", { size: 15 }) }),
      text
    )
  );

  render(track, [...build(), ...build()]);
}

/* ==========================================================================
   Stats band
   ========================================================================== */
function renderStats() {
  const box = $("#statsBand");
  if (!box) return;

  render(box, STATS.map((s) =>
    el("div", { class: "stats-band__cell" },
      el("div", { class: "stats-band__icon", html: icon(s.icon, { size: 20 }) }),
      el("div", {
        class: "stats-band__value",
        dataset: { count: String(s.value), countSuffix: s.suffix }
      }, "0"),
      el("div", { class: "stats-band__label" }, s.label)
    )
  ));
}

/* ==========================================================================
   Courses + category filter
   ========================================================================== */
function renderCourses() {
  const chips = $("#courseFilters");
  const grid = $("#courseGrid");
  if (!chips || !grid) return;

  render(chips, COURSE_CATEGORIES.map((c, i) =>
    el("button", {
      type: "button",
      class: `chip${i === 0 ? " is-active" : ""}`,
      dataset: { category: c.value }
    }, c.label)
  ));

  const paint = (category) => courseGrid(grid, coursesByCategory(category));
  paint("all");

  on(chips, "click", ".chip", (e, chip) => {
    chips.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    paint(chip.dataset.category);
  });
}

/* ==========================================================================
   Why choose us
   ========================================================================== */
function renderFeatures() {
  const box = $("#featureGrid");
  if (!box) return;

  render(box, FEATURES.map((f, i) =>
    el("div", { "data-reveal": "up", "data-reveal-delay": String(i * 70) },
      el("div", { class: "feature" },
        el("div", { class: "feature__icon", html: icon(f.icon, { size: 22 }) }),
        el("h3", {}, f.title),
        el("p", {}, f.desc)
      )
    )
  ));
}

/* ==========================================================================
   How it works
   ========================================================================== */
function renderJourney() {
  const box = $("#journeyGrid");
  if (!box) return;

  render(box, JOURNEY.map((j, i) =>
    el("div", { class: "journey__item", "data-reveal": "up", "data-reveal-delay": String(i * 90) },
      el("div", { class: "journey__num" }, String(j.step).padStart(2, "0")),
      el("div", { class: "journey__icon", html: icon(j.icon, { size: 21 }) }),
      el("h3", {}, j.title),
      el("p", {}, j.desc)
    )
  ));
}

/* ==========================================================================
   Testimonials
   ========================================================================== */
function starRow(rating) {
  const wrap = el("span", { class: "rating", role: "img", "aria-label": `${rating} out of 5` });
  for (let i = 0; i < 5; i++) {
    wrap.insertAdjacentHTML("beforeend",
      iconFilled("star", { size: 15 }).replace("<svg", `<svg style="opacity:${i < rating ? 1 : 0.25}"`));
  }
  return wrap;
}

function testimonialCard(t, i) {
  return el("div", { "data-reveal": "up", "data-reveal-delay": String(i * 80) },
    el("div", { class: "testimonial" },
      el("span", { class: "testimonial__quote", html: iconFilled("quote", { size: 42 }) }),
      starRow(t.rating || 5),
      el("p", { class: "testimonial__msg" }, `“${t.message}”`),
      el("div", { class: "testimonial__who" },
        t.photoURL
          ? el("img", { class: "avatar avatar-md", src: t.photoURL, alt: t.name, loading: "lazy" })
          : el("span", { class: "avatar avatar-md avatar-fallback" }, initials(t.name)),
        el("span", {},
          el("span", { class: "testimonial__name", style: { display: "block" } }, t.name),
          el("span", { class: "testimonial__course" }, t.course)
        )
      )
    )
  );
}

function renderTestimonials(list) {
  const box = $("#testimonialGrid");
  if (!box) return;
  render(box, list.slice(0, 6).map(testimonialCard));
  document.dispatchEvent(new CustomEvent("ssz:content-rendered", { detail: { scope: box } }));
}

/** Swap the seed testimonials for real approved reviews when they exist. */
async function loadLiveReviews() {
  try {
    const { getMany } = await import("../../firebase/db-service.js");
    const { COLLECTIONS } = await import("../core/constants.js");

    const rows = await getMany(COLLECTIONS.REVIEWS, {
      where: [["isApproved", "==", true]],
      orderBy: ["createdAt", "desc"],
      limit: 6,
      ttl: 10 * 60 * 1000
    });

    if (rows.length) {
      renderTestimonials(rows.map((r) => ({
        name: r.studentName,
        course: r.courseName,
        rating: r.rating,
        message: r.message,
        photoURL: r.photoURL
      })));
    }
  } catch {
    /* Firebase not configured yet — seed testimonials stay on screen */
  }
}

/* ==========================================================================
   Free tools teaser
   ========================================================================== */
function renderTools() {
  const box = $("#toolGrid");
  if (!box) return;

  render(box, TOOLS.map((t, i) =>
    el("div", { "data-reveal": "up", "data-reveal-delay": String(Math.min(i, 6) * 50) },
      el("a", { class: "tool-tile", href: url(t.route) },
        el("span", {
          class: "tool-tile__icon",
          style: { background: t.color },
          html: icon(t.icon, { size: 19 })
        }),
        el("span", {},
          el("span", { class: "tool-tile__name", style: { display: "block" } }, t.title),
          el("span", { class: "tool-tile__desc" }, t.desc)
        )
      )
    )
  ));
}

/* ==========================================================================
   CTA WhatsApp link
   ========================================================================== */
function wireCTA() {
  const wa = $("#ctaWhatsapp");
  if (wa) {
    wa.href = whatsappLink(
      INSTITUTE.whatsapp || INSTITUTE.phone,
      `Namaste! Main ${INSTITUTE.name} me admission ke baare me jaanna chahta/chahti hoon.`
    );
  }
}

/* ==========================================================================
   Boot
   ========================================================================== */
onReady(() => {
  renderHeroBadges();
  renderHeroVisual();
  renderStrip();
  renderStats();
  renderCourses();
  renderFeatures();
  renderJourney();
  renderTestimonials(TESTIMONIALS);
  renderTools();
  wireCTA();
  /* Install ka card — khud tay karta hai ki dikhna hai ya nahi. */
  installCard(document.getElementById("installMount"));

  // Re-run reveal/counters for everything we just injected
  document.dispatchEvent(new CustomEvent("ssz:content-rendered", { detail: { scope: document } }));

  loadLiveReviews();
});
