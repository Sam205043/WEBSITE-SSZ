/* ==========================================================================
   Soft Skill Zone — Service Worker
   --------------------------------------------------------------------------
   Goal: the site opens instantly on repeat visits and the offline-friendly
   parts (free tools, already-visited pages) keep working without internet —
   which matters a lot on patchy mobile data in Ara.

   Strategy
   - App shell (CSS/JS/icons): stale-while-revalidate — instant, self-updating.
   - Pages (navigations): network-first with a cache fallback, then offline.html.
   - Firebase / Firestore / Storage: never cached (always live data).
   ========================================================================== */

/* Bump this on every JS/CSS change. The activate handler deletes every cache
   whose name does not start with the current VERSION, so a bump is what
   actually pushes updated code to people who already visited the site. */
const VERSION = "ssz-v9";
const SHELL_CACHE = `${VERSION}-shell`;
const PAGE_CACHE = `${VERSION}-pages`;

/* Files worth having ready before the first offline visit.

   The 10 free tools are precached deliberately: they are the part of the site
   that genuinely works with no internet (calculators, quiz, QR encoder, resume
   builder), and offline.html points students at them. Everything else is
   cached the first time it is actually used. */
const TOOLS = [
  "gst-calculator", "gst-quiz", "hsn-search", "invoice-generator",
  "age-calculator", "percentage-calculator", "emi-calculator",
  "resume-builder", "typing-test", "qr-generator"
];

const PRECACHE = [
  "index.html",
  "offline.html",
  "manifest.json",
  "pages/tools.html",
  "js/pages/tools-hub.js",
  "js/tools/tool-data.js",
  "js/tools/qrcode.js",
  "js/core/toast.js",
  "js/core/modal.js",
  "js/core/loader.js",
  "js/core/validators.js",
  ...TOOLS.map((t) => `pages/tools/${t}.html`),
  ...TOOLS.map((t) => `js/tools/${t}.js`),
  "css/tokens.css",
  "css/base.css",
  "css/layout.css",
  "css/components.css",
  "css/animations.css",
  "css/home.css",
  "css/pages.css",
  "css/tools.css",
  "components/navbar.html",
  "components/footer.html",
  "js/app.js",
  "js/core/dom.js",
  "js/core/utils.js",
  "js/core/theme.js",
  "js/core/icons.js",
  "js/core/routes.js",
  "js/core/constants.js",
  "js/core/include.js",
  "js/config/site-data.js",
  "images/logo/favicon.svg",
  "images/logo/icon-192.png"
];

const isFirebase = (url) =>
  /(?:googleapis|gstatic|firebaseio|firebaseapp|firebasestorage)\.com/.test(url.hostname);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // addAll fails the whole install if one file 404s — add individually instead
    await Promise.all(PRECACHE.map((path) =>
      cache.add(new Request(path, { cache: "reload" })).catch(() => {})
    ));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (e) => {
  if (e.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /* Never cache Firebase traffic — students must always see live data. */
  if (isFirebase(url)) return;

  /* Page navigations: network first, fall back to cache, then offline page. */
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(PAGE_CACHE);
        cache.put(request, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return (await caches.match("offline.html")) ||
               new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  /* Same-origin assets: stale-while-revalidate. */
  if (url.origin === location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      const cached = await cache.match(request);
      const network = fetch(request).then((res) => {
        if (res && res.status === 200) cache.put(request, res.clone());
        return res;
      }).catch(() => null);
      return cached || (await network) || new Response("", { status: 504 });
    })());
    return;
  }

  /* Cross-origin (fonts, Bootstrap): cache-first, they are versioned URLs. */
  event.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const res = await fetch(request);
      if (res && (res.status === 200 || res.type === "opaque")) cache.put(request, res.clone());
      return res;
    } catch {
      return new Response("", { status: 504 });
    }
  })());
});
