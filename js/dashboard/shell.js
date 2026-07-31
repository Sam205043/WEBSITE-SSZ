/* ==========================================================================
   Soft Skill Zone — Student Dashboard shell
   --------------------------------------------------------------------------
   Every student page calls:

     const ctx = await initShell({ active: "fees", title: "Meri Fees" });

   It renders the sidebar + topbar, guards the route, and returns:
     { user, mode }   mode: "live" (Firebase, real data) | "preview"

   PREVIEW MODE — when Firebase keys are not pasted yet the dashboard renders
   with clearly-labelled sample data instead of redirecting to a login that
   cannot work. A banner explains it on every page. As soon as the keys are
   configured, the same pages guard properly and load real data.
   ========================================================================== */

import { $, $$, el, on, onReady, render, lockScroll } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { initTheme } from "../core/theme.js";
import { initials, store, timeAgo } from "../core/utils.js";
import { url } from "../core/routes.js";
import { LS_KEYS } from "../core/constants.js";
import { DEMO_USER } from "./demo-data.js";
import toast from "../core/toast.js";

/* ---------------- Sidebar map ---------------- */
const NAV = [
  { group: "Dashboard" },
  { key: "home",        label: "Overview",       icon: "home",       route: "studentHome" },
  { key: "classes",     label: "Live Classes",   icon: "video",      route: "studentClasses" },
  { key: "attendance",  label: "Attendance",     icon: "userCheck",  route: "studentAttendance" },
  { group: "Padhai" },
  { key: "assignments", label: "Assignments",    icon: "clipboard",  route: "studentAssignments" },
  { key: "notes",       label: "Notes",          icon: "book",       route: "studentNotes" },
  { key: "certificates",label: "Certificates",   icon: "award",      route: "studentCerts" },
  { group: "Account" },
  { key: "fees",        label: "Fees",           icon: "wallet",     route: "studentFees" },
  { key: "notifications", label: "Notifications",icon: "bell",       route: "studentNotify" },
  { key: "profile",     label: "Profile",        icon: "user",       route: "studentProfile" }
];

let shellState = { user: null, mode: "preview" };

/* ==========================================================================
   Sidebar
   ========================================================================== */
function buildSidebar(active) {
  const side = $("#dashSide");

  const nav = el("nav", { class: "dash-side__nav", "aria-label": "Dashboard navigation" });
  NAV.forEach((item) => {
    if (item.group) {
      nav.appendChild(el("p", { class: "dash-side__group" }, item.group));
      return;
    }
    /* Sidebar collapse hone par sirf icon bachta hai, isliye naam hover par
       dikhna chahiye. title = browser ka apna tooltip (thoda der se aata
       hai), data-tip = hamara turant dikhne wala tooltip (CSS me). */
    const link = el("a", {
      class: `dash-link${item.key === active ? " is-active" : ""}`,
      href: url(item.route),
      title: item.label,
      "data-tip": item.label,
      "aria-current": item.key === active ? "page" : null
    },
      el("span", { class: "dash-link__icon", html: icon(item.icon, { size: 20 }) }),
      el("span", { class: "dash-link__text" }, item.label)
    );
    if (item.key === "notifications") {
      link.appendChild(el("span", { class: "dash-link__badge", id: "navNotifyBadge", hidden: true }));
    }
    nav.appendChild(link);
  });

  render(side,
    el("div", { class: "dash-side__head" },
      el("a", { class: "ssz-brand", href: url("home") },
        el("span", { class: "ssz-brand__mark", "aria-hidden": "true" }, "SSZ"),
        el("span", { class: "ssz-brand__text" },
          el("span", { class: "ssz-brand__name" }, "Soft Skill Zone"),
          el("span", { class: "ssz-brand__tag" }, "Student Portal")
        )
      )
    ),
    nav,
    el("div", { class: "dash-side__foot" },
      el("button", {
        class: "btn-ssz btn-ghost-ssz btn-block-ssz btn-sm-ssz", type: "button",
        id: "btnLogout", title: "Logout", "data-tip": "Logout"
      },
        el("span", { html: icon("logout", { size: 17 }) }),
        el("span", { class: "dash-side__foot-text" }, "Logout")
      )
    )
  );
}

/* ==========================================================================
   Topbar
   ========================================================================== */
function buildTopbar(user, title) {
  render($("#dashTop"),
    el("button", { class: "icon-btn", type: "button", id: "btnSidebar", "aria-label": "Menu kholein", html: icon("menu", { size: 19 }) }),
    el("h1", { class: "dash-top__title" }, title),
    el("div", { class: "dash-top__actions" },
      el("button", {
        class: "icon-btn", type: "button", "data-theme-toggle": "true",
        "aria-label": "Theme badlein",
        html: `<span data-icon-moon>${icon("moon", { size: 18 })}</span><span data-icon-sun style="display:none">${icon("sun", { size: 18 })}</span>`
      }),
      el("a", { class: "icon-btn bell", href: url("studentNotify"), "aria-label": "Notifications", html: icon("bell", { size: 18 }) },
        el("span", { class: "bell__count", id: "bellCount", hidden: true })
      ),
      el("a", { class: "user-chip", href: url("studentProfile") },
        user.photoURL
          ? el("img", { class: "avatar avatar-sm", src: user.photoURL, alt: user.name, loading: "lazy", decoding: "async" })
          : el("span", { class: "avatar avatar-sm avatar-fallback", style: { fontSize: ".7rem" } }, initials(user.name)),
        el("span", { class: "user-chip__meta" },
          el("span", { class: "user-chip__name" }, (user.name || "").split(" ")[0]),
          el("span", { class: "user-chip__role" }, user.studentId || "Student")
        )
      )
    )
  );
}

/* ==========================================================================
   Preview banner
   ========================================================================== */
function previewBanner() {
  const body = $("#dashBody");
  body.insertAdjacentElement("afterbegin",
    el("div", {
      class: "auth-alert auth-alert--info is-visible",
      style: { marginBottom: "1.5rem" },
      role: "status"
    },
      el("span", { html: icon("info", { size: 18 }) }),
      el("span", {},
        el("strong", {}, "Preview mode: "),
        "yeh sample data hai, sirf design dikhane ke liye. Firebase keys lagte hi yahan aapka asli data aayega ",
        el("span", { style: { opacity: ".8" } }, "(guide: docs/FIREBASE-SETUP.md)"), "."
      )
    )
  );
}

/* ==========================================================================
   Behaviour
   ========================================================================== */
function wireShell() {
  const dash = $("#dash");
  const side = $("#dashSide");

  // Mobile: sidebar becomes a drawer; desktop: collapse toggle
  let backdrop = $(".dash-backdrop");
  if (!backdrop) {
    backdrop = el("div", { class: "ssz-backdrop dash-backdrop", hidden: true });
    document.body.appendChild(backdrop);
  }

  const isMobile = () => window.innerWidth < 992;

  const openSide = () => {
    side.classList.add("is-open");
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add("is-open"));
    lockScroll(true);
  };
  const closeSide = () => {
    side.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    setTimeout(() => { backdrop.hidden = true; }, 260);
    lockScroll(false);
  };

  $("#btnSidebar").addEventListener("click", () => {
    if (isMobile()) {
      side.classList.contains("is-open") ? closeSide() : openSide();
    } else {
      const collapsed = dash.classList.toggle("is-collapsed");
      store.set(LS_KEYS.SIDEBAR, collapsed ? "collapsed" : "open");
    }
  });
  backdrop.addEventListener("click", closeSide);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSide(); });
  on(side, "click", ".dash-link", () => { if (isMobile()) closeSide(); });

  if (store.get(LS_KEYS.SIDEBAR) === "collapsed") dash.classList.add("is-collapsed");

  // Logout
  $("#btnLogout").addEventListener("click", async () => {
    if (shellState.mode === "preview") {
      location.href = url("studentLogin");
      return;
    }
    try {
      const { logout } = await import("../../firebase/auth-service.js");
      await logout();
      toast.success("Logout ho gaya.");
      setTimeout(() => location.replace(url("studentLogin")), 400);
    } catch {
      location.replace(url("studentLogin"));
    }
  });
}

/** Unread notification count on the bell + sidebar badge. */
export function setNotifyCount(n) {
  [["#bellCount", n], ["#navNotifyBadge", n]].forEach(([sel, count]) => {
    const node = $(sel);
    if (!node) return;
    node.hidden = !count;
    node.textContent = count > 99 ? "99+" : String(count);
  });
}

/* ==========================================================================
   Entry point
   ========================================================================== */
export function initShell({ active, title }) {
  return new Promise((resolve) => {
    onReady(async () => {
      initTheme();

      let mode = "live";
      try {
        const cfg = await import("../../firebase/firebase-config.js");
        if (!cfg.isFirebaseConfigured) mode = "preview";
      } catch { mode = "preview"; }

      let user;
      if (mode === "live") {
        try {
          const { requireStudent } = await import("../core/guard.js");
          user = await requireStudent();   // redirects (and never resolves) if not allowed
        } catch (err) {
          // SDK unreachable (offline / blocked) — degrade to preview rather than a blank page
          console.warn("[shell] live guard failed, preview fallback:", err);
          mode = "preview";
        }
      }
      if (mode === "preview") user = { ...DEMO_USER };

      document.title = `${title} | Soft Skill Zone Student`;
      buildSidebar(active);
      buildTopbar(user, title);
      wireShell();
      if (mode === "preview") previewBanner();

      shellState = { user, mode };

      /* Sahayak — sirf live mode me. Preview me asli data hi nahi hai, to
         "meri fees" ka jawab jhootha hota. */
      if (mode === "live") {
        import("../chat/chatbot.js")
          .then(({ initChat }) => initChat({ user }))
          .catch((err) => console.warn("[shell] chatbot skip:", err.message));
      }

      resolve(shellState);
    });
  });
}

export { NAV };
