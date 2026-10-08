(() => {
  "use strict";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const M = window.Motion;
  const reduced = M.reduced;

  let videos = [];
  let site = {};

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

  const hasEmail = () => isReal(site.email) && site.email.includes("@");
  const mailto = (subject) => `mailto:${site.email || ""}?subject=${encodeURIComponent(subject)}`;

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
  // Missing or [YOUR_...] values hide whatever needs them: never an empty mailto: or a placeholder link.
  function applySite() {
    $$("[data-site]").forEach((n) => { if (isReal(site[n.dataset.site])) n.textContent = site[n.dataset.site]; });
    $$("[data-site-href]").forEach((n) => {
      const url = site[n.dataset.siteHref];
      if (isReal(url)) { n.href = n.dataset.utm ? withUtm(url, n.dataset.utm) : url; n.hidden = false; }
      else n.hidden = true;
    });
    $$(".js-mailto").forEach((n) => (n.href = hasEmail() ? mailto(n.dataset.subject || "Hello") : "#"));
    $$("[data-needs='email']").forEach((n) => (n.hidden = !hasEmail()));
    if (isReal(site.story)) { $("#about-story").textContent = site.story; $("#about-story").hidden = false; }
    $("#owner-name").textContent = isReal(site.ownerName) ? site.ownerName : (isReal(site.brandName) ? site.brandName : "Wild Frames");

    // footer: stock profiles and other links (only real ones)
    (site.social || []).filter((x) => x && isReal(x.url) && x.label).forEach((x) => {
      const isStock = /stock\.adobe\.com/.test(x.url);
      $("#footer-links").append(el("li", {}, [el("a", {
        href: isStock ? withUtm(x.url, "profile_footer") : x.url,
        target: "_blank", rel: "noopener noreferrer", text: x.label,
      })]));
    });
  }

  /* ---------- Hero ---------- */
  // Footage = preview of the first featured clip. The poster shows at once; the video loads after the
  // page has finished loading, and never with reduced motion, Data Saver, a slow connection or a weak device.
  const hero = $("#hero"), heroVideo = $("#hero-video"), heroToggle = $("#hero-toggle");
  let heroPausedByUser = false;

  function initHero(clip) {
    if (!clip) return;
    $("#hero-ph").hidden = !clip.sample;
    const poster = clip.poster || clip.thumbnail;
    const posterEl = $("#hero-poster");
    if (poster && posterEl.getAttribute("src") !== poster) posterEl.src = poster;

    const conn = navigator.connection || {};
    const slow = conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType || "");
    if (reduced || slow || M.lowPower || !clip.preview) return;

    const start = () => {
      heroVideo.addEventListener("playing", () => hero.classList.add("video-on"), { once: true });
      heroVideo.addEventListener("error", () => {
        // no real file yet: keep the still, quietly
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
    heroToggle.textContent = heroPausedByUser ? "Play" : "Pause";
  });

  /* ---------- Buy links ---------- */
  // Where "License" goes: the clip's own Adobe Stock page, else the profile; null when neither is filled in.
  const buyUrl = (v) => (isReal(v.stockUrl) ? v.stockUrl : isReal(site.adobeStockProfileUrl) ? site.adobeStockProfileUrl : null);
  const byId = (id) => videos.find((v) => v.id === id);
  const collectionInfo = (id) => (site.collections || []).find((c) => c.id === id);

  // localStorage can throw (private mode, blocked storage): fall back to memory.
  const store = {
    get(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* memory only */ } },
  };

  /* ---------- Toast (status message, read politely, hides after 2s) ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2000);
  }

  /* ---------- Dialogs: fade in (CSS), fade out ---------- */
  function openDialog(d) {
    if (!d.open) d.showModal();
    document.body.classList.add("locked");
  }
  function fadeClose(d) {
    if (!d.open || d.classList.contains("closing")) return;
    if (reduced) { d.close(); return; }
    d.classList.add("closing");
    setTimeout(() => { d.classList.remove("closing"); d.close(); }, 190);
  }
  $$("dialog").forEach((d) => {
    d.addEventListener("close", () => { if (!$$("dialog").some((x) => x.open)) document.body.classList.remove("locked"); });
    d.addEventListener("cancel", (e) => { e.preventDefault(); fadeClose(d); });
    d.addEventListener("click", (e) => { if (e.target === d) fadeClose(d); });
    $$("[data-close]", d).forEach((b) => b.addEventListener("click", () => fadeClose(d)));
    // keep Tab inside the open dialog
    d.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const items = $$("a[href]:not([hidden]), button:not([disabled]):not([hidden])", d).filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });

  /* ---------- Saved (shortlist) ---------- */
  let favs = new Set(store.get("shortlist", []).filter((x) => typeof x === "string"));
  const isFav = (id) => favs.has(id);

  function toggleFav(id) {
    if (favs.has(id)) { favs.delete(id); toast("Removed"); }
    else { favs.add(id); track("favorite_add", { clip: id }); toast("Saved"); }
    store.set("shortlist", [...favs]);
    syncFavs();
  }

  function syncFavs() {
    favs = new Set([...favs].filter((id) => byId(id))); // drop ids no longer in videos.json
    const n = favs.size;
    $("#shortlist-count").textContent = n;
    $("#shortlist-open").hidden = n === 0;
    const mFav = $("#m-fav");
    if (mFav.dataset.fav) {
      const on = isFav(mFav.dataset.fav);
      mFav.setAttribute("aria-pressed", String(on));
      mFav.textContent = on ? "Saved" : "Save";
    }
    if ($("#shortlist").open) renderShortlist();
  }

  function renderShortlist() {
    const list = [...favs].map(byId).filter(Boolean);
    $("#shortlist-items").replaceChildren(...list.map((v) => {
      const remove = el("button", { class: "text-btn", type: "button", "aria-label": `Remove ${v.title}`, text: "Remove" });
      remove.addEventListener("click", () => toggleFav(v.id));
      const url = buyUrl(v);
      return el("li", {}, [
        el("img", { src: v.thumbnail, alt: "", width: "96", height: "54", loading: "lazy" }),
        el("div", {}, [
          el("strong", { text: v.title }),
          el("span", { class: "sl-actions" }, [
            url ? el("a", { class: "text-btn", href: withUtm(url, v.id), target: "_blank", rel: "noopener noreferrer", "data-track": "buy_click", "data-clip": v.id, text: "License" }) : null,
            remove,
          ]),
        ]),
      ]);
    }));
    const linkable = list.filter((v) => buyUrl(v)).length;
    $("#license-all").textContent = `License all (${linkable})`;
    $("#license-all").hidden = linkable === 0;
    if (!list.length) fadeClose($("#shortlist"));
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
      if (w) w.opener = null; else blocked++;
    });
    const note = $("#shortlist-note");
    note.hidden = blocked === 0;
    note.textContent = `Your browser blocked ${blocked} of ${list.length} tabs. Allow pop-ups, or use each License link above.`;
  });

  /* ---------- Hover preview (mouse only, one card at a time) ---------- */
  let current = null;
  function stop(cardEl) {
    const v = cardEl.querySelector(".card-video");
    if (v) v.pause();
    cardEl.classList.remove("playing");
    if (current === cardEl) current = null;
  }
  function play(cardEl, src) {
    if (current && current !== cardEl) stop(current);
    current = cardEl;
    if (reduced || !src) return;
    let v = cardEl.querySelector(".card-video");
    if (!v) {
      // the preview is only downloaded on first hover
      v = el("video", { class: "card-video", muted: true, loop: true, playsinline: true, preload: "none", "aria-hidden": "true", tabindex: "-1" });
      v.muted = true;
      v.addEventListener("playing", () => { if (current === cardEl) cardEl.classList.add("playing"); });
      v.addEventListener("error", () => cardEl.classList.remove("playing"));
      v.src = src;
      cardEl.querySelector(".card-thumb").after(v);
    }
    v.play().catch(() => {});
  }

  /* ---------- Cards: picture, then a caption under it (never on it) ---------- */
  function card(v) {
    const meta = [v.resolution, v.duration, v.sample ? "Sample" : ""].filter(Boolean).join(" · ");
    const thumb = el("img", { class: "card-thumb", src: v.thumbnail, alt: "", loading: "lazy", width: "640", height: "360", decoding: "async" });
    const hit = el("button", { class: "card-hit", type: "button" }, [
      el("span", { class: "card-media" }, [thumb, v.sample ? el("span", { class: "ph-tag", text: "Placeholder · 1280×720 image, 1920×1080 MP4" }) : null]),
      el("span", { class: "card-cap" }, [el("span", { class: "card-title", text: v.title }), el("span", { class: "small", text: meta })]),
    ]);
    // buy button: opens the partner page in a new tab; without a real link it stays disabled (never "#")
    const url = buyUrl(v), partner = isReal(site.partnerName) ? site.partnerName : "Adobe Stock";
    const buy = url
      ? el("a", { class: "pill pill-sm", href: withUtm(url, v.id), target: "_blank", rel: "noopener noreferrer", "data-track": "buy_click", "data-clip": v.id, text: `Buy on ${partner}` })
      : el("button", { class: "pill pill-sm", type: "button", disabled: true, title: "Link coming soon", text: `Buy on ${partner}` });
    const cardEl = el("article", { class: "card", "data-id": v.id }, [hit, el("div", { class: "card-buy" }, [buy])]);
    hit.addEventListener("click", () => openClip(v.id, hit));
    if (M.finePointer) {
      cardEl.addEventListener("mouseenter", () => play(cardEl, v.preview));
      cardEl.addEventListener("mouseleave", () => stop(cardEl));
    }
    return cardEl;
  }

  /* ---------- Filter (category) + Show more. Changing the filter crossfades the grid ---------- */
  const grid = $("#grid"), chipsEl = $("#chips"), moreBtn = $("#show-more");
  const PAGE_SIZE = 9;
  let category = "All", shown = PAGE_SIZE;
  const list = () => videos.filter((v) => category === "All" || v.category === category);

  function render() {
    const all = list(), visible = all.slice(0, shown);
    if (current) stop(current);
    grid.replaceChildren(...visible.map(card));
    grid.setAttribute("aria-busy", "false");
    $("#empty").hidden = all.length > 0;
    moreBtn.hidden = all.length <= shown;
    $("#result-count").textContent = `${all.length} ${all.length === 1 ? "clip" : "clips"}`;
  }

  let fadeT;
  function setCategory(c) {
    category = c;
    shown = PAGE_SIZE;
    $$(".chip", chipsEl).forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.value === c)));
    if (c !== "All") track("filter", { category: c });
    if (reduced) { render(); return; }
    clearTimeout(fadeT);
    grid.classList.add("fading");
    fadeT = setTimeout(() => { render(); grid.classList.remove("fading"); }, 150);
  }

  function buildChips() {
    const cats = ["All", ...new Set(videos.map((v) => v.category).filter(Boolean))];
    chipsEl.replaceChildren(...cats.map((c) => {
      const b = el("button", { class: "chip", type: "button", "data-value": c, "aria-pressed": String(c === category), text: c });
      b.addEventListener("click", () => setCategory(c));
      return b;
    }));
    chipsEl.hidden = cats.length < 3; // one category: nothing to filter
  }

  moreBtn.addEventListener("click", () => {
    const first = list()[shown];
    shown += PAGE_SIZE;
    render();
    // keyboard users land on the first new card
    if (first) grid.querySelector(`[data-id="${CSS.escape(first.id)}"] .card-hit`)?.focus({ preventScroll: true });
  });
  $("#clear-filters").addEventListener("click", () => setCategory("All"));

  /* ---------- Free sample ---------- */
  function renderFreeSample() {
    const f = site.freeSample;
    const file = f && (f.file || f.url);
    if (!f || f.enabled === false || !isReal(file)) return;
    if (f.title) $("#free-title").textContent = f.title;
    if (f.note || f.description) $("#free-desc").textContent = f.note || f.description;
    if (f.thumbnail) $("#free-thumb").src = f.thumbnail;
    $("#free-download").href = file;
    $("#free-sample").hidden = false;
  }

  /* ---------- Finale: Adobe Stock when the profile is filled in, else back to the clips ---------- */
  function initFinale() {
    const a = $("#finale-cta");
    if (!isReal(site.adobeStockProfileUrl)) return;
    a.href = withUtm(site.adobeStockProfileUrl, "profile_finale");
    a.textContent = "License clips";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.dataset.track = "buy_click";
    a.dataset.clip = "profile";
  }

  /* ---------- Clip modal ---------- */
  const modal = $("#clip-modal"), mVideo = $("#m-video");
  let modalList = [], modalIndex = 0, opener = null, soundOn = false;

  function openClip(id, from) {
    const v = byId(id);
    if (!v) return;
    modalList = list().some((x) => x.id === id) ? list() : videos;
    modalIndex = modalList.findIndex((x) => x.id === id);
    opener = from || document.activeElement;
    const show = () => {
      fillModal(v);
      if (!modal.open) openDialog(modal);
      ($("#m-buy").hidden ? $("#m-fav") : $("#m-buy")).focus({ preventScroll: true });
    };
    // the clicked picture grows into the player (View Transitions); other browsers get a scale-and-fade
    const media = from && from.closest && from.closest(".card") ? from.closest(".card").querySelector(".card-media") : null;
    const mMedia = $(".modal-media", modal);
    if (!modal.open && media && document.startViewTransition && !reduced) {
      media.style.viewTransitionName = "clip";
      document.startViewTransition(() => { media.style.viewTransitionName = ""; show(); mMedia.style.viewTransitionName = "clip"; })
        .finished.finally(() => { mMedia.style.viewTransitionName = ""; });
    } else show();
    history.replaceState(null, "", `#clip=${encodeURIComponent(id)}`);
    track("modal_open", { clip: id });
  }

  function fillModal(v) {
    if (current) stop(current);
    mVideo.pause();
    mVideo.poster = v.poster || v.thumbnail;
    mVideo.src = v.preview;
    mVideo.controls = reduced;
    mVideo.muted = !soundOn;
    if (!reduced) mVideo.play().catch(() => {});

    $("#m-cat").textContent = [v.category, v.sample ? "Sample" : ""].filter(Boolean).join(" · ");
    $("#m-title").textContent = v.title;
    const specs = [
      ["Resolution", v.resolution],
      ["Duration", v.duration],
      v.fps ? ["Frame rate", `${v.fps} fps`] : null,
      typeof v.loopable === "boolean" ? ["Loop", v.loopable ? "Seamless" : "No"] : null,
      collectionInfo(v.collection) ? ["Set", collectionInfo(v.collection).name] : null,
    ].filter((x) => x && x[1]);
    $("#m-specs").replaceChildren(...specs.flatMap(([k, val]) => [el("dt", { text: k }), el("dd", { text: val })]));
    $("#m-price").hidden = !v.price;
    $("#m-price").textContent = v.price || "";

    const buy = $("#m-buy"), url = buyUrl(v);
    buy.hidden = !url;
    $("#m-via").hidden = !url;
    if (url) buy.href = withUtm(url, v.id);
    buy.dataset.clip = v.id;
    buy.setAttribute("aria-label", `License ${v.title} on Adobe Stock`);
    const fav = $("#m-fav");
    fav.dataset.fav = v.id;
    syncFavs();
    const many = modalList.length > 1;
    $("#m-prev").hidden = !many;
    $("#m-next").hidden = !many;
  }

  // previous / next: the video crossfades (no slide)
  let stepT;
  function step(dir) {
    if (modalList.length < 2) return;
    modalIndex = (modalIndex + dir + modalList.length) % modalList.length;
    const v = modalList[modalIndex];
    history.replaceState(null, "", `#clip=${encodeURIComponent(v.id)}`);
    if (reduced) { fillModal(v); return; }
    clearTimeout(stepT);
    mVideo.classList.add("swap");
    stepT = setTimeout(() => { fillModal(v); mVideo.classList.remove("swap"); }, 150);
  }

  $("#m-prev").addEventListener("click", () => step(-1));
  $("#m-next").addEventListener("click", () => step(1));
  $("#m-fav").addEventListener("click", (e) => toggleFav(e.currentTarget.dataset.fav));
  $("#m-sound").addEventListener("click", (e) => {
    soundOn = !soundOn;
    mVideo.muted = !soundOn;
    e.currentTarget.setAttribute("aria-pressed", String(soundOn));
    e.currentTarget.textContent = soundOn ? "Sound on" : "Sound off";
  });
  modal.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
  });
  modal.addEventListener("close", () => {
    mVideo.pause();
    mVideo.removeAttribute("src");
    mVideo.load();
    if (location.hash.startsWith("#clip=")) history.replaceState(null, "", location.pathname + location.search);
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  });

  function openFromHash() {
    const m = location.hash.match(/^#clip=(.+)$/);
    if (m) openClip(decodeURIComponent(m[1]));
  }
  window.addEventListener("hashchange", openFromHash);

  /* ---------- Process: the sticky picture crossfades to the step being read ---------- */
  const steps = $$("#story .step"), storyImgs = $$("#story .story-img");
  const storyIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const i = steps.indexOf(e.target);
    steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
    storyImgs.forEach((im, k) => im.classList.toggle("is-active", k === i));
  }), { rootMargin: "-45% 0px -50% 0px" });
  steps.forEach((s) => storyIO.observe(s));

  /* ---------- Nav: mark the section being read ---------- */
  const navLinks = $$(".nav-links a[href^='#']");
  const navIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const href = `#${e.target.id}`;
    navLinks.forEach((a) => (a.getAttribute("href") === href ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$("main > section[id]").forEach((sec) => navIO.observe(sec));

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
        keywords: (v.tags || []).filter((t) => t !== "sample" && t !== "placeholder").join(", "),
        duration: isoDuration(v.duration),
      };
      if (isReal(v.stockUrl)) o.url = v.stockUrl;
      if (v.uploadDate || v.addedAt) o.uploadDate = v.uploadDate || v.addedAt;
      return o;
    });
    const s = el("script", { type: "application/ld+json" });
    s.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": data });
    document.head.append(s);
  }

  /* ---------- Init ---------- */
  Promise.all([
    loadJson("videos.json", "videos-fallback", validVideos),
    loadJson("site.json", "site-fallback", validSite).catch(() => ({})),
  ]).then(([v, s]) => {
    videos = v.filter((x) => x && x.id && x.title);
    site = s || {};
    applySite();
    initAnalytics();
    buildChips();
    render();
    renderFreeSample();
    initFinale();
    syncFavs();
    injectJsonLd();
    initHero(videos.find((x) => x.featured) || videos[0]);
    M.reveal(document);
    openFromHash();
    window.App = { site, videos, track, isReal };
    M.emit("data", window.App);
  }).catch(() => {
    grid.setAttribute("aria-busy", "false");
    $("#load-error").hidden = false;
  });
})();
