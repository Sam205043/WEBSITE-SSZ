/* ==========================================================================
   Soft Skill Zone — Excel functions ka Hinglish kosh
   --------------------------------------------------------------------------
   Formula Explainer isi file se bolta hai. Har entry:

     sig   — function ka roop, jaise "VLOOKUP(kya_dhundhna, kahan, kaunsa_column, [match])"
     grp   — kis parivaar ka hai (list me chhaant-chhaant kar dikhane ke liye)
     one   — ek line me kaam
     how   — thoda khol kar, jaise class me samjhate hain
     tell  — (marzi ka) student ke apne arguments daal kar bani hui line.
             `a` array me har argument ka likha hua roop aata hai.
     tip   — (marzi ka) wo baat jo aksar galat hoti hai

   Likhne ka niyam: jo baat asli kaam me kaam aati hai wahi likhni hai.
   "SUM adds numbers" likhne se kisi ko kuchh nahi milta — "B2 se B10 tak
   ke saare number jod deta hai" se milta hai.
   ========================================================================== */

const j = (a, i) => (a && a[i] !== undefined && a[i] !== "" ? a[i] : "…");

export const FUNCTION_GROUPS = [
  "Jodna-ginna", "Shart (logic)", "Dhundhna", "Text", "Date & time",
  "Number ko sudharna", "Paisa (finance)", "Jaanch (info)"
];

export const EXCEL_FUNCTIONS = {
  /* ---------------- Jodna-ginna ---------------- */
  SUM: {
    grp: "Jodna-ginna", sig: "SUM(range)",
    one: "Range ke saare numbers jod deta hai.",
    how: "Jitne bhi number us range me hain, sabka total. Khaali cell aur text ko chhod deta hai — isliye beech me koi cell khaali ho to bhi galti nahi hoti.",
    tell: (a) => `${j(a, 0)} me jitne number hain, sabko jod kar total nikaalega.`
  },
  SUMIF: {
    grp: "Jodna-ginna", sig: "SUMIF(kahan_dekhein, shart, [kya_jodein])",
    one: "Sirf un rows ko jodta hai jo shart poori karti hain.",
    how: "Pehle range me shart dhundhta hai, fir usi row ka number teesre range se uthakar jodta hai. Teesra range na dein to pehle wale ko hi jod deta hai.",
    tell: (a) => `${j(a, 0)} me jahan-jahan ${j(a, 1)} hai, sirf unhi rows ka ${a[2] ? j(a, 2) : j(a, 0)} jodega.`,
    tip: "Shart me text ho to quote me likhein: \"Ara\". Number ya cell ka pata ho to quote nahi."
  },
  SUMIFS: {
    grp: "Jodna-ginna", sig: "SUMIFS(kya_jodein, range1, shart1, range2, shart2, …)",
    one: "Ek se zyada shart poori hone par hi jodta hai.",
    how: "SUMIF ka bada bhai. Yahan jodne wala range SABSE PEHLE aata hai — SUMIF me wo aakhir me aata hai. Yahi ulta-pulta sabse zyada galti karata hai.",
    tell: (a) => `${j(a, 0)} ko tabhi jodega jab saari shartein ek saath poori hon.`,
    tip: "SUMIF me jodne wala range aakhir me, SUMIFS me sabse pehle. Ye yaad rakhein."
  },
  AVERAGE: {
    grp: "Jodna-ginna", sig: "AVERAGE(range)",
    one: "Numbers ka ausat (average) nikaalta hai.",
    how: "Total ko ginti se bhaag deta hai. Khaali cell ginti me nahi aati, par 0 likha ho to aata hai — isliye khaali aur 0 me farq padta hai.",
    tell: (a) => `${j(a, 0)} ke numbers ka ausat nikaalega.`
  },
  AVERAGEIF: {
    grp: "Jodna-ginna", sig: "AVERAGEIF(kahan_dekhein, shart, [kiska_ausat])",
    one: "Shart poori karne walon ka hi ausat.",
    how: "SUMIF ki tarah, par jodne ki jagah ausat nikaalta hai.",
    tell: (a) => `${j(a, 0)} me jahan ${j(a, 1)} hai, sirf unka ausat nikaalega.`
  },
  COUNT: {
    grp: "Jodna-ginna", sig: "COUNT(range)",
    one: "Sirf NUMBER wali cells ginta hai.",
    how: "Naam, text aur khaali cell nahi ginta. Isliye naam ginne ke liye ye galat function hai — uske liye COUNTA.",
    tell: (a) => `${j(a, 0)} me kitni cells me number bhara hai, wo ginega (text nahi ginega).`,
    tip: "Naam ya text ginna ho to COUNTA lagayein, COUNT nahi."
  },
  COUNTA: {
    grp: "Jodna-ginna", sig: "COUNTA(range)",
    one: "Jitni cells khaali NAHI hain, wo sab ginta hai.",
    how: "Number ho ya naam ya koi bhi nishaan — bhari hui har cell ginti me aayegi.",
    tell: (a) => `${j(a, 0)} me kitni cells bhari hui hain, wo ginega.`
  },
  COUNTBLANK: {
    grp: "Jodna-ginna", sig: "COUNTBLANK(range)",
    one: "Khaali cells ginta hai.",
    how: "Attendance ya form me kitni jagah chhoot gayi — ye pakadne ke liye.",
    tell: (a) => `${j(a, 0)} me kitni cells khaali reh gayi hain, wo ginega.`
  },
  COUNTIF: {
    grp: "Jodna-ginna", sig: "COUNTIF(kahan_dekhein, shart)",
    one: "Shart poori karne wali cells ginta hai.",
    how: "\"Ara wale kitne students hain\", \"kitne fail hue\" — yahi function.",
    tell: (a) => `${j(a, 0)} me kitni baar ${j(a, 1)} aaya hai, wo ginega.`,
    tip: "Aadha naam dhundhna ho to * lagayein: \"Ku*\" se Kumar, Kumari dono aa jayenge."
  },
  COUNTIFS: {
    grp: "Jodna-ginna", sig: "COUNTIFS(range1, shart1, range2, shart2, …)",
    one: "Kai shartein ek saath poori hon, tabhi ginta hai.",
    how: "\"Ara ke wo students jinke marks 60 se zyada hain\" — do shartein, isi se.",
    tell: () => "Jab saari shartein ek saath poori hon, sirf unhi rows ko ginega."
  },
  SUMPRODUCT: {
    grp: "Jodna-ginna", sig: "SUMPRODUCT(range1, range2)",
    one: "Do column ko aamne-saamne guna karke sabka total.",
    how: "Quantity aur rate wale do column — har row ka guna, fir sabka jod. Bill ka total ek hi formula me.",
    tell: (a) => `${j(a, 0)} aur ${j(a, 1)} ko row-dar-row guna karke sabka total nikaalega.`
  },
  MAX: {
    grp: "Jodna-ginna", sig: "MAX(range)", one: "Sabse bada number.",
    how: "Topper ke marks, sabse badi sale — sab isse.",
    tell: (a) => `${j(a, 0)} me sabse bada number dhundhega.`
  },
  MIN: {
    grp: "Jodna-ginna", sig: "MIN(range)", one: "Sabse chhota number.",
    how: "Sabse kam marks, sabse sasta rate.",
    tell: (a) => `${j(a, 0)} me sabse chhota number dhundhega.`
  },
  LARGE: {
    grp: "Jodna-ginna", sig: "LARGE(range, k)", one: "k-ve number sabse bade se.",
    how: "LARGE(range,1) = sabse bada, 2 = doosra sabse bada. Top-3 nikaalne ke liye.",
    tell: (a) => `${j(a, 0)} me se ${j(a, 1)}-ve sabse bade number ko uthayega.`
  },
  SMALL: {
    grp: "Jodna-ginna", sig: "SMALL(range, k)", one: "k-va number sabse chhote se.",
    how: "Bottom-3 nikaalne ke liye.",
    tell: (a) => `${j(a, 0)} me se ${j(a, 1)}-ve sabse chhote number ko uthayega.`
  },
  RANK: {
    grp: "Jodna-ginna", sig: "RANK(number, range, [0/1])",
    one: "Class me kaun se number par hai.",
    how: "0 ya khaali chhodne par bade se chhota (marks ke liye sahi). 1 dene par chhote se bada.",
    tell: (a) => `${j(a, 0)} ka ${j(a, 1)} me kaunsa number aata hai, wo batayega.`
  },
  MEDIAN: {
    grp: "Jodna-ginna", sig: "MEDIAN(range)", one: "Beech ki value.",
    how: "Sabko kram me laga kar theek beech wala. Ek-do bahut bade ya chhote number ausat ko bigaad dein, to median zyada sach batata hai.",
    tell: (a) => `${j(a, 0)} ko kram me laga kar beech ki value nikaalega.`
  },
  SUBTOTAL: {
    grp: "Jodna-ginna", sig: "SUBTOTAL(kaam_ka_number, range)",
    one: "Filter lagne par sirf dikhne wali rows ka hisaab.",
    how: "9 = SUM, 1 = AVERAGE, 3 = COUNTA. 109 jaise 100+ wale number chhupi (hidden) rows ko bhi chhod dete hain. Filter wali sheet me SUM ki jagah yahi lagana chahiye.",
    tell: (a) => `Filter ke baad jo rows dikh rahi hain, sirf unka hisaab karega (kaam number ${j(a, 0)}).`
  },

  /* ---------------- Shart (logic) ---------------- */
  IF: {
    grp: "Shart (logic)", sig: "IF(shart, sach_hone_par, jhooth_hone_par)",
    one: "Shart sach hui to ek cheez, nahi to doosri.",
    how: "Excel ka sabse zyada istemaal hone wala function. Pehla hissa ek sawaal hai jiska jawab sirf haan ya na ho.",
    tell: (a) => `Agar ${j(a, 0)} sach hui, to ${j(a, 1)} dega; warna ${a[2] !== undefined ? j(a, 2) : "FALSE"} dega.`,
    tip: "Teesra hissa chhod dene par Excel FALSE likh deta hai — aksar wahan \"\" (khaali) chahiye hota hai."
  },
  IFS: {
    grp: "Shart (logic)", sig: "IFS(shart1, jawab1, shart2, jawab2, …)",
    one: "Kai shartein, ek ke baad ek jaanchi jaati hain.",
    how: "Jo shart pehle sach mili, uska jawab de kar ruk jaata hai. Grade nikaalne ke liye nested IF se kahin saaf.",
    tell: () => "Upar se neeche shartein jaanchega, jo pehle sach mili uska jawab de kar ruk jayega.",
    tip: "Sabse aakhir me TRUE, \"kuchh aur\" rakhein — warna koi shart na mili to #N/A aa jaata hai."
  },
  IFERROR: {
    grp: "Shart (logic)", sig: "IFERROR(formula, error_aane_par)",
    one: "Formula me error aaye to uski jagah kuchh aur dikhaata hai.",
    how: "#N/A ya #DIV/0! wali bhaddi sheet ko saaf karta hai. Par dhyan rahe — ye error chhupa deta hai, theek nahi karta.",
    tell: (a) => `${j(a, 0)} chalega; usme koi bhi error aaya to uski jagah ${j(a, 1)} dikhega.`,
    tip: "Pehle dekh lein error kyun aa raha hai. Bina samjhe IFERROR lagana galti ko chhupa dena hai."
  },
  IFNA: {
    grp: "Shart (logic)", sig: "IFNA(formula, na_aane_par)",
    one: "Sirf #N/A ko badalta hai, baaki errors ko nahi.",
    how: "IFERROR se behtar hai jab aap sirf \"nahi mila\" wale case ko sambhalna chahte hain aur baaki galtiyaan dikhni chahiye.",
    tell: (a) => `${j(a, 0)} me #N/A aaya to ${j(a, 1)} dikhega; baaki errors waise ke waise dikhenge.`
  },
  AND: {
    grp: "Shart (logic)", sig: "AND(shart1, shart2, …)",
    one: "SAARI shartein sach hon tabhi TRUE.",
    how: "Ek bhi galat hui to FALSE. IF ke andar rakh kar istemaal hota hai.",
    tell: () => "Saari shartein ek saath sach hongi tabhi TRUE dega."
  },
  OR: {
    grp: "Shart (logic)", sig: "OR(shart1, shart2, …)",
    one: "Koi EK bhi shart sach ho to TRUE.",
    how: "Sab galat hon tabhi FALSE.",
    tell: () => "Inme se koi ek bhi shart sach hui to TRUE dega."
  },
  NOT: {
    grp: "Shart (logic)", sig: "NOT(shart)", one: "Ulta kar deta hai.",
    how: "TRUE ko FALSE, FALSE ko TRUE.",
    tell: (a) => `${j(a, 0)} ka ulta dega.`
  },
  SWITCH: {
    grp: "Shart (logic)", sig: "SWITCH(kya_dekhein, value1, jawab1, …, [warna])",
    one: "Ek value ko kai vikalpon se milaata hai.",
    how: "Grade ya code ko naam me badalne ke liye IFS se bhi saaf.",
    tell: (a) => `${j(a, 0)} ko diye hue vikalpon se milaayega aur jo mila uska jawab dega.`
  },

  /* ---------------- Dhundhna ---------------- */
  VLOOKUP: {
    grp: "Dhundhna", sig: "VLOOKUP(kya_dhundhein, kahan_dhundhein, kaunsa_column, [0/1])",
    one: "Table ke PEHLE column me dhundh kar, usi row ka doosra column laata hai.",
    how: "Sabse zyada poochha jaane wala function. Teen zaroori baatein: (1) dhundhne wali cheez table ke PEHLE column me honi chahiye, (2) column ki ginti table ke bayein kinare se shuru hoti hai, (3) aakhir me 0 lagana lagbhag hamesha sahi hota hai.",
    tell: (a) => `${j(a, 0)} ko ${j(a, 1)} ke pehle column me dhundhega, aur milne par usi row ke ${j(a, 2)}-ve column ki value wapas dega.`,
    tip: "Aakhri hissa 0 (ya FALSE) rakhein — matlab bilkul wahi value chahiye. 1/TRUE lagane par Excel \"aas-paas ka\" utha leta hai aur chupchaap galat jawab de deta hai."
  },
  HLOOKUP: {
    grp: "Dhundhna", sig: "HLOOKUP(kya_dhundhein, kahan, kaunsi_row, [0/1])",
    one: "VLOOKUP ka letaa hua roop — pehli ROW me dhundhta hai.",
    how: "Jab data upar se neeche ki jagah bayein se dayein faila ho.",
    tell: (a) => `${j(a, 0)} ko ${j(a, 1)} ki pehli row me dhundhega aur usi column ki ${j(a, 2)}-vi row ki value dega.`
  },
  XLOOKUP: {
    grp: "Dhundhna", sig: "XLOOKUP(kya_dhundhein, kahan_dhundhein, kya_wapas_dein, [na_mile_to])",
    one: "VLOOKUP ka naya aur aasaan roop.",
    how: "Column ginne ki zaroorat nahi, bayein taraf bhi dhundh leta hai, aur exact match apne aap karta hai. Microsoft 365 aur Excel 2021 me hai, Google Sheets me bhi.",
    tell: (a) => `${j(a, 0)} ko ${j(a, 1)} me dhundhega aur usi jagah ki ${j(a, 2)} wali value dega.`,
    tip: "Excel 2016 aur 2019 me ye nahi hai — wahan #NAME? aayega. Un par VLOOKUP ya INDEX+MATCH hi lagana padega. Lab ka Excel kaunsa hai, ek baar dekh lein: File > Account."
  },
  INDEX: {
    grp: "Dhundhna", sig: "INDEX(range, row_number, [column_number])",
    one: "Range me se batayi hui jagah ki value uthata hai.",
    how: "Akela kam kaam ka hai; MATCH ke saath milkar VLOOKUP se zyada taakatwar ho jaata hai.",
    tell: (a) => `${j(a, 0)} me se ${j(a, 1)}-vi row${a[2] ? ` aur ${j(a, 2)}-ve column` : ""} ki value uthayega.`
  },
  MATCH: {
    grp: "Dhundhna", sig: "MATCH(kya_dhundhein, kahan, [0])",
    one: "Batata hai cheez kis number par mili.",
    how: "Value nahi, uski JAGAH ka number deta hai. INDEX ko yahi number chahiye hota hai.",
    tell: (a) => `${j(a, 0)} ${j(a, 1)} me kis number par hai, wo batayega.`,
    tip: "Aakhir me 0 zaroor lagayein — warna Excel maan leta hai ki list kram me lagi hui hai."
  },
  LOOKUP: {
    grp: "Dhundhna", sig: "LOOKUP(kya, kahan, [kya_wapas])",
    one: "Purana aur kamzor lookup.",
    how: "Nayi sheet me iski jagah VLOOKUP ya XLOOKUP hi lagana chahiye.",
    tell: (a) => `${j(a, 0)} ko ${j(a, 1)} me dhundhega.`
  },
  OFFSET: {
    grp: "Dhundhna", sig: "OFFSET(kahan_se, kitni_row, kitne_column, [height], [width])",
    one: "Ek cell se gin kar door ki jagah par jaata hai.",
    how: "Chalte-firte (dynamic) range banane ke liye. Bade file me sheet dheemi kar deta hai.",
    tell: (a) => `${j(a, 0)} se ${j(a, 1)} row aur ${j(a, 2)} column khisak kar wahan ki value uthayega.`
  },
  INDIRECT: {
    grp: "Dhundhna", sig: "INDIRECT(\"cell_ka_pata\")",
    one: "Text me likhe pate ko asli cell maan leta hai.",
    how: "Sheet ka naam kisi cell me rakh kar uski value uthane ke liye.",
    tell: (a) => `${j(a, 0)} me jo pata likha hai, wahan ki value uthayega.`
  },

  /* ---------------- Text ---------------- */
  LEFT: {
    grp: "Text", sig: "LEFT(text, kitne_akshar)",
    one: "Shuru se itne akshar kaat kar deta hai.",
    how: "Code ka pehla hissa, mobile number ka STD code — aise kaam me.",
    tell: (a) => `${j(a, 0)} ke shuru se ${j(a, 1)} akshar nikaalega.`
  },
  RIGHT: {
    grp: "Text", sig: "RIGHT(text, kitne_akshar)",
    one: "Aakhir se itne akshar.",
    how: "Account number ke aakhri 4 ank dikhane ke liye.",
    tell: (a) => `${j(a, 0)} ke aakhir se ${j(a, 1)} akshar nikaalega.`
  },
  MID: {
    grp: "Text", sig: "MID(text, kahan_se, kitne)",
    one: "Beech se akshar nikaalta hai.",
    how: "Ginti 1 se shuru hoti hai, 0 se nahi.",
    tell: (a) => `${j(a, 0)} ke ${j(a, 1)}-ve akshar se ${j(a, 2)} akshar nikaalega.`
  },
  LEN: {
    grp: "Text", sig: "LEN(text)", one: "Kitne akshar hain, ginta hai.",
    how: "Aadhaar 12 ank ka hai ya nahi — aise jaanch me. Space bhi ginti me aata hai.",
    tell: (a) => `${j(a, 0)} me kitne akshar hain, wo ginega (space bhi ginega).`
  },
  TRIM: {
    grp: "Text", sig: "TRIM(text)", one: "Fazool ke space hata deta hai.",
    how: "Aage-peeche ke saare space aur beech ke double space hat jaate hain. VLOOKUP \"nahi mila\" keh raha ho to 90% baar yahi ilaaj hai.",
    tell: (a) => `${j(a, 0)} ke aage-peeche ke fazool space hata dega.`,
    tip: "Copy-paste kiya hua data lagbhag hamesha TRIM maangta hai."
  },
  UPPER: { grp: "Text", sig: "UPPER(text)", one: "Sab BADE akshar.", how: "Naam ya code ko ek jaisa banane ke liye.", tell: (a) => `${j(a, 0)} ko poora bade akshar me badal dega.` },
  LOWER: { grp: "Text", sig: "LOWER(text)", one: "Sab chhote akshar.", how: "Email ko ek roop me laane ke liye.", tell: (a) => `${j(a, 0)} ko poora chhote akshar me badal dega.` },
  PROPER: { grp: "Text", sig: "PROPER(text)", one: "Har shabd ka pehla akshar bada.", how: "\"pankaj kumar\" → \"Pankaj Kumar\". Naam ki list sudharne ke liye.", tell: (a) => `${j(a, 0)} me har shabd ka pehla akshar bada kar dega.` },
  CONCATENATE: {
    grp: "Text", sig: "CONCATENATE(text1, text2, …)", one: "Kai cheezon ko jod kar ek banata hai.",
    how: "Purana tareeka. Aaj & ya CONCAT/TEXTJOIN zyada istemaal hote hain.",
    tell: () => "Diye hue sab hisson ko ek saath jod dega."
  },
  CONCAT: { grp: "Text", sig: "CONCAT(text1, text2, …)", one: "CONCATENATE ka naya naam.", how: "Range bhi le leta hai.", tell: () => "Sab hisson ko jod kar ek text banayega." },
  TEXTJOIN: {
    grp: "Text", sig: "TEXTJOIN(beech_me_kya, khaali_chhodein, text1, …)",
    one: "Beech me comma/space lagaakar jodta hai.",
    how: "Naam ki poori list ek cell me, comma ke saath — isi se. Doosra hissa TRUE rakhne par khaali cells chhod deta hai.",
    tell: (a) => `Sab hisson ko ${j(a, 0)} lagaakar jodega.`
  },
  SUBSTITUTE: {
    grp: "Text", sig: "SUBSTITUTE(text, purana, naya)",
    one: "Text me ek cheez ki jagah doosri.",
    how: "Mobile number se \"-\" hataane ke liye: SUBSTITUTE(A2,\"-\",\"\").",
    tell: (a) => `${j(a, 0)} me ${j(a, 1)} ki jagah ${j(a, 2)} lagayega.`
  },
  REPLACE: { grp: "Text", sig: "REPLACE(text, kahan_se, kitne, naya)", one: "Jagah ke hisaab se badalta hai.", how: "SUBSTITUTE naam se badalta hai, REPLACE jagah se.", tell: (a) => `${j(a, 0)} ke ${j(a, 1)}-ve akshar se ${j(a, 2)} akshar ki jagah ${j(a, 3)} rakh dega.` },
  FIND: { grp: "Text", sig: "FIND(kya, kisme, [kahan_se])", one: "Kis number par mila — bade-chhote akshar ka farq maanta hai.", how: "Na mile to #VALUE! deta hai.", tell: (a) => `${j(a, 0)} ${j(a, 1)} me kis jagah par hai, wo batayega (A aur a alag maane jayenge).` },
  SEARCH: { grp: "Text", sig: "SEARCH(kya, kisme, [kahan_se])", one: "FIND jaisa, par bade-chhote akshar ka farq nahi maanta.", how: "Aam kaam ke liye SEARCH zyada aasaan padta hai.", tell: (a) => `${j(a, 0)} ${j(a, 1)} me kahan hai, wo batayega (A aur a ek jaise maane jayenge).` },
  TEXT: {
    grp: "Text", sig: "TEXT(value, \"roop\")",
    one: "Number ya date ko manchaahe roop me text bana deta hai.",
    how: "TEXT(A1,\"dd-mm-yyyy\") ya TEXT(A1,\"#,##0.00\"). Yaad rahe — natija text ban jaata hai, uspar jodna-ghatana nahi hoga.",
    tell: (a) => `${j(a, 0)} ko ${j(a, 1)} wale roop me dikhayega.`
  },
  VALUE: { grp: "Text", sig: "VALUE(text)", one: "Text me likhe number ko asli number banata hai.", how: "Bahar se aaye data me number aksar text ban kar aate hain aur SUM 0 deta hai — tab ye.", tell: (a) => `${j(a, 0)} me likhe number ko asli number me badal dega.` },

  /* ---------------- Date & time ---------------- */
  TODAY: { grp: "Date & time", sig: "TODAY()", one: "Aaj ki date.", how: "File kholte hi apne aap badal jaati hai.", tell: () => "Aaj ki date daal dega — file jab bhi khulegi, us din ki date." },
  NOW: { grp: "Date & time", sig: "NOW()", one: "Aaj ki date aur abhi ka samay.", how: "TODAY jaisa, par ghadi bhi.", tell: () => "Abhi ki date aur samay daal dega." },
  DAY: { grp: "Date & time", sig: "DAY(date)", one: "Date me se din.", how: "1 se 31 tak.", tell: (a) => `${j(a, 0)} me se sirf din nikaalega.` },
  MONTH: { grp: "Date & time", sig: "MONTH(date)", one: "Date me se mahina.", how: "1 se 12 tak.", tell: (a) => `${j(a, 0)} me se mahine ka number nikaalega.` },
  YEAR: { grp: "Date & time", sig: "YEAR(date)", one: "Date me se saal.", how: "Umar nikaalne me kaam aata hai.", tell: (a) => `${j(a, 0)} me se saal nikaalega.` },
  DATE: { grp: "Date & time", sig: "DATE(saal, mahina, din)", one: "Teen tukdon se ek date banata hai.", how: "Alag-alag column me pade saal-mahina-din ko jodne ke liye.", tell: (a) => `${j(a, 0)}, ${j(a, 1)} aur ${j(a, 2)} se ek poori date banayega.` },
  DATEDIF: {
    grp: "Date & time", sig: "DATEDIF(shuru, aakhir, \"Y\"/\"M\"/\"D\")",
    one: "Do date ke beech ka fark.",
    how: "\"Y\" = poore saal (umar), \"M\" = mahine, \"D\" = din. Excel ki list me ye chhupa hua hai par chalta hai.",
    tell: (a) => `${j(a, 0)} se ${j(a, 1)} tak ka fark ${j(a, 2)} me nikaalega.`
  },
  EDATE: { grp: "Date & time", sig: "EDATE(date, kitne_mahine)", one: "Itne mahine aage/peeche ki date.", how: "EMI ki agli tareekh nikaalne ke liye.", tell: (a) => `${j(a, 0)} se ${j(a, 1)} mahine aage ki date dega.` },
  WEEKDAY: { grp: "Date & time", sig: "WEEKDAY(date, [2])", one: "Hafte ka kaunsa din.", how: "Doosra hissa 2 rakhein to Somvaar = 1 hota hai, jo hamare hisaab se theek baithta hai.", tell: (a) => `${j(a, 0)} hafte ka kaunsa din hai, wo number me batayega.` },
  NETWORKDAYS: { grp: "Date & time", sig: "NETWORKDAYS(shuru, aakhir, [chhuttiyaan])", one: "Beech ke kaam wale din ginta hai.", how: "Shanivaar-Ravivaar apne aap chhod deta hai.", tell: (a) => `${j(a, 0)} se ${j(a, 1)} ke beech kitne kaam ke din hain, wo ginega.` },

  /* ---------------- Number ko sudharna ---------------- */
  ROUND: {
    grp: "Number ko sudharna", sig: "ROUND(number, kitne_dashamlav)",
    one: "Number ko gol karta hai.",
    how: "2 dene par do dashamlav, 0 dene par poora number. Bill ke total par ye zaroori hai warna paise me fark aa jaata hai.",
    tell: (a) => `${j(a, 0)} ko ${j(a, 1)} dashamlav tak gol karega.`
  },
  ROUNDUP: { grp: "Number ko sudharna", sig: "ROUNDUP(number, dashamlav)", one: "Hamesha upar ki taraf gol.", how: "1.1 bhi 2 ban jaata hai.", tell: (a) => `${j(a, 0)} ko hamesha upar ki taraf gol karega.` },
  ROUNDDOWN: { grp: "Number ko sudharna", sig: "ROUNDDOWN(number, dashamlav)", one: "Hamesha neeche ki taraf gol.", how: "1.9 bhi 1 ban jaata hai.", tell: (a) => `${j(a, 0)} ko hamesha neeche ki taraf gol karega.` },
  INT: { grp: "Number ko sudharna", sig: "INT(number)", one: "Dashamlav hata deta hai.", how: "5.9 → 5.", tell: (a) => `${j(a, 0)} ka sirf poora hissa rakhega.` },
  ABS: { grp: "Number ko sudharna", sig: "ABS(number)", one: "Minus hata deta hai.", how: "-500 → 500. Antar nikaalte waqt kaam aata hai.", tell: (a) => `${j(a, 0)} ko bina minus ke dega.` },
  MOD: { grp: "Number ko sudharna", sig: "MOD(number, bhaajak)", one: "Bhaag dene par bacha hua.", how: "Ek-chhodkar-ek row rangne ke liye MOD(ROW(),2).", tell: (a) => `${j(a, 0)} ko ${j(a, 1)} se bhaag dene par jo bachega wo dega.` },
  POWER: { grp: "Number ko sudharna", sig: "POWER(number, ghaat)", one: "Ghaat (power).", how: "POWER(2,3) = 8. Ya seedhe 2^3.", tell: (a) => `${j(a, 0)} ki ${j(a, 1)} ghaat nikaalega.` },
  SQRT: { grp: "Number ko sudharna", sig: "SQRT(number)", one: "Vargmool.", how: "Rinaatmak number par #NUM! deta hai.", tell: (a) => `${j(a, 0)} ka vargmool nikaalega.` },
  RAND: { grp: "Number ko sudharna", sig: "RAND()", one: "0 se 1 ke beech koi bhi number.", how: "Har badlaav par naya number aa jaata hai.", tell: () => "0 aur 1 ke beech ka koi bhi number dega." },
  RANDBETWEEN: { grp: "Number ko sudharna", sig: "RANDBETWEEN(neeche, upar)", one: "Do numbers ke beech koi ek.", how: "Practice ka data banane ke liye.", tell: (a) => `${j(a, 0)} se ${j(a, 1)} ke beech koi ek number dega.` },
  ROW: { grp: "Number ko sudharna", sig: "ROW([cell])", one: "Row ka number.", how: "Serial number apne aap banane ke liye: ROW()-1.", tell: (a) => (a[0] ? `${j(a, 0)} ki row ka number dega.` : "Isi cell ki row ka number dega.") },
  COLUMN: { grp: "Number ko sudharna", sig: "COLUMN([cell])", one: "Column ka number.", how: "A = 1, B = 2.", tell: (a) => (a[0] ? `${j(a, 0)} ke column ka number dega.` : "Isi cell ke column ka number dega.") },

  /* ---------------- Paisa (finance) ---------------- */
  PMT: {
    grp: "Paisa (finance)", sig: "PMT(byaaj_dar_per_month, kitne_mahine, loan)",
    one: "Loan ki EMI nikaalta hai.",
    how: "Byaaj SAALANA nahi, MAHINE ka dena hota hai — 12% saal ka hai to 12%/12. Jawab minus me aata hai, kyunki paisa jaa raha hai.",
    tell: (a) => `${j(a, 2)} ke loan par, ${j(a, 0)} dar se, ${j(a, 1)} kishton ki EMI nikaalega.`,
    tip: "Sabse aam galti: saalana byaaj seedhe daal dena. 12 se bhaag dena mat bhoolein."
  },
  FV: { grp: "Paisa (finance)", sig: "FV(dar, kitni_baar, har_baar_jama, [abhi])", one: "Aage chal kar kitna banega.", how: "RD ya SIP ka hisaab.", tell: (a) => `${j(a, 0)} dar par ${j(a, 1)} baar jama karne ke baad kitna banega, wo batayega.` },
  PV: { grp: "Paisa (finance)", sig: "PV(dar, kitni_baar, har_baar)", one: "Aaj ki keemat.", how: "Aage milne wale paise ki aaj kya keemat hai.", tell: () => "Aage milne wale paise ki aaj ki keemat nikaalega." },
  NPV: { grp: "Paisa (finance)", sig: "NPV(dar, values)", one: "Project ki shuddh keemat.", how: "Business ke faisle me.", tell: () => "Aage aane wale paison ki aaj ki kul keemat nikaalega." },

  /* ---------------- Jaanch (info) ---------------- */
  ISERROR: { grp: "Jaanch (info)", sig: "ISERROR(value)", one: "Error hai ya nahi.", how: "TRUE/FALSE deta hai. IF ke saath istemaal hota tha; ab IFERROR aasaan hai.", tell: (a) => `${j(a, 0)} me koi error hai ya nahi, wo batayega.` },
  ISNA: { grp: "Jaanch (info)", sig: "ISNA(value)", one: "Sirf #N/A hai ya nahi.", how: "\"Nahi mila\" pakadne ke liye.", tell: (a) => `${j(a, 0)} me #N/A hai ya nahi, wo batayega.` },
  ISBLANK: { grp: "Jaanch (info)", sig: "ISBLANK(cell)", one: "Cell khaali hai ya nahi.", how: "Dhyan rahe: \"\" wali cell dikhne me khaali hai par ISBLANK use khaali nahi maanta.", tell: (a) => `${j(a, 0)} sach me khaali hai ya nahi, wo batayega.` },
  ISNUMBER: { grp: "Jaanch (info)", sig: "ISNUMBER(value)", one: "Number hai ya nahi.", how: "Text bane hue numbers pakadne ke liye.", tell: (a) => `${j(a, 0)} number hai ya nahi, wo batayega.` },
  ISTEXT: { grp: "Jaanch (info)", sig: "ISTEXT(value)", one: "Text hai ya nahi.", how: "Data saaf karte waqt.", tell: (a) => `${j(a, 0)} text hai ya nahi, wo batayega.` },
  NA: { grp: "Jaanch (info)", sig: "NA()", one: "Jaan-bujh kar #N/A dalta hai.", how: "Chart me khaali jagah dikhane ke liye.", tell: () => "Yahan jaan-bujh kar #N/A daal dega." },
  UNIQUE: { grp: "Jaanch (info)", sig: "UNIQUE(range)", one: "Bina dohraav wali list.", how: "Duplicate hata kar ek-ek naam. Microsoft 365 aur Excel 2021 me hai, Google Sheets me bhi. Excel 2016/2019 me nahi — wahan Data > Remove Duplicates se kaam chalta hai.", tell: (a) => `${j(a, 0)} me se har cheez ek hi baar dikhayega.` },
  SORT: { grp: "Jaanch (info)", sig: "SORT(range, [kis_column_se], [1/-1])", one: "Kram me laga deta hai.", how: "-1 dene par ulta kram. Microsoft 365 aur Excel 2021 me hai, Google Sheets me bhi. Excel 2016/2019 me nahi — wahan Data > Sort se karein.", tell: (a) => `${j(a, 0)} ko kram me laga dega.` },
  FILTER: { grp: "Jaanch (info)", sig: "FILTER(range, shart, [na_mile_to])", one: "Shart wali rows chhaant kar nikaalta hai.", how: "Jawab apne aap kai cells me fail jaata hai. Microsoft 365 aur Excel 2021 me hai, Google Sheets me bhi. Excel 2016/2019 me nahi — wahan Data > Filter se karein.", tell: (a) => `${j(a, 0)} me se sirf wo rows nikaalega jahan ${j(a, 1)} sach hai.` }
};

/* Function ke naam se dhundhna — aliases bhi chalte hain */
export function lookupFunction(name) {
  const key = String(name || "").toUpperCase().replace(/^_XLFN\./, "");
  return EXCEL_FUNCTIONS[key] || null;
}

export const FUNCTION_NAMES = Object.keys(EXCEL_FUNCTIONS).sort();
