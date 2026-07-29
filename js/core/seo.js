/* ==========================================================================
   Soft Skill Zone — Runtime SEO helpers
   --------------------------------------------------------------------------
   Detail pages (course-detail.html, blog-post.html) serve many different
   items from one HTML file, so their title, description, canonical URL and
   structured data have to be set once the item is known. Google renders JS
   before indexing, so injecting JSON-LD here is picked up normally.

   Nothing in this module touches the network or Firebase — it is pure DOM.
   ========================================================================== */

/** Absolute origin + directory of the current page, e.g.
 *  https://user.github.io/repo/pages/  — used to build canonical URLs. */
function pageBase() {
  return location.origin + location.pathname.replace(/[^/]*$/, "");
}

/** Absolute URL of the current page including its query string. */
export function currentUrl(keepQuery = true) {
  return location.origin + location.pathname + (keepQuery ? location.search : "");
}

/** Absolute URL for a path relative to the current page. */
export function absolute(relative) {
  try {
    return new URL(relative, pageBase()).href;
  } catch {
    return relative;
  }
}

function setMetaTag(selector, attr, name, content) {
  if (!content) return;
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/**
 * Update the page's title / description / canonical / social cards at once.
 * Every field is optional — pass only what the page knows.
 */
export function setPageMeta({ title, description, canonical, image, type = "article" } = {}) {
  if (title) {
    document.title = title;
    setMetaTag('meta[property="og:title"]', "property", "og:title", title);
    setMetaTag('meta[name="twitter:title"]', "name", "twitter:title", title);
  }

  if (description) {
    const clean = String(description).replace(/\s+/g, " ").trim().slice(0, 300);
    setMetaTag('meta[name="description"]', "name", "description", clean);
    setMetaTag('meta[property="og:description"]', "property", "og:description", clean);
  }

  if (canonical) {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical;
    setMetaTag('meta[property="og:url"]', "property", "og:url", canonical);
  }

  if (image) setMetaTag('meta[property="og:image"]', "property", "og:image", absolute(image));
  if (type) setMetaTag('meta[property="og:type"]', "property", "og:type", type);
}

/**
 * Append a JSON-LD block. `id` keeps repeat calls idempotent so a page that
 * re-renders (e.g. the user picks another course without a reload) replaces
 * its old graph instead of stacking duplicates.
 */
export function injectJsonLd(data, id = "ssz-jsonld") {
  if (!data) return;
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement("script");
    node.type = "application/ld+json";
    node.id = id;
    document.head.appendChild(node);
  }
  node.textContent = JSON.stringify(data, null, 2);
}

/**
 * BreadcrumbList from [{ name, url }] — url may be relative to this page.
 */
export function breadcrumbLd(items = []) {
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => {
      const entry = { "@type": "ListItem", position: i + 1, name: it.name };
      if (it.url) entry.item = absolute(it.url);
      return entry;
    })
  };
}
