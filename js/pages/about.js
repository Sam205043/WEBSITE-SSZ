/* ==========================================================================
   Soft Skill Zone — About page
   ========================================================================== */

import { $, el, onReady, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { ABOUT, STATS } from "../config/site-data.js";

onReady(() => {
  render($("#aboutStory"),
    el("p", { style: { fontSize: "var(--fs-md)", marginBottom: "1rem" } }, ABOUT.intro),
    ...ABOUT.body.map((t) => el("p", {}, t))
  );

  $("#aboutMission").textContent = ABOUT.mission;
  $("#aboutVision").textContent = ABOUT.vision;

  render($("#statsBand"), STATS.map((s) =>
    el("div", { class: "stats-band__cell" },
      el("div", { class: "stats-band__icon", html: icon(s.icon, { size: 20 }) }),
      el("div", { class: "stats-band__value", dataset: { count: String(s.value), countSuffix: s.suffix } }, "0"),
      el("div", { class: "stats-band__label" }, s.label)
    )
  ));

  render($("#valueGrid"), ABOUT.values.map((v, i) =>
    el("div", { "data-reveal": "up", "data-reveal-delay": String(i * 80) },
      el("div", { class: "value-card" },
        el("div", { class: "value-card__icon", html: icon(v.icon, { size: 21 }) }),
        el("div", {}, el("h3", {}, v.title), el("p", {}, v.desc))
      )
    )
  ));

  render($("#timeline"), ABOUT.milestones.map((m, i) =>
    el("div", { class: "timeline__item", "data-reveal": "up", "data-reveal-delay": String(i * 90) },
      el("span", { class: "timeline__dot" }),
      el("span", { class: "timeline__year" }, m.year),
      el("h3", {}, m.title),
      el("p", {}, m.desc)
    )
  ));

  document.dispatchEvent(new CustomEvent("ssz:content-rendered", { detail: { scope: document } }));
});
