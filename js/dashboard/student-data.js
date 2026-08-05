/* ==========================================================================
   Soft Skill Zone — Student data layer (live mode)
   --------------------------------------------------------------------------
   One place that knows how to fetch a student's world from Firestore.
   Every function takes the shell context and returns plain arrays/objects
   in the same shape as demo-data.js, so pages render both identically.
   ========================================================================== */

import { COLLECTIONS } from "../core/constants.js";

async function db() { return import("../../firebase/db-service.js"); }

/* ==========================================================================
   Student context — the students/{studentId} record for the signed-in user
   ========================================================================== */
/**
 * @param {object}  user
 * @param {object}  [opts]
 * @param {boolean} [opts.fresh]  cache chhodkar seedha server se. Tab chahiye
 *   jab record kisi DOOSRE browser me badla ho — jaise admin ne fees confirm
 *   ki. Cache sirf apne hi write par saaf hota hai, isliye bina iske student
 *   ko paanch minute tak purane totals dikhte rehte the.
 */
export async function getStudent(user, { fresh = false } = {}) {
  const { getOne, getMany } = await db();

  if (user.studentId) {
    const doc = await getOne(COLLECTIONS.STUDENTS, user.studentId, { useCache: !fresh });
    if (doc) return doc;
  }
  // Fallback: find by auth uid (covers accounts linked later by the admin)
  const rows = await getMany(COLLECTIONS.STUDENTS, {
    where: [["uid", "==", user.uid]], limit: 1
  });
  return rows[0] || null;
}

/* ==========================================================================
   Per-domain loaders
   ========================================================================== */
export async function getClasses(student) {
  const { getMany } = await db();
  if (!student?.batchId) return [];

  /* Roz lagne wali class ka batch bahut bada ho jata hai — 3 mahine ka
     Mon-Sat matlab 70+ classes. Pehle yahan "newest 40" mangte the, aur
     newest ka matlab hota tha SABSE AAGE ki tareekhein. Natija: student ko
     October ki classes dikhti thin aur KAL wali — jo use sabse pehle chahiye
     — list me aati hi nahi thi. "Live Now" bhi kabhi nahi chalta.

     Ab poori list laakar "abhi" ke aas-paas se chunte hain: aage ki 30 aur
     peechhe ki 20. Ye dono milakar wahi hai jo student ko chahiye. */
  const rows = await getMany(COLLECTIONS.LIVE_CLASSES, {
    where: [["batchId", "==", student.batchId]],
    orderBy: ["startsAt", "desc"],
    limit: 400
  });

  const now = Date.now();
  const at = (c) => {
    const v = c.startsAt;
    const d = v?.toDate ? v.toDate() : new Date(v);
    return isNaN(d) ? 0 : d.getTime();
  };

  /* rows nayi-se-purani hai: aage wali classes upar, isliye "sabse nazdeek
     aane wali" list ke aakhir me milti hai. */
  const upcoming = rows.filter((c) => at(c) >= now);
  const past = rows.filter((c) => at(c) < now);
  return [...upcoming.slice(-30), ...past.slice(0, 20)];
}

export async function getAttendance(student) {
  const { getMany } = await db();
  if (!student) return [];
  return getMany(COLLECTIONS.ATTENDANCE, {
    where: [["studentId", "==", student.studentId]],
    orderBy: ["date", "desc"],
    limit: 120
  });
}

export async function getAssignments(student) {
  const { getMany } = await db();
  if (!student?.batchId) return [];
  return getMany(COLLECTIONS.ASSIGNMENTS, {
    where: [["batchId", "==", student.batchId]],
    orderBy: ["createdAt", "desc"],
    limit: 50
  });
}

export async function getSubmissions(student) {
  const { getMany } = await db();
  if (!student) return [];
  return getMany(COLLECTIONS.SUBMISSIONS, {
    where: [["studentId", "==", student.studentId]],
    limit: 100, useCache: false
  });
}

export async function getNotes(student) {
  const { getMany } = await db();
  if (!student?.courseId) return [];
  return getMany(COLLECTIONS.NOTES, {
    where: [["courseId", "==", student.courseId]],
    orderBy: ["createdAt", "desc"],
    limit: 60
  });
}

export async function getFees(student) {
  const { getMany } = await db();
  if (!student) return [];
  return getMany(COLLECTIONS.FEES, {
    where: [["studentId", "==", student.studentId]],
    orderBy: ["paidOn", "desc"],
    limit: 60, useCache: false
  });
}

export async function getCertificates(student) {
  const { getMany } = await db();
  if (!student) return [];
  return getMany(COLLECTIONS.CERTIFICATES, {
    where: [["studentId", "==", student.studentId]],
    limit: 20
  });
}

/**
 * Notifications visible to this student: all + their batch + directly targeted.
 * Firestore has no OR queries across fields, so three small queries are merged.
 */
export async function getNotifications(student) {
  const { getMany } = await db();
  const queries = [
    getMany(COLLECTIONS.NOTIFICATIONS, {
      where: [["audience", "==", "all"]],
      orderBy: ["createdAt", "desc"], limit: 30, useCache: false
    })
  ];
  if (student?.batchId) queries.push(getMany(COLLECTIONS.NOTIFICATIONS, {
    where: [["audience", "==", "batch"], ["batchId", "==", student.batchId]],
    orderBy: ["createdAt", "desc"], limit: 30, useCache: false
  }));
  if (student?.studentId) queries.push(getMany(COLLECTIONS.NOTIFICATIONS, {
    where: [["audience", "==", "student"], ["studentId", "==", student.studentId]],
    orderBy: ["createdAt", "desc"], limit: 30, useCache: false
  }));

  const results = await Promise.all(queries.map((q) => q.catch(() => [])));
  const seen = new Set();
  return results.flat()
    .filter((n) => (seen.has(n.id) ? false : seen.add(n.id)))
    .sort((a, b) => {
      const ta = a.createdAt?.seconds || 0, tb = b.createdAt?.seconds || 0;
      return tb - ta;
    });
}

export async function markNotificationRead(notificationId, studentId) {
  const { update, arrayUnion } = await db();
  return update(COLLECTIONS.NOTIFICATIONS, notificationId, { readBy: arrayUnion(studentId) });
}

/* ==========================================================================
   Actions
   ========================================================================== */

/** Student submits (or resubmits) an assignment file. */
export async function submitAssignment(student, assignment, file, existing, onProgress) {
  const { uploadFile } = await import("../../firebase/storage-service.js");
  const { create, update, serverTimestamp } = await db();
  const { STORAGE_PATHS } = await import("../core/constants.js");

  const up = await uploadFile(file, STORAGE_PATHS.submissions(assignment.id, student.studentId), {
    kind: "document", onProgress
  });

  const payload = {
    assignmentId: assignment.id,
    studentId: student.studentId,
    studentName: student.fullName || student.studentName || "",
    fileURL: up.url,
    fileName: file.name,
    submittedAt: serverTimestamp(),
    status: "submitted"
  };

  if (existing) {
    await update(COLLECTIONS.SUBMISSIONS, existing.id, {
      fileURL: up.url, fileName: file.name, submittedAt: serverTimestamp()
    });
    return existing.id;
  }
  return create(COLLECTIONS.SUBMISSIONS, payload);
}

/**
 * MCQ jama karna aur turant check hona.
 *
 * Kram bahut soch-samajh kar rakha gaya hai:
 *   1. Pehle jawab likhte hain — document ka id `<assignmentId>__<studentId>`
 *      hai, isliye ek student ek hi baar likh sakta hai (rules dobara likhna
 *      mana karte hain).
 *   2. Uske BAAD server se result maangte hain (`gradeMcq` Cloud Function).
 *
 * Marks ab BROWSER ME NAHI GINTE. Pehle ginte the, aur wahi sabse badi galti
 * thi: student console se apne hi paper me `marks: 100, status: "graded"`
 * likh sakta tha. Ab wo likhai rules mana karte hain aur ginti server par
 * hoti hai.
 */
export async function submitMcq(student, assignment, answers) {
  const { createWithId, serverTimestamp } = await db();
  const subId = `${assignment.id}__${student.studentId}`;

  await createWithId(COLLECTIONS.SUBMISSIONS, subId, {
    assignmentId: assignment.id,
    studentId: student.studentId,
    studentName: student.fullName || student.studentName || "",
    batchId: student.batchId || "",
    type: "mcq",
    answers,
    marks: null,
    status: "submitted",
    submittedAt: serverTimestamp()
  });

  return gradeMcq(student, assignment);
}

/**
 * Jama ho chuke jawab ko sahi jawab se milaakar marks lagata hai. Alag isliye
 * rakha hai ki agar submit ke theek baad net kat jaye (jawab chale gaye, marks
 * nahi lage) to student "Result nikalein" dabakar yahi dobara chala sake.
 */
export async function gradeMcq(student, assignment) {
  const { gradeMcq: callGrade } = await import("../../firebase/pay-service.js");
  return callGrade(assignment.id);
}

/** Student uploads a payment screenshot against a pending fee record. */
export async function uploadFeeProof(student, feeId, file, txnRef, onProgress) {
  const { uploadFile } = await import("../../firebase/storage-service.js");
  const { update } = await db();
  const { STORAGE_PATHS, FEE_STATUS } = await import("../core/constants.js");

  const up = await uploadFile(file, STORAGE_PATHS.feeProofs(student.studentId), {
    kind: "image", onProgress
  });
  await update(COLLECTIONS.FEES, feeId, {
    proofURL: up.url,
    txnRef: txnRef || "",
    status: FEE_STATUS.PENDING
  });
  return up.url;
}

/** Count a note download (best-effort). */
export async function bumpNoteDownloads(noteId) {
  try {
    const { update, increment } = await db();
    await update(COLLECTIONS.NOTES, noteId, { downloads: increment(1) });
  } catch { /* non-fatal */ }
}

/** Institute settings (Razorpay link, UPI id, contact). */
export async function getSettings() {
  const { getOne } = await db();
  return getOne(COLLECTIONS.SETTINGS, "institute", { ttl: 15 * 60 * 1000 });
}
