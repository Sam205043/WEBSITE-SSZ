/* ==========================================================================
   Soft Skill Zone — File helpers (validation, compression, naming)
   --------------------------------------------------------------------------
   Deliberately Firebase-free: the admission form validates and compresses
   files BEFORE any upload, and must keep working even when the Firebase SDK
   is unreachable (offline, ad-blocker, keys not configured yet).
   storage-service.js re-exports these, so both import paths stay valid.
   ========================================================================== */

import { UPLOAD_LIMITS } from "./constants.js";

/**
 * @param {File} file
 * @param {"image"|"document"|"material"|"any"} kind
 * @returns {{ok:boolean, error?:string}}
 */
export function validateFile(file, kind = "any") {
  if (!file) return { ok: false, error: "Koi file select nahi ki gayi." };

  const rule = UPLOAD_LIMITS[kind] || UPLOAD_LIMITS.any;

  if (file.size > rule.maxBytes) {
    return { ok: false, error: `File bahut badi hai. Maximum ${formatBytes(rule.maxBytes)} allowed hai.` };
  }
  if (file.size === 0) {
    return { ok: false, error: "File khali hai." };
  }
  if (rule.types.length && !rule.types.includes(file.type)) {
    return { ok: false, error: `Yeh format allowed nahi hai. Allowed: ${rule.label}` };
  }
  return { ok: true };
}

export function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Safe, collision-resistant storage file name. */
export function safeFileName(original) {
  const dot = original.lastIndexOf(".");
  const ext = dot > -1 ? original.slice(dot).toLowerCase() : "";
  const base = (dot > -1 ? original.slice(0, dot) : original)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "file";
  return `${base}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${ext}`;
}

/**
 * Client-side image compression — keeps Storage usage low and makes student
 * photos load fast on 3G. Falls back to the original file when compression
 * would not help (or the input is not a bitmap image).
 * @returns {Promise<File>}
 */
export function compressImage(file, { maxWidth = 1280, maxHeight = 1280, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/") || file.type === "image/gif") return resolve(file);

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Image read nahi ho payi."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image load nahi ho payi."));
      img.onload = () => {
        let { width, height } = img;
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) return resolve(file);
            resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now()
            }));
          },
          "image/jpeg",
          quality
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
