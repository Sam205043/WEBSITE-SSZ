/* ==========================================================================
   Soft Skill Zone — Student: Certificates
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatDate, copyToClipboard } from "../core/utils.js";
import { url } from "../core/routes.js";
import { initShell } from "./shell.js";
import * as data from "./student-data.js";
import { DEMO_CERTIFICATES } from "./demo-data.js";
import toast from "../core/toast.js";

const shell = await initShell({ active: "certificates", title: "Certificates" });

let certs;
if (shell.mode === "preview") {
  certs = [...DEMO_CERTIFICATES];
} else {
/* Ek bhi query mana ho jaye (rule badla ho, index thanda ho, ya account
   abhi kisi student record se juda hi na ho) to page KHAALI nahi chhodna.
   Ye file top-level `await` par chalti hai — matlab reject hote hi poora
   module wahin ruk jaata tha aur student ko bilkul khaali page milta tha,
   bina ye jaane ki hua kya. Ab list khaali dikhti hai aur ek saaf sandesh
   chala jaata hai. */
  const student = await data.getStudent(shell.user).catch(() => null);
  certs = student
    ? await data.getCertificates(student).catch((err) => {
        console.error("[certificates] load nahi hue:", err);
        toast.warning("Certificate ki list abhi nahi khul payi. Agar ye baar-baar ho to institute ko bata dein.", { duration: 9000 });
        return [];
      })
    : [];
}

function card(c) {
  return el("div", { class: "card-ssz has-accent is-hoverable" }, el("div", { class: "card-ssz__body" },
    el("div", { style: { display: "flex", gap: "1rem", alignItems: "flex-start", marginBottom: "1rem" } },
      el("span", { class: "stat-tile__icon", style: { background: "var(--warning-soft)", color: "var(--warning)" }, html: icon("award", { size: 22 }) }),
      el("span", {},
        el("strong", { style: { display: "block", fontSize: ".95rem" } }, c.courseName),
        el("span", { style: { fontSize: ".8rem", color: "var(--text-muted)" } },
          `${c.certificateNo} · ${formatDate(c.issueDate)}${c.grade ? ` · Grade ${c.grade}` : ""}`)
      )
    ),
    el("div", { class: "cluster" },
      c.certificateURL
        ? el("a", { class: "btn-ssz btn-primary-ssz btn-sm-ssz", href: c.certificateURL, target: "_blank", rel: "noopener" },
            el("span", { html: icon("download", { size: 16 }) }), "Download")
        : el("span", { class: "badge-ssz badge-warning" }, "PDF jald milega"),
      el("a", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", href: url("verify", { code: c.verifyCode }) }, "Verify page"),
      el("button", { class: "btn-ssz btn-ghost-ssz btn-sm-ssz", type: "button", dataset: { copy: c.verifyCode } },
        "Code copy karein")
    )
  ));
}

if (!certs.length) {
  render($("#certList"), el("div", { class: "empty-state", style: { gridColumn: "1/-1" } },
    el("div", { class: "empty-state__icon", html: icon("award", { size: 32 }) }),
    el("h2", {}, "Abhi koi certificate nahi"),
    el("p", {}, "Course aur final assessment complete hone par certificate yahan aa jaayega.")
  ));
} else {
  render($("#certList"), certs.map(card));
}

on($("#certList"), "click", "[data-copy]", async (e, btn) => {
  const ok = await copyToClipboard(btn.dataset.copy);
  ok ? toast.success(`Code copy ho gaya: ${btn.dataset.copy}`) : toast.error("Copy nahi ho paya.");
});
