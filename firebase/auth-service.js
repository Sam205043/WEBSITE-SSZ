/* ==========================================================================
   Soft Skill Zone — Authentication Service
   --------------------------------------------------------------------------
   Wraps Firebase Auth and joins it with the `users/{uid}` profile document so
   the rest of the app always deals with ONE object:

     { uid, email, role, name, phone, studentId, status, photoURL }

   Roles: "student" | "admin" | "faculty"
   Admin accounts are created manually in the Firebase Console (see docs).
   ========================================================================== */

import {
  auth, db,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile, updatePassword,
  reauthenticateWithCredential, EmailAuthProvider,
  setPersistence, browserLocalPersistence, browserSessionPersistence,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
  collection, query, where, limit, getDocs
} from "./firebase-init.js";

import { ROLES, COLLECTIONS, USER_STATUS } from "../js/core/constants.js";

/* ==========================================================================
   Session cache
   ========================================================================== */
let currentUser = null;        // merged auth + profile object
let authResolved = false;
const listeners = new Set();

/** Latest known user, or null. Synchronous — use after ready(). */
export function getCurrentUser() { return currentUser; }

/** Subscribe to auth changes. Returns an unsubscribe function. */
export function onUserChanged(cb) {
  listeners.add(cb);
  if (authResolved) cb(currentUser);
  return () => listeners.delete(cb);
}

function emit() { listeners.forEach((cb) => { try { cb(currentUser); } catch (e) { console.error(e); } }); }

/** Resolves once Firebase has restored (or rejected) the stored session. */
export function ready() {
  return new Promise((resolve) => {
    if (authResolved) return resolve(currentUser);
    const stop = onUserChanged((u) => { stop(); resolve(u); });
  });
}

/* ==========================================================================
   Profile loading
   ========================================================================== */
async function loadProfile(fbUser) {
  if (!fbUser) return null;
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, fbUser.uid));
  const profile = snap.exists() ? snap.data() : {};
  return {
    uid: fbUser.uid,
    email: fbUser.email || profile.email || "",
    emailVerified: fbUser.emailVerified,
    name: profile.name || fbUser.displayName || (fbUser.email || "").split("@")[0],
    role: profile.role || ROLES.STUDENT,
    phone: profile.phone || "",
    studentId: profile.studentId || "",
    status: profile.status || USER_STATUS.ACTIVE,
    photoURL: profile.photoURL || fbUser.photoURL || "",
    hasProfile: snap.exists()
  };
}

/* Google apne-aap banaya hua akshar wala avatar deta hai jab account par
   asli photo na ho. Wo hai to image, par photo nahi — isliye use "photo hai"
   nahi maanenge, warna institute wali asli photo kabhi upar nahi aayegi. */
function isAutoLetterAvatar(url) {
  return /googleusercontent\.com/.test(url || "") && /default-user/.test(url || "");
}

/* --------------------------------------------------------------------------
   Profile padhne ki teen koshish

   `users/{uid}` ka ek read fail ho jaana aam baat hai — mobile net ek pal
   ke liye kat jaata hai, ya Firestore ka pehla connection thoda der leta
   hai. Ek koshish par haar maan lena mehnga padta tha (dekhein neeche wala
   catch), isliye thodi der ruk kar dobara poochh lete hain. Do baar rukna
   kul milakar do second se bhi kam hai — user ko sirf "session check ho
   raha hai" thoda lamba dikhta hai.
   -------------------------------------------------------------------------- */
const nap = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadProfileRetry(fbUser) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      return await loadProfile(fbUser);
    } catch (err) {
      lastErr = err;
      if (i < 2) await nap(i === 0 ? 400 : 1200);
    }
  }
  throw lastErr;
}

/* Single global auth listener — everything else hangs off this. */
onAuthStateChanged(auth, async (fbUser) => {
  try {
    currentUser = await loadProfileRetry(fbUser);
    if (currentUser && currentUser.status === USER_STATUS.BLOCKED) {
      await signOut(auth);
      currentUser = null;
    }
    /* Jin students ki ID pehle se judi hai unke liye ek baar ka sudhaar:
       agar login par koi asli photo nahi hai to institute wali utaar lo.
       Ek baar chalne ke baad shart jhooth ho jaati hai, isliye ye har baar
       ka kharcha nahi hai. */
    if (currentUser?.role === ROLES.STUDENT && currentUser.studentId
        && (!currentUser.photoURL || isAutoLetterAvatar(currentUser.photoURL))) {
      /* YE HISSA APNI GALTI KHUD SAMBHALTA HAI — AUR YAHI ZAROORI HAI.

         Profile upar theek padhi ja chuki hai. Ye sirf photo ka sudhaar
         hai. Agar iska dobara padhna gir jaye aur hum use bahar wale catch
         tak jaane dein, to jo profile SAHI aa chuki thi wo phenk di jaati
         hai aur user ko "jaankari nahi aa payi" wala parda dikh jaata hai
         — sirf photo ki wajah se.

         Aur ye halat rozmarra ki hai, kabhi-kabhaar ki nahi: jis student
         ki koi photo hai hi nahi, uske liye upar wali shart HAR baar sach
         rehti hai, isliye ye line har page par chalti hai. */
      try {
        await syncInstitutePhoto(fbUser, currentUser.studentId);
        currentUser = (await loadProfile(fbUser)) || currentUser;
      } catch (err) {
        console.warn("[auth] photo ka sudhaar nahi ho paya:", err?.message || err);
      }
    }
  } catch (err) {
    /* YAHAN PEHLE `role: ROLES.STUDENT` LIKHA THA, AUR WO EK ANDAZA THA.

       Andaza galat hone par asar seedha dikhta tha: net ek pal ko kharab
       hua, profile nahi aayi, aur ADMIN ko student maan liya gaya. Guard
       turant use student wale dashboard par bhej deta — aur wahan bhi kuchh
       nahi milta, kyunki uske paas koi Student ID hai hi nahi. Bar-bar
       login karne par bhi wahi. Lagta ki panel hi kho gaya.

       Ab hum andaza nahi lagate. Role khaali rehta hai aur ek nishaan lag
       jaata hai (`profileFailed`), jise dekh kar guard page rokta hai aur
       "dobara koshish karein" kehta hai — kisi galat dashboard par
       dhakelta nahi. */
    console.error("[auth] profile load failed:", err);
    /* Naam aur photo yahan bhi rakhte hain: navbar jaisi jagah inhe seedhe
       padhti hai, aur `undefined` wahan "undefined — Dashboard kholein"
       ban kar screen par aa jaata hai. */
    currentUser = fbUser
      ? {
          uid: fbUser.uid,
          email: fbUser.email || "",
          name: fbUser.displayName || (fbUser.email || "").split("@")[0],
          photoURL: fbUser.photoURL || "",
          studentId: "",
          role: null,
          hasProfile: false,
          profileFailed: true
        }
      : null;
  }
  authResolved = true;
  emit();
});

/* ==========================================================================
   Student ID khud jodna
   --------------------------------------------------------------------------
   Pehle student ko apni Student ID yaad rakhni aur type karni padti thi. Wo
   sabse zyada galtiyon wali jagah thi (SSZ2026ADCA0004 vs SSZ2026ADC0004).
   Ab zaroorat nahi: admission form me email pehle se hai, isliye login ke
   baad hum usi email se student ka record dhoondh lete hain.

   Ye surakshit hai — rules sirf usi record ko dikhne dete hain jiska email
   is login ke email se milta ho, isliye koi doosre ka record nahi utha sakta.
   ========================================================================== */
async function findStudentIdByEmail(email) {
  const mail = String(email || "").trim().toLowerCase();
  if (!mail) return "";
  const snap = await getDocs(query(
    collection(db, COLLECTIONS.STUDENTS),
    where("email", "==", mail),
    limit(1)
  ));
  return snap.empty ? "" : (snap.docs[0].data().studentId || snap.docs[0].id);
}

/**
 * Admission wali photo ko login ke record par bhi utaar deta hai.
 *
 * Google se login karne par Firebase khud photoURL bhar deta hai — aur jis
 * account par asli photo nahi hai, wahan wo apne-aap bana hua akshar wala
 * gola (default-user) hota hai. Har jagah avatar wahi dikhta tha, aur
 * admission form wali asli photo kabhi saamne aati hi nahi thi.
 *
 * Isliye ID judte hi institute ki photo yahan copy kar dete hain. Fayda ye
 * bhi hai ki upar dayein kone ka chhota avatar har page par sirf users doc
 * padhta hai — student ka record dobara padhne ki zaroorat nahi padti.
 *
 * Ye alag updateDoc hai, studentId ke saath nahi — kyunki ID claim wala rule
 * maangta hai ki us likhai me sirf studentId badle. Kabhi fail nahi karta:
 * photo na mile to login waise hi chalta rahega.
 */
async function syncInstitutePhoto(fbUser, studentId) {
  try {
    if (!studentId) return;
    const snap = await getDoc(doc(db, COLLECTIONS.STUDENTS, studentId));
    const url = snap.exists() ? (snap.data().photoURL || "") : "";
    if (!url) return;
    await updateDoc(doc(db, COLLECTIONS.USERS, fbUser.uid), {
      photoURL: url,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn("[auth] institute photo copy skipped:", err?.code || err);
  }
}

/**
 * Agar login ke saath koi Student ID judi nahi hai to email se dhoondh kar
 * jod deta hai. Kabhi fail nahi karta — record na mile ya rule mana kare to
 * chup-chaap chhod deta hai aur student profile page se khud jod sakta hai.
 * @returns {Promise<string>} judi hui Student ID, ya khaali
 */
export async function autoLinkStudentId(fbUser) {
  if (!fbUser?.email) return "";
  try {
    const id = await findStudentIdByEmail(fbUser.email);
    if (!id) return "";
    await updateDoc(doc(db, COLLECTIONS.USERS, fbUser.uid), { studentId: id });
    await syncInstitutePhoto(fbUser, id);
    return id;
  } catch (err) {
    console.warn("[auth] auto-link skipped:", err?.code || err);
    return "";
  }
}

/* ==========================================================================
   Actions
   ========================================================================== */

/**
 * Sign in with email + password.
 * @param {string} email
 * @param {string} password
 * @param {boolean} remember  false => session-only persistence
 * @returns {Promise<object>} merged user
 */
export async function login(email, password, remember = true) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  let user = await loadProfile(cred.user);

  if (user.status === USER_STATUS.BLOCKED) {
    await signOut(auth);
    throw new Error("Aapka account block kar diya gaya hai. Institute se sampark karein.");
  }

  /* PROFILE HAI HI NAHI TO YAHIN BANA DETE HAIN.

     Signup do kadam ka hai: pehle Firebase Auth me account, phir
     `users/{uid}` ka document. Doosra kadam gir jaye — net ek pal ko kata,
     bas itna — to account ban chuka hota hai par document nahi. Uske baad
     student phansa rehta tha, hamesha ke liye: dobara signup karne par
     "email pehle se registered hai" milta, aur login chal to jaata par
     har rule `users/{uid}` dekhta hai, isliye dashboard poora khaali
     rehta. Koi error bhi nahi dikhta — bas kuchh hota hi nahi.

     Google wale raaste me ye sudhaar pehle se tha (`finishGoogleSignIn`),
     email-password wale me nahi. Ab dono jagah hai. */
  if (!user.hasProfile) {
    await setDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), {
      uid: cred.user.uid,
      name: cred.user.displayName || (cred.user.email || "").split("@")[0],
      email: (cred.user.email || "").toLowerCase(),
      phone: cred.user.phoneNumber || "",
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      studentId: "",
      photoURL: cred.user.photoURL || "",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    }).catch((err) => console.warn("[auth] chhoota hua profile nahi ban paya:", err?.code || err));
    user = await loadProfile(cred.user);
  } else {
    await updateDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), { lastLoginAt: serverTimestamp() })
      .catch(() => { /* non-fatal */ });
  }

  /* Jo student pehle signup kar chuka tha aur baad me uska admission approve
     hua — uska record ab mil jaayega. Isliye har login par ek baar dekhte hain. */
  if (!user.studentId && user.role === ROLES.STUDENT) {
    if (await autoLinkStudentId(cred.user)) user = await loadProfile(cred.user);
  }

  currentUser = user;
  authResolved = true;
  emit();
  return user;
}

/* Instagram / Facebook / WhatsApp ke andar wala browser popup khol hi nahi
   sakta — wahan redirect ke alawa koi chara nahi. Aam Chrome aur Safari me
   redirect ab bharosemand nahi raha, isliye wahan uspar girna ulta nuksan
   karta hai (wajah neeche likhi hai). */
const isInAppBrowser = () =>
  /FBAN|FBAV|Instagram|Line\/|Twitter|WhatsApp|MicroMessenger/i.test(navigator.userAgent);

/**
 * Google se ek-tap login. Naya user ho to uska students profile khud ban
 * jaata hai aur Student ID email se jud jaati hai — kuch type nahi karna.
 *
 * @returns {Promise<object|null>} merged user, ya null agar redirect chala
 */
export async function loginWithGoogle(remember = true) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  /* Persistence set to karte hain, par uska INTEZAAR nahi karte. Popup se
     pehle ek bhi await aa gaya to browser maan leta hai ki ye window user ke
     tap se nahi khul rahi — aur use rok deta hai. */
  const persisting = setPersistence(
    auth,
    remember ? browserLocalPersistence : browserSessionPersistence
  ).catch(() => { /* persistence na bhi bane to login rukna nahi chahiye */ });

  let cred;
  try {
    cred = await signInWithPopup(auth, provider);
  } catch (err) {
    const popupFailed = [
      "auth/popup-blocked",
      "auth/cancelled-popup-request",
      "auth/operation-not-supported-in-this-environment"
    ].includes(err?.code);

    /* Pehle yahan har haal me redirect chal padta tha. Wahi student ko us
       safed error page par le jaata tha:
         "missing initial state ... signInWithRedirect in a storage-partitioned
          browser environment"
       Wajah — hamara auth handler soft-skill-zone.firebaseapp.com par hai aur
       site softskillzone.in par. Naye Chrome/Safari doosre domain ka storage
       alag rakh dete hain, isliye Google se laut kar aane par redirect ka apna
       record hi nahi milta.

       Isliye redirect ab sirf wahin, jahan uske alawa koi raasta nahi. */
    if (popupFailed && isInAppBrowser()) {
      await signInWithRedirect(auth, provider);
      return null;                       // page abhi Google par ja raha hai
    }
    throw err;
  }
  await persisting;
  return finishGoogleSignIn(cred.user);
}

/** Redirect se wapas aane par session poora karta hai. Kuch na ho to null. */
export async function completeGoogleRedirect() {
  const cred = await getRedirectResult(auth).catch(() => null);
  if (!cred?.user) return null;
  return finishGoogleSignIn(cred.user);
}

async function finishGoogleSignIn(fbUser) {
  const ref = doc(db, COLLECTIONS.USERS, fbUser.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    /* Pehli baar Google se aaya hai — student profile khud bana dete hain.
       Rules sirf role "student" hi banane dete hain, isliye koi apne aap
       admin nahi ban sakta. */
    await setDoc(ref, {
      uid: fbUser.uid,
      name: fbUser.displayName || (fbUser.email || "").split("@")[0],
      email: (fbUser.email || "").toLowerCase(),
      phone: fbUser.phoneNumber || "",
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      studentId: "",
      photoURL: fbUser.photoURL || "",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    });
  } else {
    await updateDoc(ref, { lastLoginAt: serverTimestamp() }).catch(() => {});
  }

  let user = await loadProfile(fbUser);
  if (user.status === USER_STATUS.BLOCKED) {
    await signOut(auth);
    throw new Error("Aapka account block kar diya gaya hai. Institute se sampark karein.");
  }
  if (!user.studentId && user.role === ROLES.STUDENT) {
    if (await autoLinkStudentId(fbUser)) user = await loadProfile(fbUser);
  }

  currentUser = user;
  authResolved = true;
  emit();
  return user;
}

/**
 * Create a student account and its users/{uid} profile in one go.
 * @param {{email:string,password:string,name:string,phone?:string,studentId?:string}} data
 */
export async function registerStudent({ email, password, name, phone = "", studentId = "" }) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: name });

  const base = {
    uid: cred.user.uid,
    name,
    email: email.trim().toLowerCase(),
    phone,
    role: ROLES.STUDENT,
    status: USER_STATUS.ACTIVE,
    photoURL: "",
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  };

  /* A student may only claim a Student ID whose admission record carries the
     same email address — the security rules enforce that, we cannot check it
     here. If the claim is refused, the account is still created: the ID is
     kept as a request for the admin to confirm, instead of failing signup
     and leaving a half-made account behind. */
  const ref = doc(db, COLLECTIONS.USERS, cred.user.uid);
  let idClaimRejected = false;

  if (studentId) {
    try {
      await setDoc(ref, { ...base, studentId });
    } catch (err) {
      if (err?.code !== "permission-denied") throw err;
      idClaimRejected = true;
      await setDoc(ref, { ...base, studentId: "", requestedStudentId: studentId });
    }
  } else {
    await setDoc(ref, { ...base, studentId: "" });
  }

  /* ID khud jodne ki koshish — signup form me ab wo field maangte hi nahi.
     Admission approve ho chuka hai to yahin jud jaayegi; nahi hua to baad me
     pehle login par jud jaayegi. */
  currentUser = await loadProfile(cred.user);
  if (!currentUser.studentId) {
    if (await autoLinkStudentId(cred.user)) {
      currentUser = await loadProfile(cred.user);
      idClaimRejected = false;
    }
  }
  if (currentUser) currentUser.idClaimRejected = idClaimRejected && !currentUser.studentId;
  authResolved = true;
  emit();
  return currentUser;
}

export async function logout() {
  await signOut(auth);
  currentUser = null;
  emit();
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email.trim());
}

/** Change password — requires the current password for re-authentication. */
export async function changePassword(currentPassword, newPassword) {
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error("Pehle login karein.");
  const cred = EmailAuthProvider.credential(fbUser.email, currentPassword);
  await reauthenticateWithCredential(fbUser, cred);
  await updatePassword(fbUser, newPassword);
}

/**
 * Attach a Student ID to the signed-in account, after signup.
 *
 * Needed because a student may create their login BEFORE the admin approves
 * their admission — at that moment there is no students/{id} record to point
 * at, so the account sits unlinked and every dashboard page shows the
 * "record abhi link nahi hua" empty state. This lets them link it themselves
 * later, without the admin editing Firestore by hand.
 *
 * Safe by construction: the security rule only allows this when
 * students/{studentId}.email equals the caller's own email, so nobody can
 * claim somebody else's ID and read their fees. That same rule also demands
 * `studentId` be the ONLY changed field — which is why this deliberately does
 * NOT stamp updatedAt the way updateUserProfile() does.
 *
 * @param {string} studentId e.g. "SSZ2026PYT0001"
 */
export async function claimStudentId(studentId) {
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error("Pehle login karein.");

  const id = String(studentId || "").trim().toUpperCase();
  if (!id) throw new Error("Student ID daalein.");

  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, fbUser.uid), { studentId: id });
  } catch (err) {
    if (err?.code === "permission-denied") {
      throw new Error(
        "Ye Student ID is email se match nahi karta. Dekhein ki ID sahi hai aur " +
        "wahi email use ho raha hai jo admission form me diya tha."
      );
    }
    throw err;
  }

  await syncInstitutePhoto(fbUser, id);

  currentUser = await loadProfile(fbUser);
  emit();
  return currentUser;
}

/** Patch the users/{uid} document and refresh the cached session object. */
export async function updateUserProfile(patch) {
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error("Pehle login karein.");
  await updateDoc(doc(db, COLLECTIONS.USERS, fbUser.uid), { ...patch, updatedAt: serverTimestamp() });
  if (patch.name) await updateProfile(fbUser, { displayName: patch.name });
  currentUser = await loadProfile(fbUser);
  emit();
  return currentUser;
}

/* ==========================================================================
   Role helpers
   ========================================================================== */
export const isLoggedIn = () => !!currentUser;
export const isAdmin    = () => currentUser?.role === ROLES.ADMIN;
export const isFaculty  = () => currentUser?.role === ROLES.FACULTY;
export const isStudent  = () => currentUser?.role === ROLES.STUDENT;
export const hasRole    = (...roles) => !!currentUser && roles.includes(currentUser.role);

/* ==========================================================================
   Error messages — Firebase codes translated to Hinglish, human wording
   ========================================================================== */
const AUTH_ERRORS = {
  "auth/invalid-email":            "Email address sahi format me nahi hai.",
  "auth/user-disabled":            "Yeh account disable kar diya gaya hai.",
  "auth/user-not-found":           "Is email se koi account nahi mila.",
  "auth/wrong-password":           "Password galat hai. Dobara try karein.",
  "auth/invalid-credential":       "Email ya password galat hai.",
  "auth/invalid-login-credentials":"Email ya password galat hai.",
  "auth/email-already-in-use":     "Yeh email pehle se registered hai. Login karein.",
  "auth/weak-password":            "Password kam se kam 6 characters ka hona chahiye.",
  "auth/too-many-requests":        "Bahut zyada attempts. Thodi der baad try karein.",
  "auth/network-request-failed":   "Internet connection check karein.",
  "auth/requires-recent-login":    "Security ke liye dobara login karein.",
  "auth/operation-not-allowed":    "Ye sign-in tarika Firebase Console me enable nahi hai.",
  "auth/popup-closed-by-user":     "Google ki window band ho gayi. Dobara try karein.",
  /* Popup ruk gaya — student ko saaf raasta batana zaroori hai, warna wo
     wahin atak jaata hai. */
  "auth/popup-blocked":
    "Aapke browser ne Google ki window rok di. Address bar me popup ka nishan " +
    "dabaakar \"Allow\" kar dein aur dobara try karein — ya neeche email aur " +
    "password se login karein.",
  "auth/cancelled-popup-request":  "Google ki window band ho gayi. Dobara try karein.",
  "auth/operation-not-supported-in-this-environment":
    "Is browser me Google login nahi ho paata. Chrome me kholein, ya neeche " +
    "email aur password se login karein.",
  "auth/account-exists-with-different-credential":
    "Is email se pehle password wala account bana hua hai. Neeche email aur password se login karein.",
  "auth/unauthorized-domain":      "Ye domain Firebase ki authorized list me nahi hai. Institute se sampark karein.",
  "auth/missing-password":         "Password daalna zaroori hai.",
  "permission-denied":             "Aapke paas is action ki permission nahi hai.",
  "unavailable":                   "Server se connect nahi ho pa raha. Internet check karein."
};

/** Turn any thrown error into a message safe to show a user. */
export function authError(err) {
  if (!err) return "Kuch galat ho gaya. Dobara try karein.";
  const code = err.code || "";
  return AUTH_ERRORS[code] || err.message || "Kuch galat ho gaya. Dobara try karein.";
}
