/* ============================================================
   plates-effect-hunter — LƯỢT #47 (STAGED, CHƯA PUSH)
   Nguồn (luân phiên): dev.to + blog thiết kế web.
   0 byte <head>. Mọi selector đã verify trên live index.html 125.153B.
   IIFE + defensive guards; không đụng 9 clip / pricing / tính năng gốc.
   ============================================================ */
(function () {
"use strict";
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

/* RM gate (H47-48) + save-data + fine pointer */
var RMQ = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null;
function syncRM() { document.documentElement.classList.toggle("h47-nomotion", !!(RMQ && RMQ.matches)); }
syncRM(); if (RMQ && RMQ.addEventListener) RMQ.addEventListener("change", syncRM);
function noMotion() { return document.documentElement.classList.contains("h47-nomotion"); }
var SAVE_DATA = !!(navigator.connection && navigator.connection.saveData);
var SLOW2G = !!(navigator.connection && /^(slow-2g|2g)$/.test(navigator.connection.effectiveType || ""));
var FINE = window.matchMedia ? matchMedia("(hover: hover) and (pointer: fine)").matches : false;
var hasVT = typeof document.startViewTransition === "function";
if (SLOW2G) document.documentElement.classList.add("h47-nomotion"); /* H47-73 J57 */

/* SR live region dùng chung (J34/J35) */
var srLive = document.createElement("div");
srLive.id = "h47-sr-live"; srLive.className = "h47-vh";
srLive.setAttribute("aria-live", "polite"); srLive.setAttribute("role", "status");
function mountSR() { if (!srLive.parentNode && document.body) document.body.appendChild(srLive); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountSR);
else mountSR();
function announce(msg) { mountSR(); srLive.textContent = ""; setTimeout(function () { srLive.textContent = msg; }, 30); }

/* Bọc click trong View Transition rồi re-dispatch cho handler gốc (H47-05/06/07) */
function vtWrap(btn, types) {
  if (!btn || !hasVT) return false;
  var busy = false;
  btn.addEventListener("click", function (e) {
    if (busy || noMotion()) return;
    busy = true;
    e.stopImmediatePropagation(); e.preventDefault();
    var fire = function () { btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })); };
    var done = function () { busy = false; };
    try {
      var t;
        try { t = document.startViewTransition({ update: fire, types: types }); }
        catch (_) { t = document.startViewTransition(fire); }
      if (t && t.finished) t.finished.then(done, done); else done();
    } catch (_) { fire(); done(); }
  }, true);
  return true;
}

/* H47-05 · DEV11: theme toggle cross-fade + H47-98 icon xoay */
(function () {
  var tt = $("#themeToggle"); if (!tt) return;
  vtWrap(tt, ["h47-theme"]);
  tt.addEventListener("click", function () {
    tt.classList.remove("h47-spin"); void tt.offsetWidth; tt.classList.add("h47-spin");
    setTimeout(function () { tt.classList.remove("h47-spin"); }, 550);
    var theme = document.documentElement.dataset.theme || "";
    announce(theme === "light" ? "Light theme on" : "Dark theme on"); /* H47-64 J34 */
  });
})();

/* H47-65 J35: lang toggle công bố */
(function () {
  var lt = $("#langToggle"); if (!lt) return;
  lt.addEventListener("click", function () {
    setTimeout(function () {
      var lang = document.documentElement.lang || "en";
      announce(lang.indexOf("vi") === 0 ? "Đã chuyển sang tiếng Việt" : "Switched to English");
      syncTitle(lang); /* H47-91 J94 */
    }, 80);
  });
})();

/* H47-91 J94: document.title song ngữ */
var ORIG_TITLE = document.title;
function syncTitle(lang) {
  if ((lang || "").indexOf("vi") === 0) document.title = "Plates — Video nền điện ảnh 4K";
  else document.title = ORIG_TITLE;
}

/* H47-06 · DEV12: compare modal morph từ card */
(function () {
  var btn = $("#openCompare"); if (!btn || !hasVT) return;
  var busy = false;
  btn.addEventListener("click", function (e) {
    if (busy || noMotion() || btn.disabled) return;
    busy = true; e.stopImmediatePropagation(); e.preventDefault();
    var modal = $("#compareModal"); if (modal) modal.style.viewTransitionName = "h47-modal";
    var fire = function () { btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })); };
    var done = function () { busy = false; if (modal) modal.style.viewTransitionName = ""; };
    try {
      var t; try { t = document.startViewTransition({ update: fire, types: ["h47-modal"] }); }
      catch (_) { t = document.startViewTransition(fire); }
      if (t && t.finished) t.finished.then(done, done); else done();
    } catch (_) { fire(); done(); }
  }, true);
})();

/* H47-07 · DEV13: license modal slide + H47-08 · DEV14: đóng đảo hướng */
(function () {
  var btn = $("#licenseCompare"); if (btn) vtWrap(btn, ["h47-modal"]);
  var busy = false;
  document.addEventListener("click", function (e) {
    if (busy) return;
    var c = e.target && e.target.closest ? e.target.closest(".modal-close") : null;
    if (!c || !hasVT || noMotion()) return;
    var modal = c.closest(".feature-modal, .modal"); if (!modal || modal.hidden) return;
    busy = true;
    e.stopImmediatePropagation(); e.preventDefault();
    /* đánh dấu đóng để CSS đảo hướng (h47-back) */
    try {
      var t;
      try { t = document.startViewTransition({ update: function () { c.click(); }, types: ["h47-modal", "h47-back"] }); }
      catch (_) { t = document.startViewTransition(function () { c.click(); }); }
      var done = function () { busy = false; };
      if (t && t.finished) t.finished.then(done, done); else done();
    } catch (_) { busy = false; c.click(); }
  }, true);
})();

/* H47-09 · DEV15: toggle grid/list cho clip grid */
(function () {
  var grid = $("#clipGrid"), tools = $(".library-tools"); if (!grid || !tools) return;
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "btn ghost h47-viewbtn"; btn.setAttribute("aria-pressed", "false");
  btn.innerHTML = "<span>List view</span>";
  btn.setAttribute("aria-label", "Toggle list view");
  tools.appendChild(btn);
  btn.addEventListener("click", function () {
    var toList = !grid.classList.contains("h47-list");
    var apply = function () {
      grid.classList.toggle("h47-list", toList);
      btn.setAttribute("aria-pressed", String(toList));
      btn.querySelector("span").textContent = toList ? "Grid view" : "List view";
    };
    if (hasVT && !noMotion()) {
      try { document.startViewTransition({ update: apply, types: ["h47-grid"] }); return; } catch (_) {}
    }
    apply();
  });
})();

/* H47-20 · DSG07: CloseWatcher cho modal (Back/Esc như native) */
(function () {
  if (typeof window.CloseWatcher !== "function") return;
  var ids = ["cartModal", "galleryModal", "licenseModal", "articleModal", "modal"];
  var watchers = {};
  var obs = new MutationObserver(function () {
    ids.forEach(function (id) {
      var m = document.getElementById(id); if (!m) return;
      var open = !m.hidden;
      if (open && !watchers[id]) {
        try {
          var w = new CloseWatcher();
          w.addEventListener("close", function () {
            var c = m.querySelector(".modal-close"); if (c) c.click();
          });
          watchers[id] = w;
        } catch (_) {}
      } else if (!open && watchers[id]) {
        try { watchers[id].destroy(); } catch (_) {}
        delete watchers[id];
      }
    });
  });
  obs.observe(document.body, { attributes: true, attributeFilter: ["hidden"], subtree: true });
})();

/* H47-13 · DEV30r: popover "More actions" trong gallery */
(function () {
  var tools = $(".gallery-tools"); if (!tools || !("popover" in document.createElement("div"))) return;
  var btn = document.createElement("button");
  btn.type = "button"; btn.id = "h47-more"; btn.className = "btn ghost";
  btn.setAttribute("popovertarget", "h47-morepop");
  btn.innerHTML = "<span>··· More</span>"; btn.setAttribute("aria-label", "More actions");
  var pop = document.createElement("div");
  pop.id = "h47-morepop"; pop.setAttribute("popover", "");
  pop.innerHTML = '<button type="button" data-h47-act="copy"><span>⧉</span><span>Copy link</span></button>' +
    '<button type="button" data-h47-act="share"><span>↗</span><span>Share</span></button>' +
    '<button type="button" data-h47-act="title"><span>✎</span><span>Copy title</span></button>';
  tools.appendChild(btn); document.body.appendChild(pop);
  function clipURL() {
    var t = ($("#galleryTitle") || {}).textContent || "";
    return location.origin + location.pathname + "#clip=" + encodeURIComponent(t.trim());
  }
  pop.addEventListener("click", function (e) {
    var b = e.target.closest("[data-h47-act]"); if (!b) return;
    var act = b.getAttribute("data-h47-act");
    var title = (($("#galleryTitle") || {}).textContent || "").trim();
    if (act === "copy" && navigator.clipboard) navigator.clipboard.writeText(clipURL()).catch(function () {});
    else if (act === "share" && navigator.share) navigator.share({ title: title, url: clipURL() }).catch(function () {});
    else if (act === "title" && navigator.clipboard && title) navigator.clipboard.writeText(title).catch(function () {});
    pop.hidePopover();
  });
})();

/* H47-22 · DSG12: cursor trail canvas trên hero */
(function () {
  if (!FINE || noMotion() || SAVE_DATA) return;
  var hero = $(".hero"); if (!hero) return;
  var cv = document.createElement("canvas"); cv.className = "h47-trail"; cv.setAttribute("aria-hidden", "true");
  hero.appendChild(cv);
  var ctx = cv.getContext("2d"), pts = [], raf = 0, visible = true;
  function size() { cv.width = hero.clientWidth; cv.height = hero.clientHeight; }
  size(); window.addEventListener("resize", size);
  new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(hero);
  hero.addEventListener("pointermove", function (e) {
    var r = cv.getBoundingClientRect();
    pts.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() });
    if (pts.length > 30) pts.shift();
    if (!raf) raf = requestAnimationFrame(draw);
  }, { passive: true });
  function draw() {
    raf = 0; if (!visible) { ctx.clearRect(0, 0, cv.width, cv.height); return; }
    ctx.clearRect(0, 0, cv.width, cv.height);
    var now = performance.now();
    pts = pts.filter(function (p) { return now - p.t < 600; });
    pts.forEach(function (p, i) {
      var a = (i / pts.length) * 0.55 * (1 - (now - p.t) / 600);
      if (a <= 0) return;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.5 + (i / pts.length) * 3, 0, 7);
      ctx.fillStyle = "rgba(213,183,118," + a.toFixed(3) + ")"; ctx.fill();
    });
    if (pts.length) raf = requestAnimationFrame(draw);
  }
})();

/* H47-23 · DSG14: text shuffle tiêu đề library khi đổi filter */
(function () {
  var h2 = $("#library h2"); if (!h2 || noMotion()) return;
  function shuffle() {
    var text = h2.textContent; h2.setAttribute("aria-label", text);
    var frag = document.createDocumentFragment();
    Array.prototype.forEach.call(text, function (ch) {
      var s = document.createElement("span"); s.textContent = ch; s.setAttribute("aria-hidden", "true");
      s.style.display = "inline-block"; s.style.transition = "transform .3s ease, opacity .3s ease";
      frag.appendChild(s);
    });
    h2.textContent = ""; h2.appendChild(frag);
    var spans = Array.prototype.slice.call(h2.children);
    spans.forEach(function (s, i) {
      setTimeout(function () { s.style.opacity = "0"; s.style.transform = "translateY(8px) rotate(8deg)"; }, i * 12);
    });
    setTimeout(function () {
      spans.forEach(function (s, i) {
        setTimeout(function () { s.style.opacity = "1"; s.style.transform = "none"; }, i * 12);
      });
    }, spans.length * 12 + 120);
  }
  $$(".filter").forEach(function (b) { b.addEventListener("click", shuffle); });
})();

/* H47-24 · DSG15: khóa intent chống double-toggle modal (chỉ click thật, bỏ qua re-dispatch VT) */
(function () {
  var lockUntil = 0;
  document.addEventListener("click", function (e) {
    if (!e.isTrusted) return;
    var t = e.target && e.target.closest ? e.target.closest(".modal-close,#openCompare,#licenseCompare") : null;
    if (!t) return;
    var now = Date.now();
    if (now < lockUntil) { e.stopImmediatePropagation(); e.preventDefault(); return; }
    lockUntil = now + 350;
  }, true);
})();

/* H47-25 · DSG20r: prefetch ảnh modal theo hover intent */
(function () {
  if (SAVE_DATA) return;
  var seen = {};
  document.addEventListener("pointerover", function (e) {
    var card = e.target && e.target.closest ? e.target.closest(".clip-card") : null;
    if (!card) return;
    var img = card.querySelector("img"); if (!img) return;
    var url = img.dataset.full || img.dataset.src || img.currentSrc || img.src;
    if (url && !seen[url]) { seen[url] = 1; var im = new Image(); im.src = url; }
  }, { passive: true });
})();

/* H47-27 · DSG45: swipe hint bounce một lần mỗi session */
(function () {
  if (noMotion() || !FINE && !matchMedia("(pointer: coarse)").matches) return;
  try { if (sessionStorage.getItem("h47-swipehint")) return; } catch (_) {}
  var grid = $("#clipGrid"); if (!grid) return;
  var obs = new MutationObserver(function () {
    var card = grid.querySelector(".clip-card"); if (!card) return;
    obs.disconnect();
    setTimeout(function () {
      card.classList.add("h47-swipehint");
      setTimeout(function () { card.classList.remove("h47-swipehint"); }, 1300);
      try { sessionStorage.setItem("h47-swipehint", "1"); } catch (_) {}
    }, 900);
  });
  obs.observe(grid, { childList: true });
})();

/* H47-28 · DSG47: highlight cột compare khác nhau */
(function () {
  var grid = $("#compareGrid"); if (!grid) return;
  new MutationObserver(function () {
    var cards = $$(".compare-card", grid); if (cards.length !== 2) return;
    var vals = cards.map(function (c) {
      var m = $(".compare-meta", c);
      return ((c.querySelector("h3") || {}).textContent || "") + "|" + (m ? m.textContent : "");
    });
    cards.forEach(function (c, i) {
      var diff = vals[0] !== vals[1];
      c.classList.toggle("h47-diff", diff);
      if (diff) c.setAttribute("data-h47-diff", "Differs from the other clip");
      else c.removeAttribute("data-h47-diff");
    });
  }).observe(grid, { childList: true, subtree: true });
})();

/* H47-29 · C17: mask chỉ khi license-scroll cuộn được */
(function () {
  var sc = $(".license-scroll"); if (!sc) return;
  function sync() { sc.classList.toggle("h47-scrollable", sc.scrollWidth > sc.clientWidth + 4); }
  sync();
  if (window.ResizeObserver) new ResizeObserver(sync).observe(sc);
  window.addEventListener("resize", sync);
})();

/* ================= MICRO JS ================= */

/* H47-59 · J24: 404 gợi ý 3 clip (base hiện 404 bằng class .show) */
(function () {
  var nf = $("#notFound"); if (!nf) return;
  var done = false;
  new MutationObserver(function () {
    if (!nf.classList.contains("show") || done) return; done = true;
    var cards = $$("#clipGrid .clip-card").slice(0, 3); if (!cards.length) return;
    var wrap = document.createElement("div"); wrap.className = "h47-suggest";
    var h = document.createElement("p"); h.className = "h47-vh"; h.id = "h47-sugh";
    h.textContent = "Suggested plates"; wrap.appendChild(h);
    wrap.setAttribute("role", "group"); wrap.setAttribute("aria-labelledby", "h47-sugh");
    cards.forEach(function (c, i) {
      var name = ((c.querySelector("h3") || {}).textContent || ("Plate " + (i + 1))).trim();
      var b = document.createElement("button");
      b.type = "button"; b.className = "btn ghost"; b.textContent = name;
      b.addEventListener("click", function () {
        nf.classList.remove("show");
        try { history.replaceState(null, "", location.pathname); } catch (_) {}
        var lib = $("#library"); if (lib) lib.scrollIntoView({ behavior: noMotion() ? "auto" : "smooth" });
        c.classList.add("h47-swipehint"); setTimeout(function () { c.classList.remove("h47-swipehint"); }, 1300);
      });
      wrap.appendChild(b);
    });
    var inner = $(".not-found-inner", nf) || nf; inner.appendChild(wrap);
  }).observe(nf, { attributes: true, attributeFilter: ["class"] });
})();

/* H47-60 · J25: search 0 kết quả → gợi ý từ khóa */
(function () {
  var vc = $("#visibleCount"), input = $("#clipSearch"), tools = $(".library-tools");
  if (!vc || !input || !tools) return;
  var box = null;
  var SUGS = ["Valley", "Ocean", "Machine", "Night", "Rain", "4K"];
  new MutationObserver(function () {
    var m = vc.textContent.match(/\d+/);
    var empty = !!m && parseInt(m[0], 10) === 0; /* tương thích H47-75 đổi text thành "09 of 09 · 100%" */
    if (empty && !box) {
      box = document.createElement("div"); box.className = "h47-nores";
      box.innerHTML = "<span>No plates match — try: </span>";
      SUGS.forEach(function (s) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "filter"; b.textContent = s;
        b.addEventListener("click", function () {
          input.value = s; input.dispatchEvent(new Event("input", { bubbles: true })); input.focus();
        });
        box.appendChild(b);
      });
      tools.appendChild(box);
    } else if (!empty && box) { box.remove(); box = null; }
  }).observe(vc, { childList: true, characterData: true, subtree: true });
})();

/* H47-61/62 · J29/J30: badge pulse khi count đổi */
[["#likedCount", "H47-61"], ["#cartCount", "H47-62"]].forEach(function (pair) {
  var el = $(pair[0]); if (!el) return;
  new MutationObserver(function () {
    el.classList.remove("h47-pulse"); void el.offsetWidth; el.classList.add("h47-pulse");
    setTimeout(function () { el.classList.remove("h47-pulse"); }, 650);
  }).observe(el, { childList: true, characterData: true, subtree: true });
});

/* H47-63 · J31 + H47-82 · J72: toast progress + gộp toast dồn dập */
(function () {
  var toast = $("#toast"); if (!toast) return;
  var bar = document.createElement("div"); bar.setAttribute("aria-hidden", "true");
  bar.style.cssText = "height:2px;background:var(--gold-2);width:0;transition:width 2.6s linear;margin-top:6px;";
  toast.appendChild(bar);
  var lastTime = 0, lastTxt = "", merges = 0, selfEdit = false;
  function restartBar() {
    bar.style.transition = "none"; bar.style.width = "0";
    void bar.offsetWidth; bar.style.transition = "width 2.6s linear"; bar.style.width = "100%";
  }
  new MutationObserver(function () {
    if (selfEdit) { selfEdit = false; restartBar(); return; }
    var txt = toast.textContent.trim();
    if (!txt || txt === lastTxt) { restartBar(); return; }
    var now = Date.now();
    if (now - lastTime < 900 && merges < 2 && lastTxt) {
      merges++; selfEdit = true;
      Array.prototype.slice.call(toast.childNodes).forEach(function (n) { if (n !== bar) n.remove(); });
      var merged = lastTxt + " · " + txt;
      toast.insertBefore(document.createTextNode(merged), bar);
      lastTxt = merged;
    } else { merges = 0; lastTxt = txt; }
    lastTime = now;
    restartBar();
  }).observe(toast, { childList: true, subtree: true });
})();

/* H47-66 · J37: inert nền khi gallery/license/article mở (nối H46-45) */
(function () {
  ["galleryModal", "licenseModal", "articleModal"].forEach(function (id) {
    var m = document.getElementById(id); if (!m) return;
    new MutationObserver(function () {
      var open = !m.hidden;
      ["main", "footer"].forEach(function (sel) {
        var el = $(sel); if (!el || el.contains(m)) return;
        if (open) el.setAttribute("inert", ""); else el.removeAttribute("inert");
      });
    }).observe(m, { attributes: true, attributeFilter: ["hidden"] });
  });
})();

/* H47-67 · J44: "back to results" trong gallery */
(function () {
  var input = $("#clipSearch"), tools = $(".gallery-tools"), modal = $("#galleryModal");
  if (!input || !tools || !modal) return;
  var btn = null;
  input.addEventListener("input", function () {
    var q = input.value.trim();
    if (q && !btn) {
      btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn ghost"; btn.innerHTML = "<span>← Back to results</span>";
      btn.addEventListener("click", function () {
        var c = modal.querySelector(".modal-close"); if (c) c.click(); else modal.hidden = true;
        input.focus();
      });
      tools.appendChild(btn);
    } else if (!q && btn) { btn.remove(); btn = null; }
  });
})();

/* H47-68 · J45: describedby cho search */
(function () {
  var input = $("#clipSearch"); if (!input) return;
  var hint = document.createElement("span");
  hint.id = "h47-searchhint"; hint.className = "h47-vh";
  hint.textContent = "Search 9 plates by title, mood or description.";
  input.after(hint); input.setAttribute("aria-describedby", "h47-searchhint");
  input.setAttribute("aria-controls", "clipGrid"); /* H47-96 J98 */
})();

/* H47-69 · J46: footer-mark role img */
(function () { var f = $(".footer-mark"); if (f) { f.setAttribute("role", "img"); f.setAttribute("aria-label", "Plates Studio mark"); } })();
/* H47-86 · J88: collections aria-label */
(function () { var c = $("#collections"); if (c && !c.getAttribute("aria-label")) c.setAttribute("aria-label", "Collections"); })();
/* H47-100: aria-labelledby cho voices/journal/craft */
[["#voices"], ["#journal"], ["#craft"]].forEach(function (pair) {
  var s = $(pair[0]); if (!s || s.getAttribute("aria-labelledby")) return;
  var h = s.querySelector("h2"); if (!h) return;
  if (!h.id) h.id = "h47-" + pair[0].slice(1) + "-h";
  s.setAttribute("aria-labelledby", h.id);
});
/* H47-89 · J92: progress trang trí ẩn khỏi AT */
(function () { var p = $("#progress"); if (p) p.setAttribute("aria-hidden", "true"); })();

/* H47-70 · J51: hint theo tier */
(function () {
  var sel = $("#contactTier"); if (!sel) return;
  var HINTS = {
    Personal: "Personal license — 1 personal project, no monetized publishing.",
    Commercial: "Commercial license — up to 5 projects, client work included.",
    Extended: "Extended license — unlimited projects, paid advertising included."
  };
  var p = document.createElement("p"); p.className = "h47-tierhint"; p.style.cssText = "font-size:.78rem;color:var(--muted);margin:6px 0 0;";
  sel.after(p);
  function sync() { p.textContent = HINTS[sel.value] || HINTS[sel.options[sel.selectedIndex].text] || ""; }
  sel.addEventListener("change", sync); sync();
  sel.setAttribute("aria-describedby", p.id || (p.id = "h47-tierhint"));
})();

/* H47-71 · J52: newsletter realtime valid */
(function () {
  var em = $("#newsletterEmail"); if (!em) return;
  em.addEventListener("input", function () {
    em.classList.toggle("h47-valid", em.value !== "" && em.checkValidity());
  });
})();

/* H47-72 · J56: prefetch ảnh clip khi gallery mở */
(function () {
  var g = $("#galleryModal"); if (!g || SAVE_DATA) return;
  new MutationObserver(function () {
    if (g.hidden) return;
    $$("#clipGrid .clip-card img").forEach(function (img) {
      var u = img.currentSrc || img.src; if (u) { var im = new Image(); im.src = u; }
    });
  }).observe(g, { attributes: true, attributeFilter: ["hidden"] });
})();

/* H47-74 · J58: visibleCount thêm phần trăm */
(function () {
  var vc = $("#visibleCount"); if (!vc) return;
  new MutationObserver(function () {
    var n = parseInt(vc.textContent, 10); if (isNaN(n)) return;
    var total = $$("#clipGrid .clip-card").length || 9;
    var pct = Math.round((n / total) * 100);
    var want = String(n).padStart(2, "0") + " of " + String(total).padStart(2, "0") + " · " + pct + "%";
    if (vc.textContent !== want) vc.textContent = want;
  }).observe(vc, { childList: true, characterData: true, subtree: true });
})();

/* H47-75 · J59: aria-busy cho grid khi lọc */
(function () {
  var grid = $("#clipGrid"); if (!grid) return;
  function busy() {
    grid.setAttribute("aria-busy", "true");
    clearTimeout(busy.t); busy.t = setTimeout(function () { grid.setAttribute("aria-busy", "false"); }, 220);
  }
  $$(".filter").forEach(function (b) { b.addEventListener("click", busy); });
  var si = $("#clipSearch"); if (si) si.addEventListener("input", busy);
})();

/* H47-76 · J63: Esc + trả focus cho article modal */
/* H47-77 · J64: Esc + trả focus cho license modal */
/* was: H47-76/77 · J63/J64: Esc + trả focus cho article/license modal */
[["#articleModal"], ["#licenseModal"]].forEach(function (pair) {
  var m = $(pair[0]); if (!m) return;
  var opener = null;
  new MutationObserver(function () {
    if (!m.hidden) { opener = document.activeElement; }
    else if (opener && opener.focus) { try { opener.focus({ preventScroll: true }); } catch (_) {} opener = null; }
  }).observe(m, { attributes: true, attributeFilter: ["hidden"] });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !m.hidden) {
      var c = m.querySelector(".modal-close"); if (c) c.click();
    }
  });
});

/* H47-78 · J65: swipe gallery */
(function () {
  var media = $("#galleryMedia"); if (!media) return;
  var x0 = 0, y0 = 0;
  media.addEventListener("touchstart", function (e) {
    var t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY;
  }, { passive: true });
  media.addEventListener("touchend", function (e) {
    var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
    if (Math.abs(dx) > 48 && Math.abs(dy) < 32) {
      var b = $(dx < 0 ? "#galleryNext" : "#galleryPrev");
      if (b && !b.disabled) b.click();
    }
  }, { passive: true });
})();

/* H47-79 · J66: autosave contact draft */
(function () {
  var form = $("#contactForm"); if (!form) return;
  var KEY = "h47-contact-draft", t;
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        name: $("#contactName") ? $("#contactName").value : "",
        email: $("#contactEmail") ? $("#contactEmail").value : "",
        plate: $("#contactPlate") ? $("#contactPlate").value : "",
        project: $("#contactProject") ? $("#contactProject").value : ""
      }));
    } catch (_) {}
  }
  form.addEventListener("input", function () { clearTimeout(t); t = setTimeout(save, 600); });
  try {
    var d = JSON.parse(localStorage.getItem(KEY) || "null");
    if (d) {
      if (d.name && $("#contactName") && !$("#contactName").value) $("#contactName").value = d.name;
      if (d.email && $("#contactEmail") && !$("#contactEmail").value) $("#contactEmail").value = d.email;
      if (d.plate && $("#contactPlate") && !$("#contactPlate").value) $("#contactPlate").value = d.plate;
      if (d.project && $("#contactProject") && !$("#contactProject").value) $("#contactProject").value = d.project;
    }
  } catch (_) {}
  form.addEventListener("submit", function () { try { localStorage.removeItem(KEY); } catch (_) {} });
})();

/* H47-80 · J67: chống double submit newsletter */
(function () {
  var form = $("#newsletterForm"); if (!form) return;
  form.addEventListener("submit", function () {
    var b = form.querySelector('[type="submit"]'); if (!b || b.disabled) return;
    b.disabled = true; setTimeout(function () { b.disabled = false; }, 6000);
  });
})();
/* H47-97 · J99: contact submit loading */
(function () {
  var form = $("#contactForm"); if (!form) return;
  form.addEventListener("submit", function () {
    var b = form.querySelector('[type="submit"]'); if (!b || b.disabled) return;
    var orig = b.innerHTML; b.disabled = true;
    b.innerHTML = "<span>Sending…</span>";
    setTimeout(function () { b.disabled = false; b.innerHTML = orig; }, 5000);
  });
})();

/* H47-81 · J70: filter chips aria-pressed (trừ nút Reset) */
(function () {
  var chips = $$(".filter[data-filter]");
  chips.forEach(function (b) {
    b.setAttribute("aria-pressed", b.classList.contains("active") ? "true" : "false");
    b.addEventListener("click", function () {
      chips.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    });
  });
})();

/* H47-83 · J73: toast sau khi bấm cartRequest */
(function () {
  var b = $("#cartRequest"), toast = $("#toast"); if (!b || !toast) return;
  b.addEventListener("click", function () {
    setTimeout(function () { toast.textContent = "Opening your email app to request licenses…"; }, 350);
  });
})();

/* H47-84 · J85: video card lỗi → poster fallback */
(function () {
  var grid = $("#clipGrid"); if (!grid) return;
  grid.addEventListener("error", function (e) {
    var v = e.target;
    if (v && v.tagName === "VIDEO" && !v.dataset.h47fb) {
      v.dataset.h47fb = "1";
      var img = document.createElement("img");
      img.src = v.getAttribute("poster") || ""; img.alt = ""; img.style.width = "100%";
      v.replaceWith(img);
    }
  }, true);
})();

/* H47-85 · J87: nút reset filter */
(function () {
  var box = $(".filters"), input = $("#clipSearch"); if (!box) return;
  var b = document.createElement("button");
  b.type = "button"; b.className = "filter h47-reset"; b.textContent = "Reset"; b.hidden = true;
  b.setAttribute("aria-label", "Reset filters and search");
  box.appendChild(b);
  function sync() {
    var active = $(".filter.active") && $(".filter.active").dataset.filter !== "all";
    b.hidden = !(active || (input && input.value.trim()));
  }
  b.addEventListener("click", function () {
    var all = $('.filter[data-filter="all"]'); if (all) all.click();
    if (input) { input.value = ""; input.dispatchEvent(new Event("input", { bubbles: true })); }
    sync();
  });
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".filter")) setTimeout(sync, 60); });
  if (input) input.addEventListener("input", sync);
})();

/* H47-87 · J90: video modal/gallery muted mặc định */
[$("#modalVideo"), $("#galleryVideo")].forEach(function (v) {
  if (v) { v.muted = true; v.defaultMuted = true; }
});

/* H47-88 · J91: aria-label Like/Unlike đồng bộ */
(function () {
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      var b = m.target;
      if (!b.classList || !b.classList.contains("favorite")) return;
      var pressed = b.getAttribute("aria-pressed") === "true";
      var label = b.getAttribute("aria-label") || "";
      var name = label.replace(/^(Like|Unlike)\s+/, "") || "clip";
      b.setAttribute("aria-label", (pressed ? "Unlike " : "Like ") + name);
    });
  }).observe(document.body, { attributes: true, attributeFilter: ["aria-pressed"], subtree: true });
})();

/* H47-90 · J93: maxlength cho input */
(function () {
  var rules = [["#newsletterEmail", 254], ["#contactEmail", 254], ["#contactName", 80], ["#contactPlate", 60]];
  rules.forEach(function (r) { var el = $(r[0]); if (el && !el.maxLength) el.maxLength = r[1]; });
})();

/* H47-92 · J95: title đếm clip mỗi filter */
(function () {
  function sync() {
    var counts = {};
    $$("#clipGrid .clip-card").forEach(function (c) {
      var f = c.dataset.group || "all"; /* card dùng data-group = valley|machine|ocean (khớp data-filter) */
      counts[f] = (counts[f] || 0) + 1;
    });
    $$(".filter[data-filter]").forEach(function (b) {
      var f = b.dataset.filter, n = f === "all" ? $$("#clipGrid .clip-card").length : (counts[f] || 0);
      b.title = b.textContent.trim() + " · " + n + " plate" + (n === 1 ? "" : "s");
    });
  }
  var grid = $("#clipGrid");
  if (grid) new MutationObserver(function () { setTimeout(sync, 300); }).observe(grid, { childList: true });
  setTimeout(sync, 1500);
})();

/* H47-93 · J62: data-label cho license table mobile */
(function () {
  var tbl = $(".license-table"); if (!tbl) return;
  var heads = $$("thead th", tbl).map(function (th) { return th.textContent.trim(); });
  $$("tbody tr", tbl).forEach(function (tr) {
    $$("td", tr).forEach(function (td, i) {
      if (!td.getAttribute("data-h47-label") && heads[i]) td.setAttribute("data-h47-label", heads[i]);
    });
  });
})();

/* H47-94 · J96: menu mở → focus link đầu */
/* H47-95 · J97: menu đóng → trả focus */
/* was: H47-94/95 · J96/J97: menu focus vào/ra */
(function () {
  var btn = $(".menu-btn"), nav = $(".nav-links"); if (!btn || !nav) return;
  new MutationObserver(function () {
    var open = btn.getAttribute("aria-expanded") === "true";
    if (open) {
      var first = nav.querySelector("a, button"); if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
    } else if (document.activeElement && nav.contains(document.activeElement)) {
      btn.focus({ preventScroll: true });
    }
  }).observe(btn, { attributes: true, attributeFilter: ["aria-expanded"] });
})();

})();
