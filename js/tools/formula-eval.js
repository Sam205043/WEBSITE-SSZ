/* ==========================================================================
   Soft Skill Zone — Formula chalane wala engine
   --------------------------------------------------------------------------
   formula-parser.js formula ko samajhta hai; ye file use CHALAATI hai —
   yaani asli jawab nikaalti hai, bilkul Excel ki tarah.

   Kuchh faisle jo soch kar liye gaye hain:

   1) Hisaab "aalasi" (lazy) hai. Jab kisi cell ki value maangi jaati hai,
      tabhi wo ginti hai, aur ek baar gin kar yaad rakh li jaati hai. Poori
      sheet baar-baar ginne se 500-row wali sheet phone par atak jaati.

   2) Ghumaav (circular reference) pakadna zaroori hai — B10 me =SUM(B2:B10)
      likhna sabse aam galti hai. Bina pakad ke browser hi jam jaata.

   3) Error ek asli value hai, crash nahi. Excel me =A1+1 jahan A1 me
      #DIV/0! ho, wahan #DIV/0! hi aage badhta hai. Wahi yahan bhi.

   4) Excel ki gintiyaan jaan-bujh kar Excel jaisi rakhi hain, "sahi" jaisi
      nahi. Jaise: text ko SUM chhod deta hai par + use jodne ki koshish
      karta hai aur #VALUE! deta hai. Student ko wahi milna chahiye jo asli
      Excel me milega, warna sikhaana ulta pad jaata hai.
   ========================================================================== */

import { parse, colToNum, numToCol, FormulaError } from "./formula-parser.js";

/* ---------------- Error value ---------------- */
export class ExcelError {
  constructor(code) { this.code = code; }
  toString() { return this.code; }
}
const ERR = {
  div: () => new ExcelError("#DIV/0!"),
  value: () => new ExcelError("#VALUE!"),
  ref: () => new ExcelError("#REF!"),
  name: () => new ExcelError("#NAME?"),
  num: () => new ExcelError("#NUM!"),
  na: () => new ExcelError("#N/A"),
  nul: () => new ExcelError("#NULL!"),
  circ: () => new ExcelError("#CIRCULAR!")
};
export const isErr = (v) => v instanceof ExcelError;

/* ---------------- Value ko badalna ----------------
   Excel jaise niyam: khaali = 0, TRUE = 1, text-me-likha-number chalega. */
function num(v) {
  if (isErr(v)) return v;
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v instanceof Date) return dateToSerial(v);
  const s = String(v).trim().replace(/,/g, "");
  if (s === "") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : ERR.value();
}

function text(v) {
  if (isErr(v)) return v;
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof Date) return fmtDate(v);
  return String(v);
}

function bool(v) {
  if (isErr(v)) return v;
  if (typeof v === "boolean") return v;
  if (v === null || v === undefined || v === "") return false;
  if (typeof v === "number") return v !== 0;
  const s = String(v).trim().toUpperCase();
  if (s === "TRUE") return true;
  if (s === "FALSE") return false;
  const n = Number(s);
  return Number.isFinite(n) ? n !== 0 : ERR.value();
}

/* Excel date ↔ number */
const EPOCH = Date.UTC(1899, 11, 30);
export function dateToSerial(d) { return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86400000); }
export function serialToDate(n) { const d = new Date(EPOCH + Math.round(n) * 86400000); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
const fmtDate = (d) => `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;

/* ==========================================================================
   Sheet — cells ka store
   ========================================================================== */
export function createSheet(initial = {}) {
  const raw = new Map();          // "A1" -> "=SUM(B1:B5)" ya "500" ya "Ara"
  const memo = new Map();         // hisaab ka natija, yaad rakha hua
  const visiting = new Set();     // ghumaav pakadne ke liye
  const meta = new Map();         // "A1" -> { isDate: true } jaisi baatein

  Object.entries(initial).forEach(([k, v]) => raw.set(k.toUpperCase(), v));

  const api = {
    /* ---- padhna-likhna ---- */
    getRaw: (ref) => raw.get(String(ref).toUpperCase()) ?? "",
    has: (ref) => raw.has(String(ref).toUpperCase()),
    keys: () => [...raw.keys()],

    set(ref, value) {
      const key = String(ref).toUpperCase();
      if (value === "" || value === null || value === undefined) raw.delete(key);
      else raw.set(key, value);
      /* Ek cell badalne par kaun-kaun badla, ye pakadna mehnga hai. Poora
         memo saaf kar dena isse kahin sasta padta hai — sheet chhoti hai. */
      memo.clear();
      return api;
    },

    setMeta(ref, m) { meta.set(String(ref).toUpperCase(), m); return api; },
    getMeta: (ref) => meta.get(String(ref).toUpperCase()) || null,

    /* Cell me formula hai ya nahi — task jaanchne ke liye zaroori */
    isFormula(ref) {
      const v = api.getRaw(ref);
      return typeof v === "string" && v.trim().startsWith("=");
    },

    /* ---- value nikaalna ---- */
    value(ref) {
      const key = String(ref).toUpperCase();
      if (memo.has(key)) return memo.get(key);

      if (visiting.has(key)) return ERR.circ();
      const cell = raw.get(key);
      if (cell === undefined || cell === "") return "";

      if (typeof cell !== "string" || !cell.trim().startsWith("=")) {
        const lit = literal(cell);
        memo.set(key, lit);
        return lit;
      }

      visiting.add(key);
      let out;
      try {
        out = evalAst(parse(cell), api, key);
      } catch (e) {
        out = e instanceof FormulaError ? ERR.name() : ERR.value();
      } finally {
        visiting.delete(key);
      }
      memo.set(key, out);
      return out;
    },

    /* Cell me jo dikhna chahiye */
    display(ref) {
      const v = api.value(ref);
      if (isErr(v)) return v.code;
      if (v === "" || v === null || v === undefined) return "";
      if (v instanceof Date) return fmtDate(v);
      if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
      if (typeof v === "number") {
        const m = api.getMeta(ref);
        if (m && m.isDate) return fmtDate(serialToDate(v));
        if (!Number.isFinite(v)) return "#NUM!";
        /* 0.1+0.2 ko 0.30000000000000004 dikhana kisi ko samajh nahi aata */
        const r = Math.round(v * 1e10) / 1e10;
        return String(r);
      }
      return String(v);
    },

    clearCache() { memo.clear(); return api; },

    /* Range ki saari values — 2D array */
    range(from, to) {
      const c1 = colToNum(from.col), c2 = colToNum(to.col);
      const r1 = from.row, r2 = to.row;
      const out = [];
      for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
        const row = [];
        for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
          row.push(api.value(`${numToCol(c)}${r}`));
        }
        out.push(row);
      }
      return out;
    },

    /* Range ke cell ke naam (refs) — MATCH/INDEX ko chahiye */
    rangeRefs(from, to) {
      const c1 = colToNum(from.col), c2 = colToNum(to.col);
      const out = [];
      for (let r = Math.min(from.row, to.row); r <= Math.max(from.row, to.row); r++) {
        const row = [];
        for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) row.push(`${numToCol(c)}${r}`);
        out.push(row);
      }
      return out;
    }
  };

  return api;
}

/* "500" → 500, "TRUE" → true, baaki text */
function literal(v) {
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  if (s === "") return "";
  const up = s.toUpperCase();
  if (up === "TRUE") return true;
  if (up === "FALSE") return false;
  /* Sirf saaf number — "1,000" ya "500 kg" ko text hi rehne dete hain,
     bilkul Excel ki tarah. */
  if (/^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(s)) return Number(s);
  return s;
}

/* ==========================================================================
   AST chalana
   ========================================================================== */
function evalAst(node, sheet, self) {
  if (!node) return "";

  switch (node.type) {
    case "number": return node.value;
    case "string": return node.value;
    case "bool":   return node.value;
    case "empty":  return "";
    case "error":  return new ExcelError(node.value);
    case "paren":  return evalAst(node.arg, sheet, self);
    case "name":   return ERR.name();

    case "ref": {
      /* Doosri sheet abhi nahi hai — saaf-saaf #REF! dena chup rehne se
         behtar hai. */
      if (node.sheet) return ERR.ref();
      const key = `${node.col}${node.row}`;
      if (key === self) return ERR.circ();
      return sheet.value(key);
    }

    case "range":
      if (node.sheet) return ERR.ref();
      return { __range: true, values: sheet.range(node.from, node.to), refs: sheet.rangeRefs(node.from, node.to) };

    case "colrange":
    case "rowrange":
      /* Poora column (A:A) ki ginti 10 lakh cell ki hoti — browser me iska
         koi matlab nahi. Student ko saaf batate hain. */
      return ERR.ref();

    case "array":
      return { __range: true, values: [node.items.map((n) => evalAst(n, sheet, self))], refs: [] };

    case "unary": {
      const v = evalAst(node.arg, sheet, self);
      const n = num(v);
      if (isErr(n)) return n;
      return node.op === "-" ? -n : n;
    }

    case "percent": {
      const n = num(evalAst(node.arg, sheet, self));
      return isErr(n) ? n : n / 100;
    }

    case "binary": return binary(node, sheet, self);

    case "func": return callFn(node, sheet, self);

    default: return ERR.value();
  }
}

/* Range ko ek value me badalna jahan ek hi value chahiye */
const flat = (v) => (v && v.__range ? v.values.flat() : [v]);
const one = (v) => (v && v.__range ? (v.values[0] ? v.values[0][0] : "") : v);

function binary(node, sheet, self) {
  const L = one(evalAst(node.left, sheet, self));
  const R = one(evalAst(node.right, sheet, self));
  if (isErr(L)) return L;
  if (isErr(R)) return R;

  if (node.op === "&") {
    const a = text(L), b = text(R);
    if (isErr(a)) return a;
    if (isErr(b)) return b;
    return a + b;
  }

  if (["=", "<>", "<", ">", "<=", ">="].includes(node.op)) return compare(node.op, L, R);

  const a = num(L), b = num(R);
  if (isErr(a)) return a;
  if (isErr(b)) return b;

  switch (node.op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? ERR.div() : a / b;
    case "^": {
      const r = Math.pow(a, b);
      return Number.isFinite(r) ? r : ERR.num();
    }
    default: return ERR.value();
  }
}

function compare(op, L, R) {
  /* Excel text ko bade-chhote akshar ka farq nahi maanta: "ara" = "Ara" */
  let a = L, b = R;
  if (typeof a === "string" || typeof b === "string") {
    const an = typeof a === "number" ? a : null;
    const bn = typeof b === "number" ? b : null;
    if (an === null && bn === null) { a = String(a).toUpperCase(); b = String(b).toUpperCase(); }
    else { a = num(a); b = num(b); if (isErr(a)) return a; if (isErr(b)) return b; }
  }
  if (a === "" && typeof b === "number") a = 0;
  if (b === "" && typeof a === "number") b = 0;

  switch (op) {
    case "=":  return a === b;
    case "<>": return a !== b;
    case "<":  return a < b;
    case ">":  return a > b;
    case "<=": return a <= b;
    case ">=": return a >= b;
    default:   return ERR.value();
  }
}

/* ==========================================================================
   Shart milaana — COUNTIF/SUMIF ke liye
   ">100", "<=50", "<>Ara", "Ara", "Ku*" (wildcard)
   ========================================================================== */
function makeMatcher(criteria) {
  let c = criteria;
  if (c && c.__range) c = one(c);
  if (isErr(c)) return () => false;

  if (typeof c === "number" || typeof c === "boolean") return (v) => looseEq(v, c);

  const s = String(c ?? "").trim();
  const m = /^(<=|>=|<>|=|<|>)(.*)$/.exec(s);
  if (m) {
    const op = m[1];
    const rhsRaw = m[2].trim();
    const rhs = /^-?\d*\.?\d+$/.test(rhsRaw) ? Number(rhsRaw) : rhsRaw;
    return (v) => {
      const r = compare(op === "=" ? "=" : op, v === "" ? (typeof rhs === "number" ? 0 : "") : v, rhs);
      return r === true;
    };
  }

  if (/[*?]/.test(s)) {
    const rx = new RegExp("^" + s.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
    return (v) => rx.test(String(v ?? ""));
  }

  const asNum = /^-?\d*\.?\d+$/.test(s) ? Number(s) : null;
  return (v) => (asNum !== null ? num(v) === asNum : String(v ?? "").toUpperCase() === s.toUpperCase());
}

const looseEq = (v, c) => (typeof c === "number" ? num(v) === c : String(v ?? "").toUpperCase() === String(c).toUpperCase());

/* ==========================================================================
   Functions
   ========================================================================== */
const nums = (args) => {
  const out = [];
  for (const a of args) {
    for (const v of flat(a)) {
      if (isErr(v)) return v;
      /* SUM/AVERAGE text aur khaali ko CHHOD dete hain — ye Excel ka niyam
         hai aur bahut kaam ka: beech me heading ho to bhi total sahi. */
      if (typeof v === "number") out.push(v);
      else if (typeof v === "boolean") { /* range me boolean nahi ginta */ }
      else if (v instanceof Date) out.push(dateToSerial(v));
    }
  }
  return out;
};

/* Jab argument seedhe likha ho (=SUM(1,2,"3")) tab text bhi ginta hai —
   isliye direct numbers alag se. */
const numsStrict = (args) => {
  const out = [];
  for (const a of args) {
    if (a && a.__range) {
      for (const v of a.values.flat()) {
        if (isErr(v)) return v;
        if (typeof v === "number") out.push(v);
        else if (v instanceof Date) out.push(dateToSerial(v));
      }
    } else {
      const n = num(a);
      if (isErr(n)) return n;
      out.push(n);
    }
  }
  return out;
};

const round = (n, d) => {
  const f = Math.pow(10, d);
  /* Math.round(-2.5) = -2 hota hai, Excel -3 deta hai. Isliye alag se. */
  return (n < 0 ? -1 : 1) * Math.round(Math.abs(n) * f + Number.EPSILON) / f;
};

const FN = {
  /* ---- jodna-ginna ---- */
  SUM: (a) => { const n = numsStrict(a); return isErr(n) ? n : n.reduce((s, x) => s + x, 0); },
  AVERAGE: (a) => { const n = numsStrict(a); if (isErr(n)) return n; return n.length ? n.reduce((s, x) => s + x, 0) / n.length : ERR.div(); },
  COUNT: (a) => nums(a).length !== undefined ? flat2(a).filter((v) => typeof v === "number" || v instanceof Date).length : 0,
  COUNTA: (a) => flat2(a).filter((v) => v !== "" && v !== null && v !== undefined).length,
  COUNTBLANK: (a) => flat2(a).filter((v) => v === "" || v === null || v === undefined).length,
  MAX: (a) => { const n = nums(a); if (isErr(n)) return n; return n.length ? Math.max(...n) : 0; },
  MIN: (a) => { const n = nums(a); if (isErr(n)) return n; return n.length ? Math.min(...n) : 0; },
  MEDIAN: (a) => {
    const n = nums(a); if (isErr(n)) return n;
    if (!n.length) return ERR.num();
    const s = [...n].sort((x, y) => x - y);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  },
  LARGE: (a) => {
    const n = nums([a[0]]); if (isErr(n)) return n;
    const k = num(one(a[1])); if (isErr(k)) return k;
    const s = [...n].sort((x, y) => y - x);
    return k >= 1 && k <= s.length ? s[k - 1] : ERR.num();
  },
  SMALL: (a) => {
    const n = nums([a[0]]); if (isErr(n)) return n;
    const k = num(one(a[1])); if (isErr(k)) return k;
    const s = [...n].sort((x, y) => x - y);
    return k >= 1 && k <= s.length ? s[k - 1] : ERR.num();
  },
  RANK: (a) => {
    const v = num(one(a[0])); if (isErr(v)) return v;
    const n = nums([a[1]]); if (isErr(n)) return n;
    const asc = a[2] !== undefined && num(one(a[2])) !== 0;
    const s = [...n].sort((x, y) => (asc ? x - y : y - x));
    const i = s.indexOf(v);
    return i < 0 ? ERR.na() : i + 1;
  },
  SUMPRODUCT: (a) => {
    const cols = a.map((x) => flat2([x]));
    if (!cols.length) return 0;
    const len = cols[0].length;
    if (cols.some((c) => c.length !== len)) return ERR.value();
    let t = 0;
    for (let i = 0; i < len; i++) {
      let p = 1;
      for (const c of cols) { const n = num(c[i]); if (isErr(n)) return n; p *= n; }
      t += p;
    }
    return t;
  },
  COUNTIF: (a) => {
    const vals = flat2([a[0]]);
    const ok = makeMatcher(a[1]);
    return vals.filter(ok).length;
  },
  SUMIF: (a) => {
    const look = flat2([a[0]]);
    const ok = makeMatcher(a[1]);
    const add = a[2] !== undefined ? flat2([a[2]]) : look;
    let t = 0;
    look.forEach((v, i) => { if (ok(v)) { const n = num(add[i]); if (!isErr(n)) t += n; } });
    return t;
  },
  AVERAGEIF: (a) => {
    const look = flat2([a[0]]);
    const ok = makeMatcher(a[1]);
    const add = a[2] !== undefined ? flat2([a[2]]) : look;
    let t = 0, c = 0;
    look.forEach((v, i) => { if (ok(v)) { const n = num(add[i]); if (!isErr(n)) { t += n; c++; } } });
    return c ? t / c : ERR.div();
  },
  COUNTIFS: (a) => multiIf(a, null),
  SUMIFS: (a) => multiIf(a.slice(1), flat2([a[0]])),
  AVERAGEIFS: (a) => {
    const vals = flat2([a[0]]);
    const hits = multiIfIndexes(a.slice(1));
    if (isErr(hits)) return hits;
    let t = 0, c = 0;
    hits.forEach((i) => { const n = num(vals[i]); if (!isErr(n)) { t += n; c++; } });
    return c ? t / c : ERR.div();
  },
  SUBTOTAL: (a) => {
    const code = num(one(a[0])); if (isErr(code)) return code;
    const rest = a.slice(1);
    const k = code > 100 ? code - 100 : code;
    if (k === 9) return FN.SUM(rest);
    if (k === 1) return FN.AVERAGE(rest);
    if (k === 2) return FN.COUNT(rest);
    if (k === 3) return FN.COUNTA(rest);
    if (k === 4) return FN.MAX(rest);
    if (k === 5) return FN.MIN(rest);
    return ERR.value();
  },

  /* ---- shart ---- */
  IF: (a, sheet, self, raw) => {
    const c = bool(one(evalArg(raw[0], sheet, self)));
    if (isErr(c)) return c;
    const branch = c ? raw[1] : raw[2];
    if (branch === undefined) return c ? true : false;
    return one(evalArg(branch, sheet, self));
  },
  IFS: (a, sheet, self, raw) => {
    for (let i = 0; i + 1 < raw.length; i += 2) {
      const c = bool(one(evalArg(raw[i], sheet, self)));
      if (isErr(c)) return c;
      if (c) return one(evalArg(raw[i + 1], sheet, self));
    }
    return ERR.na();
  },
  SWITCH: (a, sheet, self, raw) => {
    const subject = one(evalArg(raw[0], sheet, self));
    let i = 1;
    for (; i + 1 < raw.length; i += 2) {
      const v = one(evalArg(raw[i], sheet, self));
      if (looseEq(subject, v)) return one(evalArg(raw[i + 1], sheet, self));
    }
    return i < raw.length ? one(evalArg(raw[i], sheet, self)) : ERR.na();
  },
  IFERROR: (a, sheet, self, raw) => {
    const v = one(evalArg(raw[0], sheet, self));
    return isErr(v) ? one(evalArg(raw[1], sheet, self)) : v;
  },
  IFNA: (a, sheet, self, raw) => {
    const v = one(evalArg(raw[0], sheet, self));
    return isErr(v) && v.code === "#N/A" ? one(evalArg(raw[1], sheet, self)) : v;
  },
  AND: (a) => {
    const vs = flat2(a);
    for (const v of vs) { const b = bool(v); if (isErr(b)) return b; if (!b) return false; }
    return true;
  },
  OR: (a) => {
    const vs = flat2(a);
    for (const v of vs) { const b = bool(v); if (isErr(b)) return b; if (b) return true; }
    return false;
  },
  NOT: (a) => { const b = bool(one(a[0])); return isErr(b) ? b : !b; },

  /* ---- dhundhna ---- */
  VLOOKUP: (a) => {
    const key = one(a[0]);
    const tbl = a[1];
    const idx = num(one(a[2]));
    if (isErr(idx)) return idx;
    if (!tbl || !tbl.__range) return ERR.value();
    const rows = tbl.values;
    if (idx < 1) return ERR.value();
    if (idx > (rows[0] ? rows[0].length : 0)) return ERR.ref();
    const exact = a[3] === undefined ? false : !bool(one(a[3]));
    /* Chhota par asli farq: exact match me poori list dekhi jaati hai;
       approximate me aakhri wo value jo key se badi na ho. */
    if (exact) {
      for (const row of rows) if (looseEq(row[0], key)) return row[idx - 1];
      return ERR.na();
    }
    let best = null;
    for (const row of rows) {
      const c = compare("<=", row[0], key);
      if (c === true) best = row; else break;
    }
    return best ? best[idx - 1] : ERR.na();
  },
  HLOOKUP: (a) => {
    const key = one(a[0]);
    const tbl = a[1];
    const idx = num(one(a[2]));
    if (isErr(idx)) return idx;
    if (!tbl || !tbl.__range) return ERR.value();
    const rows = tbl.values;
    if (idx < 1 || idx > rows.length) return ERR.ref();
    const head = rows[0] || [];
    const exact = a[3] === undefined ? false : !bool(one(a[3]));
    for (let c = 0; c < head.length; c++) {
      if (exact ? looseEq(head[c], key) : compare("=", head[c], key) === true) return rows[idx - 1][c];
    }
    return ERR.na();
  },
  MATCH: (a) => {
    const key = one(a[0]);
    const arr = flat2([a[1]]);
    const type = a[2] === undefined ? 1 : num(one(a[2]));
    if (isErr(type)) return type;
    if (type === 0) {
      const ok = makeMatcher(typeof key === "string" ? key : key);
      for (let i = 0; i < arr.length; i++) if (looseEq(arr[i], key) || ok(arr[i])) return i + 1;
      return ERR.na();
    }
    let best = -1;
    for (let i = 0; i < arr.length; i++) {
      const c = type > 0 ? compare("<=", arr[i], key) : compare(">=", arr[i], key);
      if (c === true) best = i; else if (best >= 0) break;
    }
    return best >= 0 ? best + 1 : ERR.na();
  },
  INDEX: (a) => {
    const tbl = a[0];
    if (!tbl || !tbl.__range) return ERR.value();
    const rows = tbl.values;
    const r = num(one(a[1]));
    if (isErr(r)) return r;
    const c = a[2] !== undefined ? num(one(a[2])) : null;
    if (isErr(c)) return c;
    /* Ek hi column wali range par INDEX(range, n) — n row hai */
    if (c === null) {
      if (rows.length === 1) return r >= 1 && r <= rows[0].length ? rows[0][r - 1] : ERR.ref();
      return r >= 1 && r <= rows.length ? rows[r - 1][0] : ERR.ref();
    }
    if (r < 1 || r > rows.length || c < 1 || c > (rows[0] || []).length) return ERR.ref();
    return rows[r - 1][c - 1];
  },
  XLOOKUP: (a) => {
    const key = one(a[0]);
    const look = flat2([a[1]]);
    const ret = flat2([a[2]]);
    const notFound = a[3] !== undefined ? one(a[3]) : ERR.na();
    for (let i = 0; i < look.length; i++) if (looseEq(look[i], key)) return ret[i] ?? "";
    return notFound;
  },

  /* ---- text ---- */
  LEFT: (a) => { const s = text(one(a[0])); if (isErr(s)) return s; const n = a[1] === undefined ? 1 : num(one(a[1])); return isErr(n) ? n : (n < 0 ? ERR.value() : s.slice(0, n)); },
  RIGHT: (a) => { const s = text(one(a[0])); if (isErr(s)) return s; const n = a[1] === undefined ? 1 : num(one(a[1])); return isErr(n) ? n : (n < 0 ? ERR.value() : (n === 0 ? "" : s.slice(-n))); },
  MID: (a) => {
    const s = text(one(a[0])); if (isErr(s)) return s;
    const st = num(one(a[1])), ln = num(one(a[2]));
    if (isErr(st)) return st; if (isErr(ln)) return ln;
    if (st < 1 || ln < 0) return ERR.value();
    return s.substr(st - 1, ln);
  },
  LEN: (a) => { const s = text(one(a[0])); return isErr(s) ? s : s.length; },
  TRIM: (a) => { const s = text(one(a[0])); return isErr(s) ? s : s.trim().replace(/\s+/g, " "); },
  UPPER: (a) => { const s = text(one(a[0])); return isErr(s) ? s : s.toUpperCase(); },
  LOWER: (a) => { const s = text(one(a[0])); return isErr(s) ? s : s.toLowerCase(); },
  PROPER: (a) => { const s = text(one(a[0])); return isErr(s) ? s : s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()); },
  CONCATENATE: (a) => joinAll(a, ""),
  CONCAT: (a) => joinAll(a, ""),
  TEXTJOIN: (a) => {
    const sep = text(one(a[0])); if (isErr(sep)) return sep;
    const skip = bool(one(a[1])); if (isErr(skip)) return skip;
    const parts = flat2(a.slice(2)).map(text);
    for (const p of parts) if (isErr(p)) return p;
    return parts.filter((p) => (skip ? p !== "" : true)).join(sep);
  },
  SUBSTITUTE: (a) => {
    const s = text(one(a[0])), o = text(one(a[1])), n = text(one(a[2]));
    if (isErr(s)) return s; if (isErr(o)) return o; if (isErr(n)) return n;
    return o === "" ? s : s.split(o).join(n);
  },
  REPLACE: (a) => {
    const s = text(one(a[0])); if (isErr(s)) return s;
    const st = num(one(a[1])), ln = num(one(a[2])), nw = text(one(a[3]));
    if (isErr(st)) return st; if (isErr(ln)) return ln; if (isErr(nw)) return nw;
    return s.slice(0, st - 1) + nw + s.slice(st - 1 + ln);
  },
  FIND: (a) => {
    const f = text(one(a[0])), s = text(one(a[1]));
    if (isErr(f)) return f; if (isErr(s)) return s;
    const start = a[2] === undefined ? 1 : num(one(a[2]));
    const i = s.indexOf(f, start - 1);
    return i < 0 ? ERR.value() : i + 1;
  },
  SEARCH: (a) => {
    const f = text(one(a[0])), s = text(one(a[1]));
    if (isErr(f)) return f; if (isErr(s)) return s;
    const start = a[2] === undefined ? 1 : num(one(a[2]));
    const i = s.toUpperCase().indexOf(f.toUpperCase(), start - 1);
    return i < 0 ? ERR.value() : i + 1;
  },
  VALUE: (a) => { const n = num(text(one(a[0]))); return n; },
  TEXT: (a) => {
    const v = one(a[0]);
    const f = text(one(a[1]));
    if (isErr(f)) return f;
    return applyFormat(v, f);
  },

  /* ---- date ---- */
  TODAY: () => { const d = new Date(); return dateToSerial(d); },
  NOW: () => { const d = new Date(); return dateToSerial(d) + (d.getHours() * 3600 + d.getMinutes() * 60) / 86400; },
  DAY: (a) => dpart(a, "d"),
  MONTH: (a) => dpart(a, "m"),
  YEAR: (a) => dpart(a, "y"),
  DATE: (a) => {
    const y = num(one(a[0])), m = num(one(a[1])), d = num(one(a[2]));
    if (isErr(y)) return y; if (isErr(m)) return m; if (isErr(d)) return d;
    return dateToSerial(new Date(y, m - 1, d));
  },
  DATEDIF: (a) => {
    const s = toDate(one(a[0])), e = toDate(one(a[1]));
    if (isErr(s)) return s; if (isErr(e)) return e;
    const unit = String(text(one(a[2]))).toUpperCase();
    if (e < s) return ERR.num();
    if (unit === "D") return Math.round((e - s) / 86400000);
    let y = e.getFullYear() - s.getFullYear();
    let m = e.getMonth() - s.getMonth();
    let d = e.getDate() - s.getDate();
    if (d < 0) m--;
    if (m < 0) { y--; m += 12; }
    if (unit === "Y") return y;
    if (unit === "M") return y * 12 + m;
    if (unit === "YM") return m;
    return ERR.num();
  },
  EDATE: (a) => {
    const d = toDate(one(a[0])); if (isErr(d)) return d;
    const m = num(one(a[1])); if (isErr(m)) return m;
    const x = new Date(d.getFullYear(), d.getMonth() + m, 1);
    const dim = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
    return dateToSerial(new Date(x.getFullYear(), x.getMonth(), Math.min(d.getDate(), dim)));
  },
  WEEKDAY: (a) => {
    const d = toDate(one(a[0])); if (isErr(d)) return d;
    const type = a[1] === undefined ? 1 : num(one(a[1]));
    const g = d.getDay();                        // 0 = Ravivaar
    if (type === 2) return g === 0 ? 7 : g;      // Somvaar = 1
    if (type === 3) return g === 0 ? 6 : g - 1;
    return g + 1;
  },
  NETWORKDAYS: (a) => {
    const s = toDate(one(a[0])), e = toDate(one(a[1]));
    if (isErr(s)) return s; if (isErr(e)) return e;
    let n = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const g = cur.getDay();
      if (g !== 0 && g !== 6) n++;
      cur.setDate(cur.getDate() + 1);
    }
    return n;
  },

  /* ---- number ---- */
  ROUND: (a) => { const n = num(one(a[0])), d = a[1] === undefined ? 0 : num(one(a[1])); if (isErr(n)) return n; if (isErr(d)) return d; return round(n, d); },
  ROUNDUP: (a) => { const n = num(one(a[0])), d = a[1] === undefined ? 0 : num(one(a[1])); if (isErr(n)) return n; const f = Math.pow(10, d); return (n < 0 ? -1 : 1) * Math.ceil(Math.abs(n) * f) / f; },
  ROUNDDOWN: (a) => { const n = num(one(a[0])), d = a[1] === undefined ? 0 : num(one(a[1])); if (isErr(n)) return n; const f = Math.pow(10, d); return (n < 0 ? -1 : 1) * Math.floor(Math.abs(n) * f) / f; },
  INT: (a) => { const n = num(one(a[0])); return isErr(n) ? n : Math.floor(n); },
  ABS: (a) => { const n = num(one(a[0])); return isErr(n) ? n : Math.abs(n); },
  MOD: (a) => {
    const n = num(one(a[0])), d = num(one(a[1]));
    if (isErr(n)) return n; if (isErr(d)) return d;
    if (d === 0) return ERR.div();
    /* Excel ka MOD chinh bhaajak ka leta hai: MOD(-3,2)=1, JS me -1 */
    return n - d * Math.floor(n / d);
  },
  POWER: (a) => { const n = num(one(a[0])), p = num(one(a[1])); if (isErr(n)) return n; if (isErr(p)) return p; const r = Math.pow(n, p); return Number.isFinite(r) ? r : ERR.num(); },
  SQRT: (a) => { const n = num(one(a[0])); if (isErr(n)) return n; return n < 0 ? ERR.num() : Math.sqrt(n); },
  ROW: (a, sheet, self) => (a[0] === undefined ? Number(/\d+/.exec(self || "1")[0]) : ERR.value()),
  COLUMN: (a, sheet, self) => (a[0] === undefined ? colToNum(/^[A-Z]+/.exec(self || "A")[0]) : ERR.value()),

  /* ---- jaanch ---- */
  ISERROR: (a, sheet, self, raw) => isErr(one(evalArg(raw[0], sheet, self))),
  ISNA: (a, sheet, self, raw) => { const v = one(evalArg(raw[0], sheet, self)); return isErr(v) && v.code === "#N/A"; },
  ISBLANK: (a) => { const v = one(a[0]); return v === "" || v === null || v === undefined; },
  ISNUMBER: (a) => typeof one(a[0]) === "number",
  ISTEXT: (a) => typeof one(a[0]) === "string" && one(a[0]) !== "",
  NA: () => ERR.na()
};

/* Alias */
FN.AVERAGEIFS = FN.AVERAGEIFS;

/* ---- helpers jo FN ke baad aate hain ---- */
function flat2(args) {
  const out = [];
  for (const a of args) {
    if (a && a.__range) out.push(...a.values.flat());
    else out.push(a);
  }
  return out;
}

function joinAll(args, sep) {
  const parts = flat2(args).map(text);
  for (const p of parts) if (isErr(p)) return p;
  return parts.join(sep);
}

function toDate(v) {
  if (isErr(v)) return v;
  if (v instanceof Date) return v;
  const n = num(v);
  if (isErr(n)) return n;
  return serialToDate(n);
}

function dpart(a, which) {
  const d = toDate(one(a[0]));
  if (isErr(d)) return d;
  return which === "d" ? d.getDate() : which === "m" ? d.getMonth() + 1 : d.getFullYear();
}

/* COUNTIFS / SUMIFS — jodiyon me range aur shart */
function multiIfIndexes(pairs) {
  if (pairs.length % 2 !== 0) return ERR.value();
  const sets = [];
  for (let i = 0; i < pairs.length; i += 2) {
    sets.push({ vals: flat2([pairs[i]]), ok: makeMatcher(pairs[i + 1]) });
  }
  if (!sets.length) return [];
  const len = sets[0].vals.length;
  if (sets.some((s) => s.vals.length !== len)) return ERR.value();
  const hits = [];
  for (let i = 0; i < len; i++) if (sets.every((s) => s.ok(s.vals[i]))) hits.push(i);
  return hits;
}

function multiIf(pairs, sumVals) {
  const hits = multiIfIndexes(pairs);
  if (isErr(hits)) return hits;
  if (!sumVals) return hits.length;
  let t = 0;
  hits.forEach((i) => { const n = num(sumVals[i]); if (!isErr(n)) t += n; });
  return t;
}

/* TEXT ka bahut chhota roop — wahi jo class me sikhaya jaata hai */
function applyFormat(v, f) {
  const up = f.toUpperCase();
  if (/^D{1,4}[-/ ]?M{1,4}[-/ ]?Y{2,4}$/.test(up.replace(/\s/g, "")) || up.includes("YYYY") || up.includes("MMM")) {
    const d = toDate(v);
    if (isErr(d)) return d;
    const pad = (x) => String(x).padStart(2, "0");
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return f
      .replace(/yyyy/gi, d.getFullYear())
      .replace(/yy/gi, String(d.getFullYear()).slice(-2))
      .replace(/mmm/gi, MON[d.getMonth()])
      .replace(/mm/gi, pad(d.getMonth() + 1))
      .replace(/dd/gi, pad(d.getDate()))
      .replace(/\bm\b/gi, d.getMonth() + 1)
      .replace(/\bd\b/gi, d.getDate());
  }
  const n = num(v);
  if (isErr(n)) return n;
  const dec = (f.split(".")[1] || "").replace(/[^0#]/g, "").length;
  const s = round(n, dec).toFixed(dec);
  if (f.includes(",")) {
    const [i, d] = s.split(".");
    /* Indian grouping: 12,34,567 — western 1,234,567 se alag hai aur yahan
       yahi sahi hai. */
    const neg = i.startsWith("-");
    const digits = neg ? i.slice(1) : i;
    let grouped = digits;
    if (digits.length > 3) {
      const last3 = digits.slice(-3);
      const rest = digits.slice(0, -3);
      grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
    }
    return (neg ? "-" : "") + grouped + (d ? "." + d : "");
  }
  return s;
}

/* IF/IFERROR ko apne arguments KHUD chalane hote hain — warna dono raaste
   chal jaate hain aur =IFERROR(1/0, "theek") bhi error de deta. */
let CURRENT_SHEET = null;
function evalArg(node, sheet, self) {
  return node === undefined ? undefined : evalAst(node, sheet, self);
}

const LAZY = new Set(["IF", "IFS", "IFERROR", "IFNA", "ISERROR", "ISNA", "SWITCH"]);

function callFn(node, sheet, self) {
  const fn = FN[node.name];
  if (!fn) return ERR.name();

  if (LAZY.has(node.name)) return fn(null, sheet, self, node.args);

  const args = node.args.map((n) => evalAst(n, sheet, self));
  /* Error aage badhta hai — par sirf wahan jahan value chahiye. Range me
     pada error function khud sambhalta hai. */
  for (const a of args) if (isErr(a)) return a;
  return fn(args, sheet, self, node.args);
}

/* ==========================================================================
   Bahar ka saada raasta
   ========================================================================== */
export function evaluateFormula(formula, sheet = createSheet()) {
  try {
    return evalAst(parse(formula), sheet, null);
  } catch (e) {
    return e instanceof FormulaError ? ERR.name() : ERR.value();
  }
}

export const SUPPORTED_FUNCTIONS = Object.keys(FN).sort();
