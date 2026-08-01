/* ==========================================================================
   Soft Skill Zone — Press ripple
   --------------------------------------------------------------------------
   Har button par ek halki lehar (ripple) jo wahin se uthti hai jahan ungli
   padi. Ye chhoti si cheez hai par ismi se app "zinda" lagta hai — dabaya
   to kuchh hua, sirf rang nahi badla.

   Kyun aise banaya:
   - Ek hi listener poore document par (event delegation). Har button par
     alag listener lagate to admin ke 200-row wale table par 200 listener
     ban jaate.
   - pointerdown par, click par nahi — ungli rakhte hi dikhna chahiye,
     chhodne par nahi. Ara ke 4G phone par ye 100-150ms ka farq mehsoos
     hota hai.
   - Animation poori tarah CSS me (transform + opacity), JS sirf lehar
     rakhta hai. Dono GPU par chalte hain, layout dobara nahi banta.
   - prefers-reduced-motion wale ko kuchh nahi dikhega — chup rehna hi
     sahi hai.

   app.js (public pages) aur dashboard/shell.js (admin + student) dono
   isse import karte hain, isliye har page par kaam karta hai.
   ========================================================================== */

let wired = false;

export function initPress() {
  if (wired) return;
  wired = true;

  /* Jinhone motion kam karne ko kaha hai, unke liye kuchh nahi. Ye check
     ek hi baar hota hai — matchMedia har pointerdown par poochhna faltu
     kaam hai. */
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (calm.matches) return;

  document.addEventListener("pointerdown", (e) => {
    /* Sirf primary button/touch. Right-click ya middle-click par lehar
       uthana ajeeb lagta hai. */
    if (e.button !== 0) return;

    const btn = e.target.closest(".btn-ssz");
    if (!btn) return;
    if (btn.disabled || btn.classList.contains("is-disabled")) return;
    if (btn.classList.contains("is-loading")) return;
    /* Ghost button samtal hai — uspar lehar bhaari lagti hai. */
    if (btn.classList.contains("btn-ghost-ssz")) return;

    const r = btn.getBoundingClientRect();
    /* Lehar ka vyaas: button ke sabse door wale kone tak. Warna chhoti
       lehar bade button par aadhi hi bhar paati hai. */
    const dx = Math.max(e.clientX - r.left, r.right - e.clientX);
    const dy = Math.max(e.clientY - r.top, r.bottom - e.clientY);
    const size = Math.hypot(dx, dy) * 2;

    const wave = document.createElement("span");
    wave.className = "btn-ripple";
    wave.style.width = wave.style.height = `${size}px`;
    wave.style.left = `${e.clientX - r.left - size / 2}px`;
    wave.style.top = `${e.clientY - r.top - size / 2}px`;

    /* Purani lehar abhi chal rahi ho to hata dein — teen-chaar tez click
       par button dhundhla ho jaata tha. */
    btn.querySelector(".btn-ripple")?.remove();
    btn.appendChild(wave);

    /* animationend kabhi-kabhi nahi aata (tab background me chala jaye to),
       isliye ek timer bhi — warna span hamesha ke liye DOM me pada rehta. */
    const kill = () => wave.remove();
    wave.addEventListener("animationend", kill, { once: true });
    setTimeout(kill, 700);
  }, { passive: true });
}
