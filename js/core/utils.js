/* ==========================================================================
   Soft Skill Zone — Utilities
   Formatting, dates, currency, text, timing, storage, scroll reveal.
   ========================================================================== */

import { LOCALE, CURRENCY, DATE_FMT } from "./constants.js";

/* ==========================================================================
   Currency & numbers (Indian format)
   ========================================================================== */

/** 125000 -> "₹1,25,000" */
export function money(amount, { decimals = 0, symbol = true } = {}) {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat(LOCALE, {
    style: symbol ? "currency" : "decimal",
    currency: CURRENCY,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(n);
}

/** 1250000 -> "12.5 L", 12500000 -> "1.25 Cr" */
export function shortMoney(amount) {
  const n = Number(amount) || 0;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.00$/, "")} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.00$/, "")} L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return money(n);
}

export function num(value, decimals = 0) {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number(value) || 0);
}

export const pct = (value, total, decimals = 1) =>
  !total ? "0%" : `${((Number(value) / Number(total)) * 100).toFixed(decimals).replace(/\.0$/, "")}%`;

export const clamp = (v, min, max) => Math.min(Math.max(Number(v) || 0, min), max);

/** Amount in words — used on fee receipts. */
export function amountInWords(amount) {
  const n = Math.floor(Math.abs(Number(amount) || 0));
  if (n === 0) return "Zero Rupees Only";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const two = (x) => x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? " " + ones[x % 10] : ""}`;
  const three = (x) => x >= 100
    ? `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? " " + two(x % 100) : ""}`
    : two(x);

  const parts = [];
  const crore = Math.floor(n / 1e7);
  const lakh  = Math.floor((n % 1e7) / 1e5);
  const thou  = Math.floor((n % 1e5) / 1e3);
  const rest  = n % 1e3;

  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh)  parts.push(`${three(lakh)} Lakh`);
  if (thou)  parts.push(`${three(thou)} Thousand`);
  if (rest)  parts.push(three(rest));

  return `${parts.join(" ")} Rupees Only`;
}

/* ==========================================================================
   Dates
   ========================================================================== */

/** Accepts Firestore Timestamp | Date | ISO string | ms number. */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value) ? null : value;
  if (typeof value.toDate === "function") return value.toDate();     // Firestore Timestamp
  if (typeof value === "object" && "seconds" in value) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d) ? null : d;
}

export function formatDate(value, style = "display") {
  const d = toDate(value);
  if (!d) return "—";
  return new Intl.DateTimeFormat(LOCALE, DATE_FMT[style] || DATE_FMT.display).format(d);
}

export const formatTime     = (v) => formatDate(v, "time");
export const formatDateTime = (v) => formatDate(v, "dateTime");

/** "2 din pehle", "abhi", "3 mahine baad" */
export function timeAgo(value) {
  const d = toDate(value);
  if (!d) return "—";
  const diff = Date.now() - d.getTime();
  const past = diff >= 0;
  const s = Math.abs(diff) / 1000;

  const units = [
    [60, "second", "sec"],
    [3600, "minute", "min"],
    [86400, "hour", "ghante"],
    [604800, "day", "din"],
    [2629800, "week", "hafte"],
    [31557600, "month", "mahine"],
    [Infinity, "year", "saal"]
  ];

  if (s < 45) return past ? "abhi" : "abhi";
  let prev = 1;
  for (const [limit, , hindi] of units) {
    if (s < limit) {
      const val = Math.round(s / prev);
      return past ? `${val} ${hindi} pehle` : `${val} ${hindi} baad`;
    }
    prev = limit;
  }
  return formatDate(d);
}

/** "YYYY-MM-DD" in local time — safe for Firestore date keys. */
export function dateKey(value = new Date()) {
  const d = toDate(value) || new Date();
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Value for <input type="datetime-local">. */
export function dateTimeLocal(value = new Date()) {
  const d = toDate(value) || new Date();
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ageFrom(dob) {
  const d = toDate(dob);
  if (!d) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
  return years;
}

export function daysBetween(a, b = new Date()) {
  const d1 = toDate(a), d2 = toDate(b);
  if (!d1 || !d2) return 0;
  return Math.round((d2 - d1) / 86400000);
}

export const isPast   = (v) => { const d = toDate(v); return !!d && d.getTime() < Date.now(); };
export const isToday  = (v) => dateKey(v) === dateKey(new Date());

/* ==========================================================================
   Text
   ========================================================================== */
export const escapeHtml = (str) => String(str ?? "").replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const slugify = (str) => String(str ?? "")
  .toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g, "")
  .replace(/[\s_-]+/g, "-")
  .replace(/^-+|-+$/g, "");

export const truncate = (str, n = 120) => {
  const s = String(str ?? "");
  return s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "…";
};

export const titleCase = (str) => String(str ?? "")
  .toLowerCase()
  .replace(/\b\w/g, (c) => c.toUpperCase());

export function initials(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Wrap search matches in <mark>. Input is escaped first. */
export function highlight(text, term) {
  const safe = escapeHtml(text);
  if (!term) return safe;
  const rx = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return safe.replace(rx, "<mark>$1</mark>");
}

/* ==========================================================================
   Phone / links
   ========================================================================== */
export const digits = (v) => String(v ?? "").replace(/\D/g, "");

/** "+91 98765 43210" */
export function formatPhone(v) {
  const d = digits(v).slice(-10);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : String(v ?? "");
}

export const telLink = (v) => `tel:+91${digits(v).slice(-10)}`;

export function whatsappLink(number, message = "") {
  const n = digits(number);
  const wa = n.length === 10 ? `91${n}` : n;
  return `https://wa.me/${wa}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

export const mapsLink = (address) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/* ==========================================================================
   Timing
   ========================================================================== */
export function debounce(fn, wait = 300) {
  let t;
  const debounced = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  debounced.cancel = () => clearTimeout(t);
  return debounced;
}

export function throttle(fn, wait = 200) {
  let last = 0, timer = null;
  return (...args) => {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) { last = now; fn(...args); }
    else if (!timer) {
      timer = setTimeout(() => { last = Date.now(); timer = null; fn(...args); }, remaining);
    }
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ==========================================================================
   Local storage (JSON-safe, never throws)
   ========================================================================== */
export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } }
};

/* ==========================================================================
   Misc
   ========================================================================== */
export const uid = (prefix = "id") =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const groupBy = (arr, keyFn) => arr.reduce((acc, item) => {
  const k = typeof keyFn === "function" ? keyFn(item) : item[keyFn];
  (acc[k] ||= []).push(item);
  return acc;
}, {});

export const sum = (arr, keyFn) => arr.reduce((a, item) =>
  a + (typeof keyFn === "function" ? keyFn(item) : keyFn ? Number(item[keyFn]) || 0 : Number(item) || 0), 0);

export const unique = (arr, keyFn) => {
  if (!keyFn) return [...new Set(arr)];
  const seen = new Set();
  return arr.filter((x) => {
    const k = typeof keyFn === "function" ? keyFn(x) : x[keyFn];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

/** Export an array of objects as a CSV file (opens in Excel). */
export function exportCSV(rows, filename = "export.csv", headers = null) {
  if (!rows?.length) return false;
  const cols = headers || Object.keys(rows[0]);
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    cols.map(esc).join(","),
    ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))
  ].join("\r\n");

  // BOM so Excel reads UTF-8 (₹, Hindi names) correctly
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return true;
}

/* ==========================================================================
   Scroll reveal + count-up (paired with css/animations.css)
   ========================================================================== */

/**
 * Reveal [data-reveal] elements as they enter the viewport.
 *
 * Because revealed content starts at opacity:0, a missed callback would leave a
 * section permanently invisible. So this pairs the IntersectionObserver with a
 * throttled scroll fallback that does a plain geometry check — fast scrolling,
 * restored scroll positions and anchor jumps are all covered.
 */
export function observeReveal(scope = document) {
  const items = new Set(scope.querySelectorAll("[data-reveal]:not(.is-revealed)"));
  if (!items.size) return;

  const reveal = (node) => {
    if (!items.has(node)) return;
    items.delete(node);
    const delay = Number(node.dataset.revealDelay || 0);
    if (delay) setTimeout(() => node.classList.add("is-revealed"), delay);
    else node.classList.add("is-revealed");
  };

  if (!("IntersectionObserver" in window)) {
    items.forEach((n) => n.classList.add("is-revealed"));
    items.clear();
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -50px 0px" });

  items.forEach((n) => io.observe(n));

  // Fallback sweep
  const sweep = throttle(() => {
    if (!items.size) {
      window.removeEventListener("scroll", sweep);
      window.removeEventListener("resize", sweep);
      return;
    }
    const limit = window.innerHeight - 50;
    Array.from(items).forEach((node) => {
      if (node.getBoundingClientRect().top < limit) {
        io.unobserve(node);
        reveal(node);
      }
    });
  }, 120);

  window.addEventListener("scroll", sweep, { passive: true });
  window.addEventListener("resize", sweep, { passive: true });
  sweep();
}

/** Animate [data-count="1500"] numbers when they scroll into view. */
export function observeCounters(scope = document) {
  const items = Array.from(scope.querySelectorAll("[data-count]:not(.is-counted)"));
  if (!items.length) return;

  const run = (node) => {
    node.classList.add("is-counted");
    const target = Number(node.dataset.count) || 0;
    const suffix = node.dataset.countSuffix || "";
    const duration = Number(node.dataset.countDuration) || 1600;
    const start = performance.now();

    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = num(Math.round(target * eased)) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else node.classList.add("anim-count");
    };
    requestAnimationFrame(step);
  };

  if (!("IntersectionObserver" in window)) return items.forEach(run);

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      run(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.4 });

  items.forEach((n) => io.observe(n));
}

/* --------------------------------------------------------------------------
   Google Drive ke link se file id nikaalna

   Drive ka link kai roop me aata hai — rclone `/view?usp=drivesdk` deta hai,
   haath se copy karne par kabhi `open?id=` bhi aa jaata hai. Teeno se id nikal
   aati hai; na nikle to khaali string, jise "ye Drive ka link nahi hai" maana
   jaata hai.

   Ye yahan (utils me) isliye hai ki teen jagah chahiye: class recording ka
   player, audiobook chadhane wala admin form, aur audiobook ka player.
   -------------------------------------------------------------------------- */
export function driveFileId(link) {
  const s = String(link || "");
  return (
    s.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/)?.[1] ||
    s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/)?.[1] ||
    ""
  );
}
