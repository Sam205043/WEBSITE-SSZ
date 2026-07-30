/* ==========================================================================
   Soft Skill Zone — Online Admission (multi-step wizard)
   --------------------------------------------------------------------------
   Flow:
     1 Personal  ->  2 Contact  ->  3 Course  ->  4 Uploads  ->  5 Review
   - Text fields autosave to localStorage, so an interrupted form resumes.
   - Photo is compressed client-side, then photo + documents upload to
     Firebase Storage with a live progress bar.
   - The application number comes from an atomic Firestore counter, so two
     simultaneous submissions can never collide.
   - Without Firebase keys the form still works up to review, then explains
     the situation and offers the WhatsApp fallback.
   ========================================================================== */

import { $, $$, el, on, onReady, render, scrollTo } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { createValidator, rules, validateFields, clearError } from "../core/validators.js";
import { store, debounce, dateKey, whatsappLink, money } from "../core/utils.js";
import { param, url } from "../core/routes.js";
import { LS_KEYS } from "../core/constants.js";
import { COURSES, INSTITUTE, activeCourses } from "../config/site-data.js";
import { durationLabel } from "../components/course-card.js";
import toast from "../core/toast.js";
import { validateFile, compressImage } from "../core/files.js";

/* ==========================================================================
   State
   ========================================================================== */
const STEPS = [
  { n: 1, label: "Personal" },
  { n: 2, label: "Contact" },
  { n: 3, label: "Course" },
  { n: 4, label: "Uploads" },
  { n: 5, label: "Review" }
];

const state = {
  step: 1,
  maxVisited: 1,
  gender: "",
  courseId: param("course", "") || "",
  batchPref: "",
  batchId: "",
  photoFile: null,     // File (compressed)
  photoDataURL: "",    // preview only — never persisted
  docFiles: []         // File[]
};

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" }
];

const BATCH_PREFS = [
  { value: "morning", label: "Morning", sub: "8 AM – 12 PM" },
  { value: "afternoon", label: "Afternoon", sub: "12 PM – 4 PM" },
  { value: "evening", label: "Evening", sub: "4 PM – 8 PM" }
];

const MAX_DOCS = 5;

let form, validator, booted = false;

/* ==========================================================================
   Draft autosave (text fields only — files can't be persisted)
   ========================================================================== */
function saveDraft() {
  const data = {};
  ["fullName", "fatherName", "motherName", "dob", "mobile", "whatsapp", "email",
   "address", "city", "pincode", "qualification"].forEach((name) => {
    const f = form.elements[name];
    if (f) data[name] = f.value;
  });
  data._gender = state.gender;
  data._courseId = state.courseId;
  data._batchPref = state.batchPref;
  data._step = state.step;
  store.set(LS_KEYS.DRAFT_ADMISSION, data);
}

function loadDraft() {
  const data = store.get(LS_KEYS.DRAFT_ADMISSION);
  if (!data) return false;

  Object.entries(data).forEach(([k, v]) => {
    if (k.startsWith("_")) return;
    const f = form.elements[k];
    if (f && v) f.value = v;
  });
  state.gender = data._gender || "";
  if (!param("course")) state.courseId = data._courseId || "";
  state.batchPref = data._batchPref || "";
  return true;
}

const clearDraft = () => store.remove(LS_KEYS.DRAFT_ADMISSION);

/* ==========================================================================
   Renderers
   ========================================================================== */
function paintStepper() {
  render($("#admStepper"), STEPS.flatMap((s, i) => {
    const cls = s.n === state.step ? "is-active" : s.n < state.step ? "is-done" : "";
    const item = el("button", {
      type: "button",
      class: `stepper__item ${cls}`,
      style: { background: "none", border: "none", cursor: s.n <= state.maxVisited ? "pointer" : "default", padding: "0" },
      dataset: { goto: String(s.n) },
      disabled: s.n > state.maxVisited,
      "aria-current": s.n === state.step ? "step" : null
    },
      el("span", { class: "stepper__dot" }, s.n < state.step ? "✓" : String(s.n)),
      el("span", { class: "stepper__label" }, s.label)
    );
    return i < STEPS.length - 1 ? [item, el("span", { class: "stepper__line" })] : [item];
  }));
}

function paintGender() {
  render($("#genderChoices"), GENDERS.map((g) =>
    el("label", { class: "radio-card" },
      el("input", { type: "radio", name: "_gender", value: g.value, checked: state.gender === g.value }),
      el("span", { class: "radio-card__box", style: { justifyContent: "center" } }, g.label)
    )
  ));
}

function paintCourses() {
  render($("#courseChoices"), activeCourses().map((c) =>
    el("label", { class: "adm-course" },
      el("input", { type: "radio", name: "_course", value: c.id, checked: state.courseId === c.id }),
      el("span", { class: "adm-course__box" },
        el("span", {
          class: "adm-course__icon",
          style: { background: `linear-gradient(135deg, ${c.colorFrom}, ${c.colorTo})` },
          html: icon(c.icon, { size: 18 })
        }),
        el("span", {},
          el("span", { class: "adm-course__name", style: { display: "block" } }, c.title),
          el("span", { class: "adm-course__meta" }, `${durationLabel(c.durationMonths)} · ${money(c.fee)}`)
        )
      )
    )
  ));
}

function paintBatchPrefs() {
  render($("#batchChoices"), BATCH_PREFS.map((b) =>
    el("label", { class: "radio-card" },
      el("input", { type: "radio", name: "_batchPref", value: b.value, checked: state.batchPref === b.value }),
      el("span", { class: "radio-card__box", style: { flexDirection: "column", alignItems: "flex-start", gap: "2px" } },
        el("span", {}, b.label),
        el("span", { style: { fontSize: ".72rem", color: "var(--text-muted)", fontWeight: "500" } }, b.sub)
      )
    )
  ));
}

/** Real batches from Firestore (optional upgrade over the preference picker). */
async function loadLiveBatches() {
  try {
    const { getMany } = await import("../../firebase/db-service.js");
    const { COLLECTIONS } = await import("../core/constants.js");
    const rows = await getMany(COLLECTIONS.BATCHES, {
      where: [["status", "in", ["upcoming", "running"]]],
      limit: 30, ttl: 10 * 60 * 1000
    });
    if (!rows.length) return;

    const select = $("#fBatch");
    const paint = () => {
      const mine = rows.filter((b) => !state.courseId || b.courseId === state.courseId);
      select.replaceChildren(el("option", { value: "" }, "Admin chun dega (recommended)"));
      mine.forEach((b) => select.appendChild(
        el("option", { value: b.id }, `${b.name} — ${b.timing || ""}`)
      ));
      $("#liveBatchField").hidden = mine.length === 0;
    };
    paint();
    document.addEventListener("ssz:course-changed", paint);
  } catch { /* not configured */ }
}

function paintDocs() {
  const box = $("#docList");
  render(box, state.docFiles.map((f, i) =>
    el("div", { class: "file-preview" },
      el("span", { class: "file-preview__thumb", html: icon(f.type === "application/pdf" ? "fileText" : "image", { size: 20 }) }),
      el("span", { class: "file-preview__meta" },
        el("span", { class: "file-preview__name", style: { display: "block" } }, f.name),
        el("span", { class: "file-preview__size" }, `${(f.size / 1024 / 1024).toFixed(2)} MB`)
      ),
      el("button", {
        class: "icon-btn", type: "button", "aria-label": `${f.name} hatayein`,
        dataset: { remove: String(i) }, html: icon("trash", { size: 17 })
      })
    )
  ));
}

/* ==========================================================================
   Step navigation + validation
   ========================================================================== */
const STEP_FIELDS = {
  1: ["fullName", "fatherName", "motherName", "dob"],
  2: ["mobile", "whatsapp", "email", "address", "city", "pincode", "qualification"]
};

function customValid(step) {
  let ok = true;
  const flag = (id, bad) => {
    const node = $(id);
    if (node) node.style.display = bad ? "flex" : "none";
    if (bad) ok = false;
  };

  if (step === 1) flag("#genderError", !state.gender);
  if (step === 3) {
    flag("#courseError", !state.courseId);
    flag("#batchError", !state.batchPref);
  }
  if (step === 4) {
    flag("#photoError", !state.photoFile);
    flag("#docError", state.docFiles.length === 0);
  }
  return ok;
}

function stepValid(step) {
  const named = STEP_FIELDS[step] ? validateFields(validator, STEP_FIELDS[step]) : true;
  const custom = customValid(step);
  return named && custom;
}

function goTo(step) {
  state.step = Math.min(Math.max(step, 1), STEPS.length);
  state.maxVisited = Math.max(state.maxVisited, state.step);

  $$(".adm-step").forEach((s) => s.classList.toggle("is-active", Number(s.dataset.step) === state.step));
  paintStepper();

  $("#btnPrev").style.visibility = state.step === 1 ? "hidden" : "visible";
  $("#btnNext").hidden = state.step === STEPS.length;
  $("#btnSubmit").hidden = state.step !== STEPS.length;

  if (state.step === STEPS.length) paintReview();
  saveDraft();
  if (booted) scrollTo("#admCard", 90);
}

/* ==========================================================================
   Review
   ========================================================================== */
function paintReview() {
  const v = (name) => form.elements[name]?.value || "—";
  const course = COURSES.find((c) => c.id === state.courseId);
  const pref = BATCH_PREFS.find((b) => b.value === state.batchPref);

  const group = (title, step, rows) =>
    el("div", { class: "adm-review__group" },
      el("div", { class: "adm-review__head" },
        el("span", {}, title),
        el("button", { class: "adm-review__edit", type: "button", dataset: { goto: String(step) } }, "Edit")
      ),
      el("dl", { class: "adm-review__rows" },
        ...rows.map(([dt, dd]) => el("div", { class: "adm-review__row" },
          el("dt", {}, dt), el("dd", {}, dd)))
      )
    );

  render($("#admReview"),
    group("Personal", 1, [
      ["Full name", v("fullName")],
      ["Father's name", v("fatherName")],
      ["Mother's name", v("motherName")],
      ["Date of birth", v("dob")],
      ["Gender", GENDERS.find((g) => g.value === state.gender)?.label || "—"]
    ]),
    group("Contact", 2, [
      ["Mobile", v("mobile")],
      ["WhatsApp", v("whatsapp")],
      ["Email", v("email") || "—"],
      ["Address", `${v("address")}, ${v("city")} - ${v("pincode")}`],
      ["Qualification", v("qualification")]
    ]),
    group("Course", 3, [
      ["Course", course ? course.title : "—"],
      ["Duration", course ? durationLabel(course.durationMonths) : "—"],
      ["Course fee", course ? `${money(course.fee)} + ${money(course.admissionFee || 0)} admission` : "—"],
      ["Batch preference", pref ? `${pref.label} (${pref.sub})` : "—"]
    ]),
    group("Uploads", 4, [
      ["Photo", state.photoFile ? state.photoFile.name : "—"],
      ["Documents", state.docFiles.length ? `${state.docFiles.length} file(s)` : "—"]
    ])
  );
}

/* ==========================================================================
   Files
   ========================================================================== */
async function handlePhoto(file) {
  if (!file) return;
  try {
    const check = validateFile(file, "image");
    if (!check.ok) return toast.error(check.error);

    const compressed = await compressImage(file, { maxWidth: 900, maxHeight: 1200, quality: 0.85 });
    state.photoFile = compressed;

    const reader = new FileReader();
    reader.onload = () => {
      state.photoDataURL = reader.result;
      render($("#photoPreview"), el("img", { src: reader.result, alt: "Photo preview" }));
    };
    reader.readAsDataURL(compressed);
    $("#photoError").style.display = "none";
    $("#photoBtn").textContent = "Photo badlein";
  } catch (err) {
    toast.error(err.message || "Photo process nahi ho payi.");
  }
}

async function handleDocs(files) {
  for (const file of Array.from(files)) {
    if (state.docFiles.length >= MAX_DOCS) {
      toast.warning(`Maximum ${MAX_DOCS} documents allowed hain.`);
      break;
    }
    const check = validateFile(file, "document");
    if (!check.ok) { toast.error(`${file.name}: ${check.error}`); continue; }
    if (state.docFiles.some((f) => f.name === file.name && f.size === file.size)) continue;
    state.docFiles.push(file);
  }
  paintDocs();
  if (state.docFiles.length) $("#docError").style.display = "none";
}

/* ==========================================================================
   Submit
   ========================================================================== */
function showSubmitting() {
  render($("#admCard"),
    el("div", { class: "adm-submitting" },
      el("div", { class: "ssz-spinner", style: { margin: "0 auto" } }),
      el("h3", { style: { marginTop: "1.25rem" } }, "Application submit ho rahi hai…"),
      el("div", { class: "progress-ssz" }, el("div", { class: "progress-ssz__bar", id: "subBar" })),
      el("p", { class: "adm-submitting__status", id: "subStatus" }, "Shuru ho raha hai…")
    )
  );
  return {
    set(pct, text) {
      const bar = $("#subBar"); const status = $("#subStatus");
      if (bar) bar.style.width = `${pct}%`;
      if (status && text) status.textContent = text;
    }
  };
}

/* Uploads need a safety net, but a plain total-time cap is wrong: a big
   document on a slow connection is *working*, it is just slow, and cutting it
   off loses the student's files. What actually signals trouble is progress
   that has STOPPED — which is exactly what happens when Cloud Storage is not
   enabled on the project and the SDK sits there retrying.

   So this watchdog watches movement, not the clock. Every progress callback
   calls touch(); if nothing moves for STALL_MS we give up. A hard ceiling
   still exists so a pathological case cannot hang forever. */
const STALL_MS = 25000;        // no bytes moved for this long -> give up
const HARD_CAP_MS = 6 * 60000; // absolute ceiling, ~6 minutes

function uploadWatchdog() {
  let last = Date.now();
  const touch = () => { last = Date.now(); };

  const guard = (promise) => new Promise((resolve, reject) => {
    const started = Date.now();
    let done = false;

    const timer = setInterval(() => {
      if (done) return;
      if (Date.now() - last > STALL_MS) {
        done = true; clearInterval(timer);
        reject(new Error("upload-stalled"));
      } else if (Date.now() - started > HARD_CAP_MS) {
        done = true; clearInterval(timer);
        reject(new Error("upload-timeout"));
      }
    }, 2000);

    promise.then(
      (v) => { done = true; clearInterval(timer); resolve(v); },
      (e) => { done = true; clearInterval(timer); reject(e); }
    );
  });

  return { touch, guard };
}

function showSuccess(appNo, data, documentsPending = false) {
  const course = COURSES.find((c) => c.id === state.courseId);
  const wa = whatsappLink(
    INSTITUTE.whatsapp || INSTITUTE.phone,
    documentsPending
      ? `Namaste! Maine online admission form submit kiya hai. Photo aur documents yahan bhej raha/rahi hoon.\nApplication No: ${appNo}\nNaam: ${data.fullName}\nCourse: ${course?.title || ""}`
      : `Namaste! Maine online admission form submit kiya hai.\nApplication No: ${appNo}\nNaam: ${data.fullName}\nCourse: ${course?.title || ""}`
  );

  render($("#admCard"),
    el("div", { class: "adm-success" },
      el("div", { class: "adm-success__icon", html: icon("checkCircle", { size: 40 }) }),
      el("h2", { style: { marginBottom: ".5rem" } }, "Application mil gayi!"),
      el("p", { style: { maxWidth: "48ch", marginInline: "auto" } },
        "Yeh aapka application number hai — isse sambhaal kar rakhein. Admin 24 ghante ke andar aapko contact karega."),
      el("div", { class: "adm-success__no" }, appNo),

      documentsPending
        ? el("div", { class: "tool-note", style: { textAlign: "left", marginTop: "1.25rem" } },
            el("span", { html: icon("alert", { size: 18 }) }),
            el("span", {},
              el("strong", {}, "Ek chhota sa kaam baaki hai — "),
              "aapki photo aur documents upload nahi ho paaye. Neeche WhatsApp button dabakar wahi photo aur documents bhej dein, " +
              "application number ke saath. Baaki poori application safely save ho chuki hai.")
          )
        : null,

      el("div", { class: "cluster", style: { justifyContent: "center", marginTop: "1rem" } },
        el("a", { class: "btn-ssz btn-primary-ssz", href: wa, target: "_blank", rel: "noopener" },
          documentsPending ? "WhatsApp par documents bhejein" : "WhatsApp par confirm karein"),
        el("a", { class: "btn-ssz btn-secondary-ssz", href: url("home") }, "Home par jaayein")
      ),
      el("p", { class: "field__hint", style: { marginTop: "1.5rem" } },
        "Tip: WhatsApp wala button dabane se aapka application number seedha institute ko pahunch jaata hai — approval aur tez ho jaata hai.")
    )
  );
  scrollTo("#admCard", 90);
}

function showFirebaseMissing(data) {
  const course = COURSES.find((c) => c.id === state.courseId);
  const wa = whatsappLink(
    INSTITUTE.whatsapp || INSTITUTE.phone,
    `Namaste! Main online admission lena chahta/chahti hoon.\nNaam: ${data.fullName}\nPita: ${data.fatherName}\nMobile: ${data.mobile}\nCourse: ${course?.title || ""}\nBatch: ${state.batchPref}`
  );

  render($("#admCard"),
    el("div", { class: "adm-success" },
      el("div", { class: "adm-success__icon", style: { background: "var(--warning-soft)", color: "var(--warning)" }, html: icon("alert", { size: 40 }) }),
      el("h2", { style: { marginBottom: ".5rem" } }, "Online system abhi setup ho raha hai"),
      el("p", { style: { maxWidth: "52ch", marginInline: "auto" } },
        "Website ka database (Firebase) abhi connect nahi hua hai, isliye form online save nahi ho paya. " +
        "Aapka bhara hua data is browser me draft ke roop me saved hai — kuch khoya nahi hai. " +
        "Filhaal WhatsApp se admission karein, ya baad me wapas aakar dobara submit karein."),
      el("div", { class: "cluster", style: { justifyContent: "center", marginTop: "1.25rem" } },
        el("a", { class: "btn-ssz btn-primary-ssz", href: wa, target: "_blank", rel: "noopener" },
          "WhatsApp se admission karein"),
        el("button", { class: "btn-ssz btn-secondary-ssz", type: "button", onclick: () => location.reload() }, "Form par wapas jaayein")
      )
    )
  );
  scrollTo("#admCard", 90);
}

async function submit() {
  if (!$("#fDeclare").checked) {
    $("#declareError").style.display = "flex";
    return;
  }
  $("#declareError").style.display = "none";

  // Everything valid? (steps could have been edited after review)
  for (const s of [1, 2, 3, 4]) {
    if (!stepValid(s)) { goTo(s); toast.warning("Kuch jaankari adhoori hai — highlight kiye gaye fields dekhein."); return; }
  }

  const data = {};
  ["fullName", "fatherName", "motherName", "dob", "mobile", "whatsapp", "email",
   "address", "city", "pincode", "qualification"].forEach((n) => { data[n] = form.elements[n].value.trim(); });

  /* Store the email lower-cased. Firebase Auth hands back a lower-cased
     address, and the rule that links a Student ID compares the two literally —
     so "Soft@Gmail.com" typed here would silently never match the login. */
  data.email = data.email.toLowerCase();

  let configured = false;
  try {
    const cfg = await import("../../firebase/firebase-config.js");
    configured = cfg.isFirebaseConfigured;
  } catch { configured = false; }

  if (!configured) { saveDraft(); showFirebaseMissing(data); return; }

  const progress = showSubmitting();

  try {
    const { nextSequence, createWithId } = await import("../../firebase/db-service.js");
    const { uploadFile, uploadMany } = await import("../../firebase/storage-service.js");
    const { COLLECTIONS, STORAGE_PATHS, ID_FORMATS, ADMISSION_STATUS } = await import("../core/constants.js");

    // 1. Application number (atomic)
    progress.set(8, "Application number ban raha hai…");
    const year = new Date().getFullYear();
    const seq = await nextSequence(`admissions-${year}`);
    const appNo = ID_FORMATS.application(year, seq);

    /* 2 + 3. Photo aur documents.
       Cloud Storage har project par chalu nahi hota — Firebase ke free Spark
       plan par upload block ho jaata hai (402/403). Aisi soorat me poori
       application fail nahi honi chahiye: student ne 5 step bhare hain.
       File upload ko optional maanke aage badhte hain, aur student ko
       WhatsApp par documents bhejne ko kehte hain. Admin ko application par
       "documents pending" dikh jaata hai. */
    let photo = null;
    let docs = [];
    let uploadsBlocked = false;

    const watch = uploadWatchdog();

    try {
      progress.set(15, "Photo upload ho rahi hai…");
      photo = await watch.guard(uploadFile(state.photoFile, STORAGE_PATHS.admissionPhoto(appNo), {
        kind: "image",
        fileName: "photo.jpg",
        skipUrl: true,
        onProgress: (pct) => {
          watch.touch();
          progress.set(15 + pct * 0.25, `Photo upload ho rahi hai… ${Math.round(pct)}%`);
        }
      }));

      progress.set(42, "Documents upload ho rahe hain…");
      docs = await watch.guard(uploadMany(state.docFiles, STORAGE_PATHS.admissionDocs(appNo), {
        kind: "document",
        skipUrl: true,
        onProgress: (pct, done, total) => {
          watch.touch();
          progress.set(42 + pct * 0.4, `Documents upload ho rahe hain… (${done}/${total}) ${Math.round(pct)}%`);
        }
      }));
    } catch (uploadErr) {
      console.warn("[admission] file upload skipped:", uploadErr?.message || uploadErr, uploadErr);
      uploadsBlocked = true;
      photo = null;
      docs = [];
      progress.set(80, "Files chhod kar aage badh rahe hain…");
    }

    // 4. Firestore document
    progress.set(88, "Application save ho rahi hai…");
    const course = COURSES.find((c) => c.id === state.courseId);
    await createWithId(COLLECTIONS.ADMISSIONS, appNo, {
      applicationNo: appNo,
      ...data,
      gender: state.gender,
      courseId: state.courseId,
      courseName: course?.title || "",
      courseFee: course?.fee || 0,
      admissionFee: course?.admissionFee || 0,
      batchPref: state.batchPref,
      batchId: form.elements.batchId?.value || "",
      photoURL: photo?.url || "",
      photoPath: photo?.path || "",
      documents: docs.map((d) => ({ name: d.name, url: d.url, path: d.path, type: d.type, size: d.size })),
      documentsPending: uploadsBlocked,
      status: ADMISSION_STATUS.PENDING,
      isRead: false,
      submittedOn: dateKey(),
      source: "website"
    });

    progress.set(100, "Ho gaya!");
    clearDraft();
    setTimeout(() => showSuccess(appNo, data, uploadsBlocked), 500);
  } catch (err) {
    console.error("[admission]", err);
    toast.error(err.message || "Submit fail ho gaya. Internet check karke dobara try karein.", { duration: 8000 });
    setTimeout(() => location.reload(), 2600);
  }
}

/* ==========================================================================
   Boot
   ========================================================================== */
onReady(() => {
  form = $("#admForm");

  validator = createValidator(form, {
    fullName:   [rules.required(), rules.minLen(3)],
    fatherName: [rules.required(), rules.minLen(3)],
    motherName: [rules.required(), rules.minLen(3)],
    dob:        [rules.required("Janm tithi chunein."), rules.date(), rules.notFuture(), rules.ageRange(8, 70)],
    mobile:     [rules.required(), rules.mobile()],
    whatsapp:   [rules.required("WhatsApp number daalein."), rules.mobile()],
    /* Required, not optional: this email is what later links the admission to
       the student's dashboard login. Blank here means that student can never
       open their own dashboard without an admin fixing it by hand. */
    email:      [rules.required("Email daalein — dashboard login isi se judega."), rules.email()],
    address:    [rules.required(), rules.minLen(10, "Poora pata likhein.")],
    city:       [rules.required()],
    pincode:    [rules.required(), rules.pincode()],
    qualification: [rules.required("Qualification chunein.")]
  });

  paintGender();
  paintCourses();
  paintBatchPrefs();
  loadLiveBatches();

  const hadDraft = loadDraft();
  if (hadDraft) {
    paintGender(); paintCourses(); paintBatchPrefs();
    toast.info("Aapka adhoora form wapas load kar diya gaya hai.", { title: "Draft mila" });
  }

  // WhatsApp helper in the sidebar
  $("#admWhatsapp").href = whatsappLink(
    INSTITUTE.whatsapp || INSTITUTE.phone,
    "Namaste! Online admission form me madad chahiye."
  );

  /* ---------- interactions ---------- */
  on(form, "change", 'input[name="_gender"]', (e, input) => {
    state.gender = input.value;
    $("#genderError").style.display = "none";
    saveDraft();
  });

  on(form, "change", 'input[name="_course"]', (e, input) => {
    state.courseId = input.value;
    $("#courseError").style.display = "none";
    document.dispatchEvent(new CustomEvent("ssz:course-changed"));
    saveDraft();
  });

  on(form, "change", 'input[name="_batchPref"]', (e, input) => {
    state.batchPref = input.value;
    $("#batchError").style.display = "none";
    saveDraft();
  });

  $("#sameAsMobile").addEventListener("change", (e) => {
    if (e.target.checked) {
      form.elements.whatsapp.value = form.elements.mobile.value;
      clearError(form.elements.whatsapp);
    }
  });
  form.elements.mobile.addEventListener("input", () => {
    if ($("#sameAsMobile").checked) form.elements.whatsapp.value = form.elements.mobile.value;
  });

  // Photo
  $("#photoBtn").addEventListener("click", () => $("#fPhoto").click());
  $("#photoPreview").addEventListener("click", () => $("#fPhoto").click());
  $("#fPhoto").addEventListener("change", (e) => handlePhoto(e.target.files[0]));

  // Documents — click, keyboard, drag & drop
  const drop = $("#docDrop");
  drop.addEventListener("click", () => $("#fDocs").click());
  drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#fDocs").click(); } });
  $("#fDocs").addEventListener("change", (e) => { handleDocs(e.target.files); e.target.value = ""; });
  ["dragover", "dragenter"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("is-dragover"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("is-dragover"); }));
  drop.addEventListener("drop", (e) => handleDocs(e.dataTransfer.files));

  on($("#docList"), "click", "[data-remove]", (e, btn) => {
    state.docFiles.splice(Number(btn.dataset.remove), 1);
    paintDocs();
  });

  // Navigation
  $("#btnNext").addEventListener("click", () => {
    if (!stepValid(state.step)) {
      toast.warning("Pehle highlight kiye gaye fields theek karein.");
      return;
    }
    goTo(state.step + 1);
  });
  $("#btnPrev").addEventListener("click", () => goTo(state.step - 1));
  on(document, "click", "[data-goto]", (e, btn) => {
    const target = Number(btn.dataset.goto);
    if (target <= state.maxVisited) goTo(target);
  });

  form.addEventListener("submit", (e) => { e.preventDefault(); submit(); });
  form.addEventListener("input", debounce(saveDraft, 600));

  goTo(1);
  booted = true;
});
