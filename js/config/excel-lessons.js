/* ==========================================================================
   Soft Skill Zone — Mini Excel ke practice sheet aur kaam
   --------------------------------------------------------------------------
   Har lesson me: chhota sa asli jaisa data, aur us par kaam. Har kaam apne
   aap jaancha jaata hai — do baatein dekhi jaati hain:

     1) Cell me FORMULA hai ya nahi. Jawab haath se type kar dena aasaan
        hai, par usse Excel nahi aata. Isliye `needFormula` par sakhti hai.
     2) Value sahi hai ya nahi.

   `want` do tarah ka ho sakta hai:
     number/string  — bilkul yahi value chahiye
     { near: n }    — thoda upar-neeche chalega (percentage jaise hisaab me)

   Data jaan-bujh kar chhota rakha hai (10-14 row). Phone par 500 row ki
   sheet scroll karte-karte hi student thak jaata hai; seekhne ke liye itna
   hi kaafi hai.
   ========================================================================== */

export const LESSONS = [
  /* ================================================================== */
  {
    id: "basics",
    title: "Shuruaat — jodna, ginna",
    level: "Aasaan",
    about: "Ek dukaan ka chhota bill. SUM, AVERAGE, MAX, MIN aur COUNT — Excel ki neenv.",
    cols: 5,
    rows: 16,
    data: {
      A1: "Item", B1: "Qty", C1: "Rate", D1: "Amount",
      A2: "Notebook", B2: 12, C2: 45,
      A3: "Ball Pen", B3: 25, C3: 10,
      A4: "A4 Paper", B4: 3, C4: 320,
      A5: "Register", B5: 8, C5: 130,
      A6: "File", B6: 15, C6: 35,
      A7: "Marker", B7: 6, C7: 60,
      A9: "Total", A10: "Sabse mehnga", A11: "Sabse sasta", A12: "Average amount", A13: "Kitne item"
    },
    tasks: [
      { cell: "D2", want: 540, needFormula: true, say: "D2 me Amount nikaalein — Qty × Rate.", hint: "=B2*C2" },
      { cell: "D3", want: 250, needFormula: true, say: "D3 me bhi wahi karein. (Excel me D2 ko copy karke D3 par paste bhi kar sakte hain.)", hint: "=B3*C3" },
      { cell: "D4", want: 960, needFormula: true, say: "D4 bharein.", hint: "=B4*C4" },
      { cell: "D5", want: 1040, needFormula: true, say: "D5 bharein.", hint: "=B5*C5" },
      { cell: "D6", want: 525, needFormula: true, say: "D6 bharein.", hint: "=B6*C6" },
      { cell: "D7", want: 360, needFormula: true, say: "D7 bharein.", hint: "=B7*C7" },
      { cell: "D9", want: 3675, needFormula: true, say: "D9 me sabka TOTAL nikaalein.", hint: "=SUM(D2:D7)" },
      { cell: "D10", want: 1040, needFormula: true, say: "D10 me sabse BADA amount.", hint: "=MAX(D2:D7)" },
      { cell: "D11", want: 250, needFormula: true, say: "D11 me sabse CHHOTA amount.", hint: "=MIN(D2:D7)" },
      { cell: "D12", want: { near: 612.5 }, needFormula: true, say: "D12 me AVERAGE amount.", hint: "=AVERAGE(D2:D7)" },
      { cell: "D13", want: 6, needFormula: true, say: "D13 me kitne item hain, wo ginein.", hint: "=COUNT(D2:D7) ya =COUNTA(A2:A7)" }
    ]
  },

  /* ================================================================== */
  {
    id: "marksheet",
    title: "Marksheet — IF aur grade",
    level: "Aasaan",
    about: "Students ke marks. Total, percentage aur Pass/Fail — IF ka pehla asli istemaal.",
    cols: 7,
    rows: 14,
    data: {
      A1: "Roll", B1: "Naam", C1: "Excel", D1: "Tally", E1: "Total", F1: "Percent", G1: "Result",
      A2: "R101", B2: "Anita", C2: 78, D2: 65,
      A3: "R102", B3: "Mohit", C3: 45, D3: 28,
      A4: "R103", B4: "Sunita", C4: 92, D4: 88,
      A6: "Class average %", A7: "Kitne pass hue", A8: "Topper ka total"
    },
    tasks: [
      { cell: "E2", want: 143, needFormula: true, say: "E2 me Anita ka TOTAL nikaalein.", hint: "=SUM(C2:D2)" },
      { cell: "F2", want: { near: 71.5 }, needFormula: true, say: "F2 me percentage nikaalein. Dono subject 100-100 ke hain (kul 200).", hint: "=E2/200*100" },
      { cell: "G2", want: "Pass", needFormula: true, say: 'G2 me Result: 33% se zyada ho to "Pass", warna "Fail".', hint: '=IF(F2>=33,"Pass","Fail")' },
      { cell: "E3", want: 73, needFormula: true, say: "E3 me Mohit ka total.", hint: "=SUM(C3:D3)" },
      { cell: "F3", want: { near: 36.5 }, needFormula: true, say: "F3 me Mohit ka percentage.", hint: "=E3/200*100" },
      { cell: "G3", want: "Pass", needFormula: true, say: "G3 me Mohit ka result. (Dekhiye — 36.5% hai, to Pass aayega.)", hint: '=IF(F3>=33,"Pass","Fail")' },
      { cell: "E4", want: 180, needFormula: true, say: "E4 me Sunita ka total.", hint: "=SUM(C4:D4)" },
      { cell: "F4", want: 90, needFormula: true, say: "F4 me Sunita ka percentage.", hint: "=E4/200*100" },
      { cell: "G4", want: "Pass", needFormula: true, say: "G4 me Sunita ka result.", hint: '=IF(F4>=33,"Pass","Fail")' },
      { cell: "F6", want: { near: 66 }, needFormula: true, say: "F6 me teeno ka average percentage nikaalein.", hint: "=AVERAGE(F2:F4)" },
      { cell: "E7", want: 3, needFormula: true, say: 'E7 me ginein kitne "Pass" hue.', hint: '=COUNTIF(G2:G4,"Pass")' },
      { cell: "E8", want: 180, needFormula: true, say: "E8 me topper ka total nikaalein.", hint: "=MAX(E2:E4)" }
    ]
  },

  /* ================================================================== */
  {
    id: "sumif",
    title: "Shart wala hisaab — SUMIF, COUNTIF",
    level: "Beech ka",
    about: "Sheher ke hisaab se sale. \"Sirf Ara ki sale kitni hui?\" — daftar ka sabse aam sawaal.",
    cols: 5,
    rows: 18,
    data: {
      A1: "Invoice", B1: "Customer", C1: "Sheher", D1: "Amount",
      A2: "INV-01", B2: "Amit", C2: "Ara", D2: 4500,
      A3: "INV-02", B3: "Priya", C3: "Patna", D3: 12000,
      A4: "INV-03", B4: "Rahul", C4: "Ara", D4: 3200,
      A5: "INV-04", B5: "Sunita", C5: "Buxar", D5: 8000,
      A6: "INV-05", B6: "Manoj", C6: "Ara", D6: 15600,
      A7: "INV-06", B7: "Kavita", C7: "Patna", D7: 2400,
      A8: "INV-07", B8: "Ravi", C8: "Ara", D8: 9800,
      A9: "INV-08", B9: "Anita", C9: "Siwan", D9: 5100,
      A11: "Kul sale", A12: "Ara ki sale", A13: "Ara ke invoice", A14: "Patna ki sale",
      A15: "10000 se bade", A16: "Ara ke bade (10000+)"
    },
    tasks: [
      { cell: "D11", want: 60600, needFormula: true, say: "D11 me kul sale nikaalein.", hint: "=SUM(D2:D9)" },
      { cell: "D12", want: 33100, needFormula: true, say: "D12 me sirf Ara ki kul sale nikaalein.", hint: '=SUMIF(C2:C9,"Ara",D2:D9)' },
      { cell: "D13", want: 4, needFormula: true, say: "D13 me ginein Ara ke kitne invoice hain.", hint: '=COUNTIF(C2:C9,"Ara")' },
      { cell: "D14", want: 14400, needFormula: true, say: "D14 me Patna ki sale.", hint: '=SUMIF(C2:C9,"Patna",D2:D9)' },
      { cell: "D15", want: 2, needFormula: true, say: "D15 me ginein kitne invoice 10,000 se bade hain.", hint: '=COUNTIF(D2:D9,">10000")' },
      { cell: "D16", want: 1, needFormula: true, say: "D16 me ginein Ara ke kitne invoice 10,000 se bade hain — DO shartein.", hint: '=COUNTIFS(C2:C9,"Ara",D2:D9,">10000")' }
    ]
  },

  /* ================================================================== */
  {
    id: "vlookup",
    title: "VLOOKUP — rate list se daam uthana",
    level: "Beech ka",
    about: "Ek rate list, aur ek bill. Item ka naam daalne par rate apne aap aa jaye — yahi VLOOKUP hai.",
    cols: 7,
    rows: 14,
    data: {
      A1: "RATE LIST", A2: "Item", B2: "Rate",
      A3: "Notebook", B3: 45,
      A4: "Pen", B4: 10,
      A5: "Paper", B5: 320,
      A6: "Register", B6: 130,
      A7: "File", B7: 35,
      D1: "BILL", D2: "Item", E2: "Qty", F2: "Rate", G2: "Amount",
      D3: "Register", E3: 4,
      D4: "Pen", E4: 20,
      D5: "Paper", E5: 2,
      D7: "Bill total"
    },
    tasks: [
      { cell: "F3", want: 130, needFormula: true, say: "F3 me Register ka rate rate-list se uthayein.", hint: "=VLOOKUP(D3,$A$3:$B$7,2,0)" },
      { cell: "G3", want: 520, needFormula: true, say: "G3 me Amount nikaalein — Qty × Rate.", hint: "=E3*F3" },
      { cell: "F4", want: 10, needFormula: true, say: "F4 me Pen ka rate uthayein.", hint: "=VLOOKUP(D4,$A$3:$B$7,2,0)" },
      { cell: "G4", want: 200, needFormula: true, say: "G4 me Amount.", hint: "=E4*F4" },
      { cell: "F5", want: 320, needFormula: true, say: "F5 me Paper ka rate.", hint: "=VLOOKUP(D5,$A$3:$B$7,2,0)" },
      { cell: "G5", want: 640, needFormula: true, say: "G5 me Amount.", hint: "=E5*F5" },
      { cell: "G7", want: 1360, needFormula: true, say: "G7 me bill ka total.", hint: "=SUM(G3:G5)" },
      { cell: "D9", want: "Nahi mila", needFormula: true, say: 'D9 me "Pencil" ka rate uthaane ki koshish karein — wo list me hai hi nahi. #N/A ki jagah "Nahi mila" dikhna chahiye.', hint: '=IFERROR(VLOOKUP("Pencil",$A$3:$B$7,2,0),"Nahi mila")' }
    ]
  },

  /* ================================================================== */
  {
    id: "text-date",
    title: "Text aur Date ka kaam",
    level: "Beech ka",
    about: "Naam jodna, code ke tukde nikaalna, aur date se umar — roz ka daftar ka kaam.",
    cols: 6,
    rows: 16,
    data: {
      A1: "Pehla naam", B1: "Surname", C1: "Poora naam", D1: "Code", E1: "Saal", F1: "Umar",
      A2: "Pankaj", B2: "Pandey", D2: "SSZ-2026-001",
      A3: "  Anita ", B3: "Kumari", D3: "SSZ-2025-042",
      A4: "ravi", B4: "singh", D4: "SSZ-2024-117",
      A6: "Janam date", B6: "15-08-2005", D6: "Saal ginein",
      A7: "Naam ki lambai"
    },
    tasks: [
      { cell: "C2", want: "Pankaj Pandey", needFormula: true, say: "C2 me pehla naam aur surname jodein — beech me ek space.", hint: '=A2&" "&B2' },
      { cell: "C3", want: "Anita Kumari", needFormula: true, say: "C3 me bhi jodein. Dhyan dein — A3 me aage-peeche fazool space hai, use hatana hai.", hint: '=TRIM(A3)&" "&B3' },
      { cell: "C4", want: "Ravi Singh", needFormula: true, say: "C4 me jodein, aur har shabd ka pehla akshar BADA karein.", hint: '=PROPER(A4&" "&B4)' },
      { cell: "E2", want: "2026", needFormula: true, say: "E2 me code (D2) me se sirf saal nikaalein.", hint: "=MID(D2,5,4)" },
      { cell: "E3", want: "2025", needFormula: true, say: "E3 me bhi wahi.", hint: "=MID(D3,5,4)" },
      { cell: "F7", want: 13, needFormula: true, say: "F7 me C2 wale poore naam ki lambai (kitne akshar) nikaalein. Space bhi ginta hai.", hint: "=LEN(C2)" },
      { cell: "F6", want: 20, needFormula: true, say: "F6 me nikaalein: 15-08-2005 se 15-08-2025 tak kitne poore saal hue.", hint: '=DATEDIF(DATE(2005,8,15),DATE(2025,8,15),"Y")' }
    ]
  }
];

export const getLesson = (id) => LESSONS.find((l) => l.id === id) || LESSONS[0];
