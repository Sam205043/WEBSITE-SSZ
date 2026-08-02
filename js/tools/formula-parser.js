/* ==========================================================================
   Soft Skill Zone — Excel formula parser
   --------------------------------------------------------------------------
   Formula ko padh kar uska dhaancha (tree) bana deta hai. Isse do cheezein
   ban sakti hain: Formula Explainer (jo abhi banaya hai) aur aage chal kar
   browser wala mini Excel — dono ko formula "samajhna" padta hai, isliye ye
   hissa alag file me rakha hai.

   Kya-kya samajhta hai:
     123   1.5   -4   50%              numbers aur percent
     "text"  TRUE  FALSE               text aur logical
     #N/A #REF! #VALUE! …              error values
     A1   $A$1   A$1   B12             cell reference
     A1:B10   $A$1:$B$10   A:A   2:2   range (poora column/row bhi)
     Sheet2!A1   'My Sheet'!A1:B5      doosri sheet
     SUM(...)  IF(...)                 function
     + - * / ^ & = <> < > <= >=        operators (Excel wali priority me)

   Excel ki operator priority (upar wala pehle lagta hai):
     %  →  ^  →  * /  →  + -  →  &  →  = <> < > <= >=
   Yahi kram niche `PREC` me hai. Ye kram galat ho to "=2+3*4" ka jawab 20
   aayega 14 ki jagah — isliye ispar dhyan diya gaya hai.

   Semicolon ko comma maan lete hain: bahut se students European keyboard
   layout ya purani kitaab dekh kar ";" likh dete hain, aur unhe atkaana
   sikhne me madad nahi karta.
   ========================================================================== */

/* ---------------- Error values ---------------- */
export const ERROR_VALUES = [
  "#NULL!", "#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#NUM!", "#N/A",
  "#SPILL!", "#CALC!", "#GETTING_DATA"
];

/* ---------------- Tokenizer ---------------- */
const OPS = ["<=", ">=", "<>", "+", "-", "*", "/", "^", "&", "=", "<", ">"];

/* Ek cell reference: $ optional, 1-3 akshar ka column, 1-7 ank ki row.
   XFD1048576 Excel ki aakhri cell hai, isliye itni hi chhoot. */
const CELL_RE = /^(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})/;
const NAME_RE = /^[A-Za-z_\\][A-Za-z0-9_.\\]*/;

export class FormulaError extends Error {
  constructor(message, at = -1) {
    super(message);
    this.name = "FormulaError";
    this.at = at;
  }
}

export function tokenize(input) {
  const src = String(input || "");
  /* Shuru ka "=" formula ka hissa nahi, sirf Excel ko batata hai ki ye
     formula hai. Student "=" ke saath ya bina, dono tarah likh sakta hai. */
  let i = src[0] === "=" ? 1 : 0;
  const tokens = [];

  const push = (type, value, extra = {}) =>
    tokens.push({ type, value, at: i, ...extra });

  while (i < src.length) {
    const c = src[i];

    /* space — Excel me ye intersection operator hai, par student ki likhi
       hui formula me ye 99% baar sirf saja hoti hai. Chhod dete hain. */
    if (/\s/.test(c)) { i++; continue; }

    /* text: "…"  — andar "" ka matlab ek " hota hai */
    if (c === '"') {
      let j = i + 1, out = "";
      while (j < src.length) {
        if (src[j] === '"') {
          if (src[j + 1] === '"') { out += '"'; j += 2; continue; }
          break;
        }
        out += src[j++];
      }
      if (j >= src.length) throw new FormulaError('Text ka quote (") band nahi hua.', i);
      tokens.push({ type: "string", value: out, at: i });
      i = j + 1;
      continue;
    }

    /* error value — cell ref se pehle jaanchna zaroori hai, warna
       "#REF!" ka "REF" naam samajh liya jaata */
    const err = ERROR_VALUES.find((e) => src.slice(i, i + e.length).toUpperCase() === e);
    if (err) { tokens.push({ type: "error", value: err, at: i }); i += err.length; continue; }

    /* Poori row: 2:2 — ye number branch se PEHLE aana chahiye, warna "2"
       number ban jaata hai aur ":" beech me anaath reh jaata hai. */
    if (/\d/.test(c)) {
      const rr = /^(\$?\d{1,7})\s*:\s*(\$?\d{1,7})(?![\d.])/.exec(src.slice(i));
      if (rr) {
        tokens.push({ type: "rowrange", value: rr[0], sheet: "", at: i });
        i += rr[0].length;
        continue;
      }
    }

    /* number */
    if (/\d/.test(c) || (c === "." && /\d/.test(src[i + 1] || ""))) {
      const m = /^\d*\.?\d+([eE][+-]?\d+)?/.exec(src.slice(i));
      tokens.push({ type: "number", value: Number(m[0]), at: i });
      i += m[0].length;
      continue;
    }

    /* sheet name in quotes: 'My Sheet'!A1 */
    if (c === "'") {
      let j = i + 1, name = "";
      while (j < src.length && src[j] !== "'") name += src[j++];
      if (src[j] !== "'" || src[j + 1] !== "!") {
        throw new FormulaError("Sheet ke naam ka quote (') theek nahi hai.", i);
      }
      i = j + 2;
      const ref = readRef(src, i, name);
      if (!ref) throw new FormulaError(`'${name}'! ke baad cell ka pata nahi mila.`, i);
      tokens.push(ref.token);
      i = ref.next;
      continue;
    }

    /* operators */
    const op = OPS.find((o) => src.startsWith(o, i));
    if (op) { push("op", op); i += op.length; continue; }

    if (c === "(") { push("lparen", "("); i++; continue; }
    if (c === ")") { push("rparen", ")"); i++; continue; }
    /* ";" ko "," hi maan lete hain — upar wali tippani dekhein */
    if (c === "," || c === ";") { push("comma", ","); i++; continue; }
    if (c === "%") { push("percent", "%"); i++; continue; }
    if (c === "{" || c === "}") { push(c === "{" ? "lbrace" : "rbrace", c); i++; continue; }

    /* cell / range / sheet-qualified ref / function name / defined name */
    if (c === "$" || /[A-Za-z_\\]/.test(c)) {
      const ref = readRef(src, i, "");
      if (ref) { tokens.push(ref.token); i = ref.next; continue; }

      const nm = NAME_RE.exec(src.slice(i));
      if (nm) {
        const name = nm[0];
        let j = i + name.length;
        while (j < src.length && /\s/.test(src[j])) j++;
        if (src[j] === "!") {
          /* Sheet2!A1 — bina quote wala sheet naam */
          const r = readRef(src, j + 1, name);
          if (r) { tokens.push(r.token); i = r.next; continue; }
        }
        tokens.push({ type: src[j] === "(" ? "func" : "name", value: name, at: i });
        i += name.length;
        continue;
      }
    }

    throw new FormulaError(`Ye nishaan samajh nahi aaya: "${c}"`, i);
  }

  return tokens;
}

/* A1 / $A$1 / A1:B10 / A:A / $2:$5 padhta hai. Nahi mila to null.

   ":" ke aas-paas space chalne dete hain ("A1 : A5") — students aksar
   likhte hain, aur Excel bhi maan leta hai.

   Kram maayne rakhta hai: range PEHLE dekhna padta hai, warna "A1:B10" ka
   sirf "A1" pakda jaata aur ":B10" anaath reh jaata. */
const CELL_TXT = "\\$?[A-Za-z]{1,3}\\$?\\d{1,7}";
const RANGE_RE = new RegExp(`^(${CELL_TXT})\\s*:\\s*(${CELL_TXT})`);
const COLRANGE_RE = /^(\$?[A-Za-z]{1,3})\s*:\s*(\$?[A-Za-z]{1,3})(?![A-Za-z0-9_.])/;
const ROWRANGE_RE = /^(\$?\d{1,7})\s*:\s*(\$?\d{1,7})(?![\d.])/;

function readRef(src, start, sheet) {
  const rest = src.slice(start);

  const rng = RANGE_RE.exec(rest);
  if (rng) {
    return {
      token: {
        type: "range", value: `${rng[1]}:${rng[2]}`, sheet,
        from: cellParts(CELL_RE.exec(rng[1])), to: cellParts(CELL_RE.exec(rng[2])), at: start
      },
      next: start + rng[0].length
    };
  }

  const cell = CELL_RE.exec(rest);
  if (cell) {
    return {
      token: { type: "ref", value: cell[0], sheet, ...cellParts(cell), at: start },
      next: start + cell[0].length
    };
  }

  /* poora column: A:A  ya  $A:$C.
     "SUM(" yahan nahi phansta — "SUM" ke baad ":" nahi, "(" hai. */
  const colr = COLRANGE_RE.exec(rest);
  if (colr) {
    return {
      token: { type: "colrange", value: `${colr[1]}:${colr[2]}`, sheet, at: start },
      next: start + colr[0].length
    };
  }

  /* poori row jo "$" se shuru ho ($2:$5). Saada "2:2" tokenizer me hi
     pakad liya jaata hai, number banne se pehle. */
  const rowr = ROWRANGE_RE.exec(rest);
  if (rowr) {
    return {
      token: { type: "rowrange", value: `${rowr[1]}:${rowr[2]}`, sheet, at: start },
      next: start + rowr[0].length
    };
  }

  return null;
}

function cellParts(m) {
  return {
    col: m[2].toUpperCase(),
    row: Number(m[4]),
    colAbs: m[1] === "$",
    rowAbs: m[3] === "$"
  };
}

/* ---------------- Parser ----------------
   Precedence climbing. Bada number = pehle lagega. */
const PREC = {
  "^": 5,
  "*": 4, "/": 4,
  "+": 3, "-": 3,
  "&": 2,
  "=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1
};
/* Excel me SAARE operator bayein se dayein judte hain — "^" bhi.
   Ye ganit ki aam parampara se ULTA hai: kitaab me 2^3^2 = 2^(3^2) = 512
   hota hai, par Excel (aur LibreOffice) (2^3)^2 = 64 dete hain.
   LibreOffice se milaan karke ye pakda gaya tha. */
const RIGHT_ASSOC = {};

export function parse(input) {
  const tokens = tokenize(input);
  if (!tokens.length) throw new FormulaError("Formula khaali hai.");

  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (type) => {
    const t = tokens[pos];
    if (!t || t.type !== type) {
      throw new FormulaError(`Yahan "${type === "rparen" ? ")" : type}" hona chahiye tha.`, t ? t.at : -1);
    }
    pos++;
    return t;
  };

  function parseExpr(minPrec = 0) {
    let left = parseUnary();
    while (true) {
      const t = peek();
      if (!t || t.type !== "op") break;
      const prec = PREC[t.value];
      if (prec === undefined || prec < minPrec) break;
      pos++;
      const nextMin = RIGHT_ASSOC[t.value] ? prec : prec + 1;
      const right = parseExpr(nextMin);
      left = { type: "binary", op: t.value, left, right };
    }
    return left;
  }

  function parseUnary() {
    const t = peek();
    if (t && t.type === "op" && (t.value === "-" || t.value === "+")) {
      pos++;
      /* Unary minus ki priority ^ se kam par * se zyada hai:
         -2^2 Excel me 4 deta hai (yaani (-2)^2), Math ke ulta. */
      return { type: "unary", op: t.value, arg: parseUnary() };
    }
    return parsePostfix();
  }

  function parsePostfix() {
    let node = parsePrimary();
    while (peek() && peek().type === "percent") { pos++; node = { type: "percent", arg: node }; }
    return node;
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new FormulaError("Formula adhoora hai — aage kuchh hona chahiye tha.");

    if (t.type === "number" || t.type === "string" || t.type === "error") {
      pos++;
      return { type: t.type, value: t.value };
    }
    if (t.type === "ref" || t.type === "range" || t.type === "colrange" || t.type === "rowrange") {
      pos++;
      return { ...t, nodeType: t.type };
    }
    if (t.type === "name") {
      pos++;
      const up = String(t.value).toUpperCase();
      if (up === "TRUE" || up === "FALSE") return { type: "bool", value: up === "TRUE" };
      return { type: "name", value: t.value };
    }
    if (t.type === "func") {
      pos++;
      eat("lparen");
      const args = [];
      if (peek() && peek().type !== "rparen") {
        args.push(parseArg());
        while (peek() && peek().type === "comma") { pos++; args.push(parseArg()); }
      }
      eat("rparen");
      return { type: "func", name: String(t.value).toUpperCase(), raw: t.value, args };
    }
    if (t.type === "lparen") {
      pos++;
      const inner = parseExpr(0);
      eat("rparen");
      return { type: "paren", arg: inner };
    }
    if (t.type === "lbrace") {
      /* {1,2;3,4} — array constant. Ise poora samajhne ki zaroorat nahi,
         bas nigal lete hain taaki baaki formula padha ja sake. */
      pos++;
      const items = [];
      while (peek() && peek().type !== "rbrace") {
        if (peek().type === "comma") { pos++; continue; }
        items.push(parseExpr(0));
      }
      eat("rbrace");
      return { type: "array", items };
    }
    throw new FormulaError(`Yahan "${t.value}" ki ummeed nahi thi.`, t.at);
  }

  /* IF(A1>5,,"na") jaisi jagah par khaali argument bhi chalta hai */
  function parseArg() {
    const t = peek();
    if (!t || t.type === "comma" || t.type === "rparen") return { type: "empty" };
    return parseExpr(0);
  }

  const ast = parseExpr(0);
  if (pos < tokens.length) {
    const t = tokens[pos];
    throw new FormulaError(`Formula ke baad fazool me "${t.value}" pada hai.`, t.at);
  }
  return ast;
}

/* AST ko wapas text me badalna — explainer har hisse ko dikhane ke liye
   isi ka istemaal karta hai, taaki student ko wahi roop dikhe jo usne
   likha tha (sirf saaf-suthra). */
export function stringify(node) {
  if (!node) return "";
  switch (node.type) {
    case "number": return String(node.value);
    case "string": return `"${String(node.value).replace(/"/g, '""')}"`;
    case "bool": return node.value ? "TRUE" : "FALSE";
    case "error": return node.value;
    case "empty": return "";
    case "name": return node.value;
    case "ref":
    case "range":
    case "colrange":
    case "rowrange":
      return node.sheet ? `${quoteSheet(node.sheet)}!${node.value}` : node.value;
    case "func": return `${node.name}(${node.args.map(stringify).join(", ")})`;
    case "paren": return `(${stringify(node.arg)})`;
    case "unary": return `${node.op}${stringify(node.arg)}`;
    case "percent": return `${stringify(node.arg)}%`;
    case "array": return `{${node.items.map(stringify).join(", ")}}`;
    case "binary": return `${stringify(node.left)} ${node.op} ${stringify(node.right)}`;
    default: return "";
  }
}

const quoteSheet = (s) => (/[^A-Za-z0-9_]/.test(s) ? `'${s}'` : s);

/* Formula me istemaal hue saare functions ki list (bina dohraav ke) */
export function functionsUsed(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (node.type === "func" && !out.includes(node.name)) out.push(node.name);
  ["left", "right", "arg", "args", "items"].forEach((k) => {
    const v = node[k];
    if (Array.isArray(v)) v.forEach((n) => functionsUsed(n, out));
    else if (v && typeof v === "object") functionsUsed(v, out);
  });
  return out;
}

/* Formula kitna gehra nested hai — explainer isse tay karta hai ki
   "andar se bahar" kitne kadam dikhane hain. */
export function depth(node) {
  if (!node || typeof node !== "object") return 0;
  let max = 0;
  ["left", "right", "arg", "args", "items"].forEach((k) => {
    const v = node[k];
    if (Array.isArray(v)) v.forEach((n) => { max = Math.max(max, depth(n)); });
    else if (v && typeof v === "object") max = Math.max(max, depth(v));
  });
  return max + (node.type === "func" ? 1 : 0);
}

/* ---------------- Column letter <-> number ----------------
   A=1, B=2 … Z=26, AA=27. Explainer isse range ki chaudai naapta hai
   (VLOOKUP ka column number range se bahar to nahi ja raha), aur aage
   mini Excel ko bhi yahi chahiye hoga. */
export function colToNum(letters) {
  let n = 0;
  for (const ch of String(letters).toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n;
}

export function numToCol(n) {
  let s = "";
  let x = Number(n);
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

/* Range me kitne column aur kitni row hain. Sirf cell-range par chalta hai
   (A1:C10); poore column/row wale range ki ginti ka matlab nahi. */
export function rangeSize(node) {
  if (!node || node.type !== "range" || !node.from || !node.to) return null;
  const c1 = colToNum(node.from.col), c2 = colToNum(node.to.col);
  const r1 = node.from.row, r2 = node.to.row;
  return {
    cols: Math.abs(c2 - c1) + 1,
    rows: Math.abs(r2 - r1) + 1,
    cells: (Math.abs(c2 - c1) + 1) * (Math.abs(r2 - r1) + 1)
  };
}
