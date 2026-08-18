/* ==========================================================================
   Soft Skill Zone — anuvaad ki jaanch
   --------------------------------------------------------------------------
   KYUN ZAROORAT PADI

   Journal Entry tool mahinon tak English chunne par bhi Hinglish me khulta
   raha aur kisi ko pata nahi chala — kyunki adhoora anuvaad page todta nahi,
   wo chup-chaap Hinglish dikha deta hai. Wahi khoobi jo site ko bachati hai,
   wahi galti chhupa bhi leti hai.

   Isliye ye script. Ye har bank ko padh kar batata hai ki kis bhasha me
   kitni line ka anuvaad abhi baaki hai. Upload se pehle ise chalaiye.

       node tools/lang-check.mjs            saari bhasha, saare bank
       node tools/lang-check.mjs en quiz    sirf ek

   Jab tak "sab poora" na likhe, kaam adhoora hai.

   JO LINE ANUVAAD MAANGTI HI NAHI

   Option me bahut kuchh aisa hai jo har bhasha me wahi rehta hai — Ctrl+C,
   $B$2, #REF!, Windows + E, CPU. Inhe ginti me lena bekaar ka dabaav banata
   hai, isliye `translatable()` unhe chhod deta hai.
   ========================================================================== */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Jin bhasha ka anuvaad hona chahiye. Hinglish source hai, uska anuvaad
   nahi hota. */
const LANGS = ["en", "hi"];

/* ------------------------------------------------------------------ tukde */

/**
 * Kya is line ka anuvaad hona chahiye?
 *
 * PEHLA NIYAM GALAT THA — ye galti dohrai na jaye
 *
 * Shuru me niyam ye tha: "sirf angrezi akshar aur do se kam shabd" wali line
 * ko technical maan kar chhod do. Iska nateeja ye hua ki "robot kharidna",
 * "staff hatana", "Alag rang" jaisi 575 saaf-saaf Hinglish line chup-chaap
 * chhoot gayi — aur script khush hokar "100% poora" bolta raha, jabki quiz
 * me option Hinglish me hi dikh raha tha.
 *
 * Sabak: Hinglish bhi angrezi akshar me hi likhi jaati hai. Sirf akshar dekh
 * kar faisla nahi ho sakta. Isliye ab default hai "anuvaad chahiye", aur
 * chhoota sirf wahi hai jo sach me code jaisa dikhta ho.
 */
/* Hinglish ke wo shabd jo lagbhag har vaakya me aate hain. Inme se ek bhi
   mil gaya to line pakki Hinglish hai — chahe usme Ctrl+S ya / kyun na ho.
   Ye jaanch sabse pehle hoti hai, warna "Ctrl + S kya karta hai?" shortcut
   samajh kar chhoot jaata tha. */
const HINGLISH = /\b(se|ka|ki|ke|ko|me|mein|par|hai|hain|tha|thi|the|kya|kaun|kaunsa|kyun|kaise|nahi|nahin|karna|karta|karte|karein|hota|hoti|jaata|jaati|wala|wali|aur|bhi|jo|ye|wo|liye|sakta|sakte|kijiye|chuniye|chunein|dekhein|apna|apne|hamesha|shuru|aakhir|aakhri|kisme|kahan|jahan|khaali|wahan|koi|kuchh|sirf|bina|jaise|likhein|likhiye|lagayein|rakhein|milega|maangta)\b/i;

export function translatable(t) {
  if (typeof t !== "string") return false;
  const s = t.trim();
  if (s.length < 2) return false;
  /* Underscore ko space maan kar dekhna zaroori hai. Function ke roop
     (`sig`) me naam aise likhe jaate hain: "SUMIF(kahan_dekhein, shart, …)".
     Seedhi jaanch me `\bkahan\b` nahi milta — underscore bhi shabd ka hi
     akshar hai, isliye wahan shabd ki seema banti hi nahi. Isi ek wajah se
     saat `sig` line chup-chaap Hinglish me reh gayi thin. */
  if (HINGLISH.test(s.replace(/_/g, " "))) return true;                // pehle ye
  if (/^(Ctrl|Alt|Shift|Windows|Fn|Cmd)\s*\+/i.test(s)) return false;  // Ctrl+C
  if (/[$#=<>\\/*[\]{}|~^]/.test(s)) return false;                     // $B$2, =SUM(), File > Save
  if (/\.[a-z]{2,4}$/i.test(s) && !s.includes(" ")) return false;      // .xlsx, .pptx
  if (s === s.toUpperCase()) return false;                             // GIGO, CPU, ASDF JKL;
  if (!/[a-z]/.test(s)) return false;                                  // sirf ank ya chinh
  return true;
}
/* NOTE — "ek shabd hai to chhod do" wala niyam bhi hataya gaya.
   "hamesha", "sahi", "galat" ek hi shabd hain aur unka anuvaad bahut zaroori
   hai. Ulta, "30 din" ko pehle "ginti se shuru hota hai" kehkar chhoda ja raha
   tha — wo bhi galat tha. Ab chhoota sirf wahi hai jisme code wale chinh hon,
   ya jo poora bada akshar me ho, ya jisme ek bhi chhota akshar na ho.

   Lambai ki hadd bhi 3 se ghatakar 2 ki gayi — "do" (matlab 2), "ek", "das",
   "roz" teen ya do akshar ke hain aur unka anuvaad zaroori hai. "do" bina
   anuvaad ke English me angrezi ka verb "do" jaisa padha jaata tha. Isse
   kuchh technical tukde (RAM, PDF, F5) bhi ginti me aa gaye — unka anuvaad
   unka apna naam hi likh diya gaya hai, taaki script sach bole. */

/** Ginti ki jagah {n} — i18n.js jaisa hi. Dono jagah ek jaisa rehna chahiye. */
const NUM_RE = /\d+(?:[.,]\d+)*/g;
export const shape = (t) => t.replace(NUM_RE, "{n}");

/* ------------------------------------------------------- bank se line nikalna
   Har bank ka apna dhaancha hai, isliye har ek ka apna nikalne wala. */

const BANKS = {
  quiz: {
    label: "Mega Quiz + assignment",
    file: "js/config/question-bank.js",
    async lines() {
      const m = await import(join(ROOT, "js/config/question-bank.js"));
      const out = new Set();
      for (const q of m.QUESTION_BANK) {
        out.add(q.q);
        for (const o of q.o) out.add(o);
      }
      for (const mod of m.BANK_MODULES) out.add(mod);
      return out;
    }
  },
  journal: {
    label: "Journal Entry Practice",
    file: "js/config/journal-bank.js",
    async lines() {
      const m = await import(join(ROOT, "js/config/journal-bank.js"));
      const out = new Set();
      for (const e of m.JOURNAL) out.add(e.q);
      for (const c of m.CHAPTERS) out.add(c.label);
      return out;
    }
  },
  interview: {
    label: "Interview Q&A",
    file: "js/config/interview-bank.js",
    async lines() {
      const m = await import(join(ROOT, "js/config/interview-bank.js"));
      const out = new Set();
      const bank = m.INTERVIEW_QA || [];
      for (const e of bank) {
        if (e.q) out.add(e.q);
        if (e.a) out.add(e.a);
      }
      for (const t of (m.QA_TOPICS || [])) out.add(typeof t === "string" ? t : t.label || "");
      out.delete("");
      return out;
    }
  },

  /* ---- Excel ke chaar tool, GST quiz aur Shortcut trainer ----
     In sab me FORMULA ko haath nahi lagana. `a`, `hint`, `want` aur `demo`
     ka formula wala hissa jaisa hai waisa hi rehta hai — usme likha text
     (jaise "Nahi mila") formula ka nateeja hai, jise tool jaanchta hai.
     Anuvaad sirf us text ka hota hai jo student PADHTA hai. */

  formula: {
    label: "Excel formula explainer",
    file: "js/config/excel-function-bank.js",
    async lines() {
      const m = await import(join(ROOT, "js/config/excel-function-bank.js"));
      const out = new Set(m.FUNCTION_GROUPS || []);
      for (const f of Object.values(m.EXCEL_FUNCTIONS || {})) {
        if (f.one) out.add(f.one);
        if (f.how) out.add(f.how);
        /* sig me parameter ke naam Hinglish me hain — FIND(kya, kisme, …) */
        if (f.sig) out.add(f.sig);
      }
      return out;
    }
  },

  excelerror: {
    label: "Excel error finder",
    file: "js/config/excel-error-bank.js",
    async lines() {
      const m = await import(join(ROOT, "js/config/excel-error-bank.js"));
      const out = new Set();
      for (const e of (m.EXCEL_ERRORS || [])) {
        if (e.name) out.add(e.name);
        if (e.one) out.add(e.one);
        /* demo ka formula to code hai, par uske aage ka samjhaav padha jaata hai */
        if (e.demo) out.add(e.demo);
        for (const w of (e.why || [])) { if (w.cause) out.add(w.cause); if (w.fix) out.add(w.fix); }
      }
      return out;
    }
  },

  excelpractice: {
    label: "Excel formula practice",
    file: "js/config/excel-bank.js",
    async lines() {
      const m = await import(join(ROOT, "js/config/excel-bank.js"));
      const out = new Set(m.EXCEL_LEVELS || []);
      for (const q of (m.EXCEL_QUESTIONS || [])) if (q.q) out.add(q.q);
      return out;
    }
  },

  lessons: {
    label: "Excel lessons",
    file: "js/config/excel-lessons.js",
    async lines() {
      const m = await import(join(ROOT, "js/config/excel-lessons.js"));
      const out = new Set();
      for (const L of (m.LESSONS || [])) {
        for (const k of ["title", "level", "about"]) if (L[k]) out.add(L[k]);
        for (const v of Object.values(L.data || {})) if (typeof v === "string") out.add(v);
        for (const t of (L.tasks || [])) { if (t.say) out.add(t.say); if (t.hint) out.add(t.hint); }
      }
      return out;
    }
  },

  shortcut: {
    label: "Shortcut trainer",
    file: "js/config/shortcut-bank.js",
    async lines() {
      const m = await import(join(ROOT, "js/config/shortcut-bank.js"));
      const out = new Set(m.SHORTCUT_GROUPS || []);
      for (const s of (m.SHORTCUTS || [])) if (s[1]) out.add(s[1]);
      return out;
    }
  },

  gst: {
    label: "GST quiz + HSN",
    file: "js/tools/tool-data.js",
    async lines() {
      const m = await import(join(ROOT, "js/tools/tool-data.js"));
      const out = new Set();
      for (const q of (m.GST_QUIZ || [])) {
        if (q.q) out.add(q.q);
        for (const o of (q.options || [])) out.add(o);
        if (q.why) out.add(q.why);
      }
      for (const h of (m.HSN_DATA || [])) { if (h.desc) out.add(h.desc); if (h.chapter) out.add(h.chapter); }
      return out;
    }
  }
};

/* ------------------------------------------------------------------ jaanch */

/* Chhote tools ka anuvaad ek hi file me rehta hai — alag-alag 6 file banane
   se koi fayda nahi tha, aur sab ek hi page par bhi nahi khulte. */
const PACK_FILE = {
  formula: "tools", excelerror: "tools", excelpractice: "tools",
  lessons: "tools", shortcut: "tools", gst: "tools"
};

function loadPack(lang, name) {
  /* Bade bank ka anuvaad alag file me rehta hai (lazy pack). Chhoti cheezein
     seedhe main dictionary me bhi ho sakti hain, isliye dono dekhte hain. */
  const merged = {};
  const file = PACK_FILE[name] || name;
  for (const p of [`lang/${lang}.json`, `lang/${lang}.${file}.json`]) {
    const full = join(ROOT, p);
    if (existsSync(full)) Object.assign(merged, JSON.parse(readFileSync(full, "utf8")));
  }
  return merged;
}

async function checkOne(name, lang) {
  const bank = BANKS[name];
  const dict = loadPack(lang, name);
  const lines = [...await bank.lines()].filter(translatable);

  const missing = [];
  for (const line of lines) {
    if (dict[line] !== undefined) continue;
    if (dict[shape(line)] !== undefined) continue;
    missing.push(line);
  }
  return { name, lang, label: bank.label, total: lines.length, missing };
}

/* -------------------------------------------------------------------- chalu */

const [argLang, argBank] = process.argv.slice(2);
const langs = argLang ? [argLang] : LANGS;
const names = argBank ? [argBank] : Object.keys(BANKS);

let adhoora = 0;
for (const name of names) {
  if (!BANKS[name]) { console.error(`"${name}" naam ka koi bank nahi hai`); process.exit(2); }
  for (const lang of langs) {
    let r;
    try {
      r = await checkOne(name, lang);
    } catch (err) {
      console.log(`${name.padEnd(10)} ${lang}  — padha nahi ja saka: ${err.message}`);
      continue;
    }
    const done = r.total - r.missing.length;
    const pct = r.total ? Math.round((done / r.total) * 100) : 100;
    const mark = r.missing.length ? "✗" : "✓";
    console.log(
      `${mark} ${r.label.padEnd(24)} ${lang}  ${String(done).padStart(5)}/${String(r.total).padEnd(5)} (${pct}%)` +
      (r.missing.length ? `  — ${r.missing.length} baaki` : "")
    );
    if (r.missing.length) {
      adhoora += r.missing.length;
      for (const m of r.missing.slice(0, 5)) console.log(`      · ${m.slice(0, 78)}`);
      if (r.missing.length > 5) console.log(`      … aur ${r.missing.length - 5}`);
    }
  }
}

console.log("");
console.log(adhoora ? `KUL ${adhoora} line ka anuvaad baaki hai.` : "Sab poora ✓");
process.exit(adhoora ? 1 : 0);
