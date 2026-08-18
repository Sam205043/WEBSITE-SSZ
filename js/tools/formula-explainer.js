/* ==========================================================================
   Soft Skill Zone — Excel Formula Explainer
   --------------------------------------------------------------------------
   Student koi bhi formula paste karta hai, aur ye use Hinglish me tod kar
   samjhata hai — andar se bahar ki taraf, jaise Excel khud chalata hai.

   Sabse kaam ki cheez "Dhyan dein" wala hissa hai: wo un galtiyon ko pakadta
   hai jo lab me roz hoti hain — VLOOKUP me 0 na lagana, table ko $ se na
   baandhna, column number range se bahar chala jaana. Ye galtiyaan error
   nahi detin, chupchaap GALAT jawab deti hain — isliye inhe pakadna hi
   sabse zyada kaam ka hai.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { parse, stringify, FormulaError, rangeSize, colToNum } from "./formula-parser.js";
import { EXCEL_FUNCTIONS, FUNCTION_GROUPS, lookupFunction } from "../config/excel-function-bank.js";
import { loadPack } from "../core/i18n.js";

const EXAMPLES = [
  '=VLOOKUP(A2,Sheet2!A:C,3,0)',
  '=IF(B2>=33,"Pass","Fail")',
  '=SUMIF(C2:C100,"Ara",D2:D100)',
  '=IFERROR(VLOOKUP(A2,$F$2:$G$50,2,0),"Nahi mila")',
  '=ROUND(B2*18%,2)',
  '=TEXTJOIN(", ",TRUE,A2:A10)',
  '=INDEX(C2:C50,MATCH(A2,B2:B50,0))',
  '=PMT(12%/12,60,-500000)'
];

/* ==========================================================================
   Ek node ko ek line me batana
   --------------------------------------------------------------------------
   YAHAN SE AAGE HAR VAAKYA TUKDON KI LIST HAI, EK JUDI HUI STRING NAHI.

   Wajah anuvaad hai. i18n har text node ko poora-ka-poora dictionary me
   dhoondhta hai. "cell A2 ko cell B2 se ghataata hai." jaisi line har baar
   naye cell ke naam se banti hai — uski entry dictionary me ho hi nahi
   sakti, isliye English chunne par bhi wo Hinglish reh jaati thi.

   Tukdon me todne par cell ka naam apne alag node me chala jaata hai (jo
   dictionary me nahi milega — theek hai, wo waise bhi nahi badalna) aur
   baaki likha hua hissa apne node me, jiski entry dictionary me hai.

   Ek anushasan: tukdon ka KRAM dono bhasha me ek jaisa rehna chahiye,
   kyunki jagah wahi ki wahi rehti hai. Isliye operator ka chinh (+ - * /)
   beech me rakha gaya hai aur uska matlab aakhir me — dono bhasha me.
   ========================================================================== */
const OP_WORD = {
  "+": "jodta hai", "-": "ghataata hai", "*": "guna karta hai", "/": "bhaag deta hai",
  "^": "ghaat lagata hai", "&": "jod kar ek text banata hai",
  "=": "barabar hai ya nahi, ye jaanchta hai",
  "<>": "barabar NAHI hai, ye jaanchta hai",
  "<": "pehla chhota hai ya nahi, ye jaanchta hai",
  ">": "pehla bada hai ya nahi, ye jaanchta hai",
  "<=": "pehla chhota ya barabar hai ya nahi, ye jaanchta hai",
  ">=": "pehla bada ya barabar hai ya nahi, ye jaanchta hai"
};

function sayNode(node) {
  if (!node) return [];
  switch (node.type) {
    case "number": return ["number ", String(node.value)];
    case "string": return ['text "', String(node.value), '"'];
    case "bool": return [node.value ? "TRUE (haan)" : "FALSE (na)"];
    case "error": return ["error value ", String(node.value)];
    case "empty": return ["khaali (kuchh nahi)"];
    case "ref": return ["cell ", stringify(node)];
    case "range": {
      const s = rangeSize(node);
      return s
        ? ["range ", stringify(node), " (", String(s.rows), " row × ", String(s.cols), " column)"]
        : ["range ", stringify(node)];
    }
    case "colrange": return ["poora column ", stringify(node)];
    case "rowrange": return ["poori row ", stringify(node)];
    case "name": return ['naam "', String(node.value), '"'];
    case "func": return [node.name, "(...) ka natija"];
    case "paren": return sayNode(node.arg);
    case "percent": return [stringify(node.arg), " ka pratishat"];
    case "unary": return node.op === "-" ? [stringify(node.arg), " ka minus"] : [stringify(node.arg)];
    case "binary": return [stringify(node)];
    case "array": return ["khud likhi hui list"];
    default: return [stringify(node)];
  }
}

/* "cell B1 / cell A1 — bhaag deta hai." — chinh beech me, matlab aakhir me. */
function sayBinary(node) {
  return [
    ...sayNode(node.left), " ", node.op, " ", ...sayNode(node.right),
    " — ", OP_WORD[node.op] || node.op, "."
  ];
}

/* ==========================================================================
   Kadam banana — andar se bahar
   ========================================================================== */
function collectSteps(node, steps = [], hasFn = { v: false }) {
  if (!node || typeof node !== "object") return steps;

  ["left", "right", "arg", "args", "items"].forEach((k) => {
    const v = node[k];
    if (Array.isArray(v)) v.forEach((n) => collectSteps(n, steps, hasFn));
    else if (v && typeof v === "object") collectSteps(v, steps, hasFn);
  });

  if (node.type === "func") {
    hasFn.v = true;
    const meta = lookupFunction(node.name);
    const argTexts = node.args.map(stringify);
    let say;
    if (meta && typeof meta.tell === "function") say = meta.tell(argTexts);
    else if (meta) say = meta.one;
    else say = [`"${node.name}"`, " naam ka function chalega. Ye hamare kosh me nahi hai — spelling dobara dekh lijiye."];
    steps.push({ code: stringify(node), say, fn: node.name, known: !!meta });
  }
  return steps;
}

/* Bina function wale formula (jaise =B1/A1*100) ke liye ganit ke kadam */
function arithSteps(node, steps = []) {
  if (!node || typeof node !== "object") return steps;
  ["left", "right", "arg"].forEach((k) => {
    if (node[k] && typeof node[k] === "object") arithSteps(node[k], steps);
  });
  if (node.type === "binary") {
    steps.push({ code: stringify(node), say: sayBinary(node) });
  } else if (node.type === "percent") {
    steps.push({ code: stringify(node), say: [stringify(node.arg), " ko 100 se bhaag deta hai (pratishat)."] });
  }
  return steps;
}

/* ==========================================================================
   Formula ke saare hisse ginna
   ========================================================================== */
function collectParts(node, out = { refs: [], ranges: [], funcs: [], ops: [], sheets: [] }) {
  if (!node || typeof node !== "object") return out;
  const add = (arr, v) => { if (v && !arr.includes(v)) arr.push(v); };

  if (node.type === "ref") add(out.refs, stringify(node));
  if (node.type === "range" || node.type === "colrange" || node.type === "rowrange") add(out.ranges, stringify(node));
  if (node.sheet) add(out.sheets, node.sheet);
  if (node.type === "func") add(out.funcs, node.name);
  if (node.type === "binary") add(out.ops, node.op);
  if (node.type === "percent") add(out.ops, "%");

  ["left", "right", "arg", "args", "items"].forEach((k) => {
    const v = node[k];
    if (Array.isArray(v)) v.forEach((n) => collectParts(n, out));
    else if (v && typeof v === "object") collectParts(v, out);
  });
  return out;
}

/* ==========================================================================
   Dhyan dein — wo galtiyaan jo error nahi detin, bas galat jawab deti hain
   ========================================================================== */
function findWarnings(root) {
  const warn = [];
  const seen = new Set();
  /* Tukdon me — upar wali tippani dekhein. Dobara aane se rokne ke liye
     jude hue roop ko chaabi banate hain. */
  const push = (level, ...parts) => {
    const key = parts.join("");
    if (seen.has(key)) return;
    seen.add(key);
    warn.push({ level, text: parts });
  };

  let ifCount = 0;
  let hasErrorGuard = false;
  let hasDivide = false;

  (function walk(node) {
    if (!node || typeof node !== "object") return;

    if (node.type === "binary" && node.op === "/") hasDivide = true;

    if (node.type === "func") {
      const name = node.name;
      const a = node.args || [];

      if (name === "IF") {
        ifCount++;
        if (a.length === 2) {
          push("warn", "IF me teesra hissa nahi diya. Shart galat hone par Excel FALSE likh dega — aksar wahan \"\" (khaali) ya koi doosri value chahiye hoti hai.");
        }
      }
      if (name === "IFERROR" || name === "IFNA") hasErrorGuard = true;

      if (name === "VLOOKUP" || name === "HLOOKUP") {
        const last = a[3];
        if (a.length < 4 || (last && last.type === "empty")) {
          push("danger", name, ' me aakhri hissa (0) nahi lagaya. Bina iske Excel "aas-paas ki" value utha leta hai — error nahi dega, chupchaap GALAT jawab dega. Aakhir me 0 laga dijiye.');
        } else if (last && ((last.type === "bool" && last.value === true) || (last.type === "number" && last.value === 1))) {
          push("danger", name, " me aakhri hissa ", last.type === "bool" ? "TRUE" : "1",
            ' hai — matlab "milta-julta chalega". Exact value chahiye to 0 (ya FALSE) kijiye.');
        }

        const table = a[1];
        if (table && table.type === "range") {
          const loose = !(table.from.colAbs && table.from.rowAbs && table.to.colAbs && table.to.rowAbs);
          if (loose) {
            push("warn", "Table ka pata ", stringify(table),
              " bina $ ke hai. Formula ko neeche kheenchte (fill) hi ye range khisak jaayega aur neeche wali rows galat jawab dengi. $ lagaayein: ",
              absolutize(table));
          }
          const size = rangeSize(table);
          const idx = a[2];
          if (size && idx && idx.type === "number") {
            if (idx.value > size.cols) {
              push("danger", "Column number ", String(idx.value), " maanga hai, par ", stringify(table),
                " me sirf ", String(size.cols), " column hain. Excel #REF! dega.");
            } else if (idx.value < 1) {
              push("danger", "Column number 1 se kam nahi ho sakta. Excel #VALUE! dega.");
            }
          }
        }
        if (table && table.type === "colrange") {
          push("info", stringify(table), " poora column hai — chalega to sahi, par bade file me sheet dheemi ho jaati hai. Jitni rows me data hai utna hi range lena behtar hai.");
        }
      }

      if (name === "MATCH" && a.length < 3) {
        push("warn", "MATCH me aakhri 0 nahi lagaya. Bina iske Excel maan leta hai ki list kram me lagi hui hai — aur galat jagah ka number de deta hai.");
      }

      if ((name === "SUMIFS" || name === "COUNTIFS" || name === "AVERAGEIFS")) {
        const rest = name === "SUMIFS" || name === "AVERAGEIFS" ? a.length - 1 : a.length;
        if (rest % 2 !== 0) {
          push("warn", name, " me range aur shart jodi me aate hain. Abhi ginti jodi me nahi baith rahi — koi hissa chhoot gaya lagta hai.");
        }
      }

      if (!lookupFunction(name)) {
        push("info", `"${name}"`, " hamare kosh me nahi mila. Ya to spelling me galti hai, ya ye function hamari list me nahi hai.");
      }
    }

    ["left", "right", "arg", "args", "items"].forEach((k) => {
      const v = node[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") walk(v);
    });
  })(root);

  if (ifCount >= 4) {
    push("info", String(ifCount), " IF ek doosre ke andar hain. Chalega, par padhna-sudharna mushkil ho jaata hai — IFS ya ek chhoti lookup table zyada saaf rehti hai.");
  }
  if (hasDivide && !hasErrorGuard) {
    push("info", "Bhaag (/) lag raha hai. Neeche wala hissa kabhi 0 ya khaali hua to #DIV/0! aayega — chaahein to IFERROR se sambhaal lein.");
  }
  if (hasErrorGuard) {
    push("info", "IFERROR error ko chhupa deta hai, theek nahi karta. Ek baar bina IFERROR ke chala kar dekh lein ki asli galti kya thi.");
  }
  return warn;
}

/* A1:C10 → $A$1:$C$10 */
function absolutize(range) {
  const f = range.from, t = range.to;
  return `$${f.col}$${f.row}:$${t.col}$${t.row}`;
}

/* ==========================================================================
   Poore formula ki ek line
   ========================================================================== */
function summarise(root, parts) {
  if (root.type === "func") {
    const meta = lookupFunction(root.name);
    if (meta && typeof meta.tell === "function") return meta.tell(root.args.map(stringify));
    if (meta) return meta.one;
  }
  if (root.type === "binary") {
    return sayBinary(root);
  }
  if (parts.funcs.length) {
    return ["Ye formula ", parts.funcs.join(", "), " ka istemaal karke natija nikaalta hai."];
  }
  return ["Ye ", ...sayNode(root), " deta hai."];
}

/* ==========================================================================
   UI
   ========================================================================== */
function chipRow(title, items, cls = "") {
  if (!items.length) return null;
  return el("div", { style: { marginBottom: ".85rem" } },
    el("span", { style: { fontSize: ".75rem", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: ".35rem" } }, title),
    el("div", { style: { display: "flex", flexWrap: "wrap", gap: ".35rem" } },
      items.map((t) => el("code", { class: `fx-chip ${cls}` }, t)))
  );
}

function warnBox(w) {
  const colour = { danger: "var(--danger)", warn: "var(--warning, #b45309)", info: "var(--text-muted)" }[w.level];
  const ic = { danger: "alert", warn: "alert", info: "info" }[w.level];
  return el("li", { class: `fx-warn fx-warn--${w.level}` },
    el("span", { class: "fx-warn__icon", style: { color: colour }, html: icon(ic, { size: 17 }) }),
    el("span", {}, w.text));   // w.text tukdon ki list hai — el() use khud khol leta hai
}

function funcCard(name) {
  const m = lookupFunction(name);
  if (!m) return null;
  return el("div", { class: "fx-fn" },
    el("div", { class: "fx-fn__sig" }, m.sig),
    el("p", { class: "fx-fn__one" }, m.one),
    el("p", { class: "fx-fn__how" }, m.how),
    m.tip ? el("p", { class: "fx-fn__tip" },
      el("strong", {}, "Dhyan: "), m.tip) : null);
}

function showError(err, raw) {
  render($("#fxOut"),
    el("div", { class: "fx-card fx-card--bad" },
      el("h3", {}, "Formula padha nahi ja saka"),
      el("p", { style: { margin: ".4rem 0 0" } }, err.parts || err.message),
      err.at >= 0 && raw
        ? el("pre", { class: "fx-point" }, `${raw}\n${" ".repeat(Math.max(0, err.at))}^`)
        : null,
      el("p", { class: "fx-fn__how", style: { marginTop: ".75rem" } },
        "Aksar ye hota hai: koi bracket band nahi hua, ya quote adhoora reh gaya. " +
        "Bracket gin lijiye — jitne ( hain utne hi ) hone chahiye.")
    ));
}

function explain(raw) {
  const text = String(raw || "").trim();
  if (!text) { render($("#fxOut")); return; }

  let ast;
  try {
    ast = parse(text);
  } catch (err) {
    if (err instanceof FormulaError) return showError(err, text);
    return showError({ message: err.message, at: -1 }, text);
  }

  const parts = collectParts(ast);
  const fnSteps = collectSteps(ast);
  const steps = fnSteps.length ? fnSteps : arithSteps(ast);
  const warnings = findWarnings(ast);

  render($("#fxOut"),
    /* ---- ek line me ---- */
    el("div", { class: "fx-card" },
      el("h3", {}, "Ek line me"),
      el("p", { class: "fx-summary" }, summarise(ast, parts)),
      el("pre", { class: "fx-formula" }, `=${stringify(ast)}`)
    ),

    /* ---- kadam ---- */
    steps.length
      ? el("div", { class: "fx-card" },
          el("h3", {}, "Kadam-dar-kadam"),
          el("p", { class: "fx-fn__how", style: { marginTop: "-.25rem" } },
            "Excel sabse andar wale hisse se shuru karta hai, fir bahar ki taraf aata hai. Kram yahi hai:"),
          el("ol", { class: "fx-steps" }, steps.map((s) =>
            el("li", {},
              el("code", { class: "fx-steps__code" }, s.code),
              el("span", { class: "fx-steps__say" }, s.say))))
        )
      : null,

    /* ---- dhyan dein ---- */
    warnings.length
      ? el("div", { class: "fx-card" },
          el("h3", {}, "Dhyan dein"),
          el("ul", { class: "fx-warns" }, warnings.map(warnBox)))
      : null,

    /* ---- hisse ---- */
    (parts.refs.length || parts.ranges.length || parts.sheets.length)
      ? el("div", { class: "fx-card" },
          el("h3", {}, "Formula ke hisse"),
          chipRow("Cells", parts.refs),
          chipRow("Ranges", parts.ranges),
          chipRow("Doosri sheet", parts.sheets),
          parts.ops.length ? chipRow("Chinh (operators)", parts.ops) : null)
      : null,

    /* ---- functions ---- */
    parts.funcs.filter(lookupFunction).length
      ? el("div", { class: "fx-card" },
          el("h3", {}, "Istemaal hue functions"),
          parts.funcs.map(funcCard).filter(Boolean))
      : null
  );
}

/* ==========================================================================
   Saare functions ki list (neeche wala hissa)
   ========================================================================== */
let listQuery = "";

function paintList() {
  const q = listQuery.trim().toLowerCase();
  const rows = Object.entries(EXCEL_FUNCTIONS)
    .filter(([name, m]) =>
      !q || name.toLowerCase().includes(q) || m.one.toLowerCase().includes(q) ||
      m.how.toLowerCase().includes(q) || m.grp.toLowerCase().includes(q))
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (!rows.length) {
    return render($("#fxList"),
      el("p", { class: "fx-fn__how" }, `"${listQuery}"`, " se milta koi function nahi mila."));
  }

  const byGroup = {};
  rows.forEach(([name, m]) => { (byGroup[m.grp] ||= []).push([name, m]); });

  render($("#fxList"), FUNCTION_GROUPS.filter((g) => byGroup[g]).map((g) =>
    el("section", { style: { marginBottom: "1.5rem" } },
      el("h3", { class: "fx-group" }, g, el("span", { class: "fx-group__n" }, String(byGroup[g].length))),
      el("div", { class: "fx-grid" }, byGroup[g].map(([name]) => funcCard(name)))
    )));
  $("#fxListCount").textContent = `${rows.length} function`;
}

/* ==========================================================================
   Boot
   ========================================================================== */
onReady(() => {

  /* In tools ka saara padhne wala text ek hi anuvaad-file me hai
     (lang/en.tools.json) aur sirf zaroorat par utarta hai. Await nahi kar
     rahe — pack aate hi i18n poore page ka text khud badal deta hai.
     Hinglish par ye line kuch karti hi nahi. */
  loadPack("tools");
  render($("#fxExamples"), EXAMPLES.map((e) =>
    el("button", { type: "button", class: "chip", dataset: { ex: e } }, e)));

  const input = $("#fxInput");

  const run = () => explain(input.value);

  $("#fxGo").addEventListener("click", run);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(); } });

  on($("#fxExamples"), "click", ".chip", (e, chip) => {
    input.value = chip.dataset.ex;
    run();
    input.focus();
  });

  $("#fxClear").addEventListener("click", () => {
    input.value = "";
    render($("#fxOut"));
    input.focus();
  });

  $("#fxSearch").addEventListener("input", (e) => {
    listQuery = e.target.value;
    paintList();
  });

  paintList();

  /* Pehli baar khulne par ek udaharan chala kar dikha dete hain — khaali
     dabba dekh kar bahut se log samajh hi nahi paate ki karna kya hai. */
  input.value = EXAMPLES[0];
  run();
});
