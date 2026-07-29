/* ==========================================================================
   Soft Skill Zone — Form validation engine
   --------------------------------------------------------------------------
   Declarative rules, inline error rendering, no dependencies.

     const v = createValidator(form, {
       fullName: [rules.required(), rules.minLen(3)],
       mobile:   [rules.required(), rules.mobile()],
       email:    [rules.email()]
     });
     if (!v.validate()) return;       // errors are already painted
   ========================================================================== */

/* ==========================================================================
   Individual rules — each returns { test, message }
   ========================================================================== */
export const rules = {
  required: (msg = "Yeh field zaroori hai.") => ({
    test: (v) => v !== null && v !== undefined && String(v).trim() !== "" && v !== false,
    message: msg
  }),

  minLen: (n, msg) => ({
    test: (v) => !v || String(v).trim().length >= n,
    message: msg || `Kam se kam ${n} characters chahiye.`
  }),

  maxLen: (n, msg) => ({
    test: (v) => !v || String(v).trim().length <= n,
    message: msg || `Maximum ${n} characters allowed hain.`
  }),

  email: (msg = "Sahi email address daalein.") => ({
    test: (v) => !v || /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v).trim()),
    message: msg
  }),

  mobile: (msg = "10 digit ka mobile number daalein (6-9 se shuru).") => ({
    test: (v) => !v || /^[6-9]\d{9}$/.test(String(v).replace(/\D/g, "").slice(-10)),
    message: msg
  }),

  pincode: (msg = "6 digit ka pincode daalein.") => ({
    test: (v) => !v || /^[1-9]\d{5}$/.test(String(v).trim()),
    message: msg
  }),

  numeric: (msg = "Sirf numbers allowed hain.") => ({
    test: (v) => !v || !isNaN(Number(v)),
    message: msg
  }),

  min: (n, msg) => ({
    test: (v) => v === "" || v === null || Number(v) >= n,
    message: msg || `Value ${n} se kam nahi honi chahiye.`
  }),

  max: (n, msg) => ({
    test: (v) => v === "" || v === null || Number(v) <= n,
    message: msg || `Value ${n} se zyada nahi honi chahiye.`
  }),

  pattern: (regex, msg = "Format sahi nahi hai.") => ({
    test: (v) => !v || regex.test(String(v)),
    message: msg
  }),

  date: (msg = "Sahi date daalein.") => ({
    test: (v) => !v || !isNaN(new Date(v).getTime()),
    message: msg
  }),

  /** Age between min and max years, computed from a date of birth. */
  ageRange: (min = 10, max = 80, msg) => ({
    test: (v) => {
      if (!v) return true;
      const d = new Date(v);
      if (isNaN(d)) return false;
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
      return age >= min && age <= max;
    },
    message: msg || `Age ${min} se ${max} saal ke beech honi chahiye.`
  }),

  notFuture: (msg = "Future ki date allowed nahi hai.") => ({
    test: (v) => !v || new Date(v).getTime() <= Date.now(),
    message: msg
  }),

  url: (msg = "Sahi URL daalein (https:// ke saath).") => ({
    test: (v) => {
      if (!v) return true;
      try { const u = new URL(v); return u.protocol === "http:" || u.protocol === "https:"; }
      catch { return false; }
    },
    message: msg
  }),

  meetLink: (msg = "Google Meet ka valid link daalein.") => ({
    test: (v) => !v || /^https:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(String(v).trim()),
    message: msg
  }),

  gstin: (msg = "Sahi 15-digit GSTIN daalein.") => ({
    test: (v) => !v || /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/i.test(String(v).trim()),
    message: msg
  }),

  pan: (msg = "Sahi PAN number daalein (ABCDE1234F).") => ({
    test: (v) => !v || /^[A-Z]{5}\d{4}[A-Z]$/i.test(String(v).trim()),
    message: msg
  }),

  password: (msg = "Password kam se kam 6 characters ka hona chahiye.") => ({
    test: (v) => !v || String(v).length >= 6,
    message: msg
  }),

  /** Matches another field's live value. */
  matches: (getOther, msg = "Dono values same honi chahiye.") => ({
    test: (v) => !v || v === (typeof getOther === "function" ? getOther() : getOther),
    message: msg
  }),

  /** Custom one-off rule. */
  custom: (fn, msg = "Value sahi nahi hai.") => ({ test: fn, message: msg })
};

/* ==========================================================================
   Error painting
   ========================================================================== */
function fieldWrapper(input) {
  return input.closest(".field") || input.parentElement;
}

export function showError(input, message) {
  const wrap = fieldWrapper(input);
  if (!wrap) return;
  wrap.classList.add("has-error");
  let node = wrap.querySelector(".field__error");
  if (!node) {
    node = document.createElement("div");
    node.className = "field__error";
    wrap.appendChild(node);
  }
  node.textContent = message;
  input.setAttribute("aria-invalid", "true");
}

export function clearError(input) {
  const wrap = fieldWrapper(input);
  if (!wrap) return;
  wrap.classList.remove("has-error");
  input.removeAttribute("aria-invalid");
}

/* ==========================================================================
   Validator factory
   ========================================================================== */

/**
 * @param {HTMLFormElement} form
 * @param {Record<string, Array<{test:Function,message:string}>>} schema
 * @param {{validateOnBlur?:boolean, validateOnInput?:boolean}} [opts]
 */
export function createValidator(form, schema, opts = {}) {
  const { validateOnBlur = true, validateOnInput = true } = opts;

  const getValue = (name) => {
    const field = form.elements[name];
    if (!field) return "";
    if (field instanceof RadioNodeList) return field.value;
    if (field.type === "checkbox") return field.checked;
    if (field.type === "file") return field.files?.length ? field.files : "";
    return typeof field.value === "string" ? field.value.trim() : field.value;
  };

  const firstInput = (name) => {
    const field = form.elements[name];
    if (!field) return null;
    return field instanceof RadioNodeList ? field[0] : field;
  };

  /** Validate one field. Returns an error string or null. */
  function validateField(name) {
    const fieldRules = schema[name] || [];
    const value = getValue(name);
    const input = firstInput(name);
    if (!input) return null;

    for (const rule of fieldRules) {
      if (!rule.test(value, form)) {
        showError(input, rule.message);
        return rule.message;
      }
    }
    clearError(input);
    return null;
  }

  /** Validate everything. Focuses the first invalid field. */
  function validate() {
    let firstBad = null;
    const errors = {};

    Object.keys(schema).forEach((name) => {
      const err = validateField(name);
      if (err) {
        errors[name] = err;
        if (!firstBad) firstBad = firstInput(name);
      }
    });

    if (firstBad) {
      firstBad.focus({ preventScroll: true });
      firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    validator.errors = errors;
    return Object.keys(errors).length === 0;
  }

  function reset() {
    Object.keys(schema).forEach((name) => {
      const input = firstInput(name);
      if (input) clearError(input);
    });
    validator.errors = {};
  }

  /* Live feedback */
  Object.keys(schema).forEach((name) => {
    const input = firstInput(name);
    if (!input) return;
    if (validateOnBlur) input.addEventListener("blur", () => validateField(name));
    if (validateOnInput) {
      input.addEventListener("input", () => {
        if (fieldWrapper(input)?.classList.contains("has-error")) validateField(name);
      });
    }
  });

  const validator = { validate, validateField, reset, errors: {}, getValue };
  return validator;
}

/** Validate a subset of fields — used by the multi-step admission form. */
export function validateFields(validator, names) {
  let ok = true;
  let firstBad = null;
  names.forEach((n) => {
    const err = validator.validateField(n);
    if (err) { ok = false; if (!firstBad) firstBad = n; }
  });
  return ok;
}
