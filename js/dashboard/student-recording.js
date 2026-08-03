/* ==========================================================================
   Soft Skill Zone — Student: Class recording player
   --------------------------------------------------------------------------
   YE PAGE KYUN BANA

   Pehle "Recording dekhein" seedha Google Drive ka link kholta tha. Drive
   apne viewer me ek bada **Download** button dikhata hai — yaani ek click
   me poori class kisi ki bhi ho jaati thi, aur wo aage kahin bhi ghoom
   sakti thi.

   Ab recording yahin chalti hai. Drive ka `/preview` roop iframe me lagta
   hai, jisme Download ka button hota hi nahi. Link student ko dikhta bhi
   nahi.

   EK BAAT SAAF RAKHNI CHAHIYE

   Ye download "mushkil" karta hai, "namumkin" nahi. Jo video phone par chal
   raha hai wo phone tak pahunch hi chuka hai, aur screen recording browser
   ke bas me hai hi nahi. Isliye doosra pehra watermark hai: student ka apna
   naam aur ID video ke upar dheere-dheere ghoomte rehte hain. Copy rokti
   nahi — par jo leak karega, uski apni pehchaan us recording par likhi
   hogi. Asli asar isi ka hota hai.

   Teesra pehra: recording sirf usi batch ke student ko dikhti hai. Kisi aur
   batch ka id URL me daal dene se kuch nahi milta.
   ========================================================================== */

import { $, el, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { formatDateTime } from "../core/utils.js";
import { param, url } from "../core/routes.js";
import { COLLECTIONS } from "../core/constants.js";
import { initShell } from "./shell.js";
import * as data from "./student-data.js";

/* Drive ke link kai roop me aate hain — rclone `/view?usp=drivesdk` deta
   hai, haath se copy karne par kabhi `open?id=` bhi aa jaata hai. Teeno se
   file id nikal lete hain. */
function driveFileId(link) {
  const s = String(link || "");
  return (
    s.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/)?.[1] ||
    s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/)?.[1] ||
    ""
  );
}

function box(...kids) {
  return el("div", { class: "card-ssz" }, el("div", { class: "card-ssz__body" }, ...kids));
}

function message(title, text, backHref) {
  render($("#recBody"), box(
    el("h2", { style: { margin: "0 0 .4rem", fontSize: "1.05rem" } }, title),
    el("p", { style: { margin: "0 0 1.1rem", fontSize: ".88rem", color: "var(--text-muted)" } }, text),
    el("a", { class: "btn-ssz btn-secondary-ssz", href: backHref }, "Live Classes par wapas")
  ));
}

/* --------------------------------------------------------------------------
   Watermark

   Halka rakha gaya hai — padhne me rukawat na bane, par screenshot ya screen
   recording me saaf dikh jaye. Har 9 second par jagah badalta hai, taaki
   koi ek hi kone ko kaat kar hata na de.

   `pointer-events: none` zaroori hai: warna ye parat video ke play/pause par
   baith jaati aur student kuch dabata hi nahi.
   -------------------------------------------------------------------------- */
function watermark(student) {
  const tag = el("div", {
    style: {
      position: "absolute", inset: "0", pointerEvents: "none",
      overflow: "hidden", zIndex: "2"
    }
  });
  const line = el("div", {
    style: {
      position: "absolute", left: "8%", top: "12%",
      color: "rgba(255,255,255,.28)", fontSize: "clamp(.7rem, 1.6vw, .9rem)",
      fontWeight: "600", letterSpacing: ".4px", whiteSpace: "nowrap",
      textShadow: "0 1px 3px rgba(0,0,0,.45)",
      transition: "left .8s ease, top .8s ease"
    }
  }, `${student.fullName || "Student"} · ${student.studentId || ""}`);
  tag.appendChild(line);

  const move = () => {
    line.style.left = `${6 + Math.random() * 55}%`;
    line.style.top = `${8 + Math.random() * 74}%`;
  };
  setInterval(move, 9000);
  return tag;
}

function player(cls, student) {
  const id = driveFileId(cls.recordingURL);

  /* Drive ka link na ho (jaise koi YouTube link daal diya ho) to zabardasti
     nahi karte — seedha khol dete hain, warna student ko kuch bhi nahi
     milega. */
  if (!id) {
    return box(
      el("p", { style: { margin: "0 0 1rem", fontSize: ".88rem" } },
        "Is recording ka link Google Drive ka nahi hai, isliye yahan andar nahi chal sakta."),
      el("a", {
        class: "btn-ssz btn-primary-ssz", href: cls.recordingURL,
        target: "_blank", rel: "noopener"
      }, "Recording kholein", el("span", { html: icon("externalLink", { size: 16 }) }))
    );
  }

  const frame = el("div", {
    style: {
      position: "relative", width: "100%", aspectRatio: "16 / 9",
      background: "#000", borderRadius: "var(--r-md)", overflow: "hidden"
    }
  },
    el("iframe", {
      src: `https://drive.google.com/file/d/${id}/preview`,
      allow: "autoplay; fullscreen",
      allowfullscreen: "",
      referrerpolicy: "no-referrer",
      style: { width: "100%", height: "100%", border: "0", display: "block", position: "relative", zIndex: "1" }
    }),
    watermark(student)
  );

  const wrap = el("div", {});
  wrap.appendChild(el("h2", { style: { margin: "0 0 .3rem", fontSize: "1.1rem" } }, cls.title || "Class recording"));
  wrap.appendChild(el("p", { style: { margin: "0 0 1rem", fontSize: ".84rem", color: "var(--text-muted)" } },
    `${formatDateTime(cls.startsAt)}${cls.facultyName ? ` · ${cls.facultyName}` : ""}${cls.topic ? ` · ${cls.topic}` : ""}`));
  wrap.appendChild(frame);
  wrap.appendChild(el("p", { style: { margin: "1rem 0 0", fontSize: ".78rem", color: "var(--text-muted)" } },
    "Ye recording sirf aapke batch ke liye hai. Ise kisi ke saath share na karein — " +
    "video par aapka apna naam aur Student ID darj hai."));
  wrap.appendChild(el("div", { class: "cluster", style: { marginTop: "1.25rem" } },
    el("a", { class: "btn-ssz btn-secondary-ssz", href: url("studentClasses") }, "Live Classes par wapas")));
  return wrap;
}

/* ---------------- boot ---------------- */
const { user, mode } = await initShell({ active: "classes", title: "Class Recording" });
const back = url("studentClasses");
const classId = param("class", "");

if (mode === "preview") {
  message("Preview mode", "Firebase connect hone ke baad recording yahan chalegi.", back);
} else if (!classId) {
  message("Class nahi mili", "Recording ka link adhoora hai. Live Classes se dobara kholein.", back);
} else {
  const student = await data.getStudent(user);
  const { getOne } = await import("../../firebase/db-service.js");
  const cls = await getOne(COLLECTIONS.LIVE_CLASSES, classId, { useCache: false });

  /* Teen shart — teeno ka jawab ek jaisa rakha hai. Alag-alag sandesh dene
     par koi id badal-badal kar ye pata kar leta ki kaunsi class maujood hai
     aur kaunsi nahi. */
  const allowed = cls && student &&
    cls.batchId && cls.batchId === student.batchId &&
    cls.recordingPublished && cls.recordingURL;

  if (!allowed) {
    message(
      "Recording nahi mili",
      "Ya to ye recording abhi tak publish nahi hui hai, ya wo aapke batch ki nahi hai.",
      back
    );
  } else {
    render($("#recBody"), player(cls, student));
  }
}
