/* ==========================================================================
   Soft Skill Zone — Route guards
   --------------------------------------------------------------------------
   Put at the top of any protected page:

     import { requireStudent } from "../../js/core/guard.js";
     const user = await requireStudent();   // redirects if not allowed

   Guards wait for Firebase to restore the session first, so a page refresh
   never bounces a logged-in user to the login screen.
   ========================================================================== */

import { ready, getCurrentUser } from "../../firebase/auth-service.js";
import { ROLES } from "./constants.js";
import { url, root } from "./routes.js";
import { showPageLoader, hidePageLoader } from "./loader.js";

/** Where to send the user back to after logging in. */
function currentPath() {
  return location.pathname + location.search;
}

/**
 * `?next=` par bharosa nahi kiya ja sakta — wo URL me likha hota hai aur
 * URL kisi ko bhi bheja ja sakta hai.
 *
 * PEHLE SIRF `startsWith("/")` DEKHA JAATA THA, AUR WO KAAFI NAHI HAI.
 * `//kisi-ki-site.com` bhi `/` se hi shuru hota hai, par browser use
 * "protocol-relative" maanta hai — yaani wo poora doosri website ka pata
 * hai. Matlab softskillzone.in ka ek asli-dikhne wala link student ko
 * kisi nakli login page par pahuncha sakta tha, jahan wo apna password
 * daal deta. `/\evil.com` bhi kuchh browser me yahi karta hai.
 *
 * Isliye ab shart hai: ek hi `/` se shuru ho, aur uske turant baad na
 * doosra `/` ho na `\`.
 */
function safeNext(value) {
  const v = String(value || "");
  return /^\/[^/\\]/.test(v) ? v : "";
}

function redirect(routeKey, withNext = true) {
  const target = withNext
    ? url(routeKey, { next: currentPath() })
    : url(routeKey);
  location.replace(target);
}

/**
 * Profile aa hi nahi payi — page rok kar saaf baat kehte hain.
 *
 * Kisi dashboard par bhejna yahan sabse bura kaam hoga: role pata hi nahi
 * hai, to bhejenge kahan? Aur galat jagah bhej diya to user ko lagega ki
 * uska panel gayab ho gaya. Isliye ek saada sandesh aur "Dobara koshish"
 * ka button — asli wajah lagbhag hamesha do second ka kharab net hota hai.
 */
function stopWithProfileError() {
  hidePageLoader();
  document.body.innerHTML = `
    <div style="min-height:100dvh;display:grid;place-items:center;padding:1.5rem;text-align:center">
      <div style="max-width:26rem">
        <h1 style="font-size:1.15rem;margin:0 0 .6rem">Aapki jaankari nahi aa payi</h1>
        <p style="font-size:.9rem;color:var(--text-muted);margin:0 0 1.2rem">
          Internet ek pal ke liye kat gaya lagta hai. Aapka login surakshit hai —
          bas ye page dobara kholna hai.
        </p>
        <button type="button" class="btn-ssz btn-primary-ssz" id="sszRetry">Dobara koshish karein</button>
      </div>
    </div>`;
  document.getElementById("sszRetry")?.addEventListener("click", () => location.reload());
  return new Promise(() => {});
}

/**
 * Require any signed-in user.
 * @param {{loginRoute?:string}} [opts]
 * @returns {Promise<object>} the user (never resolves if it redirects)
 */
export async function requireAuth(opts = {}) {
  showPageLoader("Session check ho raha hai…");
  const user = await ready();
  if (!user) {
    redirect(opts.loginRoute || "studentLogin");
    return new Promise(() => {});
  }
  if (user.profileFailed) return stopWithProfileError();
  hidePageLoader();
  return user;
}

/** Require role === "student". Admins are sent to their own dashboard. */
export async function requireStudent() {
  showPageLoader("Session check ho raha hai…");
  const user = await ready();

  if (!user) { redirect("studentLogin"); return new Promise(() => {}); }
  if (user.profileFailed) return stopWithProfileError();
  if (user.role === ROLES.ADMIN) { location.replace(url("adminHome")); return new Promise(() => {}); }

  hidePageLoader();
  return user;
}

/** Require role === "admin". */
export async function requireAdmin() {
  showPageLoader("Admin access verify ho raha hai…");
  const user = await ready();

  if (!user) { redirect("adminLogin"); return new Promise(() => {}); }
  if (user.profileFailed) return stopWithProfileError();
  if (user.role !== ROLES.ADMIN) { location.replace(url("studentHome")); return new Promise(() => {}); }

  hidePageLoader();
  return user;
}

/** Require admin OR faculty. */
export async function requireStaff() {
  showPageLoader("Access verify ho raha hai…");
  const user = await ready();

  if (!user) { redirect("adminLogin"); return new Promise(() => {}); }
  if (user.profileFailed) return stopWithProfileError();
  if (![ROLES.ADMIN, ROLES.FACULTY].includes(user.role)) {
    location.replace(url("studentHome"));
    return new Promise(() => {});
  }

  hidePageLoader();
  return user;
}

/**
 * For login/signup pages: if already signed in, jump straight to the right
 * dashboard (or the ?next= page the user was originally heading to).
 */
export async function redirectIfAuthed() {
  const user = await ready();
  if (!user) return null;
  /* Profile hi nahi aayi to kahin bhejna galat hoga — login page par hi
     rehne dete hain, wahan se user dobara koshish kar sakta hai. */
  if (user.profileFailed) return null;

  const next = safeNext(new URLSearchParams(location.search).get("next"));
  if (next) { location.replace(next); return user; }

  location.replace(user.role === ROLES.ADMIN ? url("adminHome") : url("studentHome"));
  return user;
}

/** Send the user to wherever they belong after a successful login. */
export function goHomeFor(user) {
  if (user?.profileFailed) return stopWithProfileError();
  const next = safeNext(new URLSearchParams(location.search).get("next"));
  if (next) return location.replace(next);
  location.replace(user.role === ROLES.ADMIN ? url("adminHome") : url("studentHome"));
}

export { getCurrentUser, root };
