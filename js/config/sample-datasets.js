/* ==========================================================================
   Soft Skill Zone — Practice ke liye data files
   --------------------------------------------------------------------------
   Har file me DO sheet hoti hain:
     "Data" — kaccha data, bilkul waisa jaisa daftar me milta hai
     "Kaam" — us data par karne wale sawaal, aasaan se mushkil ke kram me

   Ek soch-samajh kar liya gaya faisla: hisaab wale column (Amount, Total,
   Percentage, Closing Stock) JAAN-BUJH KAR khaali chhode gaye hain. Data
   me hi jawab de dena practice ko bekaar kar deta hai — student ko wahi
   column khud banana hai, formula se.

   Data har baar bilkul ek jaisa banta hai (seeded random). Isliye teacher
   ki copy aur student ki copy me wahi numbers rehte hain — jawab milaana
   aasaan ho jaata hai.
   ========================================================================== */

/* Chhota seeded random — mulberry32. Isse har baar wahi data banta hai. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const between = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

const FIRST = ["Amit", "Priya", "Rahul", "Sunita", "Manoj", "Kavita", "Ravi", "Anita", "Vikash", "Pooja",
  "Santosh", "Rekha", "Deepak", "Nisha", "Rajesh", "Seema", "Alok", "Meena", "Sanjay", "Guddi",
  "Nitesh", "Archana", "Praveen", "Sarita", "Mukesh", "Jyoti", "Sudhir", "Babita", "Arun", "Shalini"];
const LAST = ["Kumar", "Kumari", "Singh", "Prasad", "Sharma", "Verma", "Gupta", "Yadav", "Mishra", "Pandey", "Ojha", "Tiwari"];
const CITY = ["Ara", "Patna", "Buxar", "Sasaram", "Jehanabad", "Chhapra", "Siwan", "Danapur", "Bihta", "Gaya"];

const name = (r) => `${pick(r, FIRST)} ${pick(r, LAST)}`;
const dayIn = (r, year, month) => new Date(year, month, between(r, 1, 28));

/* ==========================================================================
   1. Sales Register
   ========================================================================== */
function salesRegister() {
  const r = rng(20260801);
  const items = [
    ["Notebook 200 pg", "Stationery", 45], ["Ball Pen (pack)", "Stationery", 60],
    ["A4 Paper Ream", "Stationery", 320], ["Register 400 pg", "Stationery", 130],
    ["Pen Drive 32GB", "Electronics", 480], ["Keyboard", "Electronics", 550],
    ["Mouse", "Electronics", 280], ["Webcam", "Electronics", 1150],
    ["Office Chair", "Furniture", 3200], ["Study Table", "Furniture", 4500],
    ["Printer Ink", "Electronics", 720], ["File Folder", "Stationery", 35]
  ];

  const rows = [["Date", "Invoice No", "Customer", "City", "Item", "Category", "Qty", "Rate", "Amount"]];
  for (let i = 0; i < 150; i++) {
    const it = pick(r, items);
    rows.push([
      { d: dayIn(r, 2026, between(r, 0, 6)) },
      `INV-${String(1001 + i)}`,
      name(r), pick(r, CITY),
      it[0], it[1],
      between(r, 1, 25),
      it[2],
      null            // Amount — student banayega
    ]);
  }
  return {
    rows,
    widths: [12, 12, 18, 12, 18, 12, 7, 9, 11],
    tasks: [
      ["#", "Kaam", "Ishaara"],
      [1, "Amount column (I) bharein — Qty × Rate.", "=G2*H2, fir neeche tak kheenchein"],
      [2, "Kul kitni sale hui?", "SUM"],
      [3, "Sabse badi ek sale kitni thi?", "MAX"],
      [4, "Kitne invoice bane? (ginti)", "COUNTA ya COUNT"],
      [5, "Sirf Ara ke customers ki kul sale nikaalein.", "SUMIF — City column par shart"],
      [6, "Ara me kitne invoice bane?", "COUNTIF"],
      [7, "Stationery ki kul sale nikaalein.", "SUMIF — Category par"],
      [8, "Ara ki Electronics ki sale nikaalein (dono shartein).", "SUMIFS"],
      [9, "Har invoice par 18% GST ka column banayein.", "=I2*18%"],
      [10, "Amount ke hisaab se sabse upar wale 5 invoice nikaalein.", "LARGE ya Sort"],
      [11, "Ek naya column: agar Amount 5000 se zyada ho to \"Bada\", warna \"Chhota\".", "IF"],
      [12, "Har City ki alag-alag sale ek chhoti table me nikaalein.", "UNIQUE + SUMIF, ya Pivot Table"],
      [13, "Sabse zyada baar bika hua item kaunsa hai?", "COUNTIF har item par"],
      [14, "Sirf January ki sale nikaalein.", "SUMIFS date range ke saath"]
    ]
  };
}

/* ==========================================================================
   2. Student Marksheet
   ========================================================================== */
function marksheet() {
  const r = rng(19990420);
  const courses = ["AI Powered DCA", "ADCA", "AI Powered Tally Prime", "GST 2.0 Master", "Python 3.14"];
  const rows = [["Roll No", "Student Name", "Course", "Batch", "Computer", "Excel", "Tally", "Accounts", "English", "Total", "Percentage", "Grade"]];

  for (let i = 0; i < 60; i++) {
    /* Kuchh students ko jaan-bujh kar kam marks diye hain, taaki Pass/Fail
       aur grade wala kaam sach me kuchh dikhaye. */
    const weak = r() < 0.18;
    const mk = () => (weak ? between(r, 12, 40) : between(r, 33, 98));
    rows.push([
      `R${String(101 + i)}`, name(r), pick(r, courses), pick(r, ["Morning", "Evening"]),
      mk(), mk(), mk(), mk(), mk(),
      null, null, null   // Total, Percentage, Grade — student banayega
    ]);
  }
  return {
    rows,
    widths: [9, 18, 20, 10, 10, 8, 8, 10, 9, 8, 11, 8],
    tasks: [
      ["#", "Kaam", "Ishaara"],
      [1, "Total column (J) bharein — paanch subject ka jod.", "=SUM(E2:I2)"],
      [2, "Percentage column (K) bharein. Har subject 100 ka hai.", "=J2/500*100"],
      [3, "Grade column (L): 80+ = A, 60+ = B, 45+ = C, 33+ = D, warna Fail.", "Nested IF ya IFS"],
      [4, "Class ka average percentage nikaalein.", "AVERAGE"],
      [5, "Class me sabse zyada aur sabse kam total kitna hai?", "MAX aur MIN"],
      [6, "Kitne students pass hue (har subject me 33+)?", "COUNTIFS"],
      [7, "Topper ka naam nikaalein.", "INDEX + MATCH(MAX(...))"],
      [8, "Har student ka rank nikaalein.", "RANK"],
      [9, "Morning batch ka average percentage.", "AVERAGEIF"],
      [10, "Excel me sabse zyada number kisne paye?", "MAX + MATCH"],
      [11, "Roll No daalne par naam aur percentage dikhane wali chhoti sheet banayein.", "VLOOKUP ya XLOOKUP"],
      [12, "Course-wise kitne students hain?", "COUNTIF"],
      [13, "Jinke marks kisi bhi subject me 33 se kam hain, unhe alag rang dein.", "Conditional Formatting"],
      [14, "Naam ko UPPER case me ek naye column me nikaalein.", "UPPER"]
    ]
  };
}

/* ==========================================================================
   3. Attendance Register (lambi list — COUNTIFS ke liye sabse achhi)
   ========================================================================== */
function attendance() {
  const r = rng(20250115);
  const students = Array.from({ length: 24 }, (_, i) => [`R${String(101 + i)}`, name(r)]);
  const rows = [["Date", "Roll No", "Student Name", "Batch", "Status"]];

  for (let d = 1; d <= 26; d++) {
    const day = new Date(2026, 5, d);
    if (day.getDay() === 0) continue;            // Ravivaar chhutti
    students.forEach(([roll, nm], idx) => {
      const x = r();
      const status = x < 0.82 ? "Present" : x < 0.93 ? "Absent" : x < 0.97 ? "Late" : "Leave";
      rows.push([{ d: day }, roll, nm, idx % 2 === 0 ? "Morning" : "Evening", status]);
    });
  }
  return {
    rows,
    widths: [12, 9, 18, 10, 10],
    tasks: [
      ["#", "Kaam", "Ishaara"],
      [1, "Kul kitni entries hain?", "COUNTA"],
      [2, "Kul kitne \"Present\" hain?", "COUNTIF"],
      [3, "R101 kitne din present raha?", "COUNTIFS — roll aur status dono"],
      [4, "Har student ke Present din ki list banayein.", "UNIQUE roll + COUNTIFS"],
      [5, "Har student ka attendance percentage nikaalein.", "Present ÷ kul din × 100"],
      [6, "Morning batch me kitne Absent hain?", "COUNTIFS"],
      [7, "Jinka attendance 75% se kam hai, unke naam nikaalein.", "IF + FILTER ya Sort"],
      [8, "Kis din sabse zyada log absent the?", "COUNTIFS date par"],
      [9, "\"Late\" aur \"Leave\" ko milaakar kitne hain?", "Do COUNTIF jod dein"],
      [10, "Ek chhoti table: har din ka Present count.", "UNIQUE date + COUNTIF, ya Pivot Table"],
      [11, "Sirf June ke pehle hafte ka data alag nikaalein.", "Filter ya FILTER function"],
      [12, "Roll No daalne par uska attendance % dikhane wali sheet banayein.", "VLOOKUP"]
    ]
  };
}

/* ==========================================================================
   4. GST Invoice data
   ========================================================================== */
function gstData() {
  const r = rng(20260401);
  const hsn = [["8471", "Computer / Laptop", 18], ["4820", "Register, Notebook", 12],
    ["9608", "Pen, Marker", 18], ["8523", "Pen Drive", 18], ["4901", "Printed Books", 0],
    ["9403", "Office Furniture", 18], ["2523", "Cement", 28], ["6109", "T-Shirt", 5]];
  const states = ["Bihar", "Bihar", "Bihar", "Uttar Pradesh", "Jharkhand", "West Bengal", "Delhi"];

  const rows = [["Invoice No", "Date", "Party Name", "GSTIN", "State", "HSN", "Item", "Taxable Value", "GST %", "CGST", "SGST", "IGST", "Invoice Total"]];
  for (let i = 0; i < 100; i++) {
    const h = pick(r, hsn);
    const st = pick(r, states);
    rows.push([
      `SSZ/26-27/${String(101 + i)}`,
      { d: dayIn(r, 2026, between(r, 3, 7)) },
      `${name(r)} Traders`,
      `${between(r, 10, 37)}${String.fromCharCode(65 + between(r, 0, 25))}${between(r, 1000, 9999)}${String.fromCharCode(65 + between(r, 0, 25))}1Z${between(r, 1, 9)}`,
      st, h[0], h[1],
      between(r, 500, 90000),
      h[2],
      null, null, null, null   // CGST, SGST, IGST, Total — student banayega
    ]);
  }
  return {
    rows,
    widths: [16, 12, 20, 17, 14, 8, 18, 13, 8, 10, 10, 10, 13],
    tasks: [
      ["#", "Kaam", "Ishaara"],
      [1, "Bihar wale invoice par CGST aur SGST lagega (aadha-aadha), baaki state par IGST (poora).", "Yahi GST ka asli niyam hai"],
      [2, "CGST column bharein — sirf Bihar wale rows par.", "=IF(E2=\"Bihar\", H2*I2%/2, 0)"],
      [3, "SGST column bharein.", "CGST jaisa hi"],
      [4, "IGST column bharein — sirf Bihar ke alawa.", "=IF(E2<>\"Bihar\", H2*I2%, 0)"],
      [5, "Invoice Total bharein — Taxable + saara tax.", "=H2+J2+K2+L2"],
      [6, "Kul Taxable Value kitni hai?", "SUM"],
      [7, "Kul CGST, SGST aur IGST alag-alag nikaalein.", "SUM"],
      [8, "Sirf 18% wale invoice ka kul taxable value.", "SUMIF"],
      [9, "Bihar ke bahar kitne invoice bane?", "COUNTIF ya COUNTIFS"],
      [10, "Har HSN ka kul taxable value nikaalein.", "SUMIF ya Pivot Table"],
      [11, "Sabse bade 5 invoice nikaalein.", "LARGE"],
      [12, "GSTIN ke pehle 2 ank state code hote hain — unhe alag column me nikaalein.", "LEFT"],
      [13, "Invoice number me se sirf aakhri number nikaalein.", "RIGHT ya MID"],
      [14, "Har mahine ka kul GST nikaalein.", "MONTH + SUMIFS"]
    ]
  };
}

/* ==========================================================================
   5. Employee Salary
   ========================================================================== */
function salary() {
  const r = rng(20240710);
  const dept = ["Teaching", "Admin", "Accounts", "Lab", "Marketing"];
  const rows = [["Emp ID", "Name", "Department", "Joining Date", "Basic", "HRA %", "DA %", "Deduction", "Gross", "Net Salary", "Kitne Saal"]];

  for (let i = 0; i < 50; i++) {
    rows.push([
      `E${String(1001 + i)}`, name(r), pick(r, dept),
      { d: new Date(between(r, 2016, 2025), between(r, 0, 11), between(r, 1, 28)) },
      between(r, 9, 45) * 1000,
      pick(r, [20, 25, 30, 40]),
      pick(r, [10, 12, 15, 18]),
      between(r, 500, 4500),
      null, null, null   // Gross, Net, Saal — student banayega
    ]);
  }
  return {
    rows,
    widths: [9, 18, 13, 13, 10, 8, 8, 11, 11, 12, 11],
    tasks: [
      ["#", "Kaam", "Ishaara"],
      [1, "Gross column bharein — Basic + HRA + DA.", "=E2 + E2*F2% + E2*G2%"],
      [2, "Net Salary bharein — Gross me se Deduction.", "=I2-H2"],
      [3, "\"Kitne Saal\" column bharein — joining se aaj tak.", "=DATEDIF(D2, TODAY(), \"Y\")"],
      [4, "Kul salary kitni ja rahi hai (Net ka jod)?", "SUM"],
      [5, "Sabse zyada aur sabse kam Net salary.", "MAX, MIN"],
      [6, "Teaching department ki kul salary.", "SUMIF"],
      [7, "Har department ka average Net salary.", "AVERAGEIF"],
      [8, "5 saal se zyada purane kitne log hain?", "COUNTIF"],
      [9, "Jinki Net salary 30,000 se zyada hai, unke naam.", "IF ya Filter"],
      [10, "Emp ID daalne par naam aur salary dikhane wali sheet.", "VLOOKUP"],
      [11, "Har naam ko \"Naam (Department)\" ke roop me jodein.", "= B2 & \" (\" & C2 & \")\""],
      [12, "Joining date se sirf saal alag column me nikaalein.", "YEAR"],
      [13, "Salary ko 2 dashamlav tak gol karein.", "ROUND"]
    ]
  };
}

/* ==========================================================================
   6. Stock / Inventory
   ========================================================================== */
function stock() {
  const r = rng(20261111);
  const cat = ["Stationery", "Electronics", "Furniture", "Cleaning"];
  const items = ["Notebook", "Pen", "Marker", "A4 Paper", "Register", "File", "Stapler", "Punch",
    "Pen Drive", "Mouse", "Keyboard", "HDMI Cable", "Ink Cartridge", "Chair", "Table", "Rack",
    "Duster", "Phenyl", "Broom", "Hand Wash"];

  const rows = [["Item Code", "Item Name", "Category", "Unit", "Opening Stock", "Purchase", "Sale", "Closing Stock", "Rate", "Stock Value", "Order Karein?"]];
  items.forEach((it, i) => {
    for (let v = 0; v < 4; v++) {
      rows.push([
        `IT${String(101 + i * 4 + v)}`,
        `${it} ${["A", "B", "C", "D"][v]}`,
        cat[i % cat.length],
        pick(r, ["Pcs", "Box", "Pkt", "Ream"]),
        between(r, 0, 220),
        between(r, 0, 120),
        between(r, 0, 250),
        null, between(r, 15, 4200), null, null
      ]);
    }
  });
  return {
    rows,
    widths: [10, 16, 13, 7, 13, 10, 8, 13, 9, 12, 13],
    tasks: [
      ["#", "Kaam", "Ishaara"],
      [1, "Closing Stock bharein — Opening + Purchase − Sale.", "=E2+F2-G2"],
      [2, "Stock Value bharein — Closing × Rate.", "=H2*I2"],
      [3, "\"Order Karein?\" bharein — Closing 20 se kam ho to \"Haan\", warna \"Nahi\".", "IF"],
      [4, "Kul stock value kitni hai?", "SUM"],
      [5, "Kitne item order karne hain?", "COUNTIF"],
      [6, "Electronics ki kul stock value.", "SUMIF"],
      [7, "Jinka Closing Stock minus me aa gaya, unhe dhundhein — ye galti hai.", "IF ya Conditional Formatting"],
      [8, "Sabse mehngi stock value wale 5 item.", "LARGE"],
      [9, "Har category ki kul value.", "SUMIF ya Pivot Table"],
      [10, "Item code daalne par naam aur closing stock dikhane wali sheet.", "VLOOKUP"],
      [11, "Item Name me se sirf pehla shabd nikaalein.", "LEFT + FIND"],
      [12, "Jitne item ka stock 0 hai, unhe ginein.", "COUNTIF"]
    ]
  };
}

/* ==========================================================================
   List
   ========================================================================== */
export const SAMPLE_DATASETS = [
  {
    id: "sales-register", title: "Sales Register", file: "SSZ-Sales-Register",
    icon: "receipt", color: "#059669",
    desc: "150 bill — date, customer, city, item, qty aur rate. Amount aur GST aapko nikaalna hai.",
    learn: ["SUM", "SUMIF", "SUMIFS", "COUNTIF", "IF", "Pivot Table"],
    build: salesRegister
  },
  {
    id: "marksheet", title: "Student Marksheet", file: "SSZ-Marksheet",
    icon: "graduation", color: "#4f46e5",
    desc: "60 students, 5 subject. Total, percentage, grade aur rank khud banane hain.",
    learn: ["SUM", "IF", "Nested IF", "RANK", "VLOOKUP", "AVERAGE"],
    build: marksheet
  },
  {
    id: "attendance", title: "Attendance Register", file: "SSZ-Attendance",
    icon: "userCheck", color: "#0891b2",
    desc: "24 students × 26 din ki haazri, ek lambi list me — COUNTIFS sikhne ke liye sabse achhi.",
    learn: ["COUNTIF", "COUNTIFS", "UNIQUE", "Percentage", "Pivot Table"],
    build: attendance
  },
  {
    id: "gst-invoices", title: "GST Invoice Data", file: "SSZ-GST-Invoices",
    icon: "wallet", color: "#7c3aed",
    desc: "100 invoice — Bihar aur bahar dono. CGST/SGST kab, IGST kab — yahi asli sawaal hai.",
    learn: ["IF", "SUMIF", "LEFT", "MONTH", "Percentage"],
    build: gstData
  },
  {
    id: "salary", title: "Employee Salary", file: "SSZ-Salary",
    icon: "users", color: "#e11d48",
    desc: "50 karmchari — basic, HRA, DA aur deduction. Gross, net aur naukri ke saal nikaalein.",
    learn: ["DATEDIF", "SUMIF", "AVERAGEIF", "ROUND", "VLOOKUP"],
    build: salary
  },
  {
    id: "stock", title: "Stock / Inventory", file: "SSZ-Stock",
    icon: "folder", color: "#b45309",
    desc: "80 item ka stock — opening, purchase aur sale. Closing stock aur re-order khud nikaalein.",
    learn: ["IF", "SUMIF", "COUNTIF", "LARGE", "VLOOKUP"],
    build: stock
  }
];

export const getDataset = (id) => SAMPLE_DATASETS.find((d) => d.id === id) || null;
