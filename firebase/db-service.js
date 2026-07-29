/* ==========================================================================
   Soft Skill Zone — Firestore Data Service
   --------------------------------------------------------------------------
   A thin, typed-by-convention layer over Firestore.

   Why it exists:
   - Pages never import Firestore directly, so query shapes stay consistent.
   - Built-in short-lived read cache keeps the free-tier read quota healthy.
   - Pagination, realtime listeners and atomic counters in one place.
   ========================================================================== */

import {
  db,
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, onSnapshot, serverTimestamp,
  increment, arrayUnion, arrayRemove, runTransaction, writeBatch,
  getCountFromServer, Timestamp
} from "./firebase-init.js";

import { COLLECTIONS } from "../js/core/constants.js";

export { serverTimestamp, increment, arrayUnion, arrayRemove, Timestamp, COLLECTIONS };

/* ==========================================================================
   Read cache — avoids re-fetching the same list on every page navigation.
   ========================================================================== */
const cache = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) { cache.delete(key); return null; }
  return hit.value;
}
function cacheSet(key, value, ttl = DEFAULT_TTL) {
  cache.set(key, { value, expires: Date.now() + ttl });
}
/** Clear the whole cache, or every key starting with `prefix`. */
export function clearCache(prefix) {
  if (!prefix) return cache.clear();
  [...cache.keys()].filter((k) => k.startsWith(prefix)).forEach((k) => cache.delete(k));
}

/* ==========================================================================
   Helpers
   ========================================================================== */
const withId = (snap) => ({ id: snap.id, ...snap.data() });

/**
 * Build a Firestore query from a plain options object.
 * @param {string} path
 * @param {{where?:Array<[string,string,any]>, orderBy?:[string,('asc'|'desc')?]|Array,
 *          limit?:number, startAfter?:any}} opts
 */
function buildQuery(path, opts = {}) {
  const parts = [];
  (opts.where || []).forEach(([field, op, value]) => {
    if (value !== undefined && value !== null && value !== "") parts.push(where(field, op, value));
  });
  if (opts.orderBy) {
    const orders = Array.isArray(opts.orderBy[0]) ? opts.orderBy : [opts.orderBy];
    orders.forEach(([field, dir = "asc"]) => parts.push(orderBy(field, dir)));
  }
  if (opts.startAfter) parts.push(startAfter(opts.startAfter));
  if (opts.limit) parts.push(limit(opts.limit));
  return query(collection(db, path), ...parts);
}

/* ==========================================================================
   Generic CRUD
   ========================================================================== */

/** Read one document. Returns null when it does not exist. */
export async function getOne(path, id, { useCache = true, ttl } = {}) {
  const key = `${path}/${id}`;
  if (useCache) { const c = cacheGet(key); if (c) return c; }
  const snap = await getDoc(doc(db, path, id));
  const value = snap.exists() ? withId(snap) : null;
  if (value && useCache) cacheSet(key, value, ttl);
  return value;
}

/** Read many documents. */
export async function getMany(path, opts = {}) {
  const key = `${path}?${JSON.stringify({ w: opts.where, o: opts.orderBy, l: opts.limit })}`;
  const useCache = opts.useCache !== false && !opts.startAfter;
  if (useCache) { const c = cacheGet(key); if (c) return c; }

  const snap = await getDocs(buildQuery(path, opts));
  const rows = snap.docs.map(withId);
  if (useCache) cacheSet(key, rows, opts.ttl);
  return rows;
}

/**
 * Paginated read.
 * @returns {{rows:Array, cursor:any, hasMore:boolean}} pass `cursor` back as opts.startAfter
 */
export async function getPage(path, opts = {}) {
  const size = opts.limit || 20;
  const snap = await getDocs(buildQuery(path, { ...opts, limit: size + 1, useCache: false }));
  const docs = snap.docs;
  const hasMore = docs.length > size;
  const page = hasMore ? docs.slice(0, size) : docs;
  return {
    rows: page.map(withId),
    cursor: page.length ? page[page.length - 1] : null,
    hasMore
  };
}

/** Server-side count without downloading documents (cheap: 1 read). */
export async function countOf(path, opts = {}) {
  const snap = await getCountFromServer(buildQuery(path, { ...opts, limit: undefined }));
  return snap.data().count;
}

/** Create with an auto-generated ID. Returns the new ID. */
export async function create(path, data) {
  const ref = await addDoc(collection(db, path), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  clearCache(path);
  return ref.id;
}

/** Create or overwrite at a known ID. `merge` keeps existing fields. */
export async function createWithId(path, id, data, { merge = false } = {}) {
  await setDoc(doc(db, path, id), {
    ...data,
    createdAt: data.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge });
  clearCache(path);
  return id;
}

export async function update(path, id, patch) {
  await updateDoc(doc(db, path, id), { ...patch, updatedAt: serverTimestamp() });
  clearCache(path);
  return id;
}

export async function remove(path, id) {
  await deleteDoc(doc(db, path, id));
  clearCache(path);
}

/** Apply many writes atomically. ops: [{type,path,id?,data?}] (max 500). */
export async function batchWrite(ops) {
  const batch = writeBatch(db);
  ops.forEach((op) => {
    const ref = op.id ? doc(db, op.path, op.id) : doc(collection(db, op.path));
    if (op.type === "set")    batch.set(ref, { ...op.data, updatedAt: serverTimestamp() }, { merge: !!op.merge });
    if (op.type === "update") batch.update(ref, { ...op.data, updatedAt: serverTimestamp() });
    if (op.type === "delete") batch.delete(ref);
  });
  await batch.commit();
  [...new Set(ops.map((o) => o.path))].forEach(clearCache);
}

/* ==========================================================================
   Realtime
   ========================================================================== */

/** Live list. cb(rows). Returns unsubscribe. */
export function watchMany(path, opts, cb, onError) {
  return onSnapshot(
    buildQuery(path, opts),
    (snap) => cb(snap.docs.map(withId)),
    (err) => { console.error(`[db] watch ${path}:`, err); onError && onError(err); }
  );
}

/** Live single document. cb(docOrNull). Returns unsubscribe. */
export function watchOne(path, id, cb, onError) {
  return onSnapshot(
    doc(db, path, id),
    (snap) => cb(snap.exists() ? withId(snap) : null),
    (err) => { console.error(`[db] watch ${path}/${id}:`, err); onError && onError(err); }
  );
}

/* ==========================================================================
   Atomic counters — used for Application No, Receipt No, Certificate No,
   Student ID. A transaction guarantees no two users ever get the same number.
   ========================================================================== */

/**
 * Increment counters/{name} and return the new value.
 * @param {string} name e.g. "admissions-2026"
 * @param {number} start first value if the counter does not exist yet
 */
export async function nextSequence(name, start = 1) {
  const ref = doc(db, COLLECTIONS.COUNTERS, name);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const next = snap.exists() ? (snap.data().value || 0) + 1 : start;
    tx.set(ref, { value: next, updatedAt: serverTimestamp() }, { merge: true });
    return next;
  });
}

/** Run any custom transaction. `fn` receives the Firestore transaction. */
export function transaction(fn) { return runTransaction(db, fn); }

/* ==========================================================================
   Firestore error -> human message
   ========================================================================== */
const DB_ERRORS = {
  "permission-denied":    "Permission nahi hai. Firestore rules check karein ya dobara login karein.",
  "not-found":            "Record nahi mila.",
  "already-exists":       "Yeh record pehle se maujood hai.",
  "unavailable":          "Server se connect nahi ho pa raha. Internet check karein.",
  "deadline-exceeded":    "Request timeout ho gayi. Dobara try karein.",
  "resource-exhausted":   "Aaj ka Firebase quota khatam ho gaya hai.",
  "failed-precondition":  "Is query ke liye Firestore index chahiye — console link se index bana lein.",
  "cancelled":            "Request cancel ho gayi.",
  "unauthenticated":      "Session expire ho gaya. Dobara login karein."
};
export function dbError(err) {
  if (!err) return "Kuch galat ho gaya.";
  return DB_ERRORS[err.code] || err.message || "Kuch galat ho gaya.";
}
