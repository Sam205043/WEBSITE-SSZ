/* ==========================================================================
   Soft Skill Zone — Excel Error Decoder
   --------------------------------------------------------------------------
   Cell me jo laal-sa kuchh dikh raha hai, wo kya hai, kyun aaya aur kaise
   theek hoga — ek jagah, Hinglish me.

   Har error ke saath ek se zyada wajah di gayi hai, aur wajahen us kram me
   hain jis kram me lab me sach me milti hain. #N/A ki pehli wajah "value
   hai hi nahi" nahi, "chhupa hua space" hai — kyunki asli zindagi me wahi
   sabse zyada hota hai.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { EXCEL_ERRORS, findError } from "../config/excel-error-bank.js";

let query = "";
let openCode = EXCEL_ERRORS[0].code;

/* ---------------- Ek error ka card ---------------- */
function errorCard(e) {
  const isOpen = e.code === openCode;

  const head = el("button", {
    class: `xe-head${isOpen ? " is-open" : ""}`,
    type: "button",
    dataset: { code: e.code },
    "aria-expanded": isOpen ? "true" : "false"
  },
    el("code", { class: "xe-code" }, e.code),
    el("span", { class: "xe-head__text" },
      el("strong", {}, e.name),
      el("span", { class: "xe-head__one" }, e.one)),
    el("span", { class: "xe-head__arrow", html: icon("chevronDown", { size: 18 }) })
  );

  const body = el("div", { class: "xe-body", hidden: !isOpen },
    e.demo ? el("pre", { class: "xe-demo" }, e.demo) : null,
    el("ol", { class: "xe-why" }, e.why.map((w) =>
      el("li", {},
        el("p", { class: "xe-why__cause" }, w.cause),
        el("p", { class: "xe-why__fix" },
          el("span", { class: "xe-why__tag" }, "Ilaaj"),
          w.fix))
    ))
  );

  return el("div", { class: `xe-item${isOpen ? " is-open" : ""}` }, head, body);
}

/* ---------------- List ---------------- */
function paint() {
  const q = query.trim().toLowerCase();
  const list = !q ? EXCEL_ERRORS : EXCEL_ERRORS.filter((e) =>
    e.code.toLowerCase().includes(q) ||
    e.name.toLowerCase().includes(q) ||
    e.one.toLowerCase().includes(q) ||
    e.tags.some((t) => t.includes(q)) ||
    e.why.some((w) => w.cause.toLowerCase().includes(q) || w.fix.toLowerCase().includes(q))
  );

  if (!list.length) {
    return render($("#xeList"),
      el("div", { class: "empty-state" },
        el("div", { class: "empty-state__icon", html: icon("search", { size: 28 }) }),
        el("h2", {}, "Kuchh nahi mila"),
        el("p", {}, `"${query}" se milta koi error nahi mila. Cell me jo bilkul likha hai wahi type kar dekhein — jaise #N/A.`)));
  }

  /* Dhundhte waqt sab khol dena theek rehta hai — warna student ko har
     card alag se kholna padta hai aur jawab dikhta hi nahi. */
  if (q && list.length) openCode = list[0].code;

  render($("#xeList"), list.map(errorCard));
}

/* ---------------- Boot ---------------- */
onReady(() => {
  /* Upar ke chhote button — seedhe us error par le jaate hain */
  render($("#xeQuick"), EXCEL_ERRORS.slice(0, 8).map((e) =>
    el("button", { type: "button", class: "chip", dataset: { jump: e.code } }, e.code)));

  paint();

  $("#xeSearch").addEventListener("input", (e) => {
    query = e.target.value;
    paint();
  });

  on($("#xeQuick"), "click", ".chip", (e, chip) => {
    openCode = chip.dataset.jump;
    query = "";
    $("#xeSearch").value = "";
    paint();
    $("#xeList").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  on($("#xeList"), "click", ".xe-head", (e, btn) => {
    /* Dobara dabane par band ho jaata hai — ek waqt me ek hi khula rahe,
       taaki phone par scroll chhota rahe. */
    openCode = openCode === btn.dataset.code ? "" : btn.dataset.code;
    paint();
  });

  /* Formula/error paste karke seedhe jawab tak pahunchna */
  $("#xeGuess").addEventListener("click", () => {
    const hit = findError($("#xeSearch").value);
    if (!hit) return;
    openCode = hit.code;
    query = "";
    $("#xeSearch").value = "";
    paint();
  });
});
