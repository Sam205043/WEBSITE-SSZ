/* ==========================================================================
   Soft Skill Zone — Route map + relative-path resolver
   --------------------------------------------------------------------------
   GitHub Pages serves this site from a sub-path (/<repo-name>/), so absolute
   links like "/pages/about.html" break. Every link in the project is built
   through `url()` which returns a path relative to the current page depth.
   ========================================================================== */

export const ROUTES = Object.freeze({
  home:         "index.html",
  about:        "pages/about.html",
  courses:      "pages/courses.html",
  courseDetail: "pages/course-detail.html",
  faculty:      "pages/faculty.html",
  reviews:      "pages/reviews.html",
  gallery:      "pages/gallery.html",
  contact:      "pages/contact.html",
  admission:    "pages/admission.html",
  blog:         "pages/blog.html",
  blogPost:     "pages/blog-post.html",
  faq:          "pages/faq.html",
  search:       "pages/search.html",
  tools:        "pages/tools.html",
  verify:       "pages/verify-certificate.html",
  privacy:      "pages/legal/privacy.html",
  terms:        "pages/legal/terms.html",
  refund:       "pages/legal/refund.html",

  studentLogin:      "pages/student/login.html",
  studentSignup:     "pages/student/signup.html",
  studentForgot:     "pages/student/forgot-password.html",
  studentHome:       "pages/student/dashboard.html",
  studentFees:       "pages/student/fees.html",
  studentClasses:    "pages/student/live-classes.html",
  studentAttendance: "pages/student/attendance.html",
  studentAssignments:"pages/student/assignments.html",
  studentNotes:      "pages/student/notes.html",
  studentCerts:      "pages/student/certificates.html",
  studentNotify:     "pages/student/notifications.html",
  studentProfile:    "pages/student/profile.html",

  adminLogin:       "pages/admin/login.html",
  adminHome:        "pages/admin/dashboard.html",
  adminAdmissions:  "pages/admin/admissions.html",
  adminStudents:    "pages/admin/students.html",
  adminBatches:     "pages/admin/batches.html",
  adminFees:        "pages/admin/fees.html",
  adminAttendance:  "pages/admin/attendance.html",
  adminClasses:     "pages/admin/live-classes.html",
  adminNotes:       "pages/admin/notes.html",
  adminCerts:       "pages/admin/certificates.html",
  adminNotify:      "pages/admin/notifications.html",
  adminEnquiries:   "pages/admin/enquiries.html",

  toolGst:        "pages/tools/gst-calculator.html",
  toolGstQuiz:    "pages/tools/gst-quiz.html",
  toolHsn:        "pages/tools/hsn-search.html",
  toolInvoice:    "pages/tools/invoice-generator.html",
  toolAge:        "pages/tools/age-calculator.html",
  toolPercentage: "pages/tools/percentage-calculator.html",
  toolEmi:        "pages/tools/emi-calculator.html",
  toolResume:     "pages/tools/resume-builder.html",
  toolTyping:     "pages/tools/typing-test.html",
  toolQr:         "pages/tools/qr-generator.html",
  toolMegaQuiz:   "pages/tools/mega-quiz.html",
  toolShortcuts:  "pages/tools/shortcut-trainer.html",
  toolExcel:      "pages/tools/excel-practice.html",
  toolInterview:  "pages/tools/interview-qa.html"
});

/**
 * How many folders deep is the current page relative to the site root?
 * Set once by app.js via <body data-depth="2"> or auto-detected.
 */
let depth = null;

function detectDepth() {
  const declared = document.body?.dataset?.depth;
  if (declared !== undefined) return Number(declared) || 0;

  // Auto-detect: count path segments after the repo root.
  // Works on GitHub Pages (/<repo>/pages/student/x.html) and at a domain root.
  const segs = location.pathname.split("/").filter(Boolean);
  const fileIdx = segs.findIndex((s) => s.endsWith(".html"));
  const parts = fileIdx === -1 ? segs : segs.slice(0, fileIdx);
  const pagesIdx = parts.indexOf("pages");
  return pagesIdx === -1 ? 0 : parts.length - pagesIdx;
}

export function getDepth() {
  if (depth === null) depth = detectDepth();
  return depth;
}

export function setDepth(n) { depth = Number(n) || 0; }

/** Site-root prefix for the current page, e.g. "" | "../" | "../../" */
export function root() { return "../".repeat(getDepth()); }

/**
 * Resolve a route key (or raw root-relative path) into a link usable from
 * the current page.
 *   url("about")                     -> "../pages/about.html"
 *   url("courseDetail", {id:"adca"}) -> "../pages/course-detail.html?id=adca"
 */
export function url(routeKeyOrPath, params) {
  const base = ROUTES[routeKeyOrPath] || routeKeyOrPath;
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return root() + base + qs;
}

/** Resolve an asset (image, partial, file) relative to the site root. */
export function asset(path) {
  return root() + String(path).replace(/^\/+/, "");
}

/** Navigate to a route. */
export function go(routeKeyOrPath, params) {
  location.href = url(routeKeyOrPath, params);
}

/** Read a query-string parameter from the current URL. */
export function param(name, fallback = null) {
  const v = new URLSearchParams(location.search).get(name);
  return v === null ? fallback : v;
}

/** Current page file name, e.g. "courses.html". */
export function currentPage() {
  const f = location.pathname.split("/").pop();
  return f && f.length ? f : "index.html";
}

/** Does the given route point at the page currently open? */
export function isCurrent(routeKeyOrPath) {
  const target = (ROUTES[routeKeyOrPath] || routeKeyOrPath || "").split("?")[0];
  return target.endsWith(currentPage());
}
