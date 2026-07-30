/* ==========================================================================
   Soft Skill Zone — Per-student watermark
   --------------------------------------------------------------------------
   Study material can always be forwarded once a student has it. What this
   does is make a forwarded copy traceable: the PDF is stamped, in the
   browser, with the name and Student ID of whoever downloaded it before it
   ever reaches their disk. Nobody gets a clean file, so a leaked file points
   back at one person.

   It is deterrence, not a lock. A determined student can crop the stamp or
   photograph the screen — no website can stop that. Accountability is the
   realistic goal.

   The stamping happens entirely on the student's device (pdf-lib from the
   CDN). Nothing is uploaded, no server is involved.
   ========================================================================== */

/* jsDelivr — the same CDN the rest of the site already uses, so the
   connection is usually warm by the time a student clicks Download. */
const PDFLIB_SRC = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";

let libPromise = null;

/** Load pdf-lib once, from the CDN, and hand back its namespace. */
function loadPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  if (!libPromise) {
    libPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = PDFLIB_SRC;
      s.async = true;
      s.onload = () => (window.PDFLib
        ? resolve(window.PDFLib)
        : reject(new Error("PDF tool load nahi hua.")));
      s.onerror = () => {
        libPromise = null;
        reject(new Error("PDF tool load nahi hua — internet check karein."));
      };
      document.head.appendChild(s);
    });
  }
  return libPromise;
}

/* The built-in PDF fonts only speak WinAnsi. A name typed in Devanagari (or
   with an unusual character) would make pdf-lib throw and cost the student
   their watermark, so anything unencodable is dropped here instead. */
function winAnsiSafe(text) {
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, "").replace(/\s+/g, " ").trim();
}

/** "Rahul Kumar · SSZ2026DCA0007" — what gets printed on every page. */
export function stampLabel(student, user) {
  const raw = (student?.fullName || user?.displayName || user?.email || "").trim();
  const sid = student?.studentId || student?.id || "";
  const name = winAnsiSafe(raw);
  if (name && sid) return `${name} · ${sid}`;
  return name || sid || "Soft Skill Zone student";
}

/** Only PDFs can be stamped; everything else opens as before. */
export function canWatermark(file) {
  return /pdf/i.test(file?.fileType || "") || /\.pdf$/i.test(file?.fileName || "");
}

/* Let the browser paint between chunks — a 400-page book would otherwise
   freeze the tab on a mid-range phone. */
const breathe = () => new Promise((r) => setTimeout(r, 0));

/** Download with progress, so an 8 MB book on mobile data does not look dead. */
async function fetchBytes(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("File download nahi ho payi.");

  const total = Number(res.headers.get("content-length")) || 0;
  if (!res.body || !total) return new Uint8Array(await res.arrayBuffer());

  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(Math.round((received / total) * 100));
  }
  const bytes = new Uint8Array(received);
  let at = 0;
  for (const c of chunks) { bytes.set(c, at); at += c.length; }
  return bytes;
}

function saveBlob(bytes, fileName) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** "MS Office Book.pdf" + "SSZ2026DCA0007" -> "MS Office Book - SSZ2026DCA0007.pdf" */
function personalName(fileName, label) {
  const id = (label.split("·").pop() || "").trim().replace(/[^\w-]/g, "");
  const base = (fileName || "study-material.pdf").replace(/\.pdf$/i, "");
  return id ? `${base} - ${id}.pdf` : `${base}.pdf`;
}

/**
 * Fetch a PDF, stamp the student's identity on every page, and save it.
 *
 * @param {string}   url        fresh download URL (see storage-service.urlForPath)
 * @param {string}   fileName   original file name
 * @param {string}   label      stampLabel(student, user)
 * @param {Function} [onProgress] (pct, message) — for a button/label
 */
export async function downloadWatermarked(url, fileName, label, onProgress = () => {}) {
  onProgress(0, "File aa rahi hai");
  const bytes = await fetchBytes(url, (pct) => onProgress(pct, "File aa rahi hai"));

  onProgress(0, "Watermark lag raha hai");
  const { PDFDocument, StandardFonts, rgb, degrees } = await loadPdfLib();

  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const diagonalText = `${label}`;
  const footText = `Soft Skill Zone Institute, Ara · ${label} ke liye jaari · sirf personal study ke liye`;

  const pages = pdf.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    /* One diagonal line across the middle, sized to cover ~70% of the page
       diagonal so it cannot be cropped away without losing the text. */
    const diagonal = Math.sqrt(width * width + height * height);
    const target = diagonal * 0.7;
    const oneEm = font.widthOfTextAtSize(diagonalText, 100) / 100;
    const size = Math.max(10, Math.min(46, target / oneEm));
    const drawn = oneEm * size;
    const k = Math.SQRT1_2; // cos 45° = sin 45°

    /* Sat a little below centre: the book already carries the institute's
       own diagonal watermark, and two lines stacked exactly on top of each
       other read as a smudge. */
    page.drawText(diagonalText, {
      x: width / 2 - (drawn / 2) * k,
      y: height * 0.38 - (drawn / 2) * k,
      size,
      font,
      color: rgb(0.45, 0.45, 0.5),
      opacity: 0.16,
      rotate: degrees(45)
    });

    /* A small readable line at the very bottom — this is the part that
       survives a screenshot of a single page. */
    page.drawText(footText, {
      x: 24,
      y: 10,
      size: 6.5,
      font,
      color: rgb(0.35, 0.35, 0.4),
      opacity: 0.75
    });

    if (i % 20 === 0) {
      onProgress(Math.round((i / pages.length) * 100), "Watermark lag raha hai");
      await breathe();
    }
  }

  try {
    pdf.setSubject(`Issued to ${label}`);
    pdf.setProducer("Soft Skill Zone Institute — softskillzone.in");
    pdf.setKeywords([label, "Soft Skill Zone", "softskillzone.in"]);
  } catch { /* metadata is a bonus, never a blocker */ }

  onProgress(100, "File ban rahi hai");
  const out = await pdf.save();
  saveBlob(out, personalName(fileName, label));
}

/**
 * Hand a study-material file to the student: watermarked when it is a PDF,
 * plain otherwise. Drives the button label so a slow phone shows progress.
 *
 * If stamping fails (CDN blocked, odd PDF, low memory) the file still opens
 * — unstamped, and the student is told. Losing the watermark is bad;
 * locking a student out of their own book is worse.
 *
 * @param {HTMLButtonElement} btn   the button that was clicked
 * @param {object} file             { fileName, fileType }
 * @param {string} url              fresh download URL
 * @param {object} student          students/{id} record
 * @param {object} user             Firebase Auth user
 */
export async function deliver(btn, file, url, student, user) {
  const toast = (await import("../core/toast.js")).default;

  if (!canWatermark(file) || !student) {
    window.open(url, "_blank", "noopener");
    return;
  }

  const original = btn.innerHTML;
  btn.disabled = true;
  try {
    await downloadWatermarked(
      url,
      file.fileName || "study-material.pdf",
      stampLabel(student, user),
      (pct, msg) => { btn.textContent = `${msg}… ${pct}%`; }
    );
    toast.success("Download ho gaya — is copy par aapka naam aur Student ID chhapa hai.");
  } catch (err) {
    toast.error(`${err.message || "Watermark nahi lag paaya."} File waise hi khul rahi hai.`);
    window.open(url, "_blank", "noopener");
  } finally {
    btn.innerHTML = original;
    btn.disabled = false;
  }
}
