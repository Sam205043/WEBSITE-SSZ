/* ==========================================================================
   Soft Skill Zone — Preview-mode sample data
   --------------------------------------------------------------------------
   Shown ONLY while Firebase is not configured, behind a visible
   "Preview mode" banner. The shapes exactly match the Firestore documents
   described in docs/DATA-MODEL.md, so page code renders both identically.
   ========================================================================== */

const now = Date.now();
const day = 86400000;
const at = (d, h = 0, m = 0) => new Date(new Date(now + d * day).setHours(h, m, 0, 0));

export const DEMO_USER = Object.freeze({
  uid: "demo",
  name: "Rahul Kumar",
  email: "rahul.demo@softskillzone.in",
  role: "student",
  studentId: "SSZ2026DCA0007",
  phone: "9876543210",
  photoURL: "",
  status: "active"
});

export const DEMO_STUDENT = Object.freeze({
  id: "SSZ2026DCA0007",
  studentId: "SSZ2026DCA0007",
  uid: "demo",
  rollNo: "07",
  fullName: "Rahul Kumar",
  fatherName: "Suresh Kumar",
  motherName: "Sunita Devi",
  dob: "2005-03-14",
  gender: "male",
  mobile: "9876543210",
  whatsapp: "9876543210",
  email: "rahul.demo@softskillzone.in",
  address: "Mahavir Tola, Ara, Bhojpur - 802301",
  qualification: "12th pass",
  courseId: "ai-dca",
  courseName: "AI Powered DCA",
  batchId: "DCA-MOR-JAN26",
  batchName: "DCA Morning (Jan 2026)",
  admissionDate: at(-62),
  status: "active",
  totalFee: 6500,
  paidFee: 4000,
  pendingFee: 2500,
  nextDueDate: at(9)
});

export const DEMO_CLASSES = Object.freeze([
  { id: "c1", title: "MS Excel — Formulas Masterclass", topic: "VLOOKUP, IF, SUMIFS", batchId: "DCA-MOR-JAN26", batchName: "DCA Morning",
    facultyName: "Computer Faculty", meetLink: "https://meet.google.com/abc-defg-hij",
    startsAt: at(0, new Date(now).getHours() + 2), endsAt: at(0, new Date(now).getHours() + 3, 30), status: "scheduled" },
  { id: "c2", title: "ChatGPT se Office Work", topic: "Prompt writing basics", batchId: "DCA-MOR-JAN26", batchName: "DCA Morning",
    facultyName: "Creative Faculty", meetLink: "https://meet.google.com/klm-nopq-rst",
    startsAt: at(2, 18, 0), endsAt: at(2, 19, 30), status: "scheduled" },
  { id: "c3", title: "PowerPoint — Design Basics", topic: "Slides, transitions", batchId: "DCA-MOR-JAN26", batchName: "DCA Morning",
    facultyName: "Computer Faculty", meetLink: "https://meet.google.com/uvw-xyza-bcd",
    startsAt: at(-3, 18, 0), endsAt: at(-3, 19, 30), status: "ended", recordingURL: "" },
  { id: "c4", title: "Internet & Email Practical", topic: "Gmail, attachments, safety", batchId: "DCA-MOR-JAN26", batchName: "DCA Morning",
    facultyName: "Computer Faculty", meetLink: "https://meet.google.com/efg-hijk-lmn",
    startsAt: at(-8, 18, 0), endsAt: at(-8, 19, 30), status: "ended" }
]);

/* 24 days of attendance ending today (weekdays only feel) */
export const DEMO_ATTENDANCE = Object.freeze(
  Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now - (23 - i) * day);
    const key = d.toISOString().slice(0, 10);
    const status = i === 5 ? "absent" : i === 11 ? "late" : i === 17 ? "leave" : "present";
    return { id: `a${i}`, date: key, status, batchId: "DCA-MOR-JAN26", studentId: "SSZ2026DCA0007", studentName: "Rahul Kumar" };
  })
);

export const DEMO_ASSIGNMENTS = Object.freeze([
  { id: "as1", title: "Excel Practice Sheet 4", description: "Attached workbook me diye gaye 12 sawal solve karke upload karein.",
    courseId: "ai-dca", batchId: "DCA-MOR-JAN26", fileURL: "", fileName: "excel-sheet-4.xlsx", totalMarks: 20, dueDate: at(3, 23, 59), createdAt: at(-2) },
  { id: "as2", title: "Word — Biodata Formatting", description: "Apna biodata MS Word me banayein (A4, margins 1 inch).",
    courseId: "ai-dca", batchId: "DCA-MOR-JAN26", fileURL: "", fileName: "", totalMarks: 10, dueDate: at(-1, 23, 59), createdAt: at(-6) },
  { id: "as3", title: "Typing Test Screenshot", description: "Website ke Typing Test me 25+ WPM ka screenshot submit karein.",
    courseId: "ai-dca", batchId: "DCA-MOR-JAN26", fileURL: "", fileName: "", totalMarks: 5, dueDate: at(-6, 23, 59), createdAt: at(-12) }
]);

export const DEMO_SUBMISSIONS = Object.freeze([
  { id: "s1", assignmentId: "as2", studentId: "SSZ2026DCA0007", fileName: "biodata-rahul.docx", fileURL: "#",
    submittedAt: at(-2, 20, 15), status: "graded", marks: 8, feedback: "Formatting achhi hai — heading styles aur seekh lo." },
  { id: "s2", assignmentId: "as3", studentId: "SSZ2026DCA0007", fileName: "typing-27wpm.png", fileURL: "#",
    submittedAt: at(-7, 19, 5), status: "graded", marks: 5, feedback: "Shabash! 27 WPM." }
]);

export const DEMO_NOTES = Object.freeze([
  { id: "n1", title: "MS Excel Formulas — Chapter Notes", description: "SUM se VLOOKUP tak, examples ke saath",
    courseId: "ai-dca", fileName: "excel-formulas.pdf", fileType: "application/pdf", fileSize: 1843200, fileURL: "#", downloads: 156, createdAt: at(-4) },
  { id: "n2", title: "Computer Fundamentals — Full Notes", description: "Hardware, software, memory units",
    courseId: "ai-dca", fileName: "fundamentals.pdf", fileType: "application/pdf", fileSize: 2411520, fileURL: "#", downloads: 203, createdAt: at(-20) },
  { id: "n3", title: "ChatGPT Prompt Cheat-Sheet", description: "Office kaam ke 40 ready prompts",
    courseId: "ai-dca", fileName: "prompts.pdf", fileType: "application/pdf", fileSize: 812000, fileURL: "#", downloads: 318, createdAt: at(-9) }
]);

export const DEMO_FEES = Object.freeze([
  { id: "f1", receiptNo: "SSZ/RCPT/2026/0112", studentId: "SSZ2026DCA0007", amount: 1500, mode: "cash",
    installmentNo: 3, paidOn: at(-12), status: "paid", remarks: "3rd installment" },
  { id: "f2", receiptNo: "SSZ/RCPT/2026/0078", studentId: "SSZ2026DCA0007", amount: 1500, mode: "upi",
    installmentNo: 2, paidOn: at(-42), status: "paid", txnRef: "UPI2026XXXX" },
  { id: "f3", receiptNo: "SSZ/RCPT/2026/0031", studentId: "SSZ2026DCA0007", amount: 1000, mode: "cash",
    installmentNo: 1, paidOn: at(-62), status: "paid", remarks: "Admission + 1st installment" }
]);

export const DEMO_CERTIFICATES = Object.freeze([
  { id: "ct1", certificateNo: "SSZ/CERT/2026/0009", studentId: "SSZ2026DCA0007", studentName: "Rahul Kumar",
    courseName: "Typing Proficiency (Hindi + English)", issueDate: at(-15), grade: "A", verifyCode: "SSZ-VER-DEMO9", certificateURL: "" }
]);

export const DEMO_NOTIFICATIONS = Object.freeze([
  { id: "no1", title: "Kal ki class 6 PM par", message: "Excel Formulas wali class kal shaam 6 baje Google Meet par hogi. Time par join karein.",
    type: "class", audience: "batch", priority: "high", createdAt: at(-0.1), readBy: [] },
  { id: "no2", title: "Fee reminder", message: "Aapki agli installment ki due date paas aa rahi hai. Dashboard ke Fees section se details dekhein.",
    type: "fee", audience: "student", priority: "normal", createdAt: at(-2), readBy: [] },
  { id: "no3", title: "Chhath Puja ki chhutti", message: "Institute 4 din band rahega. Classes uske baad usi timing par chalengi.",
    type: "holiday", audience: "all", priority: "normal", createdAt: at(-6), readBy: ["SSZ2026DCA0007"] },
  { id: "no4", title: "Naya notes upload hua", message: "ChatGPT Prompt Cheat-Sheet ab Notes section me available hai.",
    type: "general", audience: "all", priority: "low", createdAt: at(-9), readBy: ["SSZ2026DCA0007"] }
]);
