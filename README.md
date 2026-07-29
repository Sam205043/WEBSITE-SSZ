# Soft Skill Zone Institute — Website & ERP

> **Learn Today. Lead Tomorrow.**
> Ara, Bihar ke computer & commerce institute ke liye poora website + student/admin
> management system. Sirf HTML, CSS aur JavaScript — koi server nahi, koi build nahi.

---

## Kya-kya hai isme

**Public website**
Landing page, About, 10 Courses (har ek ka detail page), Faculty, Student Reviews,
Gallery, Blog, FAQ, Contact, Search, Certificate Verification, aur 3 legal pages.

**Online Admission**
5-step wizard — personal details, contact & qualification, course & batch,
photo/document upload, review. Submit hote hi Firestore me save, Application
Number generate, aur admin dashboard par realtime alert.

**Student Dashboard**
Overview, Live Classes (Google Meet join), Attendance, Assignments (submit + marks),
Notes download, Fees (total/paid/pending/due date/receipts), Certificates,
Notifications, Profile.

**Admin Dashboard**
Admissions inbox (realtime), Students, Batches, Fee collection + receipt generate +
Excel export, Attendance marking, Live class scheduling, Notes & assignments upload,
Certificate issue, Notifications broadcast, Enquiries.

**10 Free Tools** (bina login, bina internet ke bhi chalte hain)
GST Calculator · GST Quiz · HSN Search · Invoice Generator · Age Calculator ·
Percentage Calculator · EMI Calculator · Resume Builder · Typing Test · QR Generator

---

## Shuru kaise karein

**Sirf dekhna hai:**
`index.html` par double-click. Dashboards **Preview Mode** me sample data dikhayenge.

**Theek se chalana hai (recommended):**

```bash
# koi bhi local server — ES modules ko http:// chahiye
python3 -m http.server 8080
# ab kholein: http://localhost:8080
```

**Live karna hai:** → [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
**Data connect karna hai:** → [`docs/FIREBASE-SETUP.md`](docs/FIREBASE-SETUP.md)

---

## Folder structure

```
.
├── index.html              Landing page
├── 404.html                Not-found page
├── offline.html            Internet na ho to
├── manifest.json           PWA manifest
├── sw.js                   Service worker
├── sitemap.xml             SEO sitemap
├── robots.txt
│
├── css/                    tokens · base · layout · components · animations
│                           home · pages · admission · auth · dashboard · tools
├── components/             navbar.html · footer.html  (har page me inject hote hain)
├── images/logo/            favicon, PWA icons, OG cover
│
├── js/
│   ├── app.js              har page ka entry point
│   ├── core/               dom · routes · utils · theme · icons · seo · files …
│   ├── config/site-data.js SAARA CONTENT YAHAN HAI
│   ├── components/         navbar · footer · course-card · modal · toast
│   ├── pages/              ek file per public page
│   ├── dashboard/          student-* aur admin-* screens
│   └── tools/              10 free tools ka logic
│
├── firebase/
│   ├── firebase-config.js  ← apni keys yahan paste karein
│   ├── firebase-init.js    SDK ek hi jagah import hota hai
│   ├── auth-service.js · db-service.js · storage-service.js
│   ├── firestore.rules     ← Firebase console me publish karein
│   └── storage.rules       ← Firebase console me publish karein
│
├── pages/                  public · student/ · admin/ · tools/ · legal/
├── tools/set-site-url.mjs  deploy se pehle URL badalne ki script
└── docs/                   ROADMAP · FIREBASE-SETUP · DEPLOYMENT
```

---

## Content kaise badlein (bina code chhue)

Sab kuch **`js/config/site-data.js`** me hai:

| Object | Kya control karta hai |
|---|---|
| `INSTITUTE` | Naam, phone, WhatsApp, email, address, timings, social links |
| `COURSES` | Saare 10 courses — fees, duration, modules, eligibility, career options |
| `FACULTY_SEED` | Teachers ke naam, role, subjects |
| `TESTIMONIALS` | Student reviews |
| `BLOG_SEED` | Starter articles |
| `ABOUT` | Story, mission, vision, values, milestones |
| `FAQ_SEED` · `TOOLS` · `STATS` · `FEATURES` · `JOURNEY` | Landing page sections |

Firebase connect hone ke baad Firestore ka data in defaults ko apne aap replace
kar deta hai — faculty, reviews, FAQ, blog, gallery sab admin dashboard se manage
ho jaate hain.

---

## Technical

| | |
|---|---|
| Stack | HTML5 · CSS3 · JavaScript (ES6 modules) · Bootstrap 5.3.3 |
| Backend | Firebase Auth + Firestore + Cloud Storage (aur kuch nahi) |
| Hosting | GitHub Pages (koi bhi static host chalega) |
| Build step | Koi nahi — jo likha hai wahi chalta hai |
| Browser support | Chrome, Edge, Firefox, Safari (last 2 versions) |
| Accessibility | axe-core: 37 pages × light+dark = **0 violations** |
| Offline | Free tools, QR encoder, calculators — sab client-side |

**Design system:** `css/tokens.css` me saare colours, spacing, radii, shadows aur
type scale CSS custom properties ki tarah hain. Light aur dark dono themes wahin
se aate hain — ek jagah badla, poori site badal gayi.

**Routing:** GitHub Pages sub-path (`/repo-name/`) par absolute links tootte hain,
isliye har link `js/core/routes.js` ke `url()` se banta hai jo `body[data-depth]`
dekhkar sahi relative path deta hai.

---

## Security — dhyan dene layak

- Firebase keys **public hain, aur hone bhi chahiye** — wo sirf project identify
  karti hain. Asli protection `firestore.rules` aur `storage.rules` me hai.
  **Inhe publish kiye bina site live mat karein.**
- `role`, `status` aur `studentId` koi user apne aap set nahi kar sakta — rules
  isse block karte hain.
- Admin account sirf Firebase console se banta hai (koi "admin signup" page nahi).
- Student aur admin pages par `noindex` lagaa hai; `robots.txt` unhe crawl hone se rokta hai.

---

## Documentation

- [`docs/FIREBASE-SETUP.md`](docs/FIREBASE-SETUP.md) — 8 steps me backend live
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — GitHub Pages, PWA, SEO, custom domain
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — kaun se phase me kya bana aur kaise test hua
