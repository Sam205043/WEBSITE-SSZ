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
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const crypto = require("crypto");
const Razorpay = require("razorpay");

admin.initializeApp();
const db = admin.firestore();

/* Firestore aur Storage dono asia-south1 me hain — function bhi wahin rakha
   hai, taaki har read-write ka safar chhota rahe. */
setGlobalOptions({ region: "asia-south1", maxInstances: 5 });

const RZP_KEY_ID = defineSecret("RZP_KEY_ID");
const RZP_KEY_SECRET = defineSecret("RZP_KEY_SECRET");
const RZP_WEBHOOK_SECRET = defineSecret("RZP_WEBHOOK_SECRET");

/* Class recording ka link chadhane wala raasta. Isse Pankaj ke laptop par
   chalne wala chhota program baat karta hai — wahi secret dono taraf hai. */
const REC_SECRET = defineSecret("REC_SECRET");

/* --------------------------------------------------------------------------
   Course ki jaankari

   Ye website ke js/config/site-data.js se li gayi hai. Function browser ka
   module import nahi kar sakta, isliye yahan dobara likhni padi.

   >>> Fees ya duration badlein to DONO jagah badalna — warna Student ID ka
   >>> code ya kist ka plan galat banega. <<<
   -------------------------------------------------------------------------- */
const COURSES = {
  "ai-dca":           { code: "DCA", months: 6,  fee: 6000 },
  "ai-tally-prime":   { code: "TLY", months: 3,  fee: 5000 },
  "python-314":       { code: "PYT", months: 4,  fee: 7000 },
  "adca":             { code: "ADC", months: 12, fee: 10000 },
  "ai-video-editing": { code: "VID", months: 3,  fee: 6500 },
  "icom":             { code: "ICM", months: 24, fee: 12000 },
  "bcom":             { code: "BCM", months: 36, fee: 18000 },
  "gst-2":            { code: "GST", months: 2,  fee: 4500 },
  "income-tax-2025":  { code: "ITX", months: 2,  fee: 4500 },
  "tds-finance-2025": { code: "TDS", months: 2,  fee: 3500 }
};

/* Admission ke waqt kam se kam itna hissa — baaki kisten ban jaati hain. */
const MIN_SHARE = 0.10;

/* ==========================================================================
   Chhoti madad
   ========================================================================== */

const rupees = (n) => Math.max(0, Math.round(Number(n) || 0));

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
    if (u.role === "admin") return;                       // admin kisi ke liye bhi
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
      if (sSnap.exists) { feeRec = sSnap.data(); feeKind = "student"; }
    }

    /* Asli rakam yahin tay hoti hai. Client jo bheje, uski hadd hum lagate
       hain — warna ₹10,000 ki fees ₹1 me bhar li jaati. */
    const total = feeKind === "admission"
      ? rupees((feeRec.courseFee || 0) + (feeRec.admissionFee || 0))
      : rupees(feeRec.totalFee);
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

    const rzp = new Razorpay({
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
  { secrets: [RZP_WEBHOOK_SECRET], cors: false },
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

      if (target.kind === "admission") await onAdmissionPaid(target.id, amount, paymentId);
      else await onStudentPaid(target.id, amount, paymentId);

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

  const totalFee = rupees((a.courseFee || 0) + (a.admissionFee || 0));
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

  if (result.duplicate) {
    logger.info("wahi payment dobara aaya — paisa dobara nahi gina", { paymentId, receiptNo });
  } else {
    logger.info("fees darj hui", { studentId, amount: amountShown, receiptNo, pending: pendingShown });
  }
}

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
exports.attachPayment = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Pehle login karein.");

  const u = (await db.collection("users").doc(uid).get()).data() || {};
  if (u.role !== "admin") {
    logger.warn("attachPayment — admin ke bina koshish", { uid });
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
