/* ==========================================================================
   Soft Skill Zone — HTML partial loader
   --------------------------------------------------------------------------
   Lets every page share one navbar / footer without a build step.

     <div data-include="navbar"></div>
     <div data-include="footer"></div>

   Partials live in /components/*.html. Links inside a partial are written
   root-relative and rewritten for the current page depth by fixLinks().
   Result: correct links on GitHub Pages sub-paths AND at a custom domain root.
   ========================================================================== */

import { asset, root, currentPage } from "./routes.js";

const memory = new Map();

async function fetchPartial(name) {
  if (memory.has(name)) return memory.get(name);

  const res = await fetch(asset(`components/${name}.html`), { cache: "no-cache" });
  if (!res.ok) throw new Error(`Partial "${name}" load nahi hua (${res.status})`);
  const html = await res.text();
  memory.set(name, html);
  return html;
}

/**
 * Rewrite root-relative hrefs/srcs inside a freshly injected partial.
 * Attribute form used in partials: data-href="pages/about.html"
 */
function fixLinks(scope) {
  const prefix = root();

  scope.querySelectorAll("[data-href]").forEach((node) => {
    node.setAttribute("href", prefix + node.dataset.href);
  });
  scope.querySelectorAll("[data-src]").forEach((node) => {
    node.setAttribute("src", prefix + node.dataset.src);
  });

  // Mark the active nav item
  const page = currentPage();
  scope.querySelectorAll("[data-href]").forEach((node) => {
    const target = node.dataset.href.split("?")[0].split("/").pop();
    if (target === page) {
      node.classList.add("is-active");
      node.setAttribute("aria-current", "page");
    }
  });
}

/**
 * Load every <element data-include="name"> on the page.
 * @returns {Promise<void>} resolves after all partials are in the DOM
 */
export async function loadIncludes(scope = document) {
  const slots = Array.from(scope.querySelectorAll("[data-include]"));
  if (!slots.length) return;

  await Promise.all(slots.map(async (slot) => {
    const name = slot.dataset.include;
    try {
      slot.innerHTML = await fetchPartial(name);
      fixLinks(slot);
      slot.dataset.included = "true";
    } catch (err) {
      console.error("[include]", err);
      slot.innerHTML = "";
    }
  }));

  document.dispatchEvent(new CustomEvent("ssz:includes-loaded", { detail: { count: slots.length } }));
}

/** Inject a single partial into a target element. */
export async function include(name, target) {
  const node = typeof target === "string" ? document.querySelector(target) : target;
  if (!node) return null;
  node.innerHTML = await fetchPartial(name);
  fixLinks(node);
  return node;
}

/** Rewrite data-href/data-src links inside markup rendered by JS. */
export { fixLinks };
