/* ==========================================================================
   Soft Skill Zone — Student: Live Classes
   JOIN LIVE CLASS opens the Google Meet link scheduled by the admin.
   ========================================================================== */

import { $, el, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatDateTime, formatTime, timeAgo, toDate } from "../core/utils.js";
import { url } from "../core/routes.js";
import { initShell } from "./shell.js";
import * as data from "./student-data.js";
import toast from "../core/toast.js";
import { DEMO_STUDENT, DEMO_CLASSES } from "./demo-data.js";

const isLive = (c) => {
  const s = toDate(c.startsAt)?.getTime(), e = toDate(c.endsAt)?.getTime();
  return s && e && s <= Date.now() && e >= Date.now() && c.status !== "cancelled";
};

function classCard(c, big = false) {
  const live = isLive(c);
  const past = toDate(c.endsAt)?.getTime() < Date.now();

  if (big) {
    return el("div", { class: "live-card" },
      el("span", { class: "live-badge" }, "Live Now"),
      el("h3", { style: { margin: ".9rem 0 .3rem", fontSize: "1.15rem" } }, c.title),
      el("p", { style: { margin: "0 0 .35rem", fontSize: ".88rem" } }, c.topic || ""),
      el("p", { style: { margin: "0 0 1.25rem", fontSize: ".82rem" } },
        `${formatTime(c.startsAt)} – ${formatTime(c.endsAt)} · ${c.facultyName || ""}`),
      el("a", {
        class: "btn-ssz btn-lg-ssz", style: { background: "#fff", color: "var(--ssz-indigo-700)" },
        href: c.meetLink, target: "_blank", rel: "noopener"
      }, "JOIN LIVE CLASS", el("span", { html: icon("externalLink", { size: 17 }) }))
    );
  }

  return el("div", { class: "card-ssz" }, el("div", { class: "card-ssz__body", style: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" } },
    el("span", {
      class: "stat-tile__icon",
      style: { background: past ? "var(--bg-surface-2)" : "var(--brand-soft)", color: past ? "var(--text-muted)" : "var(--brand)" },
      html: icon("video", { size: 22 })
    }),
    el("span", { style: { flex: 1, minWidth: "200px" } },
      el("strong", { style: { display: "block", fontSize: ".95rem" } }, c.title),
      el("span", { style: { fontSize: ".8rem", color: "var(--text-muted)" } },
        `${formatDateTime(c.startsAt)} · ${c.facultyName || ""}${c.topic ? ` · ${c.topic}` : ""}`)
    ),
    past
      /* Recording sirf tab dikhti hai jab admin ne use approve kiya ho. Sirf
         link save kar dene se student ko kuch nahi milta — warna adhoori ya
         galat recording apne aap chali jaati. */
      /* Link ab class ke record me hai hi nahi — sirf jhandi hai. Asli link
         recording wale page par alag document se aata hai, jise rules
         approve hone se pehle kisi ko dete hi nahi. `recordingURL` wali
         jaanch un purane record ke liye hai jo abhi shift nahi hue. */
      ? ((c.hasRecording || c.recordingURL) && c.recordingPublished
          /* Drive ka link seedha nahi diya jaata — Drive ke viewer me Download
             ka button saamne hota hai. Recording apne player page par chalti
             hai, jahan wo button nahi hota aur video par student ka apna
             naam-ID chalta rehta hai. */
          ? el("a", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz",
                      href: `${url("studentRecording")}?class=${encodeURIComponent(c.id)}` },
              el("span", { html: icon("video", { size: 15 }) }), " Recording dekhein")
          : el("span", { class: "badge-ssz" }, `Ended ${timeAgo(c.endsAt)}`))
      : el("a", {
          class: `btn-ssz btn-sm-ssz ${live ? "btn-primary-ssz" : "btn-secondary-ssz"}`,
          href: c.meetLink, target: "_blank", rel: "noopener"
        }, live ? "JOIN NOW" : "Meet Link")
  ));
}

function emptyBox(target, msg) {
  render($(target), el("div", { class: "card-ssz" }, el("div", { class: "card-ssz__body" },
    el("p", { style: { margin: 0, fontSize: ".88rem", color: "var(--text-muted)" } }, msg))));
}

/* ---------------- boot ---------------- */
const { user, mode } = await initShell({ active: "classes", title: "Live Classes" });

let classes;
if (mode === "preview") {
  classes = [...DEMO_CLASSES];
} else {
/* Ek bhi query mana ho jaye (rule badla ho, index thanda ho, ya account
   abhi kisi student record se juda hi na ho) to page KHAALI nahi chhodna.
   Pehle yahan `.catch` tha hi nahi, aur ye file top-level `await` par chalti
   hai — matlab reject hote hi poora module wahin ruk jaata tha aur student
   ko bilkul khaali page milta tha, bina ye jaane ki hua kya. Ab section
   khaali dikhta hai aur ek saaf sandesh chala jaata hai. */
  const student = await data.getStudent(user).catch(() => null);
  classes = student
    ? await data.getClasses(student).catch((err) => {
        console.error("[classes] load nahi hui:", err);
    toast.warning("Classes ki list abhi nahi khul payi. Agar ye baar-baar ho to institute ko bata dein — ho sakta hai aapka login abhi kisi batch se juda na ho.", { duration: 9000 });
        return [];
      })
    : [];
}

const liveNow = classes.filter(isLive);
const upcoming = classes
  .filter((c) => !isLive(c) && toDate(c.startsAt)?.getTime() > Date.now() && c.status !== "cancelled")
  .sort((a, b) => toDate(a.startsAt) - toDate(b.startsAt));
const past = classes
  .filter((c) => toDate(c.endsAt)?.getTime() < Date.now())
  .sort((a, b) => toDate(b.startsAt) - toDate(a.startsAt));

if (liveNow.length) render($("#liveNow"), classCard(liveNow[0], true));
else $("#liveNow").remove();

if (upcoming.length) render($("#upcomingList"), upcoming.map((c) => classCard(c)));
else emptyBox("#upcomingList", "Abhi koi class scheduled nahi hai. Nayi class lagte hi notification aayegi.");

/* PURANI CLASS — DAS PAR ROK DENA GALAT THA.

   Pehle yahan sirf `past.slice(0, 10)` tha aur aage kuchh nahi. Roz class
   wale batch me das ka matlab hai "pichhle do hafte" — aur exam se theek
   pehle student ko pehle module ki recording chahiye hoti hai, jo is
   khidki se kab ki bahar nikal chuki hoti. Uske paas us recording tak
   pahunchne ka koi raasta hi nahi tha, jabki wo maujood hoti thi.

   Ab das dikhte hain aur neeche "aur dikhayein" — har baar das aur. */
const PAST_STEP = 10;
let pastShown = PAST_STEP;

function paintPast() {
  if (!past.length) return emptyBox("#pastList", "Abhi tak koi class nahi hui.");

  const cards = past.slice(0, pastShown).map((c) => classCard(c));

  if (past.length > pastShown) {
    const more = el("button", {
      class: "btn-ssz btn-secondary-ssz", type: "button",
      style: { width: "100%", marginTop: ".75rem", minHeight: "44px" }
    }, `Aur dikhayein (${past.length - pastShown} aur)`);
    more.addEventListener("click", () => { pastShown += PAST_STEP; paintPast(); });
    cards.push(more);
  }

  render($("#pastList"), cards);
}

paintPast();
