/* ==========================================================================
   Soft Skill Zone — Student Support Chatbot
   --------------------------------------------------------------------------
   Ek floating sahayak jo har page par rehta hai.

   Jawab teen tah me dhoondha jaata hai:
     1. Knowledge base  — institute ke apne data se pakka jawab (turant, muft)
     2. AI (Gemini)     — jab pehli tah ko na pata ho, aur AI chalu ho
     3. WhatsApp        — jab dono na kar sakein, insaan se baat kara do

   Yahi kram jaanbujh kar hai: fees aur tareekh jaise sawaal kabhi AI ke
   bharose nahi chhode jaate — wo hamesha asli data se aate hain.

   AWAAZ (js/chat/voice.js)

   Student mic dabakar bol sakta hai, aur sahayak bolkar jawab de sakta hai.
   Wo poora hissa alag file me hai aur tabhi utarta hai jab student mic ya
   speaker dabaye — jise likhkar poochhna hai uske data me se ek byte bhi
   nahi jaata.

   Boot: js/app.js (public pages) aur js/dashboard/shell.js (student).
   ========================================================================== */

import { $, el, on, lockScroll } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { url, asset } from "../core/routes.js";
import { escapeHtml, whatsappLink, store } from "../core/utils.js";
import { INSTITUTE } from "../config/site-data.js";
import { answer, matchStudentIntent, STARTER_CHIPS, STUDENT_CHIPS, BOT_NAME } from "./knowledge.js";
import { aiReady, askAI } from "./ai.js";

/* ==========================================================================
   Halat
   ========================================================================== */
const state = {
  open: false,
  busy: false,
  booted: false,
  loggedIn: false,
  user: null,
  ctx: {},          // student, attendance, classes... zaroorat par bharta hai
  history: [],      // { role: "user" | "bot", text }

  /* Awaaz
     speakOn  — student ne speaker chalu rakha hai (agli baar bhi yaad rahega)
     viaVoice — abhi wala sawaal mic se aaya tha, isliye jawab bolna hai */
  speakOn: false,
  viaVoice: false
};

let nodes = {};

/* Awaaz wali file — sirf pehli baar mangwaate hain. */
let voicePromise = null;
const voice = () => (voicePromise ||= import("./voice.js"));

/* Mic hai ya nahi, ye poochhne ke liye file utaarne ki zaroorat nahi. */
const MIC_OK = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

/* ==========================================================================
   Chhota markup — **bold** aur nayi line, aur kuch nahi
   ==========================================================================
   Pehle poora escape karte hain, uske baad sirf apne do nishaan wapas laate
   hain. Isliye AI ya kisi bhi data se aaya HTML kabhi chalta nahi. */
function richText(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

/* ==========================================================================
   Message bubbles
   ========================================================================== */
function bubble(role, text) {
  return el("div", { class: `chat-msg chat-msg--${role}` },
    role === "bot" ? el("span", { class: "chat-msg__avatar", html: BOT_ICON }) : null,
    el("div", { class: "chat-msg__body", html: richText(text) })
  );
}

function typingBubble() {
  return el("div", { class: "chat-msg chat-msg--bot", id: "chatTyping" },
    el("span", { class: "chat-msg__avatar", html: BOT_ICON }),
    el("div", { class: "chat-msg__body chat-typing" },
      el("i"), el("i"), el("i")
    )
  );
}

function scrollDown() {
  const box = nodes.body;
  if (box) requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
}

function pushBot(text, extras = {}) {
  const wrap = el("div", { class: "chat-turn" }, bubble("bot", text));

  if (extras.link) {
    wrap.appendChild(el("a", { class: "chat-action", href: url(extras.link.route) },
      extras.link.label, el("span", { html: icon("chevronRight", { size: 14 }) })));
  }
  if (extras.whatsapp) {
    wrap.appendChild(el("a", {
      class: "chat-action chat-action--wa", target: "_blank", rel: "noopener",
      href: whatsappLink(INSTITUTE.whatsapp || INSTITUTE.phone, "Namaste, mujhe jaankari chahiye.")
    }, el("span", { html: icon("whatsapp", { size: 15 }) }), " WhatsApp par baat karein"));
  }

  nodes.body.appendChild(wrap);
  state.history.push({ role: "bot", text });
  if (extras.chips) renderChips(extras.chips);
  scrollDown();

  /* Bolna sirf do haalat me: speaker chalu hai, ya sawaal hi bolkar poochha
     gaya tha. Bina maange awaaz nikalna — khaas kar class ya office me —
     bharosa todta hai, isliye khamoshi hi default hai. */
  if (state.speakOn || state.viaVoice) sayIt(text);
}

/* Jawab bolwana. Nakaam ho to chup — likha hua jawab saamne hai hi. */
async function sayIt(text) {
  try {
    const v = await voice();
    setSpeakingUI(true);
    await v.speak(text);
  } catch (err) {
    console.warn("[chat] awaaz nahi aayi", err);
  } finally {
    setSpeakingUI(false);
  }
}

function setMicUI(on) {
  nodes.mic?.classList.toggle("is-live", on);
  nodes.mic?.setAttribute("aria-label", on ? "Sunna band karein" : "Bolkar poochhein");
}

function setSpeakingUI(on) {
  nodes.speaker?.classList.toggle("is-live", on);
  if (nodes.speaker) {
    nodes.speaker.setAttribute(
      "aria-label",
      on ? "Bolna rokein" : state.speakOn ? "Awaaz band karein" : "Awaaz chalu karein"
    );
  }
}

function pushUser(text) {
  nodes.body.appendChild(el("div", { class: "chat-turn" }, bubble("user", text)));
  state.history.push({ role: "user", text });
  scrollDown();
}

function renderChips(list) {
  if (!list || !list.length) { nodes.chips.replaceChildren(); return; }
  nodes.chips.replaceChildren(
    ...list.map((c) => el("button", { class: "chat-chip", type: "button", "data-chip": c }, c))
  );
}

/* ==========================================================================
   Student ka data — sirf jab sach me maanga jaye
   ==========================================================================
   Har sawaal par poora dashboard load karna student ke data pack ki barbaadi
   hai. Isliye intent batata hai ki kya chahiye, aur wahi ek baar aata hai. */
async function ensureContext(needs = []) {
  if (!state.loggedIn || !state.user) return;

  const data = await import("../dashboard/student-data.js");

  if (!state.ctx.student) {
    try { state.ctx.student = await data.getStudent(state.user); }
    catch { state.ctx.student = null; }
  }
  const s = state.ctx.student;
  if (!s) return;

  const jobs = [];
  if (needs.includes("attendance") && !state.ctx.attendance)
    jobs.push(data.getAttendance(s).then((r) => { state.ctx.attendance = r; }).catch(() => {}));
  if (needs.includes("classes") && !state.ctx.classes)
    jobs.push(data.getClasses(s).then((r) => { state.ctx.classes = r; }).catch(() => {}));
  if (needs.includes("assignments") && !state.ctx.assignments)
    jobs.push(data.getAssignments(s).then((r) => { state.ctx.assignments = r; }).catch(() => {}));
  if (needs.includes("submissions") && !state.ctx.submissions)
    jobs.push(data.getSubmissions(s).then((r) => { state.ctx.submissions = r; }).catch(() => {}));

  await Promise.all(jobs);
}

/* ==========================================================================
   Sawaal ka jawab dhoondhna — teen tah
   ========================================================================== */
async function respond(question) {
  if (state.busy) return;
  state.busy = true;
  nodes.chips.replaceChildren();

  const typing = typingBubble();
  nodes.body.appendChild(typing);
  scrollDown();

  try {
    /* Tah 0 — personal sawaal ke liye pehle data la lo. */
    const personal = matchStudentIntent(question);
    if (personal && state.loggedIn) await ensureContext(personal.needs || []);

    /* Tah 1 — knowledge base. */
    const kb = await answer(question, { ...state.ctx, loggedIn: state.loggedIn });
    if (kb) {
      typing.remove();
      pushBot(kb.text, kb);
      return;
    }

    /* Tah 2 — AI, agar chalu ho. */
    if (aiReady()) {
      const ai = await askAI(question, state.history);
      if (ai) {
        typing.remove();
        pushBot(ai, { chips: state.loggedIn ? STUDENT_CHIPS.slice(0, 2) : STARTER_CHIPS.slice(0, 2) });
        return;
      }
    }

    /* Tah 3 — insaan. */
    typing.remove();
    pushBot(
      "Is baare me main pakka jawab nahi de sakta, aur andaaza lagana theek nahi hoga.\n\nInstitute se seedhe poochh lijiye — turant jawab mil jaayega.",
      { whatsapp: true, chips: STARTER_CHIPS.slice(0, 3) }
    );
  } catch (err) {
    console.warn("[chat]", err);
    typing.remove();
    pushBot("Kuch gadbad ho gayi. Ek baar phir se poochh kar dekhiye, ya seedhe WhatsApp kar lijiye.", { whatsapp: true });
  } finally {
    state.busy = false;
    state.viaVoice = false;     // agla sawaal likha hua ho sakta hai
  }
}

/* ==========================================================================
   Kholna / band karna
   ========================================================================== */
function openPanel() {
  if (state.open) return;
  state.open = true;
  nodes.panel.hidden = false;
  nodes.fab.setAttribute("aria-expanded", "true");
  nodes.fab.classList.add("is-open");
  requestAnimationFrame(() => nodes.panel.classList.add("is-open"));
  if (window.innerWidth < 576) lockScroll(true);

  if (!state.booted) {
    state.booted = true;
    greet();
  }
  setTimeout(() => nodes.input?.focus({ preventScroll: true }), 260);
  store.set("ssz.chat.seen", "1");
  nodes.dot?.remove();
}

function closePanel() {
  if (!state.open) return;
  state.open = false;

  /* Panel band hote hi chup ho jao — warna student page chhodkar aage badh
     jaata hai aur awaaz peechhe bajti rehti hai. */
  voicePromise?.then((v) => { v.stopSpeaking(); v.stopListening(); }).catch(() => {});
  setMicUI(false);
  setSpeakingUI(false);

  nodes.panel.classList.remove("is-open");
  nodes.fab.setAttribute("aria-expanded", "false");
  nodes.fab.classList.remove("is-open");
  lockScroll(false);
  setTimeout(() => { if (!state.open) nodes.panel.hidden = true; }, 240);
}

function greet() {
  const name = state.ctx.student?.fullName || state.user?.name || "";
  const first = name ? name.split(" ")[0] : "";
  pushBot(
    state.loggedIn
      ? `Namaste${first ? ` ${first}` : ""}! Main ${BOT_NAME} hoon.\n\nApni fees, attendance, class ya assignment — jo dekhna ho poochh lijiye.`
      : `Namaste! Main ${BOT_NAME} hoon, ${INSTITUTE.shortName} ka sahayak.\n\nCourse, fees, admission ya timing — jo jaanna ho poochh lijiye.`,
    { chips: state.loggedIn ? STUDENT_CHIPS : STARTER_CHIPS }
  );
}

/* ==========================================================================
   DOM
   ========================================================================== */
const BOT_ICON = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="3" y="8" width="18" height="12" rx="3"></rect>
  <path d="M12 8V5M9 14h.01M15 14h.01M2 13h1M21 13h1"></path><circle cx="12" cy="4" r="1.4"></circle>
</svg>`;

/* Stylesheet yahin se lagta hai, har HTML file me <link> jodne ke bajaye —
   40+ pages me ek line jodna aur uska bhoolna dono se bachte hain. Panel
   shuru me hidden hai, isliye style aane se pehle kuch bhagta hua nahi
   dikhta. */
function injectStyles() {
  if ($('link[data-ssz-chat-css]')) return;
  document.head.appendChild(el("link", {
    rel: "stylesheet", href: asset("css/chat.css"), "data-ssz-chat-css": "true"
  }));
}

function build() {
  injectStyles();

  const fab = el("button", {
    class: "fab fab--chat", type: "button",
    "aria-label": `${BOT_NAME} se poochhein`, "aria-expanded": "false",
    html: `<span class="fab__chat">${BOT_ICON}</span><span class="fab__x">${icon("close", { size: 20 })}</span>`
  });

  /* Pehli baar aane wale ko ek chhota nishaan — baar-baar nahi, sirf jab tak
     usne chatbot khola na ho. Popup khud se kholna dakhal-andaazi hai. */
  let dot = null;
  if (!store.get("ssz.chat.seen")) {
    dot = el("span", { class: "fab__dot", "aria-hidden": "true" });
    fab.appendChild(dot);
  }

  const body = el("div", { class: "chat-body", id: "chatBody", role: "log", "aria-live": "polite" });
  const chips = el("div", { class: "chat-chips", id: "chatChips" });
  const input = el("input", {
    class: "chat-input", type: "text", id: "chatInput", autocomplete: "off",
    placeholder: "Apna sawaal likhiye…", "aria-label": "Sawaal likhiye"
  });

  /* Mic sirf wahan jahan chalta hai. Na chalne wale browser me dabaane par
     "kuch nahi hua" dikhna, button hi na hone se zyada bura hai. */
  const mic = MIC_OK ? el("button", {
    class: "chat-mic", type: "button", "aria-label": "Bolkar poochhein",
    html: icon("mic", { size: 18 })
  }) : null;

  const form = el("form", { class: "chat-form", autocomplete: "off" },
    input,
    mic,
    el("button", { class: "chat-send", type: "submit", "aria-label": "Bhejein", html: icon("arrowRight", { size: 18 }) })
  );

  state.speakOn = store.get("ssz.chat.voice", false) === true;
  const speaker = el("button", {
    class: `chat-head__btn${state.speakOn ? " is-on" : ""}`, type: "button",
    "aria-label": state.speakOn ? "Awaaz band karein" : "Awaaz chalu karein",
    html: icon(state.speakOn ? "volume" : "volumeOff", { size: 17 })
  });

  const panel = el("div", {
    class: "chat-panel", id: "sszChat", hidden: true,
    role: "dialog", "aria-label": `${BOT_NAME} — ${INSTITUTE.shortName} sahayak`, "aria-modal": "false"
  },
    el("div", { class: "chat-head" },
      el("span", { class: "chat-head__avatar", html: BOT_ICON }),
      el("span", { class: "chat-head__meta" },
        el("strong", {}, BOT_NAME),
        el("span", {}, `${INSTITUTE.shortName} ka sahayak · turant jawab`)
      ),
      speaker,
      el("button", { class: "chat-head__close", type: "button", "aria-label": "Band karein", html: icon("close", { size: 18 }) })
    ),
    body,
    chips,
    form,
    el("p", { class: "chat-note" }, `${BOT_NAME} ek automatic sahayak hai. Zaroori faisle institute se confirm kar lein.`)
  );

  /* WhatsApp/top ke saath hi baithe, unke upar. */
  const stack = $(".fab-stack");
  if (stack) stack.insertBefore(fab, stack.firstChild);
  else {
    const own = el("div", { class: "fab-stack no-print" }, fab);
    document.body.appendChild(own);
  }
  document.body.appendChild(panel);

  nodes = { fab, panel, body, chips, input, form, dot, mic, speaker };

  /* Taar jodna */
  fab.addEventListener("click", () => (state.open ? closePanel() : openPanel()));
  panel.querySelector(".chat-head__close").addEventListener("click", closePanel);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q || state.busy) return;
    input.value = "";
    pushUser(q);
    respond(q);
  });

  on(chips, "click", ".chat-chip", function () {
    const q = this.dataset.chip;
    pushUser(q);
    respond(q);
  });

  /* ---- Awaaz ka speaker ----
     Bolte waqt dabaya to pehle rokna hai, chalu/band karna nahi — student
     ka pehla iraada hamesha "chup ho jao" hota hai. */
  speaker.addEventListener("click", async () => {
    const v = await voice().catch(() => null);
    if (v?.isSpeaking()) { v.stopSpeaking(); setSpeakingUI(false); return; }

    state.speakOn = !state.speakOn;
    store.set("ssz.chat.voice", state.speakOn);
    speaker.classList.toggle("is-on", state.speakOn);
    speaker.innerHTML = icon(state.speakOn ? "volume" : "volumeOff", { size: 17 });
    setSpeakingUI(false);

    /* Chalu karte hi aakhri jawab bol do — warna student ko pata hi nahi
       chalta ki awaaz kaisi hai, aur ye click hi wo ijaazat hai jiska
       browser autoplay ke liye intezaar karta hai. */
    if (state.speakOn) {
      const last = [...state.history].reverse().find((m) => m.role === "bot");
      if (last) sayIt(last.text);
    }
  });

  /* ---- Mic ---- */
  mic?.addEventListener("click", async () => {
    const v = await voice().catch(() => null);
    if (!v) return;

    if (v.isListening()) { v.stopListening(); return; }

    v.stopSpeaking();          // apni hi awaaz sunkar mic uljhta hai
    setSpeakingUI(false);

    const before = input.placeholder;
    setMicUI(true);
    input.placeholder = "Suno raha hoon… boliye";

    v.startListening({
      onPartial: (t) => { input.value = t; },
      onFinal: (q) => {
        input.value = "";
        state.viaVoice = true;   // is jawab ko bolkar dena hai
        pushUser(q);
        respond(q);
      },
      onError: (e) => {
        input.placeholder = e === "not-allowed"
          ? "Mic ki ijaazat nahi mili — browser settings me dein"
          : e === "no-speech" ? "Kuch sunai nahi diya — dobara boliye"
          : "Mic nahi chala — likhkar poochh lijiye";
      },
      onEnd: () => {
        setMicUI(false);
        setTimeout(() => { if (!v.isListening()) input.placeholder = before; }, 2600);
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.open) closePanel();
  });
}

/* ==========================================================================
   Boot
   ========================================================================== */
let started = false;

/**
 * Chatbot chaalu karein.
 * @param {object} opts
 * @param {object} [opts.user]  dashboard pehle se user jaanta hai — dobara
 *                              Firebase se poochhne ki zaroorat nahi
 */
export async function initChat(opts = {}) {
  if (started) return;
  started = true;

  build();

  if (opts.user) {
    state.loggedIn = true;
    state.user = opts.user;
    return;
  }

  /* Public pages: auth ka pata lagne par chip badal dete hain. Firebase load
     na ho (offline tools page) to chatbot aam mode me chalta rehta hai. */
  try {
    const { onUserChanged } = await import("../../firebase/auth-service.js");
    onUserChanged((user) => {
      const was = state.loggedIn;
      state.loggedIn = !!user && user.role === "student";
      state.user = state.loggedIn ? user : null;
      if (!state.loggedIn) state.ctx = {};
      if (state.open && state.booted && was !== state.loggedIn && state.history.length <= 1) {
        renderChips(state.loggedIn ? STUDENT_CHIPS : STARTER_CHIPS);
      }
    });
  } catch { /* Firebase nahi hai — chatbot phir bhi kaam karega */ }
}

export default { initChat };
