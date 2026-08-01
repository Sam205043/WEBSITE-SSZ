/* ==========================================================================
   Soft Skill Zone — Blog article
   Reads ?slug=…; seed articles render offline, Firestore posts when present.
   ========================================================================== */

import { $, el, onReady, render } from "../core/dom.js";
import { formatDate, truncate } from "../core/utils.js";
import { url, param } from "../core/routes.js";
import { setPageMeta, injectJsonLd, breadcrumbLd, currentUrl, absolute } from "../core/seo.js";
import { BLOG_SEED, INSTITUTE } from "../config/site-data.js";

/** Seed articles store content as blocks; Firestore posts store HTML. */
function renderBody(post) {
  if (Array.isArray(post.content)) {
    return post.content.map((b) => b.type === "h" ? el("h2", {}, b.text) : el("p", {}, b.text));
  }
  const wrap = el("div", {});
  wrap.innerHTML = post.content || "";
  return [wrap];
}

/* Article + breadcrumb structured data, rebuilt whenever the post changes
   (seed render first, then again if Firestore returns a newer version). */
function injectArticleSchema(post) {
  const published = post.publishedOn || post.createdAt;
  const iso = published ? new Date(published).toISOString() : undefined;

  injectJsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: truncate(post.title, 110),
        description: truncate(post.excerpt || post.title, 200),
        url: currentUrl(),
        mainEntityOfPage: { "@type": "WebPage", "@id": currentUrl() },
        inLanguage: "hi-IN",
        datePublished: iso,
        dateModified: iso,
        keywords: (post.tags || []).join(", ") || undefined,
        wordCount: Array.isArray(post.content)
          ? post.content.reduce((n, b) => n + String(b.text || "").split(/\s+/).length, 0)
          : undefined,
        image: post.coverURL ? absolute(post.coverURL) : absolute("../images/logo/og-cover.jpg"),
        author: { "@type": "Organization", name: post.author || INSTITUTE.name },
        publisher: {
          "@type": "Organization",
          name: INSTITUTE.name,
          logo: { "@type": "ImageObject", url: absolute("../images/logo/icon-512.png") }
        }
      },
      breadcrumbLd([
        { name: "Home", url: "../index.html" },
        { name: "Blog", url: "blog.html" },
        { name: truncate(post.title, 60) }
      ])
    ]
  }, "ssz-article-ld");
}

function renderPost(post) {
  setPageMeta({
    title: `${post.title} | Soft Skill Zone Institute`,
    description: truncate(post.excerpt || post.title, 155),
    canonical: currentUrl(),
    image: post.coverURL || absolute("../images/logo/og-cover.jpg"),
    type: "article"
  });
  injectArticleSchema(post);

  render($("#article"),
    el("nav", { class: "breadcrumb-ssz", style: { justifyContent: "flex-start", marginBottom: "1rem" } },
      el("a", { href: url("home") }, "Home"), el("span", {}, "/"),
      el("a", { href: url("blog") }, "Blog"), el("span", {}, "/"),
      el("span", {}, truncate(post.title, 40))
    ),
    el("h1", { style: { marginBottom: "1rem" } }, post.title),
    el("div", { class: "article__meta" },
      el("span", {}, post.author || "Soft Skill Zone"),
      el("span", {}, formatDate(post.publishedOn || post.createdAt)),
      el("span", {}, `${post.readMinutes || 4} min read`),
      ...(post.tags || []).map((t) => el("span", { class: "badge-ssz badge-brand" }, t))
    ),
    ...renderBody(post),
    el("div", { class: "card-ssz", style: { marginTop: "3rem" } },
      el("div", { class: "card-ssz__body", style: { textAlign: "center" } },
        el("h2", { style: { marginBottom: ".5rem", fontSize: "1.15rem" } }, "In topics par course bhi chalte hain"),
        el("p", { style: { marginBottom: "1.5rem" } }, "Practical training, chhote batches aur AI tools ke saath."),
        el("a", { class: "btn-ssz btn-primary-ssz", href: url("courses") }, "Courses Dekhein")
      )
    )
  );
}

function notFound() {
  render($("#article"),
    el("div", { class: "empty-state" },
      el("h2", {}, "Article nahi mila"),
      el("p", {}, "Ho sakta hai link purana ho ya article hata diya gaya ho."),
      el("a", { class: "btn-ssz btn-secondary-ssz", style: { marginTop: "1.25rem" }, href: url("blog") }, "Saare articles")
    )
  );
}

function renderMore(list, currentSlug) {
  const others = list.filter((p) => p.slug !== currentSlug).slice(0, 3);
  render($("#moreGrid"), others.map((p) =>
    el("a", { class: "blog-card", href: url("blogPost", { slug: p.slug }) },
      el("div", { class: "blog-card__cover" },
        p.coverURL ? el("img", { src: p.coverURL, alt: p.title, loading: "lazy", decoding: "async" })
                   : el("span", {}, (p.tags && p.tags[0]) || "SSZ")),
      el("div", { class: "blog-card__body" },
        el("h3", { class: "line-clamp-2" }, p.title),
        el("p", { class: "line-clamp-2" }, truncate(p.excerpt, 110))
      )
    )
  ));
}

onReady(async () => {
  const slug = param("slug");
  let posts = BLOG_SEED;
  let post = slug ? posts.find((p) => p.slug === slug) : posts[0];

  if (post) { renderPost(post); renderMore(posts, post.slug); }

  try {
    const { getMany, getOne } = await import("../../firebase/db-service.js");
    const { COLLECTIONS } = await import("../core/constants.js");

    /* Jis slug ka Firestore me doc hi nahi hai (abhi saare post seed se aate
       hain) uska read rule `resource.data` par tika hota hai — isliye wo
       "nahi mila" nahi, balki "mana kar diya" bankar throw hota hai. Apna
       alag catch na ho to niche wali "aur padhein" list bhi saath me mar
       jaati thi. */
    const live = slug
      ? await getOne(COLLECTIONS.BLOG, slug, { ttl: 10 * 60 * 1000 }).catch(() => null)
      : null;
    if (live && live.isPublished) {
      post = { ...live, slug };
      renderPost(post);
    }

    const rows = await getMany(COLLECTIONS.BLOG, {
      where: [["isPublished", "==", true]],
      orderBy: ["createdAt", "desc"],
      limit: 6,
      ttl: 10 * 60 * 1000
    });
    if (rows.length) renderMore(rows.map((r) => ({ ...r, slug: r.slug || r.id })), post ? post.slug : slug);
  } catch { /* offline */ }

  if (!post) notFound();
});
