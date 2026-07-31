/* ==========================================================================
   Soft Skill Zone — Static data for the free tools
   HSN reference list, GST quiz bank, typing passages.
   ========================================================================== */

/* ==========================================================================
   HSN / SAC reference — commonly needed codes for small businesses in Bihar.
   Rates are indicative; always confirm on the GST portal before filing.
   ========================================================================== */
export const HSN_DATA = Object.freeze([
  { code: "1006", desc: "Rice (branded / packaged)", gst: 5, chapter: "Food grains" },
  { code: "1001", desc: "Wheat and meslin", gst: 0, chapter: "Food grains" },
  { code: "1101", desc: "Wheat flour (atta), branded", gst: 5, chapter: "Food grains" },
  { code: "1701", desc: "Sugar", gst: 5, chapter: "Food" },
  { code: "0401", desc: "Milk and cream, not concentrated", gst: 0, chapter: "Dairy" },
  { code: "0402", desc: "Milk powder", gst: 5, chapter: "Dairy" },
  { code: "0406", desc: "Cheese and paneer (packaged)", gst: 5, chapter: "Dairy" },
  { code: "1905", desc: "Biscuits, bread, pastry, cakes", gst: 18, chapter: "Bakery" },
  { code: "2106", desc: "Food preparations (namkeen, mixes)", gst: 12, chapter: "Food" },
  { code: "2201", desc: "Packaged drinking water", gst: 18, chapter: "Beverages" },
  { code: "2202", desc: "Aerated / soft drinks", gst: 28, chapter: "Beverages" },
  { code: "3004", desc: "Medicaments (general medicines)", gst: 12, chapter: "Pharma" },
  { code: "3401", desc: "Soap (bathing / toilet)", gst: 18, chapter: "FMCG" },
  { code: "3305", desc: "Hair oil, shampoo", gst: 18, chapter: "FMCG" },
  { code: "3306", desc: "Toothpaste, oral hygiene", gst: 18, chapter: "FMCG" },
  { code: "4820", desc: "Registers, notebooks, account books", gst: 12, chapter: "Stationery" },
  { code: "4802", desc: "Paper — uncoated, writing/printing", gst: 12, chapter: "Stationery" },
  { code: "9608", desc: "Ball point pens, markers", gst: 18, chapter: "Stationery" },
  { code: "4901", desc: "Printed books", gst: 0, chapter: "Stationery" },
  { code: "6109", desc: "T-shirts, vests (knitted)", gst: 5, chapter: "Textile" },
  { code: "6203", desc: "Men's suits, trousers, shirts", gst: 5, chapter: "Textile" },
  { code: "6204", desc: "Women's suits, dresses, sarees", gst: 5, chapter: "Textile" },
  { code: "6403", desc: "Footwear with leather uppers", gst: 18, chapter: "Footwear" },
  { code: "8471", desc: "Computers, laptops, data processing units", gst: 18, chapter: "Electronics" },
  { code: "8443", desc: "Printers, copiers, multi-function devices", gst: 18, chapter: "Electronics" },
  { code: "8517", desc: "Mobile phones, telephone sets", gst: 18, chapter: "Electronics" },
  { code: "8528", desc: "Monitors, projectors, television sets", gst: 18, chapter: "Electronics" },
  { code: "8523", desc: "Pen drives, memory cards, discs", gst: 18, chapter: "Electronics" },
  { code: "8504", desc: "UPS, inverters, transformers", gst: 18, chapter: "Electronics" },
  { code: "8506", desc: "Batteries (primary cells)", gst: 18, chapter: "Electronics" },
  { code: "9403", desc: "Furniture — office, wooden, metal", gst: 18, chapter: "Furniture" },
  { code: "9401", desc: "Seats and chairs", gst: 18, chapter: "Furniture" },
  { code: "8703", desc: "Motor cars (petrol/diesel)", gst: 28, chapter: "Automobile" },
  { code: "8711", desc: "Motorcycles and scooters", gst: 28, chapter: "Automobile" },
  { code: "8714", desc: "Parts of cycles and motorcycles", gst: 18, chapter: "Automobile" },
  { code: "7308", desc: "Iron / steel structures", gst: 18, chapter: "Metals" },
  { code: "2523", desc: "Cement", gst: 28, chapter: "Construction" },
  { code: "6802", desc: "Marble, granite, worked stone", gst: 18, chapter: "Construction" },
  { code: "3208", desc: "Paints and varnishes", gst: 18, chapter: "Construction" },
  { code: "3923", desc: "Plastic articles for packing", gst: 18, chapter: "Plastics" },

  /* Services (SAC) */
  { code: "9983", desc: "Other professional, technical services", gst: 18, chapter: "SAC — Services" },
  { code: "9985", desc: "Support services (manpower, security)", gst: 18, chapter: "SAC — Services" },
  { code: "9992", desc: "Education services", gst: 0, chapter: "SAC — Services" },
  { code: "9954", desc: "Construction services", gst: 18, chapter: "SAC — Services" },
  { code: "9963", desc: "Accommodation, food and beverage services", gst: 5, chapter: "SAC — Services" },
  { code: "9971", desc: "Financial and related services", gst: 18, chapter: "SAC — Services" },
  { code: "9973", desc: "Leasing or rental services", gst: 18, chapter: "SAC — Services" },
  { code: "9987", desc: "Maintenance, repair and installation", gst: 18, chapter: "SAC — Services" },
  { code: "9988", desc: "Manufacturing services on job work", gst: 12, chapter: "SAC — Services" },
  { code: "9997", desc: "Other services (washing, beauty, etc.)", gst: 18, chapter: "SAC — Services" }
]);

/* ==========================================================================
   GST quiz bank
   ========================================================================== */
export const GST_QUIZ = Object.freeze([
  { q: "GST ka full form kya hai?",
    options: ["Goods and Sales Tax", "Goods and Services Tax", "General Sales Tax", "Government Service Tax"],
    answer: 1,
    why: "GST = Goods and Services Tax — ek hi tax jo pehle ke VAT, service tax, excise waghairah ki jagah aaya." },
  { q: "Ek hi state ke andar (intra-state) sale par kaun se tax lagte hain?",
    options: ["Sirf IGST", "CGST + SGST", "Sirf CGST", "CGST + IGST"],
    answer: 1,
    why: "Intra-state supply par tax aadha-aadha bantta hai — CGST (Centre) + SGST (State)." },
  { q: "Doosre state me maal bhejne par (inter-state) kaun sa tax lagta hai?",
    options: ["CGST + SGST", "IGST", "SGST only", "Koi tax nahi"],
    answer: 1,
    why: "Inter-state supply par IGST lagta hai, jo baad me Centre aur destination state me bant jaata hai." },
  { q: "GSTR-3B kya hai?",
    options: ["Sales ka detailed return", "Monthly summary return", "Annual return", "Refund application"],
    answer: 1,
    why: "GSTR-3B monthly summary return hai jisme total sales, ITC aur tax payment ka summary jaata hai." },
  { q: "GSTR-1 me kya jaata hai?",
    options: ["Purchase ki details", "Outward supplies (sales) ki details", "Sirf tax payment", "Employee salary"],
    answer: 1,
    why: "GSTR-1 me aapki outward supplies yaani sales invoices ki detail bharni hoti hai." },
  { q: "Input Tax Credit (ITC) ka matlab kya hai?",
    options: ["Customer se liya gaya tax", "Purchase par diye gaye tax ka credit", "Late fee", "Government ki subsidy"],
    answer: 1,
    why: "Purchase par jo GST aapne diya, uska credit output tax se adjust kar sakte hain — yahi ITC hai." },
  { q: "GSTIN me kitne characters hote hain?",
    options: ["10", "12", "15", "16"],
    answer: 2,
    why: "GSTIN 15 characters ka hota hai — pehle 2 digit state code, agle 10 PAN, phir entity code, blank aur check digit." },
  { q: "GSTIN ke pehle do digit kya darshate hain?",
    options: ["PAN ke pehle 2 letters", "State code", "Financial year", "Business type"],
    answer: 1,
    why: "Pehle 2 digit state code hote hain — jaise Bihar ka 10, Delhi ka 07." },
  { q: "Composition scheme kis ke liye hai?",
    options: ["Sirf badi companies", "Chhote taxpayers (turnover limit ke andar)", "Sirf exporters", "Sirf services"],
    answer: 1,
    why: "Composition scheme chhote taxpayers ke liye hai — kam rate, simple return, par ITC nahi milta." },
  { q: "Reverse Charge Mechanism (RCM) me tax kaun bharta hai?",
    options: ["Supplier", "Recipient (kharidne wala)", "Transporter", "Government"],
    answer: 1,
    why: "RCM me tax bharne ki zimmedari supplier ki jagah recipient par aa jaati hai." },
  { q: "E-way bill kab zaroori hota hai?",
    options: ["Har sale par", "Nirdharit value se upar maal ki movement par", "Sirf export par", "Kabhi nahi"],
    answer: 1,
    why: "Tay ki gayi value se zyada ke maal ki movement par e-way bill banana hota hai (limit state ke hisaab se badalti hai)." },
  { q: "Tax invoice me HSN code kyun likha jaata hai?",
    options: ["Customer ka naam batane ke liye", "Goods/services ko classify karne ke liye", "Discount dikhane ke liye", "Sirf export me"],
    answer: 1,
    why: "HSN/SAC code se goods aur services ki classification hoti hai — isi se sahi GST rate tay hota hai." },
  { q: "Agar invoice me galti ho jaye to kya jaari karte hain?",
    options: ["Naya PAN", "Credit ya Debit Note", "E-way bill", "Challan"],
    answer: 1,
    why: "Value kam karni ho to Credit Note, badhani ho to Debit Note jaari hota hai." },
  { q: "GST return late file karne par kya lagta hai?",
    options: ["Kuch nahi", "Late fee aur interest", "Sirf warning", "GSTIN cancel"],
    answer: 1,
    why: "Late filing par per-day late fee aur bakaya tax par interest dono lagte hain." },
  { q: "GSTR-2B kya hai?",
    options: ["Sales register", "Auto-generated ITC statement", "Annual return", "Refund form"],
    answer: 1,
    why: "GSTR-2B auto-generated statement hai jo batata hai aapko kitna ITC available hai — purchase register se match karna chahiye." }
]);

/* ==========================================================================
   Typing test passages
   ========================================================================== */
export const TYPING_TEXTS = Object.freeze([
  "Computer aaj har kaam ka hissa ban chuka hai. Office ho ya dukaan, thoda sa computer gyan aapka samay bachata hai aur kaam aasan bana deta hai.",
  "Typing seekhne ka sabse achha tareeka roz thoda abhyas karna hai. Pehle sahi ungliyon se likhna seekhein, speed apne aap badh jaayegi.",
  "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the English alphabet and is often used to practise typing.",
  "Accounts ka kaam dhyan maangta hai. Ek chhoti si galti poore mahine ka hisaab bigaad sakti hai, isliye har entry ko do baar check karein.",
  "Practice makes a person perfect. Sit straight, keep your wrists relaxed, look at the screen instead of the keyboard, and let your fingers learn the way."
]);

/* Hindi (Devanagari) typing — sarkari naukri ke typing test me aksar Hindi
   hi maangi jaati hai, aur English ki practice wahan poori tarah kaam nahi
   aati kyunki keyboard layout hi alag hota hai. Isliye alag option rakha.

   In paragraphs me jaan-boojh kar daftar wale shabd rakhe hain — sewa mein,
   karyalay, vishay, dinank — kyunki asli test me isi tarah ki bhasha aati hai. */
export const TYPING_TEXTS_HI = Object.freeze([
  "कंप्यूटर आज हर काम का हिस्सा बन चुका है। कार्यालय हो या दुकान, थोड़ा सा कंप्यूटर ज्ञान आपका समय बचाता है और काम आसान बना देता है।",
  "टाइपिंग सीखने का सबसे अच्छा तरीका रोज़ थोड़ा अभ्यास करना है। पहले सही उंगलियों से लिखना सीखें, गति अपने आप बढ़ जाएगी।",
  "सेवा में, श्रीमान कार्यालय अध्यक्ष महोदय। विषय — दिनांक पंद्रह अगस्त को होने वाले कार्यक्रम की सूचना के संबंध में आवेदन पत्र।",
  "हिसाब का काम ध्यान मांगता है। एक छोटी सी गलती पूरे महीने का लेखा बिगाड़ सकती है, इसलिए हर प्रविष्टि को दो बार जांचें।",
  "सफलता का कोई छोटा रास्ता नहीं होता। जो विद्यार्थी रोज़ नियम से अभ्यास करता है, परीक्षा के दिन उसकी उंगलियां अपने आप चलती हैं।"
]);
