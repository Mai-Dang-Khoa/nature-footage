/* ==========================================================================
   Motion layer (see apple.css). Runs after script.js; changes no content.
   - headline words rise out of masks (keynote style)
   - hero: footage folds into a rounded card and the headline lifts away as you scroll
   - cards rise in with a stagger; the category filter is a segmented control with a spring pill
   - About line lights up word by word as you read; the free-sample picture scales into place
   Everything is off with "reduce motion".
   ========================================================================== */
(() => {
  "use strict";
  const root = document.documentElement;
  if (!window.matchMedia || matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  root.classList.add("anim");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------- 1. headlines: split into words inside masks ---------- */
  function split(node) {
    let w = 0;
    const walk = (n) => {
      [...n.childNodes].forEach((c) => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(document.createTextNode(part)); return; }
            const mw = document.createElement("span"), mi = document.createElement("span");
            mw.className = "mw"; mi.className = "mi"; mi.style.setProperty("--w", w++); mi.textContent = part;
            mw.append(mi); frag.append(mw);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && c.tagName !== "BR" && !c.classList.contains("br-sm")) walk(c);
      });
    };
    walk(node);
    node.removeAttribute("data-reveal");
    node.classList.remove("is-in");
    node.classList.add("split");
  }
  const heads = $$(".display, .title").filter((n) => !n.closest("dialog"));
  heads.forEach(split);
  // hero: title, line and button get their order; CSS starts them once fonts are ready (≤ 900ms)
  $$(".hero-head > *").forEach((n, i) => n.style.setProperty("--i", i));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -12% 0px" });
  heads.forEach((n) => io.observe(n));

  /* ---------- 2. About: a statement that lights up word by word ---------- */
  const about = $("#about .head p.body");
  let words = [];
  if (about) {
    about.className = "statement";
    about.removeAttribute("data-reveal");
    about.innerHTML = about.textContent.trim().split(/\s+/).map((w) => `<span class="sw">${w}</span>`).join(" ");
    words = $$(".sw", about);
  }

  /* ---------- 3. pictures in sections: scale 0.92 → 1 and fade in, tied to the scroll (eased) ---------- */
  const grid = $("#grid");
  let scrollMedia = [];
  const collectMedia = () => {
    scrollMedia = $$(".card-media, .split-media, .story-frame, .step-img").filter((n) => !n.closest("dialog"));
    scrollMedia.forEach((n) => n.classList.add("sm"));
    schedule();
  };
  if (grid) new MutationObserver(collectMedia).observe(grid, { childList: true });

  /* ---------- 4. category filter: segmented control with a sliding pill ---------- */
  const chips = $("#chips");
  let pill = null;
  function placePill(animate) {
    const on = chips && $(".chip[aria-pressed='true']", chips);
    if (!on || !pill) return;
    if (!animate) pill.style.transition = "none";
    pill.style.transform = `translateX(${on.offsetLeft}px)`;
    pill.style.width = `${on.offsetWidth}px`; // width, not scaleX: keeps the round ends round
    if (!animate) { pill.offsetWidth; pill.style.transition = ""; }
  }
  function setupChips() {
    if (!chips || !$(".chip", chips) || pill) return;
    chips.classList.add("seg");
    pill = document.createElement("span");
    pill.className = "seg-pill";
    pill.setAttribute("aria-hidden", "true");
    chips.prepend(pill);
    placePill(false);
    new MutationObserver(() => placePill(true)).observe(chips, { subtree: true, attributes: true, attributeFilter: ["aria-pressed"] });
    window.addEventListener("resize", () => placePill(false), { passive: true });
    if (document.fonts) document.fonts.ready.then(() => placePill(false));
  }
  if (chips) { new MutationObserver(setupChips).observe(chips, { childList: true }); setupChips(); }

  /* ---------- 5. Saved count pops when it changes ---------- */
  const count = $("#shortlist-count");
  if (count) new MutationObserver(() => { count.classList.remove("pop"); void count.offsetWidth; count.classList.add("pop"); }).observe(count, { childList: true, characterData: true, subtree: true });

  /* ---------- 6. scroll-linked: hero fold, free-sample scale, About words ---------- */
  const heroEl = $(".hero"), media = $(".hero-media"), head = $(".hero-head");
  let ticking = false;
  function frame() {
    ticking = false;
    const vh = innerHeight, y = scrollY;
    // hero: the footage shrinks to a rounded card and the headline lifts and fades
    if (heroEl && y < heroEl.offsetHeight * 1.2) {
      const p = clamp(y / (vh * 0.9));
      const inset = (p * 5).toFixed(2), r = (p * 28).toFixed(1);
      media.style.transform = `scale(${(1 - p * 0.06).toFixed(4)})`;
      media.style.clipPath = p > 0 ? `inset(0 ${inset}% round ${r}px)` : "";
      head.style.transform = `translateY(${(-p * 60).toFixed(1)}px) scale(${(1 - p * 0.04).toFixed(4)})`;
      head.style.opacity = (1 - p * 1.4).toFixed(3);
    }
    // pictures: 0.92 → 1 and 0 → 1 while their top travels from the bottom edge to 45% of the screen (ease-out cubic)
    scrollMedia.forEach((n) => {
      if (!n.offsetParent) return;
      const r = n.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh * 0.55)), e = 1 - Math.pow(1 - p, 3);
      n.style.scale = (0.92 + e * 0.08).toFixed(4);
      n.style.opacity = e.toFixed(3);
    });
    // About: words light up between 85% and 40% of the screen height
    if (words.length) {
      const r = about.getBoundingClientRect();
      // fully lit once it has reached 35% from the top (or scrolled past), dark below the fold
      const atEnd = y + vh >= document.documentElement.scrollHeight - 4; // tall screens may never scroll it that far
      const p = atEnd ? 1 : clamp((vh * 0.85 - r.top) / Math.max(1, vh * 0.5));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("lit", i < n));
    }
  }

  /* ---------- 7. pointer (mouse only): hero depth, card tilt + light, magnetic buttons, menu glide ---------- */
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    root.classList.add("ptr");
    const lerp = (a, b, t) => a + (b - a) * t;
    // one rAF loop that eases every pointer-driven value and stops when everything has settled
    const items = new Set();
    let raf = 0;
    const loop = () => {
      let busy = false;
      items.forEach((it) => {
        it.x = lerp(it.x, it.tx, it.k); it.y = lerp(it.y, it.ty, it.k);
        if (Math.abs(it.x - it.tx) + Math.abs(it.y - it.ty) > 0.01) busy = true; else { it.x = it.tx; it.y = it.ty; }
        it.apply(it.x, it.y);
      });
      raf = busy ? requestAnimationFrame(loop) : 0;
    };
    const ease = (it, tx, ty) => { it.tx = tx; it.ty = ty; items.add(it); if (!raf) raf = requestAnimationFrame(loop); };
    const item = (apply, k = 0.1) => ({ x: 0, y: 0, tx: 0, ty: 0, k, apply });

    // hero: footage drifts against the mouse (≤ 12px), the headline a little with it (≤ 5px)
    if (heroEl) {
      const h = item((x, y) => {
        heroEl.style.setProperty("--hx", `${(-x * 12).toFixed(2)}px`); heroEl.style.setProperty("--hy", `${(-y * 8).toFixed(2)}px`);
        heroEl.style.setProperty("--tx", `${(x * 5).toFixed(2)}px`); heroEl.style.setProperty("--ty", `${(y * 3).toFixed(2)}px`);
      }, 0.06);
      heroEl.addEventListener("pointermove", (e) => ease(h, (e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2), { passive: true });
      heroEl.addEventListener("pointerleave", () => ease(h, 0, 0));
    }

    // cards: tilt ≤ 4°, light follows the pointer (works for cards added later too)
    const tilts = new WeakMap();
    document.addEventListener("pointermove", (e) => {
      const hit = e.target.closest && e.target.closest(".card-hit");
      if (!hit) return;
      const m = hit.querySelector(".card-media"), r = m.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      m.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`); m.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      let t = tilts.get(m);
      if (!t) {
        t = item((a, b) => { m.style.setProperty("--ry", `${(a * 4).toFixed(2)}deg`); m.style.setProperty("--rx", `${(-b * 4).toFixed(2)}deg`); }, 0.12);
        tilts.set(m, t);
        hit.addEventListener("pointerleave", () => ease(t, 0, 0));
      }
      ease(t, (x - 0.5) * 2, (y - 0.5) * 2);
    }, { passive: true });

    // buttons: pulled ≤ 6px toward the pointer, spring back on leave; frozen while pressed.
    // Buy links never move, so the click always lands where the eye is.
    $$(".pill, .more, .text-btn").filter((b) => b.id !== "m-buy").forEach((b) => {
      b.classList.add("magnet");
      const t = item((x, y) => { b.style.setProperty("--bx", `${x.toFixed(2)}px`); b.style.setProperty("--by", `${y.toFixed(2)}px`); }, 0.18);
      let down = false;
      b.addEventListener("pointermove", (e) => {
        if (down || b.dataset.track === "buy_click") return; // links set up later as buy links stay put
        const r = b.getBoundingClientRect();
        ease(t, ((e.clientX - r.left) / r.width - 0.5) * 12, ((e.clientY - r.top) / r.height - 0.5) * 8);
      }, { passive: true });
      b.addEventListener("pointerdown", () => { down = true; });
      b.addEventListener("pointerup", () => { down = false; });
      b.addEventListener("pointerleave", () => { down = false; ease(t, 0, 0); });
    });

    // menu: a pill glides to the link under the pointer
    const nav = $(".nav-links");
    if (nav) {
      const glide = document.createElement("span");
      glide.className = "nav-hover";
      glide.setAttribute("aria-hidden", "true");
      nav.prepend(glide);
      nav.addEventListener("pointerover", (e) => {
        const a = e.target.closest("a, button");
        if (!a || !nav.contains(a)) return;
        const pad = 12;
        glide.style.transform = `translateX(${a.offsetLeft - pad}px)`;
        glide.style.width = `${a.offsetWidth + pad * 2}px`;
        glide.classList.add("on");
      });
      nav.addEventListener("pointerleave", () => glide.classList.remove("on"));
    }
  }

  const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  collectMedia();
  frame();
})();
