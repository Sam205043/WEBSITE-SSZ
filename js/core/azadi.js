/* ==========================================================================
   Soft Skill Zone — Azadi offer
   --------------------------------------------------------------------------
   DO ALAG KHIDKIYAN, EK HI JAGAH

   Pehle yahan ek hi khidki thi: 15 se 31 August. Usme daam aur tiranga
   dono bandhe the — yaani tiranga hataane ka matlab hota daam bhi hataana.
   Ye galat jodi thi.

   Tiranga ek DIN ki cheez hai — 15 August. Poore mahine lehraata rahe to
   wo saja nahi, wallpaper ban jaata hai. Offer alag baat hai: use poora
   mahina chalna chahiye, warna promotion ka time hi nahi milta.

   Isliye ab do khidkiyan hain:

     TIRANGA  15 Aug 00:00 se 16 Aug 00:00 tak — sirf dikhawa: rang,
              jhanda, navbar ki patti, banner ki teen-rangi lakeerein.

     OFFER    15 Aug 00:00 se 1 Sep 00:00 tak  — daam Rs 1,947, neeche wali
              patti, kaata hua daam, "80 seats", countdown.

   16 August ko site apne aap purane indigo roop me aa jaati hai, par offer
   waise ka waisa chalta rehta hai — bas apne asli rangon me. 1 September ko
   wo bhi apne aap band. Dono me se kisi din kuch karna nahi padta.

   TAREEKH KA HISAAB IST ME

   Browser ki ghadi user ke phone ki timezone par chalti hai. Dubai me baithe
   student ke liye aadhi raat Ara ki aadhi raat nahi hoti. Isliye saari
   tareekhein +05:30 ke saath likhi hain — sab kuch theek us pal badlega jab
   Ara me 12 bajenge.
   ========================================================================== */

import { asset, url } from "./routes.js";

/* ---------------- Offer ki poori jaankari ---------------- */
export const AZADI = Object.freeze({
  /* Tiranga — sirf 15 August ka din */
  themeStartsAt: new Date("2026-08-15T00:00:00+05:30").getTime(),
  themeEndsAt:   new Date("2026-08-16T00:00:00+05:30").getTime(),

  /* Offer — 15 se 31 August (1 Sep ki raat 12 baje band) */
  offerStartsAt: new Date("2026-08-15T00:00:00+05:30").getTime(),
  offerEndsAt:   new Date("2026-09-01T00:00:00+05:30").getTime(),

  courseId:   "ai-automation-pro",
  courseName: "AI Automation Pro",

  priceOnline:  1947,
  priceOffline: 3947,
  mrpOnline:    5000,
  mrpOffline:   7500,

  totalSeats: 80,

  /* Seat wali line tabhi dikhti hai jab itni seat bhar chuki hon.
     Launch ke din "0 / 80 bhar gayin" likha aata tha — jo bechne ke bajaye
     ulta nuksaan karta hai: naye aane wale ko lagta hai koi juda hi nahi.
     Khaali ginti chhupa dena jhooth nahi hai; jhooth tab hota jab hum koi
     banaya hua number likh dete. 5 par pahunchte hi line khud aa jayegi,
     aur tab wahi ginti bhee ka kaam karegi. */
  seatBarMin: 5,

  /* 80th Independence Day: 1947 pehla, isliye 2026 me 80th. */
  edition: "80th Independence Day"
});

/**
 * Kya OFFER abhi chal raha hai?
 *
 * Naam jaan-boojh kar wahi rakha hai jo pehle tha, kyunki site-data.js,
 * course-card.js aur course-detail.js — teenon DAAM ke liye ise poochhte
 * hain, aur daam offer se bandha hai, tirange se nahi.
 */
export function azadiOn(now = Date.now()) {
  return now >= AZADI.offerStartsAt && now < AZADI.offerEndsAt;
}

/** Kya TIRANGA (sirf dikhawa) abhi chalu hai? */
export function tirangaOn(now = Date.now()) {
  return now >= AZADI.themeStartsAt && now < AZADI.themeEndsAt;
}

/** Offer khatam hone me kitna time bacha (ms). Chalu na ho to 0. */
export function azadiLeft(now = Date.now()) {
  return azadiOn(now) ? AZADI.offerEndsAt - now : 0;
}

/* ==========================================================================
   Seat ki ginti
   --------------------------------------------------------------------------
   Ye Firestore ke `settings/azadi` document se aati hai — field ka naam
   `seatsTaken` (number). Admin console se badal dena kaafi hai.

   Admissions ki collection se seedha ginti NAHI karte: wo collection public
   nahi hai (aur honi bhi nahi chahiye — usme students ke phone, pata aur
   documents hain). `settings` pehle se sabke liye padhne yogya hai, isliye
   ginti wahin se aati hai.

   Document na ho to seat wali line chhup jaati hai — galat ginti dikhane se
   behtar hai kuch na dikhana.
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
function buildBanner(tiranga) {
  const off = Math.round((1 - AZADI.priceOnline / AZADI.mrpOnline) * 100);

  const sec = document.createElement("section");
  sec.className = "az-banner";
  sec.id = "azadiBanner";
  sec.innerHTML = `
    <div class="ssz-container">
      <div class="az-banner__grid${tiranga ? "" : " az-banner__grid--noflag"}">

        ${tiranga ? '<div class="az-banner__flagwrap" data-az-flag></div>' : ""}

        <div>
          <span class="az-banner__badge">${
            tiranga ? `${AZADI.edition} &middot; 15&ndash;31 August`
                    : "Azadi Offer &middot; 31 August tak"
          }</span>
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

  if (tiranga) sec.querySelector("[data-az-flag]").appendChild(flagNode());
  return sec;
}

/* ==========================================================================
   Har page ka neeche wala dock
   ========================================================================== */
const DOCK_DISMISS_KEY = "ssz.azadi.dock.off";

function dockDismissed() {
  try { return sessionStorage.getItem(DOCK_DISMISS_KEY) === "1"; } catch { return false; }
}

function buildDock(tiranga) {
  const bar = document.createElement("div");
  bar.className = "az-dock";
  bar.id = "azadiDock";
  bar.innerHTML = `
    <span class="az-dock__txt">
      <b>Azadi Offer &middot; ${AZADI.courseName} ${money(AZADI.priceOnline)}</b>
      <small>${tiranga ? AZADI.edition + " &middot; " : ""}sirf ${AZADI.totalSeats} seats &middot; 31 August tak</small>
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
  if (taken < AZADI.seatBarMin) return;        // itni kam ginti dikhane se fayda nahi

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
 * app.js har page par ise bulata hai.
 *
 * Offer band ho to ye kuch nahi karta — na CSS, na markup, na Firestore ka
 * ek bhi read. Offer chalu par tiranga khatam ho chuka ho to sab kuch dikhta
 * hai, bas site ke apne indigo rangon me: <html data-azadi="offer">.
 */
export function initAzadi() {
  if (!azadiOn()) return false;

  const tiranga = tirangaOn();

  document.documentElement.setAttribute("data-azadi", tiranga ? "on" : "offer");
  addCss();

  /* Dock har page par */
  if (!dockDismissed() && !document.getElementById("azadiDock")) {
    document.body.appendChild(buildDock(tiranga));
    document.documentElement.setAttribute("data-azadi-dock", "on");
  }

  /* Banner sirf homepage par, hero ke theek neeche */
  const hero = document.querySelector("main#main > .hero");
  if (hero && !document.getElementById("azadiBanner")) {
    const banner = buildBanner(tiranga);
    hero.insertAdjacentElement("afterend", banner);

    startCountdown(banner.querySelector("#azCount"));
    paintSeats();

    /* Naya markup aaya hai — reveal/counter dobara chalne chahiye */
    document.dispatchEvent(new CustomEvent("ssz:content-rendered", { detail: { scope: banner } }));
  }

  return true;
}
