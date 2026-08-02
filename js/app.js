/* ==========================================================================
   Soft Skill Zone — Global bootstrap
   --------------------------------------------------------------------------
   Loaded on EVERY public page:

     <script type="module" src="js/app.js"></script>

   It: applies the theme, injects navbar/footer, wires global UI behaviour,
   starts scroll animations, and reflects the signed-in state in the navbar.
   Page-specific logic lives in js/pages/*.js and imports what it needs.
   ========================================================================== */

import { onReady, $$ } from "./core/dom.js";
import { initTheme } from "./core/theme.js";
import { initPress } from "./core/press.js";
import { loadIncludes, fixLinks } from "./core/include.js";
import { observeReveal, observeCounters } from "./core/utils.js";
import { initNavbar, renderAuthState } from "./components/navbar.js";
import { initFooter } from "./components/footer.js";
import { SEO, INSTITUTE } from "./config/site-data.js";
/* Install ka listener — jaldi lagna zaroori hai, warna browser ka
   beforeinstallprompt aakar chala jata hai aur button kabhi nahi dikhta. */
import "./core/install.js";

/* ==========================================================================
   Progressive enhancement flag (css/animations.css uses .no-js)
   ========================================================================== */
document.documentElement.classList.remove("no-js");

/* ==========================================================================
   Theme first — before paint, so there is no white flash in dark mode
   ========================================================================== */
initTheme();
initPress();

/* ==========================================================================
   External links get safe rel attributes automatically
   ========================================================================== */
function hardenExternalLinks(scope = document) {
  $$('a[target="_blank"]', scope).forEach((a) => {
    const rel = (a.getAttribute("rel") || "").split(/\s+/).filter(Boolean);
    if (!rel.includes("noopener")) rel.push("noopener");
    if (!rel.includes("noreferrer")) rel.push("noreferrer");
    a.setAttribute("rel", rel.join(" "));
  });
}

/* ==========================================================================
   Minimal SEO fallbacks for pages that did not set their own tags
   ========================================================================== */
function ensureMeta() {
  const head = document.head;
  const ensure = (selector, create) => {
    if (head.querySelector(selector)) return;
    head.appendChild(create());
  };

  ensure('meta[name="description"]', () => {
    const m = document.createElement("meta");
    m.name = "description";
    m.content = SEO.defaultDescription;
    return m;
  });

  ensure('meta[property="og:site_name"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:site_name");
    m.content = SEO.siteName;
    return m;
  });

  if (!document.title) document.title = SEO.defaultTitle;
}

/* ==========================================================================
   Auth state in the navbar — imported lazily so pages that never touch
   Firebase (e.g. the offline tools) do not pay for the SDK.
   ========================================================================== */
async function wireAuthState() {
  try {
    const { onUserChanged } = await import("../firebase/auth-service.js");
    onUserChanged((user) => renderAuthState(user));
  } catch (err) {
    console.warn("[app] auth state skip:", err.message);
  }
}

/* ==========================================================================
   Live institute settings (phone, WhatsApp, Razorpay link) from Firestore.
   Falls back silently to the values in js/config/site-data.js.
   ========================================================================== */
async function wireLiveSettings() {
  try {
    const { getOne } = await import("../firebase/db-service.js");
    const { COLLECTIONS } = await import("./core/constants.js");
    const settings = await getOne(COLLECTIONS.SETTINGS, "institute", { ttl: 15 * 60 * 1000 });
    if (settings) initFooter(settings);
  } catch {
    /* offline / not configured — static values already painted */
  }
}

/* ==========================================================================
   Support chatbot — sabse aakhir me, alag chunk me. Page ka pehla paint isse
   rukta nahi, aur jinke paas dheema net hai unhe pehle content milta hai.
   ========================================================================== */
async function wireChatbot() {
  try {
    const { initChat } = await import("./chat/chatbot.js");
    await initChat();
  } catch (err) {
    console.warn("[app] chatbot skip:", err.message);
  }
}

/* ==========================================================================
   Boot
   ========================================================================== */
onReady(async () => {
  ensureMeta();

  await loadIncludes();       // navbar + footer into the DOM
  fixLinks(document);         // also resolve data-href links in page markup
  initNavbar();
  initFooter();               // static contact values, instantly visible
  hardenExternalLinks();

  observeReveal();
  observeCounters();

  // Non-blocking upgrades
  wireAuthState();
  wireLiveSettings();
  wireChatbot();

  document.dispatchEvent(new CustomEvent("ssz:ready"));
});

/* Re-scan after any page module injects new markup. */
document.addEventListener("ssz:content-rendered", (e) => {
  const scope = e.detail?.scope || document;
  observeReveal(scope);
  observeCounters(scope);
  hardenExternalLinks(scope);
});

export { INSTITUTE };
