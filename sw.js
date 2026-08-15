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
const VERSION = "ssz-v111";
const SHELL_CACHE = `${VERSION}-shell`;
const PAGE_CACHE = `${VERSION}-pages`;

/* Files worth having ready before the first offline visit.

   Saare free tools jaanbujh kar precache hote hain: yahi wo hissa hai jo bina
   internet ke sach me chalta hai (calculator, quiz, QR, resume builder,
   practice tools), aur offline.html student ko inhi ki taraf bhejta hai.
   Baaki sab pehli baar istemaal hone par cache hota hai. */
const TOOLS = [
  "gst-calculator", "gst-quiz", "hsn-search", "invoice-generator",
  "age-calculator", "percentage-calculator", "emi-calculator",
  "resume-builder", "typing-test", "qr-generator",
  "mega-quiz", "shortcut-trainer", "excel-practice", "interview-qa",
  "formula-explainer", "excel-errors", "excel-datasets", "mini-excel"
];

/* Practice tools ka data alag files me hai — inke bina tool khulega to sahi
   par khali rahega, isliye ye bhi precache me hain. Yahi galti purani
   office-tools site par thi: page live tha, data file gayab. */
const TOOL_DATA = [
  "js/config/question-bank.js",
  "js/config/shortcut-bank.js",
  "js/config/excel-bank.js",
  "js/config/interview-bank.js",
  "js/config/excel-function-bank.js",
  "js/config/excel-error-bank.js",
  "js/config/sample-datasets.js",
  /* Ye do kisi tool ke naam se mel nahi khaate, isliye alag se likhne
     padte hain: parser Formula Explainer ka dil hai, aur xlsx-writer ke
     bina Practice Data ki file ban hi nahi sakti. */
  "js/tools/formula-parser.js",
  "js/tools/xlsx-writer.js",
  "js/tools/formula-eval.js",
  "js/config/excel-lessons.js"
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
  ...TOOL_DATA,
  "css/tokens.css",
  "css/base.css",
  "css/layout.css",
  "css/components.css",
  "css/animations.css",
  "css/home.css",
  "css/pages.css",
  "css/tools.css",
  /* Tool pages ke form-field isi file se sajte hain — chhoot gayi thi to
     offline par tool bina roop ke khulta tha. */
  "css/admission.css",
  /* Sahayak bhi offline chalta hai — aam sawaalon ka jawab site-data se
     banta hai, net ki zaroorat nahi. Sirf AI wali tah ko internet chahiye.
     ai.js khud bhi yahan chahiye: chatbot.js use seedhe import karta hai,
     isliye wo na mile to poora chatbot hi load nahi hota. */
  "css/chat.css",
  /* Azadi ki CSS bhi shell me — offer ke dinon me offline khulne par site
     bina tirange ke aadhi-adhoori dikhti thi. 1 September ke baad ye file
     maangi hi nahi jaati, isliye padi rehne se koi nuksaan nahi. */
  "css/azadi.css",
  "js/chat/chatbot.js",
  "js/chat/knowledge.js",
  "js/chat/ai.js",
  "components/navbar.html",
  "components/footer.html",
  "js/app.js",
  /* app.js in dono ko seedhe import karta hai — chhootne par app.js hi nahi
     chalta, aur offline page par navbar-footer dono gayab ho jaate hain. */
  "js/components/navbar.js",
  "js/components/footer.js",
  "js/core/dom.js",
  "js/core/utils.js",
  "js/core/theme.js",
  /* Button press ki lehar — app.js isse seedhe import karta hai, isliye
     chhootne par offline par app.js hi nahi chalta. */
  "js/core/press.js",
  "js/core/icons.js",
  "js/core/routes.js",
  "js/core/constants.js",
  /* Bhasha ka intezaam. Dictionary yahan nahi rakhi — wo sirf tabhi
     download hoti hai jab kisi ne Hindi ya English chuni ho, aur phir
     stale-while-revalidate use apne aap cache kar leta hai. */
  "js/core/i18n.js",
  "js/core/install.js",
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
