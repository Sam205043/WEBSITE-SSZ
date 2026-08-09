/* ==========================================================================
   Soft Skill Zone — Admin: "Aaj ki class" wali patti
   --------------------------------------------------------------------------
   YE KYUN BANI

   Meet ka link har class ki row me tha — Live Classes page par, list ke beech
   me, ek chhote ghost button ke roop me. Yaani 8 baje class lene ke liye
   admin ko: panel kholo -> Live Classes par jao -> aaj wali row dhoondho ->
   "Meet link" dabao. Roz, class shuru hone ke theek pehle, jab sabse kam
   fursat hoti hai.

   Ab jis bhi admin page par hon, agar aaj koi class hai to wo sabse upar
   dikhti hai — aur chal rahi ho to ek bada JOIN NOW button.

   TEEN HAALAT, TEEN ROOP
     chal rahi hai   -> laal "LIVE" nishaan + JOIN NOW
     aaj hai, aage   -> kitni der baad hai, aur "Meet kholein" (pehle jaakar
                        set up karna aam baat hai)
     aaj ho chuki    -> kuch nahi. Us waqt ye patti sirf raaste me aati.

   Aaj koi class na ho to patti banti hi nahi — khaali dabba dikhane se
   accha hai kuch na dikhana.

   Ye shell se chalti hai, kisi ek page se nahi — isliye chaudah admin page
   par apne aap aa jaati hai aur badalni ho to ek hi jagah badalni hai.
   ========================================================================== */

import { $, el, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { toDate, formatTime } from "../core/utils.js";
import { url } from "../core/routes.js";
import { COLLECTIONS, CLASS_STATUS } from "../core/constants.js";

/* Class shuru hone se itni der pehle patti dikhne lagti hai. Isse zyada
   pehle dikhane par wo poore din chipki rehti aur nazar se utar jaati. */
const LEAD_MIN = 90;

const ms = (v) => toDate(v)?.getTime() || 0;

/** Wahi din hai? Tulna local (yaani Ara ke) din se hoti hai. */
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/**
 * Abhi kaun si class dikhani chahiye.
 *
 * Pehli wo jo chal rahi ho. Nahi to aaj ki agli, par tabhi jab wo LEAD_MIN
 * ke andar ho. Cancel ki hui class kabhi nahi.
 */
export function pickTodayClass(list, now = new Date()) {
  const t = now.getTime();
  const live = (list || [])
    .filter((c) => c.status !== CLASS_STATUS.CANCELLED && ms(c.startsAt) <= t && ms(c.endsAt) >= t)
    .sort((a, b) => ms(a.startsAt) - ms(b.startsAt))[0];
  if (live) return { cls: live, live: true };

  const next = (list || [])
    .filter((c) => c.status !== CLASS_STATUS.CANCELLED
      && ms(c.startsAt) > t
      && sameDay(toDate(c.startsAt), now)
      && (ms(c.startsAt) - t) <= LEAD_MIN * 60000)
    .sort((a, b) => ms(a.startsAt) - ms(b.startsAt))[0];

  return next ? { cls: next, live: false } : null;
}

function card({ cls, live }) {
  const mins = Math.max(0, Math.round((ms(cls.startsAt) - Date.now()) / 60000));
  const kab = live
    ? "Abhi chal rahi hai"
    : mins <= 1 ? "Bas shuru hone wali hai" : `${mins} minute baad · ${formatTime(cls.startsAt)}`;

  /* Meet ka link hi na ho to jhootha button dikhane ka matlab nahi — sidha
     class edit karne bhej dete hain. */
  const action = cls.meetLink
    ? el("a", {
        class: `btn-ssz btn-sm-ssz ${live ? "btn-primary-ssz" : "btn-secondary-ssz"}`,
        href: cls.meetLink, target: "_blank", rel: "noopener",
        style: { minHeight: "44px", paddingInline: "1.1rem", fontWeight: "700" }
      },
        el("span", { html: icon("video", { size: 16 }) }),
        live ? " JOIN NOW" : " Meet kholein")
    : el("a", {
        class: "btn-ssz btn-secondary-ssz btn-sm-ssz",
        href: url("adminClasses"),
        style: { minHeight: "44px" }
      }, "Meet link daalein");

  return el("div", {
    class: "card-ssz",
    style: {
      marginBottom: "1.25rem",
      borderLeft: `3px solid var(--${live ? "success" : "brand"})`
    }
  },
    el("div", {
      class: "card-ssz__body",
      style: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", padding: "1rem 1.25rem" }
    },
      el("span", { style: { flex: 1, minWidth: "220px" } },
        el("span", { style: { display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".2rem" } },
          live
            ? el("span", {
                class: "badge-ssz badge-success",
                style: { fontSize: ".62rem", letterSpacing: ".4px" }
              }, "LIVE")
            : el("span", {
                class: "badge-ssz badge-accent",
                style: { fontSize: ".62rem", letterSpacing: ".4px" }
              }, "AAJ"),
          el("strong", { style: { fontSize: ".95rem" } }, cls.title || "Class")),
        el("span", { style: { fontSize: ".78rem", color: "var(--text-muted)" } },
          `${kab}${cls.batchName ? ` · ${cls.batchName}` : ""}`)),
      action
    ));
}

/**
 * Patti ko page ke sabse upar laga deta hai. Kuch dikhane laayak na ho to
 * chup-chaap kuch nahi karta.
 *
 * @param {Array} list  classes ki list (preview mode me demo)
 */
export function paintTodayClass(list) {
  const body = $("#dashBody");
  if (!body) return;

  const old = $("#todayClass");
  if (old) old.remove();

  const pick = pickTodayClass(list);
  if (!pick) return;

  const host = el("div", { id: "todayClass" });
  body.insertBefore(host, body.firstChild);
  render(host, card(pick));
}

/**
 * Classes khud laakar patti laga deta hai. Fail ho jaye to chup — ye patti
 * ek suvidha hai, poore page ko rokne ki wajah nahi.
 *
 * Har minute dobara dekhta hai, taaki "12 minute baad" ghatta rahe aur
 * shuru hote hi apne aap JOIN NOW me badal jaye — page refresh kiye bina.
 */
export async function mountTodayClass(mode) {
  try {
    let list;
    if (mode === "preview") {
      ({ DEMO_CLASSES: list } = await import("./demo-data.js"));
      list = [...list];
    } else {
      const { getMany } = await import("../../firebase/db-service.js");
      /* AAJ SE AAGE WALI, AAGE SE PEECHHE.

         PEHLE YAHAN `desc` AUR `limit: 25` THA, AUR WAHI POORI PATTI KO
         MAAR DETA THA.

         `desc` matlab sabse door wali class pehle. Aap ek baar 4 hafte ka
         repeat lagate hain to 28 class ban jaati hain — aaj wali un 25 me
         hoti hi nahi thi, aur patti chup-chaap banni band ho jaati. Koi
         error nahi, koi khaali dabba nahi: bas nahi dikhti. 12 hafte ka
         repeat (84 class) lagane par to kabhi dikhti hi nahi.

         Ab aaj aadhi raat se aage wali class maangte hain, aur `asc` se —
         yaani sabse pehle wali sabse pehle. Aaj ki class hamesha in bees me
         sabse upar hogi, chahe aage saal bhar ka schedule bana ho.

         Filter aur sort ek hi field (`startsAt`) par hai, isliye koi
         composite index nahi chahiye. */
      const aajSubah = new Date();
      aajSubah.setHours(0, 0, 0, 0);
      list = await getMany(COLLECTIONS.LIVE_CLASSES, {
        where: [["startsAt", ">=", aajSubah]],
        orderBy: ["startsAt", "asc"], limit: 20, useCache: false
      });
    }
    paintTodayClass(list);
    setInterval(() => paintTodayClass(list), 60000);
  } catch (err) {
    console.warn("[shell] aaj ki class wali patti nahi lagi:", err?.message || err);
  }
}
