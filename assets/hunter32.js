/* hunter32.js — Plates Luxury · lượt #32 (13/10/2026)
   Staged local. KHÔNG push GitHub khi chưa có lệnh "up".
   Mọi block đều null-check + feature-detect. Tôn trọng prefers-reduced-motion.
   Không credit AI. Giữ 9 clip + $29/$79/$199. */
(function () {
  "use strict";
  var RM = false, FINE = false, SAVE = false;
  try {
    RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
    FINE = matchMedia("(pointer:fine) and (hover:hover)").matches;
    SAVE = (navigator.connection && navigator.connection.saveData) || matchMedia("(prefers-reduced-data: reduce)").matches;
  } catch (_) {}
  function $(s, c) { try { return (c || document).querySelector(s); } catch (_) { return null; } }
  function $$(s, c) { try { return Array.prototype.slice.call((c || document).querySelectorAll(s)); } catch (_) { return []; } }
  function on(el, ev, fn, opt) { if (el && el.addEventListener) el.addEventListener(ev, fn, opt || false); }

  /* ============ H32-03 · CP06 Emblem — chèn medallion vào footer-mark ============ */
  (function () {
    var mark = $(".footer-mark");
    if (!mark || $(".h32-emblem", mark)) return;
    var svgNS = "http://www.w3.org/2000/svg";
    try {
      var svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("class", "h32-emblem");
      svg.setAttribute("viewBox", "0 0 54 54");
      svg.setAttribute("aria-hidden", "true");
      svg.innerHTML = '<circle cx="27" cy="27" r="25" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<circle cx="27" cy="27" r="19" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 4"/>' +
        '<text x="27" y="35" text-anchor="middle" font-size="20" fill="currentColor" font-family="Georgia,serif">P</text>';
      mark.insertBefore(svg, mark.firstChild);
    } catch (_) {}
  })();

  /* ============ H32-04 · CP10 Color fan — mood chips xòe quạt khi hover rail ============ */
  (function () {
    if (!FINE || RM) return;
    var row = $(".mood-row");
    if (!row) return;
    var chips = $$(".mood-chip", row);
    if (chips.length < 3) return;
    row.classList.add("h32-fan");
    chips.forEach(function (chip, i) {
      var mid = (chips.length - 1) / 2;
      chip.style.setProperty("--h32-fan", ((i - mid) * 7).toFixed(1) + "deg");
    });
  })();

  /* ============ H32-07 · CP18 Kéo xoay poster gallery 360° ============ */
  (function () {
    if (!FINE || RM) return;
    var media = $("#galleryMedia") || $(".gallery-media");
    if (!media) return;
    var dragging = false, sx = 0, rot = 0;
    on(media, "pointerdown", function (e) {
      if (e.target.closest("button,a")) return;
      dragging = true; sx = e.clientX;
      media.classList.add("h32-dragging");
      try { media.setPointerCapture(e.pointerId); } catch (_) {}
    });
    on(media, "pointermove", function (e) {
      if (!dragging) return;
      rot = Math.max(-28, Math.min(28, rot + (e.clientX - sx) * 0.25));
      sx = e.clientX;
      media.style.transform = "perspective(900px) rotateY(" + rot.toFixed(1) + "deg)";
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      media.classList.remove("h32-dragging");
      media.style.transition = "transform .5s cubic-bezier(.2,.75,.25,1)";
      media.style.transform = "";
      setTimeout(function () { media.style.transition = ""; }, 520);
    }
    on(media, "pointerup", end);
    on(media, "pointercancel", end);
  })();

  /* ============ H32-15 · CP11 Badge giỏ hàng "đang ghi hình" — bật khi thêm/xóa ============ */
  (function () {
    var badge = $("#cartCount");
    if (!badge) return;
    var t = null;
    function blink() {
      badge.classList.add("h32-rec");
      if (t) clearTimeout(t);
      t = setTimeout(function () { badge.classList.remove("h32-rec"); }, 2600);
    }
    document.addEventListener("h32-cartchange", blink);
    // Hook vào nút add-cart hiện có (không phá logic base)
    $$(".add-cart").forEach(function (btn) {
      on(btn, "click", function () {
        setTimeout(function () {
          document.dispatchEvent(new CustomEvent("h32-cartchange"));
        }, 60);
      });
    });
  })();

  /* ===== H32-21 → H32-40 · research subagent GH/YT (đã dedup kỹ) ===== */

  /* ============ H32-27 · GH#24 Đồng bộ colorScheme khi toggle theme ============ */
  (function () {
    var tgl = $("#themeToggle");
    if (!tgl) return;
    function sync() {
      try {
        var dark = document.documentElement.getAttribute("data-theme") === "dark";
        document.documentElement.style.colorScheme = dark ? "dark" : "light";
      } catch (_) {}
    }
    on(tgl, "click", function () { setTimeout(sync, 60); });
    sync();
  })();

  /* ============ H32-28 · GH#27 role="doc-chapter" cho journal ============ */
  (function () {
    $$(".journal-card").forEach(function (card, i) {
      if (card.getAttribute("role")) return;
      card.setAttribute("role", "doc-chapter");
      var h = $("h3", card);
      if (h) {
        if (!h.id) h.id = "h32-ch" + (i + 1);
        card.setAttribute("aria-labelledby", h.id);
      }
    });
  })();

  /* ============ H32-30 · GH#20 Gộp preconnect trùng (runtime guard + sửa file khi up) ============ */
  (function () {
    try {
      var seen = {};
      $$('link[rel="preconnect"]').forEach(function (l) {
        var h = l.getAttribute("href") || "";
        if (seen[h]) l.remove();
        else seen[h] = 1;
      });
    } catch (_) {}
    /* Khi "up": xóa 1 trong 2 dòng preconnect catbox trùng trong index.html (dòng 2). */
  })();

  /* ============ H32-33 · YT-D29 Compare crosshair cho license table ============ */
  (function () {
    if (!FINE || RM) return;
    var table = $(".license-table");
    if (!table) return;
    function clear() { $$(".h32-cross", table).forEach(function (c) { c.classList.remove("h32-cross"); }); }
    $$("tbody td", table).forEach(function (td) {
      on(td, "mouseenter", function () {
        clear();
        var tr = td.parentNode, idx = Array.prototype.indexOf.call(tr.children, td);
        if (tr) tr.classList.add("h32-cross");
        $$("tr", table).forEach(function (r) {
          var c = r.children[idx];
          if (c) c.classList.add("h32-cross");
        });
      });
    });
    on(table, "mouseleave", clear);
  })();

  /* ============ H32-34 · YT-D10 Error summary box cho contact form ============ */
  (function () {
    var form = $("#contactForm");
    if (!form) return;
    function build() {
      var box = $("#h32ErrBox");
      if (!box) {
        box = document.createElement("div");
        box.id = "h32ErrBox";
        box.className = "h32-errbox";
        box.setAttribute("role", "alert");
        form.parentNode.insertBefore(box, form);
      }
      return box;
    }
    on(form, "submit", function (e) {
      if (form.checkValidity && form.checkValidity()) {
        var old = $("#h32ErrBox");
        if (old) old.remove();
        return;
      }
      e.preventDefault();
      var box = build();
      var items = [];
      $$("input, textarea, select", form).forEach(function (f) {
        if (f.willValidate && !f.validity.valid) {
          var label = (f.getAttribute("aria-label") || f.name || f.id || "field");
          if (!f.id) f.id = "h32-f" + Math.floor(Math.random() * 1e6);
          items.push('<li><a href="#' + f.id + '">' + label + "</a></li>");
        }
      });
      box.innerHTML = "<strong>Please review " + items.length + " field" + (items.length > 1 ? "s" : "") + ":</strong><ul>" + items.join("") + "</ul>";
      var first = $("input, textarea, select", form);
      if (first && first.id) { var l = box.querySelector("a"); if (l) l.focus(); }
    });
  })();

  /* ============ H32-37 · YT-D05 Sticky plan bar khi cuộn qua pricing ============ */
  (function () {
    var pricing = $("#pricing");
    if (!pricing || !("IntersectionObserver" in window)) return;
    var bar = document.createElement("div");
    bar.className = "h32-planbar";
    bar.setAttribute("aria-hidden", "true");
    bar.innerHTML = '<span>Plates — from <b>$29</b></span><a href="#pricing">View licensing</a>';
    document.body.appendChild(bar);
    var past = false;
    new IntersectionObserver(function (entries) {
      var vis = entries[0].isIntersecting;
      var show = !vis && past;
      bar.classList.toggle("h32-show", show);
      bar.setAttribute("aria-hidden", show ? "false" : "true");
    }, { threshold: 0 }).observe(pricing);
    on(window, "scroll", function () {
      var r = pricing.getBoundingClientRect();
      past = r.bottom < 0;
    }, { passive: true });
  })();

  /* ============ H32-40 · YT-D01 Gallery poster enter morph ============ */
  (function () {
    if (RM) return;
    var modal = $("#galleryModal");
    if (!modal || !("MutationObserver" in window)) return;
    new MutationObserver(function () {
      if (!modal.classList.contains("open")) return;
      var img = $("#galleryImage");
      if (!img) return;
      img.classList.remove("h32-morph");
      void img.offsetWidth;
      img.classList.add("h32-morph");
    }).observe(modal, { attributes: true, attributeFilter: ["class"] });
  })();

  /* ============ H32-66 · Honeypot chống spam newsletter ============ */
  (function () {
    var form = $("#newsletterForm");
    if (!form) return;
    var hp = document.createElement("input");
    hp.type = "text"; hp.name = "h32_company"; hp.tabIndex = -1;
    hp.setAttribute("aria-hidden", "true"); hp.autocomplete = "off";
    hp.style.cssText = "position:absolute!important;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;";
    form.appendChild(hp);
    on(form, "submit", function (e) {
      if (hp.value) { e.preventDefault(); e.stopImmediatePropagation(); }
    });
  })();

  /* ============ H32-67 · Nút "Print receipt" trong giỏ ============ */
  (function () {
    var modal = $("#cartModal");
    if (!modal) return;
    function ensure() {
      if ($("#h32PrintBtn")) return;
      var btn = document.createElement("button");
      btn.type = "button"; btn.id = "h32PrintBtn"; btn.className = "btn ghost";
      btn.textContent = "Print receipt";
      on(btn, "click", function () { try { window.print(); } catch (_) {} });
      var total = $(".cart-total", modal) || modal;
      total.parentNode.insertBefore(btn, total.nextSibling);
    }
    if ("MutationObserver" in window) {
      new MutationObserver(function () {
        if (modal.classList.contains("open")) ensure();
      }).observe(modal, { attributes: true, attributeFilter: ["class"] });
    }
  })();

  /* ============ H32-68 · FAQ mở tất cả / thu gọn tất cả ============ */
  (function () {
    var list = $(".faq-list");
    if (!list) return;
    var bar = document.createElement("div");
    bar.className = "h32-faqbar";
    bar.innerHTML = '<button type="button" class="h32-faqall" data-h32-open="1">Expand all</button>' +
      '<span aria-hidden="true"> · </span>' +
      '<button type="button" class="h32-faqall" data-h32-open="0">Collapse all</button>';
    list.parentNode.insertBefore(bar, list);
    $$(".h32-faqall", bar).forEach(function (btn) {
      on(btn, "click", function () {
        var openIt = btn.getAttribute("data-h32-open") === "1";
        $$("details", list).forEach(function (d) { d.open = openIt; });
      });
    });
  })();

  /* ============ H32-69 · Click mailto link → copy email ============ */
  (function () {
    function emailOf(a) {
      var href = a.getAttribute("href") || "";
      var m = href.match(/^mailto:([^?]+)/);
      return m ? m[1] : null;
    }
    $$('a[href^="mailto:"]').forEach(function (a) {
      if (a.id === "cartRequest" || a.id === "modalMail") return; // giữ hành vi gốc
      on(a, "click", function (e) {
        var em = emailOf(a);
        if (!em || !navigator.clipboard) return;
        e.preventDefault();
        navigator.clipboard.writeText(em).then(function () {
          a.setAttribute("data-h32-copied", "1");
          setTimeout(function () { a.removeAttribute("data-h32-copied"); }, 1600);
        }).catch(function () { window.location.href = a.href; });
      });
    });
  })();

  /* ============ H32-70 · Thanh progress đọc bài #articleModal (phần JS) ============ */
  (function () {
    var modal = $("#articleModal"), body = $("#articleBody");
    if (!modal || !body) return;
    var bar = document.createElement("div");
    bar.className = "h32-readbar"; bar.setAttribute("aria-hidden", "true");
    var card = $(".modal-card", modal) || modal;
    card.insertBefore(bar, card.firstChild);
    function tick() {
      var max = body.scrollHeight - body.clientHeight;
      var p = max > 0 ? body.scrollTop / max : 0;
      bar.style.transform = "scaleX(" + Math.max(0, Math.min(1, p)).toFixed(3) + ")";
    }
    on(body, "scroll", function () { requestAnimationFrame(tick); }, { passive: true });
  })();

  /* ============ H32-71 · #contactTier đổi → highlight .stack-panel tương ứng ============ */
  (function () {
    var sel = $("#contactTier");
    if (!sel) return;
    var panels = $$(".stack-panel");
    if (!panels.length) return;
    function sync() {
      var v = (sel.value || "").toLowerCase();
      panels.forEach(function (p) {
        var t = (p.textContent || "").toLowerCase();
        var hit = v && (t.indexOf(v) > -1 || (v.indexOf("single") > -1 && t.indexOf("$29") > -1));
        p.classList.toggle("h32-tierhit", !!hit);
      });
    }
    on(sel, "change", sync);
    sync();
  })();

  /* ============ H32-72 · Nút back đóng modal/menu đang mở ============ */
  (function () {
    var modals = ["#modal", "#galleryModal", "#cartModal", "#compareModal", "#licenseModal", "#articleModal"];
    function anyOpen() {
      return modals.some(function (s) { var m = $(s); return m && m.classList.contains("open"); }) ||
        ($(".nav") && $(".nav").classList.contains("open"));
    }
    var pushed = false;
    document.addEventListener("click", function (e) {
      var opener = e.target.closest && e.target.closest('[data-h32-openmodal]');
      if (opener && !pushed) {
        try { history.pushState({ h32: 1 }, ""); pushed = true; } catch (_) {}
      }
    }, true);
    window.addEventListener("popstate", function () {
      if (!anyOpen()) { pushed = false; return; }
      modals.forEach(function (s) { var m = $(s); if (m) m.classList.remove("open"); });
      var nav = $(".nav"), mb = $(".menu-btn");
      if (nav) nav.classList.remove("open");
      if (mb) { mb.setAttribute("aria-expanded", "false"); mb.textContent = "Menu"; }
      try { document.body.style.overflow = ""; } catch (_) {}
      pushed = false;
    });
  })();

  /* ============ H32-73 · Contact form tự lưu nháp ============ */
  (function () {
    var form = $("#contactForm");
    if (!form || !("localStorage" in window)) return;
    var KEY = "h32-contact-draft";
    var fields = ["contactName", "contactEmail", "contactPlate", "contactProject", "contactTier"];
    function save() {
      try {
        var d = {};
        fields.forEach(function (id) { var f = document.getElementById(id); if (f) d[id] = f.value; });
        localStorage.setItem(KEY, JSON.stringify(d));
      } catch (_) {}
    }
    function restore() {
      try {
        var d = JSON.parse(localStorage.getItem(KEY) || "{}");
        fields.forEach(function (id) {
          var f = document.getElementById(id);
          if (f && d[id] && !f.value) f.value = d[id];
        });
      } catch (_) {}
    }
    var deb = null;
    on(form, "input", function () { clearTimeout(deb); deb = setTimeout(save, 600); });
    on(form, "submit", function () { try { localStorage.removeItem(KEY); } catch (_) {} });
    restore();
  })();

  /* ============ H32-74 · Ảnh lỗi → placeholder gradient ============ */
  (function () {
    function guard(img) {
      if (!img || img.getAttribute("data-h32-fb")) return;
      img.setAttribute("data-h32-fb", "1");
      on(img, "error", function () {
        img.style.background = "linear-gradient(135deg,#2a2118,#8b6427)";
        img.removeAttribute("src");
        img.alt = img.alt || "Image unavailable";
      });
    }
    $$("img").forEach(guard);
    if ("MutationObserver" in window) {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes, function (n) {
            if (n.tagName === "IMG") guard(n);
            else if (n.querySelectorAll) $$("img", n).forEach(guard);
          });
        });
      }).observe(document.documentElement, { childList: true, subtree: true });
    }
  })();

  /* ============ H32-75 · Phím "l" đổi ngôn ngữ ============ */
  (function () {
    var tgl = $("#langToggle");
    if (!tgl) return;
    document.addEventListener("keydown", function (e) {
      if (e.key !== "l" && e.key !== "L") return;
      if (e.target.closest && e.target.closest("input,textarea,select,[contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      tgl.click();
    });
  })();

  /* ============ H32-76 · Hoàn tác xóa khỏi giỏ ============ */
  (function () {
    var list = $("#cartList") || $(".cart-list");
    if (!list) return;
    var last = null;
    document.addEventListener("click", function (e) {
      var rm = e.target.closest && e.target.closest("[data-h32-remove]");
      if (!rm) return;
      var row = rm.closest(".cart-row");
      if (!row) return;
      last = { html: row.outerHTML, next: row.nextElementSibling };
    }, true);
    document.addEventListener("h32-undo-cart", function () {
      if (!last) return;
      try {
        var tmp = document.createElement("div");
        tmp.innerHTML = last.html;
        var row = tmp.firstElementChild;
        if (row) list.insertBefore(row, last.next);
      } catch (_) {}
      last = null;
    });
  })();

  /* ============ H32-77 · autocomplete cho name/email ============ */
  (function () {
    var map = { contactName: "name", contactEmail: "email", newsletterEmail: "email" };
    Object.keys(map).forEach(function (id) {
      var f = document.getElementById(id);
      if (f && !f.getAttribute("autocomplete")) f.setAttribute("autocomplete", map[id]);
    });
  })();

  /* ============ H32-78 · .view-tab thành tablist phím mũi tên ============ */
  (function () {
    var tabs = $$(".view-tab");
    if (tabs.length < 2) return;
    var wrap = $(".view-tabs");
    if (wrap) wrap.setAttribute("role", "tablist");
    tabs.forEach(function (t, i) {
      t.setAttribute("role", "tab");
      if (!t.hasAttribute("aria-selected")) t.setAttribute("aria-selected", t.classList.contains("active") ? "true" : "false");
      t.tabIndex = t.classList.contains("active") ? 0 : -1;
      on(t, "keydown", function (e) {
        var d = 0;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") d = 1;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") d = -1;
        else if (e.key === "Home") { tabs[0].focus(); e.preventDefault(); return; }
        else if (e.key === "End") { tabs[tabs.length - 1].focus(); e.preventDefault(); return; }
        else return;
        e.preventDefault();
        var n = tabs[(i + d + tabs.length) % tabs.length];
        n.focus(); n.click();
      });
      on(t, "click", function () {
        tabs.forEach(function (x) {
          var sel = x === t;
          x.setAttribute("aria-selected", sel ? "true" : "false");
          x.tabIndex = sel ? 0 : -1;
        });
      });
    });
  })();

  /* ============ H32-79 · Escape đóng mọi modal ============ */
  (function () {
    var modals = ["#galleryModal", "#cartModal", "#compareModal", "#licenseModal", "#articleModal"];
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var closed = false;
      modals.forEach(function (s) {
        var m = $(s);
        if (m && m.classList.contains("open")) { m.classList.remove("open"); closed = true; }
      });
      if (closed) { try { document.body.style.overflow = ""; } catch (_) {} }
    });
  })();

  /* ============ H32-80 · Toast có nút "View cart" ============ */
  (function () {
    var toast = $("#toast");
    if (!toast) return;
    function action() {
      var b = document.createElement("button");
      b.type = "button"; b.className = "h32-toastbtn";
      b.textContent = "View cart";
      on(b, "click", function () {
        var m = $("#cartModal");
        if (m) m.classList.add("open");
        b.remove();
      });
      return b;
    }
    document.addEventListener("h32-cartchange", function () {
      if (!$(".h32-toastbtn", toast)) toast.appendChild(action());
      setTimeout(function () { var b = $(".h32-toastbtn", toast); if (b) b.remove(); }, 5000);
    });
  })();

  /* ============ H32-81 · JSON-LD BreadcrumbList (0 byte head) ============ */
  (function () {
    try {
      var data = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Collections", "item": "#collections" },
          { "@type": "ListItem", "position": 2, "name": "Library", "item": "#library" },
          { "@type": "ListItem", "position": 3, "name": "Licensing", "item": "#pricing" },
          { "@type": "ListItem", "position": 4, "name": "Journal", "item": "#journal" },
          { "@type": "ListItem", "position": 5, "name": "FAQ", "item": "#faq" }
        ]
      };
      var s = document.createElement("script");
      s.type = "application/ld+json";
      s.textContent = JSON.stringify(data);
      document.head.appendChild(s);
    } catch (_) {}
  })();

  /* ============ H32-82 · aria-description cho nút icon-only ============ */
  (function () {
    var map = {
      ".gallery-nav": "Gallery navigation",
      ".utility-btn": "Quick action",
      ".icon-action": "Icon action",
      ".modal-close": "Close dialog",
      ".sheet-close": "Close panel"
    };
    Object.keys(map).forEach(function (sel) {
      $$(sel).forEach(function (el) {
        if (!el.getAttribute("aria-description")) el.setAttribute("aria-description", map[sel]);
      });
    });
  })();

  /* ============ H32-83 · beforeprint đóng modal đang mở ============ */
  (function () {
    function closeAll() {
      $$(".modal.open, .feature-sheet.open, #galleryModal.open, #cartModal.open, #compareModal.open, #licenseModal.open, #articleModal.open")
        .forEach(function (m) { m.classList.remove("open"); });
      try { document.body.style.overflow = ""; } catch (_) {}
    }
    on(window, "beforeprint", closeAll);
  })();

  /* ============ H32-84 · humans.txt (file staged riêng, không code) ============ */
  /* Xem plates-hunter-run32/humans.txt — deploy tại site root khi "up". */

  /* ============ H32-85 · manifest screenshots (file staged riêng) ============ */
  /* Xem plates-hunter-run32/manifest-screenshots.json — merge vào
     assets/manifest.webmanifest khi "up". */

  /* ============ H32-86 · Nhớ vị trí gallery trong session ============ */
  (function () {
    var KEY = "h32-gallery-index";
    try {
      var idx = parseInt(sessionStorage.getItem(KEY) || "0", 10) || 0;
      document.documentElement.setAttribute("data-h32-gidx", String(idx));
      document.addEventListener("click", function (e) {
        var nav = e.target.closest && e.target.closest("#galleryNext, #galleryPrev");
        if (!nav) return;
        var cur = parseInt(document.documentElement.getAttribute("data-h32-gidx") || "0", 10) || 0;
        cur += nav.id === "galleryNext" ? 1 : -1;
        try { sessionStorage.setItem(KEY, String(cur)); } catch (_) {}
        document.documentElement.setAttribute("data-h32-gidx", String(cur));
      });
    } catch (_) {}
  })();

  /* ============ H32-87 · #progress thành progressbar có ngữ nghĩa ============ */
  (function () {
    var p = $("#progress");
    if (!p) return;
    p.setAttribute("role", "progressbar");
    p.setAttribute("aria-label", "Reading progress");
    p.setAttribute("aria-valuemin", "0");
    p.setAttribute("aria-valuemax", "100");
    p.setAttribute("aria-valuenow", "0");
    var last = -1;
    on(window, "scroll", function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var v = max > 0 ? Math.round((h.scrollTop / max) * 100) : 0;
      if (v !== last) { last = v; p.setAttribute("aria-valuenow", String(v)); }
    }, { passive: true });
  })();

  /* ============ H32-88 · Nối section với heading qua aria-labelledby ============ */
  (function () {
    var n = 0;
    $$("#main > section, .fly-section").forEach(function (sec) {
      var h = $("h1, h2", sec);
      if (!h || sec.getAttribute("aria-labelledby")) return;
      if (!h.id) { n++; h.id = "h32-sec-" + n; }
      sec.setAttribute("aria-labelledby", h.id);
    });
  })();

  /* ============ H32-89 · Newsletter trạng thái thành công ============ */
  (function () {
    var form = $("#newsletterForm"), note = $("#newsletterNote");
    if (!form) return;
    on(form, "submit", function () {
      setTimeout(function () {
        form.classList.add("h32-subscribed");
        if (note && !note.textContent.trim()) {
          note.textContent = "You're on the list — welcome.";
        }
      }, 400);
    });
  })();

  /* ============ H32-90 · Ngữ nghĩa dialog cho mọi modal ============ */
  (function () {
    var pairs = [
      ["#modal", "#modalTitle"], ["#galleryModal", "#galleryTitle"],
      ["#cartModal", "#cartTitle"], ["#compareModal", "#compareTitle"],
      ["#licenseModal", "#licenseTitle"], ["#articleModal", "#articleTitle"]
    ];
    pairs.forEach(function (pr) {
      var m = $(pr[0]), t = $(pr[1]);
      if (!m) return;
      m.setAttribute("role", "dialog");
      m.setAttribute("aria-modal", "true");
      if (t && t.id) m.setAttribute("aria-labelledby", t.id);
    });
  })();

  /* ============ H32-91 · elementtiming cho hero (LCP) ============ */
  (function () {
    var hero = $(".hero-media") || $("#heroVideo");
    if (hero && !hero.getAttribute("elementtiming")) hero.setAttribute("elementtiming", "h32-hero");
  })();

  /* ============ H32-92 · rel="license" cho link licensing ============ */
  (function () {
    $$('a[href="#pricing"], a[href="#licenseModal"]').forEach(function (a) {
      if (!a.getAttribute("rel")) a.setAttribute("rel", "license");
    });
  })();

  /* ============ H32-93 · Skip link "Skip to library" ============ */
  (function () {
    if ($(".h32-skiplib") || !$("#library")) return;
    var a = document.createElement("a");
    a.href = "#library"; a.className = "skip-link h32-skiplib";
    a.textContent = "Skip to library";
    var first = $(".skip-link");
    if (first && first.parentNode) first.parentNode.insertBefore(a, first.nextSibling);
    else document.body.insertBefore(a, document.body.firstChild);
  })();

  /* ============ H32-94 · .collection có aria-label tên + thứ tự ============ */
  (function () {
    var cols = $$(".collection");
    cols.forEach(function (c, i) {
      if (c.getAttribute("aria-label")) return;
      var name = $(".collection-content h2, .collection-content h3", c);
      var label = "Collection " + (i + 1) + (name ? ": " + name.textContent.trim() : "");
      c.setAttribute("aria-label", label);
    });
  })();

  /* ============ H32-95 · #cartRequest liệt kê clip trong mailto ============ */
  (function () {
    var btn = $("#cartRequest");
    if (!btn) return;
    on(btn, "click", function () {
      try {
        var rows = $$("#cartList .cart-row, .cart-list .cart-row");
        var names = rows.map(function (r) {
          var t = $(".cart-row-title, h3, h4", r);
          return t ? t.textContent.trim() : "";
        }).filter(Boolean);
        var total = $("#cartTotal");
        var body = "Plates to license:\n" +
          (names.length ? names.map(function (n, i) { return (i + 1) + ". " + n; }).join("\n") : "(none selected)") +
          (total ? "\n\nEstimated total: " + total.textContent.trim() : "");
        btn.href = "mailto:hello@plates.studio?subject=" +
          encodeURIComponent("Plate license inquiry") +
          "&body=" + encodeURIComponent(body);
      } catch (_) {}
    });
  })();

  /* ============ H32-96 · Focus tiêu đề khi mở license/article/compare modal ============ */
  (function () {
    var map = { "#licenseModal": "#licenseTitle", "#articleModal": "#articleTitle", "#compareModal": "#compareTitle" };
    Object.keys(map).forEach(function (ms) {
      var m = $(ms);
      if (!m || !("MutationObserver" in window)) return;
      new MutationObserver(function () {
        if (!m.classList.contains("open")) return;
        var t = $(map[ms]);
        if (t) {
          if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1");
          setTimeout(function () { try { t.focus({ preventScroll: true }); } catch (_) {} }, 60);
        }
      }).observe(m, { attributes: true, attributeFilter: ["class"] });
    });
  })();

  /* ============ H32-97 · Đánh dấu body đã chạy hunter32 ============ */
  try { document.body.setAttribute("data-h32", "1"); } catch (_) {}

  /* ============ H32-98 · Live listener prefers-reduced-motion ============ */
  (function () {
    function sync() {
      var rm = false;
      try { rm = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (_) {}
      try { document.body.classList.toggle("h32-nomotion", rm); } catch (_) {}
    }
    sync();
    try {
      matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", sync);
    } catch (_) {}
  })();

  /* ============ H32-100 · Thông báo aria-live khi đổi ngôn ngữ ============ */
  (function () {
    var tgl = $("#langToggle");
    if (!tgl) return;
    var live = document.createElement("div");
    live.className = "h32-sr";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    live.style.cssText = "position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;";
    document.body.appendChild(live);
    on(tgl, "click", function () {
      setTimeout(function () {
        var lang = document.documentElement.lang || "en";
        live.textContent = lang.indexOf("vi") === 0 ? "Ngôn ngữ: Tiếng Việt" : "Language: English";
      }, 120);
    });
  })();
})();
