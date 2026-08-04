/* ==========================================================================
   Soft Skill Zone — Navbar behaviour
   Scroll state, mobile drawer, search shortcut, auth-aware action button.
   Initialised by js/app.js after the navbar partial is injected.
   ========================================================================== */

import { $, $$, on, lockScroll, el } from "../core/dom.js";
import { throttle, initials } from "../core/utils.js";
import { url, go } from "../core/routes.js";
import { ROLES } from "../core/constants.js";

let drawerOpen = false;

/* ---------------- Scroll state ---------------- */
function initScrollState() {
  const nav = $("#sszNavbar");
  if (!nav) return;

  const apply = () => nav.classList.toggle("is-scrolled", window.scrollY > 12);
  apply();
  window.addEventListener("scroll", throttle(apply, 100), { passive: true });
}

/* ---------------- Mobile drawer ---------------- */
function openDrawer() {
  const drawer = $("#sszDrawer");
  const backdrop = $(".ssz-backdrop");
  if (!drawer) return;

  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  drawer.removeAttribute("inert");
  if (backdrop) { backdrop.hidden = false; requestAnimationFrame(() => backdrop.classList.add("is-open")); }
  $$("[data-drawer-open]").forEach((b) => b.setAttribute("aria-expanded", "true"));
  lockScroll(true);
  drawerOpen = true;
  drawer.querySelector("a, button")?.focus();
}

function closeDrawer() {
  const drawer = $("#sszDrawer");
  const backdrop = $(".ssz-backdrop");
  if (!drawer) return;

  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  drawer.setAttribute("inert", "");
  if (backdrop) {
    backdrop.classList.remove("is-open");
    setTimeout(() => { backdrop.hidden = true; }, 260);
  }
  $$("[data-drawer-open]").forEach((b) => b.setAttribute("aria-expanded", "false"));
  lockScroll(false);
  drawerOpen = false;
}

function initDrawer() {
  on(document, "click", "[data-drawer-open]", (e) => { e.preventDefault(); openDrawer(); });
  on(document, "click", "[data-drawer-close]", (e) => { e.preventDefault(); closeDrawer(); });
  on(document, "click", ".ssz-drawer__link", () => closeDrawer());

  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawerOpen) closeDrawer(); });
  window.addEventListener("resize", throttle(() => { if (window.innerWidth >= 1100 && drawerOpen) closeDrawer(); }, 200));
}

/* ---------------- Search ---------------- */
function initSearch() {
  on(document, "click", "[data-search-open]", (e) => { e.preventDefault(); go("search"); });

  // Ctrl/Cmd + K anywhere on the site
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      go("search");
    }
  });
}

/* ---------------- Back to top ---------------- */
function initScrollTop() {
  const btn = $("[data-scroll-top]");
  if (!btn) return;

  const apply = () => btn.classList.toggle("is-visible", window.scrollY > 500);
  apply();
  window.addEventListener("scroll", throttle(apply, 150), { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* --------------------------------------------------------------------------
   Form bharte waqt floating button hat jaate hain

   Ye teen gol button (chatbot, WhatsApp, upar jao) neeche-daayein chipke
   rehte hain. Phone par input poori chaudai ka hota hai, isliye ye seedhe
   khaane ke upar aa baithte the — admission form par "Full Name" ke upar
   chat ka button. Student ko lagta hai kuchh toota hua hai, aur galti se
   tap ho jaye to chat khul jaati hai jabki wo naam likh raha tha.

   Ilaaj: jab tak kisi khaane me kuchh likha ja raha hai, ye halke ho kar
   hat jaate hain. Likhna khatam, wapas aa jaate hain. Padhne wale ko farak
   nahi padta — sirf likhne wale ko rasta mil jaata hai.
   -------------------------------------------------------------------------- */
function initFabDodge() {
  const stack = document.querySelector(".fab-stack");
  if (!stack) return;

  const isField = (n) => n && /^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName);

  document.addEventListener("focusin", (e) => {
    if (isField(e.target)) stack.classList.add("is-dodging");
  });
  document.addEventListener("focusout", () => {
    /* Ek pal ruk kar dekhte hain — ek khaane se doosre par jaate waqt
       beech me focus body par chala jaata hai, aur button jhilmila jaate. */
    setTimeout(() => {
      if (!isField(document.activeElement)) stack.classList.remove("is-dodging");
    }, 120);
  });
}

/* ==========================================================================
   Auth-aware button
   Guest  -> "Login"
   Signed -> avatar chip linking to the right dashboard
   ========================================================================== */
export function renderAuthState(user) {
  const guestBtn = $("[data-auth-guest]");
  if (!guestBtn) return;

  const existing = $("[data-auth-user]");
  if (existing) existing.remove();

  if (!user) {
    guestBtn.style.removeProperty("display");
    return;
  }

  guestBtn.style.setProperty("display", "none", "important");

  const home = user.role === ROLES.ADMIN ? "adminHome" : "studentHome";
  const chip = el("a", {
    class: "user-chip",
    href: url(home),
    "data-auth-user": "true",
    title: `${user.name} — Dashboard kholein`
  });

  const avatar = user.photoURL
    ? el("img", { class: "avatar avatar-sm", src: user.photoURL, alt: user.name, loading: "lazy", decoding: "async" })
    : el("span", { class: "avatar avatar-sm avatar-fallback", style: { fontSize: ".72rem" } }, initials(user.name));

  const meta = el("span", { class: "user-chip__meta" },
    el("span", { class: "user-chip__name" }, (user.name || "").split(" ")[0]),
    el("span", { class: "user-chip__role" }, user.role === ROLES.ADMIN ? "Admin" : "Student")
  );

  chip.append(avatar, meta);
  guestBtn.parentElement.insertBefore(chip, guestBtn);

  // Mirror into the mobile drawer
  const drawerLogin = $('.ssz-drawer__link[href$="student/login.html"]');
  if (drawerLogin) {
    drawerLogin.textContent = "My Dashboard";
    drawerLogin.setAttribute("href", url(home));
  }
}

/* ---------------- Init ---------------- */
export function initNavbar() {
  initScrollState();
  initDrawer();
  initSearch();
  initScrollTop();
  initFabDodge();
}

export { openDrawer, closeDrawer };
