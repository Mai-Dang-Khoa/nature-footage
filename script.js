(() => {
  "use strict";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const grid = $("#grid"), chipsEl = $("#chips"), searchEl = $("#search");
  const countEl = $("#result-count"), emptyEl = $("#empty"), errorEl = $("#load-error");
  const moreBtn = $("#show-more"), activeEl = $("#active-filters");

  const reducedMotion = Motion.reduced;
  const canHover = Motion.finePointer;
  const autoPreview = canHover && !reducedMotion;
  const PAGE_SIZE = 12;

  let videos = [];
  let site = {};
  const filters = { category: "All", mood: "All", useCase: "", collection: "", query: "" };
  let gridList = [];
  let shown = PAGE_SIZE;

  $("#year").textContent = new Date().getFullYear();

  /* ---------- Data ---------- */
  // Reads a JSON file; on network/parse/shape errors falls back to the copy embedded in index.html,
  // so the page is never blank.
  async function loadJson(file, fallbackId, isValid) {
    const fallback = () => {
      const fb = document.getElementById(fallbackId);
      const data = fb && fb.textContent.trim() ? JSON.parse(fb.textContent) : null;
      if (!isValid(data)) throw new Error(`No usable data for ${file}`);
      return data;
    };
    try {
      // fetch is blocked on file:// — use the embedded fallback copy instead
      if (location.protocol === "file:") return fallback();
      const res = await fetch(file, { cache: "no-cache" });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      return isValid(data) ? data : fallback();
    } catch {
      return fallback();
    }
  }
  const validVideos = (d) => Array.isArray(d) && d.some((x) => x && x.id && x.title);
  const validSite = (d) => !!d && typeof d === "object" && !Array.isArray(d);

  // A value counts as real only if it is filled in and is not a [YOUR_...] placeholder.
  const isReal = (x) => typeof x === "string" && x.trim() !== "" && !x.includes("[YOUR_");

  /* ---------- Helpers ---------- */
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v === true ? "" : v);
    }
    children.forEach((c) => c && node.append(c));
    return node;
  }

  function isoDuration(d) {
    const parts = String(d).split(":").map(Number);
    if (parts.some(isNaN)) return undefined;
    let sec = 0;
    parts.forEach((p) => (sec = sec * 60 + p));
    return `PT${sec}S`;
  }

  // Every outbound purchase link carries UTM tags so Adobe Stock traffic can be attributed.
  function withUtm(url, campaign) {
    try {
      const u = new URL(url, location.href);
      u.searchParams.set("utm_source", "portfolio");
      u.searchParams.set("utm_medium", "site");
      u.searchParams.set("utm_campaign", campaign);
      return u.href;
    } catch {
      return url;
    }
  }

  const mailto = (subject) => `mailto:${site.email || ""}?subject=${encodeURIComponent(subject)}`;
  const byId = (id) => videos.find((v) => v.id === id);
  const useCaseLabel = (id) => (site.useCases || []).find((u) => u.id === id)?.label || id;
  const collectionInfo = (id) => (site.collections || []).find((c) => c.id === id);

  // localStorage can throw (private mode, blocked storage) — fall back to memory.
  const store = {
    get(key, def) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* memory only */ }
    },
  };

  /* ---------- Analytics (off unless site.json has an id) ---------- */
  function initAnalytics() {
    const a = site.analytics || {};
    if (!a.id) return;
    if (a.provider === "plausible") {
      window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
      document.head.append(el("script", { defer: true, "data-domain": a.id, src: "https://plausible.io/js/script.js" }));
    } else if (a.provider === "goatcounter") {
      const endpoint = a.id.includes("://") ? a.id : `https://${a.id}.goatcounter.com/count`;
      document.head.append(el("script", { async: true, "data-goatcounter": endpoint, src: "https://gc.zgo.at/count.js" }));
    }
  }

  function track(name, props = {}) {
    const a = site.analytics || {};
    if (!a.id) return;
    try {
      if (a.provider === "plausible" && window.plausible) window.plausible(name, { props });
      else if (a.provider === "goatcounter" && window.goatcounter && window.goatcounter.count) {
        const detail = Object.values(props).join("/");
        window.goatcounter.count({ path: detail ? `${name}/${detail}` : name, title: name, event: true });
      }
    } catch { /* analytics must never break the page */ }
  }

  // Any element with data-track is counted on click.
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-track]");
    if (t) track(t.dataset.track, t.dataset.clip ? { clip: t.dataset.clip } : {});
  });

  /* ---------- Site settings ---------- */
  // Everything that depends on site.json. Missing or [YOUR_...] values hide the button/block that needs them,
  // so the page never shows an empty mailto: or a placeholder link.
  function applySite() {
    $$("[data-site]").forEach((n) => { if (isReal(site[n.dataset.site])) n.textContent = site[n.dataset.site]; });
    $$("[data-site-href]").forEach((n) => {
      const url = site[n.dataset.siteHref];
      if (isReal(url)) { n.href = n.dataset.utm ? withUtm(url, n.dataset.utm) : url; n.hidden = false; }
      else n.hidden = true;
    });
    const hasEmail = isReal(site.email) && site.email.includes("@");
    $$(".js-mailto").forEach((n) => (n.href = hasEmail ? mailto(n.dataset.subject || "Hello") : "#"));
    $$("[data-needs='email']").forEach((n) => (n.hidden = !hasEmail));
    $("#owner-name").textContent = isReal(site.ownerName) ? site.ownerName : (isReal(site.brandName) ? site.brandName : "Wild Frames");
    if (isReal(site.story)) { $("#about-story").textContent = site.story; $("#about-story").hidden = false; }

    const contact = $("#contact-links");
    (site.social || []).filter((x) => x && isReal(x.url) && x.label).forEach((x) => {
      const isStock = /stock\.adobe\.com/.test(x.url);
      contact.append(el("li", {}, [el("a", {
        href: isStock ? withUtm(x.url, "profile_contact") : x.url,
        target: "_blank", rel: "noopener noreferrer", text: x.label,
      })]));
    });
    // no way to get in touch yet: hide the Contact block and its menu link
    const anyContact = $$("#contact-links li").some((li) => !li.hidden);
    $("#contact").hidden = !anyContact;
    $$("nav a[href='#contact']").forEach((a) => (a.hidden = !anyContact));
  }

  /* ---------- Favorites / shortlist ---------- */
  let favs = new Set(store.get("shortlist", []).filter((x) => typeof x === "string"));

  function isFav(id) { return favs.has(id); }

  function toggleFav(id, btn) {
    if (favs.has(id)) { favs.delete(id); toast("Removed from shortlist"); }
    else { favs.add(id); track("favorite_add", { clip: id }); if (btn) heartPop(btn); toast("Saved to shortlist"); }
    store.set("shortlist", [...favs]);
    syncFavs(true);
  }

  function syncFavs(bump) {
    // drop ids that no longer exist in videos.json
    favs = new Set([...favs].filter((id) => byId(id)));
    $$("[data-fav]").forEach((b) => {
      const on = isFav(b.dataset.fav);
      b.setAttribute("aria-pressed", String(on));
      const label = b.querySelector(".fav-label");
      if (label) label.textContent = on ? "Saved" : "Save";
    });
    const n = favs.size;
    setCount($("#shortlist-count"), n);
    $("#shortlist-bar").hidden = n === 0;
    document.body.classList.toggle("has-shortlist", n > 0);
    if (bump && !reducedMotion) {
      const bar = $("#shortlist-bar");
      bar.classList.remove("bump"); void bar.offsetWidth; bar.classList.add("bump");
    }
    if ($("#shortlist").open) renderShortlist();
  }

  // small status message, read out politely by screen readers, hides after 2s
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2000);
  }

  // ♥ pop with a few particles (the only overshoot on the page)
  function heartPop(btn) {
    if (reducedMotion) return;
    btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop");
    btn.addEventListener("animationend", () => btn.classList.remove("pop"), { once: true });
    for (let i = 0; i < 6; i++) {
      const dot = el("span", { class: "particle", "aria-hidden": "true" });
      dot.style.setProperty("--a", `${i * 60 + 30}deg`);
      dot.addEventListener("animationend", () => dot.remove(), { once: true });
      btn.append(dot);
    }
  }

  // number rolls up to the new value
  function setCount(node, n) {
    const text = String(n);
    const cur = node.querySelector(".n-in, .n-static");
    if (cur && cur.textContent === text) return;
    if (reducedMotion || !cur) { node.replaceChildren(el("span", { class: "n-static", text })); return; }
    node.classList.add("flip-num");
    $$(".n-out", node).forEach((x) => x.remove());
    cur.className = "n-out";
    cur.setAttribute("aria-hidden", "true");
    const next = el("span", { class: "n-in", text });
    cur.addEventListener("animationend", () => cur.remove(), { once: true });
    node.append(next);
  }

  function favButton(v) {
    const b = el("button", { class: "fav-btn", type: "button", "data-fav": v.id, "aria-pressed": "false", "aria-label": `Save ${v.title} to shortlist`, title: "Save to shortlist", text: "♥" });
    b.addEventListener("click", (e) => { e.stopPropagation(); toggleFav(v.id, b); });
    return b;
  }

  function renderShortlist() {
    const list = [...favs].map(byId).filter(Boolean);
    $("#shortlist-items").replaceChildren(...list.map((v, i) => {
      const remove = el("button", { class: "icon-btn", type: "button", "aria-label": `Remove ${v.title}`, text: "✕" });
      remove.addEventListener("click", () => toggleFav(v.id));
      const li = el("li", {}, [
        el("img", { src: v.thumbnail, alt: "", width: "96", height: "54", loading: "lazy" }),
        el("div", {}, [
          el("strong", { text: v.title }),
          buyUrl(v) ? el("a", { class: "text-link", href: withUtm(buyUrl(v), v.id), target: "_blank", rel: "noopener noreferrer", "data-track": "buy_click", "data-clip": v.id, text: "License on Adobe Stock ↗" }) : el("span", { class: "caption", text: "Adobe Stock link coming soon" }),
        ]),
        remove,
      ]);
      li.style.setProperty("--k", i);
      return li;
    }));
    const linkable = list.filter((v) => buyUrl(v)).length;
    $("#license-all").textContent = `License all on Adobe Stock (${linkable})`;
    $("#license-all").hidden = linkable === 0;
  }

  $("#shortlist-open").addEventListener("click", () => {
    renderShortlist();
    $("#shortlist-note").hidden = true;
    openDialog($("#shortlist"));
  });

  $("#license-all").addEventListener("click", () => {
    const list = [...favs].map(byId).filter((v) => v && buyUrl(v));
    let blocked = 0;
    list.forEach((v) => {
      const w = window.open(withUtm(buyUrl(v), v.id), "_blank");
      if (w) w.opener = null;
      else blocked++;
    });
    const note = $("#shortlist-note");
    note.hidden = blocked === 0;
    note.textContent = `Your browser blocked ${blocked} of ${list.length} tabs. Allow pop-ups for this site and try again, or open each clip with its own link above.`;
  });

  /* ---------- Dialog helpers ---------- */
  function openDialog(d) {
    if (!d.open) d.showModal();
    document.body.classList.add("locked");
  }
  // close with a short exit animation (~75% of the entrance)
  function closeSheet(d) {
    if (!d.open || d.classList.contains("closing")) return;
    if (reducedMotion) { d.close(); return; }
    d.classList.add("closing");
    setTimeout(() => { d.classList.remove("closing"); d.close(); }, Motion.ms("--dur-med") * 0.75);
  }
  $$("dialog").forEach((d) => {
    d.addEventListener("close", () => {
      if (!$$("dialog").some((x) => x.open)) document.body.classList.remove("locked");
    });
    if (d.id === "clip-modal") return; // the clip modal has its own close path
    d.addEventListener("cancel", (e) => { e.preventDefault(); closeSheet(d); });
    d.addEventListener("click", (e) => { if (e.target === d) closeSheet(d); });
    $$("[data-close]", d).forEach((b) => b.addEventListener("click", () => closeSheet(d)));
  });

  /* ---------- Preview playback (one card at a time) ---------- */
  let current = null; // the card currently active / previewing

  function stop(cardEl) {
    const v = cardEl.querySelector(".card-video");
    if (v) v.pause();
    cardEl.classList.remove("playing", "active");
    if (current === cardEl) current = null;
  }

  function play(cardEl, src) {
    if (current && current !== cardEl) stop(current);
    current = cardEl;
    if (reducedMotion || !src) return;
    let v = cardEl.querySelector(".card-video");
    if (!v) {
      // preview is only downloaded on first hover/tap
      v = el("video", { class: "card-video", muted: true, loop: true, playsinline: true, preload: "none", "aria-hidden": "true", tabindex: "-1" });
      v.muted = true;
      v.addEventListener("playing", () => { if (current === cardEl) cardEl.classList.add("playing"); });
      v.addEventListener("error", () => cardEl.classList.remove("playing"));
      v.src = src;
      cardEl.querySelector(".card-thumb").after(v);
    }
    v.play().catch(() => {});
  }

  /* ---------- Cards ---------- */
  // Where "License" goes: the clip's own Adobe Stock page, else the profile; null when neither is filled in.
  const buyUrl = (v) => (isReal(v.stockUrl) ? v.stockUrl : isReal(site.adobeStockProfileUrl) ? site.adobeStockProfileUrl : null);

  function buyLink(v, extraClass = "") {
    const url = buyUrl(v);
    if (!url) return null;
    return el("a", {
      class: `btn btn-accent ${extraClass}`.trim(), href: withUtm(url, v.id), target: "_blank", rel: "noopener noreferrer",
      "data-track": "buy_click", "data-clip": v.id, text: "License on Adobe Stock",
    });
  }

  const DAY = 864e5;
  const isNew = (v) => {
    const t = Date.parse(v.addedAt || "");
    return !isNaN(t) && Date.now() - t >= 0 && Date.now() - t <= 30 * DAY;
  };

  function card(v, list, opts = {}) {
    const badge = [v.resolution, v.duration].filter(Boolean).join(" · ");
    const hit = el("button", { class: "card-hit", type: "button", "aria-label": `${v.title} — preview and view details` });
    const details = el("button", { class: "btn btn-outline btn-sm card-details", type: "button", text: "Details" });
    const fav = favButton(v);
    fav.setAttribute("aria-pressed", String(isFav(v.id)));
    const thumb = el("img", { class: "card-thumb", src: v.thumbnail, alt: "", loading: "lazy", width: "640", height: "360", decoding: "async" });
    // fade the image in once it has loaded (space is reserved, so nothing jumps)
    const loaded = () => thumb.classList.add("loaded");
    if (thumb.complete && thumb.naturalWidth) loaded(); else thumb.addEventListener("load", loaded, { once: true });
    thumb.addEventListener("error", loaded, { once: true });
    const buy = buyLink(v, "btn-sm");

    const cardEl = el("article", { class: "card", "data-id": v.id }, [
      el("div", { class: "card-inner", "data-reveal": "up" }, [
        el("div", { class: "card-media", "data-reveal": "clip" }, [thumb]),
        el("div", { class: "card-shade" }),
        el("div", { class: "card-glow" }),
        hit,
        el("div", { class: "card-tags" }, [
          el("span", { class: "card-badge", text: badge }),
          isNew(v) ? el("span", { class: "card-chip", text: "New" }) : null,
          v.featured && !opts.inFeatured ? el("span", { class: "card-chip", text: "Featured" }) : null,
          v.sample ? el("span", { class: "card-chip", text: "Sample data" }) : null,
        ]),
        fav,
        el("div", { class: "card-foot" }, [
          el("h3", { class: "card-title", title: v.title, text: v.title }),
          el("div", { class: "card-actions" }, [buy, details]),
        ]),
      ]),
    ]);

    const open = () => openClip(v.id, typeof list === "function" ? list() : list, hit);
    hit.addEventListener("click", (e) => {
      // touch: first tap previews, second tap opens details
      const touch = e.pointerType === "touch" || (!canHover && e.pointerType !== "");
      if (touch && current !== cardEl) { cardEl.classList.add("active"); play(cardEl, v.preview); return; }
      open();
    });
    details.addEventListener("click", open);
    if (canHover) {
      cardEl.addEventListener("mouseenter", () => play(cardEl, v.preview));
      cardEl.addEventListener("mouseleave", () => { if (!cardEl.querySelector(":focus-visible")) stop(cardEl); });
    }
    hit.addEventListener("focus", () => { if (hit.matches(":focus-visible")) play(cardEl, v.preview); });
    cardEl.addEventListener("focusout", (e) => { if (!cardEl.contains(e.relatedTarget) && !cardEl.matches(":hover")) stop(cardEl); });
    if (Motion.rich) tilt(cardEl, buy);
    return cardEl;
  }

  /* ---------- Card tilt + spotlight (desktop, capable devices) ---------- */
  // Max 4° tilt (perspective 900px) plus the -4px lift; eases back with lerp (no bounce).
  // While the pointer is over the buy button the card holds still, so the button never moves under the click.
  function tilt(cardEl, buy) {
    const s = { rx: 0, ry: 0, lift: 0 }, t = { rx: 0, ry: 0, lift: 0 };
    let rect = null, running = false, hold = false;
    const tick = () => {
      s.rx = Motion.lerp(s.rx, t.rx, 0.15);
      s.ry = Motion.lerp(s.ry, t.ry, 0.15);
      s.lift = Motion.lerp(s.lift, t.lift, 0.15);
      const done = Math.abs(s.rx - t.rx) + Math.abs(s.ry - t.ry) + Math.abs(s.lift - t.lift) < 0.01;
      if (done && !t.lift) { cardEl.style.transform = ""; cardEl.style.willChange = ""; running = false; return false; }
      cardEl.style.transform = `perspective(900px) translateY(${s.lift.toFixed(2)}px) rotateX(${s.rx.toFixed(2)}deg) rotateY(${s.ry.toFixed(2)}deg)`;
      running = !done;
      return running;
    };
    const kick = () => { if (!running) { running = true; cardEl.style.willChange = "transform"; Motion.add(tick); } };
    cardEl.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse") return;
      rect = cardEl.getBoundingClientRect();
      t.lift = -4;
      kick();
    });
    cardEl.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || !rect || hold) return;
      const x = (e.clientX - rect.left) / rect.width, y = (e.clientY - rect.top) / rect.height;
      t.ry = (x - 0.5) * 8;   // ±4°
      t.rx = (0.5 - y) * 8;
      cardEl.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      cardEl.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      kick();
    }, { passive: true });
    if (buy) {
      buy.addEventListener("pointerenter", () => { hold = true; t.rx = s.rx; t.ry = s.ry; });
      buy.addEventListener("pointerleave", () => { hold = false; });
    }
    cardEl.addEventListener("pointerleave", () => { hold = false; rect = null; t.rx = t.ry = t.lift = 0; kick(); });
  }

  // tapping outside any card stops the active preview (touch)
  document.addEventListener("pointerdown", (e) => {
    if (current && !current.contains(e.target)) stop(current);
  }, { passive: true });

  /* ---------- Magnetic accent buttons (desktop, capable devices) ---------- */
  // Pulled up to 8px toward the pointer with `translate` only; frozen while pressed so the click lands.
  function magnetic(btn) {
    btn.classList.add("magnetic");
    let pressed = false;
    btn.addEventListener("pointermove", (e) => {
      if (pressed || e.pointerType !== "mouse") return;
      const r = btn.getBoundingClientRect();
      const dx = Motion.clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
      const dy = Motion.clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
      btn.style.translate = `${(dx * 8).toFixed(1)}px ${(dy * 6).toFixed(1)}px`;
    }, { passive: true });
    btn.addEventListener("pointerdown", () => { pressed = true; });
    btn.addEventListener("pointerup", () => { pressed = false; });
    btn.addEventListener("pointerleave", () => { pressed = false; btn.style.translate = ""; });
  }
  if (Motion.rich) $$(".btn-accent.btn-lg").forEach(magnetic);

  /* ---------- Cursor label over clip cards (desktop, capable devices) ---------- */
  if (Motion.rich) {
    const label = el("div", { class: "cursor-label", "aria-hidden": "true", text: "Play" });
    document.body.append(label);
    const pos = { x: 0, y: 0 };
    let onCard = null, running = false;
    const tick = () => {
      pos.x = Motion.lerp(pos.x, Motion.pointer.x, 0.25);
      pos.y = Motion.lerp(pos.y, Motion.pointer.y, 0.25);
      label.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
      if (onCard) label.textContent = onCard.classList.contains("playing") ? "View" : "Play";
      running = !!onCard || Math.abs(pos.x - Motion.pointer.x) + Math.abs(pos.y - Motion.pointer.y) > 0.5;
      return running;
    };
    document.addEventListener("pointerover", (e) => {
      const hit = e.pointerType === "mouse" && e.target.closest && e.target.closest(".card-hit");
      onCard = hit ? hit.closest(".card") : null;
      if (onCard && !label.classList.contains("on")) { pos.x = Motion.pointer.x; pos.y = Motion.pointer.y; }
      label.classList.toggle("on", !!onCard);
      if (onCard && !running) { running = true; Motion.add(tick); }
    }, { passive: true });
  }

  /* ---------- Collection rows (Featured first, then one row per collection) ---------- */
  function renderRows() {
    const rows = [];
    let featured = videos.filter((v) => v.featured);
    if (!featured.length) featured = videos.slice(0, 6);
    rows.push({ id: "featured", name: "Featured", clips: featured.slice(0, 12) });
    (site.collections || []).forEach((c) => {
      const clips = videos.filter((v) => v.collection === c.id);
      if (clips.length) rows.push({ id: c.id, name: c.name, description: c.description, url: c.collectionUrl || c.stockUrl, clips });
    });

    $("#rows-list").replaceChildren(...rows.map((r) => {
      const track = el("div", { class: "row-track", "data-stagger": "60" },
        r.clips.map((v) => card(v, r.clips, { inFeatured: r.id === "featured" })));
      const prev = el("button", { class: "icon-btn row-arrow prev", type: "button", "aria-label": `Scroll ${r.name} left`, text: "←" });
      const next = el("button", { class: "icon-btn row-arrow next", type: "button", "aria-label": `Scroll ${r.name} right`, text: "→" });
      const page = (dir) => track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: reducedMotion ? "auto" : "smooth" });
      prev.addEventListener("click", () => page(-1));
      next.addEventListener("click", () => page(1));
      // arrows only while there is room to scroll (read on scroll, write next frame)
      const sync = () => {
        const max = track.scrollWidth - track.clientWidth, x = track.scrollLeft;
        Motion.add(() => { prev.disabled = x <= 1; next.disabled = x >= max - 1; });
      };
      track.addEventListener("scroll", sync, { passive: true });
      new ResizeObserver(sync).observe(track);
      const n = r.clips.length;
      return el("section", { class: "row", "aria-labelledby": `row-${r.id}` }, [
        el("div", { class: "row-head" }, [
          el("h3", { id: `row-${r.id}`, text: r.name }),
          el("span", { class: "row-count", text: `${n} ${n === 1 ? "clip" : "clips"}` }),
          isReal(r.url) ? el("a", { class: "btn btn-accent btn-sm", href: withUtm(r.url, r.id), target: "_blank", rel: "noopener noreferrer", "data-track": "buy_click", "data-clip": r.id, text: "View full set on Adobe Stock" }) : null,
          r.description ? el("p", { class: "row-desc", text: r.description }) : null,
        ]),
        prev, track, next,
      ]);
    }));
    Motion.reveal($("#rows-list"));
  }

  /* ---------- Use cases ("Perfect for" marquee) ---------- */
  function renderUseCases() {
    const make = (u, n, dup) => {
      const b = el("button", { class: "usecase", type: "button", "data-dup": dup ? "" : null }, [
        el("strong", { text: u.label }),
        el("span", { text: u.description || "" }),
        el("span", { class: "count", text: `${n} ${n === 1 ? "clip" : "clips"} →` }),
      ]);
      b.addEventListener("click", () => {
        searchEl.value = "";
        setFilter({ useCase: u.id, collection: "", category: "All", mood: "All", query: "" });
        $("#collection").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
      });
      return b;
    };
    const items = (site.useCases || []).map((u) => [u, videos.filter((v) => (v.useCases || []).includes(u.id)).length]).filter(([, n]) => n);
    $("#use-cases").hidden = items.length === 0;
    // a second, inert copy makes the loop seamless; screen readers and Tab only see the first
    const dupWrap = items.map(([u, n]) => make(u, n, true));
    dupWrap.forEach((d) => { d.inert = true; d.setAttribute("aria-hidden", "true"); });
    $("#usecase-list").replaceChildren(...items.map(([u, n]) => make(u, n, false)), ...dupWrap);
  }

  const marquee = $("#usecase-marquee"), marqueeBtn = $("#marquee-toggle");
  marqueeBtn.addEventListener("click", () => {
    const paused = marquee.classList.toggle("paused");
    marqueeBtn.setAttribute("aria-pressed", String(paused));
    marqueeBtn.textContent = paused ? "Play" : "Pause";
  });
  // don't animate while off screen
  new IntersectionObserver(([e]) => marquee.classList.toggle("offscreen", !e.isIntersecting)).observe(marquee);

  /* ---------- Social proof (real data only) ---------- */
  function renderProof() {
    const stats = [...((site.stats && site.stats.items) || [])].filter((s) => s && s.value && s.label);
    if (site.stats && site.stats.showClipCount) stats.unshift({ value: String(videos.length), label: "clips in this portfolio" });
    const statsEl = $("#stats");
    statsEl.replaceChildren(...stats.map((s) => el("div", {}, [el("dt", { text: s.label }), el("dd", { text: s.value })])));
    statsEl.hidden = stats.length === 0;

    const trusted = (site.trustedBy || []).filter((t) => t && t.name);
    $("#trusted-list").replaceChildren(...trusted.map((t) => {
      const inner = t.logo ? el("img", { src: t.logo, alt: t.name, loading: "lazy", height: "28" }) : document.createTextNode(t.name);
      return el("li", {}, [t.url ? el("a", { href: t.url, target: "_blank", rel: "noopener noreferrer" }, [inner]) : inner]);
    }));
    $("#trusted").hidden = trusted.length === 0;
    $("#proof").hidden = stats.length === 0 && trusted.length === 0;
  }

  /* ---------- Free sample ---------- */
  function renderFreeSample() {
    const f = site.freeSample;
    const file = f && (f.file || f.url);
    if (!f || f.enabled === false || !isReal(file)) return;
    $("#free-title").textContent = f.title || "Free sample clip";
    $("#free-desc").textContent = f.note || f.description || "";
    $("#free-spec").textContent = [f.resolution, "Free download", "No sign-up"].filter(Boolean).join("  ·  ");
    if (f.thumbnail) $("#free-thumb").src = f.thumbnail;
    $("#free-download").href = file;
    $("#free-more").href = mailto("More free samples");
    $("#free-sample").hidden = false;
  }

  /* ---------- Filter & search ---------- */
  function matches(v) {
    if (filters.category !== "All" && v.category !== filters.category) return false;
    if (filters.mood !== "All" && v.mood !== filters.mood) return false;
    if (filters.useCase && !(v.useCases || []).includes(filters.useCase)) return false;
    if (filters.collection && v.collection !== filters.collection) return false;
    if (!filters.query) return true;
    const hay = [v.title, v.category, ...(v.tags || []), ...(v.useCases || []).map(useCaseLabel), collectionInfo(v.collection)?.name || ""].join(" ").toLowerCase();
    return filters.query.split(/\s+/).every((w) => hay.includes(w));
  }

  function setFilter(patch) {
    Object.assign(filters, patch);
    shown = PAGE_SIZE;
    syncChips();
    render({ animate: true });
    const parts = Object.entries(patch).filter(([k, v]) => k !== "query" && v && v !== "All");
    parts.forEach(([k, v]) => track("filter", { [k]: v }));
  }

  function renderActiveFilters() {
    const pills = [];
    if (filters.useCase) pills.push(["useCase", `Use: ${useCaseLabel(filters.useCase)}`]);
    if (filters.collection) pills.push(["collection", `Set: ${collectionInfo(filters.collection)?.name || filters.collection}`]);
    activeEl.replaceChildren(...pills.map(([key, label]) => {
      const b = el("button", { type: "button", "aria-label": `Remove filter ${label}` }, [document.createTextNode(label), el("span", { "aria-hidden": "true", text: "✕" })]);
      b.addEventListener("click", () => setFilter({ [key]: "" }));
      return b;
    }));
    activeEl.hidden = pills.length === 0;
  }

  /* FLIP: measure cards (First), re-order with reused elements (Last), Invert with transform, Play.
     Removed cards fade + shrink as absolutely-positioned ghosts; new cards fade in. */
  const gridCards = new Map(); // id -> card element in the full grid
  function render({ animate = false } = {}) {
    const list = videos.filter(matches);
    gridList = list;
    const visible = list.slice(0, shown);
    const flip = animate && !reducedMotion && !grid.querySelector(".skeleton");
    const dur = Motion.ms("--dur-slow"), easeIO = Motion.easing("--ease-in-out");

    const first = new Map();
    const gridBox = grid.getBoundingClientRect();
    if (flip) $$(":scope > .card", grid).forEach((c) => first.set(c.dataset.id, c.getBoundingClientRect()));

    const keep = new Set(visible.map((v) => v.id));
    if (current && !keep.has(current.dataset.id)) stop(current);
    // exits
    const ghosts = [];
    gridCards.forEach((c, id) => {
      if (keep.has(id)) return;
      gridCards.delete(id);
      if (!flip || !c.isConnected) return;
      const r = first.get(id);
      if (!r || r.bottom < 0 || r.top > innerHeight) return;
      c.classList.add("ghost");
      Object.assign(c.style, { left: `${r.left - gridBox.left}px`, top: `${r.top - gridBox.top}px`, width: `${r.width}px`, height: `${r.height}px` });
      ghosts.push(c);
    });
    // new order, reusing existing elements
    const added = [];
    const nodes = visible.map((v) => {
      let c = gridCards.get(v.id);
      if (!c) { c = card(v, () => gridList); gridCards.set(v.id, c); added.push(c); }
      return c;
    });
    grid.replaceChildren(...nodes, ...ghosts);
    grid.setAttribute("aria-busy", "false");
    Motion.reveal(grid);

    if (flip) {
      nodes.forEach((c) => {
        const r0 = first.get(c.dataset.id);
        if (!r0) return;
        const r1 = c.getBoundingClientRect();
        const dx = r0.left - r1.left, dy = r0.top - r1.top;
        if (Math.abs(dx) + Math.abs(dy) < 1) return;
        c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: dur, easing: easeIO });
      });
      const exitDur = dur * 0.75;
      ghosts.forEach((c) => {
        c.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.96)" }], { duration: exitDur, easing: Motion.easing("--ease-in"), fill: "forwards" })
          .finished.then(() => c.remove(), () => c.remove());
      });
      const step = Math.min(60, added.length > 1 ? 500 / (added.length - 1) : 0);
      added.forEach((c, i) => {
        c.animate([{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }], { duration: dur, delay: i * step, easing: Motion.easing("--ease-out"), fill: "backwards" });
      });
    }

    emptyEl.hidden = list.length > 0;
    moreBtn.hidden = list.length <= shown;
    moreBtn.textContent = `Show more (${list.length - Math.min(shown, list.length)} left)`;
    countEl.textContent = `${list.length} ${list.length === 1 ? "clip" : "clips"}`;
    renderActiveFilters();
  }

  moreBtn.addEventListener("click", () => {
    const list = videos.filter(matches);
    const first = list[shown];
    shown += PAGE_SIZE;
    render({ animate: true });
    // move focus to the first newly added card for keyboard users
    if (first) gridCards.get(first.id)?.querySelector(".card-hit")?.focus({ preventScroll: true });
  });

  $("#clear-filters").addEventListener("click", () => {
    searchEl.value = "";
    setFilter({ category: "All", mood: "All", useCase: "", collection: "", query: "" });
  });

  function buildChips() {
    const cats = ["All", ...new Set(videos.map((v) => v.category).filter(Boolean))];
    const moodLabels = new Map((site.moods || []).map((m) => [m.id, m.label]));
    const moods = ["All", ...new Set(videos.map((v) => v.mood).filter(Boolean))];
    const make = (holder, values, key, label) => {
      holder.replaceChildren(el("span", { class: "chip-pill", "aria-hidden": "true" }), ...values.map((c) => {
        const b = el("button", { class: "chip", type: "button", "data-value": c, "aria-pressed": String(c === filters[key]), text: label(c) });
        b.addEventListener("click", () => setFilter({ [key]: c }));
        return b;
      }));
      new ResizeObserver(() => placePill(holder, false)).observe(holder);
    };
    make(chipsEl, cats, "category", (c) => c);
    const moodEl = $("#mood-chips");
    make(moodEl, moods, "mood", (m) => (m === "All" ? "All" : moodLabels.get(m) || m[0].toUpperCase() + m.slice(1)));
    moodEl.closest(".filter-group").hidden = moods.length < 2;
    syncChips(false);
  }

  function syncChips(animate = true) {
    [[chipsEl, "category"], [$("#mood-chips"), "mood"]].forEach(([holder, key]) => {
      $$(".chip", holder).forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.value === filters[key])));
      placePill(holder, animate);
    });
  }

  // the pill is a full-size layer clipped (clip-path inset) to the selected chip — no width/left animation
  function placePill(holder, animate = true) {
    const pill = $(".chip-pill", holder), on = $(".chip[aria-pressed='true']", holder);
    if (!pill || !on) return;
    const W = holder.offsetWidth, H = holder.offsetHeight;
    const t = on.offsetTop, l = on.offsetLeft, w = on.offsetWidth, h = on.offsetHeight;
    holder.classList.toggle("no-anim", !animate);
    pill.style.setProperty("--pt", `${t}px`);
    pill.style.setProperty("--pl", `${l}px`);
    pill.style.setProperty("--pr", `${W - l - w}px`);
    pill.style.setProperty("--pb", `${H - t - h}px`);
  }

  let searchTimer;
  searchEl.addEventListener("input", () => {
    filters.query = searchEl.value.trim().toLowerCase();
    shown = PAGE_SIZE;
    render({ animate: true });
    clearTimeout(searchTimer);
    if (filters.query) searchTimer = setTimeout(() => track("filter", { search: filters.query }), 1200);
  });

  /* ---------- Recently viewed (this device only, max 8) ---------- */
  let recent = store.get("recent", []).filter((x) => typeof x === "string");
  function addRecent(id) {
    recent = [id, ...recent.filter((x) => x !== id)].slice(0, 8);
    store.set("recent", recent);
  }
  function renderRecent() {
    const list = recent.map(byId).filter(Boolean);
    $("#recent").hidden = list.length === 0;
    $("#recent-count").textContent = `${list.length} ${list.length === 1 ? "clip" : "clips"}`;
    $("#recent-track").replaceChildren(...list.map((v) => card(v, list)));
    Motion.reveal($("#recent-track"));
  }

  /* ---------- Clip modal ---------- */
  const modal = $("#clip-modal"), mVideo = $("#m-video");
  let modalList = [], modalIndex = 0, opener = null;

  const mMedia = $(".modal-media", modal);
  // weak devices get the lighter fade + scale (capturing page snapshots is costly without a GPU)
  const canVT = () => !!document.startViewTransition && !reducedMotion && !Motion.lowPower;
  const VT_NAME = "clip-media";

  function openClip(id, list, from) {
    const v = byId(id);
    if (!v) return;
    modalList = list && list.some((x) => x.id === id) ? list : videos;
    modalIndex = modalList.findIndex((x) => x.id === id);
    if (modal.open) { fillModal(v); return; }
    opener = from || document.activeElement;
    // the clicked thumbnail "flies" into the modal video (View Transitions), else fade + scale fallback
    const thumb = from && from.closest(".card") ? from.closest(".card").querySelector(".card-media") : null;
    const show = () => { fillModal(v); openDialog(modal); $("#m-buy").hidden ? $("#m-fav").focus({ preventScroll: true }) : $("#m-buy").focus({ preventScroll: true }); };
    if (canVT() && thumb) {
      document.documentElement.classList.add("vt-open");
      thumb.style.viewTransitionName = VT_NAME;
      const vt = document.startViewTransition(() => { thumb.style.viewTransitionName = ""; show(); mMedia.style.viewTransitionName = VT_NAME; });
      vt.finished.finally(() => { mMedia.style.viewTransitionName = ""; document.documentElement.classList.remove("vt-open"); });
    } else {
      show();
    }
    history.replaceState(null, "", `#clip=${encodeURIComponent(id)}`);
    track("modal_open", { clip: id });
    addRecent(id);
  }

  function fillModal(v) {
    if (current) stop(current);
    mVideo.pause();
    mVideo.poster = v.poster || v.thumbnail;
    mVideo.src = v.preview;
    mVideo.controls = reducedMotion;
    mVideo.muted = !soundOn;
    if (!reducedMotion) mVideo.play().catch(() => {});
    modal.setAttribute("aria-label", `${v.title} — clip details`);

    $("#m-cat").textContent = v.category;
    $("#m-title").textContent = v.title;
    const specs = [
      ["Resolution", v.resolution],
      ["Duration", v.duration],
      v.fps ? ["Frame rate", `${v.fps} fps`] : null,
      typeof v.loopable === "boolean" ? ["Loop", v.loopable ? "Seamless" : "No"] : null,
    ].filter(Boolean);
    $("#m-specs").replaceChildren(...specs.map(([k, val]) => el("div", {}, [el("dt", { text: k }), el("dd", { text: val })])));
    $("#m-price").hidden = !v.price;
    $("#m-price").textContent = v.price || "";
    $("#m-tags").replaceChildren(...(v.tags || []).map((t) => el("li", { text: t })));
    const set = collectionInfo(v.collection);
    $("#m-set").textContent = set ? `Part of the set “${set.name}”.` : "";

    const buy = $("#m-buy");
    buy.hidden = !buyUrl(v);
    if (buyUrl(v)) buy.href = withUtm(buyUrl(v), v.id);
    buy.dataset.clip = v.id;
    const fav = $("#m-fav");
    fav.dataset.fav = v.id;
    fav.setAttribute("aria-pressed", String(isFav(v.id)));
    fav.querySelector(".fav-label").textContent = isFav(v.id) ? "Saved" : "Save";
    fav.setAttribute("aria-label", `Save ${v.title} to shortlist`);

    const many = modalList.length > 1;
    $("#m-prev").hidden = !many;
    $("#m-next").hidden = !many;

    // More like this: same category first, then shared tags/use cases
    const score = (x) => (x.category === v.category ? 3 : 0) + (x.collection && x.collection === v.collection ? 2 : 0) + (x.mood && x.mood === v.mood ? 2 : 0)
      + (x.tags || []).filter((t) => t !== "sample" && t !== "placeholder" && (v.tags || []).includes(t)).length
      + (x.useCases || []).filter((u) => (v.useCases || []).includes(u)).length * 0.5;
    const similar = videos.filter((x) => x.id !== v.id).map((x) => [x, score(x)]).filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1]).slice(0, 4).map(([x]) => x);
    $("#m-more-wrap").hidden = similar.length === 0;
    $("#m-more").replaceChildren(...similar.map((x, i) => {
      const b = el("button", { type: "button" }, [
        el("img", { src: x.thumbnail, alt: "", loading: "lazy", width: "320", height: "180" }),
        el("span", { text: x.title }),
      ]);
      b.addEventListener("click", () => openClip(x.id, videos));
      const li = el("li", {}, [b]);
      li.style.setProperty("--k", i);
      return li;
    }));
    $(".modal-inner", modal).scrollTop = 0;
    // restart the 60ms stagger of the info column
    const info = $(".modal-info", modal);
    info.classList.remove("stagger"); void info.offsetWidth; info.classList.add("stagger");
  }

  // previous/next: the old video slides out, the new one slides in from the same side (--dur-slow in total)
  let stepping = null;
  function step(dir) {
    if (modalList.length < 2) return;
    modalIndex = (modalIndex + dir + modalList.length) % modalList.length;
    const v = modalList[modalIndex];
    addRecent(v.id);
    if (reducedMotion) { fillModal(v); }
    else {
      const total = Motion.ms("--dur-slow"), out = total * 0.4, inn = total * 0.6;
      if (stepping) stepping.cancel();
      stepping = mVideo.animate([{ transform: "none", opacity: 1 }, { transform: `translateX(${-dir * 48}px)`, opacity: 0 }], { duration: out, easing: Motion.easing("--ease-in"), fill: "forwards" });
      stepping.finished.then(() => {
        fillModal(v);
        stepping.cancel();
        stepping = mVideo.animate([{ transform: `translateX(${dir * 48}px)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: inn, easing: Motion.easing("--ease-out") });
      }, () => {});
    }
    history.replaceState(null, "", `#clip=${encodeURIComponent(v.id)}`);
  }

  $("#m-prev").addEventListener("click", () => step(-1));
  $("#m-next").addEventListener("click", () => step(1));
  $("#m-fav").addEventListener("click", (e) => toggleFav(e.currentTarget.dataset.fav, e.currentTarget));
  // Sound toggle (previews start muted)
  let soundOn = false;
  const soundBtn = $("#m-sound");
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    mVideo.muted = !soundOn;
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    soundBtn.textContent = soundOn ? "Sound on" : "Sound off";
  });

  // Focus trap: keep Tab inside the open dialog
  function trapFocus(d, e) {
    if (e.key !== "Tab") return;
    const items = $$("a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex='-1'])", d)
      .filter((n) => n.offsetParent !== null || n === document.activeElement);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  $$("dialog").forEach((d) => d.addEventListener("keydown", (e) => trapFocus(d, e)));

  modal.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
  });
  // Closing is ~75% of the opening time. The video flies back to the card if it is still on screen.
  function closeModal() {
    if (!modal.open || modal.classList.contains("closing")) return;
    const card = opener && opener.closest ? opener.closest(".card") : null;
    const target = card && card.isConnected ? card.querySelector(".card-media") : null;
    const r = target && target.getBoundingClientRect();
    const onScreen = r && r.bottom > 0 && r.top < innerHeight && r.width > 0;
    if (canVT() && onScreen) {
      document.documentElement.classList.add("vt-close");
      mMedia.style.viewTransitionName = VT_NAME;
      const vt = document.startViewTransition(() => { mMedia.style.viewTransitionName = ""; modal.close(); target.style.viewTransitionName = VT_NAME; });
      vt.finished.finally(() => { target.style.viewTransitionName = ""; document.documentElement.classList.remove("vt-close"); });
    } else if (!reducedMotion) {
      modal.classList.add("closing");
      setTimeout(() => { modal.classList.remove("closing"); modal.close(); }, Motion.ms("--dur-med") * 0.75);
    } else {
      modal.close();
    }
  }
  modal.addEventListener("cancel", (e) => { e.preventDefault(); closeModal(); }); // Esc
  modal.addEventListener("click", (e) => { if (e.target === modal) { e.stopImmediatePropagation(); closeModal(); } }, true);
  $$("[data-close]", modal).forEach((b) => b.addEventListener("click", (e) => { e.stopImmediatePropagation(); closeModal(); }, true));

  modal.addEventListener("close", () => {
    mVideo.pause();
    mVideo.removeAttribute("src");
    mVideo.load();
    if (location.hash.startsWith("#clip=")) history.replaceState(null, "", location.pathname + location.search);
    // return focus to the card that opened the modal (refresh "Recently viewed" unless that card lives there)
    const fromRecent = opener && $("#recent").contains(opener);
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    opener = null;
    if (!fromRecent) renderRecent();
  });

  function openFromHash() {
    const m = location.hash.match(/^#clip=(.+)$/);
    if (m) openClip(decodeURIComponent(m[1]));
  }
  window.addEventListener("hashchange", openFromHash);

  /* ---------- JSON-LD ---------- */
  function injectJsonLd() {
    const abs = (p) => new URL(p, document.baseURI).href;
    const data = videos.map((v) => {
      const o = {
        "@type": "VideoObject",
        name: v.title,
        description: `${v.title} — ${v.category} nature footage in ${v.resolution}, created in Unreal Engine 5.`,
        thumbnailUrl: abs(v.poster || v.thumbnail),
        contentUrl: abs(v.preview),
        url: v.stockUrl,
        keywords: (v.tags || []).join(", "),
        duration: isoDuration(v.duration),
      };
      if (v.uploadDate) o.uploadDate = v.uploadDate;
      return o;
    });
    const s = el("script", { type: "application/ld+json" });
    s.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": data });
    document.head.append(s);
  }

  /* ---------- Hero ---------- */
  // Background = preview of the first featured clip. Poster shows at once; video loads after the page
  // has finished loading, and never with reduced motion, Data Saver, a slow connection or a weak device.
  const hero = $("#hero"), heroVideo = $("#hero-video"), heroToggle = $("#hero-toggle");
  let heroPausedByUser = false;

  function initHero(clip) {
    if (!clip) return;
    const poster = clip.poster || clip.thumbnail;
    const posterEl = $("#hero-poster");
    if (poster && posterEl.getAttribute("src") !== poster) posterEl.src = poster;

    const conn = navigator.connection || {};
    const slow = conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType || "");
    if (reducedMotion || slow || Motion.lowPower || !clip.preview) return;

    const start = () => {
      heroVideo.addEventListener("playing", () => hero.classList.add("video-on"), { once: true });
      heroVideo.addEventListener("error", () => {
        // no real file yet: keep the static poster, quietly
        hero.classList.remove("video-on");
        heroVideo.removeAttribute("src");
        heroToggle.hidden = true;
      }, { once: true });
      heroVideo.src = clip.preview;
      heroVideo.play().catch(() => {});
      heroToggle.hidden = false;
      new IntersectionObserver(([e]) => {
        if (heroPausedByUser || !heroVideo.src) return;
        if (e.isIntersecting) heroVideo.play().catch(() => {}); else heroVideo.pause();
      }).observe(hero);
    };
    if (document.readyState === "complete") start(); else window.addEventListener("load", start, { once: true });
  }

  heroToggle.addEventListener("click", () => {
    heroPausedByUser = !heroPausedByUser;
    if (heroPausedByUser) heroVideo.pause(); else heroVideo.play().catch(() => {});
    heroToggle.setAttribute("aria-pressed", String(heroPausedByUser));
    heroToggle.setAttribute("aria-label", heroPausedByUser ? "Play background video" : "Pause background video");
  });

  /* ---------- Hero parallax + scroll cue ---------- */
  // rich (mouse, capable device): video drifts down 18% and fades, text rises slower (0.3), specs line (0.4).
  // light (touch / weak device): only the video fades. reduced motion: nothing.
  const heroLayer = $("#hero-parallax"), heroInner = $("#hero-inner"), heroSpecs = $("#hero-specs");
  let heroH = hero.offsetHeight;
  window.addEventListener("resize", () => { heroH = hero.offsetHeight; }, { passive: true });
  let heroDone = false;
  Motion.onScroll(({ y }) => {
    const p = Motion.clamp(y / heroH);
    hero.classList.toggle("past-cue", p > 0.1);
    if (reducedMotion || (p >= 1 && heroDone)) return;
    heroDone = p >= 1;
    heroLayer.style.opacity = String(1 - p * 0.85);
    if (!Motion.rich) return;
    heroLayer.style.transform = `translate3d(0, ${(p * 18).toFixed(2)}%, 0)`;
    heroInner.style.transform = `translate3d(0, ${(y * 0.3).toFixed(1)}px, 0)`;
    heroInner.style.opacity = String(Motion.clamp(1 - p * 2));
    heroSpecs.style.transform = `translate3d(0, ${(y * 0.4).toFixed(1)}px, 0)`;
    heroSpecs.style.opacity = String(Motion.clamp(1 - p * 3));
  });

  /* ---------- Hero spotlight (desktop only) ---------- */
  if (Motion.rich) {
    const light = $("#hero-light");
    const pos = { x: innerWidth * 0.6, y: innerHeight * 0.5 }, target = { x: pos.x, y: pos.y };
    let running = false;
    const tick = () => {
      pos.x = Motion.lerp(pos.x, target.x, 0.08);
      pos.y = Motion.lerp(pos.y, target.y, 0.08);
      light.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
      running = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.5;
      return running;
    };
    hero.addEventListener("pointermove", (e) => {
      target.x = e.clientX;
      target.y = e.clientY + Motion.scroll.y; // hero starts at the top of the page
      if (!running) { running = true; Motion.add(tick); }
    }, { passive: true });
    hero.addEventListener("pointerenter", () => hero.classList.add("lit"));
    hero.addEventListener("pointerleave", () => hero.classList.remove("lit"));
  }

  /* ---------- Nav: frosted after 40px, hides on scroll down, shows on scroll up ---------- */
  const nav = $("#nav"), progress = $("#progress");
  let travel = 0, docH = document.documentElement.scrollHeight;
  new ResizeObserver(() => { docH = document.documentElement.scrollHeight; }).observe(document.body);
  Motion.onScroll(({ y, dy, vh }) => {
    nav.classList.toggle("scrolled", y > 40);
    // only hide after a deliberate scroll, never near the top or while the menu has focus
    travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;
    if (y < 120 || nav.contains(document.activeElement) || travel < -8) nav.classList.remove("nav-hidden");
    else if (travel > 12) nav.classList.add("nav-hidden");
    // progress bar fallback when CSS scroll timelines are not available
    if (!Motion.sda) progress.style.setProperty("--progress", Motion.clamp(y / Math.max(1, docH - vh)).toFixed(4));
  });
  nav.addEventListener("focusin", () => nav.classList.remove("nav-hidden"));

  /* ---------- Nav: underline slides to the section being read ---------- */
  const navInd = $("#nav-ind");
  const navLinks = $$("nav a[href^='#']", nav);
  const sectionToLink = { rows: "#collection", recent: "#collection", "use-cases": "#collection", collection: "#collection", process: "#process", faq: "#faq", about: "#contact", contact: "#contact" };
  let activeHref = null;
  function placeIndicator() {
    const link = navLinks.find((a) => a.getAttribute("href") === activeHref && a.offsetParent);
    navLinks.forEach((a) => (a === link ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
    if (!link) { navInd.classList.remove("on"); return; }
    const x = link.offsetLeft, w = link.offsetWidth; // reads first…
    Motion.add(() => { navInd.style.transform = `translateX(${x}px) scaleX(${w})`; navInd.classList.add("on"); }); // …write next frame
  }
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const href = sectionToLink[e.target.id] || null;
      if (href !== activeHref) { activeHref = href; placeIndicator(); }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main > section[id]").forEach((sec) => sectionIO.observe(sec));
  $("#hero") && sectionIO.observe($("#hero"));
  window.addEventListener("resize", placeIndicator, { passive: true });
  if (document.fonts) document.fonts.ready.then(placeIndicator);

  /* ---------- Behind the scene story (desktop: sticky image follows the step being read) ---------- */
  const story = $("#story"), storyNum = $("#story-num"), storyFill = $("#story-fill");
  const storySteps = $$(".story-steps .step", story), storyImgs = $$(".story-img", story);
  let storyActive = 0;
  function setStory(i) {
    if (i === storyActive) return;
    const dir = i > storyActive ? 1 : -1;
    storyActive = i;
    storySteps.forEach((st, k) => st.classList.toggle("is-active", k === i));
    storyImgs.forEach((im, k) => im.classList.toggle("is-active", k === i));
    const text = String(i + 1).padStart(2, "0");
    if (reducedMotion || !storyNum.animate) { storyNum.textContent = text; return; }
    const d = Motion.ms("--dur-med");
    storyNum.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateY(${-dir * 30}%)` }], { duration: d * 0.75, easing: Motion.easing("--ease-in") })
      .finished.then(() => {
        storyNum.textContent = text;
        storyNum.animate([{ opacity: 0, transform: `translateY(${dir * 30}%)` }, { opacity: 1, transform: "none" }], { duration: d, easing: Motion.easing("--ease-out") });
      }, () => { storyNum.textContent = text; });
  }
  storySteps[0] && storySteps[0].classList.add("is-active");
  const storyIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) setStory(storySteps.indexOf(e.target));
  }), { rootMargin: "-45% 0px -50% 0px" });
  storySteps.forEach((st) => storyIO.observe(st));
  // progress line fallback when CSS scroll timelines are missing (read rect, write next frame)
  if (!Motion.sda && !reducedMotion) {
    Motion.onScroll(({ vh }) => {
      if (!story.offsetParent) return;
      const r = story.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = Motion.clamp(-r.top / Math.max(1, r.height - vh));
      storyFill.style.setProperty("--story-p", p.toFixed(4));
    });
  }

  /* ---------- FAQ accordion: height eases open via grid-template-rows 0fr → 1fr ---------- */
  $$(".faq details").forEach((d) => {
    const summary = $("summary", d), body = $(".faq-a", d);
    if (d.open) d.classList.add("is-open");
    summary.addEventListener("click", (e) => {
      e.preventDefault();
      if (!d.open) {
        d.open = true;
        if (reducedMotion) { d.classList.add("is-open"); return; }
        requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("is-open")));
      } else {
        d.classList.remove("is-open");
        if (reducedMotion) { d.open = false; return; }
        const done = (ev) => { if (ev && ev.target !== body) return; body.removeEventListener("transitionend", done); if (!d.classList.contains("is-open")) d.open = false; };
        body.addEventListener("transitionend", done);
        setTimeout(done, Motion.ms("--dur-med") + 50);
      }
    });
  });

  /* ---------- Init ---------- */
  Promise.all([
    loadJson("videos.json", "videos-fallback", validVideos),
    loadJson("site.json", "site-fallback", validSite).catch(() => ({})),
  ]).then(([v, s]) => {
    videos = v.filter((x) => x && x.id && x.title);
    site = s || {};
    applySite();
    initAnalytics();
    renderRows();
    renderUseCases();
    buildChips();
    render();
    renderProof();
    renderFreeSample();
    syncFavs(false);
    renderRecent();
    injectJsonLd();
    Motion.reveal(document);
    initHero(videos.find((x) => x.featured) || videos[0]);
    openFromHash();
  }).catch(() => {
    grid.setAttribute("aria-busy", "false");
    errorEl.hidden = false;
  });

})();
