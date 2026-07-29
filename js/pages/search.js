/* ==========================================================================
   Soft Skill Zone — Global search
   Searches courses, free tools, FAQ and blog. Config data is searched
   instantly offline; Firestore content is merged in when available.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { debounce, highlight, truncate, store } from "../core/utils.js";
import { url, param } from "../core/routes.js";
import { LS_KEYS } from "../core/constants.js";
import { COURSES, TOOLS, FAQ_SEED, BLOG_SEED } from "../config/site-data.js";

const TYPE_META = {
  course: { label: "Course", icon: "graduation" },
  tool:   { label: "Free Tool", icon: "calculator" },
  faq:    { label: "FAQ", icon: "info" },
  blog:   { label: "Article", icon: "fileText" }
};

let index = [];
let term = (param("q", "") || "").trim();

function buildIndex() {
  const rows = [];

  COURSES.forEach((c) => rows.push({
    type: "course",
    title: c.title,
    desc: c.tagline,
    href: url("courseDetail", { id: c.id }),
    hay: [c.title, c.shortTitle, c.tagline, c.description, c.code, c.category,
          ...(c.highlights || []), ...(c.careerOptions || []),
          ...(c.modules || []).flatMap((m) => [m.title, ...(m.topics || [])])].join(" ").toLowerCase()
  }));

  TOOLS.forEach((t) => rows.push({
    type: "tool",
    title: t.title,
    desc: t.desc,
    href: url(t.route),
    hay: `${t.title} ${t.desc} ${t.id}`.toLowerCase()
  }));

  FAQ_SEED.forEach((f) => rows.push({
    type: "faq",
    title: f.question,
    desc: truncate(f.answer, 150),
    href: url("faq"),
    hay: `${f.question} ${f.answer} ${f.category}`.toLowerCase()
  }));

  BLOG_SEED.forEach((b) => rows.push({
    type: "blog",
    title: b.title,
    desc: b.excerpt,
    href: url("blogPost", { slug: b.slug }),
    hay: `${b.title} ${b.excerpt} ${(b.tags || []).join(" ")}`.toLowerCase()
  }));

  return rows;
}

function score(row, q) {
  const t = row.title.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  if (row.desc && row.desc.toLowerCase().includes(q)) return 40;
  return 20;
}

function search(q) {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const words = query.split(/\s+/).filter(Boolean);
  return index
    .filter((row) => words.every((w) => row.hay.includes(w)))
    .map((row) => ({ ...row, _score: score(row, query) }))
    .sort((a, b) => b._score - a._score);
}

function paintResults(q) {
  const box = $("#searchResults");
  const meta = $("#searchMeta");

  if (!q.trim()) {
    meta.textContent = "";
    render(box, el("div", { class: "empty-state" },
      el("div", { class: "empty-state__icon", html: icon("search", { size: 32 }) }),
      el("h2", {}, "Kuch bhi search karein"),
      el("p", {}, "Course ka naam, ek topic, ya koi sawal — jo bhi dhundh rahe hain.")
    ));
    return;
  }

  const results = search(q);
  meta.textContent = `“${q}” ke liye ${results.length} result${results.length === 1 ? "" : "s"}`;

  if (!results.length) {
    render(box, el("div", { class: "empty-state" },
      el("div", { class: "empty-state__icon", html: icon("search", { size: 32 }) }),
      el("h2", {}, "Kuch nahi mila"),
      el("p", {}, "Doosre shabd try karein — jaise 'tally', 'gst return', 'emi' ya 'admission'."),
      el("a", { class: "btn-ssz btn-secondary-ssz", style: { marginTop: "1.25rem" }, href: url("contact") }, "Humse poochhein")
    ));
    return;
  }

  render(box, results.map((r) => {
    const m = TYPE_META[r.type];
    const node = el("a", { class: "search-result", href: r.href });
    node.appendChild(el("span", { class: "search-result__icon", html: icon(m.icon, { size: 20 }) }));
    const body = el("span", {});
    body.innerHTML = `
      <span class="search-result__type">${m.label}</span>
      <h2>${highlight(r.title, q)}</h2>
      <p>${highlight(truncate(r.desc || "", 150), q)}</p>`;
    node.appendChild(body);
    return node;
  }));

  const recent = store.get(LS_KEYS.RECENT_SEARCH, []);
  const next = [q, ...recent.filter((x) => x !== q)].slice(0, 6);
  store.set(LS_KEYS.RECENT_SEARCH, next);
}

function paintSuggestions() {
  const recent = store.get(LS_KEYS.RECENT_SEARCH, []);
  const base = recent.length ? recent : ["Tally", "GST return", "Python", "EMI calculator", "Admission"];
  render($("#searchSuggest"),
    el("span", { class: "text-muted-c", style: { fontSize: ".8rem" } }, recent.length ? "Recent:" : "Try:"),
    ...base.map((s) => el("button", { type: "button", class: "chip", dataset: { q: s } }, s))
  );
}

onReady(() => {
  index = buildIndex();
  paintSuggestions();

  const input = $("#searchInput");
  input.value = term;
  paintResults(term);

  input.addEventListener("input", debounce((e) => {
    term = e.target.value;
    paintResults(term);
    history.replaceState(null, "", term ? `?q=${encodeURIComponent(term)}` : location.pathname);
  }, 220));

  on($("#searchSuggest"), "click", ".chip", (e, chip) => {
    input.value = chip.dataset.q;
    term = chip.dataset.q;
    paintResults(term);
    input.focus();
  });
});
