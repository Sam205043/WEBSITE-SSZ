# Firebase Setup — Step by Step

Yeh project ka poora backend Firebase par chalta hai. Neeche diye 8 steps ek baar
karne hain — uske baad website live data ke saath kaam karne lagegi.

Total time: **20–25 minute**. Koi coding nahi — sirf copy-paste.

> **Abhi keys nahi daali?** Koi baat nahi. Website tab bhi chalti hai —
> dashboards **Preview Mode** me sample data dikhate hain aur 10 free tools
> poori tarah kaam karte hain. Sirf login, admission-save aur upload ke liye
> Firebase chahiye.

---

## Step 1 — Firebase project banayein

1. <https://console.firebase.google.com> kholein, apne Google account se login karein.
2. **Create a project** par click karein.
3. Project name: `soft-skill-zone` (ya jo aapko theek lage).
4. Google Analytics: **off** kar sakte hain — abhi zaroorat nahi.
5. **Create project** → 30 second wait → **Continue**.

## Step 2 — Web app register karein

1. Project home par **`</>`** (Web) icon par click karein.
2. App nickname: `SSZ Website`.
3. "Also set up Firebase Hosting" ko **tick mat karein** (hum GitHub Pages use kar rahe hain).
4. **Register app** dabayein.
5. Ab screen par `firebaseConfig = { ... }` dikhega — **yeh screen khuli rehne dein.**

## Step 3 — Keys project me paste karein

`firebase/firebase-config.js` file kholein aur `PASTE_...` values badal dein:

```js
export const firebaseConfig = {
  apiKey:            "AIzaSy…",                     // console se copy
  authDomain:        "soft-skill-zone.firebaseapp.com",
  projectId:         "soft-skill-zone",
  storageBucket:     "soft-skill-zone.appspot.com",
  messagingSenderId: "1234567890",
  appId:             "1:1234567890:web:abc123"
};
```

> Yeh keys **public hain — yahi design hai.** Ye sirf project ko pehchante hain,
> kisi cheez ka access nahi dete. Asli suraksha Step 6 ke rules se aati hai.

Save karke website refresh karein — dashboards ka "Preview mode" banner hat jayega.

## Step 4 — Authentication on karein

1. Left menu → **Build → Authentication → Get started**.
2. **Sign-in method** tab → **Email/Password** → **Enable** → **Save**.
3. (Optional, recommended) Neeche **Email link (passwordless sign-in)** off hi rehne dein.

## Step 5 — Firestore Database banayein

1. Left menu → **Build → Firestore Database → Create database**.
2. Mode: **Start in production mode** chunein (rules hum Step 6 me daalenge).
3. Location: **asia-south1 (Mumbai)** — India ke users ke liye sabse tez.
4. **Enable** dabayein.

Fir **Build → Storage → Get started** → same location → **Done**.

> **Storage ab free Spark plan par nahi milta.** September 2024 ke baad bane
> projects me Cloud Storage kholne ke liye **Blaze plan** (card) chahiye.
> Iske bina site 90% chalti hai — Firestore, login, fees, attendance,
> certificates ka record, notifications sab theek. Band sirf **file upload**
> rehta hai: admission ka photo/document, assignment submission, fee proof
> screenshot, notes ki file, certificate PDF, gallery photos.
>
> Site isse handle karti hai — Storage band ho to admission form fail nahi
> hota. Application save ho jaati hai, student ko "documents WhatsApp par
> bhejein" ka button dikhta hai, aur admin ko application par **"Docs pending"**
> badge dikh jaata hai. Baad me Blaze lene par sab apne aap chalne lagega,
> kuch dobara banane ki zaroorat nahi — bas `firebase/storage.rules` publish
> kar dena.

## Step 6 — Security rules publish karein (सबसे ज़रूरी step)

Website client-side hai, isliye rules hi aapka asli lock hain. Bina inke aapka
data sabke liye khula reh jaayega.

**Firestore rules**

1. **Firestore Database → Rules** tab.
2. Project ki `firebase/firestore.rules` file ka poora content copy karein.
3. Editor me paste karein → **Publish**.

**Storage rules** *(sirf tab jab Storage enable kiya ho — Blaze plan par)*

1. **Storage → Rules** tab.
2. `firebase/storage.rules` ka content paste karein → **Publish**.

Spark plan par ho to yeh step abhi chhod dein — Storage hi enable nahi hai,
to publish karne ko kuch hai nahi. Blaze lene ke din yaad se kar lena.

Kya milta hai in rules se:

| Kaun | Kya kar sakta hai |
|---|---|
| Visitor (bina login) | Courses/blog/FAQ padhna, admission form bharna, enquiry bhejna, certificate verify karna |
| Student (login) | Sirf apni fees, attendance, notes, assignments, certificates |
| Admin | Sab kuch |

Role, status aur studentId koi apne aap set nahi kar sakta — sirf admin.

## Step 7 — Admin account banayein

Admin banane ka koi UI nahi hai (jaan-boojh kar — warna koi bhi admin ban jaata).
Ek baar haath se karna hai:

1. **Authentication → Users → Add user**
   - Email: aapka institute email (jaise `admin@softskillzone.in`)
   - Password: strong password rakhein
   - **Add user** → banne ke baad **User UID** copy karein (lamba sa string).

2. **Firestore Database → Start collection**
   - Collection ID: `users`
   - Document ID: **wahi UID paste karein** (auto-ID nahi)
   - Fields:

   | Field | Type | Value |
   |---|---|---|
   | `role` | string | `admin` |
   | `name` | string | Aapka naam |
   | `email` | string | Wahi email |
   | `status` | string | `active` |

   - **Save**.

3. Website par `pages/admin/login.html` kholein aur usi email/password se login karein.
   Admin Dashboard khul jaana chahiye.

## Step 8 — Chalu hai ya nahi, check karein

- [ ] `pages/admission.html` par ek test form bharein → submit karein
- [ ] Admin Dashboard → **Nayi Applications** me wo application turant dikhni chahiye
- [ ] Application approve karein → Student ID generate hoga
- [ ] `pages/student/signup.html` se us Student ID ke saath account banayein
- [ ] Student dashboard me fees/attendance dikhna chahiye

Sab ho gaya to setup complete hai. Test application ko Firestore se delete kar dein.

---

## Aage jaakar kaam aane wali baatein

**Free plan (Spark) kaafi hai?**
Haan — 1 GB storage, 50k document reads/din. Ek institute ke liye kaafi zyada hai.
Bad me chahiye to Blaze plan par jaa sakte hain.

**Index chahiye?**
Agar console me *"The query requires an index"* error aaye, to error message me
diya link click kar dein — Firebase khud index bana deta hai. Ek-do minute lagte hain.

**Roz ka backup?**
**Firestore → Import/Export** se manual export le sakte hain, ya admin dashboard ke
**Export Excel** buttons se students/fees ka data download kar lein.

**Student ne password bhoola?**
`pages/student/forgot-password.html` — Firebase khud reset email bhejta hai.

**Kisi ko block karna hai?**
Firestore me us user ke doc me `status` = `blocked` kar dein. Login turant band.
