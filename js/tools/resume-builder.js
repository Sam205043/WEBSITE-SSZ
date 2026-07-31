/* ==========================================================================
   Soft Skill Zone — Resume Builder
   Draft stays in localStorage; nothing leaves the browser.
   ========================================================================== */

import { $, $$, onReady } from "../core/dom.js";
import { store, debounce } from "../core/utils.js";
import { LS_KEYS } from "../core/constants.js";
import toast from "../core/toast.js";

const FIELDS = ["name", "title", "phone", "email", "city", "about", "education", "skills",
                "projects", "experience", "certificates", "languages"];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const lines = (s) => String(s ?? "").split("\n").map((x) => x.trim()).filter(Boolean);

const SAMPLE = {
  name: "Rahul Kumar",
  title: "Computer Operator / Accounts Assistant",
  phone: "98765 43210",
  email: "rahul.kumar@email.com",
  city: "Ara, Bihar",
  about: "Computer aur accounts ka practical anubhav rakhne wala mehnati candidate. MS Office aur Tally Prime me comfortable, naya seekhne ke liye hamesha taiyaar.",
  education: "B.Com — Veer Kunwar Singh University — 2025\n12th (Commerce) — BSEB — 2022\nAI Powered DCA — Soft Skill Zone Institute — 2024",
  skills: "MS Word, MS Excel, Tally Prime, GST Return Filing, Hindi & English Typing, ChatGPT for office work",
  /* Projects DCA/ADCA wale students ke liye sabse kaam ki cheez hai — jinke
     paas naukri ka tajurba nahi hota, unke paas dikhane ko yahi hota hai. */
  projects: "Dukaan ka billing system — Excel me formula aur VLOOKUP se banaya\nSchool ka result sheet — marks se grade aur division apne aap nikalta hai\nShaadi ka invitation card — MS Word me design karke print kiya",
  experience: "Accounts Assistant — Sharma Traders, Ara — 2024 se abhi tak\nData Entry Operator — CSC Centre, Ara — 2023",
  certificates: "AI Powered DCA — Soft Skill Zone Institute\nTyping Proficiency (30 WPM English, 25 WPM Hindi)",
  languages: "Hindi, English, Bhojpuri"
};

function read() {
  const data = {};
  FIELDS.forEach((f) => { data[f] = $(`[data-r="${f}"]`)?.value || ""; });
  return data;
}

function section(title, inner) {
  if (!inner) return "";
  return `<div style="margin-top:14px">
    <p style="margin:0 0 6px;font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4f46e5;border-bottom:1px solid #e2e8f0;padding-bottom:3px">${title}</p>
    ${inner}</div>`;
}

const bullets = (arr) => arr.length
  ? `<ul style="margin:0;padding-left:18px">${arr.map((x) => `<li style="margin-bottom:3px">${esc(x)}</li>`).join("")}</ul>` : "";

function paint() {
  const d = read();
  const skills = d.skills.split(",").map((s) => s.trim()).filter(Boolean);

  $("#resSheet").innerHTML = `
  <div class="sheet" id="resPrintArea" style="font-size:.82rem;line-height:1.55">
    <div style="border-bottom:2px solid #4f46e5;padding-bottom:10px;margin-bottom:4px">
      <h2 style="margin:0;font-size:1.35rem;letter-spacing:-.02em">${esc(d.name) || "Aapka Naam"}</h2>
      ${d.title ? `<p style="margin:2px 0 0;color:#4f46e5;font-weight:600;font-size:.85rem">${esc(d.title)}</p>` : ""}
      <p style="margin:6px 0 0;font-size:.76rem;color:#555">
        ${[d.phone, d.email, d.city].filter(Boolean).map(esc).join(" &nbsp;·&nbsp; ") || "Contact details"}
      </p>
    </div>
    ${section("Objective", d.about ? `<p style="margin:0">${esc(d.about)}</p>` : "")}
    ${section("Education", bullets(lines(d.education)))}
    ${section("Skills", skills.length
      ? `<p style="margin:0">${skills.map((s) => `<span style="display:inline-block;background:#eef2ff;color:#312e81;padding:2px 8px;border-radius:10px;margin:0 4px 4px 0;font-size:.74rem">${esc(s)}</span>`).join("")}</p>` : "")}
    ${section("Projects", bullets(lines(d.projects)))}
    ${section("Experience", bullets(lines(d.experience)))}
    ${section("Certificates", bullets(lines(d.certificates)))}
    ${section("Languages", d.languages ? `<p style="margin:0">${esc(d.languages)}</p>` : "")}
    <p style="margin-top:22px;font-size:.68rem;color:#5b6675;text-align:center">
      Made with the free Resume Builder at Soft Skill Zone Institute
    </p>
  </div>`;
}

const save = debounce(() => store.set(LS_KEYS.RESUME_DRAFT, read()), 500);

function fill(data) {
  FIELDS.forEach((f) => { const node = $(`[data-r="${f}"]`); if (node) node.value = data[f] || ""; });
  paint();
}

onReady(() => {
  const draft = store.get(LS_KEYS.RESUME_DRAFT);
  if (draft) { fill(draft); toast.info("Aapka pichhla resume draft load kar diya gaya."); }
  else paint();

  $$("[data-r]").forEach((node) => node.addEventListener("input", () => { paint(); save(); }));

  $("#resSample").addEventListener("click", () => { fill(SAMPLE); save(); toast.success("Sample bhar diya — ab apne hisaab se badal lein."); });

  $("#resClear").addEventListener("click", () => {
    FIELDS.forEach((f) => { const n = $(`[data-r="${f}"]`); if (n) n.value = ""; });
    store.remove(LS_KEYS.RESUME_DRAFT);
    paint();
  });

  $("#resPrint").addEventListener("click", () => {
    const w = window.open("", "_blank", "width=850,height=1050");
    w.document.write(`<html><head><title>${read().name || "Resume"}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;margin:26px;color:#0f172a;font-size:13px;line-height:1.55}
      ul{margin:0;padding-left:18px} h2{margin:0}</style></head>
      <body>${$("#resPrintArea").innerHTML}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  });
});
