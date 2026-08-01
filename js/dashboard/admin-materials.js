/* ==========================================================================
   Soft Skill Zone — Admin: Materials (Assignments + Notes)
   Create assignments (optional question file), view/grade submissions,
   upload notes per course.
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatDate, formatDateTime, dateTimeLocal } from "../core/utils.js";
import { formatBytes, validateFile } from "../core/files.js";
import { open as openModal, confirm as confirmModal } from "../core/modal.js";
import { createValidator, rules } from "../core/validators.js";
import { initAdminShell } from "./admin-shell.js";
import { DEMO_BATCHES } from "./admin-demo.js";
import { DEMO_ASSIGNMENTS, DEMO_SUBMISSIONS, DEMO_NOTES } from "./demo-data.js";
import { COLLECTIONS, STORAGE_PATHS } from "../core/constants.js";
import { COURSES } from "../config/site-data.js";
import { QUESTION_BANK, BANK_MODULES, bankCounts, pickQuestions } from "../config/question-bank.js";
import toast from "../core/toast.js";

let mode = "preview", assignments = [], notes = [], batches = [], tab = "assignments";

/* ==========================================================================
   Tabs
   ========================================================================== */
function paintTabs() {
  render($("#matTabs"),
    el("button", { type: "button", class: `chip${tab === "assignments" ? " is-active" : ""}`, dataset: { tab: "assignments" } },
      `Assignments (${assignments.length})`),
    el("button", { type: "button", class: `chip${tab === "notes" ? " is-active" : ""}`, dataset: { tab: "notes" } },
      `Notes (${notes.length})`)
  );
  $("#tabAssignments").hidden = tab !== "assignments";
  $("#tabNotes").hidden = tab !== "notes";
}

/* ==========================================================================
   Assignments
   ========================================================================== */
function asgRow(a) {
  return el("div", { class: "card-ssz" },
    el("div", { class: "card-ssz__body", style: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", padding: "1rem 1.25rem" } },
      el("span", { class: "stat-tile__icon", html: icon("clipboard", { size: 20 }) }),
      el("span", { style: { flex: 1, minWidth: "220px" } },
        el("strong", { style: { display: "block", fontSize: ".93rem" } },
          a.title,
          a.type === "mcq"
            ? el("span", { class: "badge-ssz badge-accent", style: { marginLeft: ".5rem", fontSize: ".62rem" } }, "MCQ")
            : null),
        el("span", { style: { fontSize: ".78rem", color: "var(--text-muted)" } },
          `${batches.find((b) => b.id === a.batchId)?.name || a.batchId} · Due ${formatDate(a.dueDate)} · ${a.totalMarks} marks` +
          (a.type === "mcq" ? " · khud check hota hai" : ""))),
      el("button", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", type: "button", dataset: { subs: a.id } }, "Submissions"),
      el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", style: { color: "var(--danger)" }, type: "button", dataset: { delAsg: a.id } }, "Delete")
    ));
}

function paintAsg() {
  render($("#asgAdminList"), assignments.length ? assignments.map(asgRow)
    : el("div", { class: "card-ssz" }, el("div", { class: "card-ssz__body" },
        el("p", { style: { margin: 0, fontSize: ".88rem", color: "var(--text-muted)" } },
          "Abhi koi assignment nahi — upar se banayein."))));
}

function asgForm() {
  const form = el("form", { novalidate: true });
  form.innerHTML = `
    <div class="field">
      <label class="field__label">Title <span class="req">*</span></label>
      <input class="input-ssz" name="title" type="text" placeholder="Jaise: Excel Practice Sheet 5">
      <div class="field__error"></div>
    </div>
    <div class="field">
      <label class="field__label">Instructions</label>
      <textarea class="textarea-ssz" name="description" style="min-height:80px" placeholder="Students ko kya karna hai"></textarea>
    </div>
    <div class="field">
      <label class="field__label">Kis tarah ka assignment? <span class="req">*</span></label>
      <select class="select-ssz" name="type">
        <option value="file">File — student apna kaam upload karega (practical)</option>
        <option value="mcq">MCQ — sawaal-jawab, khud check ho jayega (theory)</option>
      </select>
      <p class="field__hint" style="font-size:.76rem;color:var(--text-muted);margin:.3rem 0 0">
        Practical kaam ke liye File, aur theory/revision ke liye MCQ — MCQ me aapko kuch check nahi karna padta.
      </p>
    </div>
    <div class="adm-row">
      <div class="field">
        <label class="field__label">Batch <span class="req">*</span></label>
        <select class="select-ssz" name="batchId"></select>
        <div class="field__error"></div>
      </div>
      <div class="field" id="asgMarksField">
        <label class="field__label">Marks</label>
        <input class="input-ssz" name="totalMarks" type="number" min="1" value="10">
      </div>
    </div>
    <div class="field">
      <label class="field__label">Due date <span class="req">*</span></label>
      <input class="input-ssz" name="dueDate" type="datetime-local">
      <div class="field__error"></div>
    </div>
    <div class="field" id="asgFileField">
      <label class="field__label">Question file (optional)</label>
      <input class="input-ssz" name="file" type="file" style="padding:.6rem">
    </div>
    <div id="asgMcqBox" hidden>
      <div class="card-ssz" style="margin-bottom:1rem;border-left:3px solid var(--brand)">
        <div class="card-ssz__body" style="padding:1rem 1.15rem">
          <strong style="font-size:.9rem;display:block;margin-bottom:.2rem">Bank se sawaal uthayein</strong>
          <p style="font-size:.76rem;color:var(--text-muted);margin:0 0 .75rem">
            480 sawaal pehle se maujood hain. Har baar alag sawaal nikalte hain, isliye
            do batch ko ek jaisa paper nahi milega. <strong>Ye bank practice quiz me bhi
            chalta hai, isliye iske jawab public hain</strong> — haftawaar revision ke liye
            theek hai, asli imtihaan ke liye naye sawaal khud likhein.
          </p>
          <div class="adm-row">
            <div class="field" style="margin:0">
              <label class="field__label" style="font-size:.76rem">Module</label>
              <select class="select-ssz" name="bankModule"></select>
            </div>
            <div class="field" style="margin:0">
              <label class="field__label" style="font-size:.76rem">Kitne sawaal</label>
              <input class="input-ssz" name="bankCount" type="number" min="1" max="100" value="25">
            </div>
          </div>
          <div class="cluster" style="margin-top:.6rem;gap:.5rem">
            <button class="btn-ssz btn-primary-ssz btn-sm-ssz" type="button" id="asgBankFill">Bank se bharein</button>
            <button class="btn-ssz btn-ghost-ssz btn-sm-ssz" type="button" id="asgBankAdd">Aur jodein</button>
          </div>
        </div>
      </div>
      <div class="between" style="margin-bottom:.75rem">
        <strong style="font-size:.95rem">Sawaal <span id="asgQCount" style="color:var(--text-muted);font-weight:400"></span></strong>
        <button class="btn-ssz btn-secondary-ssz btn-sm-ssz" type="button" id="asgAddQ">+ Khud likhein</button>
      </div>
      <div id="asgQList"></div>
      <p style="font-size:.78rem;color:var(--text-muted);margin:.6rem 0 0">
        Har sahi jawab ka 1 mark. Total marks sawaalon ki ginti ke barabar apne aap ho jaayenge.
      </p>
    </div>`;

  const bSel = form.querySelector('[name="batchId"]');
  bSel.appendChild(el("option", { value: "" }, "Chunein"));
  batches.filter((b) => b.status !== "completed").forEach((b) => bSel.appendChild(el("option", { value: b.id }, b.name)));
  const due = new Date(Date.now() + 3 * 86400000); due.setHours(23, 59, 0, 0);
  form.elements.dueDate.value = dateTimeLocal(due);

  /* ---------------- MCQ builder ----------------
     Har sawaal ek chhota card hai: sawaal + 4 option + radio se sahi jawab.
     Radio isliye ki ek hi sahi jawab ho sakta hai — do galti se nahi chun sakte. */
  const qList = form.querySelector("#asgQList");
  const mcqBox = form.querySelector("#asgMcqBox");
  const fileField = form.querySelector("#asgFileField");
  const marksField = form.querySelector("#asgMarksField");
  let qSeq = 0;

  function renumber() {
    [...qList.children].forEach((card, i) => {
      card.querySelector("[data-qnum]").textContent = `Sawaal ${i + 1}`;
      card.querySelector("[data-del-q]").hidden = qList.children.length <= 1;
    });
    const n = qList.children.length;
    const label = form.querySelector("#asgQCount");
    if (label) label.textContent = n ? `· ${n} sawaal · ${n} marks` : "";
  }

  function addQuestion() {
    const gid = `q${++qSeq}`;
    const card = el("div", {
      class: "card-ssz",
      style: { marginBottom: ".75rem" },
      dataset: { qcard: "1" }
    });
    card.innerHTML = `
      <div class="card-ssz__body" style="padding:1rem 1.15rem">
        <div class="between" style="margin-bottom:.6rem">
          <strong style="font-size:.82rem;color:var(--text-muted)" data-qnum>Sawaal</strong>
          <button class="btn-ssz btn-ghost-ssz btn-sm-ssz" type="button"
                  style="color:var(--danger)" data-del-q>Hataayein</button>
        </div>
        <input class="input-ssz" data-q type="text" placeholder="Jaise: MS Word me bold ka shortcut kya hai?">
        <p style="font-size:.76rem;color:var(--text-muted);margin:.7rem 0 .4rem">
          Chaar option likhein, aur sahi wale ke aage ka gola daba dein.
        </p>
        ${[0, 1, 2, 3].map((i) => `
          <label style="display:flex;align-items:center;gap:.6rem;margin-bottom:.4rem">
            <input type="radio" name="${gid}" value="${i}"${i === 0 ? " checked" : ""} style="flex-shrink:0">
            <input class="input-ssz" data-opt="${i}" type="text" placeholder="Option ${i + 1}">
          </label>`).join("")}
      </div>`;
    card.querySelector("[data-del-q]").addEventListener("click", () => {
      if (qList.children.length <= 1) return;
      card.remove();
      renumber();
    });
    qList.appendChild(card);
    renumber();
  }

  form.querySelector("#asgAddQ").addEventListener("click", addQuestion);
  addQuestion();

  /* ---------------- Bank se sawaal ----------------
     Card banakar uske khaane bharte hain — yaani bank ka sawaal aane ke baad
     bhi aap use haath se badal sakte hain. Bank sirf shuruaat deta hai,
     bandhan nahi. */
  const bankSel = form.querySelector('[name="bankModule"]');
  const counts = bankCounts();
  bankSel.appendChild(el("option", { value: "" }, `Saare module (${QUESTION_BANK.length})`));
  BANK_MODULES.forEach((m) =>
    bankSel.appendChild(el("option", { value: m }, `${m} (${counts[m] || 0})`)));

  function fillCard(card, item) {
    card.querySelector("[data-q]").value = item.q;
    [...card.querySelectorAll("[data-opt]")].forEach((inp, i) => { inp.value = item.o[i] || ""; });
    const radios = card.querySelectorAll("input[type=radio]");
    if (radios[item.a]) radios[item.a].checked = true;
  }

  function addFromBank(replace) {
    const count = Math.max(1, Math.min(100, Number(form.elements.bankCount.value) || 25));
    const picked = pickQuestions(bankSel.value, count);
    if (!picked.length) return toast.warning("Is module me sawaal nahi mile.");

    if (replace) qList.replaceChildren();
    picked.forEach((item) => {
      addQuestion();
      fillCard(qList.lastElementChild, item);
    });
    renumber();
    toast.success(`${picked.length} sawaal aa gaye${bankSel.value ? ` — ${bankSel.value}` : ""}.`);
  }

  form.querySelector("#asgBankFill").addEventListener("click", () => addFromBank(true));
  form.querySelector("#asgBankAdd").addEventListener("click", () => addFromBank(false));

  const typeSel = form.elements.type;
  const applyType = () => {
    const mcq = typeSel.value === "mcq";
    mcqBox.hidden = !mcq;
    fileField.hidden = mcq;
    marksField.hidden = mcq;      // MCQ me marks = sawaalon ki ginti
  };
  typeSel.addEventListener("change", applyType);
  applyType();

  /** Form se sawaal padhta hai. Galti mile to { error } lautata hai. */
  function readQuestions() {
    const cards = [...qList.querySelectorAll("[data-qcard]")];
    const questions = [], correct = [];
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const text = c.querySelector("[data-q]").value.trim();
      if (!text) return { error: `Sawaal ${i + 1} khaali hai.` };
      const options = [...c.querySelectorAll("[data-opt]")].map((o) => o.value.trim());
      if (options.some((o) => !o)) return { error: `Sawaal ${i + 1} ke saare chaar option bharein.` };
      const picked = c.querySelector("input[type=radio]:checked");
      if (!picked) return { error: `Sawaal ${i + 1} ka sahi jawab chunein.` };
      questions.push({ q: text, options });
      correct.push(Number(picked.value));
    }
    if (!questions.length) return { error: "Kam se kam ek sawaal jodein." };
    return { questions, correct };
  }

  const validator = createValidator(form, {
    title:   [rules.required(), rules.minLen(4)],
    batchId: [rules.required("Batch chunein.")],
    dueDate: [rules.required("Due date chunein.")]
  });

  const saveBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Assignment Dein");
  const cancelBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Cancel");
  const m = openModal({ title: "Naya Assignment", size: "lg", body: form, footer: [cancelBtn, saveBtn] });
  cancelBtn.addEventListener("click", () => m.close());

  saveBtn.addEventListener("click", async () => {
    if (!validator.validate()) return;
    const isMcq = form.elements.type.value === "mcq";
    const batch = batches.find((b) => b.id === bSel.value);

    /* Sahi jawab yahan alag nikaal lete hain — ye assignment ke saath save
       NAHI hote. Warna student browser console se pehle hi dekh leta. Ye
       assignmentKeys me jaate hain, jahan submit karne se pehle uski pahunch
       nahi hai (dekhein firestore.rules). */
    let questions = [], correct = [];
    if (isMcq) {
      const read = readQuestions();
      if (read.error) return toast.error(read.error);
      questions = read.questions;
      correct = read.correct;
    }

    const data = {
      title: form.elements.title.value.trim(),
      description: form.elements.description.value.trim(),
      type: isMcq ? "mcq" : "file",
      batchId: bSel.value,
      courseId: batch?.courseId || "",
      totalMarks: isMcq ? questions.length : (Number(form.elements.totalMarks.value) || 10),
      dueDate: new Date(form.elements.dueDate.value),
      questions,
      filePath: "", fileURL: "", fileName: ""
    };
    const file = isMcq ? null : form.elements.file.files[0];
    if (file) {
      const check = validateFile(file, "material");
      if (!check.ok) return toast.error(check.error);
    }

    if (mode === "preview") {
      assignments.unshift({ id: `tmp-${Date.now()}`, ...data, fileName: file?.name || "" });
      m.close(); paintTabs(); paintAsg();
      toast.info("Preview mode: Firebase ke baad asli upload hoga.");
      return;
    }

    try {
      saveBtn.disabled = true;
      const { create, update, createWithId } = await import("../../firebase/db-service.js");
      const id = await create(COLLECTIONS.ASSIGNMENTS, data);
      if (isMcq) {
        await createWithId(COLLECTIONS.ASSIGNMENT_KEYS, id, { correct, assignmentId: id });
      }
      if (file) {
        const { uploadFile } = await import("../../firebase/storage-service.js");
        // Path only — see the note on the notes upload below.
        const up = await uploadFile(file, STORAGE_PATHS.assignments(id), {
          kind: "material", skipUrl: true
        });
        await update(COLLECTIONS.ASSIGNMENTS, id, { filePath: up.path, fileName: file.name });
        data.filePath = up.path; data.fileName = file.name;
      }
      assignments.unshift({ id, ...data });
      m.close(); paintTabs(); paintAsg();
      toast.success(isMcq
        ? `MCQ de diya gaya — ${questions.length} sawaal, khud check ho jayega.`
        : "Assignment de diya gaya — students ko dashboard me dikhega.");
    } catch (err) {
      saveBtn.disabled = false;
      toast.error(err.message || "Fail ho gaya.");
    }
  });
}

async function showSubmissions(a) {
  let subs = [];
  if (mode === "preview") {
    subs = DEMO_SUBMISSIONS.filter((s) => s.assignmentId === a.id).map((s) => ({ ...s }));
  } else {
    const { getMany } = await import("../../firebase/db-service.js");
    subs = await getMany(COLLECTIONS.SUBMISSIONS, {
      where: [["assignmentId", "==", a.id]], limit: 100, useCache: false
    }).catch(() => []);
  }

  const body = el("div", {});
  if (!subs.length) {
    body.appendChild(el("p", { style: { margin: 0, color: "var(--text-muted)" } }, "Abhi kisi ne submit nahi kiya."));
  } else {
    subs.forEach((s) => {
      const row = el("div", { class: "card-ssz", style: { marginBottom: ".75rem" } },
        el("div", { class: "card-ssz__body", style: { padding: "1rem 1.25rem" } },
          el("div", { class: "between", style: { flexWrap: "wrap", gap: ".5rem", marginBottom: ".5rem" } },
            el("strong", { style: { fontSize: ".9rem" } }, `${s.studentName || s.studentId}`),
            s.status === "graded"
              ? el("span", { class: "badge-ssz badge-success" }, `${s.marks}/${a.totalMarks}`)
              : el("span", { class: "badge-ssz badge-warning" }, "Grade baaki")),
          el("p", { style: { fontSize: ".78rem", color: "var(--text-muted)", margin: "0 0 .6rem" } },
            /* MCQ me koi file hoti hi nahi — wahan ye batana zyada kaam ka hai
               ki khud check hua hai. Marks phir bhi badle ja sakte hain. */
            s.type === "mcq"
              ? `MCQ · khud check hua · ${formatDateTime(s.submittedAt)}`
              : `${s.fileName || "file"} · ${formatDateTime(s.submittedAt)}`),
          el("div", { class: "cluster" },
            s.fileURL && s.fileURL !== "#" ? el("a", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", href: s.fileURL, target: "_blank", rel: "noopener" }, "File kholein") : null,
            el("input", { class: "input-ssz", type: "number", min: "0", max: String(a.totalMarks), placeholder: "Marks", value: s.marks ?? "", style: { maxWidth: "90px", minHeight: "36px", padding: ".4rem .6rem" }, dataset: { marks: s.id } }),
            el("input", { class: "input-ssz", type: "text", placeholder: "Feedback (optional)", value: s.feedback || "", style: { flex: "1", minWidth: "160px", minHeight: "36px", padding: ".4rem .6rem" }, dataset: { fb: s.id } }),
            el("button", { class: "btn-ssz btn-primary-ssz btn-sm-ssz", type: "button", dataset: { grade: s.id } }, "Save"))
        ));
      body.appendChild(row);
    });
  }

  const closeBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Band karein");
  const m = openModal({ title: `Submissions — ${a.title}`, size: "lg", body, footer: [closeBtn] });
  closeBtn.addEventListener("click", () => m.close());

  on(body, "click", "[data-grade]", async (e, btn) => {
    const id = btn.dataset.grade;
    const s = subs.find((x) => x.id === id);
    const marks = Number(body.querySelector(`[data-marks="${id}"]`).value);
    const feedback = body.querySelector(`[data-fb="${id}"]`).value.trim();
    if (isNaN(marks) || marks < 0 || marks > a.totalMarks) return toast.warning(`Marks 0 se ${a.totalMarks} ke beech dein.`);

    if (mode === "preview") { Object.assign(s, { marks, feedback, status: "graded" }); toast.info("Preview mode."); return; }
    try {
      const { update } = await import("../../firebase/db-service.js");
      await update(COLLECTIONS.SUBMISSIONS, id, { marks, feedback, status: "graded" });
      Object.assign(s, { marks, feedback, status: "graded" });
      toast.success("Grade save ho gaya.");
    } catch (err) { toast.error(err.message || "Fail ho gaya."); }
  });
}

/* ==========================================================================
   Notes
   ========================================================================== */
function noteRow(n) {
  return el("div", { class: "card-ssz" },
    el("div", { class: "card-ssz__body", style: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", padding: "1rem 1.25rem" } },
      el("span", { class: "stat-tile__icon", html: icon("fileText", { size: 20 }) }),
      el("span", { style: { flex: 1, minWidth: "220px" } },
        el("strong", { style: { display: "block", fontSize: ".93rem" } }, n.title),
        el("span", { style: { fontSize: ".78rem", color: "var(--text-muted)" } },
          `${COURSES.find((c) => c.id === n.courseId)?.shortTitle || n.courseId} · ${formatBytes(n.fileSize || 0)} · ${n.downloads || 0} downloads`)),
      (n.filePath || (n.fileURL && n.fileURL !== "#"))
        ? el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", type: "button", dataset: { openNote: n.id } }, "File")
        : null,
      el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", style: { color: "var(--danger)" }, type: "button", dataset: { delNote: n.id } }, "Delete")
    ));
}

function paintNotes() {
  render($("#noteAdminList"), notes.length ? notes.map(noteRow)
    : el("div", { class: "card-ssz" }, el("div", { class: "card-ssz__body" },
        el("p", { style: { margin: 0, fontSize: ".88rem", color: "var(--text-muted)" } },
          "Abhi koi note nahi — upar se upload karein."))));
}

function noteForm() {
  const form = el("form", { novalidate: true });
  form.innerHTML = `
    <div class="field">
      <label class="field__label">Title <span class="req">*</span></label>
      <input class="input-ssz" name="title" type="text" placeholder="Jaise: Tally Shortcuts — Chapter Notes">
      <div class="field__error"></div>
    </div>
    <div class="field">
      <label class="field__label">Description</label>
      <input class="input-ssz" name="description" type="text" placeholder="Ek line me kya hai isme">
    </div>
    <div class="field">
      <label class="field__label">Course <span class="req">*</span></label>
      <select class="select-ssz" name="courseId"></select>
      <div class="field__error"></div>
    </div>
    <div class="field">
      <label class="field__label">File <span class="req">*</span></label>
      <input class="input-ssz" name="file" type="file" style="padding:.6rem">
      <p class="field__hint">PDF best rahega — max 25 MB.</p>
    </div>`;

  const cSel = form.querySelector('[name="courseId"]');
  cSel.appendChild(el("option", { value: "" }, "Chunein"));
  COURSES.forEach((c) => cSel.appendChild(el("option", { value: c.id }, c.title)));

  const validator = createValidator(form, {
    title:    [rules.required(), rules.minLen(4)],
    courseId: [rules.required("Course chunein.")]
  });

  const saveBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Upload Karein");
  const cancelBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Cancel");
  const m = openModal({ title: "Naya Note", body: form, footer: [cancelBtn, saveBtn] });
  cancelBtn.addEventListener("click", () => m.close());

  saveBtn.addEventListener("click", async () => {
    if (!validator.validate()) return;
    const file = form.elements.file.files[0];
    if (!file) return toast.warning("File chunein.");
    const check = validateFile(file, "material");
    if (!check.ok) return toast.error(check.error);

    const data = {
      title: form.elements.title.value.trim(),
      description: form.elements.description.value.trim(),
      courseId: cSel.value,
      fileName: file.name, fileType: file.type, fileSize: file.size,
      filePath: "", fileURL: "", downloads: 0, isPublic: false
    };

    if (mode === "preview") {
      notes.unshift({ id: `tmp-${Date.now()}`, ...data, fileURL: "#" });
      m.close(); paintTabs(); paintNotes();
      toast.info("Preview mode: Firebase ke baad asli upload hoga.");
      return;
    }

    try {
      saveBtn.disabled = true;
      const { uploadFile } = await import("../../firebase/storage-service.js");
      const { create } = await import("../../firebase/db-service.js");
      // Store the path, not the download URL. A Storage URL carries its own
      // token and opens for anyone holding the link — sitting in the database
      // it made the file effectively public. The URL is fetched on demand
      // instead, so Storage rules get to check the reader first.
      const up = await uploadFile(file, STORAGE_PATHS.notes(cSel.value), {
        kind: "material", skipUrl: true
      });
      data.filePath = up.path;
      const id = await create(COLLECTIONS.NOTES, data);
      notes.unshift({ id, ...data });
      m.close(); paintTabs(); paintNotes();
      toast.success("Note upload ho gaya — students ko dikhne laga.");
    } catch (err) {
      saveBtn.disabled = false;
      toast.error(err.message || "Upload fail ho gaya.");
    }
  });
}

/* ==========================================================================
   Boot
   ========================================================================== */
const shell = await initAdminShell({ active: "materials", title: "Materials" });
mode = shell.mode;

if (mode === "preview") {
  assignments = DEMO_ASSIGNMENTS.map((a) => ({ ...a }));
  notes = DEMO_NOTES.map((n) => ({ ...n }));
  batches = [...DEMO_BATCHES, { id: "DCA-MOR-JAN26", name: "DCA Morning (Jan 2026)", courseId: "ai-dca", status: "running" }]
    .filter((b, i, arr) => arr.findIndex((x) => x.id === b.id) === i);
} else {
  const { getMany } = await import("../../firebase/db-service.js");
  [assignments, notes, batches] = await Promise.all([
    getMany(COLLECTIONS.ASSIGNMENTS, { orderBy: ["createdAt", "desc"], limit: 100, useCache: false }).catch(() => []),
    getMany(COLLECTIONS.NOTES, { orderBy: ["createdAt", "desc"], limit: 100, useCache: false }).catch(() => []),
    getMany(COLLECTIONS.BATCHES, { limit: 50 }).catch(() => [])
  ]);
}

paintTabs(); paintAsg(); paintNotes();

on($("#matTabs"), "click", ".chip", (e, chip) => { tab = chip.dataset.tab; paintTabs(); });
$("#asgNew").addEventListener("click", asgForm);
$("#noteNew").addEventListener("click", noteForm);

on($("#asgAdminList"), "click", "[data-subs]", (e, btn) => {
  const a = assignments.find((x) => x.id === btn.dataset.subs);
  if (a) showSubmissions(a);
});
on($("#asgAdminList"), "click", "[data-delAsg]", async (e, btn) => {
  const a = assignments.find((x) => x.id === btn.dataset.delAsg);
  if (!a) return;
  const ok = await confirmModal({ title: "Assignment delete karein?", message: `"${a.title}" students ke dashboard se hat jaayega.`, danger: true, confirmText: "Haan" });
  if (!ok) return;
  if (mode === "live") {
    try {
      const { remove } = await import("../../firebase/db-service.js");
      await remove(COLLECTIONS.ASSIGNMENTS, a.id);
    } catch (err) { return toast.error(err.message || "Fail ho gaya."); }
  }
  assignments = assignments.filter((x) => x.id !== a.id);
  paintTabs(); paintAsg();
  toast.success("Delete ho gaya.");
});
/* The download URL is not kept in the document any more, so resolve it at the
   moment it is asked for. Older notes still carry fileURL — use that. */
on($("#noteAdminList"), "click", "[data-openNote]", async (e, btn) => {
  const n = notes.find((x) => x.id === btn.dataset.openNote);
  if (!n) return;
  if (n.filePath) {
    btn.disabled = true;
    try {
      const { urlForPath } = await import("../../firebase/storage-service.js");
      window.open(await urlForPath(n.filePath), "_blank", "noopener");
    } catch (err) {
      toast.error(err.message || "File nahi khul payi.");
    } finally {
      btn.disabled = false;
    }
    return;
  }
  window.open(n.fileURL, "_blank", "noopener");
});

on($("#noteAdminList"), "click", "[data-delNote]", async (e, btn) => {
  const n = notes.find((x) => x.id === btn.dataset.delNote);
  if (!n) return;
  const ok = await confirmModal({ title: "Note delete karein?", message: `"${n.title}" students ke Notes se hat jaayega.`, danger: true, confirmText: "Haan" });
  if (!ok) return;
  if (mode === "live") {
    try {
      const { remove } = await import("../../firebase/db-service.js");
      await remove(COLLECTIONS.NOTES, n.id);
    } catch (err) { return toast.error(err.message || "Fail ho gaya."); }
  }
  notes = notes.filter((x) => x.id !== n.id);
  paintTabs(); paintNotes();
  toast.success("Delete ho gaya.");
});
