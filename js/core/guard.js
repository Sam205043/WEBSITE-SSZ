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

function redirect(routeKey, withNext = true) {
  const target = withNext
    ? url(routeKey, { next: currentPath() })
    : url(routeKey);
  location.replace(target);
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
  hidePageLoader();
  return user;
}

/** Require role === "student". Admins are sent to their own dashboard. */
export async function requireStudent() {
  showPageLoader("Session check ho raha hai…");
  const user = await ready();

  if (!user) { redirect("studentLogin"); return new Promise(() => {}); }
  if (user.role === ROLES.ADMIN) { location.replace(url("adminHome")); return new Promise(() => {}); }

  hidePageLoader();
  return user;
}

/** Require role === "admin". */
export async function requireAdmin() {
  showPageLoader("Admin access verify ho raha hai…");
  const user = await ready();

  if (!user) { redirect("adminLogin"); return new Promise(() => {}); }
  if (user.role !== ROLES.ADMIN) { location.replace(url("studentHome")); return new Promise(() => {}); }

  hidePageLoader();
  return user;
}

/** Require admin OR faculty. */
export async function requireStaff() {
  showPageLoader("Access verify ho raha hai…");
  const user = await ready();

  if (!user) { redirect("adminLogin"); return new Promise(() => {}); }
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

  const next = new URLSearchParams(location.search).get("next");
  if (next && next.startsWith("/")) { location.replace(next); return user; }

  location.replace(user.role === ROLES.ADMIN ? url("adminHome") : url("studentHome"));
  return user;
}

/** Send the user to wherever they belong after a successful login. */
export function goHomeFor(user) {
  const next = new URLSearchParams(location.search).get("next");
  if (next && next.startsWith("/")) return location.replace(next);
  location.replace(user.role === ROLES.ADMIN ? url("adminHome") : url("studentHome"));
}

export { getCurrentUser, root };
