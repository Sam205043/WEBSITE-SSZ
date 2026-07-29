/* ==========================================================================
   Soft Skill Zone — Student Reviews page
   Seed reviews render instantly; approved Firestore reviews replace them.
   Signed-in students get a submit form (it saves as unapproved).
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon, iconFilled } from "../core/icons.js";
import { initials, unique } from "../core/utils.js";
import { url } from "../core/routes.js";
import { TESTIMONIALS, COURSES } from "../config/site-data.js";
import toast from "../core/toast.js";
import { withButton } from "../core/loader.js";

const PAGE = 6;
let all = TESTIMONIALS.map((t) => ({ ...t }));
let course = "all";
let shown = PAGE;

function stars(rating, size = 15) {
  const wrap = el("span", { class: "rating", role: "img", "aria-label": `${rating} out of 5` });
  for (let i = 0; i < 5; i++) {
    wrap.insertAdjacentHTML("beforeend",
      iconFilled("star", { size }).replace("<svg", `<svg style="opacity:${i < rating ? 1 : 0.25}"`));
  }
  return wrap;
}

function visible() {
  return course === "all" ? all : all.filter((r) => r.course === course);
}

function paintSummary() {
  const list = all;
  const avg = list.length ? list.reduce((a, r) => a + (r.rating || 5), 0) / list.length : 0;
  const buckets = [5, 4, 3, 2, 1].map((n) => ({
    n, count: list.filter((r) => Math.round(r.rating || 5) === n).length
  }));

  render($("#reviewSummary"),
    el("div", { class: "review-summary__score" },
      el("div", { class: "review-summary__num" }, avg.toFixed(1)),
      stars(Math.round(avg), 18),
      el("p", { class: "text-muted-c", style: { fontSize: ".8rem", marginTop: ".5rem" } },
        `${list.length} reviews`)
    ),
    el("div", { class: "stack", style: { gap: ".6rem" } },
      ...buckets.map((b) =>
        el("div", { class: "review-bar" },
          el("span", { style: { width: "34px" } }, `${b.n} ★`),
          el("span", { class: "review-bar__track" },
            el("span", { class: "review-bar__fill", style: { width: list.length ? `${(b.count / list.length) * 100}%` : "0%" } })
          ),
          el("span", { style: { width: "28px", textAlign: "right" } }, String(b.count))
        )
      )
    )
  );
}

function paintFilters() {
  const courses = ["all", ...unique(all.map((r) => r.course)).filter(Boolean)];
  render($("#reviewFilters"), courses.map((c) =>
    el("button", { type: "button", class: `chip${c === course ? " is-active" : ""}`, dataset: { course: c } },
      c === "all" ? "Sab courses" : c)
  ));
}

function reviewCard(r, i) {
  return el("div", { "data-reveal": "up", "data-reveal-delay": String((i % 6) * 70) },
    el("div", { class: "testimonial" },
      el("span", { class: "testimonial__quote", html: iconFilled("quote", { size: 42 }) }),
      stars(r.rating || 5),
      el("p", { class: "testimonial__msg" }, `“${r.message}”`),
      el("div", { class: "testimonial__who" },
        r.photoURL
          ? el("img", { class: "avatar avatar-md", src: r.photoURL, alt: r.name, loading: "lazy", decoding: "async" })
          : el("span", { class: "avatar avatar-md avatar-fallback" }, initials(r.name)),
        el("span", {},
          el("span", { class: "testimonial__name", style: { display: "block" } }, r.name),
          el("span", { class: "testimonial__course" }, r.course)
        )
      )
    )
  );
}

function paintGrid() {
  const list = visible();
  render($("#reviewGrid"), list.slice(0, shown).map(reviewCard));
  const more = $("#reviewMore");
  more.hidden = list.length <= shown;
  document.dispatchEvent(new CustomEvent("ssz:content-rendered", { detail: { scope: $("#reviewGrid") } }));
}

/* ---------------- Submit form ---------------- */
function guestPrompt() {
  render($("#reviewFormBox"),
    el("p", { style: { marginBottom: "1.25rem" } },
      "Review sirf enrolled students hi likh sakte hain. Apne student account se login karein — " +
      "review admin approval ke baad website par dikhega."),
    el("div", { class: "cluster" },
      el("a", { class: "btn-ssz btn-primary-ssz", href: url("studentLogin") }, "Student Login"),
      el("a", { class: "btn-ssz btn-ghost-ssz", href: url("admission") }, "Abhi tak enrolled nahi?")
    )
  );
}

function studentForm(user) {
  const form = el("form", { id: "reviewForm", novalidate: true });
  form.innerHTML = `
    <div class="field">
      <label class="field__label" for="rCourse">Course <span class="req">*</span></label>
      <select class="select-ssz" id="rCourse" name="courseName"></select>
      <div class="field__error">Course chunein.</div>
    </div>
    <div class="field">
      <label class="field__label">Rating <span class="req">*</span></label>
      <div class="cluster" id="ratingPicker" role="radiogroup" aria-label="Rating"></div>
    </div>
    <div class="field">
      <label class="field__label" for="rMsg">Aapka experience <span class="req">*</span></label>
      <textarea class="textarea-ssz" id="rMsg" name="message" maxlength="600"
        placeholder="Course kaisa laga, kya seekha, kya behtar ho sakta hai…"></textarea>
      <div class="field__error">Kam se kam 20 characters likhein.</div>
    </div>
    <button class="btn-ssz btn-primary-ssz btn-block-ssz" type="submit" id="reviewSubmit">Review Bhejein</button>`;

  const select = form.querySelector("#rCourse");
  select.appendChild(el("option", { value: "" }, "Chunein"));
  COURSES.forEach((c) => select.appendChild(el("option", { value: c.title }, c.title)));

  let rating = 5;
  const picker = form.querySelector("#ratingPicker");
  const paintPicker = () => {
    render(picker, [1, 2, 3, 4, 5].map((n) =>
      el("button", {
        type: "button", class: `chip${n === rating ? " is-active" : ""}`, dataset: { rating: String(n) },
        "aria-pressed": String(n === rating)
      }, `${n} ★`)
    ));
  };
  paintPicker();
  on(picker, "click", ".chip", (e, chip) => { rating = Number(chip.dataset.rating); paintPicker(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const courseName = select.value;
    const message = form.querySelector("#rMsg").value.trim();

    form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
    if (!courseName) { select.closest(".field").classList.add("has-error"); return; }
    if (message.length < 20) { form.querySelector("#rMsg").closest(".field").classList.add("has-error"); return; }

    await withButton(form.querySelector("#reviewSubmit"), async () => {
      try {
        const { create } = await import("../../firebase/db-service.js");
        const { COLLECTIONS } = await import("../core/constants.js");
        await create(COLLECTIONS.REVIEWS, {
          studentName: user.name,
          studentId: user.studentId || "",
          courseName,
          rating,
          message,
          photoURL: user.photoURL || "",
          isApproved: false
        });
        render($("#reviewFormBox"),
          el("div", { class: "empty-state", style: { padding: "2rem 1rem" } },
            el("div", { class: "empty-state__icon", style: { background: "var(--success-soft)", color: "var(--success)" }, html: icon("checkCircle", { size: 32 }) }),
            el("h2", {}, "Shukriya!"),
            el("p", {}, "Aapka review mil gaya. Admin approve karte hi ye website par dikhne lagega.")
          )
        );
      } catch (err) {
        toast.error(err.message || "Review save nahi ho paya. Dobara try karein.");
      }
    });
  });

  render($("#reviewFormBox"), form);
}

onReady(async () => {
  paintSummary();
  paintFilters();
  paintGrid();

  on($("#reviewFilters"), "click", ".chip", (e, chip) => {
    course = chip.dataset.course;
    shown = PAGE;
    paintFilters();
    paintGrid();
  });

  $("#reviewMore").addEventListener("click", () => { shown += PAGE; paintGrid(); });

  guestPrompt();

  try {
    const { getMany } = await import("../../firebase/db-service.js");
    const { COLLECTIONS } = await import("../core/constants.js");
    const rows = await getMany(COLLECTIONS.REVIEWS, {
      where: [["isApproved", "==", true]],
      orderBy: ["createdAt", "desc"],
      limit: 60,
      ttl: 10 * 60 * 1000
    });
    if (rows.length) {
      all = rows.map((r) => ({
        name: r.studentName, course: r.courseName, rating: r.rating,
        message: r.message, photoURL: r.photoURL
      }));
      paintSummary(); paintFilters(); paintGrid();
    }
  } catch { /* offline */ }

  try {
    const { onUserChanged } = await import("../../firebase/auth-service.js");
    onUserChanged((user) => {
      if (user && user.role === "student") studentForm(user);
      else guestPrompt();
    });
  } catch { /* not configured */ }
});
