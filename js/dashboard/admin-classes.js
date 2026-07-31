/* ==========================================================================
   Soft Skill Zone — Admin: Live Class scheduler (Google Meet)
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatDateTime, dateTimeLocal, toDate } from "../core/utils.js";
import { open as openModal, confirm as confirmModal } from "../core/modal.js";
import { createValidator, rules } from "../core/validators.js";
import { initAdminShell } from "./admin-shell.js";
import { DEMO_BATCHES } from "./admin-demo.js";
import { DEMO_CLASSES } from "./demo-data.js";
import { COLLECTIONS, CLASS_STATUS } from "../core/constants.js";
import toast from "../core/toast.js";

let mode = "preview", classes = [], batches = [], batchF = "all";

function row(c) {
  const past = toDate(c.endsAt)?.getTime() < Date.now();
  const cancelled = c.status === CLASS_STATUS.CANCELLED;
  return el("div", { class: "card-ssz", style: cancelled ? { opacity: ".6" } : {} },
    el("div", { class: "card-ssz__body", style: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", padding: "1rem 1.25rem" } },
      el("span", { class: "stat-tile__icon", html: icon("video", { size: 20 }) }),
      el("span", { style: { flex: 1, minWidth: "220px" } },
        el("strong", { style: { display: "block", fontSize: ".93rem" } },
          c.title, cancelled ? el("span", { class: "badge-ssz badge-danger", style: { marginLeft: ".5rem" } }, "Cancelled") : null),
        el("span", { style: { fontSize: ".78rem", color: "var(--text-muted)" } },
          `${formatDateTime(c.startsAt)} · ${c.batchName || c.batchId} · ${c.facultyName || ""}`)),
      el("a", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", href: c.meetLink, target: "_blank", rel: "noopener" }, "Meet link"),
      past && !cancelled
        ? el("button", { class: `btn-ssz btn-sm-ssz ${c.recordingURL ? "btn-ghost-ssz" : "btn-secondary-ssz"}`, type: "button", dataset: { rec: c.id } },
            c.recordingURL ? (c.recordingPublished ? "Recording ✓" : "Recording — approve baaki") : "Recording daalein")
        : null,
      !past && !cancelled ? el("button", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", type: "button", dataset: { edit: c.id } }, "Edit") : null,
      !past && !cancelled ? el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", style: { color: "var(--danger)" }, type: "button", dataset: { cancel: c.id } }, "Cancel") : null
    ));
}

/* Jo classes ho chuki hain par unki recording abhi tak nahi daali gayi —
   sabse upar, taaki bhoolein nahi. */
function pendingRecordings(list) {
  return list
    .filter((c) => c.status !== CLASS_STATUS.CANCELLED
      && toDate(c.endsAt)?.getTime() < Date.now()
      && !c.recordingURL)
    .sort((a, b) => toDate(b.startsAt) - toDate(a.startsAt))
    .slice(0, 10);
}

function paint() {
  const list = batchF === "all" ? classes : classes.filter((c) => c.batchId === batchF);
  const upcoming = list.filter((c) => toDate(c.endsAt)?.getTime() >= Date.now())
    .sort((a, b) => toDate(a.startsAt) - toDate(b.startsAt));
  const past = list.filter((c) => toDate(c.endsAt)?.getTime() < Date.now())
    .sort((a, b) => toDate(b.startsAt) - toDate(a.startsAt)).slice(0, 15);

  const empty = (msg) => el("div", { class: "card-ssz" }, el("div", { class: "card-ssz__body" },
    el("p", { style: { margin: 0, fontSize: ".88rem", color: "var(--text-muted)" } }, msg)));

  const pend = pendingRecordings(list);
  const pendBox = $("#lcRecPending");
  if (pendBox) {
    $("#lcRecSection").hidden = !pend.length;
    render(pendBox, pend.map((c) =>
      el("div", { class: "card-ssz", style: { borderLeft: "3px solid var(--warning)" } },
        el("div", { class: "card-ssz__body", style: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", padding: "1rem 1.25rem" } },
          el("span", { style: { flex: 1, minWidth: "220px" } },
            el("strong", { style: { display: "block", fontSize: ".93rem" } }, c.title),
            el("span", { style: { fontSize: ".78rem", color: "var(--text-muted)" } },
              `${formatDateTime(c.startsAt)} · ${c.batchName || c.batchId}`)),
          el("button", { class: "btn-ssz btn-primary-ssz btn-sm-ssz", type: "button", dataset: { rec: c.id } },
            "Recording ka link daalein")))));
  }

  render($("#lcUpcoming"), upcoming.length ? upcoming.map(row) : empty("Koi upcoming class nahi — upar se schedule karein."));
  render($("#lcPast"), past.length ? past.map(row) : empty("Abhi tak koi class nahi hui."));
}

/* ==========================================================================
   Recording — daalein, phir approve karein
   --------------------------------------------------------------------------
   Link daalne se student ko kuch nahi dikhta. Wo tabhi dikhta hai jab aap
   "Students ko de dein" dabate hain — kyunki galat link ya adhoori recording
   apne aap chali jaye, ye theek nahi hoga. Approve karte hi batch ko khabar
   bhi chali jaati hai.
   ========================================================================== */
function recordingDialog(c) {
  const body = el("div", {});
  body.innerHTML = `
    <p style="font-size:.86rem;margin-bottom:1rem">
      <strong>${(c.title || "").replace(/[<>&]/g, "")}</strong><br>
      <span style="color:var(--text-muted);font-size:.8rem">${formatDateTime(c.startsAt)} · ${c.batchName || c.batchId}</span>
    </p>
    <div class="field">
      <label class="field__label">Recording ka link</label>
      <input class="input-ssz" id="recUrl" type="url" placeholder="https://drive.google.com/... ya YouTube ka link"
             value="${(c.recordingURL || "").replace(/"/g, "&quot;")}">
      <p class="field__hint" style="font-size:.76rem;color:var(--text-muted);margin:.3rem 0 0">
        Google Drive ka link ho to usme "jiske paas link hai wo dekh sakta hai" kar dein,
        warna students nahi khol paayenge. YouTube par "unlisted" rakhein.
      </p>
    </div>`;

  const status = el("p", { style: { fontSize: ".8rem", margin: ".25rem 0 0", fontWeight: "600" } },
    c.recordingURL
      ? (c.recordingPublished ? "Students ko mil chuki hai." : "Link save hai, par students ko abhi nahi mili.")
      : "Abhi koi link nahi hai.");
  status.style.color = c.recordingPublished ? "var(--success)" : "var(--text-muted)";
  body.appendChild(status);

  const saveBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Sirf save karein");
  const pubBtn = el("button", { class: "btn-ssz btn-success-ssz", type: "button" }, "Students ko de dein");
  const closeBtn = el("button", { class: "btn-ssz btn-ghost-ssz", type: "button" }, "Band karein");
  const m = openModal({ title: "Class ki recording", body, footer: [closeBtn, saveBtn, pubBtn] });
  closeBtn.addEventListener("click", () => m.close());

  async function commit(publish) {
    const url = body.querySelector("#recUrl").value.trim();
    if (!url) return toast.error("Pehle recording ka link daalein.");
    if (!/^https?:\/\//i.test(url)) return toast.error("Link https:// se shuru hona chahiye.");

    if (mode === "preview") {
      Object.assign(c, { recordingURL: url, recordingPublished: publish });
      m.close(); paint();
      return toast.info("Preview mode.");
    }
    try {
      saveBtn.disabled = pubBtn.disabled = true;
      const { update } = await import("../../firebase/db-service.js");
      await update(COLLECTIONS.LIVE_CLASSES, c.id, { recordingURL: url, recordingPublished: publish });
      Object.assign(c, { recordingURL: url, recordingPublished: publish });

      if (publish) {
        await notifyBatch({ ...c, title: c.title }, 0, {
          title: "Class ki recording aa gayi",
          message: `${c.title} (${formatDateTime(c.startsAt)}) ki recording ab dashboard me dekh sakte hain.`
        });
      }
      m.close(); paint();
      toast.success(publish ? "Recording students ko mil gayi — notification bhi chali gayi." : "Link save ho gaya. Students ko abhi nahi mila.");
    } catch (err) {
      saveBtn.disabled = pubBtn.disabled = false;
      toast.error(err.message || "Save fail ho gaya.");
    }
  }

  saveBtn.addEventListener("click", () => commit(false));
  pubBtn.addEventListener("click", () => commit(true));
}

/* ==========================================================================
   Batch ko khabar
   --------------------------------------------------------------------------
   Student ke page par pehle se likha tha "nayi class lagte hi notification
   aayegi" — par bhejta koi nahi tha. Ab bhejta hai.

   audience "batch" hone se ye us batch ke sabhi students ko dikhti hai;
   ek-ek ko alag bhejne ki zaroorat nahi.
   ========================================================================== */
async function notifyBatch(cls, count = 1, custom = null) {
  if (mode === "preview" || !cls.batchId) return;
  try {
    const { create } = await import("../../firebase/db-service.js");
    const many = count > 1;
    await create(COLLECTIONS.NOTIFICATIONS, {
      title: custom?.title || (many ? `${count} nayi classes lag gayin` : "Nayi live class lag gayi"),
      message: custom?.message || (many
        ? `${cls.title} — ${count} classes schedule ho gayi hain. Dashboard me "Live Classes" me poori list dekh lein.`
        : `${cls.title} — ${formatDateTime(cls.startsAt)}. Time par dashboard se JOIN kar lein.`),
      type: "class",
      priority: "normal",
      audience: "batch",
      batchId: cls.batchId,
      studentId: "",
      readBy: [],
      createdBy: "admin"
    });
  } catch (err) {
    // Class to lag hi chuki hai — khabar na jaye to bhi rukna nahi chahiye
    console.warn("[classes] notification failed:", err);
  }
}

function classForm(c = null) {
  const isNew = !c;
  const form = el("form", { novalidate: true });
  form.innerHTML = `
    <div class="field">
      <label class="field__label">Class ka title <span class="req">*</span></label>
      <input class="input-ssz" name="title" type="text" placeholder="Jaise: GST 2.0 — Return Filing Practical">
      <div class="field__error"></div>
    </div>
    <div class="adm-row">
      <div class="field">
        <label class="field__label">Batch <span class="req">*</span></label>
        <select class="select-ssz" name="batchId"></select>
        <div class="field__error"></div>
      </div>
      <div class="field">
        <label class="field__label">Faculty</label>
        <input class="input-ssz" name="facultyName" type="text" placeholder="Kaun padhayega">
      </div>
    </div>
    <div class="field">
      <label class="field__label">Google Meet link <span class="req">*</span></label>
      <input class="input-ssz" name="meetLink" type="url" placeholder="https://meet.google.com/xxx-yyyy-zzz">
      <p class="field__hint">Meet me nayi meeting banakar link yahan paste karein.</p>
      <div class="field__error"></div>
    </div>
    <div class="adm-row">
      <div class="field">
        <label class="field__label">Shuru <span class="req">*</span></label>
        <input class="input-ssz" name="startsAt" type="datetime-local">
        <div class="field__error"></div>
      </div>
      <div class="field">
        <label class="field__label">Khatam <span class="req">*</span></label>
        <input class="input-ssz" name="endsAt" type="datetime-local">
        <div class="field__error"></div>
      </div>
    </div>
    <div class="field">
      <label class="field__label">Topic (optional)</label>
      <input class="input-ssz" name="topic" type="text" placeholder="Aaj kya cover hoga">
    </div>
    <div id="lcRepeatBox">
      <label class="check-ssz" style="margin-bottom:.6rem">
        <input type="checkbox" name="repeatOn">
        <span>Ye class roz lagti hai — ek baar me poore hafte/mahine ki laga dein</span>
      </label>
      <div id="lcRepeatFields" hidden>
        <p style="font-size:.78rem;color:var(--text-muted);margin:0 0 .6rem">
          Har din ki class alag banti hai, isliye kisi ek din chhutti ho to sirf usi din
          ki class cancel kar dijiye — baaki chalti rahengi.
        </p>
        <label class="field__label" style="font-size:.76rem">Kaunse din</label>
        <div class="cluster" id="lcDays" style="gap:.4rem;margin-bottom:.75rem"></div>
        <div class="field" style="margin:0;max-width:220px">
          <label class="field__label" style="font-size:.76rem">Kitne hafte tak</label>
          <input class="input-ssz" name="repeatWeeks" type="number" min="1" max="12" value="4">
        </div>
        <p id="lcRepeatCount" style="font-size:.8rem;color:var(--brand);margin:.6rem 0 0;font-weight:600"></p>
      </div>
    </div>`;

  const bSel = form.querySelector('[name="batchId"]');
  bSel.appendChild(el("option", { value: "" }, "Chunein"));
  batches.filter((b) => b.status !== "completed").forEach((b) =>
    bSel.appendChild(el("option", { value: b.id }, b.name)));

  if (c) {
    form.elements.title.value = c.title || "";
    bSel.value = c.batchId || "";
    form.elements.facultyName.value = c.facultyName || "";
    form.elements.meetLink.value = c.meetLink || "";
    form.elements.topic.value = c.topic || "";
    form.elements.startsAt.value = dateTimeLocal(c.startsAt);
    form.elements.endsAt.value = dateTimeLocal(c.endsAt);
  } else {
    const soon = new Date(Date.now() + 3600000); soon.setMinutes(0, 0, 0);
    form.elements.startsAt.value = dateTimeLocal(soon);
    form.elements.endsAt.value = dateTimeLocal(new Date(soon.getTime() + 90 * 60000));
  }

  /* ---------------- Roz lagne wali class ----------------
     Repeat ka "niyam" kahin save nahi hota — hum seedhe utni classes bana
     dete hain. Isse har class ek aam class rehti hai: kisi ek din chhutti ho
     to sirf usi ko cancel kijiye, aur kisi ek din ka topic alag ho to sirf
     usi ko edit kijiye. Niyam save karte to ye dono cheezein mushkil ho jaatin. */
  const DAYS = [["Som", 1], ["Mangal", 2], ["Budh", 3], ["Guru", 4], ["Shukra", 5], ["Shani", 6], ["Ravi", 0]];
  const repeatBox = form.querySelector("#lcRepeatBox");
  const repeatFields = form.querySelector("#lcRepeatFields");
  const daysBox = form.querySelector("#lcDays");
  const countLabel = form.querySelector("#lcRepeatCount");
  const picked = new Set();

  DAYS.forEach(([label, dow]) => {
    const b = el("button", { type: "button", class: "chip", dataset: { dow: String(dow) } }, label);
    daysBox.appendChild(b);
  });

  /** Jitni classes banengi unki asli tareekhein. */
  function repeatDates() {
    const start = new Date(form.elements.startsAt.value);
    if (isNaN(start) || !picked.size) return [];
    const weeks = Math.max(1, Math.min(12, Number(form.elements.repeatWeeks.value) || 4));
    const out = [];
    /* Shuruaati din se ginna shuru karte hain, uske pehle wale din chhod dete
       hain — warna beeti hui tareekhon ki class ban jaati. */
    for (let d = 0; d < weeks * 7; d++) {
      const day = new Date(start);
      day.setDate(day.getDate() + d);
      if (picked.has(day.getDay())) out.push(day);
    }
    return out;
  }

  function refreshCount() {
    const n = repeatDates().length;
    countLabel.textContent = n
      ? `${n} classes banengi — ${picked.size} din/hafta`
      : "Kam se kam ek din chunein.";
  }

  on(daysBox, "click", ".chip", (e, chip) => {
    const dow = Number(chip.dataset.dow);
    picked.has(dow) ? picked.delete(dow) : picked.add(dow);
    chip.classList.toggle("is-active", picked.has(dow));
    refreshCount();
  });

  form.elements.repeatOn.addEventListener("change", (e) => {
    repeatFields.hidden = !e.target.checked;
    if (e.target.checked && !picked.size) {
      /* Shuruaat me wahi din chuna hua aata hai jis din pehli class hai —
         aksar yahi chahiye hota hai. */
      const d = new Date(form.elements.startsAt.value);
      if (!isNaN(d)) {
        picked.add(d.getDay());
        daysBox.querySelector(`[data-dow="${d.getDay()}"]`)?.classList.add("is-active");
      }
    }
    refreshCount();
  });
  form.elements.repeatWeeks.addEventListener("input", refreshCount);
  form.elements.startsAt.addEventListener("change", refreshCount);

  // Purani class edit karte waqt repeat ka koi matlab nahi
  if (!isNew) repeatBox.hidden = true;

  const validator = createValidator(form, {
    title:    [rules.required(), rules.minLen(4)],
    batchId:  [rules.required("Batch chunein.")],
    meetLink: [rules.required("Meet link daalein."), rules.meetLink()],
    startsAt: [rules.required("Time chunein.")],
    endsAt:   [rules.required("Time chunein."),
               rules.custom((v) => !v || !form.elements.startsAt.value || new Date(v) > new Date(form.elements.startsAt.value),
                 "Khatam hone ka time shuru se baad hona chahiye.")]
  });

  const saveBtn = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, isNew ? "Schedule Karein" : "Save");
  const cancelBtn = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Cancel");
  const m = openModal({ title: isNew ? "Nayi Live Class" : "Class edit karein", size: "lg", body: form, footer: [cancelBtn, saveBtn] });
  cancelBtn.addEventListener("click", () => m.close());

  saveBtn.addEventListener("click", async () => {
    if (!validator.validate()) return;
    const batch = batches.find((b) => b.id === bSel.value);
    const data = {
      title: form.elements.title.value.trim(),
      topic: form.elements.topic.value.trim(),
      batchId: bSel.value,
      batchName: batch?.name || "",
      courseId: batch?.courseId || "",
      facultyName: form.elements.facultyName.value.trim(),
      meetLink: form.elements.meetLink.value.trim(),
      startsAt: new Date(form.elements.startsAt.value),
      endsAt: new Date(form.elements.endsAt.value),
      status: CLASS_STATUS.SCHEDULED,
      recordingURL: "",
      recordingPublished: false
    };

    if (mode === "preview") {
      if (isNew) classes.unshift({ id: `tmp-${Date.now()}`, ...data });
      else Object.assign(c, data);
      m.close(); paint();
      toast.info("Preview mode: Firebase ke baad asli schedule hoga.");
      return;
    }

    try {
      const { create, update } = await import("../../firebase/db-service.js");

      if (!isNew) {
        await update(COLLECTIONS.LIVE_CLASSES, c.id, data);
        Object.assign(c, data);
        m.close(); paint();
        toast.success("Class update ho gayi.");
        return;
      }

      const repeat = form.elements.repeatOn.checked ? repeatDates() : [];
      if (form.elements.repeatOn.checked && !repeat.length) {
        return toast.error("Repeat ke liye kam se kam ek din chunein.");
      }

      if (!repeat.length) {
        const id = await create(COLLECTIONS.LIVE_CLASSES, data);
        classes.unshift({ id, ...data });
        await notifyBatch(data, 1);
        m.close(); paint();
        toast.success("Class schedule ho gayi — students ko notification chali gayi.");
        return;
      }

      /* Har tareekh ke liye alag class. Time wahi rakhte hain jo pehli class
         ka tha — sirf din badalta hai. */
      saveBtn.disabled = true;
      const s = new Date(form.elements.startsAt.value);
      const e = new Date(form.elements.endsAt.value);
      const lengthMs = e - s;
      let made = 0;

      for (const day of repeat) {
        const startsAt = new Date(day);
        startsAt.setHours(s.getHours(), s.getMinutes(), 0, 0);
        const row = { ...data, startsAt, endsAt: new Date(startsAt.getTime() + lengthMs) };
        const id = await create(COLLECTIONS.LIVE_CLASSES, row);
        classes.unshift({ id, ...row });
        made++;
      }

      await notifyBatch(data, made);
      m.close(); paint();
      toast.success(`${made} classes lag gayin — students ko notification chali gayi.`);
    } catch (err) {
      saveBtn.disabled = false;
      toast.error(err.message || "Save fail ho gaya.");
    }
  });
}

/* ---------------- boot ---------------- */
const shell = await initAdminShell({ active: "classes", title: "Live Classes" });
mode = shell.mode;

if (mode === "preview") {
  classes = DEMO_CLASSES.map((c) => ({ ...c }));
  batches = [...DEMO_BATCHES];
} else {
  const { getMany } = await import("../../firebase/db-service.js");
  [classes, batches] = await Promise.all([
    getMany(COLLECTIONS.LIVE_CLASSES, { orderBy: ["startsAt", "desc"], limit: 100, useCache: false }).catch(() => []),
    getMany(COLLECTIONS.BATCHES, { limit: 50 }).catch(() => [])
  ]);
}

const fSel = $("#lcBatch");
batches.forEach((b) => fSel.appendChild(el("option", { value: b.id }, b.name)));
fSel.addEventListener("change", () => { batchF = fSel.value; paint(); });

paint();

$("#lcNew").addEventListener("click", () => classForm(null));
on(document, "click", "[data-rec]", (e, btn) => {
  const c = classes.find((x) => x.id === btn.dataset.rec);
  if (c) recordingDialog(c);
});
on(document, "click", "[data-edit]", (e, btn) => {
  const c = classes.find((x) => x.id === btn.dataset.edit);
  if (c) classForm(c);
});
on(document, "click", "[data-cancel]", async (e, btn) => {
  const c = classes.find((x) => x.id === btn.dataset.cancel);
  if (!c) return;
  const ok = await confirmModal({ title: "Class cancel karein?", message: `"${c.title}" students ke dashboard se hat jaayegi.`, danger: true, confirmText: "Haan, cancel" });
  if (!ok) return;
  if (mode === "preview") { c.status = "cancelled"; paint(); return toast.info("Preview mode."); }
  try {
    const { update } = await import("../../firebase/db-service.js");
    await update(COLLECTIONS.LIVE_CLASSES, c.id, { status: CLASS_STATUS.CANCELLED });
    c.status = "cancelled"; paint();
    toast.success("Class cancel ho gayi.");
  } catch (err) { toast.error(err.message || "Fail ho gaya."); }
});
