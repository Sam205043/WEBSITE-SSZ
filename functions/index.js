/* ==========================================================================
   Soft Skill Zone — Cloud Functions
   --------------------------------------------------------------------------
   YE KYUN BANA

   Website GitHub Pages par hai — wahan koi server nahi chalta. Isliye jab
   student Razorpay par paisa deta tha, website ko kabhi pata hi nahi chalta
   tha. Student ko khud "kitna bheja" likhna padta tha aur admin ko Razorpay
   dashboard me jaakar milaana padta tha.

   Pehle do function paise ke liye hain, aur dono ka maqsad ek hi hai: paisa
   aane ki khabar SEEDHE Razorpay se lena, student ke browser se nahi. Browser
   jhooth bol sakta hai — Razorpay ka signature nahi.

     createPaymentLink   har student/admission ka apna payment link banata
                         hai, jisme uski pehchaan (reference) juda hota hai.
     razorpayWebhook     paisa aate hi Razorpay khud yahan khabar karta hai;
                         yahin Student ID, fee record aur receipt ban jaate
                         hain.
     publishRecording    class ki recording ka Drive link Pankaj ke laptop se
                         aata hai aur us din ki class ke saamne chadh jaata
                         hai. Isi tarah dastakhat se pehra rakha gaya hai.
     admissionStatus     payment ke baad admission page poochhta rehta hai
                         "meri Student ID bani kya?" — taaki student khaali
                         page par baitha na rah jaye.
     attachPayment       jo paisa kisi record se juda hi nahi (jaise Razorpay
                         dashboard se haath se banaya gaya link), use admin
                         panel se sahi student ke khaate me chadhata hai.

   TEEN NIYAM JO YAHAN NIBHAAYE GAYE HAIN

   1. Rakam kabhi browser se nahi maani jaati. Client sirf "kaun" aur "kitna"
      maangta hai; asli fees Firestore se padhi jaati hai aur us par hadd
      lagayi jaati hai. Warna koi ₹10,000 ki fees ₹1 me bhar leta.

   2. Signature ke bina koi webhook nahi maana jaata. Razorpay ka webhook URL
      public hota hai — koi bhi usme nakli payment bhej sakta hai.

   3. Ek payment do baar nahi ginega. Razorpay kabhi-kabhi wahi webhook
      dobara bhejta hai (retry). Isliye fees ka document ID Razorpay ke
      payment id se hi banta hai — dobara aane par wahi document dobara
      likha jaata hai, naya nahi banta.
   ========================================================================== */

const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
/* NOTE: "firebase-functions/v2" (poora bundle) jaan-boojh kar nahi liya.
   Wo apne saath Realtime Database ka provider bhi kheench laata hai, jo
   @firebase/app maangta hai — aur wo package install hi nahi hota. Deploy
   ke waqt CLI code padhte hi "Cannot find module '@firebase/app'" par ruk
   jaata tha. Sirf options wala hissa lene se ye jhamela hi khatam. */
const { setGlobalOptions } = require("firebase-functions/v2/options");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const crypto = require("crypto");
/* --------------------------------------------------------------------------
   Ye do package zaroorat par hi load hote hain — upar se nahi.

   KYUN

   `firebase deploy` se pehle Firebase poori file ko load karke dekhta hai ki
   ismein kaun-kaun se function hain, aur uske paas sirf 10 second hote hain.
   Naapne par pata chala ki razorpay ~1.3 second aur nodemailer ~1.4 second
   khaate hain — dono milkar 2.7 second, sirf load hone me.

   In dono ki zaroorat poori file me sirf DO jagah padti hai: payment link
   banate waqt, aur mail bhejte waqt. Baaki saat me se paanch function inhe
   chhute bhi nahi. Upar rakhne ka matlab tha ki gradeMcq jaisa function bhi,
   jo na payment karta hai na mail bhejta, in dono ka bojh uthaata rahe — har
   thandi shuruaat (cold start) par.

   Ab pehli baar zaroorat padne par load hote hain aur wahin yaad rakh liye
   jaate hain, isliye doosri baar ka kharcha shoonya hai.
   -------------------------------------------------------------------------- */
let _Razorpay = null;
const getRazorpay = () => (_Razorpay ||= require("razorpay"));

let _nodemailer = null;
const getNodemailer = () => (_nodemailer ||= require("nodemailer"));

admin.initializeApp();
const db = admin.firestore();

/* Firestore aur Storage dono asia-south1 me hain — function bhi wahin rakha
   hai, taaki har read-write ka safar chhota rahe. */
setGlobalOptions({ region: "asia-south1", maxInstances: 5 });

const GOOGLE_TTS_KEY = defineSecret("GOOGLE_TTS_KEY");
const RZP_KEY_ID = defineSecret("RZP_KEY_ID");
const RZP_KEY_SECRET = defineSecret("RZP_KEY_SECRET");
const RZP_WEBHOOK_SECRET = defineSecret("RZP_WEBHOOK_SECRET");

/* Class recording ka link chadhane wala raasta. Isse Pankaj ke laptop par
   chalne wala chhota program baat karta hai — wahi secret dono taraf hai. */
const REC_SECRET = defineSecret("REC_SECRET");

/* Email bhejne ke liye Brevo ka SMTP.

   ZOHO SE KYUN NAHI — `info@softskillzone.in` Zoho Mail ke Forever Free plan
   par hai, aur Zoho ne free plan par SMTP/IMAP/POP band kar diya hai. Inbox
   aur webmail pehle jaisa chalta hai; bas bahar se program bhejkar mail karna
   nahi hota. Isliye bhejne ka kaam Brevo karta hai (300 email roz, muft), aur
   bhejne wala pata phir bhi info@softskillzone.in hi rehta hai. */
const BREVO_USER = defineSecret("BREVO_USER");
const BREVO_KEY = defineSecret("BREVO_KEY");
const MAIL_SECRETS = [BREVO_USER, BREVO_KEY];

/* --------------------------------------------------------------------------
   Course ki jaankari

   Ye website ke js/config/site-data.js se li gayi hai. Function browser ka
   module import nahi kar sakta, isliye yahan dobara likhni padi.

   >>> Fees ya duration badlein to DONO jagah badalna — warna Student ID ka
   >>> code ya kist ka plan galat banega. <<<
   -------------------------------------------------------------------------- */
const COURSES = {
  "ai-dca":           { code: "DCA", months: 6,  fee: 6000,  admissionFee: 0 },
  "ai-tally-prime":   { code: "TLY", months: 3,  fee: 5000,  admissionFee: 0 },
  "python-314":       { code: "PYT", months: 4,  fee: 7000,  admissionFee: 0 },
  "adca":             { code: "ADC", months: 12, fee: 10000, admissionFee: 0 },
  "ai-video-editing": { code: "VID", months: 3,  fee: 6500,  admissionFee: 0 },
  "icom":             { code: "ICM", months: 24, fee: 12000, admissionFee: 0 },
  "bcom":             { code: "BCM", months: 36, fee: 18000, admissionFee: 0 },
  "gst-2":            { code: "GST", months: 2,  fee: 4500,  admissionFee: 0 },
  "income-tax-2025":  { code: "ITX", months: 2,  fee: 4500,  admissionFee: 0 },
  "tds-finance-2025": { code: "TDS", months: 2,  fee: 3500,  admissionFee: 0 },
  "ai-automation-pro":{ code: "AUT", months: 3,  fee: 5000,  admissionFee: 0 }
};

/* --------------------------------------------------------------------------
   Azadi offer — thodi der ke liye alag daam

   AI Automation Pro 15 August ko Rs 1,947 me launch hua, aur 31 August ki
   raat 12 baje se uska asli daam Rs 5,000 ho jaata hai. Upar wali table
   sthir hai, isliye offer ka daam yahan alag rakha gaya hai.

   Ye do tareekhein website ki js/core/azadi.js se HUBAHU milni chahiye —
   wahan bhi thik yahi do pal hain. Alag ho gaye to student ko site par ek
   daam dikhega aur payment page par doosra, aur bharosa ek hi baar me
   tootta hai.

   1 September ke baad yahan kuchh nahi karna: shart apne aap jhoothi ho
   jaayegi aur table wala Rs 5,000 laut aayega.
   -------------------------------------------------------------------------- */
const AZADI = {
  courseId: "ai-automation-pro",
  startsAt: Date.parse("2026-08-15T00:00:00+05:30"),
  endsAt:   Date.parse("2026-09-01T00:00:00+05:30"),
  fee: 1947
};

/* --------------------------------------------------------------------------
   Fees ka ek hi sach — YAHI table.

   YE FUNCTION KYUN BANA

   Admission ka document website ka form banata hai, aur usme `courseFee` aur
   `admissionFee` bhi form hi likhta hai. Firestore rules admission banane ki
   ijaazat har kisi ko deti hain — deni bhi chahiye, form public hai. Par
   iska matlab ye tha ki koi bhi browser ke console se apni admission bana
   sakta tha jisme `courseFee: 1` likha ho, aur `createPaymentLink` usi 1 ko
   sach maan leta tha: ₹1 ka asli link, ₹1 dete hi poora course chalu, batch
   ke saath. `totalFee` bhi hamesha ke liye 1 darj ho jaata.

   Ab rakam kabhi bhi us document se nahi padhi jaati. Course ki id se yahan
   se aati hai — aur ye table sirf deploy se badalti hai.

   Course id table me na ho to 0 nahi lautate: 0 ka matlab hota "koi bakaya
   nahi", yaani course muft. Wahan hum saaf mana kar dete hain.
   -------------------------------------------------------------------------- */
function courseFeeOf(courseId, now = Date.now()) {
  const id = String(courseId || "").trim();
  const c = COURSES[id];
  if (!c) return null;

  /* Offer chalu ho to usi ka daam — warna table wala. */
  if (id === AZADI.courseId && now >= AZADI.startsAt && now < AZADI.endsAt) {
    return rupees(AZADI.fee) + rupees(c.admissionFee);
  }
  return rupees(c.fee) + rupees(c.admissionFee);
}

/* Admission ke waqt kam se kam itna hissa — baaki kisten ban jaati hain. */
const MIN_SHARE = 0.10;

/* ==========================================================================
   Chhoti madad
   ========================================================================== */

const rupees = (n) => Math.max(0, Math.round(Number(n) || 0));

/* ==========================================================================
   Email
   --------------------------------------------------------------------------
   TEEN NIYAM YAHAN BHI

   1. EMAIL KABHI PAISE KA KAAM NAHI ROKTA. Jo bhi yahan galat ho — SMTP
      band ho, pata galat ho, Brevo ki hadd bhar jaye — wo sirf log me
      jaata hai. Receipt, Student ID aur bakaya ka hisaab email par tanik
      bhi nirbhar nahi hai.

   2. EK MAUKE PAR EK HI MAIL. Razorpay wahi webhook dobara bhej deta hai,
      aur reminder roz chalta hai. Isliye har mail ka ek naam hota hai aur
      wo naam `mailLog` me `create()` se likha jaata hai — dobara likhne par
      Firestore khud mana kar deta hai (code 6), aur hum chup-chaap chhod
      dete hain. Yahi tareeka notifications me pehle se chal raha hai.

      `mailLog` kisi client ko na dikhta hai na likhne yogya hai — rules ke
      aakhir wala "baaki sab mana" use apne aap band rakhta hai. Function
      Admin SDK par chalta hai, isliye use farq nahi padta.

   3. PATA HAMESHA RECORD SE. Email ka pata kabhi request se nahi liya
      jaata, warna koi doosre ki receipt apne pate par mangwa leta.
   ========================================================================== */

const MAIL_FROM = `"${"Soft Skill Zone"}" <info@softskillzone.in>`;
const MAIL_REPLY_TO = "info@softskillzone.in";
const SITE = "https://softskillzone.in";

let mailTransport = null;
function mailer() {
  if (!mailTransport) {
    mailTransport = getNodemailer().createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,                    // 587 par STARTTLS khud lag jaata hai
      auth: { user: BREVO_USER.value(), pass: BREVO_KEY.value() }
    });
  }
  return mailTransport;
}

/** Bahar se aaye text ko HTML me daalne se pehle nirapad banao. */
const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const inr = (n) => `₹${rupees(n).toLocaleString("en-IN")}`;

/* Ek hi dhaancha sab mail ke liye — koi image nahi, koi bahar ki file nahi.
   Purane email client bhi ise theek dikhate hain, aur spam wale bhi kam
   shak karte hain. */
function wrap(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f7f9;
    font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1c1e">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;
                border:1px solid #e5e7eb;overflow:hidden">
      <div style="padding:18px 24px;border-bottom:1px solid #eef0f2">
        <strong style="font-size:15px;letter-spacing:.2px">Soft Skill Zone Institute</strong><br>
        <span style="font-size:12px;color:#6b7280">Learn Today. Lead Tomorrow.</span>
      </div>
      <div style="padding:24px">
        <h1 style="margin:0 0 14px;font-size:17px;line-height:1.4">${esc(title)}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:16px 24px;border-top:1px solid #eef0f2;font-size:11px;color:#6b7280;line-height:1.6">
        Near Gym Town, Pakri, Ara &middot;
        <a href="${SITE}" style="color:#6b7280">softskillzone.in</a><br>
        Ye mail apne aap bheji gayi hai. Koi sawaal ho to isi ka jawab de dijiye.
      </div>
    </div></body></html>`;
}

const row = (k, v) =>
  `<tr><td style="padding:5px 0;color:#6b7280;font-size:13px">${esc(k)}</td>
       <td style="padding:5px 0;text-align:right;font-weight:600;font-size:13px">${esc(v)}</td></tr>`;

const table = (rows) =>
  `<table style="width:100%;border-collapse:collapse;margin:6px 0 18px">${rows.join("")}</table>`;

const button = (href, label) =>
  `<a href="${esc(href)}" style="display:inline-block;padding:11px 20px;border-radius:8px;
     background:#1a1c1e;color:#fff;text-decoration:none;font-size:14px;font-weight:600">${esc(label)}</a>`;

/**
 * Mail bhejo — ek hi baar, aur galti ho to chup-chaap.
 *
 * @param {string} key   is mauke ka naam (jaise `receipt_pay_xxx`). Isi se
 *                       dobara bhejna ruk jaata hai.
 * @returns {Promise<boolean>} bheji gayi ya nahi (bulane wale ko farq nahi
 *                       padna chahiye — ye sirf log ke liye hai)
 */
async function sendMail(key, { to, subject, html, text }) {
  const addr = String(to || "").trim();
  if (!addr || !addr.includes("@")) {
    logger.info("mail chhoda — pata nahi hai", { key });
    return false;
  }

  /* Pehle nishaan, phir mail. Ulta karne par: mail chala gaya aur nishaan
     lagne se pehle function mar gaya, to agli baar wahi mail dobara jaata. */
  try {
    await db.collection("mailLog").doc(key).create({
      to: addr, subject, sentAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    if (err?.code === 6 /* ALREADY_EXISTS */) {
      logger.info("mail pehle hi ja chuki hai", { key });
      return false;
    }
    logger.warn("mailLog likhne me dikkat — mail chhod rahe hain", { key, err: err?.message });
    return false;
  }

  try {
    await mailer().sendMail({
      from: MAIL_FROM, replyTo: MAIL_REPLY_TO, to: addr, subject, text, html
    });
    logger.info("mail chali gayi", { key, to: addr });
    return true;
  } catch (err) {
    /* Yahan THROW NAHI KARNA. Paisa darj ho chuka hai; mail na jaane se use
       palatna bilkul galat hoga. Nishaan hata dete hain taaki agli koshish
       (webhook retry ya reminder) dobara bhej sake. */
    logger.error("mail nahi ja payi", { key, to: addr, err: err?.message });
    await db.collection("mailLog").doc(key).delete().catch(() => {});
    return false;
  }
}



/* --------------------------------------------------------------------------
   Tareekh — hamesha Ara ke hisaab se, kabhi server ke hisaab se nahi

   Cloud Functions UTC par chalte hain. Institute IST par chalta hai. Roz ke
   saade paanch ghante is farq ka koi asar nahi dikhta, par do jagah dikhta
   hai — aur wahi do jagah galat thi:

   1) Student ID aur Receipt number me saal (`new Date().getFullYear()`).
      1 January ki raat 12:00 se 5:30 IST ke beech UTC par abhi 31 December
      hi hota hai. Us khidki me bana student SSZ2025... ban jaata, aur uski
      receipt SSZ/RCPT/2025/... — dono PICHHLE saal ke. Aur kyunki counter
      ka naam bhi saal se banta hai (`students-2025-DCA`), wo purane saal ka
      counter aage badha deta — matlab agle din ki ginti bhi bigadti.

   2) Kist plan ki due dates. Raat 12:00 se 5:30 IST ke beech bana plan har
      kist ko ek din pehle ki tareekh de deta tha.

   Ilaaj seedha hai: samay ko 5:30 aage khiska kar UTC wale hisse padho.
   `istDayRange()` neeche pehle se yahi karta hai — ab poori file ek hi
   niyam par chalti hai.
   -------------------------------------------------------------------------- */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Kisi bhi pal ki IST tareekh, YYYY-MM-DD me. */
const dateStr = (d) => {
  const t = new Date(d.getTime() + IST_OFFSET_MS);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
};

/** Abhi Ara me kaun sa saal chal raha hai. IDs isi se bante hain. */
const istYear = () => new Date(Date.now() + IST_OFFSET_MS).getUTCFullYear();

/**
 * IST tareekh me mahine jodo — bina mahina laanghe.
 *
 * JavaScript ka `setMonth` 31 January me 1 mahina jode to "31 February"
 * banata hai, jo hota hi nahi, isliye wo 3 March par chhalak jaata hai.
 * Nateeja: February wali kist banti hi nahi thi, aur baaki tareekhein 31
 * se khisak kar 3 ho jaati thin. Yahan din ko us mahine ke aakhri din tak
 * seemit kar dete hain: 31 Jan + 1 = 28 Feb, 31 Mar + 1 = 30 Apr.
 *
 * Hisaab poora IST me hota hai, kyunki jo tareekh dikhni hai wo IST ki hai.
 * (Server UTC par chalta hai — Ara me raat 1 baje wahan abhi kal hi hai.)
 */
const addMonthsStr = (from, months) => {
  const t = new Date(from.getTime() + IST_OFFSET_MS);
  const y = t.getUTCFullYear(), m = t.getUTCMonth(), day = t.getUTCDate();
  const add = Math.round(Number(months) || 0);
  const lastDay = new Date(Date.UTC(y, m + add + 1, 0)).getUTCDate();
  const d = new Date(Date.UTC(y, m + add, Math.min(day, lastDay)));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

/** Counter ek transaction me badhta hai, taaki do admission ek hi ID na le lein. */
async function nextSequence(name, start = 1) {
  const ref = db.collection("counters").doc(name);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = snap.exists ? (snap.data().value || 0) + 1 : start;
    tx.set(ref, { value: next, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return next;
  });
}

/**
 * Kist plan — website ke admin panel jaisa hi hisaab, taaki dono jagah ek
 * hi jawab bane: 10% (gol number me) abhi, baaki barabar mahine-mahine.
 * Kiston ki ginti course ki lambai se bandhi hai, taaki fees course khatam
 * hone se pehle poori ho jaye.
 */
function buildFeePlan(totalFee, durationMonths, from = new Date()) {
  const total = rupees(totalFee);
  if (!total) return [];

  const first = Math.min(total, Math.max(500, Math.ceil((total * MIN_SHARE) / 100) * 100));
  const plan = [{ no: 1, amount: first, dueDate: dateStr(from) }];

  const rest = total - first;
  if (rest <= 0) return plan;

  const n = Math.max(1, Math.min(9, (Number(durationMonths) || 12) - 1));
  const base = Math.floor(rest / n);
  const extra = rest - base * n;

  for (let i = 0; i < n; i++) {
    plan.push({ no: i + 2, amount: base + (i === 0 ? extra : 0), dueDate: addMonthsStr(from, i + 1) });
  }
  return plan;
}

/** Pehli aisi kist jiska paisa poora nahi aaya — student dashboard isi se "agli due date" dikhata hai. */
function nextDueDate(plan, paidFee) {
  let left = rupees(paidFee);
  for (const k of plan) {
    if (left >= k.amount) { left -= k.amount; continue; }
    return new Date(`${k.dueDate}T00:00:00`);
  }
  return null;
}

/** "08:00 AM - 09:00 AM" se pata karo ki subah ka batch hai ya shaam ka. */
function timingPref(timing) {
  const m = String(timing || "").match(/(\d{1,2})(?::\d{2})?\s*(AM|PM)/i);
  if (!m) return "";
  let h = Number(m[1]) % 12;
  if (/PM/i.test(m[2])) h += 12;
  if (h < 12) return "morning";
  if (h < 16) return "afternoon";
  return "evening";
}

/**
 * Batch tabhi lagta hai jab jawab me koi shak na ho — us course ka ek hi
 * chalu batch ho, ya student ki pasand se sirf ek mile. Do milen to khaali
 * chhod dete hain: galat batch dena na dene se bura hai.
 */
async function pickBatch(courseId, pref) {
  if (!courseId) return null;
  const snap = await db.collection("batches").where("courseId", "==", courseId).limit(50).get();
  const open = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((b) => b.status !== "completed");

  if (open.length === 1) return open[0];
  const match = open.filter((b) => timingPref(b.timing) === pref);
  return match.length === 1 ? match[0] : null;
}

/* --------------------------------------------------------------------------
   "Ye link kiske liye maanga ja raha hai — kya maangne wala wahi hai?"

   PEHLE YAHAN KUCH BHI NAHI THA, AUR WO EK BADI GALTI THI.

   Website GitHub Pages par hai, isliye is function ka pata sabko maloom ho
   sakta hai. Student ID ginti me chalti hai (SSZ2026ADC0001, 0002, …) aur
   application number bhi. Bina kisi jaanch ke, koi bhi ek-ek number aazma
   kar poore institute ki list nikaal sakta tha — naam, phone, email, aur
   kitna bakaya hai. Har koshish par ek asli Razorpay link bhi ban jaata,
   yaani account bharkar asli students ke payment rok dena bhi mumkin tha.

   Ab do me se koi ek sabooti chahiye:

     1. LOGIN — student apne hi record ke liye maang raha ho (ya admin ho).
        Admission ke waqt ye mumkin nahi hota, kyunki tab account bana hi
        nahi hota — isliye doosra raasta bhi rakha hai.

     2. EMAIL — wahi email jo us record me likha hai. Student apna email
        jaanta hai; anjaan aadmi nahi. Yahi tareeka `admissionStatus` me
        bhi hai, dono jagah ek jaisa.

   Na mile to wahi "Record nahi mila" jaata hai jo galat id par jaata hai —
   taaki ye bhi pata na chale ki record maujood hai ya nahi.
   -------------------------------------------------------------------------- */
/* --------------------------------------------------------------------------
   Admin hai, aur ABHI BHI admin hai?

   Rules aur Storage me `status == 'blocked'` ka pehra pehle se tha, par
   yahan nahi. Block karna Firestore ka ek field hai, Firebase Auth ka login
   nahi — nikale hue admin ka token zinda rehta hai. Yaani wo browser se
   seedhe `attachPayment` bula kar kisi ka bhi payment kisi par bhi chipka
   sakta tha, aur har student ka bakaya padh sakta tha. "Admin block karein"
   wala button aadha hi kaam karta tha.

   Rules wali shart hi yahan bhi: role admin ho AUR status 'active'. Purane
   record me status likha hi na ho to use 'active' maana jaata hai — wahi
   rules bhi karte hain (`get('status','active')`).
   -------------------------------------------------------------------------- */
function isLiveAdmin(u) {
  return !!u && u.role === "admin" && String(u.status || "active") === "active";
}

async function assertMayPay(req, kind, id, rec) {
  const askedEmail = String(req.data?.email || "").trim().toLowerCase();
  const recEmail = String(rec.email || "").trim().toLowerCase();

  /* Raasta 2 — email mel khaata hai. Dono taraf khaali na ho, warna jinke
     record me email hi nahi likha unke liye darwaza khul jaata. */
  if (askedEmail && recEmail && askedEmail === recEmail) return;

  /* Raasta 1 — login. */
  const uid = req.auth?.uid;
  if (uid) {
    const u = (await db.collection("users").doc(uid).get()).data() || {};
    if (isLiveAdmin(u)) return;                           // admin kisi ke liye bhi
    if (kind === "student" && u.studentId === id) return; // student sirf apne liye
    /* Admission ke waqt user ke paas abhi studentId hoti hi nahi, isliye
       login se admission ka koi raasta nahi — wahan email hi sabooti hai. */
  }

  logger.warn("payment link — bina sabooti ke maanga gaya", { kind, id, hadAuth: !!uid });
  throw new HttpsError("not-found", "Record nahi mila.");
}

/* ==========================================================================
   1) createPaymentLink — har koshish ka apna link
   --------------------------------------------------------------------------
   Chaar pehre —
     * maangne wala wahi ho (login ya email) — upar `assertMayPay`
     * jis record ke liye link maanga hai wo Firestore me hona chahiye
     * rakam hamesha Firestore ki fees se tay hoti hai, client se nahi
     * kam se kam 10%, aur bakaya se zyada kabhi nahi
   ========================================================================== */
exports.createPaymentLink = onCall(
  { secrets: [RZP_KEY_ID, RZP_KEY_SECRET], cors: true },
  async (req) => {
    const kind = String(req.data?.kind || "");
    const id = String(req.data?.id || "").trim();
    const asked = rupees(req.data?.amount);

    if (!["admission", "student"].includes(kind) || !id) {
      throw new HttpsError("invalid-argument", "kind aur id dono chahiye.");
    }

    const snap = await db.collection(kind === "admission" ? "admissions" : "students").doc(id).get();
    if (!snap.exists) throw new HttpsError("not-found", "Record nahi mila.");
    const rec = snap.data();

    /* Rakam ki koi baat isse pehle nahi — pehle ye tay ho ki poochhne ka
       haq hai bhi ya nahi. */
    await assertMayPay(req, kind, id, rec);

    /* --------------------------------------------------------------------
       Admission approve ho chuka ho to hisaab student ke record se lo.

       PEHLE YAHAN EK MEHNGI GALTI THI. Admission wale raaste me "pehle kitna
       diya" hamesha shunya maan liya jaata tha. Iska matlab tha ki uska
       bakaya hamesha POORI fees rehta tha — chahe student paise de chuka ho.

       Kaise pakda jaata: student poori ₹10,000 admission page se deta, page
       refresh karta (ya doosre tab me wahi page khula hota), aur dobara
       "Fee bharein" dabate hi use phir se ₹10,000 ka asli link mil jaata.
       De diya to `paidFee` 20,000 ho jaata aur `pendingFee` chup-chaap 0 par
       ruk jaata — ₹10,000 zyada le liye, aur kahin darj bhi nahi hota ki
       zyada hue hain.

       Ab: paisa aate hi webhook student ka record bana deta hai aur
       admission par uski ID likh deta hai. Wo ID dikhte hi hum aage ka poora
       hisaab student ke record se karte hain — jaise webhook khud karta hai.
       Kist ki hadd bhi tab ₹100 ho jaati hai, kyunki 10% to aa hi chuka.

       Ek chhoti khidki phir bhi bachti hai: paisa dene ke baad, webhook
       pahunchne se pehle ke kuchh second. Us beech dono link poore bakaye ke
       hi banenge. Wo khidki band karne ke liye payment ke waqt ka record
       chahiye hoga — abhi ke liye asli dikkat (refresh karke dobara dena)
       khatam ho gayi hai.
       -------------------------------------------------------------------- */
    let feeRec = rec;
    let feeKind = kind;
    if (kind === "admission" && rec.studentId) {
      const sSnap = await db.collection("students").doc(rec.studentId).get();
      if (sSnap.exists) {
        feeRec = sSnap.data();
        feeKind = "student";

        /* IJAAZAT DOBARA — AUR IS BAAR USI RECORD KI JISKA HISAAB HO RAHA HAI.

           Upar wali jaanch ADMISSION ke record par hui thi. Yahan hisaab
           kisi DOOSRE record (student) se hone laga hai. Beech me ye khaai
           reh gayi thi: nakli admission me kisi aur ka `studentId` likh kar
           link maanga ja sakta tha — jaanch apne email par pass ho jaati
           aur jawab me us student ka theek-theek bakaya wapas aa jaata.
           Student ID ginti me chalte hain, yaani ek-ek karke poore institute
           ka hisaab padha ja sakta tha. Paisa de dene par wo bhi unhi ke
           khaate me chadhta, receipt bhi unke naam.

           Isliye ab wahi jaanch student ke record par dobara hoti hai. Asli
           student ke liye kuchh nahi badalta — claimStudentId dono jagah ek
           hi email likhta hai. */
        await assertMayPay(req, "student", rec.studentId, feeRec);
      }
    }

    /* Asli rakam yahin tay hoti hai. Client jo bheje, uski hadd hum lagate
       hain — warna ₹10,000 ki fees ₹1 me bhar li jaati. */
    /* Admission par rakam course ki id se aati hai, us document me likhe
       number se NAHI — wo number client ka bheja hua hai. `courseFeeOf` ke
       upar poori kahani likhi hai. */
    const total = feeKind === "admission"
      ? courseFeeOf(feeRec.courseId)
      : rupees(feeRec.totalFee);

    if (feeKind === "admission" && total === null) {
      logger.error("payment link — course table me hai hi nahi", { id, courseId: feeRec.courseId });
      throw new HttpsError("failed-precondition", "Is course ki fees tay nahi hai. Institute se baat karein.");
    }
    const alreadyPaid = feeKind === "admission" ? 0 : rupees(feeRec.paidFee);
    const due = Math.max(0, total - alreadyPaid);

    if (due <= 0) throw new HttpsError("failed-precondition", "Koi bakaya nahi hai.");

    /* Do alag hadd, do alag wajah.

       Admission par 10% isliye ki usi payment par Student ID, batch aur kist
       plan ban jaate hain — ₹1 me ye sab de dena galat hoga.

       Baad ki kist par hadd sirf ₹100 hai, aur wo rokne ke liye nahi hai.
       Paisa aane me jitni rukawat kam, utna achha — jo student aaj ₹300 de
       sakta hai use rokne se institute ko ₹300 milte hi nahi. Ye ₹100 to
       bas do cheezon ke liye hai: ₹1,000 ki jagah ₹1 wala typo, aur ₹5-₹10
       wale payment se receipt ki ginti bhar jaana.

       Dono halat me `due` se zyada kabhi nahi — aakhri kist chhoti bachi ho
       to utni hi maangi jaati hai, ₹100 ki hadd wahan apne aap hat jaati hai. */
    const min = feeKind === "admission"
      ? Math.min(due, Math.max(500, Math.ceil((total * MIN_SHARE) / 100) * 100))
      : Math.min(due, 100);

    const amount = Math.min(due, Math.max(min, asked || min));

    const rzp = new (getRazorpay())({
      key_id: RZP_KEY_ID.value(),
      key_secret: RZP_KEY_SECRET.value()
    });

    const link = await rzp.paymentLink.create({
      amount: amount * 100,                       // Razorpay paise me leta hai
      currency: "INR",
      description: `${feeRec.courseName || rec.courseName || "Course"} fees — ${rec.fullName || ""}`.trim(),
      customer: {
        name: rec.fullName || "",
        contact: String(rec.mobile || "").replace(/\D/g, "").slice(-10),
        email: rec.email || ""
      },
      notify: { sms: false, email: false },       // WhatsApp/email hum khud bhejte hain
      reminder_enable: false,
      /* Razorpay reference_id 40 akshar se lamba nahi le sakta, warna poora
         call INTERNAL error de deta hai. Pehle yahan "admission:<appNo>:<ms>"
         tha — student ke liye 36 akshar ka banta tha (chal jaata tha) par
         admission ke liye 41 ka, isliye har admission ka payment link fail
         hota tha. Ab kind hata diya (wo notes me hai hi) aur time base-36 me
         likha jaata hai — 26 akshar. slice() aakhri pehra hai, taaki kabhi
         koi lamba id aaye to bhi call na toote.

         Pehchan isse hoti hi nahi — webhook `notes` padhta hai. Ye sirf
         student ko dikhne wala "RECEIPT" number hai. */
      reference_id: `${id}-${Date.now().toString(36)}`.slice(0, 40),
      notes: { kind, recordId: id, studentId: rec.studentId || "" }
    });

    await snap.ref.set({
      lastPaymentLinkId: link.id,
      lastPaymentLinkAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    logger.info("payment link bana", { kind, id, amount, linkId: link.id });
    return { url: link.short_url, amount };
  }
);

/* ==========================================================================
   2) razorpayWebhook — paisa aane ki asli khabar
   ========================================================================== */
exports.razorpayWebhook = onRequest(
  /* MAIL_SECRETS bhi chahiye — yahi raasta receipt aur admission mail bhejta hai. */
  { secrets: [RZP_WEBHOOK_SECRET, ...MAIL_SECRETS], cors: false },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("POST only");

    /* Signature ki jaanch SABSE PEHLE. Ye URL public hai — koi bhi ise
       jaan kar nakli "payment ho gaya" bhej sakta hai. Bina signature ke
       aage ek line bhi nahi chalni chahiye. */
    const given = req.get("x-razorpay-signature") || "";
    const expected = crypto
      .createHmac("sha256", RZP_WEBHOOK_SECRET.value())
      .update(req.rawBody)
      .digest("hex");

    const ok = given.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));

    if (!ok) {
      logger.warn("webhook signature galat — chhod diya");
      return res.status(401).send("bad signature");
    }

    const event = req.body?.event || "";
    if (event !== "payment_link.paid") {
      // Baaki event abhi kaam ke nahi. 200 dena zaroori hai, warna Razorpay
      // baar-baar dobara bhejta rahega.
      return res.status(200).send("ignored");
    }

    try {
      const payment = req.body?.payload?.payment?.entity || {};
      const link = req.body?.payload?.payment_link?.entity || {};
      const notes = link.notes || payment.notes || {};

      const amount = rupees((payment.amount || link.amount_paid || 0) / 100);
      const paymentId = payment.id || link.id;

      if (!amount || !paymentId) {
        /* Ye sach me toota hua payload hai — isme kuchh bhi karne layak
           nahi bacha. Log me chhod kar 200 dete hain. */
        logger.error("webhook me rakam ya payment id hi nahi", { amount, paymentId });
        return res.status(200).send("unusable payload");
      }

      /* `kind` ko seedhe barabari se nahi milate. Razorpay dashboard se
         haath se banaye gaye link me koi "Admission" (bada A) ya " student "
         (aage-peechhe space) likh de, to purana code use student ID samajh
         leta, fail hota, 500 deta — aur Razorpay ghanton tak dobara bhejta
         rehta. */
      const kind = String(notes.kind || "").trim().toLowerCase();
      const recordId = String(notes.recordId || "").trim();

      const target = resolveTarget(kind, recordId, link.reference_id);

      if (!target) {
        /* --------------------------------------------------------------
           Paisa aa gaya hai par ye kiska hai — hum nahi jaante.

           Ye tab hota hai jab link Razorpay dashboard se haath se banaya
           gaya ho (phone par fees maangte waqt), ya notes kisi wajah se
           gum ho gaye hon. PURANA CODE ISE 200 KEH KAR CHUPCHAAP CHHOD
           DETA THA — paisa bank me aa jaata aur kahin darj hi nahi hota.
           Na fee record, na receipt, na bakaya kam. Aur kyunki jawab 200
           tha, kisi ko pata bhi nahi chalta.

           Ab aisa har payment `unmatchedPayments` me park hota hai —
           poori jaankari ke saath — aur admin ko notification jaata hai.
           Code khud andaza NAHI lagata ki paisa kiska hai: ek hi mobile
           number do bhai-behen ka ho sakta hai, aur galat khaate me paisa
           chadhana kho dene se bhi bura hai. Aap panel me dekh kar ek click
           me jodenge, tab receipt banegi.
           -------------------------------------------------------------- */
        await parkUnmatched({ paymentId, amount, payment, link, notes });
        return res.status(200).send("parked");
      }

      try {
        if (target.kind === "admission") await onAdmissionPaid(target.id, amount, paymentId);
        else await onStudentPaid(target.id, amount, paymentId);
      } catch (err) {
        /* Kuchh galtiyaan dobara koshish karne se kabhi theek nahi hotin —
           jaise course ka table me na hona. Un par 500 dena sabse bura
           jawab hai: Razorpay wahi nakaam koshish baar-baar bhejta rehta
           hai, aur paisa aakar kahin darj hi nahi hota. Aise payment ko
           park kar dete hain — poori jaankari ke saath, admin ko khabar
           ke saath — theek waise hi jaise bina pehchan wale payment ko. */
        if (err?.sszPark) {
          logger.error("payment park kiya — aage badhne laayak nahi", { paymentId, why: err.message });
          await parkUnmatched({ paymentId, amount, payment, link, notes });
          return res.status(200).send("parked");
        }
        throw err;
      }

      return res.status(200).send("ok");
    } catch (err) {
      logger.error("webhook fail", err);
      /* 500 dene par Razorpay dobara bhejega — aur idempotency ki wajah se
         dobara aana surakshit hai. Isliye galti chhupana nahi hai. */
      return res.status(500).send("error");
    }
  }
);

/* --------------------------------------------------------------------------
   "Ye paisa kiska hai?"

   Do sawaal ka jawab chahiye: admission ka hai ya kisi bane hue student ka,
   aur kiska. Pehla zariya `notes` hai — hamare apne banaye link me hum khud
   likhte hain. Wo na mile to `reference_id` se kaam chala lete hain, kyunki
   usme bhi hamari ID sabse aage hoti hai (`SSZ-APP-2026-0001-m3k9x` jaisi).

   ID ki shakl se hi pata chal jaata hai ki kaunsi cheez hai:
     SSZ-APP-2026-0001   -> admission
     SSZ2026DCA0001      -> student
   Isliye kind galat likha ho, ya ho hi na, tab bhi paisa sahi jagah pahunch
   jaata hai. Shak ho to `null` — aur `null` ka matlab hai "aap tay karenge",
   andaza nahi.
   -------------------------------------------------------------------------- */
const APP_NO_RE = /^SSZ-APP-20\d{2}-\d{4}$/;
const STUDENT_ID_RE = /^SSZ20\d{2}[A-Z]{3}\d{4}$/;

function kindOfId(id) {
  if (APP_NO_RE.test(id)) return "admission";
  if (STUDENT_ID_RE.test(id)) return "student";
  return "";
}

function resolveTarget(kind, recordId, referenceId) {
  /* 1. Seedha raasta — notes me ID hai aur uski shakl pehchani hui hai. */
  if (recordId) {
    const byShape = kindOfId(recordId);
    if (byShape) return { kind: byShape, id: recordId };
    /* Shakl nahi pehchani, par kind saaf likha hai to usi par bharosa. */
    if (kind === "admission" || kind === "student") return { kind, id: recordId };
  }

  /* 2. Notes gum hain — reference_id se ID nikaalne ki koshish. Wo
        `<id>-<base36 time>` hota hai, isliye aakhri hissa hata kar bhi
        dekhte hain. */
  const ref = String(referenceId || "").trim();
  if (ref) {
    for (const cand of [ref, ref.replace(/-[a-z0-9]+$/i, "")]) {
      const byShape = kindOfId(cand);
      if (byShape) return { kind: byShape, id: cand };
    }
  }

  return null;
}

/**
 * Jis paise ka maalik nahi mila use surakshit jagah rakh dete hain.
 * Document ka naam payment id se banta hai, isliye webhook dobara aaye to
 * doosri entry nahi banegi — aur agar aap tab tak use jod chuke hain, to
 * create() chupchaap nikal jayega, aapka kiya hua nahi mitega.
 */
async function parkUnmatched({ paymentId, amount, payment, link, notes }) {
  const row = {
    razorpayPaymentId: paymentId,
    razorpayLinkId: link?.id || "",
    referenceId: link?.reference_id || "",
    amount,
    status: "unmatched",
    payerName: payment?.customer_details?.name || link?.customer?.name || "",
    payerEmail: String(payment?.email || link?.customer?.email || "").toLowerCase(),
    payerContact: String(payment?.contact || link?.customer?.contact || "").replace(/\D/g, "").slice(-10),
    description: link?.description || "",
    method: payment?.method || "",
    rawNotes: notes || {},
    paidOn: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection("unmatchedPayments").doc(`rzp_${paymentId}`).create(row);
  } catch (err) {
    if (err?.code === 6 /* ALREADY_EXISTS */) {
      logger.info("ye payment pehle se park hai", { paymentId });
      return;
    }
    throw err;
  }

  try {
    await db.collection("notifications").doc(`unmatched_${paymentId}`).create({
      audience: "admin",
      studentId: "",
      batchId: "",
      type: "fee",
      priority: "high",
      readBy: [],
      createdBy: "razorpay-webhook",
      title: "Ek payment kisi student se juda nahi",
      message: `₹${amount.toLocaleString("en-IN")} aaya hai${row.payerName ? ` — ${row.payerName}` : ""}` +
        `${row.payerContact ? ` (${row.payerContact})` : ""}. Fees page par "Bina jude payment" me jaakar ` +
        "sahi student se jod dein, tabhi receipt banegi.",
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    if (err?.code !== 6) throw err;
  }

  logger.warn("payment kisi record se juda nahi — park kar diya", {
    paymentId, amount, notes, referenceId: row.referenceId
  });
}

/* --------------------------------------------------------------------------
   Admission ka pehla payment — yahin student "ban" jaata hai
   --------------------------------------------------------------------------
   PEHLE YAHAN TEEN ALAG-ALAG LIKHAI THI, EK KE BAAD EK, BINA KISI BANDHAN KE:
     1) students/{id} banana
     2) admissions/{id} par studentId chipkana
     3) fees darj karna

   Beech me kuchh bhi toot jaye — function ka timeout, Firestore ka ek pal
   ka jhatka, deploy ke waqt instance ka mar jaana — to haalat kharab ho
   jaati thi. Sabse buri soorat 1 aur 2 ke beech ki thi: student ban chuka
   hai, par admission ko iski khabar hi nahi. Razorpay 500 dekh kar webhook
   DOBARA bhejta hai, code phir se `a.studentId` khali paata hai, aur EK AUR
   student bana deta hai — usi insaan ke do record, do ID. Pehla record
   hamesha ke liye ₹0 par pada rehta.

   Yahi cheez bina kisi crash ke bhi ho sakti thi: Razorpay kabhi-kabhi ek
   hi event do baar, lagbhag ek saath bhejta hai. Dono chalte, dono ko
   `studentId` khali milta, dono student bana dete.

   Ab 1 aur 2 EK transaction me hain. Ya to dono hote hain ya koi nahi.
   Do ek saath chalein to Firestore khud unhe line me laga deta hai — doosre
   ko `studentId` bhara hua milta hai aur wo wahi laut aata hai.
   -------------------------------------------------------------------------- */
async function onAdmissionPaid(admissionId, amount, paymentId) {
  const studentId = await claimStudentId(admissionId);
  await onStudentPaid(studentId, amount, paymentId);

  /* "Aapka admission ho gaya" wali mail — receipt se ALAG.

     Ye ek hi baar jaati hai, chaahe student aage kitni bhi kist bhare, kyunki
     iska naam Student ID se banta hai. Isme wo teen cheezein hain jo student
     baar-baar poochhta hai: uski ID, uska batch, aur agla kadam. */
  try {
    const s = (await db.collection("students").doc(studentId).get()).data() || {};
    const signup = `${SITE}/pages/student/signup.html?email=${encodeURIComponent(s.email || "")}`;
    await sendMail(`admission_${studentId}`, {
      to: s.email,
      subject: `Admission ho gaya — aapki Student ID ${studentId}`,
      text:
        `Namaste ${s.fullName || ""},\n\n` +
        `Soft Skill Zone me aapka admission ho gaya hai.\n\n` +
        `Student ID: ${studentId}\nCourse: ${s.courseName || ""}\n` +
        (s.batchName ? `Batch: ${s.batchName}\n` : "") +
        `\nAgla kadam: apna account bana lijiye — usi email se jo aapne form me diya tha. ` +
        `Student ID yaad rakhne ki zaroorat nahi, wo apne aap jud jaayegi.\n${signup}\n\n` +
        `— Soft Skill Zone Institute`,
      html: wrap("Aapka admission ho gaya", [
        `<p style="margin:0 0 14px;font-size:14px;line-height:1.6">Namaste <strong>${esc(s.fullName || "")}</strong>,
          Soft Skill Zone me aapka swagat hai. Aapki jaankari neeche hai.</p>`,
        table([
          row("Student ID", studentId),
          row("Course", s.courseName || "—"),
          ...(s.batchName ? [row("Batch", s.batchName)] : []),
          ...(s.batchPref ? [row("Timing", s.batchPref)] : [])
        ]),
        `<p style="margin:0 0 18px;font-size:14px;line-height:1.6"><strong>Agla kadam —</strong> apna account bana lijiye,
          usi email se jo aapne form me diya tha. Student ID yaad rakhne ki zaroorat nahi; wo apne aap jud jaayegi.
          Uske baad classes, notes, assignments aur fees — sab ek jagah dikhenge.</p>`,
        button(signup, "Apna account banayein"),
        `<p style="margin:18px 0 0;font-size:12px;color:#6b7280;line-height:1.6">Batch abhi na juda ho to ghabraiye mat —
          institute se baat hote hi wo aapke dashboard me aa jaayega.</p>`
      ].join(""))
    });
  } catch (err) {
    logger.error("admission mail me dikkat", { admissionId, err: err?.message });
  }
}

/**
 * Is admission ka student record — agar hai to wahi, nahi to bana kar.
 * Hamesha ek hi studentId lautata hai, chaahe kitni baar bulao.
 */
async function claimStudentId(admissionId) {
  const admRef = db.collection("admissions").doc(admissionId);

  const first = await admRef.get();
  if (!first.exists) throw new Error(`admission ${admissionId} nahi mila`);
  const a = first.data();

  /* Pehle se approve ho chuka ho (webhook dobara aaya, ya admin ne haath se
     kar diya) to nayi ID banane ki zaroorat hi nahi. */
  if (a.studentId) return a.studentId;

  const year = istYear();
  const course = COURSES[a.courseId] || {};
  const code = course.code || String(a.courseId || "GEN").slice(0, 3).toUpperCase();

  /* Ye teenon transaction ke BAAHAR hone hi padte hain: nextSequence ka apna
     transaction hai (transaction ke andar transaction nahi chalta), aur
     pickBatch ek query hai. Inka bahar hona surakshit hai — inme se koi
     kuchh aisa nahi likhta jise wapas lena pade. Sirf ek chhota kharcha hai:
     race haarne par ye sequence number kisi ke kaam nahi aata, aur student
     IDs me ek number ki khaali jagah reh jaati hai. Do record ban jaane se
     ye bahut sasta sauda hai. */
  const seq = await nextSequence(`students-${year}-${code}`);
  const candidateId = `SSZ${year}${code}${String(seq).padStart(4, "0")}`;
  const batch = await pickBatch(a.courseId, a.batchPref);

  /* Yahan bhi fees admission ke document se nahi — course table se. Wahi
     document jispar client ka bas chalta hai, `totalFee` bhi tay kar deta
     tha; ₹1 wali admission ₹1 ka poora course ban jaati thi.

     Course table me na mile to student banate hi nahi — par PAISA GIRNE
     NAHI DENA. Is galti par error par ek nishaani (`sszPark`) lagti hai,
     jise dekh kar webhook payment ko `unmatchedPayments` me park kar deta
     hai aur admin ko khabar bhej deta hai. Admin panel se "Payment jodein"
     dabaakar wo ek click me sahi student par chadh jaata hai.

     Nishaani ke bina ye error 500 ban jaata, Razorpay baar-baar wahi
     nakaam koshish karta rehta, aur paisa bank me aakar kahin darj hi na
     hota — na fee record, na receipt, na kisi ko khabar. */
  const totalFee = courseFeeOf(a.courseId);
  if (totalFee === null) {
    logger.error("claimStudentId — course table me nahi", { admissionId, courseId: a.courseId });
    const e = new Error(`course ${a.courseId} COURSES table me nahi hai`);
    e.sszPark = true;
    throw e;
  }
  const feePlan = buildFeePlan(totalFee, course.months);

  const studentId = await db.runTransaction(async (tx) => {
    /* Transaction ke ANDAR dobara padhna hi asli taala hai. Bahar wali read
       purani ho sakti hai; ye wali nahi. */
    const admSnap = await tx.get(admRef);
    const cur = admSnap.data() || {};
    if (cur.studentId) return cur.studentId;

    tx.set(db.collection("students").doc(candidateId), {
      studentId: candidateId,
      uid: "",
      rollNo: String(seq).padStart(2, "0"),
      admissionId,
      fullName: a.fullName || "", fatherName: a.fatherName || "", motherName: a.motherName || "",
      dob: a.dob || "", gender: a.gender || "",
      mobile: a.mobile || "", whatsapp: a.whatsapp || "",
      email: String(a.email || "").trim().toLowerCase(),
      address: `${a.address || ""}, ${a.city || ""} - ${a.pincode || ""}`,
      qualification: a.qualification || "",
      courseId: a.courseId || "", courseName: a.courseName || "",
      batchId: batch?.id || "", batchName: batch?.name || "", batchPref: a.batchPref || "",
      photoURL: a.photoURL || "", photoPath: a.photoPath || "", documents: a.documents || [],
      admissionDate: admin.firestore.FieldValue.serverTimestamp(),
      status: "active",
      totalFee,
      paidFee: 0,
      pendingFee: totalFee,
      feePlan,
      nextDueDate: nextDueDate(feePlan, 0)
    });

    tx.set(admRef, {
      status: "approved",
      studentId: candidateId,
      isRead: true,
      approvedBy: "razorpay-webhook"
    }, { merge: true });

    return candidateId;
  });

  if (studentId === candidateId) {
    logger.info("admission approve hua", { admissionId, studentId, batch: batch?.id || null });
  } else {
    logger.info("student pehle hi ban chuka tha — nayi ID chhod di", {
      admissionId, studentId, chhoda: candidateId
    });
  }
  return studentId;
}

/* --------------------------------------------------------------------------
   Fees darj karna — pehli kist ho ya baad ki, dono yahin se
   -------------------------------------------------------------------------- */
async function onStudentPaid(studentId, amount, paymentId) {
  const stuRef = db.collection("students").doc(studentId);

  /* Document ka naam Razorpay ke payment id se banta hai. Wahi webhook
     dobara aaya to yahi document dobara likha jayega — do baar paisa nahi
     ginega. Isi wajah se transaction ke andar pehle iski maujoodgi dekhi
     jaati hai. */
  const feeRef = db.collection("fees").doc(`rzp_${paymentId}`);

  const result = await db.runTransaction(async (tx) => {
    const [feeSnap, stuSnap] = await Promise.all([tx.get(feeRef), tx.get(stuRef)]);

    /* Paisa pehle hi gina ja chuka hai. Par ye maan lena ki "sab ho chuka
       hoga" galat tha: receipt number aur notification is transaction ke
       BAAD bante hain. Agar pichhli baar function beech me hi mar gaya, to
       fees ka record to bana hai par receipt number kabhi nahi mila — aur
       purana code yahin se laut jaata tha, isliye wo receipt hamesha bina
       number ke padi rehti. Ab paisa dobara nahi ginte (wo transaction ka
       kaam hai), par adhoora kaam poora karke jaate hain. */
    if (feeSnap.exists) {
      const f = feeSnap.data() || {};
      const s = stuSnap.exists ? stuSnap.data() : {};
      return {
        duplicate: true,
        receiptNo: f.receiptNo || "",
        amount: rupees(f.amount),
        pendingFee: rupees(s.pendingFee),
        overpaidFee: rupees(s.overpaidFee),
        totalFee: rupees(s.totalFee),
        name: s.fullName || ""
      };
    }
    if (!stuSnap.exists) throw new Error(`student ${studentId} nahi mila`);

    const s = stuSnap.data();
    const paidFee = rupees(s.paidFee) + amount;
    const totalFee = rupees(s.totalFee);
    const plan = Array.isArray(s.feePlan) ? s.feePlan : [];
    /* `pendingFee` hamesha 0 par rok diya jaata hai, isliye kul fees se
       zyada aaya paisa uske neeche dab jaata tha — kahin darj hi nahi hota
       tha. Ab wo alag se likha jaata hai, aur neeche admin ko khabar bhi
       chali jaati hai. Rakam kaati nahi jaati: paisa sach me aaya hai. */
    const overpaidFee = totalFee ? Math.max(0, paidFee - totalFee) : 0;

    tx.set(feeRef, {
      studentId,
      studentName: s.fullName || "",
      courseId: s.courseId || "", courseName: s.courseName || "",
      amount,
      mode: "razorpay",
      status: "paid",
      razorpayPaymentId: paymentId,
      verifiedBy: "razorpay-webhook",
      paidOn: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    tx.set(stuRef, {
      paidFee,
      pendingFee: Math.max(0, totalFee - paidFee),
      overpaidFee,
      nextDueDate: nextDueDate(plan, paidFee)
    }, { merge: true });

    return {
      duplicate: false, paidFee, overpaidFee, totalFee,
      pendingFee: Math.max(0, totalFee - paidFee),
      name: s.fullName || ""
    };
  });

  /* Yahan se aage ka har kadam "jitni baar chalao, natija wahi" wala hai.
     Isliye dobara aaye webhook par bhi hum wapas nahi jaate — jo adhoora
     chhoot gaya tha wo poora karke jaate hain. Paisa upar transaction me
     hi gina ja chuka hai, wo yahan dobara nahi ginega. */
  const amountShown = result.duplicate ? result.amount : amount;
  const pendingShown = result.pendingFee;

  let receiptNo = result.receiptNo || "";
  if (!receiptNo) {
    if (result.duplicate) {
      logger.warn("adhoora record mila — receipt number poora kar rahe hain", { paymentId, studentId });
    }
    /* Receipt number transaction ke BAAHAR — counter ka apna transaction hai
       aur do transaction ek doosre ke andar nahi chal sakte. */
    const year = istYear();
    const seq = await nextSequence(`receipts-${year}`);
    receiptNo = `SSZ/RCPT/${year}/${String(seq).padStart(4, "0")}`;
    await feeRef.set({ receiptNo }, { merge: true });
  }

  /* Notification ka naam bhi payment id se banta hai, aur `add()` ke bajaye
     `create()`. Teen faayde:
       - webhook dobara aaye to doosra sandesh nahi banega
       - receipt ban chuki thi par sandesh reh gaya tha, to ab chala jayega
       - aur — ye sabse zaroori — student ne padh liya ho to `isRead: true`
         mitega nahi. `set()` use mita deta.
     Pehle se maujood hone par create() shikayat karta hai; wahi hamara
     jawab hai, isliye use chupchaap chhod dete hain. */
  try {
    await db.collection("notifications").doc(`rzp_${paymentId}`).create({
      audience: "student",
      studentId,
      title: "Fees mil gayi",
      message: `₹${amountShown.toLocaleString("en-IN")} mil gaye. Receipt ${receiptNo}. ` +
        (pendingShown > 0
          ? `Ab bakaya ₹${pendingShown.toLocaleString("en-IN")} hai.`
          : "Aapki poori fees jama ho gayi — dhanyavaad!"),
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    if (err?.code !== 6 /* ALREADY_EXISTS */) throw err;
  }

  /* --------------------------------------------------------------------
     Kul fees se zyada aa gaya to ADMIN ko khabar

     Yahan koi baitha nahi hota. Admin panel se fee lete waqt to screen par
     chetavni dikh jaati hai, par Razorpay se seedha aaya paisa kisi ko
     kuchh nahi batata tha: `pendingFee` 0 par ruk jaata, student ko "poori
     fees jama ho gayi" chala jaata, aur zyada rakam ka kahin zikr hi nahi
     hota.

     Ye ho kaise sakta hai: student ne ek link se paisa bheja aur webhook
     pahunchne se pehle doosra link bhi khol liya (dono poore bakaye ke
     bane the), ya cash bhi diya aur online bhi.

     Sandesh ka naam payment id se banta hai, isliye webhook dobara aaye to
     doosri khabar nahi banegi. `audience: "admin"` wale sandesh kisi
     student ko nahi jaate — wo sirf Notifications page par dikhte hain. */
  const extra = rupees(result.overpaidFee);
  if (extra > 0) {
    try {
      await db.collection("notifications").doc(`overpaid_${paymentId}`).create({
        audience: "admin",
        studentId,
        title: "Fees se zyada paisa aaya",
        message: `${result.name || studentId} ke khaate me kul fees ` +
          `₹${rupees(result.totalFee).toLocaleString("en-IN")} se ` +
          `₹${extra.toLocaleString("en-IN")} zyada jama ho gaya hai. ` +
          "Ye rakam wapas karni hai ya agle course/kist me jodni hai — faisla aapka.",
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      if (err?.code !== 6 /* ALREADY_EXISTS */) throw err;
    }
    logger.warn("fees se zyada paisa", { studentId, paymentId, extra, totalFee: rupees(result.totalFee) });
  }

  /* Receipt email. Pata student ke RECORD se aata hai, request se nahi.
     Sab kuch try/catch me — mail na jaane se paisa ulta nahi hota. */
  try {
    const sSnap = await stuRef.get();
    const s = sSnap.exists ? sSnap.data() : {};
    const left = rupees(pendingShown);
    await sendMail(`receipt_${paymentId}`, {
      to: s.email,
      subject: `Fees mil gayi — ${inr(amountShown)} · Receipt ${receiptNo}`,
      text:
        `Namaste ${s.fullName || ""},\n\n` +
        `Aapka ${inr(amountShown)} ka payment mil gaya hai.\n` +
        `Receipt No: ${receiptNo}\nStudent ID: ${studentId}\n` +
        (left > 0 ? `Ab bakaya: ${inr(left)}\n` : "Aapki poori fees jama ho gayi — dhanyavaad!\n") +
        `\nReceipt dashboard me bhi rakhi hai: ${SITE}\n\n— Soft Skill Zone Institute`,
      html: wrap("Aapki fees mil gayi", [
        `<p style="margin:0 0 14px;font-size:14px;line-height:1.6">Namaste <strong>${esc(s.fullName || "")}</strong>,
          aapka payment mil gaya hai. Iski receipt neeche hai — ise sambhaal kar rakhiye.</p>`,
        table([
          row("Rakam", inr(amountShown)),
          row("Receipt No.", receiptNo),
          row("Student ID", studentId),
          row("Course", s.courseName || "—"),
          left > 0 ? row("Ab bakaya", inr(left)) : row("Bakaya", "Kuch nahi — poori fees jama")
        ]),
        left > 0
          ? `<p style="margin:0 0 18px;font-size:13px;color:#6b7280;line-height:1.6">Agli kist dashboard me dikh jaayegi.</p>`
          : `<p style="margin:0 0 18px;font-size:13px;color:#6b7280;line-height:1.6">Aapki poori fees jama ho gayi — dhanyavaad!</p>`,
        button(SITE, "Dashboard kholein")
      ].join(""))
    });
  } catch (err) {
    logger.error("receipt mail me dikkat", { paymentId, err: err?.message });
  }

  if (result.duplicate) {
    logger.info("wahi payment dobara aaya — paisa dobara nahi gina", { paymentId, receiptNo });
  } else {
    logger.info("fees darj hui", { studentId, amount: amountShown, receiptNo, pending: pendingShown });
  }
}

/* ==========================================================================
   gradeMcq — MCQ ka result, server par

   PEHLE YE KAAM BROWSER KARTA THA, AUR WAHI SABSE BADI GALTI THI.

   Student ka page khud `assignmentKeys` padhta tha, khud marks ginta tha, aur
   khud apne submission me `marks: N, status: "graded"` likh deta tha. Rules
   pehli baar likhne se rokte hi nahi the (`marks` tab tak null hota hai).
   Matlab console me ek line — `marks: 100, status: "graded"` — aur aapke
   panel me wo bilkul asli graded paper jaisa dikhta. Usi par certificate bhi
   ban jaata.

   Doosra chhed isi ke saath tha: jawab dene ke baad student ko answer key
   padhne ki ijaazat thi (taaki result dikh sake). Wo apne liye to bekaar thi
   — uske apne jawab jam chuke hote hain — par usi key ko WhatsApp par bhej
   dena kaafi tha, aur jis dost ne abhi paper diya hi nahi, use saare jawab
   pehle se mil jaate.

   Ab dono band hain: answer key sirf admin padh sakta hai, aur marks yahan
   lagte hain. Student ka browser sirf "mera result nikaal do" keh sakta hai.

   Ginti wahi hai jo pehle browser me thi, taaki purane record se mel khaye.
   ========================================================================== */
exports.gradeMcq = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Pehle login karein.");

  const assignmentId = String(req.data?.assignmentId || "").trim();
  if (!assignmentId) throw new HttpsError("invalid-argument", "Assignment nahi bataya gaya.");

  /* Kaun maang raha hai — login se, client ke bheje hue Student ID se NAHI.
     Warna koi bhi doosre ka paper "grade" karwa sakta tha. */
  const u = (await db.collection("users").doc(uid).get()).data() || {};
  const studentId = String(u.studentId || "").trim();
  if (!studentId) throw new HttpsError("permission-denied", "Aapka login kisi student record se juda nahi hai.");

  const subRef = db.collection("submissions").doc(`${assignmentId}__${studentId}`);
  const subSnap = await subRef.get();
  if (!subSnap.exists) throw new HttpsError("not-found", "Aapka paper abhi jama nahi hua.");

  const sub = subSnap.data() || {};
  /* Jawab wahi liye jaate hain jo Firestore me pade hain — request me jo aaya
     wo dekha hi nahi jaata. Isi wajah se "sahi jawab bhej kar poore marks"
     wala raasta hai hi nahi. */
  const answers = Array.isArray(sub.answers) ? sub.answers : [];
  if (!answers.length) throw new HttpsError("failed-precondition", "Aapke jawab record me nahi mile.");

  const keySnap = await db.collection("assignmentKeys").doc(assignmentId).get();
  const correct = Array.isArray(keySnap.data()?.correct) ? keySnap.data().correct : [];
  if (!correct.length) throw new HttpsError("failed-precondition", "Is paper ki answer key abhi nahi bani.");

  /* PEHLE SE NUMBER LAG CHUKA HAI TO DOBARA NAHI GINTE.

     Ye function isliye dobara bulaya ja sakta hai ki submit ke theek baad
     net kat jaye — jawab chale gaye, marks nahi lage — aur student "Result
     nikalein" dabaye. Wo halat me `marks` khaali hoti hai, aur ginti chalti
     hai. Theek hai.

     Par jaanch koi thi hi nahi, isliye ek aur raasta khula tha: aapne kisi
     ka paper haath se badal diya — grace ke do number de diye, ya nakal
     pakad kar shunya kiya — aur student console se `gradeMcq` dobara chala
     kar apne aap lage purane number wapas le aata. Feedback bacha rehta,
     isliye pata bhi na chalta ki number badla gaya hai.

     Ab jispar number lag chuka hai uska record chhua hi nahi jaata — wahi
     number wapas bhej diya jaata hai jo Firestore me likha hai. */
  const pehleSe = sub.marks;
  if (pehleSe !== null && pehleSe !== undefined && pehleSe !== "") {
    return { marks: Number(pehleSe) || 0, total: correct.length, already: true };
  }

  const marks = answers.reduce((t, ans, i) => t + (ans === correct[i] ? 1 : 0), 0);

  await subRef.set({
    marks,
    status: "graded",
    gradedAt: admin.firestore.FieldValue.serverTimestamp(),
    autoGraded: true
  }, { merge: true });

  logger.info("mcq grade hua", { assignmentId, studentId, marks, total: correct.length });

  /* PEHLE YAHAN SE POORI ANSWER KEY WAPAS JAATI THI.

     Soch ye thi ki student apna paper dekh sake. Par jawab browser tak
     jaata hai — DevTools ke Network me saaf padha ja sakta hai. Yaani ek
     student jaan-boojh kar galat paper deta, key nikaal kar batch ke group
     me daal deta, aur baaki sabke 100% aa jaate. Jis taale ke liye hamne
     `assignmentKeys` ko rules me band kiya tha, ye usi ko bagal se khol
     deta tha.

     Page is jawab me sirf `marks` istemaal karta hai (student-assignments.js
     ka resultDialog) — isliye key hatane se dikhne me kuchh nahi badalta.
     Paper par charcha class me hoti hai, wahi theek jagah hai. */
  return { marks, total: correct.length };
});

/* ==========================================================================
   feeReminders — kist ki tareekh se pehle ek yaad dilana
   --------------------------------------------------------------------------
   Roz subah 9 baje (Ara ke waqt se) chalta hai.

   KITNI BAAR — ek kist par zyada se zyada DO mail: teen din pehle, aur usi
   din. Iske baad chup. Roz-roz "fees do" bhejna student ko sirf naaraz
   karta hai, aur mail spam me chali jaati hai; ek shaant yaad dilana kaam
   kar jaata hai.

   DOBARA NAHI — har mail ka naam me student ki ID, kist ki tareekh aur
   "kitne din pehle" tinon hote hain. Isliye function roz chale to bhi wahi
   mail dobara nahi jaati (dekhein `sendMail`).

   QUERY EK HI FIELD PAR — sirf `nextDueDate` ki range par. Status, bakaya
   aur email yahin code me chhaante jaate hain. Do field par filter lagate
   hi Firestore composite index maangta, aur ek aur index banwana padta;
   itne chhote list ke liye wo bekaar ka jhamela hai.
   ========================================================================== */
const REMIND_DAYS = [3, 0];          // kitne din pehle (0 = usi din)

exports.feeReminders = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Asia/Kolkata",
    secrets: MAIL_SECRETS
  },
  async () => {
    /* Aaj se lekar sabse door reminder tak ki khidki. */
    const maxDays = Math.max(...REMIND_DAYS);
    const todayStr = dateStr(new Date());
    const from = new Date(`${todayStr}T00:00:00+05:30`);
    const till = new Date(from.getTime() + (maxDays + 1) * 24 * 3600 * 1000);

    const snap = await db.collection("students")
      .where("nextDueDate", ">=", admin.firestore.Timestamp.fromDate(from))
      .where("nextDueDate", "<", admin.firestore.Timestamp.fromDate(till))
      .limit(500)
      .get();

    let sent = 0, looked = 0;

    for (const doc of snap.docs) {
      const s = doc.data() || {};
      looked++;

      if ((s.status || "active") !== "active") continue;
      if (rupees(s.pendingFee) <= 0) continue;
      if (!s.email) continue;

      const due = s.nextDueDate?.toDate ? s.nextDueDate.toDate() : null;
      if (!due) continue;

      const dueStr = dateStr(due);
      /* Din ki ginti IST ki tareekhon se — ghanton se nahi. Warna "3 din
         pehle" kabhi 2.7 din ban jaata hai aur reminder ek din khisak
         jaata hai. */
      const days = Math.round(
        (new Date(`${dueStr}T00:00:00+05:30`) - new Date(`${todayStr}T00:00:00+05:30`)) / 86400000
      );
      if (!REMIND_DAYS.includes(days)) continue;

      /* Kist ki rakam — plan me se wo pehli kist jo abhi poori nahi hui. */
      const plan = Array.isArray(s.feePlan) ? s.feePlan : [];
      let left = rupees(s.paidFee), instalment = 0, no = 0;
      for (const k of plan) {
        const amt = rupees(k.amount);
        if (left >= amt) { left -= amt; continue; }
        instalment = amt - left; no = k.no || 0; break;
      }
      const amount = instalment || rupees(s.pendingFee);

      const when = days === 0 ? "aaj" : `${days} din baad`;
      const ok = await sendMail(`due_${doc.id}_${dueStr}_${days}`, {
        to: s.email,
        subject: days === 0
          ? `Aapki kist aaj due hai — ${inr(amount)}`
          : `Kist ki yaad — ${inr(amount)}, ${days} din baad`,
        text:
          `Namaste ${s.fullName || ""},\n\n` +
          `Aapki ${no ? `kist ${no} ` : ""}${inr(amount)} ki tareekh ${when} (${dueStr}) hai.\n` +
          `Kul bakaya: ${inr(s.pendingFee)}\n\n` +
          `Dashboard se online bhar sakte hain, ya institute aakar de sakte hain: ${SITE}\n\n` +
          `Koi dikkat ho to bata dijiye — hum raasta nikaal lenge.\n\n— Soft Skill Zone Institute`,
        html: wrap(days === 0 ? "Aapki kist aaj due hai" : "Kist ki yaad", [
          `<p style="margin:0 0 14px;font-size:14px;line-height:1.6">Namaste <strong>${esc(s.fullName || "")}</strong>,
            ye sirf ek yaad dilana hai — aapki agli kist ${esc(when)} deni hai.</p>`,
          table([
            ...(no ? [row("Kist", `No. ${no}`)] : []),
            row("Rakam", inr(amount)),
            row("Tareekh", dueStr),
            row("Kul bakaya", inr(s.pendingFee))
          ]),
          `<p style="margin:0 0 18px;font-size:14px;line-height:1.6">Dashboard se online bhar sakte hain,
            ya institute aakar de sakte hain.</p>`,
          button(SITE, "Fees bharein"),
          `<p style="margin:18px 0 0;font-size:12px;color:#6b7280;line-height:1.6">Koi dikkat ho to isi mail ka jawab
            de dijiye ya WhatsApp kar dijiye — hum raasta nikaal lenge.</p>`
        ].join(""))
      });
      if (ok) sent++;
    }

    logger.info("kist reminder chale", { dekhe: looked, bheje: sent });
  }
);

/* ==========================================================================
   3) publishRecording — class ki recording ka link, apne aap
   --------------------------------------------------------------------------
   Pankaj ke laptop par ek chhota program chalta hai. Class khatam hone par
   OBS jo MP4 banata hai, wo program use Google Drive par chadhata hai, uska
   share link leta hai, aur yahan bhej deta hai. Yahan se link us din ki
   class ke saamne chadh jaata hai aur batch ko notification chala jaata hai.

   Pehle ye kaam haath se hota tha: file chadhao, link copy karo, admin panel
   kholo, sahi class dhoondho, paste karo. Paanch kadam, roz. Ab shunya.

   Suraksha: koi bhi is URL par POST kar sakta hai, isliye har request par
   HMAC-SHA256 dastakhat maangte hain — wahi tareeka jo Razorpay webhook me
   hai. Bina sahi dastakhat ke request 401 me hi mar jaati hai, Firestore
   tak pahunchti hi nahi.
   ========================================================================== */

/** IST ke ek din ki shuruaat aur ant — UTC me. Firestore sab UTC me rakhta
    hai, par class "4 August" ki hai ye Ara ke hisaab se tay hota hai. */
function istDayRange(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || "").trim());
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  /* IST = UTC + 5:30, isliye IST ki aadhi raat UTC me pichhle din 18:30 hai. */
  const start = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0) - 5.5 * 3600 * 1000);
  const end = new Date(start.getTime() + 24 * 3600 * 1000 - 1);
  return { start, end };
}

exports.publishRecording = onRequest(
  { secrets: [REC_SECRET] },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("POST only");

    const given = String(req.get("x-ssz-signature") || "");
    const expected = crypto
      .createHmac("sha256", REC_SECRET.value())
      .update(req.rawBody)
      .digest("hex");

    /* Lambai pehle jaanchna zaroori hai — timingSafeEqual alag lambai par
       exception phenk deta hai, aur wo exception hi bata deta ki dastakhat
       galat thi. */
    const ok = given.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));

    if (!ok) {
      logger.warn("recording: dastakhat galat — chhod diya");
      return res.status(401).send("bad signature");
    }

    try {
      const { date, url, batchId, file } = req.body || {};
      if (!url || !/^https?:\/\//i.test(String(url))) {
        return res.status(400).json({ error: "url theek nahi hai" });
      }
      const range = istDayRange(date);
      if (!range) return res.status(400).json({ error: "date YYYY-MM-DD me bhejein" });

      /* Sirf tareekh se dhoondhte hain, batch ka chhanta baad me code me —
         is tarah kisi naye composite index ki zaroorat nahi padti. */
      const snap = await db.collection("liveClasses")
        .where("startsAt", ">=", admin.firestore.Timestamp.fromDate(range.start))
        .where("startsAt", "<=", admin.firestore.Timestamp.fromDate(range.end))
        .get();

      let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => c.status !== "cancelled");

      if (batchId) rows = rows.filter((c) => c.batchId === batchId);

      if (!rows.length) {
        logger.warn("recording: us din koi class nahi mili", { date, batchId });
        return res.status(404).json({ error: "us din koi class nahi mili" });
      }

      /* Do class mil gayin aur batch bataya nahi gaya — galat class par
         recording chadhane se accha hai ki rukein aur bata dein. */
      if (rows.length > 1) {
        logger.warn("recording: ek se zyada class", { date, count: rows.length });
        return res.status(409).json({
          error: "us din ek se zyada class hai — batchId bhi bhejein",
          batches: rows.map((c) => ({ id: c.id, batchId: c.batchId, title: c.title }))
        });
      }

      const cls = rows[0];

      /* Dobara bhej diya (program restart hua, ya file phir se mili) to
         chup-chaap "ho chuka hai" keh dete hain — dobara notification bhej
         kar student ko pareshan nahi karte. */
      /* Recording ka link ab class ke document me NAHI jaata.

         Class ka document poori batch padh sakti hai, aur rules poore
         document par lagte hain — kisi ek field par nahi. Isliye link wahan
         rakhne ka matlab tha ki bina approve wali recording bhi usi batch ka
         koi bhi student console se nikaal leta. Ab link `classRecordings`
         me jaata hai, jahan rule me `published` ki shart lagti hai; class ke
         document me sirf jhandi rehti hai. */
      const recRef = db.collection("classRecordings").doc(cls.id);
      const prev = (await recRef.get()).data() || {};
      if (prev.url === url && prev.published) {
        return res.status(200).json({ ok: true, already: true, classId: cls.id });
      }

      await recRef.set({
        classId: cls.id,
        /* Rule isi se dekhta hai ki maangne wala usi batch ka hai ya nahi —
           class ka document padhe bina. */
        batchId: cls.batchId || "",
        url: String(url),
        published: true,
        file: String(file || ""),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      await db.collection("liveClasses").doc(cls.id).set({
        hasRecording: true,
        recordingPublished: true,
        recordingFile: String(file || ""),
        /* Purana link, agar pada ho, yahin saaf ho jaata hai. */
        recordingURL: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      if (cls.batchId) {
        await db.collection("notifications").add({
          audience: "batch",
          batchId: cls.batchId,
          studentId: "",
          title: "Class ki recording aa gayi",
          message: `${cls.title || "Class"} ki recording ab dashboard me dekh sakte hain.`,
          type: "class",
          priority: "normal",
          readBy: [],
          createdBy: "recording-bot",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      logger.info("recording chadh gayi", { classId: cls.id, date, file });
      return res.status(200).json({ ok: true, classId: cls.id, title: cls.title });
    } catch (err) {
      logger.error("recording fail", err);
      return res.status(500).json({ error: "andar dikkat aayi" });
    }
  }
);

/* ==========================================================================
   4) admissionStatus — "meri Student ID bani kya?"
   --------------------------------------------------------------------------
   Payment ke baad admission page yahi poochhta rehta hai. Jaise hi webhook
   Student ID bana deta hai, page us par card badal kar ID, batch aur agli
   kist dikha deta hai.

   Iske bina student payment karke khaali page par baitha rehta tha — usse
   pata hi nahi chalta tha ki uska admission ho chuka hai. Wahi jagah thi
   jahan wo haath se nikal jaata.

   Suraksha: application number sequential hai (0005, 0006…), yaani koi bhi
   andaza laga sakta hai. Isliye email BHI maanga jaata hai, aur wo record se
   milna chahiye. Na mile to wahi "nahi mila" jawab jaata hai jo galat number
   par jaata — taaki koi ye bhi na jaan sake ki record hai ya nahi.

   Yahan koi secret nahi lagta: ye kisi ko kuchh badalne nahi deta, sirf ye
   batata hai ki jo payment usne abhi kiya wo pahuncha ya nahi.
   ========================================================================== */
exports.admissionStatus = onCall({ cors: true }, async (req) => {
  const appNo = String(req.data?.appNo || "").trim();
  const email = String(req.data?.email || "").trim().toLowerCase();
  if (!appNo || !email) throw new HttpsError("invalid-argument", "appNo aur email dono chahiye.");

  const snap = await db.collection("admissions").doc(appNo).get();
  const a = snap.exists ? snap.data() : null;

  if (!a || String(a.email || "").trim().toLowerCase() !== email) {
    throw new HttpsError("not-found", "Record nahi mila.");
  }

  if (!a.studentId) return { ready: false, status: a.status || "pending" };

  const sSnap = await db.collection("students").doc(a.studentId).get();
  const s = sSnap.exists ? sSnap.data() : {};

  return {
    ready: true,
    status: a.status || "approved",
    studentId: a.studentId,
    courseName: s.courseName || a.courseName || "",
    batchName: s.batchName || "",
    paidFee: rupees(s.paidFee),
    pendingFee: rupees(s.pendingFee),
    /* Date ko seedha nahi bhejte — JSON me Timestamp ka roop bigad jaata
       hai. Saaf "YYYY-MM-DD" bhejna dono taraf ek jaisa padha jaata hai. */
    nextDueDate: s.nextDueDate?.toDate ? dateStr(s.nextDueDate.toDate()) : ""
  };
});

/* ==========================================================================
   5) attachPayment — bina jude payment ko sahi student se jodna
   --------------------------------------------------------------------------
   Jab webhook ko pata na chale ki paisa kiska hai, wo use
   `unmatchedPayments` me park kar deta hai. Admin panel se aap wahan se
   student chunte hain aur ye function baaki sab kar deta hai — wahi raasta
   jo asli webhook chalta hai (`onStudentPaid`), isliye receipt, bakaya aur
   student ko sandesh, sab ek jaise bante hain.

   Yahan browser se rakam nahi li jaati. Rakam wahi maani jaati hai jo park
   kiye gaye record me likhi hai — yaani jo Razorpay ne bheji thi. Admin
   panel se aane wale number par bharosa karna wahi galti hoti jo hamne
   createPaymentLink me theek ki thi.
   ========================================================================== */
/* Ye bhi onStudentPaid chalata hai, isliye ise bhi mail ke secrets chahiye. */
exports.attachPayment = onCall({ cors: true, secrets: MAIL_SECRETS }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Pehle login karein.");

  const u = (await db.collection("users").doc(uid).get()).data() || {};
  /* Sirf `role` dekhna kaafi nahi — block kiya hua admin bhi role admin hi
     rehta hai. Dekhein `isLiveAdmin` ke upar wali tippani. */
  if (!isLiveAdmin(u)) {
    logger.warn("attachPayment — admin ke bina koshish", { uid, role: u.role, status: u.status });
    throw new HttpsError("permission-denied", "Sirf admin.");
  }

  const paymentId = String(req.data?.paymentId || "").trim();
  const studentId = String(req.data?.studentId || "").trim();
  if (!paymentId || !studentId) {
    throw new HttpsError("invalid-argument", "paymentId aur studentId dono chahiye.");
  }

  const parkRef = db.collection("unmatchedPayments").doc(`rzp_${paymentId}`);
  const feeRef = db.collection("fees").doc(`rzp_${paymentId}`);

  const stuSnap = await db.collection("students").doc(studentId).get();
  if (!stuSnap.exists) throw new HttpsError("not-found", "Student nahi mila.");

  /* --------------------------------------------------------------------------
     "Ye payment mera hai" — dawa transaction ke andar

     PEHLE YE TEEN ALAG KADAM THE: padho -> "attached to nahi hai?" -> credit
     karo -> phir status likho. Beech me `await` tha, aur usi khidki me
     doosra admin bhi wahi payment jod sakta tha.

     Do admin, ek hi parked payment, alag-alag student:
       A -> status "unmatched" mila, aage badha, Rohit ko ₹3,000 mil gaye
       B -> wahi purana "unmatched" mila, aage badha, par onStudentPaid ne
            dekha ki fees/rzp_<id> pehle se hai, to kuchh nahi chadhaya —
            AUR PHIR B ne record par Rohan ka naam likh diya.

     Natija: paisa Rohit par, receipt Rohit ki, par record kehta tha Rohan —
     aur B ki screen par hara toast "Rohan ke khaate me chadh gaya".

     Ab dawa transaction ke andar hota hai: sirf wahi aage badh sakta hai jo
     "unmatched" ko "attached" me badalne me kaamyaab ho. Doosre ko saaf
     jawab milta hai ki ye kis student se jud chuka hai.
     -------------------------------------------------------------------------- */
  const claim = await db.runTransaction(async (tx) => {
    const snap = await tx.get(parkRef);
    if (!snap.exists) throw new HttpsError("not-found", "Ye payment list me nahi mila.");
    const p = snap.data();
    const amount = rupees(p.amount);

    if (p.status === "attached") {
      /* Pehle se juda hua hai. Kisi AUR student se juda ho to ye galti hai —
         chup-chaap "ho gaya" kehna sabse bura jawab hoga. */
      if (p.studentId && p.studentId !== studentId) {
        return { conflict: true, other: p.studentId, amount };
      }
      /* Usi student se juda hai. Par kya paisa sach me chadha tha? Agar
         pichhli baar dawa ke baad crediting fail ho gayi thi, to fees ka
         record banega hi nahi. Wo neeche jaanch kar poora kar dete hain. */
      return { already: true, amount };
    }

    if (!amount) throw new HttpsError("failed-precondition", "Is payment ki rakam saaf nahi hai.");

    tx.update(parkRef, {
      status: "attached",
      studentId,
      attachedBy: uid,
      attachedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { already: false, amount };
  });

  if (claim.conflict) {
    logger.warn("ye payment kisi aur student se jud chuka hai", { paymentId, maanga: studentId, juda: claim.other });
    throw new HttpsError(
      "failed-precondition",
      `Ye payment pehle hi ${claim.other} se jod diya gaya hai. Dobara nahi joda ja sakta.`
    );
  }

  const amount = claim.amount;

  /* Dawa ho chuka hai; ab paisa chadhate hain. `onStudentPaid` khud idempotent
     hai (fees/rzp_<id> ke naam par), isliye dobara chalne par paisa dobara
     nahi ginta — aur jo adhoora reh gaya tha wo poora ho jaata hai. */
  if (claim.already) {
    const feeSnap = await feeRef.get();
    if (feeSnap.exists) {
      logger.info("ye payment pehle hi jud chuka tha", { paymentId, studentId });
      return { ok: true, alreadyDone: true, studentId, amount };
    }
    /* Record kehta hai "attached" par paisa kahin chadha hi nahi — pichhli
       baar beech me kuchh toot gaya tha. Ab poora kar dete hain. */
    logger.warn("attached tha par paisa nahi chadha tha — ab poora kar rahe hain", { paymentId, studentId });
  }

  await onStudentPaid(studentId, amount, paymentId);

  logger.info("bina juda payment jod diya gaya", { paymentId, studentId, amount, by: uid });
  return { ok: true, studentId, amount };
});


/* ==========================================================================
   Seat ki ginti apne aap — settings/azadi ka seatsTaken
   --------------------------------------------------------------------------
   Website ke banner par "80 me se X seat bhar chuki hain" wali patti isi ek
   field se chalti hai. Pehle ye number haath se Firebase console me badalna
   padta tha, aur wahi sabse pehle bhoola jaata hai: banner mahine bhar "0"
   dikhata rehta, jo bechne ke bajaye ulta nuksaan karta hai.

   YE TRIGGER KYUN, DONO JAGAH GINTI KYUN NAHI

   Student do raaston se banta hai: admin panel ke "Approve" se, aur payment
   aane par webhook ke `claimStudentId` se. Ginti dono jagah likhne ka matlab
   hota do jagah yaad rakhna — aur aaj hi hum wahi galti bhugat chuke hain
   (course website me juda tha, function ki table me nahi, aur payment ruk
   gaya). Isliye ginti wahan se hoti hai jahan dono raaste milte hain: student
   ka document banne par. Ek jagah, dono raaste.

   `increment` isliye ki do admission ek saath ho jaayein to bhi ginti nahi
   bigadti — Firestore khud jodta hai, padh kar likhne me race lag jaati.

   Ye trigger sirf ek document par likhta hai. Kabhi fail bhi ho jaaye to
   student ka banna nahi rukta — ginti thodi peeche reh jaayegi, bas. Isi
   liye ise student banane wale code ke andar nahi rakha.
   ========================================================================== */
exports.countAzadiSeat = onDocumentCreated("students/{studentId}", async (event) => {
  const s = event.data?.data();
  if (!s || s.courseId !== AZADI.courseId) return;

  try {
    await db.collection("settings").doc("azadi").set(
      { seatsTaken: admin.firestore.FieldValue.increment(1) },
      { merge: true }
    );
    logger.info("azadi seat ginti badhi", { studentId: event.params.studentId });
  } catch (e) {
    /* Ginti se zyada zaroori student ka record hai — isliye yahan sirf
       likhte hain, phenkte nahi. */
    logger.error("azadi seat ginti nahi badh payi", { studentId: event.params.studentId, err: e.message });
  }
});


/* ==========================================================================
   Nova ki awaaz — Google Text-to-Speech
   --------------------------------------------------------------------------
   Chatbot ka jawab yahan bhejo, MP3 waapas milta hai.

   YAHAN KYUN, BROWSER ME KYUN NAHI

   Browser ki apni `speechSynthesis` muft hai, par uski awaaz har phone par
   alag hoti hai aur saste Android me hi-IN voice hoti hi nahi — wahan wo
   Hindi ko angrezi lehje me padhta hai, jo sunne me bura lagta hai. Google
   ki awaaz har phone par ek jaisi aur saaf hai.

   API key yahan isliye rakhi hai ki browser me rakhne ka matlab hota use
   duniya ko de dena — koi bhi uthaakar apna kaam chalata, bill aapka aata.

   TEEN ROKEIN — kyunki ye function bina login ke bhi chalta hai (website
   par aane wale ko login nahi karwana hai):

     1. Ek baar me 420 akshar se zyada nahi. Lamba jawab ek hi request me
        bhejne par Google mana kar deta hai (neeche "NAKAAM HONE PAR" wala
        hissa dekhein), aur kharcha aksharon se hi ginta hai. Poora lamba
        jawab bolwana ho to client use tukdon me todkar bhejta hai.
     2. Din bhar ki hadd — settings/novaVoice ka `dailyCap`. Hadd paar hote
        hi ye khaali haath lautta hai aur browser apni awaaz se kaam chala
        leta hai. Awaaz band ho jaana theek hai; bill khula chhodna nahi.

   HADD 30,000 HI KYUN

   Chirp 3: HD par Google har mahine 10 lakh akshar muft deta hai, uske baad
   $30 per 10 lakh. 30,000 x 31 din = 9.3 lakh — yaani sabse bure mahine me
   bhi bill sifar rehta hai. 40,000 rakhte to 12.4 lakh ho jaata aur mahina
   khatam hone se pehle paise lagne lagte. 30,000 akshar matlab roz kareeb
   100 jawab; abhi ki bheed se kai guna zyada hai.

   VOICE KA NAAM

   Default `hi-IN-Chirp3-HD-Umbriel` hai — Chirp 3: HD, yaani Google ki
   sabse naye dhang ki Hindi awaaz, sunne me sabse kam robot jaisi. Sirf
   `languageCode` bhejne par Google purani Standard awaaz deta hai, jo
   bhadde lehje me padhti hai, isliye naam dena hi behtar hai.

   MARD KI AWAAZ HI KYUN — Nova apne baare me "sahayak hoon", "deta hoon"
   kehta hai (js/chat/knowledge.js). Awaaz aurat ki lagti to likhe hue aur
   sune hue me mel nahi baithta. Naam chunte waqt ye dekh lena zaroori hai.

   Naam kabhi hataya ja sakta hai, isliye do raaste khule rakhe hain aur
   dono bina deploy ke: settings/novaVoice me `voice` likh dijiye, ya ek
   baar ke liye request me hi `voice` bhej dijiye (sirf hi-IN wali chalti
   hain, taaki koi mehengi bhasha na chun le). Kaun-kaun si mil sakti hain
   ye dekhne ke liye is function ko { list: true } bhejiye.

   Chirp wali awaazein `pitch` nahi maanti — Google us request ko hi mana
   kar deta hai — isliye pitch sirf purani (Neural2/Wavenet/Standard) ke
   saath bheja jaata hai.
   ========================================================================== */
const TTS_MAX_CHARS = 420;
const TTS_DEFAULT_VOICE = "hi-IN-Chirp3-HD-Umbriel";
const TTS_DEFAULT_DAILY_CAP = 30000;      // ~100 jawab roz, muft hisse ke andar
const TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";
const TTS_VOICES_URL = "https://texttospeech.googleapis.com/v1/voices";

/** Bolne layak text — nishaan hataakar, chhota karke. */
function speakable(raw, limit = TTS_MAX_CHARS) {
  let t = String(raw || "")
    .replace(/\*\*/g, "")                 // **bold** ke taare
    .replace(/https?:\/\/\S+/g, "link")   // URL bolna bekaar hai
    .replace(/\s+/g, " ")
    .trim();

  if (t.length <= limit) return t;

  /* Beech-vaakya kaatne se jawab adhoora lagta hai. Isliye hadd se pehle ka
     aakhri poornviram dhoondh kar wahin rok dete hain. */
  const cut = t.slice(0, limit);
  const stop = Math.max(cut.lastIndexOf("। "), cut.lastIndexOf(". "), cut.lastIndexOf("? "));
  return (stop > limit * 0.4 ? cut.slice(0, stop + 1) : cut).trim();
}

exports.novaSpeak = onCall({ secrets: [GOOGLE_TTS_KEY], cors: true }, async (req) => {
  const key = GOOGLE_TTS_KEY.value();
  if (!key) throw new HttpsError("failed-precondition", "Voice ki key set nahi hai.");

  const cfgRef = db.collection("settings").doc("novaVoice");
  const cfg = (await cfgRef.get()).data() || {};

  /* Kaun si awaazein mil sakti hain — sirf dekhne ke liye. */
  if (req.data?.list) {
    const r = await fetch(`${TTS_VOICES_URL}?languageCode=hi-IN&key=${encodeURIComponent(key)}`);
    const j = await r.json();
    return { voices: (j.voices || []).map((v) => ({ name: v.name, gender: v.ssmlGender })) };
  }

  const text = speakable(req.data?.text);
  if (!text) throw new HttpsError("invalid-argument", "Bolne ke liye kuchh nahi mila.");

  /* ---- Din bhar ki hadd ---- */
  const today = dateStr(new Date());
  const cap = Number(cfg.dailyCap) > 0 ? Number(cfg.dailyCap) : TTS_DEFAULT_DAILY_CAP;
  const usedToday = cfg.day === today ? Number(cfg.chars) || 0 : 0;

  if (usedToday + text.length > cap) {
    logger.warn("nova voice — aaj ki hadd poori", { usedToday, cap });
    return { capped: true };            // client apni awaaz se bol lega
  }

  /* ---- Awaaz banwao ---- */
  const asked = String(req.data?.voice || "");
  const name = /^hi-IN-[\w-]+$/.test(asked) ? asked : String(cfg.voice || TTS_DEFAULT_VOICE);

  const audioConfig = { audioEncoding: "MP3", speakingRate: 1.0 };
  if (!/Chirp/i.test(name)) audioConfig.pitch = 0;

  const ask = (t) => fetch(`${TTS_URL}?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text: t },
      voice: { languageCode: "hi-IN", name },
      audioConfig
    })
  });

  let spoken = text;
  let res = await ask(spoken);

  /* -------------------------------------------------------------------
     NAKAAM HONE PAR EK BAAR CHHOTA KARKE DOBARA

     Chirp 3: HD ki hadd akshar ginkar nahi lagti. Google pehle text ko
     bolne layak roop me kholta hai — "1,947" ban jaata hai "ek hazaar nau
     sau saintalis" — aur hadd USI khule hue roop par lagti hai. Isliye
     course-list jaise jawab, jinme daam hi daam hote hain, 550 akshar par
     bhi mana ho jaate the, jabki bina number wala 590 akshar ka jawab
     aaram se ban jaata tha.

     Sirf hadd ghata dena kaafi nahi — number kitne honge ye pehle se pata
     nahi. Isliye mana hote hi aadha karke ek baar aur poochhte hain. Do
     koshish me lagbhag har jawab nikal jaata hai, aur kabhi na nikle to
     chup rehna hi theek hai (jawab likha hua saamne hai).
     ------------------------------------------------------------------- */
  if (!res.ok) {
    const first = await res.text();
    const shorter = speakable(spoken, Math.floor(spoken.length / 2));
    logger.warn("nova voice — pehli koshish mana hui, chhota karke dobara", {
      status: res.status, chars: spoken.length, ab: shorter.length,
      body: first.slice(0, 300)
    });
    if (shorter && shorter.length < spoken.length) {
      spoken = shorter;
      res = await ask(spoken);
    }
  }

  if (!res.ok) {
    const body = await res.text();
    logger.error("nova voice — Google ne mana kiya", { status: res.status, chars: spoken.length, body: body.slice(0, 300) });
    /* Phenkte nahi — client chup ho jaata hai. Jawab likha hua to dikh hi
       raha hai; awaaz na aane par chat rukni nahi chahiye. */
    return { failed: true };
  }

  const { audioContent } = await res.json();
  if (!audioContent) return { failed: true };

  /* Ginti baad me — paisa kharch hone ke BAAD. Pehle ginte to nakaam
     koshishein bhi hadd kha jaatin. Ginti `spoken` ki, `text` ki nahi:
     nakaam pehli koshish ka bhi paisa nahi lagta, aur chhote kiye hue
     text ka utna hi lagta hai jitna wo hai. */
  await cfgRef.set(
    cfg.day === today
      ? { chars: admin.firestore.FieldValue.increment(spoken.length) }
      : { day: today, chars: spoken.length },
    { merge: true }
  ).catch((e) => logger.error("nova voice ginti nahi likhi", { err: e.message }));

  return { audio: audioContent, mime: "audio/mpeg", chars: spoken.length, voice: name };
});
