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
  doc, getDoc, setDoc, updateDoc, serverTimestamp
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

/* Single global auth listener — everything else hangs off this. */
onAuthStateChanged(auth, async (fbUser) => {
  try {
    currentUser = await loadProfile(fbUser);
    if (currentUser && currentUser.status === USER_STATUS.BLOCKED) {
      await signOut(auth);
      currentUser = null;
    }
  } catch (err) {
    console.error("[auth] profile load failed:", err);
    currentUser = fbUser ? { uid: fbUser.uid, email: fbUser.email, role: ROLES.STUDENT, hasProfile: false } : null;
  }
  authResolved = true;
  emit();
});

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
  const user = await loadProfile(cred.user);

  if (user.status === USER_STATUS.BLOCKED) {
    await signOut(auth);
    throw new Error("Aapka account block kar diya gaya hai. Institute se sampark karein.");
  }

  await updateDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), { lastLoginAt: serverTimestamp() })
    .catch(() => { /* profile may not exist yet — non-fatal */ });

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
    email: email.trim(),
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

  currentUser = await loadProfile(cred.user);
  if (currentUser) currentUser.idClaimRejected = idClaimRejected;
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
  "auth/operation-not-allowed":    "Email/Password sign-in Firebase Console me enable nahi hai.",
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
