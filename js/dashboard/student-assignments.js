/* ==========================================================================
   Soft Skill Zone — Student: Assignments
   List + status + file submission (resubmit allowed until graded).
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatDate, formatDateTime, toDate } from "../core/utils.js";
import { validateFile } from "../core/files.js";
import { initShell } from "./shell.js";
import * as data from "./student-data.js";
import { DEMO_ASSIGNMENTS, DEMO_SUBMISSIONS, DEMO_STUDENT } from "./demo-data.js";
import { deliver } from "./watermark.js";
import { open as openModal } from "../core/modal.js";
import { runQuiz } from "./quiz-runner.js";
import toast from "../core/toast.js";

let assignments = [], submissions = [], student = null, mode = "preview";
let filter = "all";

const subFor = (a) => submissions.find((s) => s.assignmentId === a.id);
const isOverdue = (a) => toDate(a.dueDate)?.getTime() < Date.now();

function statusOf(a) {
  const s = subFor(a);
  if (s?.status === "graded") return "graded";
  if (s) return "submitted";
  return isOverdue(a) ? "overdue" : "pending";
}

const FILTERS = [
  { value: "all", label: "Sab" },
  { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" },
  { value: "graded", label: "Graded" },
  { value: "overdue", label: "Overdue" }
];

function card(a) {
  const s = subFor(a);
  const st = statusOf(a);
  const badge = {
    pending:   ["badge-warning", "Pending"],
    submitted: ["badge-accent", "Submitted"],
    graded:    ["badge-success", `Graded · ${s?.marks}/${a.totalMarks}`],
    overdue:   ["badge-danger", "Overdue"]
  }[st];

  const box = el("div", { class: "card-ssz" }, el("div", { class: "card-ssz__body" },
    el("div", { class: "between", style: { flexWrap: "wrap", gap: ".5rem", marginBottom: ".5rem" } },
      el("h3", { style: { margin: 0, fontSize: "1rem" } }, a.title),
      el("span", { class: `badge-ssz badge-dot ${badge[0]}` }, badge[1])
    ),
    el("p", { style: { fontSize: ".85rem", marginBottom: ".75rem" } }, a.description || ""),
    el("p", { style: { fontSize: ".78rem", color: "var(--text-muted)", marginBottom: "1rem" } },
      `Due: ${formatDateTime(a.dueDate)} · ${a.totalMarks} marks${s ? ` · Submitted: ${formatDate(s.submittedAt)}` : ""}`),

    (a.filePath || a.fileURL) ? el("button", {
      class: "btn-ssz btn-ghost-ssz btn-sm-ssz", type: "button",
      dataset: { openAsg: a.id }, style: { marginRight: ".5rem" }
    }, el("span", { html: icon("download", { size: 16 }) }), a.fileName || "Question file") : null,

    s?.feedback ? el("div", {
      style: { marginTop: ".75rem", padding: ".75rem 1rem", borderRadius: "var(--r-sm)", background: "var(--bg-surface-2)", fontSize: ".82rem" }
    }, el("strong", {}, "Faculty feedback: "), s.feedback) : null,

    /* MCQ ek hi baar hota hai — submit hone ke baad dobara nahi. File wale
       assignment me dobara submit ki chhoot hai jab tak marks na lag jayein. */
    a.type === "mcq"
      ? (!s
          ? el("div", { style: { marginTop: "1rem" } },
              el("button", { class: "btn-ssz btn-primary-ssz btn-sm-ssz", type: "button", dataset: { quiz: a.id } },
                el("span", { html: icon("clipboard", { size: 16 }) }),
                ` ${a.questions?.length || 0} sawaal — shuru karein`),
              el("p", { style: { margin: ".5rem 0 0", fontSize: ".76rem", color: "var(--text-muted)" } },
                "Ek hi mauka milega, isliye aaram se karein. Result turant mil jayega."))
          /* Jawab to jama ho gaye par marks nahi lage — aksar tab hota hai jab
             submit ke theek baad net kat jaye. Yahan se dobara nikaal lete
             hain; jawab pehle hi jam chuke hain, isliye koi khatra nahi. */
          : (s.marks == null
              ? el("div", { style: { marginTop: "1rem" } },
                  el("button", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", type: "button", dataset: { regrade: a.id } },
                    "Result nikalein"),
                  el("p", { style: { margin: ".5rem 0 0", fontSize: ".76rem", color: "var(--text-muted)" } },
                    "Aapke jawab jama ho chuke hain, sirf result banna baaki hai."))
              : null))
      : (st !== "graded" ? el("div", { style: { marginTop: "1rem" } },
          el("input", { type: "file", class: "visually-hidden", id: `file-${a.id}`, "aria-label": `${a.title} ke liye file chunein`, accept: "application/pdf,image/jpeg,image/png,.doc,.docx,.xls,.xlsx" }),
          el("button", { class: "btn-ssz btn-primary-ssz btn-sm-ssz", type: "button", dataset: { pick: a.id } },
            el("span", { html: icon("upload", { size: 16 }) }),
            s ? "Dobara submit karein" : "Submit karein"),
          el("span", { id: `prog-${a.id}`, style: { marginLeft: ".75rem", fontSize: ".8rem", color: "var(--text-muted)" } })
        ) : null)
  ));
  return box;
}

/* ==========================================================================
   MCQ — paper aur turant result
   --------------------------------------------------------------------------
   Sahi jawab is page par kabhi nahi aate jab tak student submit na kar de.
   Wo assignmentKeys me alag pade hain aur Firestore rules unhe sirf usi
   student ko dikhate hain jiska submission ban chuka hai. Isliye console
   kholkar pehle se jawab dekhna mumkin nahi hai.
   ========================================================================== */
async function quizDialog(a) {
  if (mode === "preview") {
    toast.info("Preview mode: Firebase connect hone ke baad MCQ chalega.");
    return;
  }
  const qs = a.questions || [];
  if (!qs.length) return toast.error("Is assignment me abhi koi sawaal nahi hai.");

  /* Ek baar me ek sawaal — runner sab sambhalta hai. Yahan sirf jawab aate
     hain, aur wahi Firestore me jaate hain. */
  const answers = await runQuiz({
    title: a.title,
    questions: qs,
    note: "Har sahi jawab ka 1 mark. Ek hi mauka milega, isliye jama karne se pehle review screen par ek baar dekh lein."
  });
  if (!answers) return;              // student ne band kar diya

  try {
    const res = await data.submitMcq(student, a, answers);
    submissions = await data.getSubmissions(student);
    paint();
    resultDialog(a, res);
  } catch (err) {
    toast.error(err.message || "Jama nahi ho paya.");
  }
}

function resultDialog(a, res) {
  const pct = a.totalMarks ? Math.round((res.marks / a.totalMarks) * 100) : 0;
  const good = pct >= 40;
  const body = el("div", { style: { textAlign: "center" } },
    el("div", {
      style: { fontSize: "2.6rem", fontWeight: "800", fontFamily: "var(--font-display)",
               color: good ? "var(--success)" : "var(--danger)", lineHeight: 1.1 }
    }, `${res.marks}/${a.totalMarks}`),
    el("p", { style: { margin: ".4rem 0 1rem", fontSize: ".9rem", color: "var(--text-muted)" } },
      `${pct}% · ${good ? "Shaabaash!" : "Thoda aur mehnat chahiye."}`),
    el("p", { style: { fontSize: ".82rem", color: "var(--text-muted)", margin: 0 } },
      good
        ? "Aapke marks record me chadh gaye hain."
        : "Ghabraiye mat — notes dobara padh lijiye aur faculty se pooch lijiye.")
  );
  const closeBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Theek hai");
  const m = openModal({ title: "Aapka result", body, footer: [closeBtn] });
  closeBtn.addEventListener("click", () => m.close());
}

function paint() {
  const list = filter === "all" ? assignments : assignments.filter((a) => statusOf(a) === filter);
  if (!list.length) {
    render($("#asgList"), el("div", { class: "empty-state" },
      el("div", { class: "empty-state__icon", html: icon("clipboard", { size: 32 }) }),
      el("h2", {}, "Yahan kuch nahi hai"),
      el("p", {}, filter === "all" ? "Faculty assignment dete hi yahan dikhega." : "Is filter me koi assignment nahi.")
    ));
    return;
  }
  render($("#asgList"), list.map(card));
}

function paintFilters() {
  render($("#asgFilters"), FILTERS.map((f) =>
    el("button", { type: "button", class: `chip${f.value === filter ? " is-active" : ""}`, dataset: { f: f.value } }, f.label)
  ));
}

async function handleUpload(assignmentId, file) {
  const a = assignments.find((x) => x.id === assignmentId);
  if (!a || !file) return;

  const check = validateFile(file, "document");
  if (!check.ok) return toast.error(check.error);

  if (mode === "preview") {
    toast.info("Preview mode: Firebase connect hone ke baad file asli me upload hogi.");
    return;
  }

  const prog = $(`#prog-${assignmentId}`);
  try {
    await data.submitAssignment(student, a, file, subFor(a), (p) => { prog.textContent = `${p}%`; });
    prog.textContent = "";
    toast.success("Assignment submit ho gaya!");
    submissions = await data.getSubmissions(student);
    paint();
  } catch (err) {
    prog.textContent = "";
    toast.error(err.message || "Upload fail ho gaya.");
  }
}

/* ---------------- boot ---------------- */
const shell = await initShell({ active: "assignments", title: "Assignments" });
mode = shell.mode;

if (mode === "preview") {
  assignments = [...DEMO_ASSIGNMENTS]; submissions = [...DEMO_SUBMISSIONS]; student = DEMO_STUDENT;
} else {
/* Ek bhi query mana ho jaye (rule badla ho, index thanda ho, ya account
   abhi kisi student record se juda hi na ho) to page KHAALI nahi chhodna.
   Pehle yahan `.catch` tha hi nahi, aur ye file top-level `await` par chalti
   hai — matlab reject hote hi poora module wahin ruk jaata tha aur student
   ko bilkul khaali page milta tha, bina ye jaane ki hua kya. Ab section
   khaali dikhta hai aur ek saaf sandesh chala jaata hai. */
/* `Promise.all` yahan galat tha: assignments mana ho jaate to submissions ka
   aaya hua jawab bhi phenk diya jaata. `allSettled` se jo mil gaya wo bacha
   rehta hai. */
  /* PEHLE YAHAN CHUPCHAAP `null` LAUT AATA THA, AUR WAHI SABSE BURA JAWAB
     THA. Student ka record na khul paaye to neeche wali list bhi nahi
     chalti — aur uske saath us list wala sandesh bhi nahi chalta. Natija:
     page bilkul saada khaali dikhta ("Abhi tak koi class nahi hui"), jaise
     sach me kuchh hai hi nahi. Jiske paas poora record hai use ye jhooth
     dikhta tha, bina kisi galti ke.

     Ab is galti ki apni khabar jaati hai. */
  student = await data.getStudent(shell.user).catch((err) => {
    console.error("[student] apna record nahi khula:", err);
    toast.warning("Aapka record abhi nahi khul paya. Thodi der baad dobara kholein — baar-baar ho to institute ko bata dein.", { duration: 9000 });
    return null;
  });
  if (student) {
    const settled = await Promise.allSettled([
      data.getAssignments(student), data.getSubmissions(student)
    ]);
    settled.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`[assignments] ${i === 0 ? "assignments" : "submissions"} load nahi hua:`, r.reason);
      }
    });
    if (settled.some((r) => r.status === "rejected")) {
    toast.warning("Assignments ki list poori abhi nahi khul payi. Agar ye baar-baar ho to institute ko bata dein — ho sakta hai aapka login abhi kisi batch se juda na ho.", { duration: 9000 });
    }
    [assignments, submissions] = settled.map((r) => (r.status === "fulfilled" ? r.value : []));
  }
}

paintFilters();
paint();

on($("#asgFilters"), "click", ".chip", (e, chip) => {
  filter = chip.dataset.f;
  paintFilters();
  paint();
});

on($("#asgList"), "click", "[data-quiz]", (e, btn) => {
  const a = assignments.find((x) => x.id === btn.dataset.quiz);
  if (a) quizDialog(a);
});

on($("#asgList"), "click", "[data-regrade]", async (e, btn) => {
  const a = assignments.find((x) => x.id === btn.dataset.regrade);
  const s = a && subFor(a);
  if (!a || !s) return;
  btn.disabled = true;
  try {
    const res = await data.gradeMcq(student, a);
    submissions = await data.getSubmissions(student);
    paint();
    resultDialog(a, res);
  } catch (err) {
    btn.disabled = false;
    toast.error(err.message || "Result nahi ban paya.");
  }
});

/* Question papers are stored by path, not by download URL — ask for the link
   only when it is clicked, so Storage rules check the reader first. Older
   assignments still carry a fileURL and keep working. */
on($("#asgList"), "click", "[data-open-asg]", async (e, btn) => {
  const a = assignments.find((x) => x.id === btn.dataset.openAsg);
  if (!a) return;
  let url = a.fileURL;
  if (a.filePath) {
    btn.disabled = true;
    try {
      const { urlForPath } = await import("../../firebase/storage-service.js");
      url = await urlForPath(a.filePath);
    } catch (err) {
      toast.error(err.message || "File nahi khul payi — dobara login karke try karein.");
      return;
    } finally {
      btn.disabled = false;
    }
  }
  if (url) await deliver(btn, a, url, mode === "preview" ? null : student, shell.user);
});

on($("#asgList"), "click", "[data-pick]", (e, btn) => {
  $(`#file-${btn.dataset.pick}`)?.click();
});
on($("#asgList"), "change", 'input[type="file"]', (e, input) => {
  const id = input.id.replace("file-", "");
  handleUpload(id, input.files[0]);
  input.value = "";
});
