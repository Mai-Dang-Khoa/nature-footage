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
  const root = document.documentElement;
  // Effect level set in <head> before first paint: off | standard | max
  const fxLevel = root.getAttribute("data-fx") || "standard";
  const reduced = mq("(prefers-reduced-motion: reduce)").matches || fxLevel === "off";
  const finePointer = mq("(hover: hover) and (pointer: fine)").matches;
  // weak devices and Data Saver get the light version automatically
  const conn = nav.connection || {};
  const saveData = !!conn.saveData;
  const lowPower = saveData || (nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4) || (nav.deviceMemory > 0 && nav.deviceMemory <= 4);
  // heavy effects (tilt, spotlight, cursor, parallax) only with a precise pointer on a capable device
  // (an explicit "max" turns them on even on a weak device; the FPS monitor can still step down)
  const rich = finePointer && !reduced && (fxLevel === "max" || !lowPower);
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

  /* ---------- Tiny event bus: "scroll", "pointer", "resize", "fps", "lowfps", "fx", "data" ---------- */
  const bus = new Map();
  const on = (type, fn) => { if (!bus.has(type)) bus.set(type, new Set()); bus.get(type).add(fn); return () => bus.get(type).delete(fn); };
  const emit = (type, detail) => { const set = bus.get(type); if (set) set.forEach((fn) => fn(detail)); };

  /* ---------- Scroll: read scrollY once per frame, then notify (with velocity in px/ms) ---------- */
  const scrollSubs = new Set();
  const scrollState = { y: window.scrollY, dy: 0, vh: window.innerHeight, v: 0, t: performance.now() };
  let scrollQueued = false;
  function flushScroll() {
    scrollQueued = false;
    const y = window.scrollY, t = performance.now();
    scrollState.dy = y - scrollState.y;
    const dt = Math.max(1, t - scrollState.t);
    scrollState.v = lerp(scrollState.v, scrollState.dy / dt, 0.5);
    scrollState.y = y;
    scrollState.t = t;
    scrollState.vh = window.innerHeight;
    scrollSubs.forEach((fn) => fn(scrollState));
    emit("scroll", scrollState);
    if (fx.max) watchFps(1500);
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
    window.addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; emit("pointer", pointer); }, { passive: true });
  }
  window.addEventListener("resize", () => emit("resize", { w: innerWidth, h: innerHeight }), { passive: true });

  /* ---------- FPS monitor: first 3s, and while scrolling ---------- */
  // Averages frames over 1s windows; two windows below 45fps in a row → "lowfps".
  let fpsUntil = 0, fpsRunning = false, frames = 0, winStart = 0, lowRuns = 0, lastFps = 60;
  function fpsTask(t) {
    if (document.hidden) { fpsRunning = false; return false; }
    if (!winStart) winStart = t;
    frames++;
    if (t - winStart >= 1000) {
      lastFps = (frames * 1000) / (t - winStart);
      emit("fps", lastFps);
      lowRuns = lastFps < 45 ? lowRuns + 1 : 0;
      if (lowRuns >= 2) { lowRuns = 0; emit("lowfps", lastFps); }
      frames = 0; winStart = t;
    }
    if (performance.now() < fpsUntil) return true;
    fpsRunning = false; frames = 0; winStart = 0;
    return false;
  }
  function watchFps(ms) {
    fpsUntil = Math.max(fpsUntil, performance.now() + ms);
    if (!fpsRunning) { fpsRunning = true; add(fpsTask); }
  }

  /* ---------- Effect groups (max level only) ---------- */
  // Each heavy effect belongs to a group that can be switched off on its own.
  const GROUPS = ["intro", "webgl", "particles", "distort", "grain", "cursor", "tilt", "magnetic"];
  const POINTER_GROUPS = ["cursor", "tilt", "magnetic"];
  const max = fxLevel === "max" && !reduced;
  const off = new Set(max ? [] : GROUPS);
  if (!finePointer) POINTER_GROUPS.forEach((g) => off.add(g)); // touch: no pointer effects, scroll effects stay
  const fx = {
    level: fxLevel,
    max,
    groups: GROUPS,
    enabled: (g) => !off.has(g),
    disable(g) { if (off.has(g)) return; off.add(g); root.classList.add(`fx-no-${g}`); emit("fx", { group: g, on: false }); },
    get fps() { return lastFps; },
  };
  off.forEach((g) => root.classList.add(`fx-no-${g}`));

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

  /* ---------- Read a duration token (e.g. "--dur-slow") in ms ---------- */
  function ms(name) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v.endsWith("ms") ? parseFloat(v) : v.endsWith("s") ? parseFloat(v) * 1000 : 0;
  }
  const easing = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "ease-out";

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
      // whole group stays within 500ms (700ms at max level): many items → smaller gaps
      const cap = max ? 700 : 500;
      const step = Math.min(parseFloat(c.dataset.stagger) || 60, kids > 1 ? cap / (kids - 1) : 0);
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

  window.Motion = { reduced, finePointer, lowPower, saveData, rich, sda, ms, easing, lerp, clamp, add, onScroll, pointer, spring, animating, splitWords, reveal, show, scroll: scrollState, on, emit, fx, watchFps };
  if (max) watchFps(3000);
  document.documentElement.classList.toggle("motion-rich", rich);
  document.documentElement.classList.toggle("sda", sda);
  document.documentElement.classList.add("motion-ready");
})();
