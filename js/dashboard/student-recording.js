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

   Isi wajah se yahan browser ka fullscreen band hai. Wo sirf iframe ko bada
   karta tha aur watermark peechhe chhod deta tha — theek us pal jab uski
   sabse zyada zaroorat hoti hai. "Bada karein" wala apna button poore dabbe
   ko bada karta hai, isliye naam-ID upar bana rehta hai.

   Teesra pehra: recording sirf usi batch ke student ko dikhti hai. Kisi aur
   batch ka id URL me daal dene se kuch nahi milta — aur ye rok ab SIRF is
   page me nahi, Firestore ke rules me bhi hai. Yahi asli rok hai: page ka
   code browser me chalta hai, use koi bhi chhod kar seedhe Firestore se
   poochh sakta hai. Pehle wahan `liveClasses` par sirf "login hona chahiye"
   likha tha, isliye kisi bhi naye account se har batch ka `recordingURL`
   nikala ja sakta tha.
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

function player(cls, recordingURL, student) {
  const id = driveFileId(recordingURL);

  /* Drive ka link na ho (jaise koi YouTube link daal diya ho) to zabardasti
     nahi karte — seedha khol dete hain, warna student ko kuch bhi nahi
     milega. */
  if (!id) {
    return box(
      el("p", { style: { margin: "0 0 1rem", fontSize: ".88rem" } },
        "Is recording ka link Google Drive ka nahi hai, isliye yahan andar nahi chal sakta."),
      el("a", {
        class: "btn-ssz btn-primary-ssz", href: recordingURL,
        target: "_blank", rel: "noopener"
      }, "Recording kholein", el("span", { html: icon("externalLink", { size: 16 }) }))
    );
  }

  /* ------------------------------------------------------------------------
     Bada karna — par watermark ke saath

     PEHLE YAHAN `allowfullscreen` LAGA THA, AUR WAHI POORE PEHRE KO BEKAAR
     KAR DETA THA.

     Watermark iframe ke BAHAR ek parat hai. Drive ke player ka fullscreen
     button dabate hi sirf iframe screen par aata hai — parat peechhe reh
     jaati hai, aur naam-ID dikhna band. Yaani jo aadmi screen record karega,
     wahi fullscreen bhi dabayega, aur us recording par koi pehchaan hi nahi
     hogi. Jo ek cheez asli me leak rokti hai, wo theek us pal gayab ho jaati
     thi jab uski sabse zyada zaroorat hai.

     Ab `allowfullscreen` hata diya gaya hai — Drive ka apna button ab kaam
     nahi karta. Bade karne ka apna button neeche hai, aur wo POORE dabbe ko
     bada karta hai (video + watermark, dono). Browser ka Fullscreen API
     istemaal nahi kiya: iPhone par wo `<div>` par chalta hi nahi. Iske
     bajaye dabba screen bhar jaata hai — har phone aur laptop par ek jaisa,
     aur watermark hamesha upar.
     ---------------------------------------------------------------------- */
  const frame = el("div", {
    class: "rec-frame",
    style: {
      position: "relative", width: "100%", aspectRatio: "16 / 9",
      background: "#000", borderRadius: "var(--r-md)", overflow: "hidden"
    }
  },
    el("iframe", {
      src: `https://drive.google.com/file/d/${id}/preview`,
      allow: "autoplay",
      referrerpolicy: "no-referrer",
      style: { width: "100%", height: "100%", border: "0", display: "block", position: "relative", zIndex: "1" }
    }),
    watermark(student)
  );

  const bigBtn = el("button", {
    class: "btn-ssz btn-secondary-ssz btn-sm-ssz", type: "button",
    style: { position: "absolute", right: ".6rem", bottom: ".6rem", zIndex: "3" }
  }, el("span", { html: icon("maximize", { size: 15 }) }), " Bada karein");
  frame.appendChild(bigBtn);

  let big = false;
  const setBig = (on) => {
    big = on;
    Object.assign(frame.style, on
      ? { position: "fixed", inset: "0", width: "100%", height: "100%",
          aspectRatio: "auto", borderRadius: "0", zIndex: "9999" }
      : { position: "relative", inset: "", width: "100%", height: "",
          aspectRatio: "16 / 9", borderRadius: "var(--r-md)", zIndex: "" });
    document.body.style.overflow = on ? "hidden" : "";
    bigBtn.innerHTML = "";
    bigBtn.append(el("span", { html: icon(on ? "minimize" : "maximize", { size: 15 }) }),
                  on ? " Chhota karein" : " Bada karein");
  };
  bigBtn.addEventListener("click", () => setBig(!big));
  /* Esc se bhi bahar — phone par back gesture ke sabse kareeb yahi hai. */
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && big) setBig(false); });

  const wrap = el("div", {});
  wrap.appendChild(el("h2", { style: { margin: "0 0 .3rem", fontSize: "1.1rem" } }, cls.title || "Class recording"));
  wrap.appendChild(el("p", { style: { margin: "0 0 1rem", fontSize: ".84rem", color: "var(--text-muted)" } },
    `${formatDateTime(cls.startsAt)}${cls.facultyName ? ` · ${cls.facultyName}` : ""}${cls.topic ? ` · ${cls.topic}` : ""}`));
  wrap.appendChild(frame);
  wrap.appendChild(el("p", { style: { margin: "1rem 0 0", fontSize: ".78rem", color: "var(--text-muted)" } },
    "Ye recording sirf aapke batch ke liye hai. Ise kisi ke saath share na karein — " +
    "video par aapka apna naam aur Student ID darj hai, bade screen par bhi."));
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
  /* Ab asli pehra Firestore rules me hai: doosre batch ki class ka document
     padha hi nahi ja sakta, isliye ye read permission-denied ho kar throw
     karega. Us galti par page khaali nahi chhodna — neeche wala wahi seedha
     sandesh dikh jaata hai jo "class hai hi nahi" par dikhta hai. Dono ka
     jawab ek jaisa rakhna hi theek hai: warna id badal-badal kar ye pata
     kiya ja sakta hai ki kaunsi class maujood hai. */
  /* Do alag document: class ki jaankari (naam, tareekh) aur recording ka
     asli link. Link isliye alag hai ki class ka record poori batch padh
     sakti hai — usme link rakhne ka matlab tha ki bina approve wali
     recording bhi console se nikal jaati. Us alag document par rule me
     `published` ki shart lagti hai, isliye approve se pehle wo milta hi
     nahi. Purane record ke liye class ke andar wala link fallback hai. */
  const [cls, rec] = await Promise.all([
    getOne(COLLECTIONS.LIVE_CLASSES, classId, { useCache: false }).catch(() => null),
    getOne(COLLECTIONS.CLASS_RECORDINGS, classId, { useCache: false }).catch(() => null)
  ]);

  const recordingURL = (rec?.published && rec.url)
    ? rec.url
    : (cls?.recordingPublished ? (cls.recordingURL || "") : "");

  /* Saari shartein — jawab ek hi rakha hai. Alag-alag sandesh dene par koi
     id badal-badal kar ye pata kar leta ki kaunsi class maujood hai aur
     kaunsi nahi. */
  const allowed = cls && student &&
    cls.batchId && cls.batchId === student.batchId &&
    recordingURL;

  if (!allowed) {
    message(
      "Recording nahi mili",
      "Ya to ye recording abhi tak publish nahi hui hai, ya wo aapke batch ki nahi hai.",
      back
    );
  } else {
    render($("#recBody"), player(cls, recordingURL, student));
  }
}
