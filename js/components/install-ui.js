/* ==========================================================================
   Soft Skill Zone — Install ka dikhne wala hissa
   --------------------------------------------------------------------------
   Teen roop, teeno ek hi dimaag (js/core/install.js) par chalte hain:

     installCard(mount)   homepage ka bada card — fayde ginaata hai
     installLink(mount)   student sidebar ka chhota link
     installFooter(mount) footer ka link — har public page par, login se pehle bhi

   Ek hi niyam sab par: dikhta hamesha hai, sivaay uske jab app khud
   installed roop me chal rahi ho. Browser nyota de to button seedha usi ka
   dialog kholta hai; na de to us browser ke kadam bata deta hai.

   Pehle ye card sirf tab dikhta tha jab Chrome khud nyota deta tha — aur
   Chrome kai baar chup rehta hai. Natija: student ko kabhi pata hi nahi
   chalta ki app ban sakti hai.
   ========================================================================== */

import { el, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { open as openModal } from "../core/modal.js";
import {
  installState, onInstallState, promptInstall, dismiss, cardDismissed, installSteps
} from "../core/install.js";

/* Jis browser me student hai, usi ke kadam. */
function showSteps() {
  const { title, steps } = installSteps();
  openModal({
    title: "App install karein",
    body: el("div", {},
      el("p", { style: { margin: "0 0 .9rem", fontWeight: "600" } }, title),
      el("ol", { style: { margin: 0, paddingInlineStart: "1.2rem", lineHeight: "1.85" } },
        ...steps.map((s) => el("li", {}, s))),
      el("p", { class: "field__hint", style: { marginTop: "1rem" } },
        "Icon lagne ke baad app poore parde par khulega — browser ka patta nahi dikhega.")
    ),
    size: "sm"
  });
}

/**
 * Button dabne par: browser taiyar ho to uska apna dialog, warna kadam.
 * Dialog aane se mana kar de (kabhi-kabhi Chrome bina kuchh dikhaye lautt
 * jata hai) to bhi student khaali haath na rahe — kadam dikha dete hain.
 */
async function doInstall(btn) {
  if (installState() !== "prompt") return showSteps();
  btn.disabled = true;
  const res = await promptInstall();
  btn.disabled = false;
  if (res === "unavailable") showSteps();
}

/* ------------------------------------------------------------- bada card */

export function installCard(mount) {
  if (!mount) return;

  const paint = (state) => {
    /* App khul chuki hai, ya student ne card band kar diya — bada card mat
       dikhao. Footer wala chhota link phir bhi rehta hai, taaki raasta band
       na ho jaye. */
    if (!state || cardDismissed()) { mount.hidden = true; render(mount); return; }
    mount.hidden = false;

    const btn = el("button", { class: "btn-ssz btn-primary-ssz btn-lg-ssz", type: "button" },
      state === "prompt" ? "App install karein" : "Kaise install karein");
    btn.addEventListener("click", () => doInstall(btn));

    /* .ssz-container ke bina card poore parde ki chaudai le leta tha aur
       uske button dayein kinare se bahar chale jaate the — dikhta tha par
       dabaya nahi ja sakta tha. */
    render(mount,
      el("div", { class: "ssz-container" },
        el("div", { class: "install-card" },
          el("span", { class: "install-card__icon", "aria-hidden": "true",
            html: icon("download", { size: 26 }) }),
          el("div", { class: "install-card__body" },
            el("h2", {}, "Phone par app ki tarah rakhein"),
            el("p", {},
              "Icon aapke phone par lag jayega. Khulne par browser ka patta nahi dikhega, " +
              "notes bina internet ke bhi khulenge, aur Play Store se kuchh download nahi karna."),
            el("ul", { class: "install-card__list" },
              el("li", {}, "Koi charge nahi"),
              el("li", {}, "Jagah bahut kam"),
              el("li", {}, "Update apne aap")
            )
          ),
          el("div", { class: "install-card__act" },
            btn,
            el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", type: "button",
              onclick: () => dismiss() }, "Abhi nahi")
          )
        )
      )
    );
  };

  onInstallState(paint);
}

/* --------------------------------------------------- sidebar ka chhota link */

export function installLink(mount) {
  if (!mount) return;

  const paint = (state) => {
    if (!state) { mount.hidden = true; render(mount); return; }
    mount.hidden = false;
    const btn = el("button", { class: "dash-link dash-link--install", type: "button" },
      el("span", { class: "dash-link__icon", "aria-hidden": "true", html: icon("download", { size: 20 }) }),
      el("span", { class: "dash-link__text" }, "App install karein")
    );
    btn.addEventListener("click", () => doInstall(btn));
    render(mount, btn);
  };

  onInstallState(paint);
}

/* ------------------------------------------------------------ footer link */

/**
 * Footer har public page par hai — homepage, courses, aur student ke
 * login/signup page par bhi. Isliye yahi ek jagah hai jahan se har koi,
 * login kiye bina bhi, app install kar sakta hai.
 *
 * "Abhi nahi" isse nahi chhupata — wo sirf homepage ka bada card band karta
 * hai. Raasta hamesha khula rehna chahiye.
 */
export function installFooter(mount) {
  if (!mount) return;

  const paint = (state) => {
    if (!state) { mount.hidden = true; render(mount); return; }
    mount.hidden = false;
    const btn = el("button", { class: "install-fbtn", type: "button" },
      el("span", { class: "install-fbtn__icon", "aria-hidden": "true", html: icon("download", { size: 16 }) }),
      el("span", {}, "App install karein")
    );
    btn.addEventListener("click", () => doInstall(btn));
    render(mount, btn);
  };

  onInstallState(paint);
}

/* ----------------------------------------------------- navbar ka chhota nishan */

/**
 * Navbar har page par hai — public bhi, aur student ke login/signup par bhi
 * (jahan footer hota hi nahi). Isliye desktop par yahi wo jagah hai jahan se
 * har koi app bana sakta hai, login kiye bina bhi.
 */
export function installNav(mount) {
  if (!mount) return;
  const paint = (state) => {
    if (!state) { mount.hidden = true; render(mount); return; }
    mount.hidden = false;
    const btn = el("button", {
      class: "icon-btn install-nav", type: "button",
      title: "App install karein", "aria-label": "App install karein",
      html: icon("download", { size: 18 })
    });
    btn.addEventListener("click", () => doInstall(btn));
    render(mount, btn);
  };
  onInstallState(paint);
}

/* ------------------------------------------------------- drawer ka button */

/** Phone ka menu — yahan poori chaudai ka button, dhoondhna nahi padta. */
export function installDrawer(mount) {
  if (!mount) return;
  const paint = (state) => {
    if (!state) { mount.hidden = true; render(mount); return; }
    mount.hidden = false;
    const btn = el("button", {
      class: "btn-ssz btn-secondary-ssz btn-block-ssz", type: "button"
    },
      el("span", { class: "install-fbtn__icon", "aria-hidden": "true", html: icon("download", { size: 16 }) }),
      el("span", {}, "App install karein")
    );
    btn.addEventListener("click", () => doInstall(btn));
    render(mount, btn);
  };
  onInstallState(paint);
}
