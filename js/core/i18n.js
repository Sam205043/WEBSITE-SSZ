/* ==========================================================================
   Soft Skill Zone — Bhasha badalne ka intezaam (i18n)
   --------------------------------------------------------------------------
   Teen roop:
     hinglish  Roman akshar, Hindi bol-chaal   "Fees jama karein"   (default)
     hi        Devanagari Hindi                "फ़ीस जमा करें"
     en        Saada English                   "Pay Fees"

   KAAM KAISE KARTA HAI

   Har Hinglish vaakya khud apni chaabi hai. Yaani alag se `fees.pay` jaisa
   naam nahi banaya — dictionary me seedha "Fees jama karein" likha hai aur
   uske saamne Hindi/English. Do wajah:

     1. 67 page aur poore JS me 1,500 naam gadhna aur unhe sahi jagah lagana
        — wahin sabse zyada galti hoti. Yahan code chhoo-e bina kaam ho jata
        hai.
     2. Jis vaakya ka anuvaad abhi likha nahi gaya, wo apne aap Hinglish me
        hi dikh jata hai. Aadhi-adhuri dictionary se page tut-ta nahi.

   Iska ek anushasan hai: dictionary ki chaabi aur code ka vaakya HU-BA-HU
   ek jaise hone chahiye. Code me vaakya badla to dictionary me bhi badlein,
   warna wo line chup-chaap Hinglish reh jayegi.

   TEXT BADALTA KAHAN HAI

   Do jagah — dono apne aap:
     · page khulte hi, HTML ka apna text (`translateNode(document.body)`)
     · jab bhi `render()` se koi nayi cheez screen par aati hai

   Isliye 13 student page ke JS me ek bhi `t()` haath se lagane ki zaroorat
   nahi padi. Student ka naam ya course ka naam galti se badal jaye — aisa
   nahi hota, kyunki badla sirf wahi jata hai jo dictionary me likha ho.

   Bhasha localStorage me yaad rehti hai, isliye har page par dobara chunni
   nahi padti.
   ========================================================================== */

export const LANGS = Object.freeze([
  { code: "hinglish", label: "Hinglish", native: "Hinglish", htmlLang: "en" },
  { code: "hi",       label: "Hindi",    native: "हिंदी",     htmlLang: "hi" },
  { code: "en",       label: "English",  native: "English",  htmlLang: "en" }
]);

const DEFAULT_LANG = "hinglish";
const LS_KEY = "ssz.lang";

/* Devanagari Manrope me hai hi nahi — Hindi chunne par ek Devanagari body
   font chahiye, warna browser koi bhi font utha leta hai aur do alag-alag
   likhawat dikhne lagti hain. Ye sirf Hindi par chadhta hai; Hinglish aur
   English wale par ek byte bhi extra nahi jata. */
const HI_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap";

let dict = null;      // { "Hinglish vaakya": "anuvaad" } — hinglish par null
let lang = DEFAULT_LANG;
let ready = false;

/* ---------------------------------------------------------------- bhasha */

export function getLang() {
  return lang;
}

function readSaved() {
  try {
    const v = localStorage.getItem(LS_KEY);
    return LANGS.some((l) => l.code === v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

/**
 * Nayi bhasha chunta hai aur page dobara khol deta hai.
 *
 * Reload isliye, badalne ke liye nahi: screen par bahut kuchh pehle hi ban
 * chuka hota hai (chart, khuli hui list, aadha bhara form). Sabko peeche se
 * badalne ki koshish me kuchh na kuchh purani bhasha me reh jata. Ek saaf
 * reload me poora page ek hi bhasha me aata hai.
 */
export function setLang(code) {
  if (!LANGS.some((l) => l.code === code)) return;
  try { localStorage.setItem(LS_KEY, code); } catch { /* private mode */ }
  location.reload();
}

/* ------------------------------------------------------------ dictionary */

async function loadDict(code) {
  if (code === DEFAULT_LANG) return null;
  /* Depth se raasta: student portal 2 folder andar hai, root ke page 0 par.
     data-depth body par pehle se lagta hai, wahi se gin lete hain. */
  const depth = Number(document.body?.dataset?.depth || 0);
  const up = "../".repeat(depth);
  try {
    const res = await fetch(`${up}lang/${code}.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[i18n] dictionary nahi mili, Hinglish par hi rahenge:", err.message);
    return null;
  }
}

function addHindiFont() {
  if (document.getElementById("sszHiFont")) return;
  const link = document.createElement("link");
  link.id = "sszHiFont";
  link.rel = "stylesheet";
  link.href = HI_FONT_URL;
  document.head.appendChild(link);
  document.documentElement.classList.add("lang-hi");
}

/**
 * Bhasha tay karta hai, dictionary laata hai aur page ka apna text badal
 * deta hai. Har student page shell se hokar guzarta hai, isliye wahin se
 * ek baar bulaya jata hai.
 */
export async function initI18n() {
  lang = readSaved();
  const meta = LANGS.find((l) => l.code === lang);
  document.documentElement.setAttribute("lang", meta?.htmlLang || "en");

  if (lang !== DEFAULT_LANG) {
    if (lang === "hi") addHindiFont();
    dict = await loadDict(lang);
  }
  ready = true;
  if (dict) {
    /* render() se jo bhi aage banega, wo bhi apne aap badalta rahe. */
    const { setRenderHook } = await import("./dom.js");
    setRenderHook(translateNode);
    translateNode(document.body);
    watchNewNodes();
  }
  return lang;
}

/**
 * Modal, toast aur chat panel `render()` se nahi guzarte — wo seedhe
 * document.body me jud jaate hain. Isliye sirf render() par bharosa karne se
 * quiz ka modal Hinglish me hi reh jata tha.
 *
 * Har jagah alag-alag anuvaad ki line lagane ke bajaye ek pehredaar bitha
 * diya hai: body me jo bhi naya tukda aayega, wahi apne aap badal jayega —
 * aaj ka bhi, aur aage jo naya banega wo bhi.
 *
 * Ye apne aap ko nahi chhedta: hum sirf jude/hate hue node dekhte hain
 * (childList), aur anuvaad me text node ki value badalti hai — jisse
 * childList hilti hi nahi. Isliye koi chakkar nahi banta.
 */
function watchNewNodes() {
  if (!("MutationObserver" in window)) return;
  const mo = new MutationObserver((records) => {
    for (const r of records) {
      for (const node of r.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) translateNode(node);
        else if (node.nodeType === Node.TEXT_NODE) {
          const key = node.nodeValue.trim();
          const hit = key ? lookupWithNumbers(key) : undefined;
          if (hit !== undefined) node.nodeValue = node.nodeValue.replace(key, hit);
        }
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

/**
 * Bhasha chunne ka switch banata hai.
 *
 * <select> hi rakha hai, apna banaya menu nahi — phone par ye system ka apna
 * list kholta hai jo chhote parde par sabse aasan hai, aur keyboard se bhi
 * chal jata hai. Public navbar aur student topbar, dono yahi use karte hain
 * taaki dono jagah ek jaisa dikhe aur ek hi jagah sudhaarna pade.
 */
export function buildLangPicker() {
  const sel = document.createElement("select");
  sel.className = "lang-pick";
  sel.setAttribute("aria-label", "Bhasha chunein / भाषा चुनें");
  for (const l of LANGS) {
    const o = document.createElement("option");
    o.value = l.code;
    o.textContent = l.native;
    if (l.code === lang) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener("change", (e) => setLang(e.target.value));
  return sel;
}

/** Kisi khaali jagah me switch bitha deta hai. Jagah na mile to chup rehta hai. */
export function mountLangPicker(node) {
  if (!node) return;
  node.replaceChildren(buildLangPicker());
}

/**
 * Alag se ek aur dictionary jodta hai — jaise quiz ke sawaal.
 *
 * Sawaalon ki dictionary bhaari hai aur har page par nahi chahiye. Isliye
 * wo alag file me rehti hai aur sirf wahi page maangta hai jise zaroorat
 * ho. Jud-te hi page ka text dobara badal diya jata hai.
 *
 *   await loadPack("quiz")   →   lang/hi.quiz.json
 */
export async function loadPack(name) {
  if (lang === DEFAULT_LANG || !name) return false;
  const depth = Number(document.body?.dataset?.depth || 0);
  const up = "../".repeat(depth);
  try {
    const res = await fetch(`${up}lang/${lang}.${name}.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const extra = await res.json();
    dict = { ...(dict || {}), ...extra };
    translateNode(document.body);
    return true;
  } catch (err) {
    console.warn(`[i18n] pack "${name}" nahi mila:`, err.message);
    return false;
  }
}

/* ------------------------------------------------------------- anuvaad */

/* Kuchh line ginti ke saath jud kar banti hai — "Sawaal 3 / 25",
   "Poora Test — 100 sawaal". Har ginti ke liye alag entry likhna padta, jo
   ho hi nahi sakta. Isliye pehle seedhi chaabi dhoondhte hain; na mile to
   ginti ki jagah {n} rakh kar dobara dhoondhte hain aur anuvaad me wahi
   ginti wapas bitha dete hain.

   Dictionary me aisa likha jata hai:
     "Sawaal {n} / {n}" : "Sawaal {n} / {n}"
   Number अपनी jagah par lautt aate hain, isliye kram badalne ki zaroorat
   nahi padti. */
function lookupWithNumbers(key) {
  if (dict[key] !== undefined) return dict[key];
  if (!/\d/.test(key)) return undefined;
  const nums = key.match(/\d+(?:[.,]\d+)?/g) || [];
  const shape = key.replace(/\d+(?:[.,]\d+)?/g, "{n}");
  const hit = dict[shape];
  if (hit === undefined) return undefined;
  let i = 0;
  return String(hit).replace(/\{n\}/g, () => (i < nums.length ? nums[i++] : "{n}"));
}

/** Ek vaakya ka anuvaad. Dictionary me na ho to jaisa hai waisa hi wapas. */
export function t(text) {
  if (!dict || text == null) return text;
  const key = String(text).trim();
  const hit = lookupWithNumbers(key);
  if (hit === undefined) return text;
  /* Aage-peeche ki khaali jagah waisi hi rehni chahiye — "Total: " jaise
     tukdon me wo jagah jaan-boojh kar hoti hai. */
  return String(text).replace(key, hit);
}

/* Jin jagahon par text attribute me chhupa hota hai. */
const TEXT_ATTRS = ["placeholder", "title", "aria-label", "alt", "value"];

/* Inke andar ka text kabhi mat chhedna. */
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA"]);

/**
 * Ek hisse ka saara text badal deta hai — andar ke sab bacche bhi.
 * Dictionary na ho (Hinglish) to seedha lautt jata hai, isliye default
 * bhasha par iska koi kharcha nahi.
 */
export function translateNode(root) {
  if (!dict || !root || !ready) return;
  if (root.nodeType === Node.ELEMENT_NODE) translateAttrs(root);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return SKIP_TAGS.has(node.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
      return node.nodeValue && node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  const texts = [];
  const els = [];
  let n;
  while ((n = walker.nextNode())) {
    if (n.nodeType === Node.TEXT_NODE) texts.push(n);
    else els.push(n);
  }

  for (const node of texts) {
    const key = node.nodeValue.trim();
    const hit = lookupWithNumbers(key);
    if (hit !== undefined) node.nodeValue = node.nodeValue.replace(key, hit);
  }
  for (const e of els) translateAttrs(e);
}

function translateAttrs(e) {
  for (const a of TEXT_ATTRS) {
    if (!e.hasAttribute || !e.hasAttribute(a)) continue;
    /* value sirf button par — text box me student ka apna likha hua hai. */
    if (a === "value" && e.tagName !== "BUTTON" && e.type !== "submit" && e.type !== "button") continue;
    const v = e.getAttribute(a);
    const key = String(v).trim();
    const hit = lookupWithNumbers(key);
    if (hit !== undefined) e.setAttribute(a, hit);
  }
}
