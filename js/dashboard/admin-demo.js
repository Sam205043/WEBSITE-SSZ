/* ==========================================================================
   Soft Skill Zone — Admin preview-mode sample data
   Shown only while Firebase is not configured, behind the preview banner.
   Shapes match docs/DATA-MODEL.md exactly.
   ========================================================================== */

const now = Date.now();
const day = 86400000;
const at = (d, h = 10) => new Date(new Date(now + d * day).setHours(h, 0, 0, 0));

export const DEMO_ADMIN = Object.freeze({
  uid: "demo-admin",
  name: "Pankaj Pandey",
  email: "admin@softskillzone.in",
  role: "admin",
  photoURL: ""
});

export const DEMO_ADMISSIONS = Object.freeze([
  { id: "SSZ-APP-2026-0042", applicationNo: "SSZ-APP-2026-0042", fullName: "Anita Kumari", fatherName: "Rajesh Prasad", motherName: "Meena Devi",
    dob: "2006-01-22", gender: "female", mobile: "9812345670", whatsapp: "9812345670", email: "anita@example.com",
    address: "Karman Tola, Ara", city: "Ara", pincode: "802301", qualification: "12th pass",
    courseId: "ai-tally-prime", courseName: "AI Powered Tally Prime", courseFee: 5000, admissionFee: 500,
    batchPref: "morning", photoURL: "", documents: [{ name: "aadhaar.jpg", url: "#", type: "image/jpeg", size: 234000 }],
    status: "pending", isRead: false, createdAt: at(-0.05) },
  { id: "SSZ-APP-2026-0041", applicationNo: "SSZ-APP-2026-0041", fullName: "Mohit Raj", fatherName: "Dinesh Singh", motherName: "Kiran Devi",
    dob: "2004-09-10", gender: "male", mobile: "9898989898", whatsapp: "9898989898", email: "",
    address: "Pakri, Ara", city: "Ara", pincode: "802301", qualification: "Graduate",
    courseId: "gst-2", courseName: "GST 2.0 Master Course", courseFee: 4500, admissionFee: 300,
    batchPref: "evening", photoURL: "", documents: [{ name: "marksheet.pdf", url: "#", type: "application/pdf", size: 812000 }],
    status: "pending", isRead: false, createdAt: at(-1) },
  { id: "SSZ-APP-2026-0040", applicationNo: "SSZ-APP-2026-0040", fullName: "Pooja Singh", fatherName: "Awadhesh Singh", motherName: "Rekha Devi",
    dob: "2005-06-30", gender: "female", mobile: "9765432109", whatsapp: "9765432109", email: "pooja@example.com",
    address: "Jagdishpur Road", city: "Ara", pincode: "802302", qualification: "12th pass",
    courseId: "python-314", courseName: "Python 3.14 Programming", courseFee: 7000, admissionFee: 500,
    batchPref: "afternoon", photoURL: "", documents: [],
    status: "approved", isRead: true, studentId: "SSZ2026PYT0004", createdAt: at(-3) },
  { id: "SSZ-APP-2026-0039", applicationNo: "SSZ-APP-2026-0039", fullName: "Ravi Shankar", fatherName: "Munna Yadav", motherName: "Sarita Devi",
    dob: "1998-12-05", gender: "male", mobile: "9123456780", whatsapp: "9123456780", email: "",
    address: "Sandesh, Bhojpur", city: "Ara", pincode: "802161", qualification: "10th pass",
    courseId: "ai-dca", courseName: "AI Powered DCA", courseFee: 6000, admissionFee: 500,
    batchPref: "morning", photoURL: "", documents: [],
    status: "rejected", isRead: true, remarks: "Duplicate application — phone par baat ho gayi", createdAt: at(-5) }
]);

export const DEMO_STUDENTS = Object.freeze([
  { id: "SSZ2026DCA0007", studentId: "SSZ2026DCA0007", rollNo: "07", fullName: "Rahul Kumar", fatherName: "Suresh Kumar",
    mobile: "9876543210", email: "rahul@example.com", courseId: "ai-dca", courseName: "AI Powered DCA",
    batchId: "DCA-MOR-JAN26", batchName: "DCA Morning (Jan 2026)", status: "active",
    totalFee: 6500, paidFee: 4000, pendingFee: 2500, admissionDate: at(-62), gender: "male", qualification: "12th pass", address: "Mahavir Tola, Ara" },
  { id: "SSZ2026DCA0006", studentId: "SSZ2026DCA0006", rollNo: "06", fullName: "Nisha Kumari", fatherName: "Ramesh Prasad",
    mobile: "9871112223", email: "", courseId: "ai-dca", courseName: "AI Powered DCA",
    batchId: "DCA-MOR-JAN26", batchName: "DCA Morning (Jan 2026)", status: "active",
    totalFee: 6500, paidFee: 6500, pendingFee: 0, admissionDate: at(-70), gender: "female", qualification: "12th pass", address: "Nawada, Ara" },
  { id: "SSZ2026TLY0011", studentId: "SSZ2026TLY0011", rollNo: "11", fullName: "Priya Singh", fatherName: "Ram Singh",
    mobile: "9876501234", email: "priya@example.com", courseId: "ai-tally-prime", courseName: "AI Powered Tally Prime",
    batchId: "TLY-EVE-MAR26", batchName: "Tally Evening (Mar 2026)", status: "active",
    totalFee: 5500, paidFee: 3000, pendingFee: 2500, admissionDate: at(-40), gender: "female", qualification: "B.Com", address: "Station Road, Ara" },
  { id: "SSZ2026PYT0004", studentId: "SSZ2026PYT0004", rollNo: "04", fullName: "Pooja Singh", fatherName: "Awadhesh Singh",
    mobile: "9765432109", email: "pooja@example.com", courseId: "python-314", courseName: "Python 3.14 Programming",
    batchId: "PYT-AFT-JUL26", batchName: "Python Afternoon (Jul 2026)", status: "active",
    totalFee: 7500, paidFee: 2500, pendingFee: 5000, admissionDate: at(-3), gender: "female", qualification: "12th pass", address: "Jagdishpur Road" },
  { id: "SSZ2025ADC0021", studentId: "SSZ2025ADC0021", rollNo: "21", fullName: "Vikash Yadav", fatherName: "Suraj Yadav",
    mobile: "9990001112", email: "", courseId: "adca", courseName: "ADCA",
    batchId: "ADC-MOR-AUG25", batchName: "ADCA Morning (Aug 2025)", status: "completed",
    totalFee: 10700, paidFee: 10700, pendingFee: 0, admissionDate: at(-340), gender: "male", qualification: "12th pass", address: "Koilwar" }
]);

export const DEMO_BATCHES = Object.freeze([
  { id: "DCA-MOR-JAN26", batchId: "DCA-MOR-JAN26", name: "DCA Morning (Jan 2026)", courseId: "ai-dca", courseName: "AI Powered DCA",
    facultyName: "Computer Faculty", timing: "08:00 AM - 09:30 AM", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    mode: "offline", capacity: 20, enrolled: 14, status: "running", startDate: at(-62), endDate: at(120) },
  { id: "TLY-EVE-MAR26", batchId: "TLY-EVE-MAR26", name: "Tally Evening (Mar 2026)", courseId: "ai-tally-prime", courseName: "AI Powered Tally Prime",
    facultyName: "Pankaj Pandey", timing: "05:00 PM - 06:30 PM", days: ["Mon", "Wed", "Fri"],
    mode: "hybrid", capacity: 15, enrolled: 11, status: "running", startDate: at(-40), endDate: at(50) },
  { id: "PYT-AFT-JUL26", batchId: "PYT-AFT-JUL26", name: "Python Afternoon (Jul 2026)", courseId: "python-314", courseName: "Python 3.14 Programming",
    facultyName: "Programming Faculty", timing: "02:00 PM - 03:30 PM", days: ["Tue", "Thu", "Sat"],
    mode: "online", capacity: 18, enrolled: 6, status: "upcoming", startDate: at(6), endDate: at(126) }
]);

export const DEMO_FEE_ROWS = Object.freeze([
  { id: "df1", receiptNo: "SSZ/RCPT/2026/0112", studentId: "SSZ2026DCA0007", studentName: "Rahul Kumar", amount: 1500, mode: "cash", paidOn: at(-12), status: "paid" },
  { id: "df2", receiptNo: "SSZ/RCPT/2026/0111", studentId: "SSZ2026TLY0011", studentName: "Priya Singh", amount: 1500, mode: "upi", paidOn: at(-14), status: "paid" },
  { id: "df3", receiptNo: "SSZ/RCPT/2026/0110", studentId: "SSZ2026PYT0004", studentName: "Pooja Singh", amount: 2500, mode: "razorpay", paidOn: at(-2), status: "paid" },
  { id: "df4", receiptNo: "", studentId: "SSZ2026TLY0011", studentName: "Priya Singh", amount: 0, mode: "upi", paidOn: null, status: "pending-verification", proofURL: "#" }
]);

export const DEMO_ENQUIRIES = Object.freeze([
  { id: "e1", name: "Sonu Kumar", mobile: "9801234567", subject: "Course & fees", message: "DCA ki fees aur timing kya hai?", isRead: false, createdAt: at(-0.2) },
  { id: "e2", name: "Khushboo", mobile: "9812340987", subject: "Batch timing", message: "Kya ladkiyon ke liye alag morning batch hai?", isRead: true, createdAt: at(-2) }
]);
