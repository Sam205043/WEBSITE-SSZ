#!/usr/bin/env node
/* ==========================================================================
   Soft Skill Zone — set the live site URL everywhere
   --------------------------------------------------------------------------
   canonical tags, og:url, og:image, sitemap.xml and robots.txt sabhi me site
   ka poora URL likha hota hai. Deploy se pehle usse ek baar badalna padta hai.

   Usage (project folder me):
     node tools/set-site-url.mjs https://yourname.github.io/soft-skill-zone

   Custom domain ho to:
     node tools/set-site-url.mjs https://softskillzone.in

   Trailing slash apne aap hat jaata hai. Script ko dobara chalane se koi
   nuksaan nahi — ye purana URL dhoondh kar naya likh deta hai.
   ========================================================================== */

import fs from "node:fs";
import path from "node:path";

/* Site me abhi jo URL likha hai. Script isi ko dhoondh kar naya likhta hai.
   Agar aap URL badal dein to isse bhi update kar dena — warna agli baar
   script ko purana URL nahi milega. */
const DEFAULT_OLD = "https://softskillzone.in";
const EXT = new Set([".html", ".xml", ".txt", ".json", ".md", ".js"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "images"]);

const next = (process.argv[2] || "").replace(/\/+$/, "");
const prev = (process.argv[3] || DEFAULT_OLD).replace(/\/+$/, "");

if (!/^https?:\/\/[^\s/]+/.test(next)) {
  console.error("Usage: node tools/set-site-url.mjs https://your-site-url [old-url]");
  process.exit(1);
}
if (next === prev) {
  console.error("New URL is the same as the old one — nothing to do.");
  process.exit(1);
}

const root = process.cwd();
let files = 0;
let hits = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!EXT.has(path.extname(entry.name))) continue;

    const text = fs.readFileSync(full, "utf8");
    if (!text.includes(prev)) continue;

    const count = text.split(prev).length - 1;
    fs.writeFileSync(full, text.split(prev).join(next), "utf8");
    files += 1;
    hits += count;
    console.log(`  ${path.relative(root, full)} — ${count}`);
  }
}

walk(root);
console.log(`\nDone: ${hits} URLs updated across ${files} files.`);
console.log(`   ${prev}\n-> ${next}`);
if (!files) console.log("Nothing matched — was the URL already changed?");
