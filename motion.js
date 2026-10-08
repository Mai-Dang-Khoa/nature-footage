/* ==========================================================================
   Motion — the only four kinds of motion on this site:
   1. reveal: fade + translateY 20px, 700ms, ease-out, once ([data-reveal])
   2. sticky: done in CSS (position: sticky)
   3. crossfade: opacity only (CSS classes toggled by script.js)
   4. nav colour follows the section under it ([data-theme] on sections)
   Also a shared rAF loop for film.js. Reduced motion: everything shows at once.
   ========================================================================== */
(() => {
  "use strict";
  const root = document.documentElement;
  const mq = (q) => window.matchMedia && matchMedia(q).matches;
  const conn = navigator.connection || {};
  const reduced = mq("(prefers-reduced-motion: reduce)");
  const lowPower = !!conn.saveData
    || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4)
    || (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4);

  /* ---------- tiny event bus ---------- */
  const handlers = {};
  const on = (name, fn) => { (handlers[name] = handlers[name] || []).push(fn); return () => { handlers[name] = handlers[name].filter((f) => f !== fn); }; };
  const emit = (name, data) => (handlers[name] || []).slice().forEach((fn) => fn(data));

  /* ---------- one shared rAF loop: a task returning false is dropped ---------- */
  const tasks = new Set();
  let raf = 0;
  const loop = () => {
    tasks.forEach((fn) => { if (fn() === false) tasks.delete(fn); });
    raf = tasks.size ? requestAnimationFrame(loop) : 0;
  };
  const add = (fn) => { tasks.add(fn); if (!raf) raf = requestAnimationFrame(loop); };

  let resizeT;
  window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => emit("resize"), 120); }, { passive: true });

  /* ---------- 1. reveal once ---------- */
  const io = "IntersectionObserver" in window && !reduced
    ? new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    }), { rootMargin: "0px 0px -10% 0px" })
    : null;
  function reveal(scope = document) {
    scope.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => {
      if (io) io.observe(el); else el.classList.add("is-in");
    });
  }

  /* ---------- 4. nav theme + frosted after scrolling ---------- */
  function navTheme() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const bar = nav.offsetHeight || 48;
    let ticking = false;
    const update = () => {
      ticking = false;
      nav.classList.toggle("scrolled", scrollY > 8);
      // the section under the middle of the bar decides the colour
      const hit = document.elementsFromPoint(innerWidth / 2, bar / 2).find((n) => n.closest && n.closest("[data-theme]") && !nav.contains(n));
      const theme = hit ? hit.closest("[data-theme]").dataset.theme : "dark";
      if (nav.dataset.theme !== theme) nav.dataset.theme = theme;
    };
    const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", schedule, { passive: true });
    on("resize", schedule);
    update();
  }

  window.Motion = {
    reduced, lowPower,
    finePointer: mq("(hover: hover) and (pointer: fine)"),
    clamp: (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    on, emit, add, reveal,
  };
  root.classList.toggle("reduced", reduced);
  const start = () => { navTheme(); reveal(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
