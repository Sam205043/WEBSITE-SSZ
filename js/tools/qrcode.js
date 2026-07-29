/* ==========================================================================
   Soft Skill Zone — Minimal QR Code encoder (byte mode, versions 1–10)
   --------------------------------------------------------------------------
   Written from scratch so the QR tool works completely offline — no CDN,
   no third-party script, no external API. Supports EC levels L/M/Q/H and
   automatic version selection.

     const m = qrMatrix("https://example.com", "M");  // -> boolean[][]
     drawQR(canvas, m, { scale: 8, margin: 4 });

   Reference: ISO/IEC 18004 (QR Code model 2).
   ========================================================================== */

/* ---------------- Reed–Solomon over GF(256), primitive poly 0x11D ---------------- */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const gfMul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

/** Generator polynomial for `degree` error-correction codewords. */
function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      // coefficients are highest-degree-first: multiplying by x keeps the
      // index, multiplying by the constant alpha^i shifts it one place down
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecLen) {
  const gen = rsGenerator(ecLen);
  const res = new Array(ecLen).fill(0);
  for (const byte of data) {
    const factor = byte ^ res[0];
    res.shift();
    res.push(0);
    for (let i = 0; i < ecLen; i++) res[i] ^= gfMul(gen[i + 1], factor);
  }
  return res;
}

/* ---------------- Version tables (1–10) ---------------- */
/* [ecCodewordsPerBlock, blocksGroup1, dataPerBlock1, blocksGroup2, dataPerBlock2] */
const EC_TABLE = {
  1:  { L: [7, 1, 19, 0, 0],   M: [10, 1, 16, 0, 0],  Q: [13, 1, 13, 0, 0],  H: [17, 1, 9, 0, 0] },
  2:  { L: [10, 1, 34, 0, 0],  M: [16, 1, 28, 0, 0],  Q: [22, 1, 22, 0, 0],  H: [28, 1, 16, 0, 0] },
  3:  { L: [15, 1, 55, 0, 0],  M: [26, 1, 44, 0, 0],  Q: [18, 2, 17, 0, 0],  H: [22, 2, 13, 0, 0] },
  4:  { L: [20, 1, 80, 0, 0],  M: [18, 2, 32, 0, 0],  Q: [26, 2, 24, 0, 0],  H: [16, 4, 9, 0, 0] },
  5:  { L: [26, 1, 108, 0, 0], M: [24, 2, 43, 0, 0],  Q: [18, 2, 15, 2, 16], H: [22, 2, 11, 2, 12] },
  6:  { L: [18, 2, 68, 0, 0],  M: [16, 4, 27, 0, 0],  Q: [24, 4, 19, 0, 0],  H: [28, 4, 15, 0, 0] },
  7:  { L: [20, 2, 78, 0, 0],  M: [18, 4, 31, 0, 0],  Q: [18, 2, 14, 4, 15], H: [26, 4, 13, 1, 14] },
  8:  { L: [24, 2, 97, 0, 0],  M: [22, 2, 38, 2, 39], Q: [22, 4, 18, 2, 19], H: [26, 4, 14, 2, 15] },
  9:  { L: [30, 2, 116, 0, 0], M: [22, 3, 36, 2, 37], Q: [20, 4, 16, 4, 17], H: [24, 4, 12, 4, 13] },
  10: { L: [18, 2, 68, 2, 69], M: [26, 4, 43, 1, 44], Q: [24, 6, 19, 2, 20], H: [28, 6, 15, 2, 16] }
};

const ALIGN = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
};

const VERSION_INFO = { 7: 0x07c94, 8: 0x085bc, 9: 0x09a99, 10: 0x0a4d3 };
const EC_BITS = { L: 1, M: 0, Q: 3, H: 2 };

const dataCapacity = (ver, ec) => {
  const [, b1, d1, b2, d2] = EC_TABLE[ver][ec];
  return b1 * d1 + b2 * d2;
};

/* ---------------- Bit buffer ---------------- */
class Bits {
  constructor() { this.bits = []; }
  put(value, length) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
  get length() { return this.bits.length; }
  toBytes() {
    const out = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) byte = (byte << 1) | (this.bits[i + j] || 0);
      out.push(byte);
    }
    return out;
  }
}

/* ---------------- Encoding ---------------- */
function utf8Bytes(text) {
  return Array.from(new TextEncoder().encode(text));
}

function buildCodewords(bytes, ver, ec) {
  const capacity = dataCapacity(ver, ec);
  const bits = new Bits();

  bits.put(0b0100, 4);                       // byte mode
  bits.put(bytes.length, ver < 10 ? 8 : 16); // char count indicator
  bytes.forEach((b) => bits.put(b, 8));

  // terminator + byte alignment
  const totalBits = capacity * 8;
  for (let i = 0; i < 4 && bits.length < totalBits; i++) bits.bits.push(0);
  while (bits.length % 8 !== 0) bits.bits.push(0);

  const data = bits.toBytes();
  const PAD = [0xec, 0x11];
  let p = 0;
  while (data.length < capacity) data.push(PAD[p++ % 2]);

  /* split into blocks, compute EC, interleave */
  const [ecLen, b1, d1, b2, d2] = EC_TABLE[ver][ec];
  const blocks = [];
  let offset = 0;
  for (let i = 0; i < b1; i++) { blocks.push(data.slice(offset, offset + d1)); offset += d1; }
  for (let i = 0; i < b2; i++) { blocks.push(data.slice(offset, offset + d2)); offset += d2; }

  const ecBlocks = blocks.map((blk) => rsEncode(blk, ecLen));

  const result = [];
  const maxData = Math.max(d1, d2);
  for (let i = 0; i < maxData; i++) {
    for (const blk of blocks) if (i < blk.length) result.push(blk[i]);
  }
  for (let i = 0; i < ecLen; i++) {
    for (const blk of ecBlocks) result.push(blk[i]);
  }
  return result;
}

/* ---------------- Matrix construction ---------------- */
function emptyMatrix(size) {
  return Array.from({ length: size }, () => new Array(size).fill(null));
}

function placeFinder(m, r, c) {
  for (let i = -1; i <= 7; i++) {
    for (let j = -1; j <= 7; j++) {
      const rr = r + i, cc = c + j;
      if (rr < 0 || cc < 0 || rr >= m.length || cc >= m.length) continue;
      const inRing = (i >= 0 && i <= 6 && (j === 0 || j === 6)) ||
                     (j >= 0 && j <= 6 && (i === 0 || i === 6));
      const inCore = i >= 2 && i <= 4 && j >= 2 && j <= 4;
      m[rr][cc] = inRing || inCore;
    }
  }
}

function placeAlignment(m, ver) {
  const centers = ALIGN[ver];
  for (const r of centers) {
    for (const c of centers) {
      // skip the three finder corners
      if ((r <= 8 && c <= 8) || (r <= 8 && c >= m.length - 9) || (r >= m.length - 9 && c <= 8)) continue;
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          m[r + i][c + j] = Math.max(Math.abs(i), Math.abs(j)) !== 1;
        }
      }
    }
  }
}

function placeTiming(m) {
  for (let i = 8; i < m.length - 8; i++) {
    if (m[6][i] === null) m[6][i] = i % 2 === 0;
    if (m[i][6] === null) m[i][6] = i % 2 === 0;
  }
}

function reserveFormat(m) {
  const size = m.length;
  for (let i = 0; i < 9; i++) {
    if (m[8][i] === null) m[8][i] = false;
    if (m[i][8] === null) m[i][8] = false;
  }
  for (let i = 0; i < 8; i++) {
    if (m[8][size - 1 - i] === null) m[8][size - 1 - i] = false;
    if (m[size - 1 - i][8] === null) m[size - 1 - i][8] = false;
  }
  m[size - 8][8] = true;   // dark module
}

function placeVersion(m, ver) {
  if (ver < 7) return;
  const bits = VERSION_INFO[ver];
  const size = m.length;
  for (let i = 0; i < 18; i++) {
    const bit = ((bits >> i) & 1) === 1;
    const r = Math.floor(i / 3);
    const c = i % 3;
    m[r][size - 11 + c] = bit;
    m[size - 11 + c][r] = bit;
  }
}

function placeData(m, codewords) {
  const size = m.length;
  let bitIndex = 0;
  const totalBits = codewords.length * 8;
  let upward = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5;   // skip vertical timing column
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const col = right - j;
        const row = upward ? size - 1 - vert : vert;
        if (m[row][col] !== null) continue;
        let bit = false;
        if (bitIndex < totalBits) {
          bit = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) === 1;
        }
        m[row][col] = bit;
        bitIndex++;
      }
    }
    upward = !upward;
  }
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
];

function isFunction(ver, size, r, c) {
  if (r === 6 || c === 6) return true;                                  // timing
  if (r < 9 && c < 9) return true;                                      // TL finder + format
  if (r < 9 && c >= size - 8) return true;                              // TR
  if (r >= size - 8 && c < 9) return true;                              // BL
  if (ver >= 7 && ((r < 6 && c >= size - 11) || (c < 6 && r >= size - 11))) return true;
  for (const ar of ALIGN[ver]) {
    for (const ac of ALIGN[ver]) {
      if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= size - 9) || (ar >= size - 9 && ac <= 8)) continue;
      if (Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2) return true;
    }
  }
  return false;
}

function applyMask(matrix, ver, maskId) {
  const size = matrix.length;
  const out = matrix.map((row) => row.slice());
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isFunction(ver, size, r, c)) continue;
      if (MASKS[maskId](r, c)) out[r][c] = !out[r][c];
    }
  }
  return out;
}

function placeFormat(m, ec, maskId) {
  const size = m.length;
  const data = (EC_BITS[ec] << 3) | maskId;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ (((rem >>> 9) & 1) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;

  /* Format bits are placed MSB-first: the first position takes bit 14. */
  const get = (i) => ((bits >>> (14 - i)) & 1) === 1;

  for (let i = 0; i <= 5; i++) m[8][i] = get(i);
  m[8][7] = get(6);
  m[8][8] = get(7);
  m[7][8] = get(8);
  for (let i = 9; i <= 14; i++) m[14 - i][8] = get(i);

  /* Second copy: 7 modules up the left column, 8 across the top-right row.
     Bit 7 starts the horizontal run — the (size-8, 8) cell is the dark module,
     not a format bit. */
  for (let i = 0; i <= 6; i++) m[size - 1 - i][8] = get(i);
  for (let i = 7; i <= 14; i++) m[8][size - 15 + i] = get(i);

  m[size - 8][8] = true;   // dark module
}

/* ---------------- Mask penalty ---------------- */
function penalty(m) {
  const size = m.length;
  let score = 0;

  const runScore = (line) => {
    let s = 0, run = 1;
    for (let i = 1; i < line.length; i++) {
      if (line[i] === line[i - 1]) run++;
      else { if (run >= 5) s += 3 + (run - 5); run = 1; }
    }
    if (run >= 5) s += 3 + (run - 5);
    return s;
  };

  for (let r = 0; r < size; r++) score += runScore(m[r]);
  for (let c = 0; c < size; c++) score += runScore(m.map((row) => row[c]));

  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
    }
  }

  const PATTERN = [true, false, true, true, true, false, true, false, false, false, false];
  const hasPattern = (line, i) => PATTERN.every((p, k) => line[i + k] === p);
  for (let r = 0; r < size; r++) {
    const row = m[r];
    const col = m.map((x) => x[r]);
    for (let i = 0; i + 11 <= size; i++) {
      if (hasPattern(row, i)) score += 40;
      if (hasPattern(col, i)) score += 40;
    }
  }

  const dark = m.flat().filter(Boolean).length;
  const pct = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(pct - 50) / 5) * 10;

  return score;
}

/* ==========================================================================
   Public API
   ========================================================================== */

/**
 * @param {string} text
 * @param {"L"|"M"|"Q"|"H"} ec
 * @returns {boolean[][]} matrix, true = dark module
 */
export function qrMatrix(text, ec = "M", forceMask = null) {
  if (!text) throw new Error("QR banane ke liye kuch text chahiye.");
  if (!EC_BITS.hasOwnProperty(ec)) ec = "M";

  const bytes = utf8Bytes(text);

  let ver = 0;
  for (let v = 1; v <= 10; v++) {
    const headerBits = 4 + (v < 10 ? 8 : 16);
    if (bytes.length * 8 + headerBits <= dataCapacity(v, ec) * 8) { ver = v; break; }
  }
  if (!ver) throw new Error("Text bahut lamba hai — thoda chhota karein (ya error correction 'L' chunein).");

  const size = ver * 4 + 17;
  const base = emptyMatrix(size);

  placeFinder(base, 0, 0);
  placeFinder(base, 0, size - 7);
  placeFinder(base, size - 7, 0);
  placeAlignment(base, ver);
  placeTiming(base);
  reserveFormat(base);
  placeVersion(base, ver);
  placeData(base, buildCodewords(bytes, ver, ec));

  let best = null, bestScore = Infinity, bestMask = 0;
  const masks = forceMask === null ? [0, 1, 2, 3, 4, 5, 6, 7] : [forceMask];
  for (const mask of masks) {
    const candidate = applyMask(base, ver, mask);
    placeFormat(candidate, ec, mask);
    const s = penalty(candidate);
    if (s < bestScore) { bestScore = s; best = candidate; bestMask = mask; }
  }

  best.version = ver;
  best.mask = bestMask;
  return best;
}

/**
 * Draw a matrix onto a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {boolean[][]} matrix
 */
export function drawQR(canvas, matrix, { scale = 8, margin = 4, dark = "#0f172a", light = "#ffffff" } = {}) {
  const size = matrix.length;
  const px = (size + margin * 2) * scale;
  canvas.width = px;
  canvas.height = px;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = dark;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
    }
  }
  return canvas;
}

/** Matrix -> standalone SVG string (crisp at any size, good for printing). */
export function qrSVG(matrix, { margin = 4, dark = "#0f172a", light = "#ffffff" } = {}) {
  const size = matrix.length;
  const total = size + margin * 2;
  let path = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) path += `M${c + margin} ${r + margin}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="${light}"/>` +
    `<path d="${path}" fill="${dark}"/></svg>`;
}
