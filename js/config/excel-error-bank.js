/* ==========================================================================
   Soft Skill Zone — Excel ke error aur unka ilaaj
   --------------------------------------------------------------------------
   Har entry:
     code   — cell me jo dikhta hai
     name   — Hinglish naam
     one    — ek line me Excel kya keh raha hai
     why    — [{ cause, fix }] — kyun aaya, aur kya karein
     demo   — chhota udaharan
     tags   — dhundhne me madad ke liye

   Do cheezein jaanbujh kar shaamil hain jo "error value" nahi hain —
   circular reference aur number-as-text. Lab me inhi do se sabse zyada
   sawaal aate hain, aur student inhe error hi samajhta hai.

   Likhne ka niyam: "ilaaj" me wo likhna hai jo student SEEDHE kar sake.
   "Check your formula" likhna kisi kaam ka nahi.
   ========================================================================== */

export const EXCEL_ERRORS = [
  {
    code: "#N/A",
    name: "Mila hi nahi",
    one: "Excel keh raha hai: jo aap dhundh rahe the, wo nahi mila.",
    tags: ["vlookup", "match", "lookup", "nahi mila", "not available", "xlookup"],
    demo: '=VLOOKUP("Ramesh", A2:C50, 3, 0)  →  list me "Ramesh" hai hi nahi',
    why: [
      {
        cause: "Value sach me table me hai hi nahi.",
        fix: "Ek baar Ctrl+F se wahi value table me dhundh kar dekhein. Sach me na ho to formula sahi hai — sirf data adhoora hai."
      },
      {
        cause: "Dikhne me ek jaisa hai, par aage-peeche space chhupa hua hai. Ye sabse aam wajah hai.",
        fix: "Dono taraf TRIM lagayein: =VLOOKUP(TRIM(A2),…). Pakka karne ke liye =LEN(A2) chala kar dekhein — akshar se zyada ginti aa rahi ho to space hai."
      },
      {
        cause: "Ek taraf number hai, doosri taraf text me likha number.",
        fix: "Column select karke Data > Text to Columns > Finish dabayein — text bane number asli number ban jaate hain. Ya =VALUE(A2) lagayein."
      },
      {
        cause: "Dhundhne wali cheez table ke PEHLE column me nahi hai.",
        fix: "VLOOKUP hamesha pehle column me hi dhundhta hai. Table waise banayein, ya INDEX+MATCH / XLOOKUP lagayein."
      },
      {
        cause: "Aakhri hissa 0 nahi lagaya aur list kram me nahi hai.",
        fix: "Aakhir me 0 lagayein: =VLOOKUP(A2, B:D, 3, 0)."
      }
    ]
  },
  {
    code: "#REF!",
    name: "Pata hi mit gaya",
    one: "Formula jis cell ko dekh raha tha, wo ab hai hi nahi.",
    tags: ["delete", "row", "column", "reference", "hataya", "cut paste"],
    demo: "Aapne wo column delete kar diya jise formula padh raha tha",
    why: [
      {
        cause: "Aapne wo row ya column delete kar diya jise formula istemaal kar raha tha.",
        fix: "Turant Ctrl+Z dabayein — delete wapas ho jayega. Der ho gayi ho to formula dobara likhna padega; Excel purana pata yaad nahi rakhta."
      },
      {
        cause: "VLOOKUP me column number range ki chaudai se zyada hai.",
        fix: "Table 3 column ka hai to column number 3 se zyada nahi ho sakta. Range aur number dono gin lein."
      },
      {
        cause: "Cut-paste karte waqt formula ka nishana hat gaya.",
        fix: "Cut (Ctrl+X) ki jagah copy (Ctrl+C) karein, fir purana hataayein."
      }
    ]
  },
  {
    code: "#VALUE!",
    name: "Galat kism ki cheez",
    one: "Excel se number ka kaam kaha gaya, par usse text mila.",
    tags: ["text", "number", "type", "jodna", "sum"],
    demo: '=A1*2   jahan A1 me "das" likha hai',
    why: [
      {
        cause: "Cell me number ki jagah text (ya khaali dikhta space) pada hai.",
        fix: "=ISNUMBER(A1) chala kar dekhein. FALSE aaye to wahan number hai hi nahi."
      },
      {
        cause: "Number ke saath unit ya comma type kar diya — jaise \"500 kg\" ya \"1,000/-\".",
        fix: "Cell me sirf 500 likhein. Unit dikhani ho to Format Cells > Custom se lagayein, type mat karein."
      },
      {
        cause: "Date ko text ki tarah type kiya (jaise 1-4-2026 kisi aur roop me).",
        fix: "Date column select karke Data > Text to Columns > Date chunein."
      },
      {
        cause: "Function ko jitne hisse chahiye the utne nahi diye.",
        fix: "Formula Explainer me daal kar dekhein ki function kya-kya maangta hai."
      }
    ]
  },
  {
    code: "#DIV/0!",
    name: "Sifar se bhaag",
    one: "Kisi cheez ko 0 se — ya khaali cell se — bhaag diya gaya hai.",
    tags: ["bhaag", "divide", "zero", "percentage", "average"],
    demo: "=B2/C2   jahan C2 khaali hai ya 0 hai",
    why: [
      {
        cause: "Neeche wali cell abhi bhari nahi gayi.",
        fix: "Data bhar jaane par apne aap theek ho jayega. Tab tak saaf dikhaane ke liye: =IFERROR(B2/C2, \"\")."
      },
      {
        cause: "Sach me 0 se bhaag ho raha hai.",
        fix: "=IF(C2=0, \"—\", B2/C2) — ye saaf batata hai ki value hai hi nahi, error chhupata nahi."
      },
      {
        cause: "AVERAGE aisi range par lagaya jisme ek bhi number nahi.",
        fix: "Range dekh lein — ho sakta hai poora column text ka ho."
      }
    ]
  },
  {
    code: "#NAME?",
    name: "Ye naam samajh nahi aaya",
    one: "Excel ko function ka naam ya koi shabd pehchaan me nahi aaya.",
    tags: ["spelling", "typo", "galti", "function", "quote"],
    demo: "=VLOOKP(A2,B:C,2,0)   —  VLOOKUP ki spelling galat hai",
    why: [
      {
        cause: "Function ke naam ki spelling galat hai.",
        fix: "Type karte waqt Excel jo list dikhata hai usme se Tab dabaakar chunein — spelling kabhi galat nahi hogi."
      },
      {
        cause: "Text ko quote me nahi rakha.",
        fix: '=IF(A2>50,"Pass","Fail") — Pass aur Fail ke aas-paas double quote zaroori hai.'
      },
      {
        cause: "Naya function purane Excel me chalaya (XLOOKUP, TEXTJOIN, UNIQUE, IFS).",
        fix: "Excel 2016/2019 me ye nahi hain. VLOOKUP, CONCATENATE ya nested IF se kaam chalayein."
      },
      {
        cause: "Range ke beech ka colon (:) chhoot gaya — A1A10 likh diya.",
        fix: "A1:A10 likhein."
      }
    ]
  },
  {
    code: "#NUM!",
    name: "Number se hi dikkat",
    one: "Ganit ka kaam ho hi nahi sakta, ya jawab itna bada hai ki samaata nahi.",
    tags: ["sqrt", "power", "bada", "irr", "rate"],
    demo: "=SQRT(-9)   —  rinaatmak ka vargmool nahi hota",
    why: [
      { cause: "Rinaatmak (minus wale) number ka vargmool maanga.", fix: "=SQRT(ABS(A1)) — pehle minus hata dein, agar wo aapke kaam me theek ho." },
      { cause: "Jawab Excel ki hadd se bada ho gaya.", fix: "Ghaat (^) ka number chhota karein." },
      { cause: "PMT / RATE jaise finance function ko aisa data diya jispar hisaab nahi banta.", fix: "Loan ki rakam minus me daalein aur byaaj mahine ka dein (saalana/12)." }
    ]
  },
  {
    code: "#NULL!",
    name: "Do range milte hi nahi",
    one: "Do range ke beech space laga hai, aur wo ek doosre ko kaatte nahi.",
    tags: ["space", "colon", "comma", "range"],
    demo: "=SUM(A1:A5 C1:C5)   —  beech me comma hona chahiye tha",
    why: [
      {
        cause: "Range ke beech comma ki jagah space laga diya.",
        fix: "=SUM(A1:A5, C1:C5) — comma lagayein. Ye sabse aam wajah hai."
      },
      {
        cause: "Colon ki jagah galti se space aa gaya.",
        fix: "=SUM(A1:A5) likhein, =SUM(A1 A5) nahi."
      }
    ]
  },
  {
    code: "#SPILL!",
    name: "Jawab failne ki jagah nahi mil rahi",
    one: "Formula ka jawab kai cells me failna chahta hai, par aage koi cell bhari hui hai.",
    tags: ["unique", "filter", "sort", "spill", "naya excel", "365"],
    demo: "=UNIQUE(A2:A50)   —  neeche ki kisi cell me pehle se kuchh likha hai",
    why: [
      {
        cause: "Jawab jitni jagah maangta hai, wahan pehle se data pada hai.",
        fix: "Excel un cells ko halke rang me ghera dikhata hai — wahan ki cells khaali kar dein."
      },
      {
        cause: "Merged cells beech me aa rahi hain.",
        fix: "Merge & Center hata dein. Failne wale formula merged cells me nahi chal sakte."
      },
      {
        cause: "Poora column reference de diya (A:A) jisse jawab 10 lakh row maangta hai.",
        fix: "Jitni rows me data hai utna hi range lein: A2:A5000."
      }
    ]
  },
  {
    code: "#CALC!",
    name: "Hisaab ho hi nahi sakta",
    one: "Naye Excel ka error — jaise FILTER ko kuchh mila hi nahi.",
    tags: ["filter", "khaali", "365"],
    demo: '=FILTER(A2:B50, C2:C50="Patna")   —  Patna wala koi hai hi nahi',
    why: [
      {
        cause: "FILTER ki shart kisi bhi row par poori nahi hui.",
        fix: '=FILTER(A2:B50, C2:C50="Patna", "Koi nahi mila") — teesra hissa daal dein.'
      },
      { cause: "Khaali array ka hisaab maanga gaya.", fix: "Range me data hai ya nahi, ek baar dekh lein." }
    ]
  },
  {
    code: "#####",
    name: "Column patla hai",
    one: "Ye error hai hi nahi — number samaane ki jagah kam hai.",
    tags: ["hash", "chaudai", "width", "column", "date"],
    demo: "Column ke kinare par double-click karein",
    why: [
      {
        cause: "Column ki chaudai number se kam hai.",
        fix: "Column ke daayein kinare par double-click — chaudai apne aap set ho jayegi."
      },
      {
        cause: "Date ya samay rinaatmak (minus me) ban gaya.",
        fix: "Date ka ghata-jodh dekh lein — badi date me se chhoti ghatani hoti hai, ulta nahi."
      }
    ]
  },
  {
    code: "Circular Reference",
    name: "Formula khud ko hi ginne laga",
    one: "Cell apne hi natije ko istemaal kar rahi hai — Excel ghoomta reh jaata hai.",
    tags: ["circular", "khud", "sum", "total", "warning"],
    demo: "B10 me =SUM(B2:B10)   —  B10 khud bhi range me aa gaya",
    why: [
      {
        cause: "Total wali cell khud range ke andar aa gayi.",
        fix: "B10 me =SUM(B2:B9) likhein — total wali cell ko range se bahar rakhein."
      },
      {
        cause: "Do cells ek doosre ko dekh rahi hain.",
        fix: "Formulas > Error Checking > Circular References — Excel khud pata bata dega."
      }
    ]
  },
  {
    code: "Number text bana hua",
    name: "Hara kona, aur SUM se 0",
    one: "Cell ke kone me hara nishaan hai, number bayein taraf chipka hai, aur SUM 0 de raha hai.",
    tags: ["green", "hara", "text", "sum 0", "left", "import", "tally"],
    demo: "Tally ya website se export kiya hua data — SUM 0 dikhata hai",
    why: [
      {
        cause: "Bahar se aaya data text ke roop me hai. Number hamesha dayein taraf chipakta hai; ye bayein taraf hai.",
        fix: "Column select karein → Data > Text to Columns > Next > Next > Finish. Turant number ban jayenge."
      },
      {
        cause: "Number ke saath dikhne me khaali par asal me non-breaking space hai.",
        fix: "=VALUE(SUBSTITUTE(A2, CHAR(160), \"\")) — website se copy kiye data me ye aam hai."
      },
      {
        cause: "Cell ka format pehle se Text set hai.",
        fix: "Format Cells se General karein, fir har cell me jaakar Enter dabayein (ya Text to Columns wala tareeka)."
      }
    ]
  }
];

export const ERROR_CODES = EXCEL_ERRORS.map((e) => e.code);

/* Student jo bhi likhe — "#N/A", "na", "vlookup nahi mil raha" — usse
   milta-julta error dhundhne ki koshish. */
export function findError(text) {
  const q = String(text || "").trim().toLowerCase();
  if (!q) return null;
  return (
    EXCEL_ERRORS.find((e) => e.code.toLowerCase() === q) ||
    EXCEL_ERRORS.find((e) => q.includes(e.code.toLowerCase())) ||
    EXCEL_ERRORS.find((e) => e.tags.some((t) => q.includes(t))) ||
    null
  );
}
