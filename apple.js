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
  // weak devices (≤ 4 cores, ≤ 4 GB, Data Saver): solid panels instead of live blur, which costs a frame every scroll step
  if (window.Motion && window.Motion.lowPower) root.classList.add("lite");
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

  // hero title: every letter gets its own blur-in step (words never break mid-word)
  const heroTitle = $(".hero-title");
  if (heroTitle) {
    let c = 0;
    const label = heroTitle.textContent.replace(/\s+/g, " ").trim();
    const wrap = (text) => {
      const frag = document.createDocumentFragment();
      text.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(document.createTextNode(part)); return; }
        const word = document.createElement("span");
        word.className = "cw";
        [...part].forEach((ch) => { const s = document.createElement("span"); s.className = "ch"; s.style.setProperty("--c", c++); s.textContent = ch; word.append(s); });
        frag.append(word);
      });
      return frag;
    };
    const walk = (n) => [...n.childNodes].forEach((x) => {
      if (x.nodeType === 3) x.replaceWith(wrap(x.textContent));
      else if (x.nodeType === 1 && x.tagName !== "BR" && !x.classList.contains("br-sm")) walk(x);
    });
    walk(heroTitle);
    // visible letters are hidden from assistive tech; the full sentence is read once
    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = label;
    const visual = document.createElement("span");
    visual.setAttribute("aria-hidden", "true");
    visual.append(...heroTitle.childNodes);
    heroTitle.append(sr, visual);
  }
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

  /* ---------- 4. a light sweep crosses each clip picture once, when it comes into view ---------- */
  const sweepIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("swept");
    sweepIO.unobserve(e.target);
  }), { rootMargin: "0px 0px -15% 0px" });
  const sweeps = () => $$(".card-media:not(.sw-on)").forEach((m, i) => { m.classList.add("sw-on"); m.style.setProperty("--k", i % 3); sweepIO.observe(m); });
  if (grid) new MutationObserver(sweeps).observe(grid, { childList: true });
  sweeps();

  /* ---------- 11. Telegram-style touches: ripple on press, heart burst on save, sheet drag-to-close (phones) ---------- */
  const RIPPLE = ".pill, .chip, .more, .text-btn, .card-hit, .sl-items .text-btn, .drawer .pill";
  document.addEventListener("pointerdown", (e) => {
    const host = e.target.closest && e.target.closest(RIPPLE);
    if (!host || host.disabled || e.button > 0) return;
    // the ripple sits in the element that clips it: pick the nearest real box
    const box = host.classList.contains("card-hit") ? host.querySelector(".card-media") : host;
    if (!box) return;
    box.classList.add("rip-host");
    const r = box.getBoundingClientRect();
    const rd = Math.ceil(Math.hypot(r.width, r.height) * 1.02);
    const span = document.createElement("span");
    span.className = "ripple";
    span.setAttribute("aria-hidden", "true");
    span.style.setProperty("--rx", `${e.clientX - r.left}px`);
    span.style.setProperty("--ry", `${e.clientY - r.top}px`);
    span.style.setProperty("--rd", `${rd}px`);
    box.append(span);
    span.addEventListener("animationend", () => span.remove(), { once: true });
  }, { passive: true });

  // save: the heart springs and six dots fly out, when the saved state turns on
  const mFav = $("#m-fav");
  if (mFav) {
    mFav.classList.add("heart-host");
    new MutationObserver(() => {
      if (mFav.getAttribute("aria-pressed") !== "true") return;
      const heart = mFav.querySelector("span[aria-hidden]");
      if (heart) { heart.classList.remove("heart-pop"); void heart.offsetWidth; heart.classList.add("heart-pop"); }
      for (let i = 0; i < 6; i++) {
        const d = document.createElement("span");
        d.className = "heart-dot";
        d.setAttribute("aria-hidden", "true");
        d.style.setProperty("--a", `${i * 60}deg`);
        mFav.append(d);
        d.addEventListener("animationend", () => d.remove(), { once: true });
      }
    }).observe(mFav, { attributes: true, attributeFilter: ["aria-pressed"] });
  }

  // sheet drag-to-close on phones: drag the top handle down; past 90px it closes, otherwise it springs back
  const drawer = $("#shortlist"), handle = drawer && $(".drawer-head", drawer);
  if (drawer && handle) {
    let y0 = null, dy = 0;
    handle.addEventListener("pointerdown", (e) => { if (window.innerWidth > 833 || e.target.closest("button")) return; y0 = e.clientY; dy = 0; drawer.style.transition = "none"; handle.setPointerCapture(e.pointerId); });
    handle.addEventListener("pointermove", (e) => {
      if (y0 === null) return;
      dy = Math.max(0, e.clientY - y0);
      drawer.style.transform = `translateY(${dy}px)`;
    });
    const release = () => {
      if (y0 === null) return;
      y0 = null;
      drawer.style.transition = "";
      if (dy > 90) { drawer.style.transform = ""; drawer.querySelector("[data-close]")?.click(); }
      else { drawer.style.transition = "transform .45s cubic-bezier(.34, 1.36, .64, 1)"; drawer.style.transform = "translateY(0)"; setTimeout(() => { drawer.style.transition = ""; drawer.style.transform = ""; }, 460); }
    };
    handle.addEventListener("pointerup", release);
    handle.addEventListener("pointercancel", release);
  }

  /* ---------- 5. Saved count pops when it changes ---------- */
  const count = $("#shortlist-count");
  if (count) new MutationObserver(() => { count.classList.remove("pop"); void count.offsetWidth; count.classList.add("pop"); }).observe(count, { childList: true, characterData: true, subtree: true });

  /* ---------- 9. wave 3: section colour blends across each seam as you scroll ---------- */
  const toneSecs = $$("main > section[data-theme], footer[data-theme]");
  const hex = (v, fb) => { const h = (v || fb).trim().replace("#", ""); const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const cs0 = getComputedStyle(root);
  const themeRGB = (t) => (t === "light" ? hex(cs0.getPropertyValue("--white"), "#fff") : hex(cs0.getPropertyValue("--black"), "#000"));
  const toneBand = () => innerHeight * 0.6; // the colour turns over a band of 60% screen height around each seam
  // colour of the page at document position y: starts with the first section's theme, then each seam mixes into the next
  // seams are read once per frame (all reads first, then all writes) so the browser lays out only once
  function toneAt(y, seams) {
    const band = toneBand();
    let col = themeRGB(toneSecs[0].dataset.theme);
    for (let k = 0; k + 1 < toneSecs.length; k++) {
      const seam = seams[k];
      const t = clamp((y - (seam - band / 2)) / band), e = t * t * (3 - 2 * t);
      const next = themeRGB(toneSecs[k + 1].dataset.theme);
      col = col.map((v, i) => v + (next[i] - v) * e);
    }
    return `rgb(${col.map((v) => Math.round(v)).join(",")})`;
  }
  const toneCache = new Map();
  function paintTone() {
    if (toneSecs.length < 2) return;
    const boxes = toneSecs.map((sec) => { const r = sec.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height, near: !(r.bottom < -innerHeight || r.top > 2 * innerHeight) }; });
    const seams = boxes.map((b) => b.top + b.h);
    boxes.forEach((b, i) => {
      const sec = toneSecs[i];
      if (b.h <= 0 || !b.near) return; // only sections near the screen
      const stops = [0, 0.25, 0.5, 0.75, 1].map((f) => `${toneAt(b.top + b.h * f, seams)} ${Math.round(f * 100)}%`).join(", ");
      if (toneCache.get(sec) !== stops) { toneCache.set(sec, stops); sec.style.backgroundImage = `linear-gradient(to bottom, ${stops})`; }
    });
  }
  if (toneSecs.length > 1) toneSecs.forEach((sec) => sec.dataset.tone = "1");

  /* ---------- 10. wave 3: pointer light on buttons, shadow away from the pointer on cards, depth echo on titles ---------- */
  const echoes = heads.filter((h) => h.classList.contains("title"));
  echoes.forEach((h) => { h.dataset.echo = h.textContent.replace(/\s+/g, " ").trim(); });
  const updateEchoes = () => {
    const vh = innerHeight;
    const rects = echoes.map((h) => h.getBoundingClientRect()); // read all first
    echoes.forEach((h, i) => {                                   // then write all
      const r = rects[i];
      if (r.bottom < -vh || r.top > 2 * vh) return;
      const p = (vh - r.top) / (vh + r.height);
      h.style.setProperty("--dy", `${((p - 0.5) * -90).toFixed(1)}px`);
    });
  };

  /* ---------- 8. GSAP + ScrollTrigger (cdnjs). Without it the CSS and JS above still work. ---------- */
  const G = window.gsap, ST = window.ScrollTrigger;
  const hasGsap = !!(G && ST);
  if (hasGsap) {
    G.registerPlugin(ST);
    // statement: pinned for one screen while its words light up, scrubbed to the scroll
    const aboutSec = $("#about");
    if (aboutSec && words.length) {
      ST.create({
        trigger: aboutSec, start: "top top+=10%", end: "+=90%", pin: true, anticipatePin: 1,
        scrub: 0.6,
        onUpdate: (self) => { const n = Math.round(self.progress * words.length); words.forEach((w, i) => w.classList.toggle("lit", i < n)); },
      });
    }
    // photos: slow parallax inside their frames; each column moves at its own speed so the grid feels layered
    let parTriggers = [];
    const parallax = () => {
      parTriggers.forEach((t) => t.kill());
      parTriggers = [];
      $$(".card-media").forEach((m, i) => {
        const img = m.querySelector(".card-thumb");
        if (!img) return;
        const speed = 0.6 + (i % 3) * 0.35;
        parTriggers.push(ST.create({
          trigger: m, start: "top bottom", end: "bottom top", scrub: true,
          onUpdate: (self) => { img.style.translate = `0 ${((self.progress - 0.5) * 8 * speed).toFixed(2)}%`; },
        }));
      });
      ST.refresh();
    };
    if (grid) new MutationObserver(parallax).observe(grid, { childList: true });
    parallax();
    const fm = $(".split-media");
    if (fm) ST.create({ trigger: fm, start: "top bottom", end: "bottom top", scrub: true, onUpdate: (self) => { fm.style.translate = `0 ${((self.progress - 0.5) * 6).toFixed(2)}%`; } });
  }

  /* ---------- 6. scroll-linked: hero fold, free-sample scale, About words ---------- */
  const heroEl = $(".hero"), media = $(".hero-media"), head = $(".hero-head"), shade = $(".hero-shade");
  let ticking = false;
  function frame() {
    ticking = false;
    const vh = innerHeight, y = scrollY;
    paintTone();
    updateEchoes();
    // hero: the footage shrinks to a rounded card and the headline lifts and fades
    if (heroEl && y < heroEl.offsetHeight * 1.2) {
      const p = clamp(y / (vh * 0.9));
      shade.style.background = `rgba(0, 0, 0, ${(0.35 + p * 0.3).toFixed(3)})`; // the veil deepens as the footage leaves
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
    // About: words light up between 85% and 40% of the screen height (GSAP does it when it is loaded)
    if (words.length && !hasGsap) {
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

    // cards: tilt ≤ 6°, light follows the pointer (works for cards added later too)
    const tilts = new WeakMap();
    document.addEventListener("pointermove", (e) => {
      const hit = e.target.closest && e.target.closest(".card-hit");
      if (!hit) return;
      const m = hit.querySelector(".card-media"), r = m.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      m.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`); m.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      let t = tilts.get(m);
      if (!t) {
        t = item((a, b) => {
          m.style.setProperty("--ry", `${(a * 6).toFixed(2)}deg`); m.style.setProperty("--rx", `${(-b * 6).toFixed(2)}deg`);
          // shadow falls away from the pointer
          m.style.setProperty("--sx", `${(-a * 14).toFixed(1)}px`); m.style.setProperty("--sy", `${(-b * 10).toFixed(1)}px`);
        }, 0.12);
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
        const r0 = b.getBoundingClientRect();
        b.style.setProperty("--px", `${(((e.clientX - r0.left) / r0.width) * 100).toFixed(1)}%`);
        b.style.setProperty("--py", `${(((e.clientY - r0.top) / r0.height) * 100).toFixed(1)}%`);
        if (down || b.dataset.track === "buy_click") return; // links set up later as buy links stay put
        const r = b.getBoundingClientRect();
        ease(t, ((e.clientX - r.left) / r.width - 0.5) * 12, ((e.clientY - r.top) / r.height - 0.5) * 8);
      }, { passive: true });
      b.addEventListener("pointerdown", () => { down = true; });
      b.addEventListener("pointerup", () => { down = false; });
      b.addEventListener("pointerleave", () => { down = false; ease(t, 0, 0); });
    });

    // cursor ring: follows the pointer with a lag, grows over cards and buttons (native cursor stays)
    const ring = document.createElement("div");
    ring.className = "cursor";
    ring.setAttribute("aria-hidden", "true");
    document.body.append(ring);
    const cur = { x: 0, y: 0, tx: 0, ty: 0 };
    let curRaf = 0;
    const curLoop = () => {
      cur.x = lerp(cur.x, cur.tx, 0.22); cur.y = lerp(cur.y, cur.ty, 0.22);
      ring.style.transform = `translate3d(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px, 0)`;
      curRaf = Math.abs(cur.x - cur.tx) + Math.abs(cur.y - cur.ty) > 0.1 ? requestAnimationFrame(curLoop) : 0;
    };
    document.addEventListener("pointermove", (e) => {
      cur.tx = e.clientX; cur.ty = e.clientY;
      if (!ring.classList.contains("on")) { cur.x = cur.tx; cur.y = cur.ty; ring.classList.add("on"); }
      if (!curRaf) curRaf = requestAnimationFrame(curLoop);
    }, { passive: true });
    document.addEventListener("pointerout", (e) => { if (!e.relatedTarget) ring.classList.remove("on"); });
    document.addEventListener("pointerover", (e) => {
      // the big ring only over clip cards: over buttons it would hide the label
      const hit = e.target.closest && e.target.closest(".card-hit");
      ring.classList.toggle("big", !!hit);
    }, { passive: true });

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
