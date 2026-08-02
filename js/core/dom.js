/* ==========================================================================
   Soft Skill Zone — Tiny DOM helper
   No jQuery, no framework. Just the 10 things we actually do all day.
   ========================================================================== */

export const $  = (sel, scope = document) => scope.querySelector(sel);
export const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

/**
 * Create an element.
 *   el("button", { class: "btn-ssz", onclick: fn, dataset: {id: 3} }, "Save")
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);

  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v === null || v === undefined || v === false) return;
    if (k === "class" || k === "className") node.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k === "dataset") Object.entries(v).forEach(([dk, dv]) => { node.dataset[dk] = dv; });
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, v);
  });

  children.flat(Infinity).forEach((c) => {
    if (c === null || c === undefined || c === false) return;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  });

  return node;
}

/** Add a listener. Returns an off() function. Supports event delegation. */
export function on(target, type, selectorOrHandler, maybeHandler) {
  const delegated = typeof selectorOrHandler === "string";
  const selector = delegated ? selectorOrHandler : null;
  const handler = delegated ? maybeHandler : selectorOrHandler;

  const wrapped = (e) => {
    if (!delegated) return handler(e);
    const match = e.target.closest(selector);
    if (match && target.contains(match)) handler.call(match, e, match);
  };

  target.addEventListener(type, wrapped);
  return () => target.removeEventListener(type, wrapped);
}

/** Replace an element's children with nodes / HTML strings. */
export function render(target, ...content) {
  const node = typeof target === "string" ? $(target) : target;
  if (!node) return null;
  node.replaceChildren();
  content.flat(Infinity).forEach((c) => {
    if (c === null || c === undefined || c === false) return;
    if (c instanceof Node) node.append(c);
    else node.insertAdjacentHTML("beforeend", String(c));
  });
  /* Screen par jo bhi naya aata hai wo yahin se hokar guzarta hai, isliye
     bhasha ka anuvaad bhi yahin lag jata hai. Hinglish (default) par ye
     seedha lautt jata hai — koi kharcha nahi. Chhoti si import isliye
     seedhe upar nahi likhi ki dom.js har page par chalta hai; i18n sirf
     tabhi jagta hai jab kisi ne bhasha badli ho. */
  translateRendered(node);
  return node;
}

/* i18n ko seedhe import karne se dom.js aur i18n aapas me ghoom jaate.
   Isliye i18n khud aakar apna hook yahan rakh deta hai. Jab tak koi
   dictionary chalu nahi, ye khaali function hai. */
let translateRendered = () => {};
export function setRenderHook(fn) {
  if (typeof fn === "function") translateRendered = fn;
}

/** Build a DocumentFragment from an HTML string. */
export function frag(html) {
  const t = document.createElement("template");
  t.innerHTML = String(html).trim();
  return t.content;
}

export const show = (node) => { if (node) node.hidden = false; };
export const hide = (node) => { if (node) node.hidden = true; };
export const toggle = (node, force) => { if (node) node.hidden = force === undefined ? !node.hidden : !force; };

/** Serialise a <form> into a plain object (handles checkboxes + multi-selects). */
export function formData(form) {
  const out = {};
  new FormData(form).forEach((value, key) => {
    if (key in out) {
      out[key] = Array.isArray(out[key]) ? [...out[key], value] : [out[key], value];
    } else {
      out[key] = typeof value === "string" ? value.trim() : value;
    }
  });
  // Unchecked checkboxes never appear in FormData — record them as false.
  Array.from(form.elements).forEach((f) => {
    if (f.type === "checkbox" && f.name && !(f.name in out)) out[f.name] = false;
    else if (f.type === "checkbox" && f.name && f.checked && out[f.name] === "on") out[f.name] = true;
  });
  return out;
}

/** Fill a <form> from an object. */
export function fillForm(form, data = {}) {
  Object.entries(data).forEach(([name, value]) => {
    const field = form.elements[name];
    if (!field) return;
    if (field instanceof RadioNodeList) {
      Array.from(field).forEach((r) => { r.checked = r.value === String(value); });
    } else if (field.type === "checkbox") {
      field.checked = !!value;
    } else {
      field.value = value ?? "";
    }
  });
}

/** Smooth-scroll to an element or the top. */
export function scrollTo(target, offset = 90) {
  const node = typeof target === "string" ? $(target) : target;
  if (!node) return window.scrollTo({ top: 0, behavior: "smooth" });
  const top = node.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
}

/** Lock / unlock page scroll (drawers, modals). */
export function lockScroll(lock = true) {
  document.body.classList.toggle("is-locked", lock);
}

/** Run a callback once the DOM is parsed. */
export function onReady(fn) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
  else fn();
}

/** Trap Tab focus inside a container (modals, drawers). Returns release(). */
export function trapFocus(container) {
  const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';
  const handler = (e) => {
    if (e.key !== "Tab") return;
    const items = $$(FOCUSABLE, container).filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  container.addEventListener("keydown", handler);
  return () => container.removeEventListener("keydown", handler);
}
