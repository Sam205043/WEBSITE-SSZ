/* ==========================================================================
   Soft Skill Zone — Admin: Gallery
   --------------------------------------------------------------------------
   Institute ki asli photos yahan se chadhti hain aur pages/gallery.html par
   apne aap dikhne lagti hain. Public page pehle se taiyar tha (lightbox,
   category filter) — bas usme daalne ka raasta nahi tha.

   Do baatein jaanbujh kar aise hain:

   1) Har photo ke DO version bante hain — ek chhota thumbnail (grid ke liye)
      aur ek bada (lightbox ke liye). Gallery page `thumbURL || imageURL`
      padhta hai. Bina thumbnail ke, 12 photo wale grid par 12 poori photos
      download hoti — Ara ke 4G par wo page kholna hi sazaa ban jaata.

   2) Compression browser me hoti hai, upload se PEHLE. Aaj ke phone ki photo
      4-8 MB ki hoti hai, aur Storage rule 5 MB par rok deta hai — bina
      compress kiye aadhi photos "file badi hai" keh kar reject hotin.
      Compress karne ke baad wahi photo ~250 KB ki reh jaati hai.
   ========================================================================== */

import { $, el, on, render } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { compressImage } from "../core/files.js";
import { open as openModal, confirm as confirmModal } from "../core/modal.js";
import { initAdminShell } from "./admin-shell.js";
import { DEMO_GALLERY } from "./admin-demo.js";
import { COLLECTIONS, STORAGE_PATHS } from "../core/constants.js";
import { GALLERY_CATEGORIES } from "../config/site-data.js";
import toast from "../core/toast.js";

/* "All" sirf public page ke filter ke liye hai — photo uski category me
   nahi rakhi ja sakti, isliye upload wale select se hata dete hain. */
const CATS = GALLERY_CATEGORIES.filter((c) => c.value !== "all");
const CAT_LABEL = Object.fromEntries(CATS.map((c) => [c.value, c.label]));

/* Bada version: 1600px kaafi hai — isse bada mobile screen par dikhta hi
   nahi, bas data khaata hai. Thumbnail 520px, grid me ek card se bada. */
const FULL = { maxWidth: 1600, maxHeight: 1600, quality: 0.82 };
const THUMB = { maxWidth: 520, maxHeight: 520, quality: 0.7 };

let mode = "preview";
let photos = [];
let filter = "all";

const shown = () => (filter === "all" ? photos : photos.filter((p) => p.category === filter));

/* ==========================================================================
   Filters
   ========================================================================== */
function paintFilters() {
  const counts = { all: photos.length };
  CATS.forEach((c) => { counts[c.value] = photos.filter((p) => p.category === c.value).length; });

  render($("#galFilters"), GALLERY_CATEGORIES.map((c) =>
    el("button", {
      type: "button",
      class: `chip${c.value === filter ? " is-active" : ""}`,
      dataset: { cat: c.value }
    }, `${c.label} (${counts[c.value] || 0})`)
  ));
}

/* ==========================================================================
   Grid
   ========================================================================== */
function card(p, i, list) {
  const media = el("div", {
    style: {
      position: "relative", aspectRatio: "4 / 3", overflow: "hidden",
      background: "var(--bg-surface-2)"
    }
  },
    el("img", {
      src: p.thumbURL || p.imageURL,
      alt: p.title || "Gallery photo",
      loading: "lazy",
      decoding: "async",
      style: { width: "100%", height: "100%", objectFit: "cover", display: "block" }
    }),
    el("span", {
      class: "badge-ssz badge-accent",
      style: { position: "absolute", top: ".5rem", left: ".5rem", fontSize: ".62rem" }
    }, CAT_LABEL[p.category] || p.category || "—")
  );

  const caption = el("p", {
    style: {
      margin: "0 0 .6rem", fontSize: ".82rem", fontWeight: "600",
      color: p.title ? "var(--text-primary)" : "var(--text-muted)"
    }
  }, p.title || "Bina caption ke");

  /* Upar-neeche ke button: public page `order` ke hisaab se sajata hai,
     isliye kram badalne ka koi na koi raasta chahiye hi tha. Pehli photo
     ka "upar" aur aakhri ka "neeche" band rehta hai. */
  const actions = el("div", { style: { display: "flex", gap: ".35rem", flexWrap: "wrap" } },
    el("button", {
      class: "btn-ssz btn-secondary-ssz btn-sm-ssz", type: "button",
      dataset: { up: p.id }, disabled: i === 0, title: "Upar karein",
      "aria-label": "Upar karein"
    },
      /* chevronUp icon set me nahi hai — neeche wale ko ghuma dete hain.
         Ghumana span par hai, button par nahi, warna focus ring bhi ghoom
         jaati hai. */
      el("span", { style: { display: "flex", transform: "rotate(180deg)" }, html: icon("chevronDown", { size: 15 }) })),
    el("button", {
      class: "btn-ssz btn-secondary-ssz btn-sm-ssz", type: "button",
      dataset: { down: p.id }, disabled: i === list.length - 1, title: "Neeche karein",
      "aria-label": "Neeche karein", html: icon("chevronDown", { size: 15 })
    }),
    el("button", { class: "btn-ssz btn-secondary-ssz btn-sm-ssz", type: "button", dataset: { edit: p.id } }, "Badlein"),
    el("button", {
      class: "btn-ssz btn-ghost-ssz btn-sm-ssz", type: "button",
      dataset: { del: p.id }, style: { color: "var(--danger)", marginLeft: "auto" }
    }, "Delete")
  );

  return el("div", { class: "card-ssz" }, media,
    el("div", { class: "card-ssz__body", style: { padding: ".85rem 1rem 1rem" } }, caption, actions));
}

function paintGrid() {
  const list = shown();
  if (!list.length) {
    return render($("#galGrid"),
      el("div", { class: "empty-state", style: { gridColumn: "1/-1" } },
        el("div", { class: "empty-state__icon", html: icon("image", { size: 30 }) }),
        el("h2", {}, photos.length ? "Is category me koi photo nahi" : "Abhi koi photo nahi"),
        el("p", {}, photos.length
          ? "Doosri category dekhein, ya upar se nayi photo chadha dein."
          : "Upar \"Photo chunein\" dabaakar lab, class ya campus ki photos chadha dein — " +
            "website ke Gallery page par apne aap dikhne lagengi.")
      ));
  }
  /* Kram wahi rehta hai jo public page par dikhega — isliye reorder karte
     waqt admin ko andaza lagana nahi padta. */
  render($("#galGrid"), list.map((p, i) => card(p, i, list)));
}

/* ==========================================================================
   Upload
   ========================================================================== */
function setProgress(done, total, pct) {
  const wrap = $("#galProg");
  wrap.hidden = false;
  wrap.querySelector(".progress-ssz__bar").style.width = `${pct}%`;
  $("#galProgText").textContent = `${done} / ${total} photo chadh gayi…`;
}

async function uploadBatch(files) {
  const category = $("#galCat").value;
  const list = [...files].filter((f) => f.type.startsWith("image/"));
  if (!list.length) return toast.error("Sirf photo (JPG, PNG, WEBP) chadha sakte hain.");

  if (mode === "preview") {
    return toast.info("Preview mode: Firebase connect hone ke baad photo chadhegi.");
  }

  $("#galPick").disabled = true;
  $("#galCat").disabled = true;

  const { uploadFile } = await import("../../firebase/storage-service.js");
  const { create } = await import("../../firebase/db-service.js");

  /* Nayi photos sabse aage aati hain, taaki chadhate hi website par dikhein
     aur admin ko har baar upar karna na pade. Batch ka apna kram bhi bana
     rehta hai: pehli chuni hui photo pehle. */
  const minOrder = photos.length ? Math.min(...photos.map((p) => Number(p.order) || 0)) : 0;

  let done = 0;
  const added = [];
  const failed = [];

  for (let i = 0; i < list.length; i++) {
    const file = list[i];
    try {
      /* Do alag compress — dono asli file se bante hain, thumbnail ko bade
         version se dobara compress karne par dhundhla ho jaata. */
      const [big, small] = await Promise.all([
        compressImage(file, FULL),
        compressImage(file, THUMB)
      ]);

      const stamp = `${Date.now()}-${i}`;
      const folder = STORAGE_PATHS.publicGallery();

      const bigUp = await uploadFile(big, folder, {
        kind: "image",
        fileName: `${stamp}.jpg`,
        onProgress: (pct) => setProgress(done, list.length, Math.round(((done + pct / 100) / list.length) * 100))
      });
      const smallUp = await uploadFile(small, folder, { kind: "image", fileName: `${stamp}-thumb.jpg` });

      const doc = {
        title: "",
        category,
        imageURL: bigUp.url,
        imagePath: bigUp.path,
        thumbURL: smallUp.url,
        thumbPath: smallUp.path,
        order: minOrder - (list.length - i),
        sizeBytes: big.size
      };
      doc.id = await create(COLLECTIONS.GALLERY, doc);
      added.push(doc);
    } catch (err) {
      console.warn("[gallery] upload fail:", file.name, err);
      failed.push(file.name);
    }
    done++;
    setProgress(done, list.length, Math.round((done / list.length) * 100));
  }

  $("#galProg").hidden = true;
  $("#galProgText").textContent = "";
  $("#galPick").disabled = false;
  $("#galCat").disabled = false;
  $("#galPick").value = "";

  if (added.length) {
    photos = [...added, ...photos].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    paintFilters();
    paintGrid();
    toast.success(`${added.length} photo chadh gayi. Website ke Gallery page par dikhne lagi.`);
  }
  if (failed.length) {
    toast.error(`${failed.length} photo nahi chadh payi: ${failed.slice(0, 3).join(", ")}`);
  }
}

/* ==========================================================================
   Caption + category badalna
   ========================================================================== */
function editDialog(p) {
  const body = el("div", {});
  body.innerHTML = `
    <div class="field">
      <label class="field__label" for="edTitle">Caption <span style="font-weight:400;color:var(--text-muted)">(marzi ka)</span></label>
      <input class="input-ssz" id="edTitle" type="text" maxlength="80" placeholder="Jaise: Computer lab — DCA batch">
      <p class="field__hint" style="font-size:.76rem;color:var(--text-muted);margin:.3rem 0 0">
        Photo ke neeche website par yahi likha dikhega. Khaali chhod dein to kuchh nahi dikhega.</p>
    </div>
    <div class="field">
      <label class="field__label" for="edCat">Category</label>
      <select class="input-ssz" id="edCat">
        ${CATS.map((c) => `<option value="${c.value}">${c.label}</option>`).join("")}
      </select>
    </div>`;
  body.querySelector("#edTitle").value = p.title || "";
  body.querySelector("#edCat").value = p.category || CATS[0].value;

  const save = el("button", { class: "btn-ssz btn-primary-ssz", type: "button" }, "Save karein");
  const cancel = el("button", { class: "btn-ssz btn-secondary-ssz", type: "button" }, "Cancel");
  const m = openModal({ title: "Photo ki jaankari", body, footer: [cancel, save] });
  cancel.addEventListener("click", () => m.close());

  save.addEventListener("click", async () => {
    const title = body.querySelector("#edTitle").value.trim();
    const category = body.querySelector("#edCat").value;
    save.disabled = true;
    if (mode === "live") {
      try {
        const { update } = await import("../../firebase/db-service.js");
        await update(COLLECTIONS.GALLERY, p.id, { title, category });
      } catch (err) {
        save.disabled = false;
        return toast.error(err.message || "Save nahi ho paya.");
      }
    }
    p.title = title;
    p.category = category;
    m.close();
    paintFilters();
    paintGrid();
    toast.success("Ho gaya.");
  });
}

/* ==========================================================================
   Reorder — do photos ke `order` aapas me badal dete hain
   ========================================================================== */
async function move(id, dir) {
  /* Kram usi list me badalna chahiye jo admin dekh raha hai, warna category
     filter lagi ho to photo kahin aur chali jaati hai. */
  const list = shown();
  const at = list.findIndex((p) => p.id === id);
  const to = at + dir;
  if (at < 0 || to < 0 || to >= list.length) return;

  const a = list[at];
  const b = list[to];
  const aOrder = Number(a.order) || 0;
  const bOrder = Number(b.order) || 0;

  if (mode === "live") {
    try {
      const { update } = await import("../../firebase/db-service.js");
      await Promise.all([
        update(COLLECTIONS.GALLERY, a.id, { order: bOrder }),
        update(COLLECTIONS.GALLERY, b.id, { order: aOrder })
      ]);
    } catch (err) {
      return toast.error(err.message || "Kram nahi badal paya.");
    }
  }
  a.order = bOrder;
  b.order = aOrder;
  photos.sort((x, y) => (Number(x.order) || 0) - (Number(y.order) || 0));
  paintGrid();
}

/* ==========================================================================
   Boot
   ========================================================================== */
const shell = await initAdminShell({ active: "gallery", title: "Gallery" });
mode = shell.mode;

if (mode === "live") {
  const { getMany } = await import("../../firebase/db-service.js");
  photos = await getMany(COLLECTIONS.GALLERY, {
    orderBy: ["order", "asc"], limit: 200, useCache: false
  }).catch(() => []);
} else {
  photos = DEMO_GALLERY.map((p) => ({ ...p }));
}

render($("#galCat"), CATS.map((c) => el("option", { value: c.value }, c.label)));
paintFilters();
paintGrid();

on($("#galFilters"), "click", ".chip", (e, chip) => {
  filter = chip.dataset.cat;
  paintFilters();
  paintGrid();
});

$("#galPick").addEventListener("change", (e) => {
  if (e.target.files && e.target.files.length) uploadBatch(e.target.files);
});

on($("#galGrid"), "click", "[data-edit]", (e, btn) => {
  const p = photos.find((x) => x.id === btn.dataset.edit);
  if (p) editDialog(p);
});

on($("#galGrid"), "click", "[data-up]", (e, btn) => move(btn.dataset.up, -1));
on($("#galGrid"), "click", "[data-down]", (e, btn) => move(btn.dataset.down, 1));

on($("#galGrid"), "click", "[data-del]", async (e, btn) => {
  const p = photos.find((x) => x.id === btn.dataset.del);
  if (!p) return;
  const ok = await confirmModal({
    title: "Photo delete karein?",
    message: "Ye website ke Gallery page se hat jaayegi. Wapas nahi aayegi.",
    danger: true,
    confirmText: "Haan, hata dein"
  });
  if (!ok) return;

  if (mode === "live") {
    try {
      const { remove } = await import("../../firebase/db-service.js");
      await remove(COLLECTIONS.GALLERY, p.id);

      /* Record hatane ke baad dono files bhi hatani padti hain — warna wo
         Storage me padi rehti hain, kisi ko dikhti nahi, par jagah aur bill
         dono khaati hain. File na miley to koi baat nahi: record ja chuka. */
      const { deleteFile } = await import("../../firebase/storage-service.js");
      await Promise.all([p.imagePath, p.thumbPath].filter(Boolean).map((path) =>
        deleteFile(path).catch((err) => console.warn("[gallery] file nahi hati:", path, err))
      ));
    } catch (err) {
      return toast.error(err.message || "Delete nahi ho paya.");
    }
  }
  photos = photos.filter((x) => x.id !== p.id);
  paintFilters();
  paintGrid();
  toast.success("Delete ho gaya.");
});
