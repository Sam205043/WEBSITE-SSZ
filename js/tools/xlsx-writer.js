/* ==========================================================================
   Soft Skill Zone — Asli .xlsx file banane wala (bina kisi library ke)
   --------------------------------------------------------------------------
   Ek .xlsx darasal ek ZIP hai jiske andar kuchh XML files hoti hain. Isliye
   yahan do cheezein likhi hain: ek chhota ZIP writer, aur Excel ka zaroori
   XML dhaancha.

   Library kyun nahi li: SheetJS jaisi file ~120 KB (gzip) ki hoti hai. Sirf
   data-file banane ke liye itna bojh har us student par daalna, jo 4G par
   page khol raha hai, theek nahi lagta. Yahan ka poora code 6 KB se kam hai
   aur bilkul wahi kaam karta hai.

   ZIP me compression nahi kiya gaya (method 0 = "store"). Deflate likhne ka
   matlab hota ek aur poora algorithm; file thodi badi rehti hai par Excel,
   WPS, Google Sheets — teeno bina shikayat kholte hain. (Verify kiya gaya
   hai, maana nahi gaya.)

   CSV ki jagah .xlsx isliye: "Ara, Bihar" me comma hai. CSV me aisa har
   khaana quote maangta hai, aur Indian Windows par Excel kabhi-kabhi
   semicolon wala CSV maangta hai — student ka data ek hi column me chipak
   jaata hai. .xlsx me ye dikkat hai hi nahi.
   ========================================================================== */

/* ==========================================================================
   CRC32 — ZIP ko har file ka checksum chahiye
   ========================================================================== */
let CRC_TABLE = null;
function crcTable() {
  if (CRC_TABLE) return CRC_TABLE;
  CRC_TABLE = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    CRC_TABLE[n] = c >>> 0;
  }
  return CRC_TABLE;
}

function crc32(bytes) {
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ==========================================================================
   Chhota ZIP writer (store, bina compression)
   ========================================================================== */
const enc = new TextEncoder();

function dosDateTime(d) {
  /* ZIP 1980 se pehle ki date nahi rakh sakta, aur seconds 2-2 ke jodon me
     rakhta hai — isliye ye adla-badli. */
  const year = Math.max(1980, d.getFullYear());
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

function zip(files, when = new Date()) {
  const { time, date } = dosDateTime(when);
  const chunks = [];
  const central = [];
  let offset = 0;

  files.forEach(({ name, text }) => {
    const nameBytes = enc.encode(name);
    const data = enc.encode(text);
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);   // local file header signature
    lv.setUint16(4, 20, true);           // version needed
    lv.setUint16(6, 0, true);            // flags
    lv.setUint16(8, 0, true);            // method 0 = store
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true); // compressed size
    lv.setUint32(22, data.length, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);           // extra field length
    local.set(nameBytes, 30);

    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);   // central directory signature
    cv.setUint16(4, 20, true);           // version made by
    cv.setUint16(6, 20, true);           // version needed
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);           // extra
    cv.setUint16(32, 0, true);           // comment
    cv.setUint16(34, 0, true);           // disk number
    cv.setUint16(36, 0, true);           // internal attrs
    cv.setUint32(38, 0, true);           // external attrs
    cv.setUint32(42, offset, true);      // local header offset
    cd.set(nameBytes, 46);

    chunks.push(local, data);
    central.push(cd);
    offset += local.length + data.length;
  });

  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);     // end of central directory
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);

  return new Blob([...chunks, ...central, end], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

/* ==========================================================================
   XML ke chhote auzaar
   ========================================================================== */
const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  /* Control characters Excel ki XML me allowed nahi — inhe hata dena padta
     hai warna file "corrupt" batati hai. */
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

export function colName(n) {
  let s = "";
  let x = n;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

/* Excel date ko number me rakhta hai: 1899-12-30 se kitne din.
   UTC me naapte hain, warna daylight-saving wale desh me ek din ka fark
   aa jaata hai (India me nahi, par file kahin bhi khul sakti hai). */
export function excelSerial(d) {
  const ms = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((ms - Date.UTC(1899, 11, 30)) / 86400000);
}

/* ==========================================================================
   Ek cell
   value ka roop: number | string | { d: Date } | { f: "SUM(A1:A5)" } | null
   ========================================================================== */
function cellXml(ref, value, header) {
  if (value === null || value === undefined || value === "") return "";
  const style = header ? ' s="2"' : "";

  if (value && typeof value === "object" && value.d instanceof Date) {
    return `<c r="${ref}" s="1"><v>${excelSerial(value.d)}</v></c>`;
  }
  if (value && typeof value === "object" && typeof value.f === "string") {
    return `<c r="${ref}"${style}><f>${esc(value.f)}</f></c>`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"${style}><v>${value}</v></c>`;
  }
  /* inlineStr istemaal karte hain — isse sharedStrings.xml ki poori file
     bachi rehti hai aur code aadha ho jaata hai. */
  return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
}

function sheetXml(sheet) {
  const rows = sheet.rows || [];
  const widths = sheet.widths || [];

  const cols = widths.length
    ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`
    : "";

  /* Pehli row jam kar rakhna (freeze) — 600 row wali sheet me heading
     dikhti rahe, warna student ko pata hi nahi chalta kaunsa column kya hai. */
  const freeze = sheet.freezeHeader === false ? "" :
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';

  const body = rows.map((cells, r) => {
    const rn = r + 1;
    const xml = cells.map((v, c) => cellXml(`${colName(c + 1)}${rn}`, v, r === 0 && sheet.boldHeader !== false)).join("");
    return `<row r="${rn}">${xml}</row>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${freeze}${cols}<sheetData>${body}</sheetData></worksheet>`;
}

/* Sirf utne hi style jitne chahiye: 0 = saada, 1 = date, 2 = heading (bold) */
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd-mm-yyyy"/></numFmts>
<fonts count="2">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF4F46E5"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/* ==========================================================================
   Poori workbook
   sheets: [{ name, rows: [[...]], widths?: [] }]
   ========================================================================== */
export function buildXlsx(sheets) {
  const list = (Array.isArray(sheets) ? sheets : [sheets]).slice(0, 20);
  if (!list.length) throw new Error("Kam se kam ek sheet chahiye.");

  /* Excel sheet ke naam par sakht hai: 31 akshar tak, aur : \ / ? * [ ]
     bilkul nahi. Ye saaf na karein to file "repair" maangti hai. */
  const safeName = (n, i) =>
    (String(n || `Sheet${i + 1}`).replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31)) || `Sheet${i + 1}`;

  const names = list.map((s, i) => safeName(s.name, i));

  const files = [
    {
      name: "[Content_Types].xml",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${list.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n")}
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`
    },
    {
      name: "_rels/.rels",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    },
    {
      name: "xl/workbook.xml",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>
</workbook>`
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${list.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("\n")}
<Relationship Id="rId${list.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    },
    { name: "xl/styles.xml", text: STYLES },
    ...list.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, text: sheetXml(s) }))
  ];

  return zip(files);
}

/* ==========================================================================
   CSV — jinke paas Excel nahi, unke liye
   ========================================================================== */
export function buildCsv(rows) {
  const cell = (v) => {
    if (v === null || v === undefined) return "";
    if (v && typeof v === "object" && v.d instanceof Date) {
      const d = v.d;
      return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
    }
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  /* ﻿ (BOM) zaroori hai — iske bina Excel Hindi/naam wale akshar
     tedhe-medhe dikhata hai. */
  return new Blob(["﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" });
}

/* Blob ko download karana */
export function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* URL turant chhodne par kuchh browser download beech me hi rok dete
     hain — isliye thoda ruk kar. */
  setTimeout(() => URL.revokeObjectURL(href), 4000);
}
