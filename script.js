(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const grid = $("#grid"), chipsEl = $("#chips"), searchEl = $("#search");
  const countEl = $("#result-count"), emptyEl = $("#empty"), errorEl = $("#load-error");

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const autoPreview = canHover && !reducedMotion;

  let videos = [];
  let activeCategory = "All";
  let query = "";

  $("#year").textContent = new Date().getFullYear();

  /* ---------- Data ---------- */
  async function loadVideos() {
    try {
      if (location.protocol === "file:") throw new Error("file protocol");
      const res = await fetch("videos.json");
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } catch (err) {
      // fetch is blocked on file:// — use the embedded fallback copy
      const fb = $("#videos-fallback");
      if (fb) return JSON.parse(fb.textContent);
      throw err;
    }
  }

  /* ---------- Helpers ---------- */
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    }
    children.forEach((c) => node.append(c));
    return node;
  }

  function isoDuration(d) {
    const parts = String(d).split(":").map(Number);
    if (parts.some(isNaN)) return undefined;
    let sec = 0;
    parts.forEach((p) => (sec = sec * 60 + p));
    return `PT${sec}S`;
  }

  /* ---------- Preview playback ---------- */
  let current = null; // the media element currently playing

  function stop(media) {
    const v = media.querySelector("video");
    if (v) v.pause();
    media.classList.remove("playing");
    media.setAttribute("aria-pressed", "false");
    if (current === media) current = null;
  }

  function play(media, src) {
    if (current && current !== media) stop(current);
    let v = media.querySelector("video");
    if (!v) {
      v = el("video", { muted: "", loop: "", playsinline: "", preload: "none", "aria-hidden": "true", tabindex: "-1" });
      v.muted = true;
      v.src = src;
      media.prepend(v);
    }
    v.play().then(() => {
      media.classList.add("playing");
      media.setAttribute("aria-pressed", "true");
      current = media;
    }).catch(() => {});
  }

  /* ---------- Cards ---------- */
  function card(v) {
    const media = el("button", { class: "media", type: "button", "aria-pressed": "false", "aria-label": `Toggle preview: ${v.title}` }, [
      el("img", { src: v.thumbnail, alt: `${v.title} — ${v.category} thumbnail`, loading: "lazy", width: "640", height: "360", decoding: "async" }),
      el("span", { class: "badge", text: v.category }),
      el("span", { class: "play-icon", "aria-hidden": "true" }),
    ]);
    media.addEventListener("click", () => (media.classList.contains("playing") ? stop(media) : play(media, v.preview)));
    if (autoPreview) {
      media.addEventListener("mouseenter", () => play(media, v.preview));
      media.addEventListener("mouseleave", () => stop(media));
    }

    return el("article", { class: "card" }, [
      media,
      el("div", { class: "card-body" }, [
        el("h3", { text: v.title }),
        el("p", { class: "meta", text: `${v.resolution} · ${v.duration}` }),
        el("a", { class: "btn btn-ghost", href: v.stockUrl, target: "_blank", rel: "noopener noreferrer", text: "License on Adobe Stock" }),
      ]),
    ]);
  }

  /* ---------- Filter & search ---------- */
  function matches(v) {
    if (activeCategory !== "All" && v.category !== activeCategory) return false;
    if (!query) return true;
    const hay = [v.title, v.category, ...(v.tags || [])].join(" ").toLowerCase();
    return query.split(/\s+/).every((w) => hay.includes(w));
  }

  function render() {
    const list = videos.filter(matches);
    current = null;
    grid.replaceChildren(...list.map(card));
    grid.setAttribute("aria-busy", "false");
    emptyEl.hidden = list.length > 0;
    countEl.textContent = `${list.length} ${list.length === 1 ? "clip" : "clips"}`;
  }

  function buildChips() {
    const cats = ["All", ...new Set(videos.map((v) => v.category))];
    chipsEl.replaceChildren(...cats.map((c) => {
      const b = el("button", { class: "chip", type: "button", "aria-pressed": String(c === activeCategory), text: c });
      b.addEventListener("click", () => {
        activeCategory = c;
        chipsEl.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        render();
      });
      return b;
    }));
  }

  searchEl.addEventListener("input", () => {
    query = searchEl.value.trim().toLowerCase();
    render();
  });

  /* ---------- JSON-LD ---------- */
  function injectJsonLd() {
    const abs = (p) => new URL(p, document.baseURI).href;
    const data = videos.map((v) => {
      const o = {
        "@type": "VideoObject",
        name: v.title,
        description: `${v.title} — ${v.category} nature footage in ${v.resolution}, created in Unreal Engine 5.`,
        thumbnailUrl: abs(v.thumbnail),
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

  /* ---------- Hero video (lazy, skipped when reduced motion) ---------- */
  function initHero() {
    const hv = $("#hero-video");
    if (reducedMotion || !hv) return;
    hv.src = hv.dataset.src;
    hv.play().catch(() => {});
    new IntersectionObserver(([e]) => (e.isIntersecting ? hv.play().catch(() => {}) : hv.pause())).observe(hv);
  }

  /* ---------- Init ---------- */
  loadVideos().then((data) => {
    videos = data;
    buildChips();
    render();
    injectJsonLd();
  }).catch(() => {
    grid.setAttribute("aria-busy", "false");
    errorEl.hidden = false;
  });

  if ("requestIdleCallback" in window) requestIdleCallback(initHero); else setTimeout(initHero, 200);
})();
