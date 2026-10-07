(() => {
  "use strict";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const grid = $("#grid"), chipsEl = $("#chips"), searchEl = $("#search");
  const countEl = $("#result-count"), emptyEl = $("#empty"), errorEl = $("#load-error");
  const moreBtn = $("#show-more"), activeEl = $("#active-filters");

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const autoPreview = canHover && !reducedMotion;
  const PAGE_SIZE = 12;

  let videos = [];
  let site = {};
  const filters = { category: "All", useCase: "", collection: "", query: "" };
  let shown = PAGE_SIZE;

  $("#year").textContent = new Date().getFullYear();

  /* ---------- Data ---------- */
  async function loadJson(file, fallbackId) {
    try {
      // fetch is blocked on file:// — use the embedded fallback copy instead
      if (location.protocol === "file:") throw new Error("file protocol");
      const res = await fetch(file);
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } catch (err) {
      const fb = document.getElementById(fallbackId);
      if (fb && fb.textContent.trim()) return JSON.parse(fb.textContent);
      throw err;
    }
  }

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
  function applySite() {
    $$("[data-site]").forEach((n) => { if (site[n.dataset.site]) n.textContent = site[n.dataset.site]; });
    $$("[data-site-href]").forEach((n) => {
      const url = site[n.dataset.siteHref];
      if (url) n.href = n.dataset.utm ? withUtm(url, n.dataset.utm) : url;
    });
    $$(".js-mailto").forEach((n) => (n.href = mailto(n.dataset.subject || "Hello")));

    const contact = $("#contact-links");
    (site.social || []).forEach((s) => {
      const isStock = /stock\.adobe\.com/.test(s.url);
      contact.append(el("li", {}, [el("a", {
        href: isStock ? withUtm(s.url, "profile_contact") : s.url,
        target: "_blank", rel: "noopener noreferrer", text: s.label,
      })]));
    });
  }

  /* ---------- Favorites / shortlist ---------- */
  let favs = new Set(store.get("shortlist", []).filter((x) => typeof x === "string"));

  function isFav(id) { return favs.has(id); }

  function toggleFav(id) {
    if (favs.has(id)) favs.delete(id);
    else { favs.add(id); track("favorite_add", { clip: id }); }
    store.set("shortlist", [...favs]);
    syncFavs(true);
  }

  function syncFavs(bump) {
    // drop ids that no longer exist in videos.json
    favs = new Set([...favs].filter((id) => byId(id)));
    $$("[data-fav]").forEach((b) => {
      const on = isFav(b.dataset.fav);
      b.setAttribute("aria-pressed", String(on));
      const label = b.querySelector("span");
      if (label) label.textContent = on ? "Saved" : "Save";
    });
    const n = favs.size;
    $("#shortlist-count").textContent = n;
    $("#shortlist-bar").hidden = n === 0;
    document.body.classList.toggle("has-shortlist", n > 0);
    if (bump && !reducedMotion) {
      const bar = $("#shortlist-bar");
      bar.classList.remove("bump"); void bar.offsetWidth; bar.classList.add("bump");
    }
    if ($("#shortlist").open) renderShortlist();
  }

  function favButton(v) {
    const b = el("button", { class: "fav-btn", type: "button", "data-fav": v.id, "aria-pressed": "false", "aria-label": `Save ${v.title} to shortlist`, title: "Save to shortlist", text: "♥" });
    b.addEventListener("click", (e) => { e.stopPropagation(); toggleFav(v.id); });
    return b;
  }

  function renderShortlist() {
    const list = [...favs].map(byId).filter(Boolean);
    $("#shortlist-items").replaceChildren(...list.map((v) => {
      const remove = el("button", { class: "icon-btn", type: "button", "aria-label": `Remove ${v.title}`, text: "✕" });
      remove.addEventListener("click", () => toggleFav(v.id));
      return el("li", {}, [
        el("img", { src: v.thumbnail, alt: "", width: "96", height: "54", loading: "lazy" }),
        el("div", {}, [
          el("strong", { text: v.title }),
          el("a", { href: withUtm(v.stockUrl, v.id), target: "_blank", rel: "noopener noreferrer", "data-track": "buy_click", "data-clip": v.id, text: "License on Adobe Stock ↗" }),
        ]),
        remove,
      ]);
    }));
    $("#license-all").textContent = `License all on Adobe Stock (${list.length})`;
    $("#license-all").disabled = list.length === 0;
  }

  $("#shortlist-open").addEventListener("click", () => {
    renderShortlist();
    $("#shortlist-note").hidden = true;
    openDialog($("#shortlist"));
  });

  $("#license-all").addEventListener("click", () => {
    const list = [...favs].map(byId).filter(Boolean);
    let blocked = 0;
    list.forEach((v) => {
      const w = window.open(withUtm(v.stockUrl, v.id), "_blank");
      if (w) w.opener = null;
      else blocked++;
    });
    const note = $("#shortlist-note");
    note.hidden = blocked === 0;
    note.textContent = `Your browser blocked ${blocked} ${blocked === 1 ? "tab" : "tabs"} — use the individual links above.`;
  });

  /* ---------- Dialog helpers ---------- */
  function openDialog(d) {
    if (!d.open) d.showModal();
    document.body.classList.add("locked");
  }
  $$("dialog").forEach((d) => {
    d.addEventListener("close", () => {
      if (!$$("dialog").some((x) => x.open)) document.body.classList.remove("locked");
    });
    // click on backdrop closes
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
    $$("[data-close]", d).forEach((b) => b.addEventListener("click", () => d.close()));
  });

  /* ---------- Preview playback ---------- */
  let current = null; // the media element currently playing

  function stop(media) {
    const v = media.querySelector("video");
    if (v) v.pause();
    media.classList.remove("playing");
    if (current === media) current = null;
  }

  function play(media, src) {
    if (current && current !== media) stop(current);
    let v = media.querySelector("video");
    if (!v) {
      v = el("video", { muted: true, loop: true, playsinline: true, preload: "none", "aria-hidden": "true", tabindex: "-1" });
      v.muted = true;
      v.src = src;
      media.prepend(v);
    }
    v.play().then(() => {
      if (!media.matches(":hover")) return v.pause();
      media.classList.add("playing");
      current = media;
    }).catch(() => {});
  }

  /* ---------- Cards ---------- */
  function specLine(v) {
    return el("p", { class: "spec-line" }, [
      el("span", { text: v.resolution }),
      el("span", { text: v.duration }),
      v.fps ? el("span", { text: `${v.fps} fps` }) : null,
      v.loopable ? el("span", { class: "yes", text: "Seamless loop" }) : null,
    ]);
  }

  function buyLink(v, extraClass = "") {
    return el("a", {
      class: `btn btn-buy ${extraClass}`.trim(), href: withUtm(v.stockUrl, v.id), target: "_blank", rel: "noopener noreferrer",
      "data-track": "buy_click", "data-clip": v.id, text: "License on Adobe Stock",
    });
  }

  function card(v, list) {
    const media = el("button", { class: "media", type: "button", "aria-label": `View details: ${v.title}` }, [
      el("img", { src: v.thumbnail, alt: `${v.title} — ${v.category}`, loading: "lazy", width: "640", height: "360", decoding: "async" }),
      el("span", { class: "badge", text: v.category }),
      v.sample ? el("span", { class: "badge badge-sample", text: "Sample data" }) : null,
      el("span", { class: "expand", "aria-hidden": "true", text: "View details" }),
    ]);
    media.addEventListener("click", () => openClip(v.id, list));
    if (autoPreview) {
      media.addEventListener("mouseenter", () => play(media, v.preview));
      media.addEventListener("mouseleave", () => stop(media));
    }

    const titleLink = el("a", { href: `#clip=${encodeURIComponent(v.id)}`, text: v.title });
    titleLink.addEventListener("click", (e) => { e.preventDefault(); openClip(v.id, list); });

    const fav = favButton(v);
    fav.setAttribute("aria-pressed", String(isFav(v.id)));

    return el("article", { class: "card" }, [
      fav,
      media,
      el("div", { class: "card-body" }, [
        el("h3", {}, [titleLink]),
        specLine(v),
        v.price ? el("p", { class: "price", text: v.price }) : null,
        el("p", { class: "license-note", text: "Commercial license via Adobe Stock" }),
        buyLink(v),
      ]),
    ]);
  }

  /* ---------- Featured ---------- */
  function renderFeatured() {
    let list = videos.filter((v) => v.featured);
    if (!list.length) list = videos;
    list = list.slice(0, 6);
    const g = $("#featured-grid");
    g.replaceChildren(...list.map((v) => card(v, list)));
    g.setAttribute("aria-busy", "false");
  }

  /* ---------- Use cases ---------- */
  function renderUseCases() {
    const items = (site.useCases || []).map((u) => {
      const n = videos.filter((v) => (v.useCases || []).includes(u.id)).length;
      if (!n) return null;
      const b = el("button", { class: "usecase", type: "button" }, [
        el("strong", { text: u.label }),
        el("span", { text: u.description || "" }),
        el("span", { class: "count", text: `${n} ${n === 1 ? "clip" : "clips"} →` }),
      ]);
      b.addEventListener("click", () => {
        setFilter({ useCase: u.id, collection: "", category: "All" });
        $("#collection").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
      });
      return b;
    }).filter(Boolean);
    $("#use-cases").hidden = items.length === 0;
    $("#usecase-list").replaceChildren(...items);
  }

  /* ---------- Collections (sets) ---------- */
  function renderCollections() {
    const sets = (site.collections || []).map((c) => {
      const clips = videos.filter((v) => v.collection === c.id);
      if (!clips.length) return null;
      const thumbs = clips.slice(0, 3);
      const browse = el("button", { class: "btn btn-outline", type: "button", text: `Browse ${clips.length} ${clips.length === 1 ? "clip" : "clips"}` });
      browse.addEventListener("click", () => {
        setFilter({ collection: c.id, useCase: "", category: "All" });
        $("#collection").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
      });
      return el("article", { class: "set" }, [
        el("div", { class: `set-mosaic n${thumbs.length}` }, thumbs.map((v) => el("img", { src: v.thumbnail, alt: "", loading: "lazy", width: "640", height: "360", decoding: "async" }))),
        el("div", { class: "set-body" }, [
          el("span", { class: "set-count", text: `${clips.length} ${clips.length === 1 ? "clip" : "clips"} in this set` }),
          el("h3", { text: c.name }),
          c.description ? el("p", { class: "muted", text: c.description }) : null,
          el("div", { class: "set-actions" }, [
            browse,
            c.stockUrl ? el("a", { class: "btn btn-buy", href: withUtm(c.stockUrl, c.id), target: "_blank", rel: "noopener noreferrer", "data-track": "buy_click", "data-clip": c.id, text: "View full set on Adobe Stock" }) : null,
          ]),
        ]),
      ]);
    }).filter(Boolean);
    $("#collections").hidden = sets.length === 0;
    $("#collection-list").replaceChildren(...sets);
  }

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
    if (!f || !f.enabled || !f.url) return;
    $("#free-title").textContent = f.title || "Free sample clip";
    $("#free-desc").textContent = f.description || "";
    $("#free-spec").textContent = [f.resolution, "Free download", "No sign-up"].filter(Boolean).join("  ·  ");
    if (f.thumbnail) $("#free-thumb").src = f.thumbnail;
    $("#free-download").href = f.url;
    $("#free-more").href = mailto("More free samples");
    $("#free-sample").hidden = false;
  }

  /* ---------- Filter & search ---------- */
  function matches(v) {
    if (filters.category !== "All" && v.category !== filters.category) return false;
    if (filters.useCase && !(v.useCases || []).includes(filters.useCase)) return false;
    if (filters.collection && v.collection !== filters.collection) return false;
    if (!filters.query) return true;
    const hay = [v.title, v.category, ...(v.tags || []), ...(v.useCases || []).map(useCaseLabel), collectionInfo(v.collection)?.name || ""].join(" ").toLowerCase();
    return filters.query.split(/\s+/).every((w) => hay.includes(w));
  }

  function setFilter(patch) {
    Object.assign(filters, patch);
    shown = PAGE_SIZE;
    chipsEl.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.cat === filters.category)));
    render();
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

  function render() {
    const list = videos.filter(matches);
    current = null;
    grid.replaceChildren(...list.slice(0, shown).map((v) => card(v, list)));
    grid.setAttribute("aria-busy", "false");
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
    render();
    // move focus to the first newly added card for keyboard users
    if (first) $$(".card .media", grid)[list.indexOf(first)]?.focus();
  });

  $("#clear-filters").addEventListener("click", () => {
    searchEl.value = "";
    setFilter({ category: "All", useCase: "", collection: "", query: "" });
  });

  function buildChips() {
    const cats = ["All", ...new Set(videos.map((v) => v.category))];
    chipsEl.replaceChildren(...cats.map((c) => {
      const b = el("button", { class: "chip", type: "button", "data-cat": c, "aria-pressed": String(c === filters.category), text: c });
      b.addEventListener("click", () => setFilter({ category: c }));
      return b;
    }));
  }

  let searchTimer;
  searchEl.addEventListener("input", () => {
    filters.query = searchEl.value.trim().toLowerCase();
    shown = PAGE_SIZE;
    render();
    clearTimeout(searchTimer);
    if (filters.query) searchTimer = setTimeout(() => track("filter", { search: filters.query }), 1200);
  });

  /* ---------- Clip modal ---------- */
  const modal = $("#clip-modal"), mVideo = $("#m-video");
  let modalList = [], modalIndex = 0;

  function openClip(id, list) {
    const v = byId(id);
    if (!v) return;
    modalList = list && list.some((x) => x.id === id) ? list : videos;
    modalIndex = modalList.findIndex((x) => x.id === id);
    fillModal(v);
    openDialog(modal);
    history.replaceState(null, "", `#clip=${encodeURIComponent(id)}`);
    track("modal_open", { clip: id });
  }

  function fillModal(v) {
    if (current) stop(current);
    mVideo.pause();
    mVideo.poster = v.poster || v.thumbnail;
    mVideo.src = v.preview;
    mVideo.controls = reducedMotion;
    if (!reducedMotion) mVideo.play().catch(() => {});

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
    buy.href = withUtm(v.stockUrl, v.id);
    buy.dataset.clip = v.id;
    const fav = $("#m-fav");
    fav.dataset.fav = v.id;
    fav.setAttribute("aria-pressed", String(isFav(v.id)));
    fav.querySelector("span").textContent = isFav(v.id) ? "Saved" : "Save";
    fav.setAttribute("aria-label", `Save ${v.title} to shortlist`);

    const many = modalList.length > 1;
    $("#m-prev").hidden = !many;
    $("#m-next").hidden = !many;

    // More like this: same category first, then shared tags/use cases
    const score = (x) => (x.category === v.category ? 3 : 0) + (x.collection && x.collection === v.collection ? 2 : 0)
      + (x.tags || []).filter((t) => t !== "sample" && t !== "placeholder" && (v.tags || []).includes(t)).length
      + (x.useCases || []).filter((u) => (v.useCases || []).includes(u)).length * 0.5;
    const similar = videos.filter((x) => x.id !== v.id).map((x) => [x, score(x)]).filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1]).slice(0, 4).map(([x]) => x);
    $("#m-more-wrap").hidden = similar.length === 0;
    $("#m-more").replaceChildren(...similar.map((x) => {
      const b = el("button", { type: "button" }, [
        el("img", { src: x.thumbnail, alt: "", loading: "lazy", width: "320", height: "180" }),
        el("span", { text: x.title }),
      ]);
      b.addEventListener("click", () => openClip(x.id, videos));
      return el("li", {}, [b]);
    }));
    $(".modal-inner", modal).scrollTop = 0;
    $(".modal-info", modal).scrollTop = 0;
  }

  function step(dir) {
    if (modalList.length < 2) return;
    modalIndex = (modalIndex + dir + modalList.length) % modalList.length;
    const v = modalList[modalIndex];
    fillModal(v);
    history.replaceState(null, "", `#clip=${encodeURIComponent(v.id)}`);
  }

  $("#m-prev").addEventListener("click", () => step(-1));
  $("#m-next").addEventListener("click", () => step(1));
  $("#m-fav").addEventListener("click", (e) => toggleFav(e.currentTarget.dataset.fav));
  modal.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
  });
  modal.addEventListener("close", () => {
    mVideo.pause();
    mVideo.removeAttribute("src");
    mVideo.load();
    if (location.hash.startsWith("#clip=")) history.replaceState(null, "", location.pathname + location.search);
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

  /* ---------- Hero video (lazy, skipped when reduced motion) ---------- */
  function initHero() {
    const hv = $("#hero-video");
    if (reducedMotion || !hv) return;
    hv.src = hv.dataset.src;
    hv.play().catch(() => {});
    new IntersectionObserver(([e]) => (e.isIntersecting ? hv.play().catch(() => {}) : hv.pause())).observe(hv);
  }

  /* ---------- Gentle reveal on scroll ---------- */
  function initReveal() {
    if (reducedMotion || !("IntersectionObserver" in window)) return;
    const targets = $$(".section-head, .usecases, .sets, .free, .steps, .faq-list, .about-body, .finale > *");
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -8% 0px" });
    targets.forEach((t) => { t.classList.add("reveal"); io.observe(t); });
  }

  /* ---------- Init ---------- */
  Promise.all([
    loadJson("videos.json", "videos-fallback"),
    loadJson("site.json", "site-fallback").catch(() => ({})),
  ]).then(([v, s]) => {
    videos = Array.isArray(v) ? v : [];
    site = s || {};
    applySite();
    initAnalytics();
    renderFeatured();
    renderUseCases();
    renderCollections();
    buildChips();
    render();
    renderProof();
    renderFreeSample();
    syncFavs(false);
    injectJsonLd();
    initReveal();
    openFromHash();
  }).catch(() => {
    grid.setAttribute("aria-busy", "false");
    $("#featured-grid").setAttribute("aria-busy", "false");
    errorEl.hidden = false;
  });

  if ("requestIdleCallback" in window) requestIdleCallback(initHero); else setTimeout(initHero, 200);
})();
