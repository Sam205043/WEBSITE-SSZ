/* ==========================================================================
   Soft Skill Zone — Firebase bootstrap
   --------------------------------------------------------------------------
   Single place where the Firebase SDK is loaded (v11.0.2, modular CDN build).
   Every other module imports `auth`, `db`, `storage` and the SDK helpers FROM
   HERE — never from the CDN directly — so the SDK version lives in one file.

   To upgrade the SDK: change the version number in the 4 import URLs below and
   in firebase-config.js (FIREBASE_SDK_VERSION).
   ========================================================================== */

import { initializeApp, getApps, getApp }
  from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
  updateProfile, updatePassword, reauthenticateWithCredential,
  EmailAuthProvider, setPersistence, browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
  getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, orderBy, limit, startAfter,
  onSnapshot, serverTimestamp, increment, arrayUnion, arrayRemove,
  runTransaction, writeBatch, Timestamp, getCountFromServer
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import {
  getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL,
  deleteObject, listAll, getMetadata
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

/* ==========================================================================
   Initialise once (safe against double-import / hot reload)
   ========================================================================== */
export const app     = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

/* Storage is not enabled on Firebase's free Spark plan. When it is off, the
   SDK retries for a full 2 minutes before giving up — the user just watches a
   spinner. 15 seconds is plenty for a real upload on mobile data and lets the
   app fall back quickly when Storage is unavailable.

   In the modular SDK these are plain writable properties on the storage
   instance (the setMax*RetryTime() helpers only exist in the old compat API).
   Wrapped in try/catch so a future SDK change can never break page load. */
try {
  storage.maxUploadRetryTime = 15000;
  storage.maxOperationRetryTime = 15000;
} catch { /* not settable in this SDK build — the upload timeout still applies */ }

/* Keep the user signed in across tabs and restarts by default.
   auth-service.login() can downgrade this to session-only. */
setPersistence(auth, browserLocalPersistence).catch(() => { /* private mode: ignore */ });

export { isFirebaseConfigured };

/* ==========================================================================
   Re-export SDK surface used by the app
   ========================================================================== */
export {
  /* auth */
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile, updatePassword,
  reauthenticateWithCredential, EmailAuthProvider,
  setPersistence, browserLocalPersistence, browserSessionPersistence,

  /* firestore */
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, onSnapshot, serverTimestamp,
  increment, arrayUnion, arrayRemove, runTransaction, writeBatch, Timestamp,
  getCountFromServer,

  /* storage */
  storageRef, uploadBytesResumable, getDownloadURL, deleteObject, listAll,
  getMetadata
};

/* ==========================================================================
   Friendly guard — shows a readable banner if keys were never pasted
   ========================================================================== */
if (!isFirebaseConfigured) {
  console.warn(
    "%c[Soft Skill Zone] Firebase is not configured yet.",
    "color:#f59e0b;font-weight:700",
    "\nOpen firebase/firebase-config.js and paste your project keys.",
    "\nStep-by-step guide: docs/FIREBASE-SETUP.md"
  );
  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("ssz-fb-warning")) return;
    const bar = document.createElement("div");
    bar.id = "ssz-fb-warning";
    bar.setAttribute("role", "alert");
    bar.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;z-index:2000;padding:12px 16px;" +
      "background:#f59e0b;color:#1a1204;font:600 13px/1.4 system-ui,sans-serif;" +
      "text-align:center;box-shadow:0 -4px 16px rgba(0,0,0,.18)";
    bar.innerHTML =
      "Firebase keys abhi tak set nahi hue &mdash; login, admission aur dashboard " +
      "kaam nahi karenge. <br class='d-sm-none'>" +
      "<span style='opacity:.85'>Fix: firebase/firebase-config.js me apne project keys paste karein " +
      "(guide: docs/FIREBASE-SETUP.md)</span>";
    document.body.appendChild(bar);
  });
}
