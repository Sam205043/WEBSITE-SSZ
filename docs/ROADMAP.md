# Build Roadmap — Soft Skill Zone ERP

Each phase is delivered only after the previous one is approved.
Nothing is stubbed: every file shipped in a phase is complete and working.

| Phase | Scope | Status |
|---|---|---|
| **1** | Project architecture, folder structure, design-token CSS system, Firebase service layer, core JS utilities, shared HTML partials, security rules, docs | ✅ Complete |
| **2** | Premium landing page — hero, marquee strip, stat counters, filterable course grid, why-us, how-it-works, testimonials, tools teaser, CTA band | ✅ Complete |
| **3** | Public pages — About, Courses, Course detail, Faculty, Reviews, Gallery, Contact, FAQ, Blog, Blog post, Global search, Certificate verification, Privacy / Terms / Refund | ✅ Complete |
| **4** | Online Admission system — multi-step wizard, draft autosave, photo/document upload to Storage, atomic application numbers, WhatsApp fallback | ✅ Complete |
| **5** | Authentication — Student login/signup, Admin login (role-checked), forgot password, auth layout | ✅ Complete |
| **6** | Student Dashboard — shell + 9 pages (overview, live classes, attendance, assignments, notes, fees, certificates, notifications, profile) with preview mode | ✅ Complete |
| **7** | Admin Dashboard part A — overview analytics, realtime admissions inbox with approve/reject + Student ID minting, student manager + CSV export, batch CRUD | ✅ Complete |
| **8** | Admin Dashboard part B — fee collection + receipts + verification + Excel export, attendance register, live class scheduler, assignments/notes + grading, certificate issue, notification broadcast, enquiries inbox | ✅ Complete |
| **9** | Free Student Tools — all 10 built, offline, no login. Includes a from-scratch QR encoder (no CDN, no external API) | ✅ Complete |
| **10** | Polish & launch — SEO (sitemap + structured data), PWA (installable + offline), performance, accessibility, full-site QA, deployment guide | ✅ Complete |

## Phase 1 verification

- All JS modules pass `node --check`; every relative import resolves.
- All CSS files brace-balanced; `manifest.json` parses.
- Rendered headlessly at 1440x900, 820x1180 and 390x844 in light + dark: zero page errors.
- Three bugs found and fixed: navbar trapped under `<main>` by a `body > *` z-index rule;
  drawer backdrop stacked above the drawer; navbar overflowing on mobile when the
  Bootstrap CDN was slow (replaced with own `.ssz-hide-*` helpers).

## Phase 2 verification

- Landing page rendered at 1440 / 820 / 390 in light + dark — zero page errors, zero
  horizontal overflow, all 47 scroll-reveal elements reveal, category filter correct.
- Fixed: scroll-reveal could leave sections invisible on very fast scrolling —
  `observeReveal()` now pairs the IntersectionObserver with a throttled geometry sweep.

## Phase 3 verification

- All 16 public pages rendered headlessly: navbar/footer partials inject correctly at
  both depths (`pages/` and `pages/legal/`), zero page errors, zero horizontal overflow.
- Interactions exercised: course category filter + text search + 5 sort orders, syllabus
  accordion, FAQ accordion + search with highlighting + empty state, review course filter
  and rating summary, contact-form validation (required, mobile format) and its offline
  failure path, global search across courses/tools/FAQ/blog, certificate verification
  with a not-found code, unknown-course fallback on the detail page.
- Fixed: navbar unreadable over the coloured course-detail hero (`body[data-nav="solid"]`);
  paragraphs cramped in About and legal pages because of the global margin reset.

## Phase 4 verification

- Full wizard exercised headlessly end to end: empty-step blocking (4 field errors +
  gender flag), step progression, WhatsApp same-as-mobile copy, course preselect via
  `?course=`, photo selection with compression + preview, document list with size and
  remove button, 4-group review with edit-jumps, declaration gate, and the
  no-Firebase fallback screen with a prefilled WhatsApp message.
- Draft autosave verified: after a reload, text fields, gender, course and batch
  preference all restore, with a "Draft mila" toast.
- Fixed during this pass:
  1. File validation/compression lived inside storage-service.js, which imports the
     Firebase SDK — with the SDK unreachable the uploads step died. Moved to a
     Firebase-free `js/core/files.js` (storage-service re-exports it).
  2. The `hidden` attribute lost to component `display` rules (`.btn-ssz` etc.), so
     the Submit button showed on every step. Added a global `[hidden]` override.

## Phase 5 verification

- All four auth pages rendered headlessly (desktop + mobile, light + dark): zero page
  errors, split brand panel collapses correctly on mobile.
- Exercised: required-field validation, password visibility toggle, signup password
  strength meter (weak -> very strong), Student ID auto-uppercase, confirm-password
  mismatch flag, and the "Firebase keys pending" notice that disables submit with a
  clear explanation instead of a cryptic SDK error.
- Admin login additionally hard-checks the role after sign-in: a non-admin account is
  signed straight back out with a plain-language message.
- Fixed: page-level `data-href` links (used inside auth cards) were only rewritten
  inside injected partials — app.js now runs `fixLinks(document)` after includes load.

## Phase 6 verification

- All 9 dashboard pages rendered headlessly in preview mode: shell (sidebar 9 links,
  topbar user chip, active states) correct on every page, zero page errors.
- Interactions exercised: receipt modal with amount-in-words + print view, notification
  mark-read updating the bell badge live, unread filter, attendance month filter,
  assignment status filters, preview-upload guard toast, sidebar collapse persisting
  across reloads, mobile drawer open/close via backdrop tap.
- PREVIEW MODE: without Firebase keys the dashboard renders labelled sample data behind
  a visible banner instead of bouncing to a login that cannot work; with keys, the same
  pages guard via requireStudent() and load live Firestore data.
- Fixed: dashboard pages used `.search-result`/`.verify-row` styles that live in
  pages.css but didn't load it; user-chip name/ID rendered on one line.

## Phase 7 verification

- All 4 admin pages rendered headlessly in preview mode: zero page errors, admin shell
  (4 nav links + live admissions badge) correct everywhere.
- Exercised end to end: status filters with counts, application detail modal (photo,
  documents, fee breakdown), open-marks-read dropping the badge 2 -> 1, the approve
  confirm flow, reject-with-remarks prompt, student search/status filters, the edit
  modal with course-matched batch options, a real CSV download
  (ssz-students-2026-07-28.csv), and batch creation through the full form — the new
  batch card appeared with a generated batch ID.
- Approve flow (live mode): atomic counter per course-year mints SSZ2026TLY0012-style
  IDs, creates students/{id} with fee totals, marks the admission approved, and opens
  a prefilled WhatsApp message to inform the student.
- Realtime inbox: onSnapshot listener on pending admissions drives the sidebar badge
  and fires a toast for every new application — no refresh needed (the Phase 1
  decision, implemented).

## Phase 8 verification

- All 7 new admin pages rendered headlessly in preview mode: 11-item sidebar with
  Manage / Operations / Records groups, zero page errors across the whole suite.
- Exercised end to end: fee-collect dialog showing the student's live dues, receipt
  modal with amount-in-words + print view, payment-proof verify dialog, attendance
  register (batch load, per-student P/A/L/Lv toggle, "sabko present", save guard for
  unmarked students), live-class scheduler creating a class that appeared under
  Upcoming, materials tabs with submissions + inline grading, certificate issue with
  auto-filled course and the printable certificate, notification audience toggle and
  broadcast landing in the sent list, enquiries mark-read updating filter counts.
- Regression: the Phase 3 public-page suite and Phase 6 student-dashboard suite were
  re-run after the shell change — still zero page errors.

## Phase 9 verification

- Tools hub + all 10 tool pages render headlessly with zero page errors.
- Maths checked against hand calculations: GST inclusive 10,000 @ 18% -> base 8,474.58
  + CGST/SGST 762.71 each; EMI 2,00,000 @ 10.5% for 5 years -> Rs 4,299/month with
  Rs 57,927 interest; age 15-01-2000 to 29-07-2026 -> 26y 6m 14d / 9,692 days;
  invoice 2 x 40,000 + 18% -> 94,400 with the amount in words; 425/500 -> 85%,
  First Division; 18% of 2500 -> 450; 4,000 -> 5,000 -> 25% badhotari.
- Behaviour exercised: GST inclusive/exclusive and intra/inter switch, full 15-question
  quiz run to the result screen, HSN search by name and by code with highlighting,
  future-DOB validation, EMI slider/number two-way sync, invoice item add/remove and
  IGST switch, resume sample + draft persistence across reload, typing test live
  colouring and duration reset.
- QR encoder written from scratch (byte mode, versions 1-10, EC L/M/Q/H) and verified
  by decoding its own output with the independent `jsqr` decoder: 10/10 cases pass
  including UTF-8 (Rs symbol), multiline text, a 200-character payload, UPI and WiFi
  payloads. Two real bugs were found and fixed this way — the format-info bits were
  placed in reverse order, and the Reed-Solomon generator polynomial multiplied the
  wrong term (verified against the reference encoder's EC codewords).

## Decisions locked in Phase 1

- **Content language:** Hinglish mix — English headings, Hinglish descriptions.
- **Fee payments:** Razorpay Payment Links (per-student link stored in Firestore) +
  manual verification by admin. Fully serverless.
- **Admin admission alerts:** Firestore realtime listener → live badge + unread counter
  on the Admin Dashboard.
- **Firebase:** project to be created by the institute; keys pasted into
  `firebase/firebase-config.js`.

## Content you can edit without touching code

Everything below lives in `js/config/site-data.js`:

- `INSTITUTE` — phone, WhatsApp, email, address, social links, Razorpay link
- `COURSES` — all 10 courses: fees, duration, modules, eligibility, career options
- `FACULTY_SEED` — faculty names, roles, subjects (replace with your real team)
- `TESTIMONIALS` — landing/review seed quotes
- `BLOG_SEED` — starter articles
- `ABOUT` — story, mission, vision, values, milestones
- `FAQ_SEED`, `TOOLS`, `STATS`, `JOURNEY`, `FEATURES`

Once Firebase is connected and the admin dashboard is live (Phases 7–8), Firestore
content automatically overrides these defaults — faculty, reviews, FAQ, blog, gallery
and contact details all upgrade themselves without a code change.

## Phase 10 verification

**SEO**

- `sitemap.xml` generated from the route map: 41 URLs — every public page plus one
  entry per course (`?id=…`) and per article (`?slug=…`). Validated as XML.
- Absolute `canonical` + `og:url` + `og:image` on all 28 public pages; `robots.txt`
  disallows `/pages/admin/` and `/pages/student/`; those pages also carry
  `<meta name="robots" content="noindex">`.
- Structured data — 26 JSON-LD blocks, all parse as valid JSON:
  `EducationalOrganization` + `LocalBusiness` (address, opening hours, 10-course
  `OfferCatalog`) and `WebSite` + `SearchAction` on the home page; `BreadcrumbList`
  on all 25 inner public pages; `FAQPage` built from `FAQ_SEED`; `Course` (fees,
  duration, provider, `hasCourseInstance`) injected per course by `js/core/seo.js`;
  `BlogPosting` injected per article. Detail pages also rewrite title, description
  and canonical at runtime, so each course and article is indexable on its own.

**PWA**

- `sw.js`: shell stale-while-revalidate, navigations network-first → cache →
  `offline.html`, cross-origin cache-first. Firebase hosts are matched and skipped
  entirely, so fees, attendance and marks are never served from cache.
- `manifest.json` with real PNG icons (192, 512, maskable-512, apple-touch) and
  three shortcuts. Registration is added to public pages only — verified absent on
  every `pages/admin/*` and `pages/student/*` page.

**Accessibility** — axe-core (wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice)
across 37 representative pages in **both light and dark themes** (74 runs):

- Start: **203 violation nodes** across 10 rules. End: **0 violations, 0 page errors.**
- Fixed: colour contrast (new `--*-ink` tokens for text on tinted backgrounds,
  darker `--text-muted`, and a lifted dark-theme `--brand` with `--brand-solid`
  kept for fills that carry white text); heading order across the whole site
  (footer `h6`→`h2`, card titles re-levelled, `sr-only` section headings where a
  grid followed the page `h1` directly); the closed mobile drawer holding focusable
  links (`visibility: hidden` + `inert`); floating action buttons outside any
  landmark; unlabelled EMI sliders, invoice item fields and the hidden assignment
  file input; empty table action headers; `aria-label` on `role`-less rating spans;
  `role="tablist"` on a group of plain buttons; and consent links distinguished by
  colour alone.

**Performance**

- `content-visibility: auto` + `contain-intrinsic-size` on off-screen sections
  (hero excluded, print excluded). Verified the scroll-reveal system, in-page
  anchors and the admission wizard still behave: all 47 reveal targets reveal on a
  fast scroll to the bottom, `#courses` anchor lands correctly, only step 1 of the
  wizard is visible on load.
- `modulepreload` for the six core modules every page loads through `app.js`;
  `preconnect` to the Bootstrap CDN alongside the font one; `loading="lazy"` and
  `decoding="async"` on every image, including the JS-created ones.

**Docs & security**

- `firebase/firestore.rules` and `firebase/storage.rules` written out in full:
  role helpers, public create-only admission and enquiry paths, per-student row
  ownership, an admissions counter that can only be incremented by exactly one,
  and a default-deny catch-all.
- `README.md`, `docs/FIREBASE-SETUP.md` (8 steps incl. creating the admin account)
  and `docs/DEPLOYMENT.md` (GitHub Pages, PWA, SEO submission, custom domain,
  troubleshooting) written; `tools/set-site-url.mjs` added so the placeholder site
  URL can be replaced everywhere in one command.
