/* ==========================================================================
   Soft Skill Zone — Install ka dikhne wala hissa
   --------------------------------------------------------------------------
   Do roop, dono ek hi dimaag (js/core/install.js) par chalte hain:

     installCard(mount)   homepage ka bada card — fayde ginaata hai
     installLink(mount)   student sidebar ka chhota link

   Dono apne aap gayab ho jaate hain jab install ho chuka ho, ya student ne
   band kar diya ho, ya browser me suvidha hi na ho. Isliye jodne wale page
   ko kuchh sochna nahi padta — bas jagah de deta hai.
   ========================================================================== */

import { el, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { open as openModal } from "../core/modal.js";
import { installState, onInstallState, promptInstall, dismiss, iosSteps } from "../core/install.js";

/* iPhone walon ke liye kadam — button ke bajaye samjhaish. */
function showIOSHelp() {
  const { title, steps } = iosSteps();
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

async function doInstall(btn) {
  if (installState() === "ios") return showIOSHelp();
  const before = btn.textContent;
  btn.disabled = true;
  const res = await promptInstall();
  btn.disabled = false;
  btn.textContent = before;
  if (res === "unavailable") showIOSHelp();
}

/* ------------------------------------------------------------- bada card */

export function installCard(mount) {
  if (!mount) return;

  const paint = (state) => {
    if (!state) { mount.hidden = true; render(mount); return; }
    mount.hidden = false;

    const btn = el("button", { class: "btn-ssz btn-primary-ssz btn-lg-ssz", type: "button" },
      state === "ios" ? "Kaise install karein" : "App install karein");
    btn.addEventListener("click", () => doInstall(btn));

    render(mount,
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
