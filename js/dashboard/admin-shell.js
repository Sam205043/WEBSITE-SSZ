/* ==========================================================================
   Soft Skill Zone — Admin Dashboard shell
   --------------------------------------------------------------------------
   const ctx = await initAdminShell({ active: "admissions", title: "Admissions" });
   -> { user, mode }   mode: "live" | "preview"

   Live mode guards with requireAdmin() and starts a realtime listener on
   pending admissions — the sidebar badge + a toast fire the moment a new
   application lands (the instant-notification behaviour chosen in Phase 1).
   ========================================================================== */

import { $, el, on, onReady, render, lockScroll } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { initTheme } from "../core/theme.js";
import { initPress } from "../core/press.js";
import { initials, store } from "../core/utils.js";
import { url } from "../core/routes.js";
import { LS_KEYS, COLLECTIONS, FEE_STATUS } from "../core/constants.js";
import { DEMO_ADMIN, DEMO_ADMISSIONS } from "./admin-demo.js";
import toast from "../core/toast.js";

const NAV = [
  { group: "Manage" },
  { key: "home",       label: "Overview",   icon: "home",      route: "adminHome" },
  { key: "admissions", label: "Admissions", icon: "userPlus",  route: "adminAdmissions", badge: true },
  { key: "students",   label: "Students",   icon: "users",     route: "adminStudents" },
  { key: "batches",    label: "Batches",    icon: "calendar",  route: "adminBatches" },
  { group: "Operations" },
  { key: "fees",       label: "Fees",       icon: "wallet",    route: "adminFees", badge: true },
  { key: "attendance", label: "Attendance", icon: "userCheck", route: "adminAttendance" },
  { key: "classes",    label: "Live Classes", icon: "video",   route: "adminClasses" },
  { key: "materials",  label: "Materials",  icon: "book",      route: "adminNotes" },
  { group: "Records" },
  { key: "certificates", label: "Certificates", icon: "award", route: "adminCerts" },
  { key: "notify",     label: "Notifications", icon: "bell",   route: "adminNotify" },
  { key: "enquiries",  label: "Enquiries",  icon: "mail",      route: "adminEnquiries", badge: true },
  { key: "gallery",    label: "Gallery",    icon: "image",     route: "adminGallery" }
];

let shellState = { user: null, mode: "preview" };
let stopWatch = null;
let stopFeeWatch = null;
let stopEnquiryWatch = null;

function buildSidebar(active) {
  const nav = el("nav", { class: "dash-side__nav", "aria-label": "Admin navigation" });
  NAV.forEach((item) => {
    if (item.group) { nav.appendChild(el("p", { class: "dash-side__group" }, item.group)); return; }
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
    if (item.badge) link.appendChild(el("span", { class: "dash-link__badge", id: `badge-${item.key}`, hidden: true }));
    nav.appendChild(link);
  });

  render($("#dashSide"),
    el("div", { class: "dash-side__head" },
      el("a", { class: "ssz-brand", href: url("home") },
        /* Pehle yahan narangi gradient tha jo admin panel ko alag dikhata tha.
           Ab asli logo lagta hai — inline background use dhak deta, isliye hataya.
           Admin ki pehchaan ke liye saath me "ADMIN PANEL" likha hi hai. */
        el("span", { class: "ssz-brand__mark", "aria-hidden": "true" }, "SSZ"),
        el("span", { class: "ssz-brand__text" },
          el("span", { class: "ssz-brand__name" }, "Soft Skill Zone"),
          el("span", { class: "ssz-brand__tag" }, "Admin Panel")
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

function buildTopbar(user, title) {
  render($("#dashTop"),
    el("button", { class: "icon-btn", type: "button", id: "btnSidebar", "aria-label": "Menu", html: icon("menu", { size: 19 }) }),
    el("h1", { class: "dash-top__title" }, title),
    el("div", { class: "dash-top__actions" },
      el("a", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz ssz-hide-mobile", href: url("home"), target: "_blank", rel: "noopener" },
        "Website dekhein", el("span", { html: icon("externalLink", { size: 15 }) })),
      el("button", {
        class: "icon-btn", type: "button", "data-theme-toggle": "true", "aria-label": "Theme",
        html: `<span data-icon-moon>${icon("moon", { size: 18 })}</span><span data-icon-sun style="display:none">${icon("sun", { size: 18 })}</span>`
      }),
      el("span", { class: "user-chip", style: { cursor: "default" } },
        el("span", { class: "avatar avatar-sm avatar-fallback", style: { fontSize: ".7rem", background: "var(--grad-warm)" } }, initials(user.name)),
        el("span", { class: "user-chip__meta" },
          el("span", { class: "user-chip__name" }, (user.name || "").split(" ")[0]),
          el("span", { class: "user-chip__role" }, "Admin")
        )
      )
    )
  );
}

function previewBanner() {
  $("#dashBody").insertAdjacentElement("afterbegin",
    el("div", { class: "auth-alert auth-alert--info is-visible", style: { marginBottom: "1.5rem" }, role: "status" },
      el("span", { html: icon("info", { size: 18 }) }),
      el("span", {},
        el("strong", {}, "Preview mode: "),
        "sample data hai. Firebase keys + admin account banne ke baad yahan asli applications aayengi ",
        el("span", { style: { opacity: ".8" } }, "(guide: docs/FIREBASE-SETUP.md, step 6)"), "."
      )
    )
  );
}

function wireShell() {
  const dash = $("#dash");
  const side = $("#dashSide");
  let backdrop = el("div", { class: "ssz-backdrop", hidden: true });
  document.body.appendChild(backdrop);

  const isMobile = () => window.innerWidth < 992;
  const closeSide = () => {
    side.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    setTimeout(() => { backdrop.hidden = true; }, 260);
    lockScroll(false);
  };

  $("#btnSidebar").addEventListener("click", () => {
    if (isMobile()) {
      if (side.classList.contains("is-open")) return closeSide();
      side.classList.add("is-open");
      backdrop.hidden = false;
      requestAnimationFrame(() => backdrop.classList.add("is-open"));
      lockScroll(true);
    } else {
      const collapsed = dash.classList.toggle("is-collapsed");
      store.set(LS_KEYS.SIDEBAR + ".admin", collapsed ? "collapsed" : "open");
    }
  });
  backdrop.addEventListener("click", closeSide);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSide(); });
  on(side, "click", ".dash-link", () => { if (isMobile()) closeSide(); });
  if (store.get(LS_KEYS.SIDEBAR + ".admin") === "collapsed") dash.classList.add("is-collapsed");

  $("#btnLogout").addEventListener("click", async () => {
    if (shellState.mode === "preview") { location.href = url("adminLogin"); return; }
    try {
      const { logout } = await import("../../firebase/auth-service.js");
      await logout();
      location.replace(url("adminLogin"));
    } catch { location.replace(url("adminLogin")); }
  });
}

/** Laal counter kisi bhi sidebar link par — key = NAV ka key. */
export function setNavBadge(key, n) {
  const node = $(`#badge-${key}`);
  if (!node) return;
  node.hidden = !n;
  node.textContent = n > 99 ? "99+" : String(n);
}

export function setAdmissionBadge(n) { setNavBadge("admissions", n); }

/**
 * Realtime pending-admissions listener. cb(rows) fires on every change.
 * Also drives the sidebar badge and a "nayi application" toast.
 */
export async function watchPendingAdmissions(cb) {
  if (shellState.mode === "preview") {
    const rows = DEMO_ADMISSIONS.filter((a) => a.status === "pending");
    setAdmissionBadge(rows.filter((a) => !a.isRead).length);
    cb && cb(rows);
    return () => {};
  }

  const { watchMany } = await import("../../firebase/db-service.js");
  let first = true;
  let known = new Set();

  stopWatch = watchMany(
    COLLECTIONS.ADMISSIONS,
    { where: [["status", "==", "pending"]], orderBy: ["createdAt", "desc"], limit: 50 },
    (rows) => {
      setAdmissionBadge(rows.filter((a) => !a.isRead).length);
      if (!first) {
        rows.forEach((r) => {
          if (!known.has(r.id)) {
            toast.info(`${r.fullName} — ${r.courseName}`, { title: "Nayi admission application!" });
          }
        });
      }
      known = new Set(rows.map((r) => r.id));
      first = false;
      cb && cb(rows);
    }
  );
  return stopWatch;
}

/**
 * Realtime listener on payments jinhe student ne bhej diya hai par confirm
 * hona baaki hai. Sidebar ke "Fees" par laal counter chadhta hai aur nayi
 * payment aate hi toast bajta hai — chahe admin kisi bhi page par ho.
 * cb(rows) har badlaav par chalta hai.
 */
export async function watchPendingFees(cb) {
  if (shellState.mode === "preview") {
    const { DEMO_FEE_ROWS } = await import("./admin-demo.js");
    const rows = DEMO_FEE_ROWS.filter((f) => f.status === FEE_STATUS.PENDING);
    setNavBadge("fees", rows.length);
    cb && cb(rows);
    return () => {};
  }

  const { watchMany } = await import("../../firebase/db-service.js");
  let first = true;
  let known = new Set();

  stopFeeWatch = watchMany(
    COLLECTIONS.FEES,
    { where: [["status", "==", FEE_STATUS.PENDING]], limit: 50 },
    (rows) => {
      setNavBadge("fees", rows.length);
      if (!first) {
        rows.forEach((r) => {
          if (known.has(r.id)) return;
          const amt = Number(r.claimedAmount) || 0;
          toast.info(
            `${r.studentName || r.studentId}${amt ? ` — ₹${amt.toLocaleString("en-IN")}` : ""}`,
            { title: "Nayi payment aayi hai!" }
          );
        });
      }
      known = new Set(rows.map((r) => r.id));
      first = false;
      cb && cb(rows);
    }
  );
  return stopFeeWatch;
}

/**
 * Nayi enquiry par bhi wahi soochna jo admission par milti hai.
 *
 * Pehle Enquiries par koi badge nahi tha — enquiry chupchaap aakar padi
 * rehti thi aur admin ko tabhi pata chalta jab wo khud wo page kholta. Jo
 * aadmi poochh kar chala gaya wo doosre institute chala jaata hai, isliye
 * ye sabse mehnga chup rehna tha.
 */
export async function watchNewEnquiries(cb) {
  if (shellState.mode === "preview") {
    setNavBadge("enquiries", 0);
    cb && cb([]);
    return () => {};
  }

  const { watchMany } = await import("../../firebase/db-service.js");
  let first = true;
  let known = new Set();

  stopEnquiryWatch = watchMany(
    COLLECTIONS.ENQUIRIES,
    { where: [["isRead", "==", false]], limit: 50 },
    (rows) => {
      setNavBadge("enquiries", rows.length);
      if (!first) {
        rows.forEach((r) => {
          if (known.has(r.id)) return;
          toast.info(
            `${r.name || "Koi"}${r.mobile ? ` — ${r.mobile}` : ""}`,
            { title: "Nayi enquiry aayi hai!" }
          );
        });
      }
      known = new Set(rows.map((r) => r.id));
      first = false;
      cb && cb(rows);
    }
  );
  return stopEnquiryWatch;
}

export function initAdminShell({ active, title }) {
  return new Promise((resolve) => {
    onReady(async () => {
      initTheme();
      initPress();

      let mode = "live";
      try {
        const cfg = await import("../../firebase/firebase-config.js");
        if (!cfg.isFirebaseConfigured) mode = "preview";
      } catch { mode = "preview"; }

      let user;
      if (mode === "live") {
        try {
          const { requireAdmin } = await import("../core/guard.js");
          user = await requireAdmin();
        } catch (err) {
          console.warn("[admin-shell] live guard failed, preview fallback:", err);
          mode = "preview";
        }
      }
      if (mode === "preview") user = { ...DEMO_ADMIN };

      document.title = `${title} | SSZ Admin`;
      buildSidebar(active);
      buildTopbar(user, title);
      wireShell();
      if (mode === "preview") previewBanner();

      /* shellState pehle set hota hai: niche ke dono watcher ise padhkar tay
         karte hain ki demo data dikhana hai ya asli. Pehle ye assignment inke
         BAAD tha, isliye live mode me bhi badge demo data dikha raha tha. */
      shellState = { user, mode };

      // Badges are useful on every admin page
      watchPendingAdmissions(null);
      // admin-fees.js apna khud ka listener lagata hai, isliye wahan dobara nahi
      if (active !== "fees") watchPendingFees(null);
      /* Enquiries page par bhi chalta hai — "Padh liya" dabate hi badge apne
         aap ghat jaaye, iske liye wahan bhi listener zinda rehna chahiye. */
      watchNewEnquiries(null);

      resolve(shellState);
    });
  });
}
