/* ==========================================================================
   Soft Skill Zone — Firebase Configuration
   --------------------------------------------------------------------------
   HOW TO FILL THIS FILE
   1. Firebase Console -> Project settings -> Your apps -> Web app
   2. Copy the firebaseConfig object shown there
   3. Replace every "PASTE_..." value below
   Full walkthrough: docs/FIREBASE-SETUP.md

   NOTE: These values are PUBLIC by design. They identify the project, they do
   not authorise anything. Real protection lives in firestore.rules /
   storage.rules — publish those before going live.
   ========================================================================== */

export const firebaseConfig = {
  apiKey:            "AIzaSyAZWfzxygY_5G9jlyIjQUGicPkYkObopTs",
  authDomain:        "soft-skill-zone.firebaseapp.com",
  projectId:         "soft-skill-zone",
  storageBucket:     "soft-skill-zone.firebasestorage.app",
  messagingSenderId: "1049777200309",
  appId:             "1:1049777200309:web:ab6833431cfb11a248b2fc"
};

/* Firebase JS SDK version used across the project (CDN, modular). */
export const FIREBASE_SDK_VERSION = "11.0.2";

/* True until real keys are pasted — the app shows a friendly setup notice
   instead of throwing cryptic Firebase errors. */
export const isFirebaseConfigured = !Object.values(firebaseConfig)
  .some((v) => typeof v === "string" && v.startsWith("PASTE_"));
