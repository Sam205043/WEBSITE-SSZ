/* ==========================================================================
   Soft Skill Zone — Fee installment plan
   --------------------------------------------------------------------------
   Ek student ki fees kis-kis tareekh tak kitni aani chahiye — bas itna hi.

   Plan student ke record me `feePlan` naam se aise rehta hai:

     [ { no: 1, amount: 3000, dueDate: "2026-08-10" },
       { no: 2, amount: 3500, dueDate: "2026-09-10" }, ... ]

   Kaunsi kist "abhi baaki hai" ye ALAG se nahi rakhte — wo `paidFee` se khud
   nikal aati hai. Isliye jab bhi koi payment jama hota hai, plan apne aap
   sahi ho jaata hai; do jagah ka hisaab kabhi aapas me nahi bigadta.
   ========================================================================== */

/** "YYYY-MM-DD" -> Date (dophar 12 baje, taaki timezone se din na khiske). */
export function planDate(str) {
  if (!str) return null;
  const [y, m, d] = String(str).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/**
 * Tareekh me mahine jodo — bina mahina laanghe.
 *
 * JavaScript ka apna `setMonth` 31 January me 1 mahina jode to 31 February
 * banata hai, jo hota hi nahi, isliye wo 3 March par chhalak jaata hai.
 * Nateeja: February wali kist banti hi nahi thi, aur agli saari tareekhein
 * 31 se khisak kar 3 ho jaati thin. Kabhi-kabhi to do kisten ek hi mahine
 * me aa girti thin.
 *
 * Yahan din ko us mahine ke aakhri din tak seemit kar dete hain:
 * 31 Jan + 1 = 28 Feb, 31 Mar + 1 = 30 Apr. Mahina kabhi nahi chhootta.
 */
export function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);                                   // pehle safe din par le jao
  d.setMonth(d.getMonth() + Math.round(Number(months) || 0));
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

/** Date -> "YYYY-MM-DD" */
export function planDateStr(date) {
  const d = new Date(date);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Barabar kiston me fees baant deta hai.
 *
 * Paisa poora-poora baanta jaata hai: bachi hui rakam pehli kist me jud
 * jaati hai, taaki jod hamesha total fee ke barabar rahe. (₹10,000 ki 3
 * kisten = 3334 + 3333 + 3333, na ki 3333.33 teen baar.)
 *
 * @param {number} totalFee
 * @param {number} count      kitni kisten
 * @param {string} firstDue   "YYYY-MM-DD"
 * @param {number} gapMonths  do kiston ke beech kitne mahine (default 1)
 * @param {number} offsetMonths  pehli kist `firstDue` se kitne mahine baad
 *   ho. Admission wala plan isse istemaal karta hai: anchor (mahine ka din)
 *   admission ki asli tareekh rehti hai, sirf shuruaat ek mahina aage se
 *   hoti hai — warna 31 se 28 par khisak kar wahin atak jaata tha.
 *
 * Har tareekh hamesha `start` se nikalti hai, pichhli kist se nahi — isliye
 * chhote mahine ka asar aage tak nahi khinchta.
 */
export function buildPlan(totalFee, count, firstDue, gapMonths = 1, offsetMonths = 0) {
  const total = Math.max(0, Math.round(Number(totalFee) || 0));
  const n = Math.max(1, Math.min(24, Math.round(Number(count) || 1)));
  const start = planDate(firstDue);
  if (!total || !start) return [];

  const base = Math.floor(total / n);
  const extra = total - base * n;
  const off = Math.max(0, Math.round(Number(offsetMonths) || 0));

  return Array.from({ length: n }, (_, i) => {
    const d = addMonths(start, off + i * Math.max(1, gapMonths));
    return {
      no: i + 1,
      amount: base + (i === 0 ? extra : 0),
      dueDate: planDateStr(d)
    };
  });
}

/**
 * Abhi kaunsi kist chal rahi hai — yaani pehli aisi kist jiska paisa poora
 * nahi aaya. Poori fees jama ho chuki ho to null.
 *
 * @returns {{no:number, dueDate:Date, dueDateStr:string, remaining:number,
 *            overdueDays:number} | null}
 */
export function currentDue(student, today = new Date()) {
  const plan = Array.isArray(student?.feePlan) ? student.feePlan : [];
  if (!plan.length) return null;

  const paid = Math.max(0, Number(student.paidFee) || 0);
  let running = 0;

  for (const inst of plan) {
    running += Math.max(0, Number(inst.amount) || 0);
    if (paid >= running) continue;              // ye kist pat chuki hai

    const due = planDate(inst.dueDate);
    if (!due) continue;
    const dayMs = 86400000;
    const midToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
    return {
      no: inst.no,
      dueDate: due,
      dueDateStr: inst.dueDate,
      remaining: running - paid,                // is kist me se kitna baaki
      overdueDays: Math.max(0, Math.round((midToday - due) / dayMs))
    };
  }
  return null;                                   // sab kisten pat gayin
}

/**
 * Kis haal me hai ye student:
 *   "clear"    — kuch bakaya nahi
 *   "upcoming" — due date abhi aayi nahi
 *   "today"    — aaj hi due hai
 *   "overdue"  — tareekh nikal chuki hai
 *   "unplanned"— bakaya hai par koi plan nahi banaya gaya
 */
export function feeStatus(student, today = new Date()) {
  const pending = Number(student?.pendingFee) || 0;
  if (pending <= 0) return "clear";

  const due = currentDue(student, today);
  if (!due) return "unplanned";
  if (due.overdueDays > 0) return "overdue";

  const midToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  return due.dueDate.getTime() === midToday.getTime() ? "today" : "upcoming";
}

/** Student ke record me likhne ke liye agli due date (Date ya null). */
export function nextDueFrom(student) {
  return currentDue(student)?.dueDate || null;
}

export const FEE_STATUS_LABEL = {
  clear:     ["badge-success", "Clear"],
  upcoming:  ["badge-accent",  "Aage due"],
  today:     ["badge-warning", "Aaj due"],
  overdue:   ["badge-danger",  "Overdue"],
  unplanned: ["badge-warning", "Plan nahi"]
};
