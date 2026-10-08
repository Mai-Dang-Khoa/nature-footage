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
    injectJsonLd();
    initHero(videos.find((x) => x.featured) || videos[0]);
    M.reveal(document);
    window.App = { site, videos, track, isReal };
    M.emit("data", window.App);
  }).catch(() => {});
})();
