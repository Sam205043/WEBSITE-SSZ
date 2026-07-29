/* ==========================================================================
   Soft Skill Zone — QR Code Generator
   Uses the offline encoder in js/tools/qrcode.js — no CDN, no external API.
   ========================================================================== */

import { $, el, on, onReady, render } from "../core/dom.js";
import { qrMatrix, drawQR, qrSVG } from "./qrcode.js";
import toast from "../core/toast.js";

let type = "text", lastMatrix = null, lastText = "";

const FIELDS = {
  text: [
    { id: "qText", label: "Text ya link", type: "textarea", placeholder: "https://softskillzone.in ya koi bhi text", value: "https://softskillzone.in" }
  ],
  upi: [
    { id: "qUpi", label: "UPI ID", type: "text", placeholder: "softskillzone@upi" },
    { id: "qName", label: "Naam (payee)", type: "text", placeholder: "Soft Skill Zone" },
    { id: "qAmt", label: "Amount (Rs.) — optional", type: "number", placeholder: "1500" },
    { id: "qNote", label: "Note — optional", type: "text", placeholder: "Course fee" }
  ],
  wifi: [
    { id: "qSsid", label: "WiFi ka naam (SSID)", type: "text", placeholder: "SSZ-Lab" },
    { id: "qPass", label: "Password", type: "text", placeholder: "********" },
    { id: "qEnc", label: "Security", type: "select", options: [["WPA", "WPA/WPA2"], ["WEP", "WEP"], ["nopass", "Koi password nahi"]] }
  ]
};

function paintFields() {
  render($("#qrFields"), FIELDS[type].map((f) => {
    const wrap = el("div", { class: "field" },
      el("label", { class: "field__label", for: f.id }, f.label));
    if (f.type === "textarea") {
      wrap.appendChild(el("textarea", { class: "textarea-ssz", id: f.id, style: { minHeight: "90px" }, placeholder: f.placeholder }));
    } else if (f.type === "select") {
      wrap.appendChild(el("select", { class: "select-ssz", id: f.id },
        ...f.options.map(([v, l]) => el("option", { value: v }, l))));
    } else {
      wrap.appendChild(el("input", { class: "input-ssz", id: f.id, type: f.type, placeholder: f.placeholder }));
    }
    return wrap;
  }));
  if (type === "text") $("#qText").value = "https://softskillzone.in";
  $("#qrFields").querySelectorAll("input, textarea, select").forEach((n) => n.addEventListener("input", build));
  $("#qrFields").querySelectorAll("select").forEach((n) => n.addEventListener("change", build));
}

function payload() {
  if (type === "text") return ($("#qText")?.value || "").trim();

  if (type === "upi") {
    const pa = ($("#qUpi")?.value || "").trim();
    if (!pa) return "";
    const params = [`pa=${encodeURIComponent(pa)}`];
    const pn = ($("#qName")?.value || "").trim();
    const am = ($("#qAmt")?.value || "").trim();
    const tn = ($("#qNote")?.value || "").trim();
    if (pn) params.push(`pn=${encodeURIComponent(pn)}`);
    if (am) params.push(`am=${encodeURIComponent(am)}`);
    if (tn) params.push(`tn=${encodeURIComponent(tn)}`);
    params.push("cu=INR");
    return `upi://pay?${params.join("&")}`;
  }

  const ssid = ($("#qSsid")?.value || "").trim();
  if (!ssid) return "";
  const enc = $("#qEnc")?.value || "WPA";
  const pass = ($("#qPass")?.value || "").trim();
  const escape = (s) => s.replace(/([\;,:"])/g, "\\$1");
  return enc === "nopass"
    ? `WIFI:T:nopass;S:${escape(ssid)};;`
    : `WIFI:T:${enc};S:${escape(ssid)};P:${escape(pass)};;`;
}

function build() {
  const text = payload();
  const box = $("#qrBox");

  if (!text) {
    render(box, el("p", { style: { color: "var(--text-muted)", fontSize: ".88rem", textAlign: "center" } },
      "Upar details bharein — QR yahan turant ban jaayega."));
    $("#qrMeta").textContent = "";
    lastMatrix = null;
    return;
  }

  try {
    const ec = $("#qrEc").value;
    const scale = Number($("#qrSize").value);
    const matrix = qrMatrix(text, ec);
    const canvas = el("canvas", { id: "qrCanvas", "aria-label": "QR code" });
    drawQR(canvas, matrix, { scale, margin: 4 });
    render(box, canvas);
    lastMatrix = matrix;
    lastText = text;
    $("#qrMeta").textContent = `Version ${matrix.version} · ${matrix.length}×${matrix.length} modules · ${text.length} characters · EC ${ec}`;
  } catch (err) {
    render(box, el("p", { style: { color: "var(--danger)", fontSize: ".88rem", textAlign: "center" } }, err.message));
    $("#qrMeta").textContent = "";
    lastMatrix = null;
  }
}

function download(href, filename) {
  const a = el("a", { href, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
}

onReady(() => {
  paintFields();
  build();

  on($("#qrType"), "click", "button", (e, btn) => {
    type = btn.dataset.type;
    $("#qrType").querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
    paintFields();
    build();
  });

  $("#qrEc").addEventListener("change", build);
  $("#qrSize").addEventListener("change", build);

  $("#qrDownload").addEventListener("click", () => {
    const canvas = $("#qrCanvas");
    if (!canvas) return toast.warning("Pehle QR banayein.");
    download(canvas.toDataURL("image/png"), "ssz-qr-code.png");
    toast.success("PNG download ho gaya.");
  });

  $("#qrSvg").addEventListener("click", () => {
    if (!lastMatrix) return toast.warning("Pehle QR banayein.");
    const svg = qrSVG(lastMatrix, { margin: 4 });
    download(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, "ssz-qr-code.svg");
    toast.success("SVG download ho gaya — print ke liye best.");
  });

  $("#qrPrint").addEventListener("click", () => {
    if (!lastMatrix) return toast.warning("Pehle QR banayein.");
    const w = window.open("", "_blank", "width=600,height=700");
    w.document.write(`<html><head><title>QR Code</title></head>
      <body style="font-family:Arial,sans-serif;text-align:center;margin:40px">
      <div style="width:280px;margin:0 auto">${qrSVG(lastMatrix, { margin: 4 })}</div>
      <p style="font-size:12px;color:#555;word-break:break-all;margin-top:16px">${lastText.replace(/[<>&]/g, "")}</p>
      </body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  });
});
