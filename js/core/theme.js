/* ==========================================================================
   Soft Skill Zone — Dark / Light theme
   Applies data-theme on <html>, persists the choice, follows the OS until the
   user picks explicitly, and keeps the browser UI colour in sync.
   ========================================================================== */

import { LS_KEYS } from "./constants.js";

const STORAGE_KEY = LS_KEYS.THEME;
const media = window.matchMedia("(prefers-color-scheme: dark)");
const subscribers = new Set();

function stored() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

/** "light" | "dark" — what should be applied right now. */
export function resolveTheme() {
  const saved = stored();
  if (saved === "light" || saved === "dark") return saved;
  return media.matches ? "dark" : "light";
}

export function getTheme() {
  return document.documentElement.getAttribute("data-theme") || resolveTheme();
}

export function applyTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
  document.documentElement.style.colorScheme = t;

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = t === "dark" ? "#060b18" : "#ffffff";

  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(t === "dark"));
    btn.setAttribute("aria-label", t === "dark" ? "Light mode on karein" : "Dark mode on karein");
    const sun  = btn.querySelector("[data-icon-sun]");
    const moon = btn.querySelector("[data-icon-moon]");
    if (sun)  sun.style.display  = t === "dark" ? "block" : "none";
    if (moon) moon.style.display = t === "dark" ? "none"  : "block";
  });

  subscribers.forEach((cb) => { try { cb(t); } catch (e) { console.error(e); } });
  return t;
}

export function setTheme(theme) {
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* private mode */ }
  return applyTheme(theme);
}

export function toggleTheme() {
  return setTheme(getTheme() === "dark" ? "light" : "dark");
}

/** Go back to following the operating system. */
export function useSystemTheme() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  return applyTheme(resolveTheme());
}

export function onThemeChange(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

/** Called once by app.js. Wires every [data-theme-toggle] button. */
export function initTheme() {
  applyTheme(resolveTheme());

  media.addEventListener("change", () => {
    if (!stored()) applyTheme(resolveTheme());
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-toggle]");
    if (btn) { e.preventDefault(); toggleTheme(); }
  });

  // Keep multiple open tabs in sync
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) applyTheme(resolveTheme());
  });
}

/* Inline no-flash snippet. Copy this into <head> of every page BEFORE the CSS
   so the correct theme paints on first frame:

   <script>
     (function(){var t=localStorage.getItem("ssz.theme");
     if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";}
     document.documentElement.setAttribute("data-theme",t);})();
   </script>
*/
