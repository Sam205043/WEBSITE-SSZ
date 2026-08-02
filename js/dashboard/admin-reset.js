/* ==========================================================================
   Soft Skill Zone — Platform reset (test data poori tarah hataana)
   --------------------------------------------------------------------------
   Ye ek baar ka auzaar hai: jab tak sab kuchh test ke liye bana tha, aur ab
   asli shuruaat karni hai. Isiliye ise sidebar me nahi rakha gaya — roz ke
   kaam ke beech aisa button rakhna theek nahi. Sirf pate se khulta hai.

   Teen cheezein jo yahan jaan-bujh kar aisi hain:

   1) ADMIN KA LOGIN KABHI NAHI HATEGA. `users` me se sirf wahi record
      hatte hain jinka role admin nahi hai. Ye code me pakka kiya gaya hai,
      checkbox se nahi — kyunki khud ko panel se bahar kar lena wo galti
      hai jiska koi ilaaj panel ke andar se nahi hota.

   2) Counter ka record HATA diya jaata hai, 0 nahi kiya jaata.
      nextSequence() dekhta hai ki record hai ya nahi — na mile to seedhe
      1 se shuru karta hai. Isliye hataana hi sahi tareeka hai.

   3) Storage ki safai gehri (recursive) hai. listFolder sirf upar ki tah
      dekhta hai; andar ke folder ki files chupchaap padi reh jaati hain.
      Isliye listFolderDeep.

   Jo yahan se NAHI ho sakta: Firebase Authentication ke login account.
   Unke liye server chahiye. Screen unki suchi bana kar de deti hai taaki
   Console me ek-ek karke hataye ja sakein.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { initAdminShell } from "./admin-shell.js";
import { COLLECTIONS } from "../core/constants.js";
import toast from "../core/toast.js";

const CONFIRM_WORD = "SAB HATA DEIN";

/* Kya-kya hatega. `keep` wali cheezein screen par dikhti to hain, par
   chhui nahi jaatin. */
const WIPE = [
  { key: "STUDENTS",       label: "Students" },
  { key: "ADMISSIONS",     label: "Admission forms" },
  { key: "FEES",           label: "Fee record aur receipt" },
  { key: "ATTENDANCE",     label: "Haazri" },
  { key: "SUBMISSIONS",    label: "Assignment ke jawab" },
  { key: "CERTIFICATES",   label: "Certificates" },
  { key: "NOTIFICATIONS",  label: "Notifications" },
  { key: "LIVE_CLASSES",   label: "Live classes" },
  { key: "ENQUIRIES",      label: "Enquiries" },
  { key: "BATCHES",        label: "Batches" }
];

const KEEP = [
  { key: "NOTES",           label: "Notes (padhai ki files)", why: "aapne rakhne ko kaha" },
  { key: "ASSIGNMENTS",     label: "Assignments",             why: "aapne rakhne ko kaha" },
  { key: "ASSIGNMENT_KEYS", label: "MCQ answer keys",         why: "assignment ke saath" },
  { key: "GALLERY",         label: "Gallery photos",          why: "asli content hai" },
  { key: "FACULTY",         label: "Faculty",                 why: "asli content hai" },
  { key: "REVIEWS",         label: "Reviews",                 why: "asli content hai" },
  { key: "BLOG",            label: "Blog",                    why: "asli content hai" },
  { key: "FAQ",             label: "FAQ",                     why: "asli content hai" },
  { key: "SETTINGS",        label: "Settings",                why: "institute ki jaankari" }
];

/* Storage ke wo folder jo poori tarah khaali hone hain. notes/ aur
   public/ jaan-bujh kar chhode gaye hain. */
const WIPE_FOLDERS = ["students", "admissions", "fees", "certificates", "submissions"];

let mode = "preview";
let scan = null;
let busy = false;

/* ==========================================================================
   Ginti
   ========================================================================== */
async function doScan() {
  const { getMany } = await import("../../firebase/db-service.js");
  const { listFolderDeep } = await import("../../firebase/storage-service.js");

  const count = async (name) =>
    (await getMany(COLLECTIONS[name], { limit: 1000, useCache: false }).catch(() => [])).length;

  const out = { wipe: {}, keep: {}, users: [], counters: [], files: [], authEmails: [] };

  for (const w of WIPE) out.wipe[w.key] = await count(w.key);
  for (const k of KEEP) out.keep[k.key] = await count(k.key);

  const users = await getMany(COLLECTIONS.USERS, { limit: 500, useCache: false }).catch(() => []);
  out.users = users;
  out.authEmails = users.filter((u) => u.role !== "admin").map((u) => u.email).filter(Boolean);

  out.counters = await getMany(COLLECTIONS.COUNTERS, { limit: 100, useCache: false }).catch(() => []);

  const lists = await Promise.all(WIPE_FOLDERS.map((f) => listFolderDeep(f).catch(() => [])));
  out.files = lists.flat();

  return out;
}

/* ==========================================================================
   Screen
   ========================================================================== */
function row(label, n, action, why) {
  return el("tr", {},
    el("td", {}, label),
    el("td", { class: "num" }, String(n)),
    el("td", {},
      el("span", { class: `badge-ssz ${action === "hatega" ? "badge-danger" : "badge-success"}` },
        action === "hatega" ? "Hatega" : "Rahega"),
      why ? el("span", { style: { fontSize: ".76rem", color: "var(--text-muted)", marginLeft: ".45rem" } }, why) : null));
}

function paint() {
  if (!scan) return;

  const admin = scan.users.filter((u) => u.role === "admin");
  const others = scan.users.filter((u) => u.role !== "admin");
  const totalRows = Object.values(scan.wipe).reduce((a, b) => a + b, 0) + others.length + scan.counters.length;

  render($("#rsTable"),
    el("table", { class: "table-ssz" },
      el("thead", {}, el("tr", {},
        el("th", {}, "Kya"), el("th", { class: "num" }, "Kitne"), el("th", {}, "Kya hoga"))),
      el("tbody", {},
        WIPE.map((w) => row(w.label, scan.wipe[w.key], "hatega")),
        row("Student logins", others.length, "hatega"),
        row("Aapka admin login", admin.length, "rahega", "kabhi nahi hatega"),
        row("ID ki ginti (counters)", scan.counters.length, "hatega", "taaki 1 se shuru ho"),
        row("Storage ki files", scan.files.length, "hatega"),
        KEEP.filter((k) => scan.keep[k.key] > 0).map((k) => row(k.label, scan.keep[k.key], "rahega", k.why))
      )));

  $("#rsTotal").textContent = `${totalRows} record + ${scan.files.length} file`;

  /* Counter kis haal me hain — student ko ye dikhna chahiye ki numbering
     sach me 1 se shuru hogi. */
  render($("#rsCounters"), scan.counters.length
    ? scan.counters.map((c) => el("li", {},
        el("code", {}, c.id), ` abhi ${c.value ?? 0} par hai → hatne ke baad agla 1 banega`))
    : el("li", {}, "Koi counter nahi — numbering waise bhi 1 se shuru hogi."));

  render($("#rsAuth"), scan.authEmails.length
    ? scan.authEmails.map((e) => el("li", {}, el("code", {}, e)))
    : el("li", {}, "Koi student login nahi — yahan kuchh nahi karna."));

  $("#rsAuthBox").hidden = !scan.authEmails.length;
}

/* ==========================================================================
   Backup — aapne mana kiya tha, par button rakha hai
   ========================================================================== */
async function downloadBackup() {
  const { getMany } = await import("../../firebase/db-service.js");
  const all = {};
  const names = [...WIPE.map((w) => w.key), ...KEEP.map((k) => k.key), "USERS", "COUNTERS"];
  for (const n of names) {
    all[n] = await getMany(COLLECTIONS[n], { limit: 1000, useCache: false }).catch(() => []);
  }
  const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ssz-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast.success("Backup download ho gaya.");
}

/* ==========================================================================
   Safai
   ========================================================================== */
function log(msg) {
  const box = $("#rsLog");
  box.hidden = false;
  box.appendChild(el("div", {}, msg));
  box.scrollTop = box.scrollHeight;
}

async function runReset() {
  busy = true;
  $("#rsGo").disabled = true;
  $("#rsScan").disabled = true;
  $("#rsLog").replaceChildren();

  const { getMany, remove } = await import("../../firebase/db-service.js");
  const { deleteFile } = await import("../../firebase/storage-service.js");
  const problems = [];

  /* Kram: pehle jude hue record, aakhir me students aur batches. Ulta
     karne par beech me kuchh atak jaye to jodne wala record hi nahi
     bachta aur baaki dhundhe nahi ja sakte. */
  const order = ["ATTENDANCE", "SUBMISSIONS", "FEES", "CERTIFICATES", "NOTIFICATIONS",
                 "LIVE_CLASSES", "ENQUIRIES", "ADMISSIONS", "STUDENTS", "BATCHES"];

  for (const key of order) {
    const label = WIPE.find((w) => w.key === key).label;
    const list = await getMany(COLLECTIONS[key], { limit: 1000, useCache: false }).catch(() => []);
    if (!list.length) { log(`${label} — pehle se khaali`); continue; }
    log(`${label} — ${list.length} hata rahe hain…`);
    for (const r of list) {
      await remove(COLLECTIONS[key], r.id).catch((e) => problems.push(`${key}/${r.id}: ${e.message}`));
    }
  }

  /* Logins — admin ko chhod kar. Ye jaanch yahan dobara hoti hai, screen
     par jo dikha tha uspar bharosa nahi kiya jaata. */
  const users = await getMany(COLLECTIONS.USERS, { limit: 500, useCache: false }).catch(() => []);
  const others = users.filter((u) => u.role !== "admin");
  log(`Student logins — ${others.length} hata rahe hain (admin ko chhod kar)…`);
  for (const u of others) {
    await remove(COLLECTIONS.USERS, u.id).catch((e) => problems.push(`users/${u.id}: ${e.message}`));
  }

  /* Counters — hataane par nextSequence() apne aap 1 se shuru karta hai */
  const counters = await getMany(COLLECTIONS.COUNTERS, { limit: 100, useCache: false }).catch(() => []);
  log(`ID ki ginti — ${counters.length} hata rahe hain…`);
  for (const c of counters) {
    await remove(COLLECTIONS.COUNTERS, c.id).catch((e) => problems.push(`counters/${c.id}: ${e.message}`));
  }

  /* Storage — gehri safai */
  const { listFolderDeep } = await import("../../firebase/storage-service.js");
  for (const f of WIPE_FOLDERS) {
    const paths = await listFolderDeep(f).catch(() => []);
    if (!paths.length) { log(`Storage /${f} — pehle se khaali`); continue; }
    log(`Storage /${f} — ${paths.length} file hata rahe hain…`);
    for (const p of paths) await deleteFile(p).catch(() => { /* pehle se nahi hai */ });
  }

  busy = false;
  $("#rsScan").disabled = false;

  if (problems.length) {
    console.warn("[reset] ye nahi hate:", problems);
    log(`— ${problems.length} cheez nahi hat payi (console me suchi hai)`);
    toast.warning(`${problems.length} cheez nahi hat payi — console dekh lein.`);
  } else {
    log("— sab ho gaya.");
    toast.success("Platform saaf ho gaya. Ab asli shuruaat.");
  }

  $("#rsDone").hidden = false;
  scan = await doScan();
  paint();
}

/* ==========================================================================
   Boot
   ========================================================================== */
const shell = await initAdminShell({ active: "", title: "Reset" });
mode = shell.mode;

onReady(async () => {
  const input = $("#rsConfirm");
  const go = $("#rsGo");

  input.addEventListener("input", () => {
    go.disabled = busy || input.value.trim().toUpperCase() !== CONFIRM_WORD;
  });

  $("#rsScan").addEventListener("click", async () => {
    if (mode === "preview") return toast.info("Preview mode: Firebase connect hone ke baad chalega.");
    $("#rsScan").disabled = true;
    $("#rsScan").textContent = "Gin rahe hain…";
    try {
      scan = await doScan();
      paint();
      $("#rsResult").hidden = false;
    } catch (e) { toast.error(e.message || "Ginti nahi ho payi."); }
    finally { $("#rsScan").disabled = false; $("#rsScan").textContent = "Dobara ginein"; }
  });

  $("#rsBackup").addEventListener("click", async () => {
    if (mode === "preview") return toast.info("Preview mode.");
    $("#rsBackup").disabled = true;
    try { await downloadBackup(); }
    catch (e) { toast.error(e.message || "Backup nahi bana."); }
    finally { $("#rsBackup").disabled = false; }
  });

  go.addEventListener("click", async () => {
    if (mode === "preview") return toast.info("Preview mode.");
    if (!scan) return toast.warning("Pehle ginti kar lein.");
    try { await runReset(); }
    catch (e) { toast.error(e.message || "Reset me dikkat aayi."); busy = false; }
  });

  /* Khulte hi ginti — screen khaali dikhne se koi samajh nahi paata */
  if (mode === "live") $("#rsScan").click();
});
