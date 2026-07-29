# Deployment — GitHub Pages par live karna

Poora project static hai (HTML + CSS + JS). Koi build step nahi, koi server nahi.
Folder jaisa hai waisa hi upload ho jaata hai.

Total time: **15 minute**.

---

## Site ka URL — pehle se set hai

Project me site URL **`https://softskillzone.in`** set kar diya gaya hai.
Ye `canonical`, `og:url`, `sitemap.xml` aur `robots.txt` — sab jagah likha hai.

Iska matlab: ye URL tabhi sahi kaam karega jab domain `softskillzone.in`
GitHub Pages par point kar raha ho (neeche **Custom domain** section dekhein).

**Agar kabhi URL badalna ho** (jaise pehle `<username>.github.io` par test karna ho):

```bash
node tools/set-site-url.mjs https://yourname.github.io/soft-skill-zone
```

Node na ho to VS Code se:

1. VS Code me project folder kholein
2. `Ctrl + Shift + H` (Replace in Files)
3. Find: `https://softskillzone.in`
4. Replace: naya URL (aakhir me slash **nahi**)
5. "Replace All" dabayein

Domain live ho jaane ke baad wapas `https://softskillzone.in` kar dena.

---

## Option A — GitHub website se (bina command ke)

1. <https://github.com/new> par jaakar repository banayein
   - Name: `soft-skill-zone`
   - **Public** rakhein (Pages free plan par public repo hi chahiye)
   - README add **na karein**
2. Repo page par **uploading an existing file** link par click karein.
3. Project ke **saare folders aur files** drag-drop karein
   (`index.html`, `css/`, `js/`, `pages/`, `firebase/`, `images/`,
   `components/`, `docs/`, `manifest.json`, `sw.js`, `sitemap.xml`,
   `robots.txt`, `404.html`, `offline.html`).
4. **Commit changes** dabayein.
5. **Settings → Pages** kholein
   - Source: **Deploy from a branch**
   - Branch: **main** / folder: **/ (root)**
   - **Save**
6. 1–2 minute me site live: `https://<username>.github.io/soft-skill-zone`

## Option B — Git command line se

```bash
cd "WEBSITE SSZ"

git init
git add .
git commit -m "Soft Skill Zone Institute — full site"
git branch -M main
git remote add origin https://github.com/<username>/soft-skill-zone.git
git push -u origin main
```

Fir **Settings → Pages** me branch `main` / root select karke Save.

Aage se koi bhi badlaav:

```bash
git add .
git commit -m "content update"
git push
```

---

## Deploy ke baad ka checklist

- [ ] Home page khulta hai, navbar/footer dikhte hain
- [ ] Kisi bhi page par **F5** — 404 nahi aana chahiye
- [ ] Dark mode toggle chalta hai aur reload ke baad yaad rehta hai
- [ ] Free tools (GST, EMI, QR) chalte hain — ye bina login/Firebase ke chalte hain
- [ ] Mobile par kholkar "Add to Home Screen" dikhta hai
- [ ] Admission form submit hota hai aur admin dashboard me aata hai
      (iske liye Firebase setup chahiye — `docs/FIREBASE-SETUP.md`)

### Firebase par domain authorise karna zaroori hai

Login tabhi chalega jab site ka domain Firebase me whitelisted ho:

**Firebase Console → Authentication → Settings → Authorized domains → Add domain**

Ye do add karein:

- `softskillzone.in`
- `<username>.github.io`

Ye na kiya to login par `auth/unauthorized-domain` error aayega.

---

## PWA (mobile par app jaisa)

Site ek installable PWA hai:

- `manifest.json` — naam, icons, theme colour, shortcuts (Admission, Dashboard, Tools)
- `sw.js` — service worker
- `offline.html` — internet na ho to yeh page dikhta hai

Kaise kaam karta hai:

| Cheez | Strategy | Matlab |
|---|---|---|
| CSS / JS / icons | stale-while-revalidate | Turant khulta hai, background me update ho jaata hai |
| Pages | network-first | Hamesha taaza content, internet na ho to cache se |
| Firebase / Firestore | **kabhi cache nahi** | Fees, attendance, marks hamesha live |

Service worker sirf **public pages** par register hota hai. Student aur admin
dashboards par jaan-boojh kar nahi — taaki wahan kabhi purana data na dikhe.

> **Zaroori:** Service worker sirf **HTTPS** par chalta hai (ya `localhost` par).
> `file://` se seedha HTML kholenge to PWA off rahega — baaki sab chalega.

### Update push karna

`sw.js` me sabse upar:

```js
const VERSION = "ssz-v2";
```

Jab bhi CSS/JS me bada badlaav karein, isse `ssz-v3` kar dein. Purana cache apne
aap delete ho jaata hai aur sabko naya version milta hai.

---

## SEO — deploy ke baad

1. <https://search.google.com/search-console> par site add karein
2. **Sitemaps** section me `sitemap.xml` submit karein
3. Home page ka URL **URL Inspection → Request indexing** me daal dein

Project me pehle se maujood hai:

- Har public page par title, description, canonical, Open Graph + Twitter card
- `images/logo/og-cover.jpg` — WhatsApp/Facebook par share karne par dikhne wala card
- **JSON-LD structured data:**
  - `EducationalOrganization` + `LocalBusiness` (address, timings, course catalog) — home page
  - `WebSite` + `SearchAction` — Google me sitelinks search box
  - `Course` (fees, duration, provider) — har course detail page
  - `FAQPage` — FAQ page (Google me sawal-jawab directly dikh sakte hain)
  - `BlogPosting` — har article
  - `BreadcrumbList` — sab inner pages
- `robots.txt` — student/admin folders ko crawl hone se rokta hai
- Student aur admin dashboards par `noindex` meta tag

Testing tools:

- Rich results: <https://search.google.com/test/rich-results>
- Share preview: <https://developers.facebook.com/tools/debug/>

---

## Custom domain — softskillzone.in

Domain khareed liya gaya hai. Jodne ka tarika:

1. Repo → **Settings → Pages → Custom domain** me `softskillzone.in` likhein → Save
   (isse repo me ek `CNAME` file bhi ban jaati hai — usse delete na karein)
2. Domain provider (jahan se khareeda) ke DNS panel me:

   | Type | Name | Value |
   |---|---|---|
   | A | @ | `185.199.108.153` |
   | A | @ | `185.199.109.153` |
   | A | @ | `185.199.110.153` |
   | A | @ | `185.199.111.153` |
   | CNAME | www | `<username>.github.io` |

   Chaar A records — chaaron daalne hain, ek nahi.

3. DNS phailne me 10 min – 24 ghante lagte hain. Tab tak GitHub "domain not
   verified" dikhata rahega — ghabraana nahi.
4. Green tick aa jaaye to **Enforce HTTPS** tick kar dein (certificate free hai)
5. Firebase → Authentication → Authorized domains me `softskillzone.in` add karein

Site ka URL project me pehle se `https://softskillzone.in` set hai, isliye
step 5 ke baad kuch aur badalne ki zaroorat nahi.

---

## Deploy se pehle content check kar lein

`js/config/site-data.js` me `INSTITUTE` object me asli details already bhari hain:

```js
phone:    "+91 62028 56897",     // ✅ asli number
whatsapp: "+91 62028 56897",     // ✅ WhatsApp
email:    "info@softskillzone.in",
address:  "Ara, Bhojpur, Bihar - 802301",
payments: {
  razorpayLink: "https://rzp.io/rzp/CCEWjTnM",   // ✅ asli Razorpay link
  upiId:        "softskillzone@ybl"              // ✅ asli UPI ID
}
```

**Jo abhi bhi sample hai** (jab time mile tab badal lein):

| Kya | Kahan | Kaise |
|---|---|---|
| `social` links (facebook/instagram/youtube) | `INSTITUTE.social` | Apne page ke poore URL daal dein |
| `FACULTY_SEED` — sample teachers | isi file me | Asli teachers ke naam/photo |
| `TESTIMONIALS` — sample reviews | isi file me | Ya admin dashboard → Reviews se manage karein |

### Live jaane se pehle ye 3 files hata dein

`check-setup.html`, `cleanup.html`, `READ-ME-FIRST.txt` — ye sirf setup ke
liye the. Public site par inki zaroorat nahi.

---

## Common problems

| Problem | Wajah / Hal |
|---|---|
| CSS load nahi ho raha, page plain dikh raha hai | Repo ka naam URL me match nahi kar raha. Pages settings me branch/folder check karein |
| Login "auth/unauthorized-domain" | Firebase → Authentication → Authorized domains me apna GitHub Pages domain add karein |
| Purana version dikh raha hai | `sw.js` me `VERSION` badhayein, ya browser me hard refresh (`Ctrl+Shift+R`) |
| Admission form submit nahi ho raha | Firebase keys nahi padi, ya Firestore rules publish nahi hue — `docs/FIREBASE-SETUP.md` Step 3 aur 6 |
| Console me "Missing or insufficient permissions" | Firestore rules publish nahi hue, ya user doc me `role` set nahi hai |
| Site 404 de rahi hai | Pages build hone me 1–2 min lagte hain. Actions tab me build status dekhein |
