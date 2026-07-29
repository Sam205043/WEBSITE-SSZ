/* ==========================================================================
   Soft Skill Zone — Free Tools hub
   ========================================================================== */

import { $, el, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { url } from "../core/routes.js";
import { TOOLS } from "../config/site-data.js";

onReady(() => {
  render($("#toolGrid"), TOOLS.map((t, i) =>
    el("div", { "data-reveal": "up", "data-reveal-delay": String((i % 4) * 70) },
      el("a", { class: "tool-card", href: url(t.route) },
        el("span", { class: "tool-card__icon", style: { background: t.color }, html: icon(t.icon, { size: 23 }) }),
        el("h3", {}, t.title),
        el("p", {}, t.desc),
        el("span", { class: "tool-card__go" }, "Kholein", el("span", { html: icon("arrowRight", { size: 15 }) }))
      )
    )
  ));
  document.dispatchEvent(new CustomEvent("ssz:content-rendered", { detail: { scope: document } }));
});
