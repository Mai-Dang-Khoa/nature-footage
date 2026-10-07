/* ==========================================================================
   Motion — tiny shared animation layer (no libraries).
   - one requestAnimationFrame loop that only runs while something needs it
   - one IntersectionObserver for every [data-reveal] element
   - helpers: lerp, clamp, spring, capability flags
   HTML API:
     data-reveal="up|fade|mask|clip"   how the element enters
     data-delay="80"                   extra delay in ms
     data-stagger="70"                 on a container: children with data-reveal get i * 70ms
   ========================================================================== */
(() => {
  "use strict";

  const mq = (q) => window.matchMedia(q);
  const nav = navigator;
  const reduced = mq("(prefers-reduced-motion: reduce)").matches;
  const finePointer = mq("(hover: hover) and (pointer: fine)").matches;
  // weak devices and Data Saver get the light version automatically
  const conn = nav.connection || {};
  const saveData = !!conn.saveData;
  const lowPower = saveData || (nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4) || (nav.deviceMemory > 0 && nav.deviceMemory <= 4);
  // heavy effects (tilt, spotlight, cursor, parallax) only with a precise pointer on a capable device
  const rich = finePointer && !reduced && !lowPower;
  // Scroll-driven CSS reveals where supported (animation-timeline: view()); otherwise IntersectionObserver.
  const sda = !reduced && !!(window.CSS && CSS.supports && CSS.supports("animation-timeline: view()"));

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

  /* ---------- Shared rAF loop ---------- */
  // A task is called every frame with the timestamp. Return true to keep running, anything else to stop.
  const tasks = new Set();
  let rafId = 0;
  function loop(t) {
    rafId = 0;
    tasks.forEach((fn) => { if (fn(t) !== true) tasks.delete(fn); });
    if (tasks.size) rafId = requestAnimationFrame(loop);
  }
  function add(fn) {
    tasks.add(fn);
    if (!rafId) rafId = requestAnimationFrame(loop);
    return () => tasks.delete(fn);
  }

  /* ---------- Scroll: read scrollY once per frame, then notify ---------- */
  const scrollSubs = new Set();
  const scrollState = { y: window.scrollY, dy: 0, vh: window.innerHeight };
  let scrollQueued = false;
  function flushScroll() {
    scrollQueued = false;
    const y = window.scrollY;
    scrollState.dy = y - scrollState.y;
    scrollState.y = y;
    scrollState.vh = window.innerHeight;
    scrollSubs.forEach((fn) => fn(scrollState));
  }
  function queueScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    add(() => { flushScroll(); });
  }
  window.addEventListener("scroll", queueScroll, { passive: true });
  window.addEventListener("resize", queueScroll, { passive: true });
  function onScroll(fn) {
    scrollSubs.add(fn);
    fn(scrollState);
    return () => scrollSubs.delete(fn);
  }

  /* ---------- Pointer (precise pointers only) ---------- */
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  if (finePointer) {
    window.addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  }

  /* ---------- Spring (critically-damped-ish), for "return to rest" ---------- */
  // Steps value toward target. Returns true while still moving.
  function spring(s, target, k = 0.14, damping = 0.72) {
    s.v = (s.v + (target - s.x) * k) * damping;
    s.x += s.v;
    if (Math.abs(target - s.x) < 0.001 && Math.abs(s.v) < 0.001) { s.x = target; s.v = 0; return false; }
    return true;
  }

  /* ---------- will-change only while animating ---------- */
  function animating(el, props = "transform, opacity", maxMs = 2500, onDone) {
    el.style.willChange = props;
    let done = false;
    const end = (e) => {
      if (done || (e && e.target !== el)) return;
      done = true;
      el.style.willChange = "";
      el.removeEventListener("transitionend", end);
      el.removeEventListener("animationend", end);
      if (onDone) onDone();
    };
    el.addEventListener("transitionend", end);
    el.addEventListener("animationend", end);
    setTimeout(end, maxMs);
  }

  /* ---------- Split a heading into masked words ---------- */
  function splitWords(el) {
    if (!el || el.dataset.split) return;
    el.dataset.split = "1";
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.append(p); return; }
            const w = document.createElement("span");
            w.className = "w";
            const inner = document.createElement("span");
            inner.className = "wi";
            inner.style.setProperty("--wi", i++);
            inner.textContent = p;
            w.append(inner);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR" && !n.classList.contains("w")) {
          walk(n);
        }
      });
    };
    walk(el);
  }

  /* ---------- Reveal ---------- */
  function show(el) {
    if (el.classList.contains("is-in")) return;
    animating(el, "transform, opacity", 2500, () => el.classList.add("revealed"));
    el.classList.add("is-in");
  }

  const io = !reduced && "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -8% 0px" })
    : null;

  function reveal(root = document) {
    const scope = root.querySelectorAll ? root : document;
    // containers stagger their direct reveal children
    const containers = [...(scope.matches && scope.matches("[data-stagger]") ? [scope] : []), ...scope.querySelectorAll("[data-stagger]")];
    containers.forEach((c) => {
      const kids = c.children.length;
      // whole group stays within 500ms: many items → smaller gaps
      const step = Math.min(parseFloat(c.dataset.stagger) || 60, kids > 1 ? 500 / (kids - 1) : 0);
      // stagger restarts on every row so far-down items don't wait long
      const cols = c.classList.contains("grid") ? (getComputedStyle(c).gridTemplateColumns.split(" ").length || 1) : 0;
      [...c.children].filter((k) => k.matches("[data-reveal]") || k.querySelector(":scope > [data-reveal]"))
        .forEach((k, i) => {
          const target = k.matches("[data-reveal]") ? k : k.querySelector(":scope > [data-reveal]");
          const idx = cols ? i % cols : i;
          target.style.setProperty("--reveal-delay", `${idx * step}ms`);
          target.style.setProperty("--reveal-i", idx);
        });
    });
    const nodes = [...(scope.matches && scope.matches("[data-reveal]") ? [scope] : []), ...scope.querySelectorAll("[data-reveal]")];
    nodes.forEach((el) => {
      if (el.dataset.revealBound) return;
      el.dataset.revealBound = "1";
      if (el.dataset.reveal === "mask") splitWords(el.matches("h1,h2,h3") ? el : el.querySelector("h1,h2,h3"));
      if (el.dataset.delay) el.style.setProperty("--reveal-delay", `${parseFloat(el.dataset.delay)}ms`);
      if (sda) return; // CSS handles it, nothing to observe
      if (!io) { el.classList.add("is-in", "revealed"); return; }
      io.observe(el);
    });
  }

  window.Motion = { reduced, finePointer, lowPower, saveData, rich, sda, lerp, clamp, add, onScroll, pointer, spring, animating, splitWords, reveal, show, scroll: scrollState };
  document.documentElement.classList.toggle("motion-rich", rich);
  document.documentElement.classList.toggle("sda", sda);
  document.documentElement.classList.add("motion-ready");
})();
