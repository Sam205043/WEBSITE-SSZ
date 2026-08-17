/* ==========================================================================
   Soft Skill Zone — Journal Entry ka bank (Dr / Cr practice)
   --------------------------------------------------------------------------
   Accounting me sabse pehli aur sabse zaroori aadat yahi hai: kaunsa khaata
   Debit hoga aur kaunsa Credit. Baaki sab — ledger, trial balance, final
   accounts — isi ek aadat par khada hai. Jise ye pakka aa gaya, uska aage
   ka poora course aasaan ho jaata hai.

   YAHAN "KYUN" HAR SAWAAL KE SAATH LIKHA NAHI HAI — BANAYA JAATA HAI

   Har entry ke saath alag-alag samjhaav likhne ka matlab hota 55 alag-alag
   line, jinme se koi ek galat ya doosri se ulti reh jaati. Iske bajaye har
   khaate ka SWABHAV (Asset, Expense, Liability, Capital, Income) yahan ek
   baar likha hai, aur samjhaav usi se banta hai.

   Faayda sirf mehnat bachne ka nahi hai. Student ko har baar wahi ek niyam
   dohra kar milta hai — "Asset badha to Debit", "Kharcha hamesha Debit" —
   aur ratne ke bajaye niyam baith jaata hai. Naya sawaal jodna bhi seedha
   ho gaya: bas transaction, Dr aur Cr likhiye; samjhaav apne aap ban jaata
   hai aur baaki sab se mel khaata hai.

   HISAAB KA TARIKA — AAJKAL WALA (modern rules)

     Asset      badhe   → Debit    ghate → Credit
     Expense    hamesha → Debit
     Liability  badhe   → Credit   ghate → Debit
     Capital    badhe   → Credit   ghate → Debit  (drawings)
     Income     hamesha → Credit

   Kuchh khaate is saanche me theek nahi baithte — Purchase Return, Sales
   Return, Drawings. Unke liye `note` likh diya gaya hai, jo bane-banaye
   samjhaav ki jagah le leta hai.
   ========================================================================== */

/** Khaata → uska swabhav. Yahi se Dr/Cr ka samjhaav banta hai. */
export const ACCOUNTS = Object.freeze({
  /* ---- Asset ---- */
  "Cash A/c":              { type: "asset" },
  "Bank A/c":              { type: "asset" },
  "Furniture A/c":         { type: "asset" },
  "Machinery A/c":         { type: "asset" },
  "Computer A/c":          { type: "asset" },
  "Building A/c":          { type: "asset" },
  "Stock A/c":             { type: "asset" },
  "Prepaid Insurance A/c": { type: "asset" },
  "Input CGST A/c":        { type: "asset" },
  "Input SGST A/c":        { type: "asset" },
  "Input IGST A/c":        { type: "asset" },
  /* Udhaar bechne par jo customer paisa dega — wo hamara Asset hai */
  "Suresh":                { type: "asset",  who: "customer" },
  "Anita Devi":            { type: "asset",  who: "customer" },
  "Verma Stores":          { type: "asset",  who: "customer" },

  /* ---- Liability ---- */
  "Ram Traders":           { type: "liability", who: "supplier" },
  "Gupta & Co.":           { type: "liability", who: "supplier" },
  "Bank Loan A/c":         { type: "liability" },
  "Outstanding Salary A/c":{ type: "liability" },
  "Output CGST A/c":       { type: "liability" },
  "Output SGST A/c":       { type: "liability" },
  "Output IGST A/c":       { type: "liability" },

  /* ---- Capital ---- */
  "Capital A/c":           { type: "capital" },
  "Drawings A/c":          { type: "capital",
    note: "Drawings maalik ka apna nikala hua paisa hai — isse Capital ghatta hai, aur Capital ghate to Debit." },

  /* ---- Expense ---- */
  "Purchases A/c":         { type: "expense" },
  "Salary A/c":            { type: "expense" },
  "Wages A/c":             { type: "expense" },
  "Rent A/c":              { type: "expense" },
  "Electricity A/c":       { type: "expense" },
  "Telephone A/c":         { type: "expense" },
  "Advertisement A/c":     { type: "expense" },
  "Carriage A/c":          { type: "expense" },
  "Insurance A/c":         { type: "expense" },
  "Repairs A/c":           { type: "expense" },
  "Printing & Stationery A/c": { type: "expense" },
  "Discount Allowed A/c":  { type: "expense" },
  "Bad Debts A/c":         { type: "expense" },
  "Depreciation A/c":      { type: "expense" },
  "Interest A/c":          { type: "expense" },
  "Commission A/c":        { type: "expense" },
  "Sales Return A/c":      { type: "expense",
    note: "Sales Return se hamari Sales ghatti hai. Income ghate to Debit — isliye ye Debit hota hai." },

  /* ---- Income ---- */
  "Sales A/c":             { type: "income" },
  "Discount Received A/c": { type: "income" },
  "Commission Received A/c": { type: "income" },
  "Interest Received A/c": { type: "income" },
  "Rent Received A/c":     { type: "income" },
  "Purchase Return A/c":   { type: "income",
    note: "Purchase Return se hamara kharcha ghatta hai. Kharcha ghate to Credit — isliye ye Credit hota hai." }
});

/** Chapter ke naam — jaise course me padhaye jaate hain. */
export const CHAPTERS = Object.freeze([
  { id: "basic",  label: "Shuruaat — Cash, Capital, Maal" },
  { id: "credit", label: "Udhaar, Bank aur Discount" },
  { id: "gst",    label: "GST wali entry" },
  { id: "adjust", label: "Adjustment — Depreciation, Outstanding" },
  { id: "biz",    label: "Business ke aam len-den" }
]);

/**
 * Har entry: ch = chapter, q = transaction, dr / cr = sahi jawab.
 *
 * Rakam jaanbujh kar gol number me hai — dhyan Dr/Cr par rahe, jodne par
 * nahi. GST wali entry me 18% seedha nikal aata hai (10,000 par 1,800).
 */
export const JOURNAL = Object.freeze([
  /* ---------------- Shuruaat ---------------- */
  { ch: "basic", q: "Business shuru kiya — apne paas se ₹1,00,000 cash lagaya.", dr: "Cash A/c", cr: "Capital A/c" },
  { ch: "basic", q: "₹20,000 ka maal cash dekar kharida.", dr: "Purchases A/c", cr: "Cash A/c" },
  { ch: "basic", q: "₹15,000 ka maal cash me becha.", dr: "Cash A/c", cr: "Sales A/c" },
  { ch: "basic", q: "Dukaan ka kiraya ₹5,000 cash diya.", dr: "Rent A/c", cr: "Cash A/c" },
  { ch: "basic", q: "Naukar ki salary ₹8,000 cash di.", dr: "Salary A/c", cr: "Cash A/c" },
  { ch: "basic", q: "Dukaan ke liye ₹12,000 ka furniture cash dekar kharida.", dr: "Furniture A/c", cr: "Cash A/c" },
  { ch: "basic", q: "Bijli ka bill ₹1,200 cash diya.", dr: "Electricity A/c", cr: "Cash A/c" },
  { ch: "basic", q: "Mazdoori (wages) ₹2,500 cash di.", dr: "Wages A/c", cr: "Cash A/c" },
  { ch: "basic", q: "Business me ₹25,000 aur cash lagaya.", dr: "Cash A/c", cr: "Capital A/c" },
  { ch: "basic", q: "Ek computer ₹35,000 cash dekar kharida.", dr: "Computer A/c", cr: "Cash A/c" },
  { ch: "basic", q: "Printing aur stationery par ₹900 cash kharch hua.", dr: "Printing & Stationery A/c", cr: "Cash A/c" },
  { ch: "basic", q: "Akhbaar me vigyapan ka ₹3,000 cash diya.", dr: "Advertisement A/c", cr: "Cash A/c" },

  /* ---------------- Udhaar, Bank, Discount ---------------- */
  { ch: "credit", q: "Ram Traders se ₹30,000 ka maal udhaar kharida.", dr: "Purchases A/c", cr: "Ram Traders" },
  { ch: "credit", q: "Suresh ko ₹18,000 ka maal udhaar becha.", dr: "Suresh", cr: "Sales A/c" },
  { ch: "credit", q: "Ram Traders ko ₹30,000 cash chuka diya.", dr: "Ram Traders", cr: "Cash A/c" },
  { ch: "credit", q: "Suresh se ₹18,000 cash mila.", dr: "Cash A/c", cr: "Suresh" },
  { ch: "credit", q: "Bank me ₹50,000 cash jama kiya.", dr: "Bank A/c", cr: "Cash A/c" },
  { ch: "credit", q: "Bank se ₹10,000 cash nikala.", dr: "Cash A/c", cr: "Bank A/c" },
  { ch: "credit", q: "Bank se ₹2,00,000 ka loan liya, paisa bank khaate me aaya.", dr: "Bank A/c", cr: "Bank Loan A/c" },
  { ch: "credit", q: "Bank loan ki kist ₹20,000 bank se chukayi.", dr: "Bank Loan A/c", cr: "Bank A/c" },
  { ch: "credit", q: "Gupta & Co. ko cheque se ₹15,000 diya.", dr: "Gupta & Co.", cr: "Bank A/c" },
  { ch: "credit", q: "Anita Devi se ₹9,800 mila aur ₹200 ka discount diya — pehle discount wala hissa.", dr: "Discount Allowed A/c", cr: "Anita Devi" },
  { ch: "credit", q: "Ram Traders ne bill jaldi chukane par ₹500 ka discount diya.", dr: "Ram Traders", cr: "Discount Received A/c" },
  { ch: "credit", q: "Verma Stores ko ₹22,000 ka maal udhaar becha.", dr: "Verma Stores", cr: "Sales A/c" },
  { ch: "credit", q: "Gupta & Co. se ₹40,000 ka maal udhaar kharida.", dr: "Purchases A/c", cr: "Gupta & Co." },
  { ch: "credit", q: "Bank ne khaate par ₹1,500 byaaj diya.", dr: "Bank A/c", cr: "Interest Received A/c" },

  /* ---------------- GST ---------------- */
  { ch: "gst", q: "₹10,000 ka maal cash kharida, CGST 9% — sirf CGST wala hissa.", dr: "Input CGST A/c", cr: "Cash A/c" },
  { ch: "gst", q: "₹10,000 ka maal cash kharida, SGST 9% — sirf SGST wala hissa.", dr: "Input SGST A/c", cr: "Cash A/c" },
  { ch: "gst", q: "₹10,000 ka maal cash becha, CGST 9% — sirf CGST wala hissa.", dr: "Cash A/c", cr: "Output CGST A/c" },
  { ch: "gst", q: "₹10,000 ka maal cash becha, SGST 9% — sirf SGST wala hissa.", dr: "Cash A/c", cr: "Output SGST A/c" },
  { ch: "gst", q: "Doosre rajya se ₹50,000 ka maal kharida, IGST 18% — sirf IGST wala hissa.", dr: "Input IGST A/c", cr: "Cash A/c" },
  { ch: "gst", q: "Doosre rajya me ₹50,000 ka maal becha, IGST 18% — sirf IGST wala hissa.", dr: "Verma Stores", cr: "Output IGST A/c" },
  { ch: "gst", q: "Ram Traders se udhaar maal kharida — usi bill ka Input CGST wala hissa.", dr: "Input CGST A/c", cr: "Ram Traders" },
  { ch: "gst", q: "Suresh ko udhaar maal becha — usi bill ka Output SGST wala hissa.", dr: "Suresh", cr: "Output SGST A/c" },
  { ch: "gst", q: "GST ka paisa sarkar ko bank se jama kiya — Output CGST wala hissa.", dr: "Output CGST A/c", cr: "Bank A/c" },

  /* ---------------- Adjustment ---------------- */
  { ch: "adjust", q: "Saal ke aakhir me furniture par ₹1,200 depreciation lagaya.", dr: "Depreciation A/c", cr: "Furniture A/c" },
  { ch: "adjust", q: "Machinery par ₹5,000 depreciation lagaya.", dr: "Depreciation A/c", cr: "Machinery A/c" },
  { ch: "adjust", q: "Mahine ki salary ₹8,000 abhi di nahi gayi — dena baaki hai.", dr: "Salary A/c", cr: "Outstanding Salary A/c" },
  { ch: "adjust", q: "Pichhle mahine ki bakaya salary ₹8,000 ab cash de di.", dr: "Outstanding Salary A/c", cr: "Cash A/c" },
  { ch: "adjust", q: "Agle saal ka insurance ₹6,000 abhi cash me de diya.", dr: "Prepaid Insurance A/c", cr: "Cash A/c" },
  { ch: "adjust", q: "Suresh ka ₹3,000 doob gaya — ab wasool nahi hoga.", dr: "Bad Debts A/c", cr: "Suresh" },
  { ch: "adjust", q: "Building par ₹25,000 depreciation lagaya.", dr: "Depreciation A/c", cr: "Building A/c" },
  { ch: "adjust", q: "Computer par ₹7,000 depreciation lagaya.", dr: "Depreciation A/c", cr: "Computer A/c" },

  /* ---------------- Business ke aam len-den ---------------- */
  { ch: "biz", q: "Maalik ne apne ghar ke liye dukaan se ₹5,000 cash nikala.", dr: "Drawings A/c", cr: "Cash A/c" },
  { ch: "biz", q: "Ram Traders ko ₹4,000 ka kharab maal wapas kiya.", dr: "Ram Traders", cr: "Purchase Return A/c" },
  { ch: "biz", q: "Suresh ne ₹2,000 ka maal wapas kiya.", dr: "Sales Return A/c", cr: "Suresh" },
  { ch: "biz", q: "Dukaan ka ek kamra kiraye par diya, ₹4,000 cash mila.", dr: "Cash A/c", cr: "Rent Received A/c" },
  { ch: "biz", q: "Dalali (commission) ₹1,500 cash mili.", dr: "Cash A/c", cr: "Commission Received A/c" },
  { ch: "biz", q: "Maal laane ka bhada (carriage) ₹800 cash diya.", dr: "Carriage A/c", cr: "Cash A/c" },
  { ch: "biz", q: "Machine ki marammat par ₹2,200 cash kharch hua.", dr: "Repairs A/c", cr: "Cash A/c" },
  { ch: "biz", q: "Telephone aur internet ka ₹1,100 cash bill diya.", dr: "Telephone A/c", cr: "Cash A/c" },
  { ch: "biz", q: "Loan par ₹3,000 byaaj bank se diya.", dr: "Interest A/c", cr: "Bank A/c" },
  { ch: "biz", q: "Agent ko ₹2,000 commission cash diya.", dr: "Commission A/c", cr: "Cash A/c" },
  { ch: "biz", q: "Maalik ne apne liye dukaan se ₹3,000 ka maal nikala.", dr: "Drawings A/c", cr: "Purchases A/c" },
  { ch: "biz", q: "Purana furniture ₹6,000 cash me becha (usi daam par).", dr: "Cash A/c", cr: "Furniture A/c" },
  { ch: "biz", q: "Business ke liye ₹80,000 ki machinery cheque se kharidi.", dr: "Machinery A/c", cr: "Bank A/c" }
]);
