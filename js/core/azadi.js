/* ==========================================================================
   Soft Skill Zone — Azadi offer (15 Aug se 31 Aug)
   --------------------------------------------------------------------------
   Ek hi jagah se poora offer chalta hai: tareekh, daam, seat aur dikhawa.

   KYUN AISE

   Sabse aasaan raasta hota ki har page ka HTML badal kar tiranga banner
   chipka dete, aur 1 September ko sab wapas hataate. Wahi galti aksar hoti
   hai — ek page hataana bhool jaate ho aur September me bhi "Azadi Offer"
   chamakta rehta hai, ya us din subah 6 baje uthkar site badalni padti hai.

   Isliye yahan sirf DO tareekhein hain. Unke beech ho to sab kuch apne aap
   on, unke bahar sab kuch apne aap off — CSS bhi tabhi download hoti hai.
   1 September ko koi kaam nahi karna padega.

   TAREEKH KA HISAAB IST ME

   Browser ki apni ghadi user ke phone ki timezone par chalti hai. Agar
   koi student Dubai me baitha ho to uske liye offer aadhi raat se pehle
   ya baad me shuru hota — Ara ki aadhi raat se nahi. Isliye dono tareekhein
   +05:30 ke saath likhi hain: offer poori duniya me theek us pal chalu
   hoga jab Ara me 15 August ki raat 12 bajegi.
   ========================================================================== */

import { asset, url } from "./routes.js";

/* ---------------- Offer ki poori jaankari ---------------- */
export const AZADI = Object.freeze({
  /* 15 Aug 2026, raat 12:00 IST se */
  startsAt: new Date("2026-08-15T00:00:00+05:30").getTime(),
  /* 1 Sep 2026 raat 12:00 IST par band — yaani 31 Aug ki poori raat tak */
  endsAt:   new Date("2026-09-01T00:00:00+05:30").getTime(),

  courseId:   "ai-automation-pro",
  courseName: "AI Automation Pro",

  priceOnline:  1947,
  priceOffline: 3947,
  mrpOnline:    5000,
  mrpOffline:   7500,

  totalSeats: 80,

  /* 80th Independence Day: 1947 pehla, isliye 2026 me 80th. */
  edition: "80th Independence Day"
});

/* --------------------------------------------------------------------------
   Kya offer abhi chal raha hai?
   Har jagah yahi ek function poochha jaata hai — course card, course page
   aur banner sab. Isliye teeno kabhi aapas me alag nahi ho sakte.
   -------------------------------------------------------------------------- */
export function azadiOn(now = Date.now()) {
  return now >= AZADI.startsAt && now < AZADI.endsAt;
}

/** Offer khatam hone me kitna time bacha (ms). Chalu na ho to 0. */
export function azadiLeft(now = Date.now()) {
  return azadiOn(now) ? AZADI.endsAt - now : 0;
}

/* ==========================================================================
   Seat ki ginti
   --------------------------------------------------------------------------
   Ye Firestore ke `settings/azadi` document se aati hai — field ka naam
   `seatsTaken` (number). Admin console se badal dena kaafi hai.

   Admissions ki collection se seedha ginti NAHI karte: wo collection
   public nahi hai (aur honi bhi nahi chahiye — usme students ke phone,
   pata aur documents hain). `settings` pehle se sabke liye padhne yogya
   hai, isliye ginti wahin se aati hai.

   Document na ho to seat wali line chhup jaati hai — galat ginti dikhane
   se behtar hai kuch na dikhana.
   -------------------------------------------------------------------------- */
async function seatsTaken() {
  try {
    const { getOne } = await import("../../firebase/db-service.js");
    const { COLLECTIONS } = await import("./constants.js");
    const doc = await getOne(COLLECTIONS.SETTINGS, "azadi", { ttl: 5 * 60 * 1000 });
    const n = Number(doc?.seatsTaken);
    return Number.isFinite(n) && n >= 0 ? Math.min(n, AZADI.totalSeats) : null;
  } catch {
    return null;                       // offline ya Firebase band — chup rehna
  }
}

/* ==========================================================================
   Chhote banane wale
   ========================================================================== */
const money = (n) => "₹" + Number(n).toLocaleString("en-IN");

function chakraSvg() {
  const spokes = Array.from({ length: 24 }, (_, i) =>
    `<line x1="50" y1="50" x2="50" y2="8" stroke="#000080" stroke-width="1.6"
       transform="rotate(${i * 15} 50 50)"/>`).join("");
  return `<svg class="az-flag__chakra" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="42" fill="none" stroke="#000080" stroke-width="5"/>
      ${spokes}<circle cx="50" cy="50" r="7" fill="#000080"/></svg>`;
}

function flagNode() {
  const f = document.createElement("div");
  f.className = "az-flag";
  f.setAttribute("role", "img");
  f.setAttribute("aria-label", "Bharat ka rashtriya dhwaj");
  f.innerHTML = chakraSvg();
  return f;
}

/** ms -> {d,h,m,s} */
function breakUp(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60
  };
}

/* ==========================================================================
   Homepage ka banner
   ========================================================================== */
function buildBanner() {
  const off = Math.round((1 - AZADI.priceOnline / AZADI.mrpOnline) * 100);

  const sec = document.createElement("section");
  sec.className = "az-banner";
  sec.id = "azadiBanner";
  sec.innerHTML = `
    <div class="ssz-container">
      <div class="az-banner__grid">

        <div class="az-banner__flagwrap" data-az-flag></div>

        <div>
          <span class="az-banner__badge">${AZADI.edition} &middot; 15&ndash;31 August</span>
          <h2 class="az-banner__title">
            Desh aazad hua tha. Ab apne kaam ko bhi <span class="text-gradient">aazad karein</span>.
          </h2>
          <p class="az-banner__sub">
            Naya course &mdash; <b>${AZADI.courseName}</b>. Bina coding ke apne business ka
            kaam automatic banana seekhein: WhatsApp par jawab, lead, bill aur daily report &mdash;
            sab khud-b-khud. AI sikhna ab sabka haq hai, isliye Azadi ke mahine me daam bhi wahi.
          </p>

          <div class="az-price">
            <span class="az-price__was">${money(AZADI.mrpOnline)}</span>
            <span class="az-price__now">${money(AZADI.priceOnline)}</span>
            <span class="az-price__off">${off}% OFF</span>
            <span class="az-price__mode">
              Online batch &middot; Classroom (Ara) ${money(AZADI.priceOffline)}
              <s>${money(AZADI.mrpOffline)}</s>
            </span>
          </div>

          <div class="az-meta">
            <span class="az-chip">3 mahine &middot; <b>36 classes</b></span>
            <span class="az-chip">100% no-code</span>
            <span class="az-chip">5 real business projects</span>
            <span class="az-chip az-chip--hot">Sirf ${AZADI.totalSeats} seats</span>
          </div>

          <div class="az-banner__cta">
            <a class="btn-ssz btn-primary-ssz btn-lg-ssz"
               href="${url("admission", { course: AZADI.courseId })}">Abhi Seat Book Karein</a>
            <a class="btn-ssz btn-secondary-ssz btn-lg-ssz"
               href="${url("courseDetail", { id: AZADI.courseId })}">Poora Syllabus Dekhein</a>
          </div>
        </div>

        <div>
          <div class="az-count" id="azCount" aria-label="Offer khatam hone me bacha samay"></div>
          <div class="az-seats" id="azSeats" hidden>
            <div class="az-seats__bar"><span class="az-seats__fill" id="azSeatFill"></span></div>
            <p class="az-seats__txt" id="azSeatTxt"></p>
          </div>
        </div>

      </div>
    </div>`;

  sec.querySelector("[data-az-flag]").appendChild(flagNode());
  return sec;
}

/* ==========================================================================
   Har page ka neeche wala dock
   ========================================================================== */
const DOCK_DISMISS_KEY = "ssz.azadi.dock.off";

function dockDismissed() {
  try { return sessionStorage.getItem(DOCK_DISMISS_KEY) === "1"; } catch { return false; }
}

function buildDock() {
  const bar = document.createElement("div");
  bar.className = "az-dock";
  bar.id = "azadiDock";
  bar.innerHTML = `
    <span class="az-dock__txt">
      <b>Azadi Offer &middot; ${AZADI.courseName} ${money(AZADI.priceOnline)}</b>
      <small>${AZADI.edition} &middot; sirf ${AZADI.totalSeats} seats &middot; 31 August tak</small>
    </span>
    <a class="az-dock__btn" href="${url("courseDetail", { id: AZADI.courseId })}">Dekhein</a>
    <button class="az-dock__x" type="button" aria-label="Ye patti band karein">&times;</button>`;

  bar.querySelector(".az-dock__x").addEventListener("click", () => {
    bar.remove();
    document.documentElement.removeAttribute("data-azadi-dock");
    try { sessionStorage.setItem(DOCK_DISMISS_KEY, "1"); } catch { /* private mode */ }
  });

  return bar;
}

/* ==========================================================================
   Countdown — har second, par sirf tab jab tab saamne ho
   ========================================================================== */
function startCountdown(box) {
  const LABEL = { d: "Din", h: "Ghante", m: "Minute", s: "Second" };
  let timer = null;

  const paint = () => {
    const left = azadiLeft();
    if (left <= 0) { stop(); box.remove(); return; }
    const t = breakUp(left);
    box.innerHTML = Object.keys(LABEL).map((k) =>
      `<span class="az-count__cell">
         <span class="az-count__n">${String(t[k]).padStart(2, "0")}</span>
         <span class="az-count__l">${LABEL[k]}</span>
       </span>`).join("");
  };

  const start = () => { if (!timer) { paint(); timer = setInterval(paint, 1000); } };
  const stop  = () => { clearInterval(timer); timer = null; };

  /* Tab peeche chala jaye to ghadi rok dete hain. Phone par ye chhota sa
     interval bhi battery kha jaata hai, aur jo dikh hi nahi raha use har
     second dobara likhne ka koi matlab nahi. */
  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
  });

  start();
}

/* ==========================================================================
   Seat bar bharna
   ========================================================================== */
async function paintSeats() {
  const wrap = document.getElementById("azSeats");
  if (!wrap) return;

  const taken = await seatsTaken();
  if (taken === null) return;                  // ginti pata nahi — chhupa hi rehne do

  const left = Math.max(0, AZADI.totalSeats - taken);
  const pct  = Math.min(100, Math.round((taken / AZADI.totalSeats) * 100));

  document.getElementById("azSeatFill").style.width = `${pct}%`;
  document.getElementById("azSeatTxt").textContent =
    left > 0
      ? `${taken} / ${AZADI.totalSeats} seats bhar gayin — sirf ${left} baaki`
      : "Saari seats bhar gayin — waiting list ke liye WhatsApp karein";
  wrap.hidden = false;
}

/* ==========================================================================
   Chalu karo
   ========================================================================== */
let cssAdded = false;
function addCss() {
  if (cssAdded || document.getElementById("azadiCss")) return;
  const link = document.createElement("link");
  link.id = "azadiCss";
  link.rel = "stylesheet";
  link.href = asset("css/azadi.css");
  document.head.appendChild(link);
  cssAdded = true;
}

/**
 * app.js har page par ise bulata hai. Offer band ho to ye kuch nahi karta —
 * na CSS, na markup, na Firestore ka ek bhi read.
 */
export function initAzadi() {
  if (!azadiOn()) return false;

  document.documentElement.setAttribute("data-azadi", "on");
  addCss();

  /* Dock har page par */
  if (!dockDismissed() && !document.getElementById("azadiDock")) {
    document.body.appendChild(buildDock());
    document.documentElement.setAttribute("data-azadi-dock", "on");
  }

  /* Banner sirf homepage par, hero ke theek neeche */
  const hero = document.querySelector("main#main > .hero");
  if (hero && !document.getElementById("azadiBanner")) {
    const banner = buildBanner();
    hero.insertAdjacentElement("afterend", banner);

    startCountdown(banner.querySelector("#azCount"));
    paintSeats();

    /* Naya markup aaya hai — reveal/counter dobara chalne chahiye */
    document.dispatchEvent(new CustomEvent("ssz:content-rendered", { detail: { scope: banner } }));
  }

  return true;
}
