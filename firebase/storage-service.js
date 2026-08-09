/* ==========================================================================
   Soft Skill Zone — Firebase Storage Service
   --------------------------------------------------------------------------
   Validated, resumable uploads with progress callbacks.
   Used by: admission form (photo + documents), notes, assignments,
   submissions, gallery, certificates, fee proofs.
   ========================================================================== */

import {
  storage, storageRef, uploadBytesResumable, getDownloadURL,
  deleteObject, listAll, getMetadata
} from "./firebase-init.js";

import { UPLOAD_LIMITS, STORAGE_PATHS } from "../js/core/constants.js";
export { STORAGE_PATHS };

/* ==========================================================================
   Validation & compression — implemented in js/core/files.js (Firebase-free)
   and re-exported here so existing imports keep working.
   ========================================================================== */

import { validateFile, formatBytes, safeFileName, compressImage } from "../js/core/files.js";
export { validateFile, formatBytes, safeFileName, compressImage };

/* ==========================================================================
   Upload
   ========================================================================== */

/**
 * Upload one file with progress.
 * @param {File} file
 * @param {string} path        folder path, e.g. "admissions/SSZ-APP-2026-0001"
 * @param {object} [options]
 * @param {"image"|"document"|"any"} [options.kind="any"]
 * @param {string} [options.fileName]              override generated name
 * @param {(pct:number, snap:object)=>void} [options.onProgress]
 * @returns {Promise<{url:string,path:string,name:string,size:number,type:string}>}
 */
export function uploadFile(file, path, options = {}) {
  const { kind = "any", fileName, onProgress, skipUrl = false } = options;

  const check = validateFile(file, kind);
  if (!check.ok) return Promise.reject(new Error(check.error));

  const name = fileName || safeFileName(file.name);
  const fullPath = `${path.replace(/\/+$/, "")}/${name}`;
  const ref = storageRef(storage, fullPath);

  const task = uploadBytesResumable(ref, file, {
    contentType: file.type,
    cacheControl: "public,max-age=31536000"
  });

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        if (onProgress) {
          const pct = snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
          onProgress(pct, snap);
        }
      },
      (err) => reject(new Error(storageError(err))),
      async () => {
        /* Ye callback `async` hai, aur iske andar ka `await` girne par uska
           reject KAHIN NAHI JAATA — SDK ise sirf bula deta hai, uska jawab
           nahi dekhta. Yaani `getDownloadURL` fail hua to neeche wala
           `resolve` chalta hi nahi aur ye Promise HAMESHA ke liye adhoora
           lataka reh jaata: modal khula rehta, spinner ghoomta rehta, koi
           galti nahi dikhti, aur fee ki rasid kahin darj nahi hoti.
           Isliye poora hissa try/catch me hai — ab kam se kam saaf error
           milta hai. */
        try {
          /* getDownloadURL needs READ permission on the file. The public
             admission form uploads into a folder only the admin may read, so
             asking for a URL there fails (and, with retries, just hangs).
             Pass skipUrl and store the path — whoever is allowed to read it
             resolves the URL later. */
          const url = skipUrl ? "" : await getDownloadURL(task.snapshot.ref);
          resolve({
            url,
            path: fullPath,
            name: file.name,
            storedName: name,
            size: file.size,
            type: file.type
          });
        } catch (err) {
          reject(new Error(storageError(err)));
        }
      }
    );
  });
}

/**
 * Upload several files, reporting overall progress.
 * @param {File[]} files
 * @param {string} path
 * @param {object} [options] same as uploadFile + onProgress(overallPct, doneCount, total)
 */
export async function uploadMany(files, path, options = {}) {
  const list = Array.from(files);
  const results = [];
  const progressPerFile = new Array(list.length).fill(0);

  const report = () => {
    if (!options.onProgress) return;
    const overall = Math.round(progressPerFile.reduce((a, b) => a + b, 0) / list.length);
    options.onProgress(overall, results.length, list.length);
  };

  for (let i = 0; i < list.length; i++) {
    const res = await uploadFile(list[i], path, {
      ...options,
      onProgress: (pct) => { progressPerFile[i] = pct; report(); }
    });
    progressPerFile[i] = 100;
    results.push(res);
    report();
  }
  return results;
}

/* ==========================================================================
   Delete / list
   ========================================================================== */
export async function deleteFile(fullPath) {
  try {
    await deleteObject(storageRef(storage, fullPath));
    return true;
  } catch (err) {
    if (err.code === "storage/object-not-found") return true;
    throw new Error(storageError(err));
  }
}

/**
 * Resolve a stored file path into a download URL, at the moment it is needed.
 *
 * Study material used to keep its download URL inside the Firestore document.
 * A Firebase Storage download URL carries its own token and works for anyone
 * who has the link — forever, signed in or not. Sitting in the database, that
 * link was readable by every signed-in user and forwardable to anyone at all.
 *
 * Storing only the path and asking for the URL here means Storage rules run
 * first, so a signed-out visitor gets nothing. (Once a logged-in student has
 * the link they can still forward it — killing that needs a per-student
 * watermark or a server; this closes the open door, not every window.)
 *
 * @param {string} path e.g. "notes/ai-dca/book.pdf"
 */
export async function urlForPath(path) {
  if (!path) throw new Error("File ka path nahi mila.");
  try {
    return await getDownloadURL(storageRef(storage, path));
  } catch (err) {
    throw new Error(storageError(err));
  }
}

export async function listFolder(path) {
  const res = await listAll(storageRef(storage, path));
  return Promise.all(res.items.map(async (item) => {
    const [url, meta] = await Promise.all([getDownloadURL(item), getMetadata(item)]);
    return { name: item.name, path: item.fullPath, url, size: meta.size, type: meta.contentType, updated: meta.updated };
  }));
}

/** Force a browser download of a Storage URL (works cross-origin). */
export async function downloadFromURL(url, fileName = "download") {
  const res = await fetch(url);
  if (!res.ok) throw new Error("File download nahi ho payi.");
  const blob = await res.blob();
  const objectURL = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectURL;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectURL), 2000);
}

/* ==========================================================================
   Errors
   ========================================================================== */
const STORAGE_ERRORS = {
  "storage/unauthorized":       "Upload ki permission nahi hai. Storage rules check karein.",
  "storage/canceled":           "Upload cancel ho gaya.",
  "storage/quota-exceeded":     "Storage quota full ho gaya hai.",
  "storage/retry-limit-exceeded":"Network slow hai — upload fail. Dobara try karein.",
  "storage/invalid-checksum":   "File corrupt ho gayi. Dobara upload karein.",
  "storage/unauthenticated":    "Session expire ho gaya. Dobara login karein.",
  "storage/object-not-found":   "File nahi mili."
};
export function storageError(err) {
  if (!err) return "Upload fail ho gaya.";
  return STORAGE_ERRORS[err.code] || err.message || "Upload fail ho gaya.";
}

/**
 * Folder ke andar ki SAARI files — folder ke andar ke folder samet.
 *
 * `listFolder` sirf ek hi tah dekhta hai (listAll ka `items`), andar ke
 * folder (`prefixes`) chhod deta hai. Delete karte waqt yahi sabse bada
 * jaal hai: upar ki files hat jaati hain aur andar ki chupchaap padi reh
 * jaati hain — dikhti kisi ko nahi, par jagah aur bill dono khaati hain.
 *
 * Yahan sirf path lautaya jaata hai, URL nahi — URL maangne par har file
 * ke liye ek alag request jaati hai, aur hataane ke liye uski zaroorat
 * hai hi nahi.
 *
 * @param {string} path
 * @returns {Promise<string[]>} har file ka poora path
 */
export async function listFolderDeep(path) {
  const out = [];
  const walk = async (p) => {
    const res = await listAll(storageRef(storage, p)).catch(() => null);
    if (!res) return;
    res.items.forEach((it) => out.push(it.fullPath));
    /* Andar ke folder ek saath — ek-ek karke karne par 20 folder wali
       jagah par 20 chakkar lag jaate. */
    await Promise.all(res.prefixes.map((pre) => walk(pre.fullPath)));
  };
  await walk(path);
  return out;
}
