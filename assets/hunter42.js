/* hunter42.js — Plates Luxury · lượt #42 (CodePen + Awwwards research)
   STAGED LOCAL ONLY — tuyệt đối KHÔNG push GitHub khi chưa có lệnh "up".
   Mọi id/class/var mới prefix h42-. Additive: không phá hero/preloader/cart hiện có. */
(function () {
"use strict";
var d = document, w = window;
function $(s, r) { return (r || d).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); }
function on(el, ev, fn, opt) { if (el && el.addEventListener) el.addEventListener(ev, fn, opt || false); }
function hasIO() { return typeof w.IntersectionObserver === "function"; }

/* ---------- H42-92 · RM master gate (live listener) ---------- */
var rmQ = (w.matchMedia) ? w.matchMedia("(prefers-reduced-motion: reduce)") : null;
function syncRM() { d.documentElement.classList.toggle("h42-nomotion", !!(rmQ && rmQ.matches)); }
syncRM();
if (rmQ && rmQ.addEventListener) rmQ.addEventListener("change", syncRM);
function isRM() { return d.documentElement.classList.contains("h42-nomotion"); }

/* ---------- H42-93 · save-data guard ---------- */
try {
  var conn = w.navigator && w.navigator.connection;
  if (conn && conn.saveData) d.documentElement.classList.add("h42-savemode");
} catch (e) {}

/* ---------- H42-65 · userAgentData mobile ---------- */
try {
  var uad = w.navigator && w.navigator.userAgentData;
  if (uad && uad.mobile) d.documentElement.classList.add("h42-uamobile");
} catch (e) {}

/* ---------- H42-66 · coarse pointer marker ---------- */
try {
  var coarseQ = w.matchMedia && w.matchMedia("(hover: none)");
  if (coarseQ && coarseQ.matches) d.documentElement.classList.add("h42-coarse");
} catch (e) {}

/* ---------- H42-94 · fine-pointer gate helper ---------- */
var fineQ = (w.matchMedia) ? w.matchMedia("(hover: hover) and (pointer: fine)") : null;
function isFine() { return !!(fineQ && fineQ.matches); }

/* ---------- H42-85 · boot marker ---------- */
try { d.body.dataset.h42 = "1"; } catch (e) {}

/* ============ H42-02 · CP25 worm — bám nút .filter đang active ============ */
(function () {
  var bar = $(".filters");
  if (!bar) return;
  var worm = d.createElement("span");
  worm.className = "h42-worm h42-a";
  worm.setAttribute("aria-hidden", "true");
  bar.appendChild(worm);
  function place() {
    var a = $(".filter.active", bar) || $(".filter", bar);
    if (!a || !a.offsetLeft && a.offsetLeft !== 0) return;
    worm.style.left = a.offsetLeft + "px";
    worm.style.width = Math.max(26, Math.round(a.offsetWidth * 0.62)) + "px";
  }
  place();
  on(w, "resize", place);
  on(bar, "click", function () { setTimeout(place, 40); });
  if (hasIO()) { /* re-place khi filter scroll vào view (font/layout ổn định) */
    var io = new w.IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) place(); }); });
    io.observe(bar);
  }
})();

/* ============ H42-03 · CP26 attr-text — nạp data-h42t ============ */
$$(".nav-links a, .footer-links a").forEach(function (a) {
  if (!a.getAttribute("data-h42t")) a.setAttribute("data-h42t", (a.textContent || "").trim());
});

/* ============ H42-04 · CP41 radial mask — gắn class cho footer-mark ============ */
(function () {
  var fm = $(".footer-mark");
  if (fm && isFine()) fm.classList.add("h42-mask", "h42-a");
})();

/* ============ H42-05 · CP47 elastic traffic lights — kéo nút đóng cart ============ */
(function () {
  var btn = $("#cartModal .sheet-close");
  var modal = $("#cartModal");
  if (!btn || !modal) return;
  var sx = 0, dx = 0, dragging = false;
  function closeModal() {
    modal.classList.remove("open");
    modal.hidden = true;
    try { d.body.style.overflow = ""; } catch (e) {}
    try { btn.blur(); } catch (e) {}
  }
  on(btn, "pointerdown", function (e) {
    if (!isFine() || isRM()) return;
    dragging = true; sx = e.clientX; dx = 0;
    btn.classList.add("h42-drag");
    try { btn.setPointerCapture(e.pointerId); } catch (err) {}
  });
  on(btn, "pointermove", function (e) {
    if (!dragging) return;
    dx = e.clientX - sx;
    btn.style.transform = "translateX(" + dx + "px)" + (Math.abs(dx) > 40 ? " scale(1.15)" : "");
  });
  function end(e) {
    if (!dragging) return;
    dragging = false;
    btn.classList.remove("h42-drag");
    /* H42-75 · pointercancel cũng dọn state */
    if (e && e.type === "pointercancel") { btn.style.transform = ""; return; }
    if (Math.abs(dx) > 70) { closeModal(); } /* kéo đủ xa → đóng, không cần click */
    btn.classList.add("h42-snapback");
    btn.style.transform = "";
    setTimeout(function () { btn.classList.remove("h42-snapback"); }, 650);
    dx = 0;
  }
  on(btn, "pointerup", end);
  on(btn, "pointercancel", end);
  /* H42-76 · lostpointercapture → dọn */
  on(btn, "lostpointercapture", function () { dragging = false; btn.classList.remove("h42-drag"); btn.style.transform = ""; });
})();

/* ============ H42-06 · CP18 modern color picker — accent customizer ============ */
(function () {
  if (isRM()) return;
  var fab = d.createElement("button");
  fab.className = "h42-fab"; fab.type = "button";
  fab.setAttribute("aria-label", "Customize accent color");
  fab.setAttribute("aria-haspopup", "dialog");
  fab.innerHTML = "<span aria-hidden='true'>◐</span>";
  var pop = d.createElement("div");
  pop.className = "h42-picker"; pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-label", "Accent color picker");
  pop.innerHTML = "<label for='h42-accent'>Accent</label>" +
    "<input type='color' id='h42-accent' value='#c9a227' aria-label='Pick accent color'>" +
    "<button type='button' id='h42-accent-reset'>Reset</button>";
  d.body.appendChild(fab); d.body.appendChild(pop);
  var input = $("#h42-accent", pop), reset = $("#h42-accent-reset", pop);
  function apply(v) {
    try {
      d.documentElement.style.setProperty("--gold", v);
      d.documentElement.style.setProperty("--gold-2", v);
      w.localStorage.setItem("h42-accent", v);
    } catch (e) {}
  }
  try {
    var saved = w.localStorage.getItem("h42-accent");
    if (saved) { apply(saved); if (input) input.value = saved; }
  } catch (e) {}
  on(fab, "click", function () {
    var open = pop.classList.toggle("h42-open");
    fab.setAttribute("aria-expanded", open ? "true" : "false");
  });
  on(input, "input", function () { apply(input.value); });
  on(reset, "click", function () {
    try {
      d.documentElement.style.removeProperty("--gold");
      d.documentElement.style.removeProperty("--gold-2");
      w.localStorage.removeItem("h42-accent");
      input.value = "#c9a227";
    } catch (e) {}
  });
})();

/* ============ H42-08 · CP15 CSS landscape posters + H42-71 emptied fallback ============ */
(function () {
  var cards = $$(".clip-card");
  if (!cards.length) return;
  cards.forEach(function (card, i) {
    var visual = $(".clip-visual", card);
    if (!visual || $(".h42-scene", visual)) return;
    var scene = d.createElement("div");
    scene.className = "h42-scene h42-a";
    scene.setAttribute("aria-hidden", "true");
    scene.style.setProperty("--h42-hue", String((i * 47) % 360));
    visual.insertBefore(scene, visual.firstChild);
    var vid = $(".card-video", visual);
    function show() { scene.classList.add("h42-on"); }
    function hide() { scene.classList.remove("h42-on"); }
    show(); /* hiện ngay khi poster chưa sẵn */
    if (vid) {
      on(vid, "canplay", hide);
      on(vid, "playing", hide);
      /* H42-71 · video rỗng → hiện lại poster vẽ */
      on(vid, "emptied", function () { card.classList.add("h42-emptied"); show(); });
    }
  });
})();

/* ============ H42-09 · CP24 flip text — lang toggle ============ */
(function () {
  var t = $("#langToggle");
  if (!t) return;
  on(t, "click", function () {
    if (isRM()) return;
    t.classList.remove("h42-flip");
    void t.offsetWidth;
    t.classList.add("h42-flip");
    setTimeout(function () { t.classList.remove("h42-flip"); }, 500);
  });
})();

/* ============ H42-10 · AW01 text explosive — hero title vỡ khi cuộn ra ============ */
(function () {
  var hero = $(".hero"), title = $(".hero-title");
  if (!hero || !title || isRM()) return;
  var done = false;
  function stable() {
    return $$(".scramble-part", title).every(function (sp) {
      return (sp.textContent || "") === (sp.getAttribute("data-text") || "");
    });
  }
  function split() {
    if (done || !stable()) return;
    done = true;
    $$(".scramble-part", title).forEach(function (sp) {
      var txt = sp.textContent, frag = d.createDocumentFragment();
      for (var i = 0; i < txt.length; i++) {
        var c = d.createElement("span");
        c.className = "h42-xchar h42-a";
        c.textContent = txt[i] === " " ? " " : txt[i];
        c.style.setProperty("--h42-dx", ((i * 37 % 100) / 50 - 1).toFixed(2));
        c.style.setProperty("--h42-dy", (-(i * 53 % 100) / 100).toFixed(2));
        c.style.setProperty("--h42-rr", ((i * 29 % 100) / 50 - 1).toFixed(2));
        frag.appendChild(c);
      }
      sp.textContent = "";
      sp.appendChild(frag);
    });
    hero.classList.add("h42-armed");
  }
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    if (stable() || tries > 20) { clearInterval(timer); split(); }
  }, 400);
  on(w, "scroll", function arm() { split(); if (done) w.removeEventListener("scroll", arm); }, { passive: true });
})();

/* ============ H42-11 · AW03 staggered char rise — section heads ============ */
(function () {
  $$(".section-head h2").forEach(function (h2) {
    if ($(".h42-rchar", h2)) return;
    var nodes = Array.prototype.slice.call(h2.childNodes), idx = 0;
    nodes.forEach(function (n) {
      if (n.nodeType !== 3) return;
      var frag = d.createDocumentFragment();
      n.textContent.split("").forEach(function (ch) {
        var s = d.createElement("span");
        s.className = "h42-rchar h42-a";
        s.style.setProperty("--h42-i", String(idx++));
        s.textContent = ch === " " ? " " : ch;
        frag.appendChild(s);
      });
      h2.replaceChild(frag, n);
    });
    h2.classList.add("h42-pull"); /* H42-24 · focus-pull scroll-driven */
  });
  if (!hasIO()) { $$(".section-head h2").forEach(function (h) { h.classList.add("h42-rise"); }); return; }
  var io = new w.IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("h42-rise"); io.unobserve(e.target); } });
  }, { threshold: 0.35 });
  $$(".section-head h2").forEach(function (h) { io.observe(h); });
})();

/* ============ H42-12 · AW06 interactive typographic footer ============ */
(function () {
  var fm = $(".footer-mark");
  if (!fm || !isFine() || isRM()) return;
  var txt = fm.textContent;
  fm.textContent = "";
  var frag = d.createDocumentFragment();
  txt.split("").forEach(function (ch) {
    var s = d.createElement("span");
    s.className = "h42-fchar h42-a";
    s.textContent = ch === " " ? " " : ch;
    frag.appendChild(s);
  });
  fm.appendChild(frag);
  fm.classList.add("h42-live");
})();

/* ============ H42-13 · AW07 hold-to-blast — giữ để xác nhận #cartRequest ============ */
(function () {
  var link = $("#cartRequest");
  if (!link) return;
  var ring = d.createElement("span");
  ring.className = "h42-ring h42-a";
  ring.setAttribute("aria-hidden", "true");
  ring.innerHTML = "<svg viewBox='0 0 96 96'><circle cx='48' cy='48' r='48'/></svg>";
  link.appendChild(ring);
  var timer = null, confirmed = false, HOLD = 800;
  link.setAttribute("aria-label", "Press and hold to request licenses by email");
  function cancel() {
    if (timer) { clearTimeout(timer); timer = null; }
    link.classList.remove("h42-charging");
  }
  on(link, "pointerdown", function () {
    if (isRM()) { confirmed = true; return; }
    confirmed = false;
    link.classList.add("h42-charging");
    timer = setTimeout(function () {
      timer = null; confirmed = true;
      link.classList.remove("h42-charging");
      link.classList.add("h42-done");
      try { w.location.href = link.getAttribute("href"); } catch (e) {}
      setTimeout(function () { link.classList.remove("h42-done"); confirmed = false; }, 2500);
    }, HOLD);
  });
  on(link, "pointerup", cancel);
  on(link, "pointerleave", cancel);
  /* H42-74/75 dọn khi gesture bị hủy */
  on(link, "pointercancel", cancel);
  on(link, "touchcancel", cancel);
  on(link, "keydown", function (e) { /* bàn phím: Enter/Space = xác nhận ngay */
    if (e.key === "Enter" || e.key === " ") confirmed = true;
  });
  on(link, "click", function (e) {
    if (!confirmed) { e.preventDefault(); cancel(); }
    confirmed = false;
  });
})();

/* ============ H42-14 · AW08 cinematic counter — % theo buffered thật ============ */
(function () {
  var label = $(".loader-label"), pre = $("#preloader"), vid = $("#heroVideo");
  if (!label || !pre) return;
  label.classList.add("h42-live");
  /* H42-67 · prerendering: hoãn đếm */
  function ready() { try { return !d.prerendering; } catch (e) { return true; } }
  var pct = 0, t0 = Date.now();
  function tick() {
    if (pre.hidden || pre.style.display === "none" || !ready()) return;
    var target = pct;
    try {
      if (vid && vid.buffered && vid.buffered.length && vid.duration) {
        target = Math.min(99, Math.round(vid.buffered.end(vid.buffered.length - 1) / vid.duration * 100));
      } else {
        target = Math.min(90, Math.round((Date.now() - t0) / 40));
      }
    } catch (e) {}
    pct = Math.max(pct, target);
    label.setAttribute("data-h42pct", String(pct).padStart(3, "0") + "%");
    if (pct < 100) setTimeout(tick, 200);
  }
  tick();
})();

/* ============ H42-15 · AW09 film title-card loader chapters ============ */
(function () {
  var pre = $("#preloader");
  if (!pre || isRM()) return;
  var chapters = [
    ["PLATES", "REEL 01"], ["LIGHT", "REEL 02"], ["MOTION", "REEL 03"]
  ];
  var nodes = chapters.map(function (c) {
    var el = d.createElement("div");
    el.className = "h42-chapter h42-a";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = "<div><strong>" + c[0] + "</strong><small>" + c[1] + "</small></div>";
    pre.appendChild(el);
    return el;
  });
  var i = 0, timer = setInterval(function () {
    if (pre.hidden || pre.style.display === "none") { clearInterval(timer); return; }
    nodes.forEach(function (n, k) { n.classList.toggle("h42-show", k === i % nodes.length); });
    i++;
  }, 1600);
})();

/* ============ H42-16 · AW13 slide-panel nav — gắn class + stagger index ============ */
(function () {
  var nav = $(".nav");
  if (!nav) return;
  nav.classList.add("h42-panel");
  $$(".nav-links a", nav).forEach(function (a, i) { a.style.setProperty("--h42-i", String(i)); });
})();

/* ============ H42-17 · AW14 marquee pause khi ngoài viewport ============ */
(function () {
  if (!hasIO()) return;
  $$(".marquee-track").forEach(function (track) {
    var host = track.closest(".marquee") || track.parentNode;
    var io = new w.IntersectionObserver(function (es) {
      es.forEach(function (e) { track.classList.toggle("h42-paused", !e.isIntersecting); });
    });
    io.observe(host || track);
  });
})();

/* ============ H42-18 · AW15 oversized menu — Collections dropdown ============ */
(function () {
  var link = $('.nav-links a[href="#collections"]');
  var nav = $(".nav-links");
  if (!link || !nav || !isFine()) return;
  var mega = d.createElement("div");
  mega.className = "h42-mega h42-a";
  mega.setAttribute("role", "menu");
  var chips = $$(".mood-chip").map(function (c) { return (c.textContent || "").trim(); })
    .filter(function (t) { return t && t.toLowerCase() !== "all moods"; });
  if (!chips.length) chips = ["Rain", "Mist", "Night", "Sunset", "Ocean", "Technology"];
  mega.innerHTML = chips.map(function (m) {
    return "<a href='#library' role='menuitem' data-h42mood='" + m + "'>" + m +
      "<small>MOOD · " + m.toUpperCase() + "</small></a>";
  }).join("");
  link.parentNode.insertBefore(mega, link.nextSibling);
  link.setAttribute("aria-haspopup", "true");
  link.setAttribute("aria-expanded", "false");
  function open() { mega.classList.add("h42-open"); link.setAttribute("aria-expanded", "true"); }
  function close() { mega.classList.remove("h42-open"); link.setAttribute("aria-expanded", "false"); }
  on(link, "mouseenter", open);
  on(link, "focus", open);
  on(link.parentNode, "mouseleave", close);
  on(link, "blur", function () { setTimeout(function () { if (!mega.contains(d.activeElement)) close(); }, 120); });
  on(mega, "click", function (e) {
    var a = e.target.closest ? e.target.closest("a[data-h42mood]") : null;
    if (!a) return;
    var chip = $$(".mood-chip").filter(function (c) {
      return (c.textContent || "").trim() === a.getAttribute("data-h42mood");
    })[0];
    if (chip) { e.preventDefault(); chip.click(); close(); }
  });
  on(d, "keydown", function (e) { if (e.key === "Escape") close(); });
})();

/* ============ H42-19 · AW22 drag-to-preview — kéo ngang tua preview ============ */
(function () {
  if (!isFine() || isRM()) return;
  var scrub = null; /* {vid, x0, t0, moved} */
  function onCard(card) {
    var visual = $(".clip-visual", card);
    var vid = $(".card-video", card);
    if (!visual || !vid || visual.dataset.h42scrub) return;
    visual.dataset.h42scrub = "1";
    on(visual, "pointerdown", function (e) {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      scrub = { vid: vid, x0: e.clientX, t0: vid.currentTime || 0, moved: false, card: card };
    });
    on(visual, "pointermove", function (e) {
      if (!scrub || scrub.vid !== vid) return;
      var dx = e.clientX - scrub.x0;
      if (Math.abs(dx) > 8 && !scrub.moved) {
        scrub.moved = true;
        visual.classList.add("h42-scrubbing");
        card.classList.add("h42-dragging");
        try { vid.pause(); } catch (err) {}
      }
      if (scrub.moved) {
        e.preventDefault();
        var dur = vid.duration || 8;
        var t = scrub.t0 + dx / 120;
        try { vid.currentTime = Math.max(0, Math.min(dur, t)); } catch (err) {}
      }
    });
    function end() {
      if (!scrub || scrub.vid !== vid) return;
      var wasMoved = scrub.moved;
      visual.classList.remove("h42-scrubbing");
      card.classList.remove("h42-dragging");
      scrub = null;
      if (wasMoved) {
        /* chặn click mở modal sau khi kéo */
        var blocker = function (e) { e.stopPropagation(); e.preventDefault(); visual.removeEventListener("click", blocker, true); };
        visual.addEventListener("click", blocker, true);
        setTimeout(function () { visual.removeEventListener("click", blocker, true); }, 50);
      }
    }
    on(visual, "pointerup", end);
    on(visual, "pointercancel", end); /* H42-75 */
    on(visual, "touchcancel", end);   /* H42-74 */
    on(visual, "lostpointercapture", function () { scrub = null; }); /* H42-76 */
    /* H42-78 · chặn bôi đen khi kéo */
    on(visual, "selectstart", function (e) { if (scrub && scrub.moved) e.preventDefault(); });
  }
  $$(".clip-card").forEach(onCard);
  /* card render động: quan sát thêm */
  if (w.MutationObserver) {
    var mo = new w.MutationObserver(function () { $$(".clip-card").forEach(onCard); });
    var grid = $("#clipGrid");
    if (grid) mo.observe(grid, { childList: true });
  }
})();

/* ============ H42-20 · AW35 cursor-reactive hero type ============ */
(function () {
  var sub = $(".hero-sub"), hero = $(".hero");
  if (!sub || !hero || !isFine() || isRM()) return;
  var txt = sub.textContent;
  sub.setAttribute("aria-label", txt);
  sub.textContent = "";
  var frag = d.createDocumentFragment(), chars = [];
  txt.split("").forEach(function (ch) {
    var s = d.createElement("span");
    s.className = "h42-schar h42-a";
    s.setAttribute("aria-hidden", "true");
    s.textContent = ch === " " ? " " : ch;
    frag.appendChild(s); chars.push(s);
  });
  sub.appendChild(frag);
  var raf = null, mx = -9999, my = -9999;
  function render() {
    raf = null;
    chars.forEach(function (c) {
      var r = c.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = mx - cx, dy = my - cy, dist = Math.sqrt(dx * dx + dy * dy);
      var pull = Math.max(0, 1 - dist / 160);
      c.style.transform = "translate(" + (dx * pull * 0.12).toFixed(1) + "px," +
        (dy * pull * 0.12).toFixed(1) + "px) rotate(" + (dx * pull * 0.02).toFixed(2) + "deg)";
    });
  }
  on(hero, "pointermove", function (e) {
    mx = e.clientX; my = e.clientY;
    if (!raf) raf = w.requestAnimationFrame(render);
  });
  on(hero, "pointerleave", function () {
    mx = -9999; my = -9999;
    chars.forEach(function (c) { c.style.transform = ""; });
  });
})();

/* ============ H42-21 · AW39 clip-path loop chip ============ */
(function () {
  $$(".stack-kicker").forEach(function (k) { k.classList.add("h42-loop", "h42-a"); });
})();

/* ============ H42-23 · AW41 rotating active indicator ============ */
(function () {
  if (!hasIO()) return;
  var map = [["#collections", "Collections"], ["#library", "Library"], ["#pricing", "Licensing"],
    ["#craft", "Craft"], ["#journal", "Journal"], ["#faq", "FAQ"]];
  var links = $$(".nav-links a");
  function setActive(name) {
    links.forEach(function (a) {
      a.classList.toggle("h42-active", (a.textContent || "").trim() === name);
    });
  }
  var io = new w.IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      for (var i = 0; i < map.length; i++) {
        if (e.target.matches(map[i][0])) { setActive(map[i][1]); break; }
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  map.forEach(function (m) { var s = $(m[0]); if (s) io.observe(s); });
})();

/* ============ H42-25 · AW50 idle drift — collection videos ============ */
(function () {
  if (isRM()) return;
  var idleT = null;
  function arm() {
    if (idleT) clearTimeout(idleT);
    idleT = setTimeout(function () {
      $$(".collection-video").forEach(function (v) { v.classList.add("h42-drift", "h42-a"); });
    }, 8000);
  }
  function wake() {
    if (idleT) clearTimeout(idleT);
    $$(".collection-video.h42-drift").forEach(function (v) { v.classList.remove("h42-drift"); });
    arm();
  }
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (ev) {
    on(d, ev, wake, { passive: true });
  });
  arm();
})();

/* ============ H42-26 · AW16 lerp float — collection cards ============ */
(function () {
  if (!isFine() || isRM()) return;
  $$(".collection").forEach(function (card) {
    card.classList.add("h42-float", "h42-a");
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    function loop() {
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
      card.style.transform = "translate(" + cx.toFixed(2) + "px," + cy.toFixed(2) + "px)";
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) { raf = w.requestAnimationFrame(loop); }
      else { raf = null; card.style.transform = ""; }
    }
    function kick() { if (!raf) raf = w.requestAnimationFrame(loop); }
    on(card, "pointermove", function (e) {
      var r = card.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * 0.06;
      ty = (e.clientY - (r.top + r.height / 2)) * 0.06;
      kick();
    });
    on(card, "pointerleave", function () { tx = 0; ty = 0; kick(); });
  });
})();

/* ================= D. JS micro H42-65→H42-100 ================= */

/* H42-68 · prerendering: hoãn mọi logic preloader cho tới khi visible */
var h42prerender = false;
try { h42prerender = !!d.prerendering; } catch (e) {}

/* H42-69 · pagehide: hủy WAAPI animations để giải phóng tài nguyên */
on(d, "pagehide", function () {
  try {
    var anims = d.getAnimations ? d.getAnimations() : [];
    anims.forEach(function (a) { if (a.playState === "running") a.cancel(); });
  } catch (e) {}
});

/* H42-69 · volumechange heroVideo → đồng bộ soundToggle */
(function () {
  var v = $("#heroVideo"), t = $("#soundToggle");
  if (!v || !t) return;
  on(v, "volumechange", function () {
    t.setAttribute("aria-pressed", v.muted ? "false" : "true");
  });
})();

/* H42-70 · durationchange heroVideo → aria-label kèm thời lượng */
(function () {
  var v = $("#heroVideo");
  if (!v) return;
  on(v, "durationchange", function () {
    if (!v.duration || !isFinite(v.duration)) return;
    var s = Math.round(v.duration);
    v.setAttribute("aria-label", "Hero background video, " + Math.floor(s / 60) + " minutes " + (s % 60) + " seconds");
  });
})();

/* H42-72 · compositionend (IME) rồi mới lọc — H42-73 search event reset */
(function () {
  var input = $("#clipSearch");
  if (!input) return;
  var composing = false;
  on(input, "compositionstart", function () { composing = true; });
  on(input, "compositionend", function () { /* H42-72 */
    composing = false;
    try { input.dispatchEvent(new w.Event("input", { bubbles: true })); } catch (e) {}
  });
  on(input, "search", function () { /* H42-73 · nút × native */
    if (!input.value) { try { input.dispatchEvent(new w.Event("input", { bubbles: true })); } catch (e) {} }
  });
  input.dataset.h42ime = "1";
})();

/* H42-77 · copy .clip-no → toast */
(function () {
  on(d, "copy", function (e) {
    var t = e.target;
    var no = t && t.closest ? t.closest(".clip-no") : null;
    if (!no) return;
    var toast = $("#toast");
    if (toast) {
      toast.textContent = "Clip code copied: " + (no.textContent || "").trim();
      toast.classList.add("show");
      setTimeout(function () { toast.classList.remove("show"); }, 1800);
    }
  });
})();

/* H42-79/80 · enter/leave PiP → class .h42-pip (biến thể JS của H22-55) */
(function () {
  $$(".card-video").forEach(function (v) {
    var card = v.closest ? v.closest(".clip-card") : null;
    if (!card) return;
    on(v, "enterpictureinpicture", function () { card.classList.add("h42-pip"); });   /* H42-79 */
    on(v, "leavepictureinpicture", function () { card.classList.remove("h42-pip"); }); /* H42-80 */
  });
})();

/* H42-81 · heroVideo aria-description */
(function () {
  var v = $("#heroVideo");
  if (v && !v.getAttribute("aria-description"))
    v.setAttribute("aria-description", "Cinematic 4K background plate, muted autoplay loop");
})();

/* H42-82 · newsletterEmail autocapitalize off */
(function () {
  var em = $("#newsletterEmail");
  if (em && !em.getAttribute("autocapitalize")) em.setAttribute("autocapitalize", "off");
})();

/* H42-83 · journal-card img lazy + async */
$$(".journal-card img").forEach(function (img) {
  if (!img.getAttribute("loading")) img.setAttribute("loading", "lazy");
  if (!img.getAttribute("decoding")) img.setAttribute("decoding", "async");
});

/* H42-84 · openCompare aria-expanded sync */
(function () {
  var btn = $("#openCompare"), modal = $("#compareModal");
  if (!btn || !modal || !w.MutationObserver) return;
  function sync() { btn.setAttribute("aria-expanded", modal.hidden ? "false" : "true"); }
  sync();
  new w.MutationObserver(sync).observe(modal, { attributes: true, attributeFilter: ["hidden"] });
})();

/* H42-86 · contactTier aria-label */
(function () {
  var s = $("#contactTier");
  if (s && !s.getAttribute("aria-label")) s.setAttribute("aria-label", "Choose a license tier for your inquiry");
})();

/* H42-87 · newsletterEmail inputmode email */
(function () {
  var em = $("#newsletterEmail");
  if (em && !em.getAttribute("inputmode")) em.setAttribute("inputmode", "email");
})();

/* H42-88 · contactEmail inputmode email */
(function () {
  var em = $("#contactEmail");
  if (em && !em.getAttribute("inputmode")) em.setAttribute("inputmode", "email");
})();

/* H42-89 · compare-slots aria-label */
(function () {
  var s = $("#compareSlots");
  if (s && !s.getAttribute("aria-label")) s.setAttribute("aria-label", "Comparison slots, pick up to two clips");
})();

/* H42-90 · cine-grain aria-hidden */
$$(".cine-grain").forEach(function (g) { g.setAttribute("aria-hidden", "true"); });

/* H42-91 · cursor dot/ring aria-hidden */
$$(".cursor-dot, .cursor-ring").forEach(function (c) { c.setAttribute("aria-hidden", "true"); });

/* H42-95 · newsletterEmail enterkeyhint send */
(function () {
  var em = $("#newsletterEmail");
  if (em && !em.getAttribute("enterkeyhint")) em.setAttribute("enterkeyhint", "send");
})();

/* H42-96 · contactName autocomplete name */
(function () {
  var n = $("#contactName");
  if (n && !n.getAttribute("autocomplete")) n.setAttribute("autocomplete", "name");
})();

/* H42-97 · likedCount aria-live — SR nghe số lượt thích đổi */
(function () {
  var el = $("#likedCount");
  if (el) {
    if (!el.getAttribute("aria-live")) el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
  }
})();

/* H42-98 · view-tab aria-pressed sync */
(function () {
  var tabs = $$(".view-tab");
  if (!tabs.length) return;
  function sync() {
    tabs.forEach(function (t) { t.setAttribute("aria-pressed", t.classList.contains("active") ? "true" : "false"); });
  }
  sync();
  tabs.forEach(function (t) { on(t, "click", function () { setTimeout(sync, 30); }); });
})();

/* H42-99 · title tooltip cho utility buttons */
[["#soundToggle", "Toggle ambient sound"], ["#likedQuick", "Show liked clips"],
 ["#cartQuick", "Open license cart"], ["#themeToggle", "Toggle theme"],
 ["#langToggle", "Switch language"]].forEach(function (pair) {
  var el = $(pair[0]);
  if (el && !el.getAttribute("title")) el.setAttribute("title", pair[1]);
});

/* H42-100 · boot flag để CSS/đo lường biết hunter42 đã chạy */
try { d.documentElement.classList.add("h42-boot"); } catch (e) {}

})();
