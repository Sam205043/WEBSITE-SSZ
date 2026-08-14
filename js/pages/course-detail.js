/* ==========================================================================
   Soft Skill Zone — Course detail page
   Reads ?id=<courseId>; falls back to the courses list if the id is unknown.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { money, whatsappLink } from "../core/utils.js";
import { url, param } from "../core/routes.js";
import { setPageMeta, injectJsonLd, breadcrumbLd, currentUrl, absolute } from "../core/seo.js";
import { courseGrid, durationLabel } from "../components/course-card.js";
import { getCourse, activeCourses, INSTITUTE } from "../config/site-data.js";
import { azadiOn, AZADI } from "../core/azadi.js";

const LEVEL = { beginner: "Beginner friendly", intermediate: "Intermediate", advanced: "Advanced" };

function renderHero(c) {
  const hero = $("#courseHero");
  hero.style.background = `linear-gradient(135deg, ${c.colorFrom}, ${c.colorTo})`;

  render(hero, el("div", { class: "ssz-container" },
    el("nav", { class: "course-hero__crumbs" },
      el("a", { href: url("home") }, "Home"), " / ",
      el("a", { href: url("courses") }, "Courses"), " / ",
      el("span", {}, c.shortTitle)
    ),
    el("div", { class: "cluster", style: { marginBottom: "1rem" } },
      el("span", { class: "badge-ssz" }, `Course code · ${c.code}`),
      c.isNew ? el("span", { class: "badge-ssz" }, "New") : null,
      c.isPopular ? el("span", { class: "badge-ssz" }, "Popular") : null
    ),
    el("h1", {}, c.title),
    el("p", {}, c.tagline),
    el("div", { class: "cluster", style: { marginTop: "1.5rem" } },
      el("span", { class: "badge-ssz" }, durationLabel(c.durationMonths)),
      el("span", { class: "badge-ssz" }, LEVEL[c.level] || c.level),
      el("span", { class: "badge-ssz" }, `${c.modules.length} modules`),
      el("span", { class: "badge-ssz" }, c.certificate || "Certificate on completion")
    )
  ));
}

function section(title, node) {
  return el("section", { style: { marginBottom: "2.5rem" }, "data-reveal": "up" },
    el("h2", { style: { marginBottom: "1rem", fontSize: "var(--fs-xl)" } }, title),
    node
  );
}

function renderMain(c) {
  const main = $("#courseMain");

  const modules = el("div", {});
  c.modules.forEach((m, i) => {
    const node = el("div", { class: `module${i === 0 ? " is-open" : ""}` });
    node.innerHTML = `
      <button class="module__head" type="button" aria-expanded="${i === 0}">
        <span class="module__num">${String(i + 1).padStart(2, "0")}</span>
        <span class="module__title"></span>
        <span class="module__chev">${icon("chevronDown", { size: 18 })}</span>
      </button>
      <div class="module__body"><ul class="module__topics"></ul></div>`;
    node.querySelector(".module__title").textContent = m.title;
    const ul = node.querySelector(".module__topics");
    (m.topics || []).forEach((t) => ul.appendChild(el("li", {}, t)));
    modules.appendChild(node);
  });

  const pills = (arr) => el("div", { class: "pill-list" }, ...arr.map((x) => el("span", {}, x)));

  render(main,
    section("Course ke baare me", el("p", { style: { fontSize: "var(--fs-md)", lineHeight: "var(--lh-loose)" } }, c.description)),
    section("Aap kya seekhenge", el("ul", { class: "enroll-card__list" },
      ...c.highlights.map((h) => el("li", {},
        el("span", { html: icon("checkCircle", { size: 17 }) }),
        el("span", {}, h)
      ))
    )),
    section("Syllabus", modules),
    section("Eligibility", pills(c.eligibility)),
    section("Career options", pills(c.careerOptions))
  );

  on(main, "click", ".module__head", (e, btn) => {
    const mod = btn.closest(".module");
    const open = mod.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(open));
  });
}

function renderAside(c) {
  const total = c.fee + (c.admissionFee || 0);
  const wa = whatsappLink(
    INSTITUTE.whatsapp || INSTITUTE.phone,
    `Namaste! Mujhe "${c.title}" course ke baare me jaankari chahiye.`
  );

  /* Kaata hua daam do shart par hi: course par `mrp` ho AUR offer ki
     tareekhein chal rahi hon. Isliye 1 September ko ye khud gayab ho
     jaayega — kisi ko yaad rakhkar hataana nahi padega. */
  const offer = Boolean(c.mrp) && c.mrp > c.fee && azadiOn();

  const points = [
    `${durationLabel(c.durationMonths)} ka course`,
    `${c.modules.length} modules, ${c.modules.reduce((a, m) => a + (m.topics?.length || 0), 0)} topics`,
    "Installment ki suvidha",
    "Notes aur assignments dashboard me",
    "Certificate course complete hone par"
  ];
  if (offer) points.unshift(`${AZADI.edition} offer — 31 August tak, sirf ${AZADI.totalSeats} seats`);

  render($("#courseAside"),
    el("div", { class: "card-ssz enroll-card" },
      el("div", { class: "card-ssz__body" },
        el("p", { class: "text-muted-c", style: { fontSize: ".75rem", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", marginBottom: ".4rem" } },
          offer ? "Azadi offer price" : "Course fee"),
        el("div", { class: "enroll-card__price" },
          offer ? el("span", { class: "enroll-card__mrp" }, money(c.mrp)) : null,
          money(c.fee)
        ),
        /* Admission fee alag nahi li jaati. Agar kabhi kisi course par lagayi
           jaaye to line apne aap wapas aa jaayegi. Offer wale course par
           iski jagah classroom ka daam batana zyada kaam ka hai — wahi ek
           sawaal hai jo har poochhne wala poochhta hai. */
        el("p", { class: "text-muted-c", style: { fontSize: ".8rem", marginTop: ".4rem" } },
          offer
            ? `Classroom (Ara) ${money(c.feeOffline || c.fee)}` +
              (c.mrpOffline ? ` — pehle ${money(c.mrpOffline)}` : "")
            : c.admissionFee
              ? `+ ${money(c.admissionFee)} admission fee · Total ${money(total)}`
              : "Koi alag admission fee nahi"),

        el("ul", { class: "enroll-card__list" },
          ...points.map((t) => el("li", {},
            el("span", { html: icon("check", { size: 17 }) }),
            el("span", {}, t)
          ))
        ),

        el("a", {
          class: "btn-ssz btn-primary-ssz btn-block-ssz",
          href: url("admission", { course: c.id })
        }, "Admission Lein"),

        el("a", {
          class: "btn-ssz btn-secondary-ssz btn-block-ssz",
          style: { marginTop: ".75rem" },
          href: wa, target: "_blank", rel: "noopener"
        }, "WhatsApp par poochhein")
      )
    )
  );
}

/* --------------------------------------------------------------------------
   Structured data — a Course graph so Google can show duration, fee and
   provider directly in search results. Built from the same site-data record
   that renders the page, so it can never drift out of sync.
   -------------------------------------------------------------------------- */
function injectCourseSchema(c) {
  const provider = {
    "@type": "EducationalOrganization",
    name: INSTITUTE.name,
    sameAs: absolute("../index.html"),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Ara",
      addressRegion: "Bihar",
      postalCode: "802301",
      addressCountry: "IN"
    }
  };

  const topics = c.modules.flatMap((m) => m.topics || []);

  injectJsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        name: c.title,
        description: c.description,
        url: currentUrl(),
        courseCode: c.code,
        educationalLevel: LEVEL[c.level] || c.level,
        inLanguage: ["hi-IN", "en-IN"],
        teaches: topics.slice(0, 25),
        provider,
        offers: {
          "@type": "Offer",
          category: "Paid",
          price: String(c.fee + (c.admissionFee || 0)),
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
          url: absolute(`admission.html?course=${encodeURIComponent(c.id)}`)
        },
        hasCourseInstance: [{
          "@type": "CourseInstance",
          courseMode: ["Onsite", "Online"],
          courseWorkload: `PT${c.hoursPerWeek || 6}H`,
          location: { "@type": "Place", name: INSTITUTE.name, address: INSTITUTE.address }
        }],
        timeRequired: `P${c.durationMonths}M`
      },
      breadcrumbLd([
        { name: "Home", url: "../index.html" },
        { name: "Courses", url: "courses.html" },
        { name: c.shortTitle }
      ])
    ]
  }, "ssz-course-ld");
}

onReady(() => {
  const id = param("id");
  const course = id ? getCourse(id) : null;

  if (!course) {
    render($("#courseHero"), el("div", { class: "ssz-container" },
      el("h1", {}, "Course nahi mila"),
      el("p", {}, "Ho sakta hai link purana ho. Neeche se saare courses dekhein."),
      el("a", { class: "btn-ssz btn-secondary-ssz", style: { marginTop: "1.25rem" }, href: url("courses") }, "Saare Courses")
    ));
    $("#courseHero").style.background = "var(--grad-brand)";
    courseGrid("#relatedGrid", activeCourses().slice(0, 3));
    return;
  }

  setPageMeta({
    title: `${course.title} | Soft Skill Zone Institute`,
    description: `${course.title} — ${course.tagline}. ${durationLabel(course.durationMonths)}, fees ${money(course.fee)}. Soft Skill Zone Institute, Ara.`,
    canonical: currentUrl(),
    image: absolute("../images/logo/og-cover.jpg"),
    type: "article"
  });
  injectCourseSchema(course);

  renderHero(course);
  renderMain(course);
  renderAside(course);

  const related = activeCourses()
    .filter((c) => c.id !== course.id && c.category === course.category)
    .concat(activeCourses().filter((c) => c.id !== course.id && c.category !== course.category))
    .slice(0, 3);
  courseGrid("#relatedGrid", related);

  document.dispatchEvent(new CustomEvent("ssz:content-rendered", { detail: { scope: document } }));
});
