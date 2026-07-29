/* ==========================================================================
   Soft Skill Zone — Blog listing
   Starter articles ship in site-data; published Firestore posts take over.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { formatDate, truncate, unique } from "../core/utils.js";
import { url } from "../core/routes.js";
import { BLOG_SEED } from "../config/site-data.js";

let posts = BLOG_SEED.map((p) => ({ ...p }));
let tag = "all";

function card(p, i) {
  const cover = p.coverURL
    ? el("div", { class: "blog-card__cover" }, el("img", { src: p.coverURL, alt: p.title, loading: "lazy", decoding: "async" }))
    : el("div", { class: "blog-card__cover" }, el("span", {}, (p.tags && p.tags[0]) || "SSZ"));

  return el("div", { "data-reveal": "up", "data-reveal-delay": String((i % 3) * 80) },
    el("a", { class: "blog-card", href: url("blogPost", { slug: p.slug }) },
      cover,
      el("div", { class: "blog-card__body" },
        el("div", { class: "blog-card__meta" },
          el("span", {}, formatDate(p.publishedOn || p.createdAt)),
          el("span", {}, "·"),
          el("span", {}, `${p.readMinutes || 4} min read`)
        ),
        el("h3", { class: "line-clamp-2" }, p.title),
        el("p", { class: "line-clamp-3" }, truncate(p.excerpt, 160)),
        el("div", { class: "cluster" },
          ...(p.tags || []).slice(0, 3).map((t) => el("span", { class: "badge-ssz badge-brand" }, t))
        )
      )
    )
  );
}

function paintFilters() {
  const tags = ["all", ...unique(posts.flatMap((p) => p.tags || []))];
  render($("#blogFilters"), tags.map((t) =>
    el("button", { type: "button", class: `chip${t === tag ? " is-active" : ""}`, dataset: { tag: t } },
      t === "all" ? "Sab" : t)
  ));
}

function paintGrid() {
  const list = tag === "all" ? posts : posts.filter((p) => (p.tags || []).includes(tag));
  render($("#blogGrid"), list.map(card));
  document.dispatchEvent(new CustomEvent("ssz:content-rendered", { detail: { scope: $("#blogGrid") } }));
}

onReady(async () => {
  paintFilters();
  paintGrid();

  on($("#blogFilters"), "click", ".chip", (e, chip) => {
    tag = chip.dataset.tag;
    paintFilters();
    paintGrid();
  });

  try {
    const { getMany } = await import("../../firebase/db-service.js");
    const { COLLECTIONS } = await import("../core/constants.js");
    const rows = await getMany(COLLECTIONS.BLOG, {
      where: [["isPublished", "==", true]],
      orderBy: ["createdAt", "desc"],
      limit: 40,
      ttl: 10 * 60 * 1000
    });
    if (rows.length) {
      posts = rows.map((r) => ({ ...r, slug: r.slug || r.id }));
      paintFilters();
      paintGrid();
    }
  } catch { /* offline */ }
});
