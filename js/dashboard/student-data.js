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
export async function getStudent(user) {
  const { getOne, getMany } = await db();

  if (user.studentId) {
    const doc = await getOne(COLLECTIONS.STUDENTS, user.studentId);
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
  return getMany(COLLECTIONS.LIVE_CLASSES, {
    where: [["batchId", "==", student.batchId]],
    orderBy: ["startsAt", "desc"],
    limit: 40
  });
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
