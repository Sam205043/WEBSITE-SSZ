/* ==========================================================================
   Soft Skill Zone — Site configuration & seed content
   --------------------------------------------------------------------------
   Everything an admin might want to change without touching page markup.
   The COURSES array also doubles as the Firestore seed for `courses`.
   Fees / durations are editable defaults — update them to your actual rates.
   ========================================================================== */

/* ==========================================================================
   Institute
   ========================================================================== */
export const INSTITUTE = Object.freeze({
  name: "Soft Skill Zone Institute",
  shortName: "Soft Skill Zone",
  initials: "SSZ",
  tagline: "Learn Today. Lead Tomorrow.",
  taglineHi: "Aaj Seekho. Kal Lead Karo.",
  established: 2016,
  description:
    "Ara, Bihar ka premium computer & commerce training institute — AI-powered courses, " +
    "government-recognised certification aur 100% practical training ke saath.",

  /* Contact — also stored in Firestore settings/institute so admin can edit live */
  phone: "+91 62028 56897",
  whatsapp: "+91 62028 56897",
  email: "info@softskillzone.in",
  address: "Near Gym Town, Pakri, Ara, Bhojpur, Bihar - 802301",
  addressLines: ["Near Gym Town, Pakri", "Ara, Bhojpur, Bihar - 802301"],
  mapQuery: "Soft Skill Zone Institute, Near Gym Town, Pakri, Ara, Bihar",

  timings: [
    { day: "Monday - Saturday", time: "08:00 AM - 08:00 PM" },
    { day: "Sunday", time: "10:00 AM - 02:00 PM" }
  ],

  /* Social page abhi bane nahi hain. Khaali chhodne par footer.js us icon ko
     hata deta hai — aur yahi theek hai: aisa link jo Facebook ke apne
     homepage par pahuncha de, na hone se bura hai.
     Page ban jayein to bas yahan poora URL likh dena, aur kuchh nahi. */
  social: {
    facebook:  "",
    instagram: "",
    youtube:   "",
    linkedin:  "",
    telegram:  ""
  },

  /* Fee payment — Razorpay Payment Page (serverless, no backend needed).
     Student "Pay Now" dabata hai -> Razorpay page -> paisa seedha institute ke
     account me. Verification manual hai: student proof upload karta hai, admin
     dashboard se verify karke receipt banata hai.
     Firebase connect hone ke baad Firestore ke settings/institute doc me yahi
     do fields rakhkar bina code chhue badla ja sakta hai. */
  payments: {
    razorpayLink: "https://rzp.io/rzp/CCEWjTnM",
    /* Seedhi UPI id ab website par kahin nahi dikhti (3 Aug 2026). Google Pay
       browser se aaye link par aam UPI id ko payment karne se mana kar deta
       hai — char students ke saath yahi hua — isliye online payment sirf
       Razorpay se hota hai. Ye value sirf record ke liye rakhi hai. */
    upiId: "softskillzone@ybl",
    accountName: "Soft Skill Zone Institute"
  }
});

/* ==========================================================================
   Trust stats (landing page counters)
   ========================================================================== */
export const STATS = Object.freeze([
  { value: 5000, suffix: "+", label: "Students Trained",  icon: "users" },
  { value: 10,   suffix: "",  label: "Career Courses",    icon: "book" },
  { value: 95,   suffix: "%", label: "Placement Support", icon: "trending" },
  { value: 9,    suffix: "+", label: "Years of Trust",    icon: "award" }
]);

/* ==========================================================================
   COURSES — 10 programmes
   `code` is used inside the generated Student ID (SSZ2026DCA0007)
   ========================================================================== */
export const COURSES = Object.freeze([
  {
    id: "ai-dca", code: "DCA", order: 1,
    title: "AI Powered DCA",
    shortTitle: "AI DCA",
    tagline: "Computer basics + AI tools — sabse popular course",
    description:
      "Diploma in Computer Applications, ab AI ke saath. MS Office, Internet, typing aur " +
      "computer fundamentals ke saath ChatGPT, Canva AI aur prompt writing bhi seekhein — " +
      "taaki aap office ka kaam aadhe time me kar sakein.",
    category: "ai", level: "beginner",
    durationMonths: 6, fee: 6000, admissionFee: 0,
    icon: "sparkles", colorFrom: "#4f46e5", colorTo: "#7c3aed",
    isPopular: true, isNew: false, isActive: true,
    highlights: [
      "AI tools ke saath practical assignments",
      "MS Word, Excel, PowerPoint in depth",
      "Hindi + English typing practice",
      "Government-recognised certificate"
    ],
    eligibility: ["10th pass ya usse upar", "Koi prior computer knowledge zaroori nahi"],
    careerOptions: ["Computer Operator", "Data Entry Executive", "Back Office Assistant", "AI Content Assistant"],
    modules: [
      { title: "Computer Fundamentals", topics: ["Hardware & Software", "Windows 11", "File Management", "Internet & Email"] },
      { title: "MS Office Complete", topics: ["MS Word", "MS Excel + Formulas", "PowerPoint", "Mail Merge"] },
      { title: "AI Productivity", topics: ["ChatGPT for office work", "Prompt writing basics", "Canva AI design", "Gemini research"] },
      { title: "Typing & Practical", topics: ["English typing 30+ WPM", "Hindi Mangal typing", "Live project", "Final assessment"] }
    ]
  },
  {
    id: "ai-tally-prime", code: "TLY", order: 2,
    title: "AI Powered Tally Prime",
    shortTitle: "Tally Prime",
    tagline: "Accounting + GST + AI — job-ready in 3 months",
    description:
      "Tally Prime ka complete practical training — company creation se GST return tak. " +
      "Saath me AI tools se reconciliation aur report analysis fast karna seekhein.",
    category: "accounts", level: "beginner",
    durationMonths: 3, fee: 5000, admissionFee: 0,
    icon: "wallet", colorFrom: "#059669", colorTo: "#06b6d4",
    isPopular: true, isNew: false, isActive: true,
    highlights: [
      "Latest Tally Prime version par training",
      "Real business vouchers par practice",
      "GST, TDS aur payroll included",
      "Interview preparation support"
    ],
    eligibility: ["10th/12th pass", "Commerce background helpful, zaroori nahi"],
    careerOptions: ["Accountant", "Tally Operator", "GST Assistant", "Billing Executive"],
    modules: [
      { title: "Tally Foundation", topics: ["Company creation", "Ledgers & groups", "Vouchers", "Inventory masters"] },
      { title: "GST in Tally", topics: ["GST setup", "Sales & purchase entry", "GSTR-1 & 3B", "E-way bill"] },
      { title: "Advanced Tally", topics: ["Payroll", "TDS entries", "Bank reconciliation", "Cost centres"] },
      { title: "AI + Reports", topics: ["Balance Sheet & P&L", "AI-assisted data checking", "Excel export", "Live case study"] }
    ]
  },
  {
    id: "python-314", code: "PYT", order: 3,
    title: "Python 3.14 Programming",
    shortTitle: "Python 3.14",
    tagline: "Zero se programming — projects ke saath",
    description:
      "Latest Python 3.14 par complete programming course. Syntax se shuru karke " +
      "automation scripts, data handling aur mini projects tak — sab practical.",
    category: "programming", level: "intermediate",
    durationMonths: 4, fee: 7000, admissionFee: 0,
    icon: "zap", colorFrom: "#0891b2", colorTo: "#4f46e5",
    isPopular: true, isNew: true, isActive: true,
    highlights: [
      "Python 3.14 latest features",
      "5+ real projects portfolio ke liye",
      "Automation aur file handling",
      "Basic data analysis with pandas"
    ],
    eligibility: ["12th pass", "Basic computer knowledge"],
    careerOptions: ["Junior Python Developer", "Automation Executive", "Data Analyst (entry)", "Software Trainee"],
    modules: [
      { title: "Python Basics", topics: ["Variables & data types", "Operators", "Conditions & loops", "Functions"] },
      { title: "Core Python", topics: ["Lists, tuples, dicts", "String handling", "File I/O", "Error handling"] },
      { title: "OOP & Modules", topics: ["Classes & objects", "Inheritance", "Modules & packages", "Virtual environments"] },
      { title: "Projects", topics: ["Automation script", "Excel report generator", "Mini web scraper", "Capstone project"] }
    ]
  },
  {
    id: "adca", code: "ADC", order: 4,
    title: "ADCA",
    shortTitle: "ADCA",
    tagline: "Advanced Diploma — computer ka complete package",
    description:
      "Advanced Diploma in Computer Applications — ek saal ka comprehensive programme " +
      "jisme office suite, accounting, DTP, internet aur basic programming sab shamil hai.",
    category: "academic", level: "intermediate",
    durationMonths: 12, fee: 10000, admissionFee: 0,
    icon: "graduation", colorFrom: "#7c3aed", colorTo: "#f43f5e",
    isPopular: true, isNew: false, isActive: true,
    highlights: [
      "12 months ka complete syllabus",
      "Tally + DTP + Office ek saath",
      "Practical lab har din",
      "Placement assistance"
    ],
    eligibility: ["10th pass ya usse upar"],
    careerOptions: ["Computer Operator", "Office Assistant", "DTP Operator", "Accounts Assistant"],
    modules: [
      { title: "Module 1", topics: ["Computer fundamentals", "Windows", "MS Office", "Internet & email"] },
      { title: "Module 2", topics: ["Tally Prime", "GST basics", "Financial accounting", "Billing software"] },
      { title: "Module 3", topics: ["Photoshop", "CorelDRAW", "PageMaker / DTP", "Design practical"] },
      { title: "Module 4", topics: ["HTML & CSS basics", "AI tools", "Project work", "Final exam"] }
    ]
  },
  {
    id: "ai-video-editing", code: "VID", order: 5,
    title: "AI Powered Video Editing",
    shortTitle: "Video Editing",
    tagline: "Reels, YouTube aur ads — AI ke saath",
    description:
      "Professional video editing with AI — auto captions, background removal, voice " +
      "cleanup aur fast reel production. Freelancing ke liye ekdum practical course.",
    category: "creative", level: "beginner",
    durationMonths: 3, fee: 6500, admissionFee: 0,
    icon: "video", colorFrom: "#f43f5e", colorTo: "#f59e0b",
    isPopular: false, isNew: true, isActive: true,
    highlights: [
      "Reels & shorts editing mastery",
      "AI captions aur auto-cut tools",
      "Thumbnail design included",
      "Freelancing guidance"
    ],
    eligibility: ["10th pass", "Laptop/mobile helpful"],
    careerOptions: ["Video Editor", "Reel Creator", "YouTube Editor", "Freelance Content Creator"],
    modules: [
      { title: "Editing Foundation", topics: ["Timeline basics", "Cuts & transitions", "Audio sync", "Export settings"] },
      { title: "AI Tools", topics: ["Auto captions", "Background removal", "Voice enhancement", "AI B-roll"] },
      { title: "Design & Graphics", topics: ["Thumbnails", "Motion text", "Colour grading", "Brand kit"] },
      { title: "Client Projects", topics: ["Reel package", "YouTube long-form", "Ad edit", "Portfolio build"] }
    ]
  },
  {
    id: "icom", code: "ICM", order: 6,
    title: "I.Com",
    shortTitle: "I.Com",
    tagline: "Intermediate Commerce — strong base for B.Com",
    description:
      "Intermediate Commerce ki complete coaching — Accountancy, Business Studies, " +
      "Economics aur Entrepreneurship, board exam pattern ke hisaab se.",
    category: "academic", level: "beginner",
    durationMonths: 24, fee: 12000, admissionFee: 0,
    icon: "book", colorFrom: "#f59e0b", colorTo: "#059669",
    isPopular: false, isNew: false, isActive: true,
    highlights: [
      "BSEB board pattern ke hisaab se",
      "Monthly tests aur doubt classes",
      "Accountancy par extra practical",
      "Computer basics free"
    ],
    eligibility: ["10th pass"],
    careerOptions: ["B.Com admission", "CA Foundation prep", "Junior Accountant", "Government exam base"],
    modules: [
      { title: "Accountancy", topics: ["Journal & ledger", "Trial balance", "Final accounts", "Partnership"] },
      { title: "Business Studies", topics: ["Business environment", "Management principles", "Marketing", "Finance"] },
      { title: "Economics", topics: ["Micro economics", "Macro economics", "Statistics", "Indian economy"] },
      { title: "Entrepreneurship", topics: ["Business idea", "Project report", "MSME basics", "Practical file"] }
    ]
  },
  {
    id: "bcom", code: "BCM", order: 7,
    title: "B.Com",
    shortTitle: "B.Com",
    tagline: "Graduation + practical accounting skills",
    description:
      "B.Com ki subject-wise coaching, saath me Tally, GST aur Excel ki practical training " +
      "— taaki degree ke saath job-ready skill bhi mile.",
    category: "academic", level: "intermediate",
    durationMonths: 36, fee: 18000, admissionFee: 0,
    icon: "graduation", colorFrom: "#4f46e5", colorTo: "#0891b2",
    isPopular: false, isNew: false, isActive: true,
    highlights: [
      "University syllabus coverage",
      "Tally + GST practical free",
      "Semester-wise test series",
      "Career counselling"
    ],
    eligibility: ["12th pass (Commerce preferred)"],
    careerOptions: ["Accountant", "Audit Assistant", "Banking exams", "M.Com / MBA"],
    modules: [
      { title: "Year 1", topics: ["Financial Accounting", "Business Law", "Micro Economics", "Business Communication"] },
      { title: "Year 2", topics: ["Corporate Accounting", "Cost Accounting", "Income Tax", "Company Law"] },
      { title: "Year 3", topics: ["Auditing", "Management Accounting", "GST", "Project work"] },
      { title: "Practical Add-on", topics: ["Tally Prime", "Advanced Excel", "GST return filing", "Interview prep"] }
    ]
  },
  {
    id: "gst-2", code: "GST", order: 8,
    title: "GST 2.0 Master Course",
    shortTitle: "GST 2.0",
    tagline: "Registration se return filing tak — updated rules",
    description:
      "GST 2.0 ke naye slabs aur rules ke hisaab se complete practical course. " +
      "Portal par live filing practice ke saath.",
    category: "taxation", level: "intermediate",
    durationMonths: 2, fee: 4500, admissionFee: 0,
    icon: "receipt", colorFrom: "#059669", colorTo: "#4f46e5",
    isPopular: true, isNew: true, isActive: true,
    highlights: [
      "GST 2.0 updated slabs & rules",
      "Live portal filing practice",
      "E-invoice aur e-way bill",
      "Notice reply drafting basics"
    ],
    eligibility: ["12th pass", "Basic accounting knowledge helpful"],
    careerOptions: ["GST Practitioner Assistant", "Tax Assistant", "Accounts Executive", "Freelance return filer"],
    modules: [
      { title: "GST Foundation", topics: ["GST structure", "CGST/SGST/IGST", "Registration process", "Composition scheme"] },
      { title: "Invoicing", topics: ["Tax invoice rules", "E-invoice", "E-way bill", "Debit/credit notes"] },
      { title: "Returns", topics: ["GSTR-1", "GSTR-3B", "GSTR-9 annual", "Late fee & interest"] },
      { title: "Advanced", topics: ["Input tax credit", "Reverse charge", "Refunds", "Departmental notices"] }
    ]
  },
  {
    id: "income-tax-2025", code: "ITX", order: 9,
    title: "New Income Tax Act 2025",
    shortTitle: "Income Tax 2025",
    tagline: "Naye Act ke hisaab se ITR filing seekhein",
    description:
      "New Income Tax Act 2025 ke provisions, slabs aur ITR forms ka practical course. " +
      "Salaried, business aur capital gains — teeno cases cover.",
    category: "taxation", level: "intermediate",
    durationMonths: 2, fee: 4500, admissionFee: 0,
    icon: "fileText", colorFrom: "#7c3aed", colorTo: "#06b6d4",
    isPopular: false, isNew: true, isActive: true,
    highlights: [
      "New Act 2025 ke updated provisions",
      "ITR-1 se ITR-4 tak filing practice",
      "Old vs new regime comparison",
      "Form 16 aur AIS reading"
    ],
    eligibility: ["12th pass", "Accounting basics"],
    careerOptions: ["Tax Return Preparer", "Accounts Executive", "CA firm assistant", "Freelance ITR filer"],
    modules: [
      { title: "Act Basics", topics: ["Heads of income", "Residential status", "New slabs 2025", "Assessment year"] },
      { title: "Computation", topics: ["Salary income", "House property", "Business income", "Capital gains"] },
      { title: "Deductions", topics: ["Chapter VI-A", "Old vs new regime", "Rebates", "Set-off & carry forward"] },
      { title: "Filing", topics: ["ITR-1 to ITR-4", "Form 16 & AIS", "e-Verification", "Revised & belated returns"] }
    ]
  },
  {
    id: "tds-finance-2025", code: "TDS", order: 10,
    title: "TDS Finance Act 2025",
    shortTitle: "TDS 2025",
    tagline: "Deduction, deposit aur return — sab practical",
    description:
      "Finance Act 2025 ke hisaab se TDS/TCS ka complete course — section-wise rates, " +
      "challan deposit, return filing aur Form 16/16A generation.",
    category: "taxation", level: "advanced",
    durationMonths: 2, fee: 3500, admissionFee: 0,
    icon: "clipboard", colorFrom: "#e11d48", colorTo: "#7c3aed",
    isPopular: false, isNew: true, isActive: true,
    highlights: [
      "Finance Act 2025 updated rates",
      "TRACES portal practical",
      "Form 16 / 16A generation",
      "Late fee & interest calculation"
    ],
    eligibility: ["Accounting ya taxation ka basic knowledge"],
    careerOptions: ["TDS Executive", "Payroll Assistant", "Compliance Executive", "CA firm assistant"],
    modules: [
      { title: "TDS Basics", topics: ["Concept & applicability", "Section-wise rates", "Threshold limits", "PAN/Aadhaar rules"] },
      { title: "Deposit", topics: ["Challan 281", "Due dates", "Interest on late deposit", "Corrections"] },
      { title: "Returns", topics: ["24Q & 26Q", "27Q & 27EQ", "Quarterly filing", "Correction statements"] },
      { title: "TRACES", topics: ["Form 16 / 16A", "Justification report", "Default resolution", "TCS overview"] }
    ]
  }
]);

export const COURSE_CATEGORIES = Object.freeze([
  { value: "all",        label: "All Courses" },
  { value: "ai",         label: "AI Powered" },
  { value: "accounts",   label: "Accounting" },
  { value: "taxation",   label: "Taxation" },
  { value: "programming",label: "Programming" },
  { value: "creative",   label: "Creative" },
  { value: "academic",   label: "Academic" }
]);

/* ==========================================================================
   Navigation
   ========================================================================== */
export const MAIN_NAV = Object.freeze([
  { label: "Home",      route: "home" },
  { label: "About",     route: "about" },
  { label: "Courses",   route: "courses" },
  { label: "Faculty",   route: "faculty" },
  { label: "Reviews",   route: "reviews" },
  { label: "Gallery",   route: "gallery" },
  { label: "Free Tools",route: "tools" },
  { label: "Blog",      route: "blog" },
  { label: "Contact",   route: "contact" }
]);

export const FOOTER_NAV = Object.freeze({
  "Institute": [
    { label: "About Us",      route: "about" },
    { label: "Our Faculty",   route: "faculty" },
    { label: "Gallery",       route: "gallery" },
    { label: "Student Reviews", route: "reviews" },
    { label: "Blog",          route: "blog" },
    { label: "Contact",       route: "contact" }
  ],
  "Students": [
    { label: "Online Admission",  route: "admission" },
    { label: "Student Login",     route: "studentLogin" },
    { label: "Free Tools",        route: "tools" },
    { label: "Verify Certificate",route: "verify" },
    { label: "FAQ",               route: "faq" },
    { label: "Admin Login",       route: "adminLogin" }
  ]
});

/* ==========================================================================
   Free Student Tools
   ========================================================================== */
export const TOOLS = Object.freeze([
  { id: "gst-calculator",       route: "toolGst",        title: "GST Calculator",        desc: "Inclusive/exclusive GST turant nikalein", icon: "calculator", color: "#059669" },
  { id: "gst-quiz",             route: "toolGstQuiz",    title: "GST Quiz",              desc: "GST knowledge test karein",               icon: "clipboard",  color: "#4f46e5" },
  { id: "hsn-search",           route: "toolHsn",        title: "HSN Code Search",       desc: "Product ka HSN aur GST rate dhundein",    icon: "search",     color: "#0891b2" },
  { id: "invoice-generator",    route: "toolInvoice",    title: "Invoice Generator",     desc: "GST invoice banayein aur print karein",   icon: "receipt",    color: "#7c3aed" },
  { id: "age-calculator",       route: "toolAge",        title: "Age Calculator",        desc: "Exact age aur next birthday",             icon: "calendar",   color: "#f59e0b" },
  { id: "percentage-calculator",route: "toolPercentage", title: "Marks & Percentage",    desc: "Subject-wise total, %, grade aur division", icon: "trending",  color: "#e11d48" },
  { id: "emi-calculator",       route: "toolEmi",        title: "EMI Calculator",        desc: "Loan EMI aur total interest",             icon: "wallet",     color: "#059669" },
  { id: "resume-builder",       route: "toolResume",     title: "Resume Builder",        desc: "Professional resume PDF banayein",        icon: "fileText",   color: "#4f46e5" },
  { id: "typing-test",          route: "toolTyping",     title: "Typing Test",           desc: "WPM aur accuracy check karein",           icon: "keyboard",   color: "#0891b2" },
  { id: "qr-generator",         route: "toolQr",         title: "QR Code Generator",     desc: "Text ya link ka QR banayein",             icon: "qrcode",     color: "#7c3aed" },
  { id: "mega-quiz",            route: "toolMegaQuiz",   title: "MS Office Mega Quiz",   desc: "480 sawaal — module chunkar practice",    icon: "clipboard",  color: "#4f46e5" },
  { id: "shortcut-trainer",     route: "toolShortcuts",  title: "Shortcut Trainer",      desc: "110 shortcuts flashcard se yaad karein",  icon: "keyboard",   color: "#0891b2" },
  { id: "excel-practice",       route: "toolExcel",      title: "Excel Formula Practice",desc: "SUM se PMT tak — formula likh kar check", icon: "calculator", color: "#059669" },
  { id: "interview-qa",         route: "toolInterview",  title: "Interview Q&A Practice",desc: "480 interview aur viva sawaal",           icon: "users",      color: "#7c3aed" },
  { id: "formula-explainer",    route: "toolFormula",    title: "Formula Explainer",     desc: "Koi bhi Excel formula Hinglish me samjhein", icon: "book",   color: "#4f46e5" },
  { id: "excel-errors",         route: "toolExcelErr",   title: "Excel Error Decoder",   desc: "#N/A, #REF!, #VALUE! ka matlab aur ilaaj",   icon: "alert",  color: "#e11d48" },
  { id: "excel-datasets",       route: "toolExcelData",  title: "Excel Practice Data",   desc: "Asli jaisa data .xlsx me — kaam ki list ke saath", icon: "grid", color: "#059669" },
  { id: "mini-excel",           route: "toolMiniExcel",  title: "Mini Excel",            desc: "Browser me hi asli formula practice — 5 lesson", icon: "calculator", color: "#0891b2" }
]);

/* ==========================================================================
   Why choose us
   ========================================================================== */
export const FEATURES = Object.freeze([
  { icon: "sparkles",  title: "AI-Powered Syllabus",   desc: "Har course me AI tools included — aap market se aage rahenge." },
  { icon: "users",     title: "Small Batch Size",      desc: "Har student ko personal attention milta hai, koi peeche nahi chhutta." },
  { icon: "target",    title: "100% Practical",        desc: "Theory kam, lab practice zyada — pehle din se hands-on." },
  { icon: "award",     title: "Recognised Certificate",desc: "Course complete hone par verified certificate milta hai." },
  { icon: "briefcase", title: "Placement Support",     desc: "Resume banane se interview tak — poori guidance." },
  { icon: "clock",     title: "Flexible Timings",      desc: "Morning se evening tak batches — school/college ke saath manage karein." }
]);

/* ==========================================================================
   FAQ seed
   ========================================================================== */
export const FAQ_SEED = Object.freeze([
  { category: "Admission", question: "Admission ke liye kya documents chahiye?",
    answer: "Aadhaar card, last qualification ki marksheet aur 2 passport size photo. Online admission form me aap inhe scan/photo karke upload kar sakte hain." },
  { category: "Admission", question: "Kya main online admission le sakta hoon?",
    answer: "Bilkul. Website par 'Online Admission' page se form bharein, photo aur documents upload karein — application turant institute ko mil jaati hai. Aap wahin apna account bhi bana sakte hain, kisi code ka intezaar kiye bina. Institute approve karta hai to Student ID banti hai, aapko WhatsApp par bhej di jaati hai, aur aapka record apne aap aapke account se jud jaata hai." },
  { category: "Fees", question: "Kya fees installment me de sakte hain?",
    answer: "Haan. Zyadatar courses me monthly ya quarterly installment ka option hai. Aapka pending amount aur due date student dashboard me hamesha dikhta rahega." },
  { category: "Fees", question: "Fees online kaise jama karein?",
    answer: "Student dashboard me 'Pay Now' button se Razorpay payment link khulta hai. Payment ke baad screenshot upload karein — admin verify karke receipt generate kar dega." },
  { category: "Classes", question: "Live classes kaise join karein?",
    answer: "Student dashboard ke 'Live Classes' section me scheduled class dikhegi. Class time par 'Join Live Class' button dabate hi Google Meet apne aap khul jaayega." },
  { category: "Classes", question: "Agar class miss ho jaye to?",
    answer: "Notes aur recording (jahan available ho) dashboard ke Notes section me milti hai. Doubt ke liye aap faculty se WhatsApp par sampark kar sakte hain." },
  { category: "Certificate", question: "Certificate kab milta hai?",
    answer: "Course complete karne aur final assessment pass karne ke baad certificate issue hota hai. Aap ise dashboard se download kar sakte hain, aur koi bhi ise website par verify kar sakta hai." },
  { category: "General", question: "Kya computer ka koi purv anubhav chahiye?",
    answer: "Beginner courses (DCA, ADCA, Tally) ke liye bilkul nahi. Hum zero se shuru karte hain." }
]);

/* ==========================================================================
   SEO defaults
   ========================================================================== */
export const SEO = Object.freeze({
  siteName: "Soft Skill Zone Institute",
  defaultTitle: "Soft Skill Zone Institute | Learn Today. Lead Tomorrow.",
  defaultDescription:
    "Ara, Bihar ka premium computer & commerce institute. AI Powered DCA, Tally Prime, Python, ADCA, GST 2.0, " +
    "Income Tax 2025 aur B.Com — practical training, online admission aur student dashboard ke saath.",
  keywords: [
    "computer institute Ara", "DCA course Bihar", "Tally Prime training",
    "GST course", "Python classes Ara", "ADCA", "B.Com coaching Ara",
    "AI courses Bihar", "Soft Skill Zone"
  ],
  ogImage: "images/logo/og-cover.jpg",
  locale: "en_IN"
});

/* ==========================================================================
   Lookup helpers
   ========================================================================== */
export const getCourse     = (id) => COURSES.find((c) => c.id === id) || null;
export const getCourseCode = (id) => getCourse(id)?.code || "GEN";
export const activeCourses = () => COURSES.filter((c) => c.isActive);
export const popularCourses= () => COURSES.filter((c) => c.isPopular && c.isActive);
export const coursesByCategory = (cat) =>
  cat === "all" ? activeCourses() : activeCourses().filter((c) => c.category === cat);

/* ==========================================================================
   How it works — admission journey (landing page)
   ========================================================================== */
export const JOURNEY = Object.freeze([
  { step: 1, icon: "edit",      title: "Online Form Bharein",  desc: "5 minute me admission form bharein — photo aur documents website se hi upload ho jaate hain." },
  { step: 2, icon: "userCheck", title: "Student ID Milega",    desc: "Admin application approve karte hi aapko Student ID aur dashboard login mil jaata hai." },
  { step: 3, icon: "video",     title: "Classes Shuru",        desc: "Batch join karein — offline lab ya Google Meet live class, dono ka access dashboard me." },
  { step: 4, icon: "award",     title: "Certificate Lein",     desc: "Course aur final assessment complete hone par verified certificate download karein." }
]);

/* ==========================================================================
   Testimonials — landing page seed.
   Live approved reviews (Firestore `reviews`) override these when available.
   ========================================================================== */
export const TESTIMONIALS = Object.freeze([
  { name: "Rahul Kumar",   course: "AI Powered DCA",        rating: 5,
    message: "Pehle computer chhoona bhi nahi aata tha. 6 mahine me Word, Excel aur ChatGPT se kaam karna seekh gaya. Ab ek shop me computer operator hoon." },
  { name: "Priya Singh",   course: "AI Powered Tally Prime", rating: 5,
    message: "GST entries aur return filing ki practice yahan asli data par karayi gayi. Interview me confidence isi wajah se aaya — 3 mahine me job lag gayi." },
  { name: "Amit Ranjan",   course: "Python 3.14 Programming", rating: 5,
    message: "Sir ne har concept ko project banwa kar samjhaya. Automation script wala project abhi bhi apne kaam me use karta hoon." },
  { name: "Sneha Gupta",   course: "GST 2.0 Master Course",  rating: 5,
    message: "Portal par live filing karayi gayi — theory nahi, ekdum practical. Ab ghar baithe clients ki return file karti hoon." },
  { name: "Vikash Yadav",  course: "ADCA",                   rating: 4,
    message: "Ek hi course me Tally, DTP aur Office sab mil gaya. Lab practice roz hoti thi, isliye sab yaad reh gaya." },
  { name: "Anjali Kumari", course: "AI Powered Video Editing", rating: 5,
    message: "Reels editing seekh kar freelancing shuru ki. Pehle mahine hi 8,000 rupaye kama liye — thumbnail wala part sabse kaam aaya." }
]);

/* ==========================================================================
   Trust badges shown under the hero
   ========================================================================== */
export const HERO_BADGES = Object.freeze([
  { icon: "shield", label: "Recognised Certificate" },
  { icon: "users",  label: "Small Batches" },
  { icon: "zap",    label: "AI-Powered Syllabus" },
  { icon: "clock",  label: "Flexible Timings" }
]);

/* ==========================================================================
   ABOUT — institute story, milestones, values
   ========================================================================== */
export const ABOUT = Object.freeze({
  intro:
    "Soft Skill Zone ki shuruaat 2016 me ek chhote se computer lab se hui thi — ek simple " +
    "soch ke saath: Ara ke students ko wahi skill milni chahiye jo bade shehron me milti hai, " +
    "aur wo bhi practical tareeke se.",
  body: [
    "Aaj hum computer fundamentals se lekar Tally, GST, Income Tax, Python aur video editing " +
    "tak 10 career courses chalate hain. Har course me AI tools shamil hain, kyunki market ab " +
    "sirf software janne wale nahi, AI ke saath tez kaam karne wale log maangta hai.",

    "Humara tareeka simple hai — chhote batches, roz lab practice, aur har topic par asli " +
    "kaam jaisa assignment. Student ko sirf certificate nahi, confidence chahiye hota hai. " +
    "Isiliye course khatam hone ke baad bhi resume, interview aur freelancing ki guidance " +
    "hum dete rehte hain.",

    "2025 se poora institute digital ho gaya hai — admission, fees, attendance, notes, live " +
    "classes aur certificate, sab kuch student ke apne dashboard me. Guardians ko bhi pata " +
    "rehta hai ki bachche ki attendance aur progress kaisi hai."
  ],
  mission:
    "Bihar ke har student tak affordable, practical aur AI-ready skill training pahunchana — " +
    "taaki naukri ke liye shehar chhodna majboori na rahe.",
  vision:
    "2030 tak 25,000+ students ko aisi skills dena jinse wo naukri lein ya apna kaam shuru karein.",
  milestones: [
    { year: "2016", title: "Institute ki shuruaat", desc: "8 computers, 1 room aur pehla DCA batch." },
    { year: "2019", title: "1,000 students", desc: "Tally aur DTP courses add hue; evening batches shuru." },
    { year: "2022", title: "Commerce wing", desc: "I.Com aur B.Com coaching shuru — accounts par focus." },
    { year: "2024", title: "AI-powered syllabus", desc: "Har course me ChatGPT, Canva AI aur prompt writing shamil." },
    { year: "2026", title: "Digital campus", desc: "Online admission, student dashboard, live classes aur digital certificates." }
  ],
  values: [
    { icon: "target",  title: "Practical Pehle",  desc: "Har concept lab me karke dikhaya jaata hai — notes baad me." },
    { icon: "users",   title: "Chhote Batches",   desc: "Taaki har student ka doubt usi din clear ho jaye." },
    { icon: "shield",  title: "Transparent Fees", desc: "Koi hidden charge nahi — pending amount dashboard me dikhta hai." },
    { icon: "zap",     title: "Updated Syllabus", desc: "GST, Income Tax aur AI tools — jaise rules badalte hain, syllabus badalta hai." }
  ]
});

/* ==========================================================================
   FACULTY — editable defaults.
   Live entries from Firestore `faculty` replace these when present.
   Apne asli faculty ke naam/details yahan ya admin dashboard se update karein.
   ========================================================================== */
export const FACULTY_SEED = Object.freeze([
  {
    name: "Pankaj Pandey", designation: "Director & Senior Faculty",
    subjects: ["Accounts", "Tally Prime", "GST"], experience: "10+ years",
    qualification: "M.Com", photoURL: "",
    bio: "Institute ke founder. Accounts aur taxation ki classes khud lete hain, aur har batch ka result personally track karte hain."
  },
  {
    name: "Computer Faculty", designation: "Faculty — Computer Applications",
    subjects: ["DCA", "ADCA", "MS Office"], experience: "6+ years",
    qualification: "BCA", photoURL: "",
    bio: "Computer fundamentals aur MS Office ke practical sessions lete hain. Beginners ko zero se comfortable banana inki khaasiyat hai."
  },
  {
    name: "Programming Faculty", designation: "Faculty — Programming",
    subjects: ["Python", "Web Basics"], experience: "5+ years",
    qualification: "MCA", photoURL: "",
    bio: "Python aur logic building padhate hain. Har topic ke saath ek chhota project banwaate hain."
  },
  {
    name: "Creative Faculty", designation: "Faculty — Creative & AI Tools",
    subjects: ["Video Editing", "Canva AI", "DTP"], experience: "4+ years",
    qualification: "BFA", photoURL: "",
    bio: "Video editing aur design ki classes. Students ko freelancing portfolio banane me madad karte hain."
  }
]);

/* ==========================================================================
   BLOG — starter articles. Firestore `blog` entries take priority.
   ========================================================================== */
export const BLOG_SEED = Object.freeze([
  {
    slug: "kaun-sa-course-chunein",
    title: "12th ke baad kaun sa computer course chunein?",
    excerpt: "DCA, ADCA, Tally ya Python — aapke liye kaun sa sahi hai? Ek simple guide jo aapke goal ke hisaab se course chunne me madad karegi.",
    author: "Soft Skill Zone",
    tags: ["Career", "Courses"],
    readMinutes: 5,
    publishedOn: "2026-06-12",
    content: [
      { type: "p", text: "Sabse pehle ek baat saaf kar lein — 'best course' jaisa kuch nahi hota. Sahi course wahi hai jo aapke goal se match kare. Neeche 4 common goals hain, aur unke hisaab se course." },
      { type: "h", text: "1. Jaldi job chahiye" },
      { type: "p", text: "Agar aap 6 mahine me kaam par lagna chahte hain, to AI Powered DCA ya Tally Prime chunein. DCA aapko computer operator/data entry ke liye ready karta hai, Tally accounts ki jobs ke liye. Dono me demand stable rehti hai." },
      { type: "h", text: "2. Accounts line me jaana hai" },
      { type: "p", text: "Tally Prime se shuru karein, phir GST 2.0 aur uske baad Income Tax. Ye teen milkar aapko ek chhote CA office ya kisi bhi business ke accounts department ke liye ready kar dete hain." },
      { type: "h", text: "3. Technical/IT me interest hai" },
      { type: "p", text: "Python 3.14 chunein. Lekin dhyan rahein — programming me shortcut nahi hota. Roz 1 ghanta practice zaroori hai. Agar aap wo de sakte hain, to iska return sabse zyada hai." },
      { type: "h", text: "4. Apna kaam/freelancing karna hai" },
      { type: "p", text: "AI Powered Video Editing ya GST return filing — dono me aap ghar baithe clients le sakte hain. Video editing me portfolio zaroori hai, GST me practice aur bharosa." },
      { type: "h", text: "Ek aakhri salah" },
      { type: "p", text: "Course chunne se pehle institute me jaakar ek demo class zaroor lein. Lab dekh lein, batch size pooch lein, aur pichhle students se baat karein. Fees ke saath ye teen cheezein bhi utni hi important hain." }
    ]
  },
  {
    slug: "gst-2-me-kya-badla",
    title: "GST 2.0 me kya badla — ek seedhi si summary",
    excerpt: "Naye slabs, e-invoice ke rules aur return filing me hue badlaav — bina legal bhaasha ke, point-wise samjhaav.",
    author: "Soft Skill Zone",
    tags: ["GST", "Taxation"],
    readMinutes: 6,
    publishedOn: "2026-05-28",
    content: [
      { type: "p", text: "GST 2.0 ke baad sabse zyada confusion teen cheezon me hai — rate structure, e-invoice ki limit, aur return filing ka sequence. Chaliye teeno ko simple bhaasha me dekhte hain." },
      { type: "h", text: "Rate structure" },
      { type: "p", text: "Slabs ko simplify kiya gaya hai taaki classification ke jhagde kam hon. Practical asar ye hai ki aapko apne product ka HSN dobara verify karna chahiye — purana rate aankh band karke maan lena ab galti ho sakti hai." },
      { type: "h", text: "E-invoice" },
      { type: "p", text: "E-invoice ka dayra badhta ja raha hai. Agar aapka turnover threshold ke aas-paas hai, to har saal April me apni eligibility check karein. E-invoice na banane par ITC ka nuksaan client ko hota hai — aur client chhod jaata hai." },
      { type: "h", text: "Return filing" },
      { type: "p", text: "Sequence maintain karna ab pehle se zyada zaroori hai — GSTR-1 sahi bharenge to hi 3B aasan hoga. Sabse common galti: B2B invoice ko B2C me daal dena. Isse client ka ITC atak jaata hai." },
      { type: "h", text: "Aap kya karein" },
      { type: "p", text: "Mahine ke pehle hafte me purchase register aur GSTR-2B ko match kar lein. Isse mismatch chhota rehta hai aur saal ke ant me annual return me pareshani nahi hoti." }
    ]
  },
  {
    slug: "typing-speed-kaise-badhayein",
    title: "Typing speed 20 se 40 WPM tak kaise le jaayein",
    excerpt: "Government exam ho ya office ka kaam — typing speed sabse jaldi improve hone wali skill hai. 30 din ka practical plan.",
    author: "Soft Skill Zone",
    tags: ["Skills", "Practice"],
    readMinutes: 4,
    publishedOn: "2026-05-10",
    content: [
      { type: "p", text: "Typing me sabse badi galti hai — speed pehle, accuracy baad me. Ulta karein. Pehle 98% accuracy laayein, speed apne aap aa jaayegi." },
      { type: "h", text: "Hafta 1 — home row" },
      { type: "p", text: "Sirf ASDF-JKL; par 15 minute roz. Keyboard ko dekhna bilkul band. Shuru me speed girega, ghabraayein nahi — yahi sahi raasta hai." },
      { type: "h", text: "Hafta 2 — poora keyboard" },
      { type: "p", text: "Ab upar aur neeche ki rows add karein. Roz 20 minute. Har session ke baad apna WPM note karein — progress dikhna motivation deta hai." },
      { type: "h", text: "Hafta 3 — asli text" },
      { type: "p", text: "Newspaper ya kisi book ka paragraph type karein, na ki random words. Punctuation aur capital letters ki aadat yahin banti hai." },
      { type: "h", text: "Hafta 4 — timed test" },
      { type: "p", text: "Roz ek 5-minute test dein. Website ke free Typing Test tool se apni speed aur accuracy track karein. 30 din me 20 se 40 WPM realistic target hai." }
    ]
  }
]);

/* ==========================================================================
   Gallery categories (admin uploads land in Firestore `gallery`)
   ========================================================================== */
export const GALLERY_CATEGORIES = Object.freeze([
  { value: "all",       label: "All" },
  { value: "campus",    label: "Campus" },
  { value: "classroom", label: "Classroom" },
  { value: "events",    label: "Events" },
  { value: "students",  label: "Students" },
  { value: "awards",    label: "Awards" }
]);
