/* ==========================================================================
   Hero film — scrolling scrubs through a frame sequence drawn on a canvas.
   - config in site.json → "sequence" (no config: the section stays hidden)
   - first frame loads at once, the rest in batches (≤ 6 requests at a time),
     nearest to the current position first, decoded with createImageBitmap
   - progress from getBoundingClientRect inside the shared rAF, lerp 0.12
   - native scrolling only (sticky frame inside a ~400vh section)
   - falls back to one still + all lines (reduced motion, Data Saver, weak
     device, no canvas/createImageBitmap, or the first frame fails)
   ========================================================================== */
(() => {
  "use strict";

  const M = window.Motion;
  const section = document.getElementById("film");
  if (!M || !section) return;
  const root = document.documentElement;
  const canvas = document.getElementById("film-canvas");
  const still = document.getElementById("film-still");
  const cta = document.getElementById("film-cta");
  const lines = [...section.querySelectorAll(".film-line")].map((li) => ({ li, at: parseFloat(li.dataset.at) || 0 }));
  const ctx = canvas.getContext && canvas.getContext("2d");

  const onData = (fn) => { if (window.App) fn(window.App); else { const off = M.on("data", (d) => { off(); fn(d); }); } };

  onData(({ site }) => {
    const cfg = site && site.sequence;
    const set0 = cfg && (cfg.desktop || cfg.mobile);
    if (!cfg || !(cfg.frames > 1) || !set0 || !set0.path) return; // no sequence configured: keep hidden
    section.hidden = false;

    const N = cfg.frames, pad = cfg.pad || 4;
    const set = innerWidth < 760 && cfg.mobile ? cfg.mobile : set0; // smaller frames on phones
    const url = (i) => set.path.replace("{n}", String(i + 1).padStart(pad, "0"));
    if (cfg.label) canvas.setAttribute("aria-label", cfg.label);

    const conn = navigator.connection || {};
    // weak devices get the still, unless the visitor explicitly picked the "max" level
    const forcedMax = root.getAttribute("data-fx-source") === "user" && root.getAttribute("data-fx") === "max";
    const weak = M.lowPower && !forcedMax;
    let isStatic = false;
    function toStatic() {
      if (isStatic) return;
      isStatic = true;
      section.classList.add("static");
      still.alt = cfg.label || "";
      still.hidden = false;
      // fetch the still only when the section gets close (keeps the first load light)
      const setSrc = () => { still.src = cfg.fallback || url(N - 1); };
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); setSrc(); } }, { rootMargin: "100% 0px" });
        io.observe(section);
      } else setSrc();
      lines.forEach(({ li }) => li.classList.add("on"));
      cta.classList.add("on");
    }
    if (M.reduced || conn.saveData || weak || !ctx || !window.createImageBitmap || !window.fetch) { toStatic(); return; }

    /* ---------- loading: first frame now, then nearest-first batches ---------- */
    const bitmaps = new Array(N);
    const state = new Uint8Array(N); // 0 idle, 1 loading, 2 ready, 3 failed
    let inflight = 0, target = 0, started = false, dirty = true;
    async function load(i) {
      state[i] = 1; inflight++;
      try {
        const res = await fetch(url(i));
        if (!res.ok) throw new Error(res.status);
        bitmaps[i] = await createImageBitmap(await res.blob());
        state[i] = 2; dirty = true;
      } catch (err) {
        state[i] = 3;
        if (i === 0) toStatic();
      } finally {
        inflight--;
        if (started && !isStatic) pump();
      }
    }
    function nextIndex() {
      for (let d = 0; d < N; d++) {
        if (target + d < N && state[target + d] === 0) return target + d;
        if (target - d >= 0 && state[target - d] === 0) return target - d;
      }
      return -1;
    }
    function pump() {
      while (inflight < 6) { const i = nextIndex(); if (i < 0) break; load(i); }
    }
    function nearestReady(i) {
      for (let d = 0; d < N; d++) {
        if (i - d >= 0 && state[i - d] === 2) return i - d; // prefer the frame just behind
        if (i + d < N && state[i + d] === 2) return i + d;
      }
      return -1;
    }
    load(0);

    /* ---------- drawing ---------- */
    let cw = 0, ch = 0, drawn = -1;
    function size() {
      const k = Math.min(window.devicePixelRatio || 1, 1.5);
      cw = Math.round(canvas.clientWidth * k); ch = Math.round(canvas.clientHeight * k);
      canvas.width = cw; canvas.height = ch; dirty = true;
    }
    function draw(i) {
      const bmp = bitmaps[i];
      if (!bmp) return;
      const s = Math.max(cw / bmp.width, ch / bmp.height); // cover
      const w = bmp.width * s, h = bmp.height * s;
      ctx.drawImage(bmp, (cw - w) / 2, (ch - h) / 2, w, h);
      drawn = i;
    }
    size();
    M.on("resize", size);

    /* ---------- scroll → progress → frame + copy ---------- */
    let smooth = 0, running = false, visible = false, activeLine = null;
    function tick() {
      if (isStatic || !visible) { running = false; return false; }
      const r = section.getBoundingClientRect(), vh = innerHeight; // read
      const p = M.clamp(-r.top / Math.max(1, r.height - vh));
      smooth = M.lerp(smooth, p, 0.12);
      if (Math.abs(smooth - p) < 0.0005) smooth = p;
      const idx = Math.round(smooth * (N - 1));
      if (idx !== target) { target = idx; pump(); }
      const show = nearestReady(idx);
      if (show >= 0 && (show !== drawn || dirty)) { draw(show); dirty = false; } // write
      // one line at a time, around its mark
      let best = null;
      lines.forEach((l) => { const d = Math.abs(smooth - l.at); if (d < 0.1 && (!best || d < best.d)) best = { l, d }; });
      const next = best ? best.l : null;
      if (next !== activeLine) { if (activeLine) activeLine.li.classList.remove("on"); if (next) next.li.classList.add("on"); activeLine = next; }
      cta.classList.toggle("on", smooth >= 0.92);
      return true;
    }
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !started) { started = true; pump(); }
      if (visible && !running) { running = true; M.add(tick); }
    }, { rootMargin: "50% 0px 50% 0px" }).observe(section);
  });
})();
