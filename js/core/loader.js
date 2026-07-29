/* ==========================================================================
   Soft Skill Zone — Loading states
   Page loader, top progress bar, button spinners, skeleton placeholders.
   ========================================================================== */

import { el, $ } from "./dom.js";

/* ---------------- Full page loader ---------------- */
export function showPageLoader(text = "Loading…") {
  let node = $("#ssz-page-loader");
  if (!node) {
    node = el("div", { id: "ssz-page-loader", class: "ssz-page-loader", role: "status", "aria-live": "polite" });
    node.innerHTML = `
      <div style="display:grid;place-items:center;gap:14px">
        <div class="ssz-spinner"></div>
        <p style="font-size:.85rem;color:var(--text-muted)" data-loader-text></p>
      </div>`;
    document.body.appendChild(node);
  }
  node.querySelector("[data-loader-text]").textContent = text;
  node.classList.remove("is-hidden");
  return node;
}

export function hidePageLoader() {
  const node = $("#ssz-page-loader");
  if (node) node.classList.add("is-hidden");
}

/* ---------------- Top progress bar ---------------- */
let bar = null;
let barTimer = null;

export function startProgress() {
  if (!bar) {
    bar = el("div", { class: "ssz-topbar-progress" });
    document.body.appendChild(bar);
  }
  bar.style.opacity = "1";
  bar.style.width = "0%";
  let width = 0;
  clearInterval(barTimer);
  barTimer = setInterval(() => {
    width = Math.min(width + Math.random() * 12, 88);
    bar.style.width = `${width}%`;
  }, 220);
}

export function stopProgress() {
  if (!bar) return;
  clearInterval(barTimer);
  bar.style.width = "100%";
  setTimeout(() => {
    bar.style.opacity = "0";
    setTimeout(() => { if (bar) bar.style.width = "0%"; }, 260);
  }, 200);
}

/* ---------------- Button loading ---------------- */

/** Put a button into its spinner state. Returns a stop() function. */
export function buttonLoading(button, loading = true) {
  const btn = typeof button === "string" ? $(button) : button;
  if (!btn) return () => {};
  btn.classList.toggle("is-loading", loading);
  btn.disabled = loading;
  btn.setAttribute("aria-busy", String(loading));
  return () => buttonLoading(btn, false);
}

/**
 * Run an async action with the button in its loading state.
 *   await withButton(btn, async () => { ... });
 */
export async function withButton(button, fn) {
  const stop = buttonLoading(button, true);
  try { return await fn(); }
  finally { stop(); }
}

/* ---------------- Skeletons ---------------- */

/** Fill a container with N skeleton cards while data loads. */
export function skeletonCards(container, count = 6, height = 260) {
  const node = typeof container === "string" ? $(container) : container;
  if (!node) return;
  node.replaceChildren();
  for (let i = 0; i < count; i++) {
    node.appendChild(el("div", { class: "skeleton skeleton-card", style: { height: `${height}px` } }));
  }
}

/** Skeleton rows for tables. */
export function skeletonRows(tbody, rows = 6, cols = 5) {
  const node = typeof tbody === "string" ? $(tbody) : tbody;
  if (!node) return;
  node.replaceChildren();
  for (let r = 0; r < rows; r++) {
    const tr = el("tr");
    for (let c = 0; c < cols; c++) {
      const td = el("td");
      td.appendChild(el("div", { class: "skeleton skeleton-text", style: { width: `${60 + Math.random() * 35}%` } }));
      tr.appendChild(td);
    }
    node.appendChild(tr);
  }
}

/** Standard empty state. */
export function emptyState(container, { title = "Kuch nahi mila", message = "", icon = "", action = null } = {}) {
  const node = typeof container === "string" ? $(container) : container;
  if (!node) return;
  const wrap = el("div", { class: "empty-state" });
  wrap.innerHTML = `
    <div class="empty-state__icon">${icon || `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 21l-4.35-4.35"/><circle cx="11" cy="11" r="8"/>
      </svg>`}</div>
    <h2></h2>
    <p></p>`;
  wrap.querySelector("h2").textContent = title;
  wrap.querySelector("p").textContent = message;
  if (action) wrap.appendChild(action);
  node.replaceChildren(wrap);
}
