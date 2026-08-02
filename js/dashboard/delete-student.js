/* ==========================================================================
   Soft Skill Zone — Student ka poora record hataana (cascade delete)
   --------------------------------------------------------------------------
   Ek student ka record akela nahi hota. Wo AATH jagah faila hota hai:

     students        — khud ka record
     attendance      — har din ki haazri
     fees            — har payment aur receipt
     submissions     — assignment ke jawab
     certificates    — jo bhi certificate bane
     notifications   — sirf usko bheje gaye sandesh
     users           — uska login record
     admissions      — jis form se wo bana tha

   ...aur Storage me CHAAR folder: uska photo aur documents, fee ke
   screenshot, assignment ki files, aur certificate ki PDF.

   Firebase Console se haath se hataane par inme se kuchh na kuchh chhoot
   hi jaata hai. Chhoote hue record kisi ko dikhte nahi, par report ki
   ginti bigaadte rehte hain aur Storage ka bill khaate rehte hain.

   Isliye pehle POORI GINTI dikhayi jaati hai, fir Student ID likhwa kar
   pakka kiya jaata hai — "Haan" dabaana bahut aasaan hai, aur ye kaam
   wapas nahi hota.

   Ek cheez jo yahan se NAHI ho sakti: Firebase Authentication ka login
   account. Use hataane ke liye server chahiye (Admin SDK), browser se
   nahi hota. `users` wala record hatne se login band ho jaata hai, par
   account khud Console → Authentication me pada rehta hai. Ye dialog me
   saaf likha jaata hai — chhupaana theek nahi.
   ========================================================================== */

import { el } from "../core/dom.js";
import { open as openModal } from "../core/modal.js";
import { COLLECTIONS, STORAGE_PATHS } from "../core/constants.js";

/* Kaun-kaun si jagah studentId se judi hui hai */
const LINKED = [
  { key: "attendance",    coll: COLLECTIONS.ATTENDANCE,    label: "haazri ke record" },
  { key: "fees",          coll: COLLECTIONS.FEES,          label: "fee ke record" },
  { key: "submissions",   coll: COLLECTIONS.SUBMISSIONS,   label: "assignment ke jawab" },
  { key: "certificates",  coll: COLLECTIONS.CERTIFICATES,  label: "certificate" },
  { key: "notifications", coll: COLLECTIONS.NOTIFICATIONS, label: "sirf inko bheje sandesh" }
];

/* ==========================================================================
   Ginti — hataane se PEHLE kya-kya jaayega
   ========================================================================== */
export async function studentFootprint(student) {
  const sid = student.studentId || student.id;
  const { getMany } = await import("../../firebase/db-service.js");

  const out = { sid, rows: {}, files: [], user: null, admission: null, total: 0 };

  await Promise.all(LINKED.map(async (l) => {
    const list = await getMany(l.coll, {
      where: [["studentId", "==", sid]], limit: 500, useCache: false
    }).catch(() => []);
    out.rows[l.key] = list;
    out.total += list.length;
  }));

  /* Login record: users me studentId se dhundhte hain */
  const users = await getMany(COLLECTIONS.USERS, {
    where: [["studentId", "==", sid]], limit: 5, useCache: false
  }).catch(() => []);
  out.user = users[0] || null;

  /* Admission form — student ke record me applicationNo hota hai */
  if (student.applicationNo) {
    const { getOne } = await import("../../firebase/db-service.js");
    out.admission = await getOne(COLLECTIONS.ADMISSIONS, student.applicationNo, { useCache: false })
      .catch(() => null);
  }

  /* Storage — folder me sach me kya pada hai, wahi ginte hain. Andaza
     lagane se galat number dikh jaata. */
  const { listFolder } = await import("../../firebase/storage-service.js");
  const folders = [
    STORAGE_PATHS.studentRoot(sid),
    STORAGE_PATHS.studentDocs(sid),
    STORAGE_PATHS.feeProofs(sid)
  ];
  if (student.applicationNo) folders.push(STORAGE_PATHS.admissionDocs(student.applicationNo),
                                          STORAGE_PATHS.admissionPhoto(student.applicationNo));

  const seen = new Set();
  for (const f of folders) {
    const items = await listFolder(f).catch(() => []);
    items.forEach((it) => { if (!seen.has(it.path)) { seen.add(it.path); out.files.push(it); } });
  }
  /* Record me seedhe likhe hue file-path bhi (photo, documents, proof) */
  const direct = [
    student.photoPath,
    ...(student.documents || []).map((d) => d.path).filter(Boolean),
    ...out.rows.fees.map((f) => f.proofPath).filter(Boolean),
    ...out.rows.certificates.map((c) => c.filePath).filter(Boolean),
    ...out.rows.submissions.flatMap((s) => (s.files || []).map((x) => x.path)).filter(Boolean)
  ].filter(Boolean);
  direct.forEach((p) => { if (!seen.has(p)) { seen.add(p); out.files.push({ path: p, name: p.split("/").pop(), size: 0 }); } });

  return out;
}

/* ==========================================================================
   Hataana
   ========================================================================== */
export async function deleteStudentCascade(student, fp, onStep = () => {}) {
  const sid = fp.sid;
  const { remove } = await import("../../firebase/db-service.js");
  const { deleteFile } = await import("../../firebase/storage-service.js");

  const problems = [];

  /* Kram maayne rakhta hai: pehle jude hue record, aakhir me student khud.
     Ulta karne par beech me kuchh atak jaaye to student to ja chuka hota
     hai aur baaki record anaath pade rehte hain — dhundhe bhi nahi ja
     sakte, kyunki jodne wala record hi nahi bacha. */
  for (const l of LINKED) {
    const list = fp.rows[l.key] || [];
    for (const row of list) {
      onStep(`${l.label} hata rahe hain…`);
      await remove(l.coll, row.id).catch((e) => problems.push(`${l.key}/${row.id}: ${e.message}`));
    }
  }

  /* Storage ki files. Koi file na miley to koi baat nahi — ho sakta hai
     pehle hi hat chuki ho. */
  for (const f of fp.files) {
    onStep("files hata rahe hain…");
    await deleteFile(f.path).catch(() => { /* pehle se nahi hai */ });
  }

  if (fp.admission) {
    onStep("admission form hata rahe hain…");
    await remove(COLLECTIONS.ADMISSIONS, fp.admission.id)
      .catch((e) => problems.push(`admission: ${e.message}`));
  }

  if (fp.user) {
    onStep("login record hata rahe hain…");
    await remove(COLLECTIONS.USERS, fp.user.id)
      .catch((e) => problems.push(`users: ${e.message}`));
  }

  onStep("student ka record hata rahe hain…");
  await remove(COLLECTIONS.STUDENTS, student.id).catch((e) => problems.push(`student: ${e.message}`));

  return problems;
}

/* ==========================================================================
   Dialog
   ========================================================================== */
export function confirmDeleteStudent(student, fp) {
  return new Promise((resolve) => {
    const sid = fp.sid;
    const name = student.fullName || sid;

    const line = (n, label) => (n > 0
      ? el("li", {}, el("strong", {}, String(n)), " ", label)
      : null);

    const body = el("div", {},
      el("p", { style: { fontSize: ".9rem", margin: "0 0 .85rem", lineHeight: "1.6" } },
        el("strong", {}, name), ` (${sid}) ka poora record hat jaayega. Ye wapas nahi aayega.`),

      el("p", { style: { fontSize: ".82rem", fontWeight: "700", margin: "0 0 .4rem", color: "var(--text-muted)" } },
        "Ye sab hatega:"),
      el("ul", { style: { margin: "0 0 1rem", paddingLeft: "1.2rem", fontSize: ".85rem", lineHeight: "1.9" } },
        el("li", {}, el("strong", {}, "1"), " student ka record"),
        line(fp.rows.attendance.length, "haazri ke record"),
        line(fp.rows.fees.length, "fee ke record (receipt samet)"),
        line(fp.rows.submissions.length, "assignment ke jawab"),
        line(fp.rows.certificates.length, "certificate"),
        line(fp.rows.notifications.length, "inko bheje gaye sandesh"),
        fp.admission ? el("li", {}, "1 admission form") : null,
        fp.user ? el("li", {}, "1 login record — iske baad ye login nahi kar payenge") : null,
        line(fp.files.length, "file (photo, documents, screenshot)")),

      fp.user
        ? el("p", {
            style: {
              fontSize: ".8rem", lineHeight: "1.6", margin: "0 0 1rem",
              padding: ".6rem .7rem", borderRadius: "8px",
              background: "rgba(245,158,11,.1)", border: "1px solid rgba(180,83,9,.3)"
            }
          },
            el("strong", {}, "Ek cheez yahan se nahi hoti: "),
            "Firebase ka login account (email/password) browser se delete nahi ho sakta. Login to band ho jaayega, ",
            "par account hataane ke liye Firebase Console → Authentication me jaana padega.")
        : null,

      el("div", { class: "field" },
        el("label", { class: "field__label", for: "delSid" },
          "Pakka karne ke liye Student ID likhein: ", el("code", {}, sid)),
        el("input", {
          class: "input-ssz", id: "delSid", type: "text", autocomplete: "off",
          spellcheck: "false", placeholder: sid
        }))
    );

    const go = el("button", { class: "btn-ssz btn-danger-ssz", type: "button", disabled: true },
      "Haan, poora hata dein");
    const no = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Rehne dein");

    const m = openModal({ title: "Student ka record hataayein?", body, footer: [no, go] });

    /* Button tabhi khulta hai jab ID bilkul theek likhi ho — galti se
       delete ho jaana yahan sabse bada khatra hai. */
    const input = body.querySelector("#delSid");
    input.addEventListener("input", () => {
      go.disabled = input.value.trim().toUpperCase() !== sid.toUpperCase();
    });

    let done = false;
    no.addEventListener("click", () => { done = true; m.close(); resolve(false); });
    go.addEventListener("click", () => { done = true; m.close(); resolve(true); });
    /* Modal backdrop se band ho jaye to bhi "nahi" hi maana jaayega */
    setTimeout(() => {
      const check = setInterval(() => {
        if (!document.body.contains(body)) { clearInterval(check); if (!done) resolve(false); }
      }, 400);
    }, 100);
  });
}
