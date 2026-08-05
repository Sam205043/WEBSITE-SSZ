/* ==========================================================================
   Soft Skill Zone — Application Constants
   Every magic string in the project lives here. Import, never retype.
   ========================================================================== */

/* ---------------- Firestore collections ---------------- */
export const COLLECTIONS = Object.freeze({
  USERS:         "users",
  ADMISSIONS:    "admissions",
  STUDENTS:      "students",
  COURSES:       "courses",
  BATCHES:       "batches",
  FEES:          "fees",
  ATTENDANCE:    "attendance",
  LIVE_CLASSES:  "liveClasses",
  /* Recording ka asli link YAHAN rehta hai, class ke record me NAHI.
     Class ka record poori batch padh sakti hai — usme link rakhne ka matlab
     tha ki jo recording aapne abhi "students ko de dein" nahi kiya, wo bhi
     batch ka koi bhi student console se dekh leta. Yahan rule me "published"
     ki shart lagti hai, isliye approve se pehle wo kisi ko nahi milta. */
  CLASS_RECORDINGS: "classRecordings",
  ASSIGNMENTS:   "assignments",
  // MCQ ke sahi jawab yahan rehte hain, assignment ke saath NAHI — warna
  // student browser console se paper se pehle hi jawab dekh leta.
  ASSIGNMENT_KEYS: "assignmentKeys",
  SUBMISSIONS:   "submissions",
  NOTES:         "notes",
  CERTIFICATES:  "certificates",
  NOTIFICATIONS: "notifications",
  FACULTY:       "faculty",
  REVIEWS:       "reviews",
  GALLERY:       "gallery",
  BLOG:          "blog",
  FAQ:           "faq",
  ENQUIRIES:     "enquiries",
  SETTINGS:      "settings",
  COUNTERS:      "counters",
  /* Razorpay se aaya paisa jo kisi record se jud nahi paaya. Isme sirf
     Cloud Function likhta hai; panel sirf padhta hai, aur jodne ka kaam
     attachPayment function karta hai. */
  UNMATCHED_PAYMENTS: "unmatchedPayments"
});

/* ---------------- Storage folders ---------------- */
export const STORAGE_PATHS = Object.freeze({
  admissionPhoto: (appNo) => `admissions/${appNo}`,
  admissionDocs:  (appNo) => `admissions/${appNo}/docs`,
  studentRoot:    (sid)   => `students/${sid}`,
  studentDocs:    (sid)   => `students/${sid}/documents`,
  notes:          (cid)   => `notes/${cid}`,
  assignments:    (aid)   => `assignments/${aid}`,
  submissions:    (aid, sid) => `submissions/${aid}/${sid}`,
  certificates:   ()      => `certificates`,
  feeProofs:      (sid)   => `fees/proofs/${sid}`,
  publicGallery:  ()      => `public/gallery`,
  publicFaculty:  ()      => `public/faculty`,
  publicBlog:     ()      => `public/blog`
});

/* ---------------- Roles & statuses ---------------- */
export const ROLES = Object.freeze({ ADMIN: "admin", STUDENT: "student", FACULTY: "faculty" });

export const USER_STATUS = Object.freeze({ ACTIVE: "active", BLOCKED: "blocked" });

export const ADMISSION_STATUS = Object.freeze({
  PENDING:  "pending",
  APPROVED: "approved",
  REJECTED: "rejected"
});

export const STUDENT_STATUS = Object.freeze({
  ACTIVE:    "active",
  COMPLETED: "completed",
  DROPPED:   "dropped"
});

export const FEE_STATUS = Object.freeze({
  PAID:    "paid",
  PENDING: "pending-verification",
  FAILED:  "failed"
});

export const PAYMENT_MODES = Object.freeze([
  { value: "cash",     label: "Cash" },
  { value: "upi",      label: "UPI" },
  { value: "razorpay", label: "Razorpay Link" },
  { value: "bank",     label: "Bank Transfer" },
  { value: "cheque",   label: "Cheque" }
]);

export const ATTENDANCE_STATUS = Object.freeze({
  PRESENT: "present",
  ABSENT:  "absent",
  LATE:    "late",
  LEAVE:   "leave"
});

export const CLASS_STATUS = Object.freeze({
  SCHEDULED: "scheduled",
  LIVE:      "live",
  ENDED:     "ended",
  CANCELLED: "cancelled"
});

export const BATCH_STATUS = Object.freeze({
  UPCOMING:  "upcoming",
  RUNNING:   "running",
  COMPLETED: "completed"
});

export const NOTIFICATION_TYPES = Object.freeze([
  { value: "general", label: "General", icon: "bell" },
  { value: "fee",     label: "Fee",     icon: "wallet" },
  { value: "class",   label: "Class",   icon: "video" },
  { value: "exam",    label: "Exam",    icon: "clipboard" },
  { value: "holiday", label: "Holiday", icon: "calendar" }
]);

/* ---------------- Upload limits ---------------- */
export const UPLOAD_LIMITS = Object.freeze({
  image: {
    maxBytes: 5 * 1024 * 1024,
    types: ["image/jpeg", "image/png", "image/webp"],
    label: "JPG, PNG, WEBP (max 5 MB)"
  },
  document: {
    maxBytes: 5 * 1024 * 1024,
    types: [
      "application/pdf", "image/jpeg", "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ],
    label: "PDF, JPG, PNG, DOC, DOCX (max 5 MB)"
  },
  material: {
    maxBytes: 25 * 1024 * 1024,
    types: [],
    label: "Koi bhi file (max 25 MB)"
  },
  any: {
    maxBytes: 10 * 1024 * 1024,
    types: [],
    label: "Max 10 MB"
  }
});

/* ---------------- ID formats ---------------- */
export const ID_FORMATS = Object.freeze({
  application: (year, seq) => `SSZ-APP-${year}-${String(seq).padStart(4, "0")}`,
  student:     (year, code, seq) => `SSZ${year}${code}${String(seq).padStart(4, "0")}`,
  receipt:     (year, seq) => `SSZ/RCPT/${year}/${String(seq).padStart(4, "0")}`,
  certificate: (year, seq) => `SSZ/CERT/${year}/${String(seq).padStart(4, "0")}`
});

/* ---------------- Local storage keys ---------------- */
export const LS_KEYS = Object.freeze({
  THEME:           "ssz.theme",
  DRAFT_ADMISSION: "ssz.admission.draft",
  RECENT_SEARCH:   "ssz.search.recent",
  TYPING_BEST:     "ssz.tools.typing.best",
  RESUME_DRAFT:    "ssz.tools.resume.draft",
  INVOICE_SEQ:     "ssz.tools.invoice.seq",
  SIDEBAR:         "ssz.dash.sidebar"
});

/* ---------------- Misc ---------------- */
export const DATE_FMT = Object.freeze({
  display:  { day: "2-digit", month: "short", year: "numeric" },
  full:     { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  time:     { hour: "2-digit", minute: "2-digit", hour12: true },
  dateTime: { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }
});

export const LOCALE = "en-IN";
export const CURRENCY = "INR";
export const TIMEZONE = "Asia/Kolkata";
export const PAGE_SIZE = 20;
