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
   Missing-index fallback
   --------------------------------------------------------------------------
   A Firestore query that filters on one field and sorts by another needs a
   composite index. Until that index is built, the query throws
   "failed-precondition" — and one such throw used to blank out a whole
   dashboard page.

   That is a bad trade for an institute this size. The data here is small
   (one branch, hundreds of rows), so when the index is missing we simply
   re-run the query without the sort and order the rows in the browser. The
   page keeps working; the console prints the console link so the index can
   be created later purely for speed.
   ========================================================================== */

/** Firestore Timestamp | Date | number | string -> something comparable. */
function sortValue(v) {
  if (v === undefined || v === null) return null;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number" || typeof v === "boolean") return Number(v);
  return String(v);
}

/** Sort rows the way Firestore would have. Missing fields sort first. */
function sortRows(rows, orderByOpt) {
  if (!orderByOpt) return rows;
  const orders = Array.isArray(orderByOpt[0]) ? orderByOpt : [orderByOpt];
  return [...rows].sort((a, b) => {
    for (const [field, dir = "asc"] of orders) {
      const av = sortValue(a[field]);
      const bv = sortValue(b[field]);
      if (av === bv) continue;
      if (av === null) return dir === "desc" ? 1 : -1;
      if (bv === null) return dir === "desc" ? -1 : 1;
      return (av < bv ? -1 : 1) * (dir === "desc" ? -1 : 1);
    }
    return 0;
  });
}

const warnedIndexes = new Set();
function warnMissingIndex(path, err) {
  if (warnedIndexes.has(path)) return;
  warnedIndexes.add(path);
  console.warn(
    `[db] "${path}" ka composite index abhi nahi bana — browser me sort karke chala raha hoon. ` +
    `Speed ke liye ye index bana lein:\n${err?.message || ""}`
  );
}

const isMissingIndex = (err) => err?.code === "failed-precondition";

/* Without the sort, `limit` would hand back an arbitrary slice rather than the
   newest rows — so the fallback fetches a wider window, sorts, then trims. */
const FALLBACK_WINDOW = 500;

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

  let rows;
  try {
    const snap = await getDocs(buildQuery(path, opts));
    rows = snap.docs.map(withId);
  } catch (err) {
    // Pagination genuinely needs the index — a cursor is meaningless unsorted.
    if (!isMissingIndex(err) || !opts.orderBy || opts.startAfter) throw err;
    warnMissingIndex(path, err);
    const snap = await getDocs(buildQuery(path, {
      ...opts, orderBy: undefined, limit: FALLBACK_WINDOW
    }));
    rows = sortRows(snap.docs.map(withId), opts.orderBy);
    if (opts.limit) rows = rows.slice(0, opts.limit);
  }

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

/**
 * Live list. cb(rows). Returns unsubscribe.
 *
 * Same missing-index fallback as getMany: if the sorted listener is rejected,
 * resubscribe unsorted and sort each snapshot in the browser, so realtime
 * screens (the admissions inbox above all) keep updating.
 */
export function watchMany(path, opts, cb, onError) {
  let stop = null;
  let cancelled = false;

  const subscribe = (queryOpts, sortLocally) => onSnapshot(
    buildQuery(path, queryOpts),
    (snap) => {
      let rows = snap.docs.map(withId);
      if (sortLocally) {
        rows = sortRows(rows, opts.orderBy);
        if (opts.limit) rows = rows.slice(0, opts.limit);
      }
      cb(rows);
    },
    (err) => {
      if (!sortLocally && isMissingIndex(err) && opts.orderBy && !cancelled) {
        warnMissingIndex(path, err);
        stop = subscribe({ ...opts, orderBy: undefined, limit: FALLBACK_WINDOW }, true);
        return;
      }
      console.error(`[db] watch ${path}:`, err);
      onError && onError(err);
    }
  );

  stop = subscribe(opts, false);
  return () => { cancelled = true; stop && stop(); };
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

/**
 * Kisi document ka pata (reference) — transaction ke andar `tx.get()` /
 * `tx.set()` ke liye. Firestore ke import sirf isi file me rehte hain,
 * isliye baaki code seedha `doc(db, ...)` nahi bulaata.
 */
export function refFor(path, id) { return doc(db, path, id); }

/**
 * Ek document ko transaction ke andar padho, phir uske TAAZA roop se patch
 * banao aur likh do.
 *
 * KYUN CHAHIYE THA
 *
 * `update()` + `increment()` jodne-ghatane ke liye theek hai — do log ek
 * saath jodein to bhi ginti sahi rehti hai. Par do cheezein wo nahi kar
 * sakta:
 *
 *   1. HADD nahi laga sakta. `increment(-5000)` ko nahi pata ki bakaya sirf
 *      ₹3,000 tha; wo use -₹2,000 par le jaata hai. Aur negative bakaya
 *      report me DOOSRON ka bakaya kaat deta hai.
 *
 *   2. Ek field ki nayi keemat doosre field se nahi nikal sakta. "Nayi due
 *      date" ke liye "kitna paisa aa chuka hai" pata hona chahiye — aur wo
 *      page khulte waqt wala purana number nahi, is pal wala.
 *
 * Yahan `mutate(current)` ko hamesha wahi record milta hai jo transaction ke
 * andar abhi padha gaya hai. Jo patch wo lautata hai wahi likha jaata hai.
 * Beech me koi aur likh de to Firestore poora transaction dobara chala deta
 * hai — yaani hisaab phir se taaza record par hota hai.
 *
 * @param {string} path
 * @param {string} id
 * @param {(current: object) => object|null} mutate  patch, ya null (kuchh na likho)
 * @returns {Promise<{before: object, patch: object|null}>}
 */
export async function updateInTransaction(path, id, mutate) {
  const out = await runTransaction(db, async (tx) => {
    const ref = doc(db, path, id);
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      const e = new Error("Record nahi mila.");
      e.code = "not-found";
      throw e;
    }
    const before = withId(snap);
    const patch = mutate(before);
    if (patch) tx.update(ref, { ...patch, updatedAt: serverTimestamp() });
    return { before, patch };
  });
  clearCache(path);
  return out;
}

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
