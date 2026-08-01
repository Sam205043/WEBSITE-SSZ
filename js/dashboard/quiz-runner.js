/* ==========================================================================
   Soft Skill Zone — Ek baar me ek sawaal wala test runner
   --------------------------------------------------------------------------
   Pehle poora paper ek hi screen par khul jaata tha. Mobile par wo 10 sawaal
   ka ek lamba scroll ban jaata tha — student ko pata hi nahi chalta ki kitna
   bacha hai, aur koi sawaal chhoot jaye to dhoondhna padta tha.

   Ab ek waqt me ek hi sawaal saamne rehta hai, upar patti se pata chalta hai
   kitne ho gaye, aur akhir me ek review screen aata hai jahan chhoote hue
   sawaal laal dikhte hain aur ek tap me wahan pahuncha ja sakta hai.

   Yahi runner teeno jagah chalta hai — admin ka MCQ assignment, module wala
   practice test, aur 100 marks wala poora test. Isliye ye khud kuchh save
   nahi karta: sirf jawab lauta deta hai, aage kya karna hai wo bulane wala
   tay karta hai.

     const answers = await runQuiz({ title, questions, minutes });
     // answers === null  =>  student ne band kar diya
   ========================================================================== */

import { el, $ } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { asset } from "../core/routes.js";
import { open as openModal, confirm as confirmModal } from "../core/modal.js";

const esc = (s) => String(s ?? "").replace(/[<>&"]/g, (c) =>
  ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

function injectStyles() {
  if ($('link[data-ssz-quiz-css]')) return;
  document.head.appendChild(el("link", {
    rel: "stylesheet", href: asset("css/quiz.css"), "data-ssz-quiz-css": "true"
  }));
}

/** 5400 -> "1:30:00", 540 -> "09:00" */
function clock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
}

/**
 * @param {object}   opts
 * @param {string}   opts.title
 * @param {Array}    opts.questions   [{ q, options|o }]
 * @param {number}   [opts.minutes]   0 = bina time ke
 * @param {string}   [opts.note]      upar chhoti si hidayat
 * @returns {Promise<number[]|null>}  har sawaal ka chuna gaya option (-1 = khali)
 */
export function runQuiz({ title, questions, minutes = 0, note = "" }) {
  injectStyles();

  const qs = questions || [];
  const answers = new Array(qs.length).fill(-1);
  let at = 0;               // abhi kaunsa sawaal
  let reviewing = false;    // akhri screen
  let timer = null;
  let left = minutes * 60;

  const body = el("div", { class: "quiz" });
  const submitBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Jama karein");
  const backBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Peechhe");
  const nextBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Aage");

  return new Promise((resolve) => {
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      if (timer) clearInterval(timer);
      m.close(value);
    };

    const m = openModal({
      title, size: "lg", body,
      footer: [backBtn, nextBtn, submitBtn],
      /* Bahar click ya Escape se band hone par jawab nahi jaate — modal.js
         khud null bhejta hai, aur hum bhi wahi lauta dete hain. */
      onClose: (v) => { if (timer) clearInterval(timer); resolve(v ?? null); }
    });

    /* ---------------- screens ---------------- */
    function paintQuestion() {
      const item = qs[at];
      const opts = item.options || item.o || [];
      const doneCount = answers.filter((a) => a >= 0).length;

      body.innerHTML = `
        <div class="quiz__bar">
          <div class="quiz__fill" style="width:${((at + 1) / qs.length) * 100}%"></div>
        </div>
        <div class="quiz__meta">
          <span>Sawaal <strong>${at + 1}</strong> / ${qs.length}</span>
          <span class="quiz__done">${doneCount} ho gaye</span>
          ${minutes ? `<span class="quiz__clock" id="qzClock">${clock(left)}</span>` : ""}
        </div>
        <p class="quiz__q">${esc(item.q)}</p>
        <div class="quiz__opts" id="qzOpts">
          ${opts.map((o, oi) => `
            <button type="button" class="quiz__opt${answers[at] === oi ? " is-picked" : ""}" data-oi="${oi}">
              <span class="quiz__letter">${"ABCD"[oi] || oi + 1}</span>
              <span>${esc(o)}</span>
            </button>`).join("")}
        </div>
        ${note && at === 0 ? `<p class="quiz__note">${esc(note)}</p>` : ""}`;

      body.querySelector("#qzOpts").addEventListener("click", (e) => {
        const btn = e.target.closest(".quiz__opt");
        if (!btn) return;
        answers[at] = Number(btn.dataset.oi);
        /* Turant aage nahi bhagte — student apna chuna hua jawab ek pal dekh
           le, aur chahe to badal bhi le. */
        body.querySelectorAll(".quiz__opt").forEach((b) => b.classList.toggle("is-picked", b === btn));
        body.querySelector(".quiz__done").textContent = `${answers.filter((a) => a >= 0).length} ho gaye`;
      });

      backBtn.style.display = at === 0 ? "none" : "";
      nextBtn.style.display = "";
      nextBtn.textContent = at === qs.length - 1 ? "Review" : "Aage";
      submitBtn.style.display = "none";
    }

    function paintReview() {
      const blanks = answers.reduce((n, a) => n + (a < 0 ? 1 : 0), 0);
      body.innerHTML = `
        <p class="quiz__reviewHead">${
          blanks
            ? `<strong>${blanks} sawaal</strong> abhi khali hain. Laal wale par tap karke wahan ja sakte hain.`
            : "Saare sawaal ho gaye. Chahein to koi bhi number dabakar ek baar aur dekh lein."
        }</p>
        <div class="quiz__grid" id="qzGrid">
          ${qs.map((_, i) =>
            `<button type="button" class="quiz__cell${answers[i] < 0 ? " is-blank" : " is-done"}" data-i="${i}">${i + 1}</button>`
          ).join("")}
        </div>`;

      body.querySelector("#qzGrid").addEventListener("click", (e) => {
        const c = e.target.closest(".quiz__cell");
        if (!c) return;
        at = Number(c.dataset.i);
        reviewing = false;
        paintQuestion();
      });

      backBtn.style.display = "";
      nextBtn.style.display = "none";
      submitBtn.style.display = "";
    }

    /* ---------------- buttons ---------------- */
    backBtn.addEventListener("click", () => {
      if (reviewing) { reviewing = false; at = qs.length - 1; return paintQuestion(); }
      if (at > 0) { at--; paintQuestion(); }
    });

    nextBtn.addEventListener("click", () => {
      if (at < qs.length - 1) { at++; paintQuestion(); }
      else { reviewing = true; paintReview(); }
    });

    submitBtn.addEventListener("click", async () => {
      const blanks = answers.reduce((n, a) => n + (a < 0 ? 1 : 0), 0);
      if (blanks) {
        const ok = await confirmModal({
          title: "Jama kar dein?",
          message: `${blanks} sawaal khali reh gaye hain — unke marks nahi milenge.`,
          confirmText: "Haan, jama karein"
        });
        if (!ok) return;
      }
      finish(answers);
    });

    /* ---------------- ghadi ---------------- */
    if (minutes) {
      timer = setInterval(() => {
        left--;
        const c = body.querySelector("#qzClock");
        if (c) {
          c.textContent = clock(left);
          c.classList.toggle("is-low", left <= 300);   // aakhri 5 minute
        }
        /* Waqt khatam — jo bhar chuka hai wahi jama ho jata hai. Student ki
           poori mehnat sirf ghadi ki wajah se zaaya nahi honi chahiye. */
        if (left <= 0) finish(answers);
      }, 1000);
    }

    paintQuestion();
  });
}
