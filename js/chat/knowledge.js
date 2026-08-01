/* ==========================================================================
   Soft Skill Zone — Chatbot ka knowledge base
   --------------------------------------------------------------------------
   Yahan har jawab institute ke apne data se banta hai (site-data.js aur, jab
   student logged in ho, Firestore se). Isliye fees, duration ya timing kabhi
   galat nahi ja sakti — number ek hi jagah se aata hai.

   Kaam karne ka tarika:
     1. Sawaal ko normalize karo (chhote akshar, bina chihn, Hindi + Hinglish).
     2. Har intent ke keywords se score nikalo.
     3. Score MIN_SCORE se upar ho tabhi jawab do.
     4. Warna null lauta do — upar wali layer AI se poochhegi, aur wo bhi na
        ho to WhatsApp par bhej degi.

   Jaanbujh kar "shayad" wala jawab nahi dete. Institute ke naam par aadha-
   adhoora jawab dene se accha hai keh dena ki insaan se baat kara dete hain.
   ========================================================================== */

import { COURSES, INSTITUTE, TOOLS, activeCourses } from "../config/site-data.js";
import { money, formatPhone } from "../core/utils.js";

/* Sahayak ka naam. Ek hi jagah likha hai — badalna ho to sirf yahi line.
   "Sarathi" = rath chalane wala: jo raasta jaanta hai aur manzil tak le
   jaata hai, par shrey nahi leta. */
export const BOT_NAME = "Sarathi";

/* ==========================================================================
   Text normalise
   ========================================================================== */

/* Log me dikha hai ki log ek hi cheez ko kai tarah likhte hain — "fees",
   "fis", "फीस", "phees". Inhe ek roop me badal dete hain taaki har intent me
   dobara-dobara na likhna pade. */
const SPELLING = [
  [/\bfis+\b|\bphee?s\b|\bfeee?s\b|फ़ीस|फीस|शुल्क/g, "fees"],
  [/\bkitni?a?\b|कितना|कितनी|कितने/g, "kitna"],
  [/\bkab\b|कब/g, "kab"],
  [/\bkaha[an]*\b|कहाँ|कहां/g, "kahan"],
  [/\bkaise?\b|कैसे|कैसा/g, "kaise"],
  [/\bkya\b|क्या/g, "kya"],
  [/\bcorse\b|\bcors\b|\bcourc\w*\b|कोर्स/g, "course"],
  [/\badmis+ion\b|\badmisn\b|दाखिला|एडमिशन/g, "admission"],
  [/\bkist\b|\bkisht\b|किस्त|\binstal+ment\b|\binstalment\b/g, "installment"],
  [/\bhazri\b|\bhaziri\b|हाजिरी|उपस्थिति/g, "attendance"],
  [/\bpramaa?n\s*patra\b|प्रमाण\s*पत्र|सर्टिफिकेट/g, "certificate"],
  [/\bnauk[ai]?ri\b|नौकरी|\bjob\b|\bkaam\b|काम/g, "job"],
  [/\bsamay\b|समय|\btiming?s?\b/g, "timing"],
  [/\bpata\b|पता|\baddres+\b/g, "address"],
  /* "no" jaanbujh kar nahi hai: angrezi ka "no" ("nahi") bhi isme fans
     jaata tha, aur "no" kehne wale ko phone number mil jaata tha. */
  [/\bmobile\b|\bnumber\b|नंबर|फोन/g, "phone"],
  [/\bsikh\w*\b|\bseekh\w*\b|सीख/g, "seekh"],
  [/\bpadh\w*\b|पढ़|पढ/g, "padhai"],
  [/\bghar\s*se\b|घर\s*से/g, "gharse"],
  [/\bmuft\b|मुफ़्त|मुफ्त|\bfree\b/g, "free"]
];

export function normalize(text) {
  let s = String(text || "").toLowerCase();
  SPELLING.forEach(([re, to]) => { s = s.replace(re, to); });
  /* \p{M} bhi rakhna zaroori hai — Devanagari ki matra aur halant is
     shreni me aate hain. Inke bina "नमस्ते" tootkar "नमस त" ban jaata tha,
     aur har Devanagari keyword bekaar ho jaata tha. */
  s = s.replace(/[^\p{L}\p{N}\p{M}]+/gu, " ").replace(/\s+/g, " ").trim();
  return ` ${s} `;   // gaps taaki \bword\b jaisa match aasaan ho
}

/** Kitne keywords mile — phrase (space wale) ko zyada weight, kyunki wo
    ittefaq se nahi milte. */
function score(norm, keywords) {
  let total = 0;
  for (const k of keywords) {
    if (norm.includes(` ${k} `) || norm.includes(` ${k}`) && k.includes(" ")) {
      total += k.includes(" ") ? 3 : 1;
    }
  }
  return total;
}

const MIN_SCORE = 1;

/* ==========================================================================
   Course pehchaanna
   ========================================================================== */
const COURSE_ALIASES = {
  "ai-dca":            ["dca", "d c a", "diploma computer"],
  "ai-tally-prime":    ["tally", "tali", "टैली", "accounting"],
  "python-314":        ["python", "पाइथन", "programming", "coding"],
  "adca":              ["adca", "a d c a", "advance diploma"],
  "ai-video-editing":  ["video editing", "video", "editing", "reels", "youtube"],
  "icom":              ["i com", "icom", "intermediate commerce"],
  "bcom":              ["b com", "bcom", "bachelor commerce", "graduation"],
  "gst-2":        ["gst", "जीएसटी"],
  "income-tax-2025":   ["income tax", "itr", "आयकर"],
  "tds-finance-2025":          ["tds", "टीडीएस"]
};

export function findCourse(norm) {
  let best = null, bestScore = 0;
  for (const c of activeCourses()) {
    const keys = [
      c.title.toLowerCase(),
      c.shortTitle.toLowerCase(),
      c.code.toLowerCase(),
      ...(COURSE_ALIASES[c.id] || [])
    ].filter(Boolean);
    const s = score(norm, keys);
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return bestScore ? best : null;
}

/* ==========================================================================
   Chhote helpers
   ========================================================================== */
const wa = () => INSTITUTE.whatsapp || INSTITUTE.phone;
const phone = () => formatPhone(INSTITUTE.phone);

function courseLine(c) {
  return `• **${c.title}** — ${money(c.fee)}, ${c.durationMonths} mahine`;
}

function courseDetail(c) {
  return [
    `**${c.title}**`,
    c.tagline,
    "",
    `**Fees:** ${money(c.fee)} (poora course)`,
    `**Duration:** ${c.durationMonths} mahine`,
    `**Kaun le sakta hai:** ${c.eligibility.join(", ")}`,
    "",
    `**Kya seekhenge:**`,
    ...c.highlights.map((h) => `• ${h}`),
    "",
    `**Iske baad kya kaam:** ${c.careerOptions.join(", ")}`
  ].join("\n");
}

/* ==========================================================================
   Aam sawaal — bina login ke
   ========================================================================== */
const PUBLIC_INTENTS = [
  {
    id: "greeting",
    keys: ["hi", "hello", "hey", "namaste", "namaskar", "pranam", "salam", "नमस्ते", "हेलो"],
    answer: () => ({
      text: `Namaste! Main ${BOT_NAME} hoon, ${INSTITUTE.shortName} ka sahayak.\n\nCourse, fees, admission ya timing — jo poochhna ho poochh lijiye. Student hain to login karke apni fees aur attendance bhi dekh sakte hain.`,
      chips: ["Kaun kaun se course hain?", "Fees kitni hai?", "Admission kaise lein?"]
    })
  },
  {
    id: "thanks",
    keys: ["thanks", "thank", "shukriya", "dhanyavad", "धन्यवाद", "शुक्रिया", "ok thik", "thik hai"],
    answer: () => ({ text: "Koi baat nahi. Aur kuch poochhna ho to bata dijiye.", chips: ["Course dekhein", "Admission kaise lein?"] })
  },
  {
    id: "bye",
    keys: ["bye", "alvida", "chalta hoon", "phir milte"],
    answer: () => ({ text: `Theek hai, milte hain. Kabhi bhi WhatsApp kar lijiye: ${phone()}` })
  },
  {
    id: "whoareyou",
    keys: ["tum kaun", "aap kaun", "who are you", "bot", "kaun ho", "tumhara naam", "naam kya", "sarathi", "insaan ho", "aadmi ho", "robot"],
    answer: () => ({
      text: `Mera naam **${BOT_NAME}** hai — ${INSTITUTE.name} ki website ka sahayak. Ek program hoon, insaan nahi.\n\nSarathi wo hota hai jo raasta jaanta hai aur manzil tak pahunchata hai. Course, fees, timing aur admission ki pakki jaankari de sakta hoon. Jo mujhe na pata ho, us par andaaza nahi lagata — seedhe institute se baat kara deta hoon.`,
      chips: ["Course dekhein", "Baat karni hai"]
    })
  },

  {
    id: "courses",
    keys: ["course", "courses", "kya kya", "konsa", "kaunsa", "list", "padhai", "seekh", "programme", "kya sikhaya", "batao course"],
    answer: () => ({
      text: [
        `Hamare paas abhi ${activeCourses().length} course hain:`,
        "",
        ...activeCourses().map(courseLine),
        "",
        "Kisi ek ka naam likhiye — poori detail bata deta hoon."
      ].join("\n"),
      chips: ["AI Powered DCA", "Tally Prime", "GST course"],
      link: { label: "Saare courses dekhein", route: "courses" }
    })
  },
  {
    id: "fees",
    keys: ["fees", "price", "kharcha", "paisa", "rupay", "rupaye", "cost", "charge", "kitna lagta", "kitne ka"],
    answer: (ctx, course) => {
      if (course) {
        return {
          text: `**${course.title}** ki fees **${money(course.fee)}** hai — poore ${course.durationMonths} mahine ki.\n\nKoi alag se admission fee nahi lagti. Installment me bhi de sakte hain.`,
          chips: ["Installment kaise banti hai?", "Admission kaise lein?"]
        };
      }
      return {
        text: [
          "Har course ki fees alag hai:",
          "",
          ...activeCourses().map(courseLine),
          "",
          "**Admission fee alag se koi nahi hai** — bas course ki fees.",
          "Installment ka option hai."
        ].join("\n"),
        chips: ["Installment kaise banti hai?", "Admission kaise lein?"],
        link: { label: "Course detail dekhein", route: "courses" }
      };
    }
  },
  {
    id: "installment",
    keys: ["installment", "ek saath", "thoda thoda", "monthly", "mahine mahine", "emi", "part me", "tukdo"],
    answer: () => ({
      text: [
        "Haan, fees installment me di ja sakti hai.",
        "",
        "Admission ke waqt aapki fees ki kist bana di jaati hai — kitni kist, har kist kitne ki, aur kis tareekh tak. Wo poora schedule aapke student dashboard me dikhta rehta hai, isliye kabhi confusion nahi hoti ki kitna baaki hai.",
        "",
        "Kist ki tareekh paas aane par notification bhi aa jaata hai."
      ].join("\n"),
      chips: ["Fees kaise jama karein?", "Admission kaise lein?"]
    })
  },
  {
    id: "payfee",
    keys: ["fees jama", "fees kaise", "payment kaise", "pay kaise", "online payment", "upi", "phonepe", "google pay", "paytm", "bharna"],
    answer: () => ({
      text: [
        "Fees jama karne ke do tareeke hain:",
        "",
        "**1. Institute aakar** — cash ya UPI, receipt wahin mil jaati hai.",
        `**2. Online** — student dashboard ke Fees page se. UPI id: **${INSTITUTE.payments.upiId}**`,
        "",
        "Online bhejne ke baad dashboard me ek tap karke bata dijiye ki kitna bheja. Institute bank me check karke confirm kar deta hai — uske baad aapki baaki fees apne aap update ho jaati hai aur dono ko notification chala jaata hai.",
        "",
        "Payment ka screenshot rakh lijiye — kabhi zaroorat pad sakti hai."
      ].join("\n"),
      chips: ["Meri fees kitni baaki hai?", "Installment kaise banti hai?"]
    })
  },
  {
    id: "admission",
    keys: ["admission", "join", "daakhila", "naam likhwana", "form", "enroll", "bharti", "kaise lein"],
    answer: () => ({
      text: [
        "Admission bahut seedha hai:",
        "",
        "**1.** Website ke Online Admission page se form bhariye — naam, course, photo aur documents. **Email wahi dijiye jo aap sach me istemaal karte hain** — dashboard usi se judega.",
        "**2.** Chaahein to wahin apna account bhi bana lijiye — **intezaar karne ki zaroorat nahi**. Na koi code aane ka wait, na Student ID type karni. Google se bhi login kar sakte hain.",
        "**3.** Institute aapki application dekh kar approve karta hai. Student ID (jaise SSZ2026DCA0007) usi waqt banti hai.",
        "**4.** Approve hote hi aapka record apne aap aapke account se jud jaata hai — agli baar login karte hi fees, class aur attendance dikhne lagti hai.",
        "",
        "Chaahein to seedhe institute aakar bhi admission le sakte hain."
      ].join("\n"),
      chips: ["Kya documents chahiye?", "Fees kitni hai?"],
      link: { label: "Online Admission form", route: "admission" }
    })
  },
  {
    id: "documents",
    keys: ["document", "kagaz", "kagzat", "aadhaar", "aadhar", "adhar", "marksheet", "photo", "dastavez", "papers"],
    answer: () => ({
      text: [
        "Admission ke liye itna hi chahiye:",
        "",
        "• **Aadhaar card**",
        "• **Pichhli class ki marksheet** (jo aakhri padhai ki hai)",
        "• **2 passport size photo**",
        "",
        "Online form bharte waqt inki photo kheench kar upload kar dijiye — scan karane ki zaroorat nahi."
      ].join("\n"),
      chips: ["Admission kaise lein?", "Fees kitni hai?"]
    })
  },
  {
    id: "eligibility",
    keys: ["eligibility", "yogyata", "kaun le sakta", "10th", "12th", "matric", "inter", "pass", "qualification", "padha likha", "beginner", "zero se"],
    answer: (ctx, course) => {
      if (course) {
        return {
          text: `**${course.title}** ke liye: ${course.eligibility.join(", ")}.`,
          chips: ["Fees kitni hai?", "Admission kaise lein?"]
        };
      }
      return {
        text: [
          "Zyadatar courses ke liye **10th pass** kaafi hai.",
          "",
          "DCA, ADCA aur Tally jaise beginner courses me computer ka koi purv anubhav zaroori nahi — hum bilkul zero se shuru karte hain. Maus pakadna nahi aata, tab bhi chalega.",
          "",
          "B.Com aur I.Com jaise academic courses ke liye respective qualification chahiye."
        ].join("\n"),
        chips: ["Kaun kaun se course hain?", "Admission kaise lein?"]
      };
    }
  },
  {
    id: "duration",
    keys: ["duration", "kitne mahine", "kitna time", "kitne din", "period", "avdhi", "months"],
    answer: (ctx, course) => {
      if (course) return { text: `**${course.title}** ${course.durationMonths} mahine ka course hai.`, chips: ["Fees kitni hai?", "Admission kaise lein?"] };
      return {
        text: ["Course ke hisaab se time alag hai:", "", ...activeCourses().map((c) => `• **${c.title}** — ${c.durationMonths} mahine`)].join("\n"),
        chips: ["AI Powered DCA", "Tally Prime"]
      };
    }
  },
  {
    id: "timing",
    keys: ["timing", "kab khulta", "kab band", "batch", "morning", "evening", "shaam", "subah", "office hour", "open"],
    answer: () => ({
      text: [
        "Institute ka samay:",
        "",
        ...INSTITUTE.timings.map((t) => `• **${t.day}** — ${t.time}`),
        "",
        "Is beech kai batches chalte hain — subah se shaam tak. Aap apni school, college ya naukri ke hisaab se batch chun sakte hain. Kaunsa batch khaali hai, ye admission ke waqt bata diya jaata hai."
      ].join("\n"),
      chips: ["Admission kaise lein?", "Kahan par hai?"]
    })
  },
  {
    id: "location",
    keys: ["kahan", "address", "location", "map", "rasta", "pahunche", "jagah", "branch", "ara"],
    answer: () => ({
      text: [
        `**${INSTITUTE.name}**`,
        INSTITUTE.addressLines.join(", "),
        "",
        `Poochhne me dikkat ho to call kar lijiye: **${phone()}**`
      ].join("\n"),
      chips: ["Timing kya hai?", "Baat karni hai"],
      link: { label: "Contact page", route: "contact" }
    })
  },
  {
    id: "contact",
    keys: ["phone", "contact", "call", "baat", "sampark", "whatsapp", "email", "mail", "insaan", "sir", "madam", "बात"],
    answer: () => ({
      text: [
        "Seedhe baat karni ho to:",
        "",
        `📞 **${phone()}**`,
        `💬 WhatsApp: **${phone()}**`,
        "",
        ...INSTITUTE.timings.map((t) => `${t.day} — ${t.time}`)
      ].join("\n"),
      whatsapp: true,
      chips: ["Kahan par hai?", "Timing kya hai?"]
    })
  },
  {
    id: "certificate",
    keys: ["certificate", "verify", "valid", "manyata", "recognised", "recognized", "government", "sarkari", "maanya"],
    answer: () => ({
      text: [
        "Course poora karne aur final assessment pass karne ke baad certificate milta hai.",
        "",
        "• Aap ise apne dashboard se **download** kar sakte hain",
        "• Har certificate par ek verification number hota hai",
        "• Koi bhi — company, college — website par wo number daal kar **check kar sakta hai** ki certificate asli hai",
        "",
        "Yahi cheez interview me kaam aati hai."
      ].join("\n"),
      chips: ["Job milegi kya?", "Kaun kaun se course hain?"],
      link: { label: "Certificate verify karein", route: "verify" }
    })
  },
  {
    id: "job",
    /* "kaam milega" ab yahan bekaar hai — normalize "kaam" ko "job" bana
       deta hai. Isliye phrase bhi "job" wale roop me likhe hain, warna
       "course ke baad kaam?" me sirf "course" pakda jaata tha aur bot
       poori course list de deta tha. */
    keys: ["job", "placement", "rozgar", "salary", "career", "interview", "resume",
           "job milega", "job milta", "job lagega", "course ke baad", "job ki guarantee"],
    answer: () => ({
      text: [
        "Hum placement **support** dete hain — resume banane se lekar interview ki tayyari tak. Ye saaf-saaf kehna zaroori hai: **naukri ki guarantee nahi hai**, kyunki wo humare haath me nahi hoti.",
        "",
        "Jo humare haath me hai wo ye:",
        "• Aapka resume ban jaata hai (website par free tool bhi hai)",
        "• Practical kaam aapke paas hota hai jo employer ko dikha sakein",
        "• Interview me kya poochha jaata hai, uski tayyari",
        "",
        "Course ke hisaab se kaam: DCA/ADCA se computer operator aur data entry, Tally/GST se accountant aur billing, Python se junior developer."
      ].join("\n"),
      chips: ["Kaun kaun se course hain?", "Certificate milta hai?"]
    })
  },
  {
    id: "online",
    keys: ["online", "gharse", "ghar baithe", "live class", "zoom", "meet", "distance", "remote", "aana padega"],
    answer: () => ({
      text: [
        "Dono chalte hain.",
        "",
        "**Institute me** — lab me practice, sabse achha seekhne ka tareeka, khaaskar computer courses me.",
        "**Ghar se** — live classes Google Meet par hoti hain. Class ka link student dashboard me apne aap aa jaata hai, bas 'Join' dabana hota hai.",
        "",
        "Class miss ho jaye to notes dashboard me milte hain. Recording jahan available ho, wahan wo bhi."
      ].join("\n"),
      chips: ["Timing kya hai?", "Admission kaise lein?"]
    })
  },
  {
    id: "tools",
    /* Tool ke poore naam yahan phrase ki tarah hain (space wale keyword ko
       teen guna weight milta hai). Bina inke "Typing test kahan hai?" me
       sirf "kahan" pakda jaata tha aur bot institute ka pata bata deta tha. */
    keys: ["tool", "tools", "calculator", "typing", "free tool", "gst calculator", "qr", "invoice", "practice",
           "typing test", "emi calculator", "age calculator", "resume builder", "qr code",
           "percentage calculator", "invoice generator", "hsn", "quiz"],
    answer: () => ({
      text: [
        `Website par ${TOOLS.length} tools bilkul **free** hain — login ki bhi zaroorat nahi:`,
        "",
        ...TOOLS.slice(0, 6).map((t) => `• **${t.title}** — ${t.desc}`),
        `• ...aur ${TOOLS.length - 6} aur`,
        "",
        "Typing test me ab **Hindi (Mangal)** bhi hai — sarkari typing test ki tayyari ke liye."
      ].join("\n"),
      chips: ["Typing test", "Resume banana hai"],
      link: { label: "Saare free tools", route: "tools" }
    })
  },
  {
    id: "demo",
    keys: ["demo", "trial", "free class", "dekh sakte", "try", "test class", "ek din"],
    answer: () => ({
      text: `Demo class ke liye seedha baat kar lijiye — **${phone()}**. Aakar batch dekh lena sabse achha rehta hai, isse pata chal jaata hai ki padhane ka tareeka aapko suit karta hai ya nahi.`,
      whatsapp: true,
      chips: ["Timing kya hai?", "Kahan par hai?"]
    })
  },
  {
    id: "refund",
    keys: ["refund", "wapas", "paisa wapas", "cancel", "chhodna", "leave", "return"],
    answer: () => ({
      text: `Fees **non-refundable** hai — ye pehle hi saaf bata dete hain taaki baad me galatfehmi na ho.\n\nKoi khaas paristhiti ho to institute se baat kar lijiye: **${phone()}**`,
      whatsapp: true
    })
  },
  {
    id: "login",
    keys: ["login", "password", "bhool", "forgot", "account", "id kaise", "sign in", "khul nahi"],
    answer: () => ({
      text: [
        "Student login ke liye wahi email istemaal kijiye jo admission form me diya tha — aapka record apne aap jud jaata hai.",
        "",
        "**Google se login** ka button bhi hai, usme password yaad rakhne ka jhanjhat hi nahi.",
        "",
        "Password bhool gaye hain to login page par 'Password bhool gaye?' se reset link email par aa jaayega."
      ].join("\n"),
      link: { label: "Student login", route: "studentLogin" }
    })
  }
];

/* ==========================================================================
   Personal sawaal — sirf logged-in student ke liye
   ==========================================================================
   Inka jawab Firestore se aata hai. `needs` batata hai ki kaunsa data
   chahiye, taaki widget sirf wahi load kare jo zaroori ho — poora dashboard
   nahi. */
const STUDENT_INTENTS = [
  {
    id: "myFees",
    needs: ["student"],
    /* Yahan har keyword "mera/meri" wala ya aisa hona chahiye jo sirf apne
       record ke baare me poochhne par hi aata ho. "due" aur "pending" jaise
       akele shabd hata diye — wo aam sawaalon me bhi aate the aur naye
       aane wale ko bewajah login par bhej dete the. */
    keys: ["meri fees", "mera bakaya", "kitna baaki", "baki fees", "meri kist",
           "kist kab", "next installment", "kitna dena", "mera pending"],
    answer: async (ctx) => {
      const s = ctx.student;
      if (!s) return null;
      const total = Number(s.totalFee) || 0;
      const paid = Number(s.paidFee) || 0;
      const pending = Math.max(0, total - paid);

      const lines = [
        `**${s.fullName || s.studentName || "Aap"}** — ${s.studentId}`,
        "",
        `Kul fees: **${money(total)}**`,
        `Jama ho chuki: **${money(paid)}**`,
        `Baaki: **${money(pending)}**`
      ];

      if (pending === 0) {
        lines.push("", "Aapki poori fees jama hai. 👍");
      } else {
        try {
          const { currentDue } = await import("../core/fee-plan.js");
          const { formatDate } = await import("../core/utils.js");
          const due = currentDue(s);
          /* currentDue `remaining` deta hai (is kist me se kitna baaki),
             `amount` nahi — aur dueDate ek Date object hai, string nahi.
             Isliye yahan wahi field padhte hain jo sach me aate hain. */
          if (due) {
            lines.push("", `**Kist ${due.no}:** ${money(due.remaining)} — ${formatDate(due.dueDate)} tak`);
            if (due.overdueDays > 0) lines.push(`Ye kist **${due.overdueDays} din** se baaki hai.`);
          }
        } catch { /* plan nahi bana to sirf pending dikha dete hain */ }
      }

      return { text: lines.join("\n"), chips: ["Fees kaise jama karein?", "Meri attendance kitni hai?"] };
    }
  },
  {
    id: "myAttendance",
    needs: ["student", "attendance"],
    keys: ["meri attendance", "attendance kitna", "kitne din aaya", "kitna class",
           "attendance percentage", "meri hazri", "kitna hazir"],
    answer: async (ctx) => {
      /* Record abhi juda hi nahi (approve hone se pehle signup) — to "koi
         attendance nahi hui" kehna jhooth hai. Chup rehkar upar wali layer
         ko sambhaalne dete hain, jaise myFees karta hai. */
      if (!ctx.student) return null;
      const rows = ctx.attendance || [];
      if (!rows.length) return { text: "Abhi tak aapki koi attendance mark nahi hui hai." };

      // Leave ko ginti me nahi lete — wo chhutti hai, ghair-hazri nahi.
      const counted = rows.filter((r) => r.status !== "leave");
      const present = counted.filter((r) => r.status === "present" || r.status === "late").length;
      const pctv = counted.length ? Math.round((present / counted.length) * 100) : 0;

      const lines = [
        `Aapki attendance: **${pctv}%**`,
        "",
        `Kul mark hui: ${counted.length} class`,
        `Hazir: ${present}`,
        `Gair-hazir: ${counted.length - present}`
      ];
      if (pctv < 60) lines.push("", "Ye thodi kam hai. Class chhootne se aage ka topic samajhna mushkil ho jaata hai — koi dikkat ho to bata dijiye, hum raasta nikal lenge.");
      else if (pctv >= 85) lines.push("", "Bahut achhi attendance hai. Isi tarah bane rahiye.");

      return { text: lines.join("\n"), chips: ["Meri agli class kab hai?", "Meri fees kitni baaki hai?"] };
    }
  },
  {
    id: "myClass",
    needs: ["student", "classes"],
    keys: ["meri class", "agli class", "next class", "class kab", "live class kab", "aaj class"],
    answer: async (ctx) => {
      const list = ctx.classes || [];
      const { toDate, formatDateTime } = await import("../core/utils.js");
      const now = Date.now();

      const live = list.find((c) => {
        const s = toDate(c.startsAt)?.getTime(), e = toDate(c.endsAt)?.getTime();
        return s && e && s <= now && e >= now && c.status !== "cancelled";
      });
      if (live) {
        return {
          text: `**Abhi class chal rahi hai** — ${live.title}\n\nDashboard ke Live Classes page se turant join kar lijiye.`,
          link: { label: "Join karein", route: "studentClasses" }
        };
      }

      const next = list
        .filter((c) => toDate(c.startsAt)?.getTime() > now && c.status !== "cancelled")
        .sort((a, b) => toDate(a.startsAt) - toDate(b.startsAt))[0];

      if (!next) return { text: "Abhi koi class scheduled nahi hai. Nayi class lagte hi aapko notification mil jaayega." };

      return {
        text: `**Agli class:** ${next.title}\n${formatDateTime(next.startsAt)}${next.facultyName ? ` · ${next.facultyName}` : ""}${next.topic ? `\nTopic: ${next.topic}` : ""}`,
        link: { label: "Live Classes", route: "studentClasses" },
        chips: ["Meri attendance kitni hai?"]
      };
    }
  },
  {
    id: "myAssignments",
    needs: ["student", "assignments", "submissions"],
    keys: ["mera assignment", "meri assignment", "assignment baaki", "assignment pending",
           "pending assignment", "homework baaki", "mera homework", "assignment jama",
           "assignment submit", "kaunsa assignment"],
    answer: async (ctx) => {
      if (!ctx.student) return null;
      const list = ctx.assignments || [];
      const done = new Set((ctx.submissions || []).map((s) => s.assignmentId));
      const pending = list.filter((a) => !done.has(a.id));

      if (!list.length) return { text: "Abhi tak koi assignment nahi mila hai." };
      if (!pending.length) return { text: `Sab assignment jama ho chuke hain — kul ${list.length}. Shabaash. 👍`, link: { label: "Assignments", route: "studentAssignments" } };

      /* dueDate Firestore se Timestamp bankar aata hai — seedhe likh dene
         par student ko "Timestamp(seconds=…)" dikh jaata tha. Baaki poore
         project me yahi kaam formatDate karta hai. */
      const { formatDate } = await import("../core/utils.js");

      return {
        text: [
          `**${pending.length} assignment baaki hai:**`, "",
          ...pending.slice(0, 5).map((a) =>
            `• ${a.title}${a.dueDate ? ` — ${formatDate(a.dueDate)} tak` : ""}`)
        ].join("\n"),
        link: { label: "Assignments kholein", route: "studentAssignments" }
      };
    }
  },
  {
    id: "myId",
    needs: ["student"],
    keys: ["meri id", "student id", "mera code", "roll", "enrollment"],
    answer: async (ctx) => {
      const s = ctx.student;
      if (!s) return null;
      return {
        text: `Aapki Student ID: **${s.studentId}**\n\nCourse: ${s.courseName || s.courseId || "—"}${s.batchName ? `\nBatch: ${s.batchName}` : ""}`,
        chips: ["Meri fees kitni baaki hai?", "Meri attendance kitni hai?"]
      };
    }
  }
];

/* ==========================================================================
   Public API
   ========================================================================== */

export const STARTER_CHIPS = [
  "Kaun kaun se course hain?",
  "Fees kitni hai?",
  "Admission kaise lein?",
  "Timing kya hai?"
];

export const STUDENT_CHIPS = [
  "Meri fees kitni baaki hai?",
  "Meri attendance kitni hai?",
  "Meri agli class kab hai?",
  "Assignment baaki hai?"
];

/** Sirf ye batata hai ki sawaal personal hai ya nahi — data load karne se
    pehle poochha jaata hai, taaki bina zaroorat Firestore hit na ho. */
export function matchStudentIntent(text) {
  return studentIntentScore(normalize(text)).intent;
}

/** Wahi kaam, par score bhi lauta deta hai — taaki `answer()` personal aur
    aam sawaal ko aapas me tol sake. */
function studentIntentScore(norm) {
  let best = null, bestScore = MIN_SCORE - 1;
  for (const it of STUDENT_INTENTS) {
    const s = score(norm, it.keys);
    if (s > bestScore) { bestScore = s; best = it; }
  }
  return bestScore >= MIN_SCORE
    ? { intent: best, score: bestScore }
    : { intent: null, score: 0 };
}

/**
 * Sawaal ka jawab.
 * @param {string} text     student ne kya likha
 * @param {object} ctx      { loggedIn, student, attendance, classes, ... }
 * @returns {Promise<object|null>}  null = pata nahi, upar wali layer sambhale
 */
export async function answer(text, ctx = {}) {
  const norm = normalize(text);
  const course = findCourse(norm);

  /* Dono taraf ka score pehle nikaal lete hain.

     Pehle personal intent ko hamesha aage rakha jaata tha, aur wo ek hi
     aam se shabd par lag jaata tha. Nateeja: "Fees jama karna hai" jaisa
     seedha sawaal poochhne wale ko bhi "pehle login karna hoga" mil jaata
     tha — jabki wo shayad naya student tha jiska account hi nahi hai.

     Ab personal tabhi jeetta hai jab wo aam sawaal se kam na ho. "meri
     fees" jaise phrase 3 point laate hain, isliye asli personal sawaal
     phir bhi aage hi rehta hai. */
  const { intent: personal, score: personalScore } = studentIntentScore(norm);

  let best = null, bestScore = MIN_SCORE - 1;
  for (const it of PUBLIC_INTENTS) {
    const s = score(norm, it.keys);
    if (s > bestScore) { bestScore = s; best = it; }
  }

  if (personal && personalScore >= bestScore) {
    if (!ctx.loggedIn) {
      return {
        text: "Ye aapki apni jaankari hai, isliye pehle login karna hoga.\n\nAdmission wale email se login kijiye — aapka record apne aap jud jaayega.",
        link: { label: "Student login", route: "studentLogin" },
        source: "kb"
      };
    }
    const res = await personal.answer(ctx);
    if (res) return { ...res, source: "kb" };
  }

  /* 3. Sirf course ka naam likha (jaise "tally") — detail de do. */
  if (course && bestScore < 2) {
    return { text: courseDetail(course), chips: ["Admission kaise lein?", "Installment kaise banti hai?"], link: { label: "Course page", route: "courses" }, source: "kb" };
  }

  if (bestScore >= MIN_SCORE && best) {
    const res = best.answer(ctx, course);
    return { ...res, source: "kb" };
  }

  return null;   // pata nahi — AI ya WhatsApp
}

/** AI ko dene ke liye institute ke pakke tathya. AI inhi ke andar rahega. */
export function groundingFacts() {
  return [
    `Institute: ${INSTITUTE.name}, ${INSTITUTE.addressLines.join(", ")}. ${INSTITUTE.established} se chal raha hai.`,
    `Phone aur WhatsApp: ${phone()}.`,
    `Timing: ${INSTITUTE.timings.map((t) => `${t.day} ${t.time}`).join("; ")}.`,
    `UPI: ${INSTITUTE.payments.upiId}.`,
    "Admission fee alag se koi nahi hai — sirf course ki fees, jo non-refundable hai. Installment ka option hai.",
    "Admission ke liye Aadhaar, pichhli marksheet aur 2 photo chahiye.",
    "Live classes Google Meet par hoti hain; institute me aakar bhi padh sakte hain.",
    "Placement support milta hai lekin naukri ki guarantee nahi hai.",
    "",
    "Courses (naam — fees — duration — kaun le sakta hai):",
    ...COURSES.filter((c) => c.isActive).map((c) =>
      `- ${c.title} — ${money(c.fee)} — ${c.durationMonths} mahine — ${c.eligibility.join(", ")}`)
  ].join("\n");
}

export { PUBLIC_INTENTS, STUDENT_INTENTS, wa };
