/* ==========================================================================
   Soft Skill Zone — Toast notifications
   toast.success("Saved!"), toast.error(err), toast.info(...), toast.warning(...)
   ========================================================================== */

import { el } from "./dom.js";

const ICONS = {
  success: '<path d="M20 6 9 17l-5-5"/>',
  error:   '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
  warning: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  info:    '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
};

const TITLES = { success: "Ho gaya", error: "Error", warning: "Dhyan dein", info: "Info" };

let stack = null;
function getStack() {
  if (stack && document.body.contains(stack)) return stack;
  stack = document.querySelector(".ssz-toast-stack");
  if (!stack) {
    stack = el("div", { class: "ssz-toast-stack", role: "status", "aria-live": "polite" });
    document.body.appendChild(stack);
  }
  return stack;
}

function svg(paths) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

/**
 * @param {string} message
 * @param {"success"|"error"|"warning"|"info"} type
 * @param {{title?:string, duration?:number}} [opts]
 */
export function show(message, type = "info", opts = {}) {
  const { title = TITLES[type], duration = type === "error" ? 6000 : 4000 } = opts;

  const node = el("div", { class: `ssz-toast ssz-toast--${type}` });
  node.innerHTML = `
    <div class="ssz-toast__icon">${svg(ICONS[type] || ICONS.info)}</div>
    <div class="ssz-toast__body">
      <div class="ssz-toast__title"></div>
      <div class="ssz-toast__msg"></div>
    </div>
    <button class="ssz-toast__close" type="button" aria-label="Band karein">
      ${svg('<path d="M18 6 6 18M6 6l12 12"/>')}
    </button>`;

  // textContent, never innerHTML — messages can contain user input
  node.querySelector(".ssz-toast__title").textContent = title;
  node.querySelector(".ssz-toast__msg").textContent = String(message ?? "");

  const dismiss = () => {
    if (!node.isConnected) return;
    node.classList.add("is-leaving");
    node.addEventListener("animationend", () => node.remove(), { once: true });
    setTimeout(() => node.remove(), 400);
  };

  node.querySelector(".ssz-toast__close").addEventListener("click", dismiss);
  getStack().appendChild(node);

  let timer = duration ? setTimeout(dismiss, duration) : null;
  node.addEventListener("mouseenter", () => { if (timer) clearTimeout(timer); });
  node.addEventListener("mouseleave", () => { if (duration) timer = setTimeout(dismiss, 1500); });

  return dismiss;
}

export const success = (msg, opts) => show(msg, "success", opts);
export const error   = (msg, opts) => show(msg?.message || msg, "error", opts);
export const warning = (msg, opts) => show(msg, "warning", opts);
export const info    = (msg, opts) => show(msg, "info", opts);
export const clear   = () => { getStack().replaceChildren(); };

export default { show, success, error, warning, info, clear };
