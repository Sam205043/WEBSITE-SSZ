/* ==========================================================================
   Soft Skill Zone — Promise-based modal / confirm / prompt
   --------------------------------------------------------------------------
   const ok = await confirm({ title: "Delete?", danger: true });
   const m  = open({ title: "Fee collect", body: node, footer: [...] });
   ========================================================================== */

import { el, lockScroll, trapFocus } from "./dom.js";

const openStack = [];

function iconClose() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
}

/**
 * @param {object} opts
 * @param {string}  [opts.title]
 * @param {string|Node} [opts.body]        HTML string or DOM node
 * @param {Node[]}  [opts.footer]          buttons
 * @param {"sm"|"md"|"lg"} [opts.size="md"]
 * @param {boolean} [opts.closeOnBackdrop=true]
 * @param {boolean} [opts.showClose=true]
 * @param {(instance)=>void} [opts.onClose]
 */
let modalSeq = 0;

export function open(opts = {}) {
  const {
    title = "", body = "", footer = null, size = "md",
    closeOnBackdrop = true, showClose = true, onClose
  } = opts;

  const previousFocus = document.activeElement;

  /* Screen readers announce a dialog by its heading — without a name the whole
     modal reads as an unlabelled region. Point at the title when there is one,
     otherwise carry an explicit label. */
  const titleId = `ssz-modal-title-${++modalSeq}`;
  const backdrop = el("div", {
    class: "ssz-modal-backdrop",
    role: "dialog",
    "aria-modal": "true",
    ...(title ? { "aria-labelledby": titleId } : { "aria-label": "Dialog" })
  });
  const modal = el("div", { class: `ssz-modal${size !== "md" ? ` ssz-modal--${size}` : ""}` });

  if (title || showClose) {
    const head = el("div", { class: "ssz-modal__head" });
    head.appendChild(el("h3", { class: "ssz-modal__title", id: titleId }, title));
    if (showClose) {
      const btn = el("button", { class: "icon-btn", type: "button", "aria-label": "Band karein", html: iconClose() });
      btn.addEventListener("click", () => instance.close(null));
      head.appendChild(btn);
    }
    modal.appendChild(head);
  }

  const bodyNode = el("div", { class: "ssz-modal__body" });
  if (body instanceof Node) bodyNode.appendChild(body);
  else bodyNode.innerHTML = body;
  modal.appendChild(bodyNode);

  if (footer && footer.length) {
    const foot = el("div", { class: "ssz-modal__foot" });
    footer.forEach((f) => foot.appendChild(f));
    modal.appendChild(foot);
  }

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  lockScroll(true);

  let resolveFn;
  const result = new Promise((resolve) => { resolveFn = resolve; });
  const releaseTrap = trapFocus(modal);

  const instance = {
    backdrop, modal, body: bodyNode, result,
    close(value = null) {
      if (!backdrop.isConnected) return;
      backdrop.classList.remove("is-open");
      releaseTrap();
      const idx = openStack.indexOf(instance);
      if (idx > -1) openStack.splice(idx, 1);
      setTimeout(() => {
        backdrop.remove();
        if (!openStack.length) lockScroll(false);
        previousFocus?.focus?.();
        onClose && onClose(value);
        resolveFn(value);
      }, 220);
    }
  };

  if (closeOnBackdrop) {
    backdrop.addEventListener("mousedown", (e) => { if (e.target === backdrop) instance.close(null); });
  }

  openStack.push(instance);
  requestAnimationFrame(() => {
    backdrop.classList.add("is-open");
    (modal.querySelector("[autofocus]") || modal.querySelector("button, input, select, textarea"))?.focus?.();
  });

  return instance;
}

/* Global ESC handling — closes the topmost modal only. */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && openStack.length) openStack[openStack.length - 1].close(null);
});

export function closeAll() { [...openStack].forEach((m) => m.close(null)); }

/* ==========================================================================
   Confirm
   ========================================================================== */
/**
 * @returns {Promise<boolean>}
 */
export function confirm({
  title = "Pakka?",
  message = "Kya aap sure hain?",
  confirmText = "Haan, karein",
  cancelText = "Cancel",
  danger = false
} = {}) {
  return new Promise((resolve) => {
    const cancelBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, cancelText);
    const okBtn = el("button", {
      class: `btn-ssz ${danger ? "btn-danger-ssz" : "btn-primary-ssz"}`,
      type: "button", autofocus: true
    }, confirmText);

    const bodyNode = el("p", { style: { color: "var(--text-secondary)", margin: 0 } }, message);

    const m = open({
      title, size: "sm", body: bodyNode,
      footer: [cancelBtn, okBtn],
      onClose: (v) => resolve(v === true)
    });

    cancelBtn.addEventListener("click", () => m.close(false));
    okBtn.addEventListener("click", () => m.close(true));
  });
}

/* ==========================================================================
   Prompt
   ========================================================================== */
/**
 * @returns {Promise<string|null>}
 */
export function prompt({
  title = "Input",
  label = "",
  placeholder = "",
  value = "",
  multiline = false,
  required = true,
  confirmText = "Save",
  cancelText = "Cancel"
} = {}) {
  return new Promise((resolve) => {
    const input = multiline
      ? el("textarea", { class: "textarea-ssz", placeholder, autofocus: true })
      : el("input", { class: "input-ssz", type: "text", placeholder, autofocus: true });
    input.value = value;

    const err = el("div", { class: "field__error" }, "Yeh field zaroori hai.");
    const field = el("div", { class: "field" });
    if (label) field.appendChild(el("label", { class: "field__label" }, label));
    field.appendChild(input);
    field.appendChild(err);

    const cancelBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, cancelText);
    const okBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, confirmText);

    const m = open({ title, size: "sm", body: field, footer: [cancelBtn, okBtn], onClose: (v) => resolve(v) });

    const submit = () => {
      const v = input.value.trim();
      if (required && !v) { field.classList.add("has-error"); input.focus(); return; }
      m.close(v);
    };

    input.addEventListener("input", () => field.classList.remove("has-error"));
    if (!multiline) input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    cancelBtn.addEventListener("click", () => m.close(null));
    okBtn.addEventListener("click", submit);
  });
}

export default { open, confirm, prompt, closeAll };
