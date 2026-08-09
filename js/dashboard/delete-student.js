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
     admissions      — jis form se wo bana tha (student ke record me
                       `admissionId` naam se — `applicationNo` NAHI, wo
                       sirf admission ke apne record par hota hai)

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

/* Ek baar me itne se zyada record na to gine ja sakte hain na hataye —
   Firestore ki apni hadd hai. Isliye hataana CHAKKAR me hota hai: 500
   hatao, phir dobara poochho, jab tak khaali na ho jaye. Pehle sirf ek hi
   chakkar lagta tha, aur 500 se upar wala sab chup-chaap bacha rah jaata
   tha — B.Com jaise 36 mahine ke course me haazri itni ho hi jaati hai. */
const PAGE = 500;
const MAX_ROUNDS = 40;                            // 20,000 record — bas ka bas

/* Ek saath 8 delete — 700 record ek-ek karke hataane me do minute lag
   jaate the. Isse har record ki apni galti alag se pakdi bhi jaati hai
   (batch hota to ek galti poore batch ko gira deti). */
async function pool(items, size, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) { const n = i++; await fn(items[n], n); }
  }));
}

/**
 * Student ke record me admission ka pata `admissionId` me hota hai.
 *
 * YAHI BUG THA: yahan pehle `student.applicationNo` padha jaata tha, jo
 * students ke record par kabhi likha hi nahi jaata (na admin panel se, na
 * Cloud Function se — dono `admissionId` likhte hain). Nateeja: admission
 * form kabhi delete hota hi nahi tha, uska photo aur documents Storage me
 * pade rah jaate the, aur dialog "1 admission form" kabhi dikhata hi nahi
 * tha — matlab admin ye samajh kar "Haan" dabata tha ki sab ja raha hai.
 *
 * Sabse bada nuksaan: bacha hua admission `pending`/`approved` haalat me
 * rehta hai, aur uska payment link abhi bhi kaam karta hai — hataye gaye
 * student ke naam par paisa aa sakta tha.
 *
 * `applicationNo` fallback me isliye hai ki agar kabhi haath se banaya
 * koi purana record use rakhta ho to wo bhi saaf ho jaye.
 */
const admissionIdOf = (student) =>
  String(student.admissionId || student.applicationNo || "").trim();

/* Public verify wale chhote record — id certificate ka verifyCode hoti hai,
   studentId nahi, isliye ye neeche wali list se nahi mit-te. */
const VERIFY_CODES = "certificateCodes";

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
  const appNo = admissionIdOf(student);
  const { getMany, countOf } = await import("../../firebase/db-service.js");

  const out = { sid, appNo, rows: {}, counts: {}, files: [], user: null, admission: null, total: 0 };

  await Promise.all(LINKED.map(async (l) => {
    const where = [["studentId", "==", sid]];
    /* List sirf itni hi laate hain jitni file-path chunne ke liye chahiye;
       DIKHANE WALI GINTI server se aati hai, taaki 500 se upar wale record
       chhupein nahi. Count na mile to list ki lambai hi sach maan lete
       hain — jhoothi badi ginti dikhane se accha hai. */
    const [list, n] = await Promise.all([
      getMany(l.coll, { where, limit: PAGE, useCache: false }).catch(() => []),
      countOf(l.coll, { where }).catch(() => null)
    ]);
    out.rows[l.key] = list;
    out.counts[l.key] = typeof n === "number" ? n : list.length;
    out.total += out.counts[l.key];
  }));

  /* Login record: users me studentId se dhundhte hain */
  const users = await getMany(COLLECTIONS.USERS, {
    where: [["studentId", "==", sid]], limit: 5, useCache: false
  }).catch(() => []);
  out.user = users[0] || null;

  /* Admission form — student ke record me `admissionId` hota hai, aur wahi
     admission document ki apni ID bhi hai (SSZ-APP-2026-0001). */
  if (appNo) {
    const { getOne } = await import("../../firebase/db-service.js");
    out.admission = await getOne(COLLECTIONS.ADMISSIONS, appNo, { useCache: false })
      .catch(() => null);
  }

  /* Storage — folder me sach me kya pada hai, wahi ginte hain. Andaza
     lagane se galat number dikh jaata. `listFolderDeep` andar ke folder
     bhi khangalta hai; pehle wala `listFolder` sirf upri tah dekhta tha,
     isliye `students/<id>/documents/...` jaisi nested file chhoot jaati. */
  const { listFolderDeep } = await import("../../firebase/storage-service.js");
  const folders = [
    STORAGE_PATHS.studentRoot(sid),
    STORAGE_PATHS.feeProofs(sid)
  ];
  if (appNo) folders.push(STORAGE_PATHS.admissionPhoto(appNo));

  const seen = new Set();
  const add = (path) => {
    if (!path || seen.has(path)) return;
    seen.add(path);
    out.files.push({ path, name: String(path).split("/").pop() });
  };
  const lists = await Promise.all(folders.map((f) => listFolderDeep(f).catch(() => [])));
  lists.flat().forEach(add);

  /* Record me seedhe likhe hue file-path bhi (photo, documents, proof).
     Admission ke apne path bhi — agar kabhi student ke record me copy
     hone se pehle hi kuchh badla ho. */
  const a = out.admission || {};
  [
    student.photoPath, a.photoPath,
    ...(student.documents || []).map((d) => d.path),
    ...(a.documents || []).map((d) => d.path),
    ...out.rows.fees.map((f) => f.proofPath),
    ...out.rows.certificates.map((c) => c.filePath),
    ...out.rows.submissions.flatMap((s) => (s.files || []).map((x) => x.path))
  ].filter(Boolean).forEach(add);

  return out;
}

/* ==========================================================================
   Hataana
   ========================================================================== */
export async function deleteStudentCascade(student, fp, onStep = () => {}) {
  const sid = fp.sid;
  const { remove, getMany } = await import("../../firebase/db-service.js");
  const { deleteFile, listFolderDeep } = await import("../../firebase/storage-service.js");

  const problems = [];

  /* Kram maayne rakhta hai: pehle jude hue record, aakhir me student khud.
     Ulta karne par beech me kuchh atak jaaye to student to ja chuka hota
     hai aur baaki record anaath pade rehte hain — dhundhe bhi nahi ja
     sakte, kyunki jodne wala record hi nahi bacha. */
  for (const l of LINKED) {
    let done = 0;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      /* Har chakkar me TAAZA list — kyunki pichhla chakkar jo hata chuka
         hai wo ab aayega hi nahi. Isse 500 ki hadd apne aap tut jaati hai. */
      const list = round === 0 && (fp.rows[l.key] || []).length
        ? fp.rows[l.key]
        : await getMany(l.coll, {
            where: [["studentId", "==", sid]], limit: PAGE, useCache: false
          }).catch(() => []);
      if (!list.length) break;

      onStep(`${l.label} hata rahe hain… (${done}/${fp.counts?.[l.key] ?? list.length})`);
      await pool(list, 8, async (row) => {
        /* Certificate ke saath uska public verify wala record bhi jaana
           chahiye. Wo alag collection me hai (`certificateCodes`, id =
           verifyCode), isliye studentId wali safaai use chhoo hi nahi
           paati thi: student poora mit jaata aur uske certificate ka
           verify link duniya ko "asli hai" dikhata rehta. */
        if (l.key === "certificates" && row.verifyCode) {
          await remove(VERIFY_CODES, row.verifyCode)
            .catch((e) => problems.push(`${VERIFY_CODES}/${row.verifyCode}: ${e.message}`));
        }
        await remove(l.coll, row.id).catch((e) => problems.push(`${l.key}/${row.id}: ${e.message}`));
        done++;
      });

      if (list.length < PAGE) break;
      if (round === MAX_ROUNDS - 1) {
        problems.push(`${l.key}: ${MAX_ROUNDS * PAGE} se zyada record hain — dobara chalayein.`);
      }
    }
  }

  /* Storage ki files. Koi file na miley to koi baat nahi — ho sakta hai
     pehle hi hat chuki ho. */
  onStep("files hata rahe hain…");
  await pool(fp.files, 8, async (f) => {
    await deleteFile(f.path).catch(() => { /* pehle se nahi hai */ });
  });

  /* Ginti ke baad agar koi nayi file chadh gayi ho (ya deep list adhoori
     rah gayi ho) to ek aakhri sweep — folder khaali chhodna hi maqsad hai. */
  const sweep = [STORAGE_PATHS.studentRoot(sid), STORAGE_PATHS.feeProofs(sid)];
  if (fp.appNo) sweep.push(STORAGE_PATHS.admissionPhoto(fp.appNo));
  const left = (await Promise.all(sweep.map((p) => listFolderDeep(p).catch(() => [])))).flat();
  if (left.length) {
    onStep("bachi hui files hata rahe hain…");
    await pool(left, 8, async (p) => { await deleteFile(p).catch(() => {}); });
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

    const c = fp.counts || {};
    const line = (n, label) => (Number(n) > 0
      ? el("li", {}, el("strong", {}, String(n)), " ", label)
      : null);

    const body = el("div", {},
      el("p", { style: { fontSize: ".9rem", margin: "0 0 .85rem", lineHeight: "1.6" } },
        el("strong", {}, name), ` (${sid}) ka poora record hat jaayega. Ye wapas nahi aayega.`),

      el("p", { style: { fontSize: ".82rem", fontWeight: "700", margin: "0 0 .4rem", color: "var(--text-muted)" } },
        "Ye sab hatega:"),
      el("ul", { style: { margin: "0 0 1rem", paddingLeft: "1.2rem", fontSize: ".85rem", lineHeight: "1.9" } },
        el("li", {}, el("strong", {}, "1"), " student ka record"),
        line(c.attendance, "haazri ke record"),
        line(c.fees, "fee ke record (receipt samet)"),
        line(c.submissions, "assignment ke jawab"),
        line(c.certificates, "certificate"),
        line(c.notifications, "inko bheje gaye sandesh"),
        fp.admission ? el("li", {}, `1 admission form (${fp.admission.id})`) : null,
        fp.user ? el("li", {}, "1 login record — iske baad ye login nahi kar payenge") : null,
        line(fp.files.length, "file (photo, documents, screenshot)")),

      /* Agar admission ka pata to hai par form mila nahi, to chup mat
         raho — wo record kahin pada hai aur uska payment link abhi bhi
         chalega. Admin ko pata hona chahiye. */
      (fp.appNo && !fp.admission)
        ? el("p", {
            style: {
              fontSize: ".8rem", lineHeight: "1.6", margin: "0 0 1rem",
              padding: ".6rem .7rem", borderRadius: "8px",
              background: "rgba(245,158,11,.1)", border: "1px solid rgba(180,83,9,.3)"
            }
          },
            el("strong", {}, "Dhyaan dein: "),
            `admission form ${fp.appNo} khula nahi — wo alag se dekh lein.`)
        : null,

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
