/* ==========================================================================
   Soft Skill Zone — Excel formula practice ka bank
   --------------------------------------------------------------------------
   Har sawaal: { lvl, q, a, alt? }
     lvl  = Easy | Medium | Hard
     a    = sahi formula
     alt  = doosre roop jo bhi sahi maane jayenge

   Jaanch me hum formula ko normalise karte hain (bade akshar, space hata kar,
   single quote ko double bana kar), taaki student ka sahi jawab sirf spacing
   ki wajah se galat na ho jaye.
   ========================================================================== */

export const EXCEL_LEVELS = ["Easy", "Medium", "Hard"];

export const EXCEL_QUESTIONS = [
  /* ---------------- Easy (22) ---------------- */
  { lvl: "Easy", q: "B2 se B10 tak marks hain. Sabka TOTAL nikaalein.", a: "=SUM(B2:B10)" },
  { lvl: "Easy", q: "B2 se B10 tak marks hain. Class ka AVERAGE nikaalein.", a: "=AVERAGE(B2:B10)" },
  { lvl: "Easy", q: "E2 se E20 tak totals hain. Sabse BADA total (topper) dhundhein.", a: "=MAX(E2:E20)" },
  { lvl: "Easy", q: "E2 se E20 tak amounts hain. Sabse CHHOTA amount dhundhein.", a: "=MIN(E2:E20)" },
  { lvl: "Easy", q: "B2 se B15 me numbers hain. Kitni entries bhari hain — sirf numbers ginein.", a: "=COUNT(B2:B15)" },
  { lvl: "Easy", q: "A2 se A15 me students ke NAAM hain. Kitne naam bhare hain?", a: "=COUNTA(A2:A15)" },
  { lvl: "Easy", q: "A1 me 250 aur B1 me 4 hai. Dono ka GUNA karein.", a: "=A1*B1" },
  { lvl: "Easy", q: "C2 me total hai, D2 me advance. BAAKI amount nikaalein.", a: "=C2-D2" },
  { lvl: "Easy", q: "A1 me kul marks, B1 me paaye hue marks. Percentage nikaalein.", a: "=B1/A1*100", alt: ["=(B1/A1)*100", "=B1*100/A1"] },
  { lvl: "Easy", q: "B2 me amount hai. Uska 18% GST nikaalein.", a: "=B2*18%", alt: ["=B2*0.18"] },
  { lvl: "Easy", q: "A2 me pehla naam, B2 me surname. Dono ko ek space ke saath jodein.", a: "=A2&\" \"&B2", alt: ["=CONCATENATE(A2,\" \",B2)", "=CONCAT(A2,\" \",B2)"] },
  { lvl: "Easy", q: "Cell me aaj ki date apne aap aaye — formula likhein.", a: "=TODAY()" },
  { lvl: "Easy", q: "Date ke saath samay bhi chahiye — formula likhein.", a: "=NOW()" },
  { lvl: "Easy", q: "A2 me mobile number hai. Usme kitne akshar hain, ginein.", a: "=LEN(A2)" },
  { lvl: "Easy", q: "A2 me naam chhote akshar me hai. Use POORA BADA karein.", a: "=UPPER(A2)" },
  { lvl: "Easy", q: "A2 me naam BADE akshar me hai. Use poora chhota karein.", a: "=LOWER(A2)" },
  { lvl: "Easy", q: "B2 me 1234.5678 hai. Use 2 dashamlav tak gol karein.", a: "=ROUND(B2,2)" },
  { lvl: "Easy", q: "B2:B20 me quantity hai, C2:C20 me rate. Sabka kul amount ek hi formula se nikaalein.", a: "=SUMPRODUCT(B2:B20,C2:C20)" },
  { lvl: "Easy", q: "A1 me 100 aur B1 me 30 hai. B1, A1 ka kitna pratishat hai?", a: "=B1/A1*100", alt: ["=(B1/A1)*100"] },
  { lvl: "Easy", q: "D2 me amount hai. Usme 500 ka discount ghata kar dikhayein.", a: "=D2-500" },
  { lvl: "Easy", q: "B2 me basic salary hai. 12% PF nikaalein.", a: "=B2*12%", alt: ["=B2*0.12"] },
  { lvl: "Easy", q: "A2 me poora naam hai. Uske aage-peechhe ki fazool space hatayein.", a: "=TRIM(A2)" },

  /* ---------------- Medium (24) ---------------- */
  { lvl: "Medium", q: "B2 me marks hain. 33 ya usse zyada par \"Pass\", warna \"Fail\" dikhayein.", a: "=IF(B2>=33,\"Pass\",\"Fail\")" },
  { lvl: "Medium", q: "F2:F30 me payment mode hai. Kitni entries \"Cash\" hain — ginein.", a: "=COUNTIF(F2:F30,\"Cash\")" },
  { lvl: "Medium", q: "E2:E30 me amounts hain. Kitne bill 10000 se BADE hain?", a: "=COUNTIF(E2:E30,\">10000\")" },
  { lvl: "Medium", q: "F2:F30 me mode hai, E2:E30 me amount. Sirf \"Cash\" wali bikri ka TOTAL nikaalein.", a: "=SUMIF(F2:F30,\"Cash\",E2:E30)" },
  { lvl: "Medium", q: "C2 me pieces aur D2 me defects hain. Pieces 400 se zyada AUR defects 0 hon to 2000, warna 500.", a: "=IF(AND(C2>400,D2=0),2000,500)" },
  { lvl: "Medium", q: "B2 me amount hai, D1 me GST rate (fix cell). GST nikaalein — copy karne par D1 na badle.", a: "=B2*$D$1" },
  { lvl: "Medium", q: "A2 me '  RAHUL KUMAR  ' jaisa ganda naam hai. Space hatayein aur Proper case banayein.", a: "=PROPER(TRIM(A2))" },
  { lvl: "Medium", q: "A2 me janm tithi hai. Aaj tak ke poore SAAL (umar) nikaalein.", a: "=DATEDIF(A2,TODAY(),\"Y\")" },
  { lvl: "Medium", q: "B2 me marks hain. 40 se kam ya 100 se zyada ho to \"Galat\", warna \"Theek\".", a: "=IF(OR(B2<40,B2>100),\"Galat\",\"Theek\")" },
  { lvl: "Medium", q: "E2:E50 me amount hai. Sirf 5000 se bade bill ka average nikaalein.", a: "=AVERAGEIF(E2:E50,\">5000\")" },
  { lvl: "Medium", q: "A2 me 'RAHUL KUMAR' hai. Sirf pehle 5 akshar nikaalein.", a: "=LEFT(A2,5)" },
  { lvl: "Medium", q: "A2 me invoice number hai. Aakhri 4 akshar nikaalein.", a: "=RIGHT(A2,4)" },
  { lvl: "Medium", q: "B2 me date hai. Usme se sirf mahina (number) nikaalein.", a: "=MONTH(B2)" },
  { lvl: "Medium", q: "B2 me date hai. Us din ka naam (Monday, Tuesday) nikaalein.", a: "=TEXT(B2,\"dddd\")" },
  { lvl: "Medium", q: "A2 me date hai. Usme 15 din jodkar due date nikaalein.", a: "=A2+15" },
  { lvl: "Medium", q: "B2 khali ho to \"Baaki\", warna \"Ho gaya\" dikhayein.", a: "=IF(B2=\"\",\"Baaki\",\"Ho gaya\")", alt: ["=IF(ISBLANK(B2),\"Baaki\",\"Ho gaya\")"] },
  { lvl: "Medium", q: "C2 me total fee, D2 me jama fee hai. Baaki 0 ho to \"Clear\", warna baaki amount dikhayein.", a: "=IF(C2-D2=0,\"Clear\",C2-D2)" },
  { lvl: "Medium", q: "B2:B50 me marks hain. Class me sabse upar se 3rd sabse bada marks nikaalein.", a: "=LARGE(B2:B50,3)" },
  { lvl: "Medium", q: "B2:B50 me marks hain. Sabse neeche se 2nd sabse chhota marks nikaalein.", a: "=SMALL(B2:B50,2)" },
  { lvl: "Medium", q: "B2 ka marks class B2:B50 me kaunse number par hai (sabse bada = 1)?", a: "=RANK(B2,$B$2:$B$50)", alt: ["=RANK.EQ(B2,$B$2:$B$50)"] },
  { lvl: "Medium", q: "A2 me sheher ka naam hai. \"Ara\" ho to 50 rupaye delivery, warna 100.", a: "=IF(A2=\"Ara\",50,100)" },
  { lvl: "Medium", q: "E2 me amount hai. 18% GST jodkar kul amount dikhayein.", a: "=E2*1.18", alt: ["=E2+E2*18%", "=E2+E2*0.18"] },
  { lvl: "Medium", q: "B2 me GST sahit amount hai. Usme se 18% GST alag nikaalein.", a: "=B2-B2/1.18", alt: ["=B2*18/118"] },
  { lvl: "Medium", q: "A2:A50 me naam hain. Kitne alag-alag naam hain, ginein.", a: "=SUMPRODUCT(1/COUNTIF(A2:A50,A2:A50))", alt: ["=COUNTA(UNIQUE(A2:A50))"] },

  /* ---------------- Hard (20) ---------------- */
  { lvl: "Hard", q: "C2:C50 me city, F2:F50 me mode, E2:E50 me amount hai. \"Ara\" ke \"Cash\" bill ka total nikaalein.", a: "=SUMIFS(E2:E50,C2:C50,\"Ara\",F2:F50,\"Cash\")" },
  { lvl: "Hard", q: "H1 me EmpID hai. Table A2:F50 ke 2nd column se uska NAAM laayein (exact match, VLOOKUP se).", a: "=VLOOKUP(H1,A2:F50,2,FALSE)", alt: ["=VLOOKUP(H1,A2:F50,2,0)"] },
  { lvl: "Hard", q: "H1 me ID hai. A2:A50 me IDs, B2:B50 me naam. XLOOKUP se naam laayein, na mile to \"Nahi mila\".", a: "=XLOOKUP(H1,A2:A50,B2:B50,\"Nahi mila\")" },
  { lvl: "Hard", q: "B2 ke marks par grade: 90+ = \"A\", 75+ = \"B\", 60+ = \"C\", warna \"D\" — IFS se.", a: "=IFS(B2>=90,\"A\",B2>=75,\"B\",B2>=60,\"C\",TRUE,\"D\")" },
  { lvl: "Hard", q: "VLOOKUP(H1,A2:F50,2,FALSE) #N/A de raha hai. Error par \"ID nahi mili\" dikhayein.", a: "=IFERROR(VLOOKUP(H1,A2:F50,2,FALSE),\"ID nahi mili\")" },
  { lvl: "Hard", q: "A2 me 'EMP2026107' hai. Beech ka saal (2026) nikaalein — 4th position se 4 akshar.", a: "=MID(A2,4,4)" },
  { lvl: "Hard", q: "H1 me naam hai. A2:A50 me naam, C2:C50 me marks. INDEX-MATCH se marks laayein.", a: "=INDEX(C2:C50,MATCH(H1,A2:A50,0))" },
  { lvl: "Hard", q: "C2:C50 me course hai, E2:E50 me fee. \"ADCA\" walon ki fee ka average nikaalein.", a: "=AVERAGEIFS(E2:E50,C2:C50,\"ADCA\")", alt: ["=AVERAGEIF(C2:C50,\"ADCA\",E2:E50)"] },
  { lvl: "Hard", q: "A2 me poora naam hai (jaise 'Rahul Kumar'). Sirf pehla naam nikaalein.", a: "=LEFT(A2,FIND(\" \",A2)-1)" },
  { lvl: "Hard", q: "A2 me email hai. @ se pehle wala hissa (username) nikaalein.", a: "=LEFT(A2,FIND(\"@\",A2)-1)" },
  { lvl: "Hard", q: "B2 me date hai. Us mahine ka aakhri din nikaalein.", a: "=EOMONTH(B2,0)" },
  { lvl: "Hard", q: "A2 se B2 ke beech kitne kaam ke din (Sat-Sun chhod kar) hain?", a: "=NETWORKDAYS(A2,B2)" },
  { lvl: "Hard", q: "D2:D50 me due date hai. Kitni entries ki date aaj se peechhe (overdue) hai?", a: "=COUNTIF(D2:D50,\"<\"&TODAY())" },
  { lvl: "Hard", q: "A2:A50 me batch, B2:B50 me marks hai. \"Morning\" batch ka sabse bada marks nikaalein.", a: "=MAXIFS(B2:B50,A2:A50,\"Morning\")" },
  { lvl: "Hard", q: "H1 me course aur H2 me batch hai. C:C me course, D:D me batch, E:E me fee. Dono shart wali fee ka total.", a: "=SUMIFS(E:E,C:C,H1,D:D,H2)" },
  { lvl: "Hard", q: "B2 me number hai. Wo poora number (bina dashamlav) ho to \"Theek\", warna \"Galat\".", a: "=IF(B2=INT(B2),\"Theek\",\"Galat\")" },
  { lvl: "Hard", q: "A2 me text hai. Usme \"Ara\" shabd hai ya nahi — Haan/Nahi me batayein.", a: "=IF(ISNUMBER(SEARCH(\"Ara\",A2)),\"Haan\",\"Nahi\")" },
  { lvl: "Hard", q: "B2:B50 me amount hai. Sabse upar ke 5 amount ka total nikaalein.", a: "=SUMPRODUCT(LARGE(B2:B50,ROW(1:5)))" },
  { lvl: "Hard", q: "A2 me mobile number 10 ank ka hai ya nahi — \"Sahi\"/\"Galat\" me batayein.", a: "=IF(LEN(A2)=10,\"Sahi\",\"Galat\")" },
  { lvl: "Hard", q: "C2 me loan, C3 me salana byaaj dar, C4 me saal hain. Masik EMI nikaalein.", a: "=PMT(C3/12,C4*12,-C2)" }
];

/* Jawab milane se pehle dono taraf ek jaisa bana lete hain — warna sirf
   space ya single quote ki wajah se sahi jawab galat ho jata. */
export function normalizeFormula(text) {
  return String(text || "")
    .toUpperCase()
    .replace(/[''`]/g, '"')
    .replace(/\s+/g, "")
    .replace(/;/g, ",")
    .replace(/^=?/, "=");
}

export function isCorrect(given, question) {
  const g = normalizeFormula(given);
  if (!g || g === "=") return false;
  const all = [question.a, ...(question.alt || [])].map(normalizeFormula);
  return all.includes(g);
}

export function questionsFor(level) {
  return level === "all" ? EXCEL_QUESTIONS.slice() : EXCEL_QUESTIONS.filter((q) => q.lvl === level);
}
