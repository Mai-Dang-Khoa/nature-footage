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
  const filters = { category: "All", useCase: "", collection: "", query: "" };
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
      const label = b.querySelector(".fav-label");
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
  function buyLink(v, extraClass = "") {
    return el("a", {
      class: `btn btn-accent ${extraClass}`.trim(), href: withUtm(v.stockUrl, v.id), target: "_blank", rel: "noopener noreferrer",
      "data-track": "buy_click", "data-clip": v.id, text: "License on Adobe Stock",
    });
  }

  function card(v, list) {
    const badge = [v.resolution, v.duration, v.sample ? "Sample" : null].filter(Boolean).join(" · ");
    const hit = el("button", { class: "card-hit", type: "button", "aria-label": `${v.title} — preview and view details` });
    const details = el("button", { class: "btn btn-outline btn-sm card-details", type: "button", text: "Details" });
    const fav = favButton(v);
    fav.setAttribute("aria-pressed", String(isFav(v.id)));

    const cardEl = el("article", { class: "card", "data-id": v.id, "data-reveal": "up" }, [
      el("img", { class: "card-thumb", src: v.thumbnail, alt: "", loading: "lazy", width: "640", height: "360", decoding: "async" }),
      el("div", { class: "card-shade" }),
      hit,
      el("span", { class: "card-badge", text: badge }),
      fav,
      el("div", { class: "card-foot" }, [
        el("h3", { class: "card-title", title: v.title, text: v.title }),
        el("div", { class: "card-actions" }, [buyLink(v, "btn-sm"), details]),
      ]),
    ]);

    const open = () => openClip(v.id, list, hit);
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
    return cardEl;
  }

  // tapping outside any card stops the active preview (touch)
  document.addEventListener("pointerdown", (e) => {
    if (current && !current.contains(e.target)) stop(current);
  }, { passive: true });

  /* ---------- Featured ---------- */
  function renderFeatured() {
    let list = videos.filter((v) => v.featured);
    if (!list.length) list = videos;
    list = list.slice(0, 6);
    const g = $("#featured-grid");
    g.replaceChildren(...list.map((v) => card(v, list)));
    g.setAttribute("aria-busy", "false");
    Motion.reveal(g);
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
            isReal(c.collectionUrl || c.stockUrl) ? el("a", { class: "btn btn-accent", href: withUtm(c.collectionUrl || c.stockUrl, c.id), target: "_blank", rel: "noopener noreferrer", "data-track": "buy_click", "data-clip": c.id, text: "View full set on Adobe Stock" }) : null,
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
    Motion.reveal(grid);
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
    if (first) $$(".card-hit", grid)[list.indexOf(first)]?.focus();
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
  let modalList = [], modalIndex = 0, opener = null;

  function openClip(id, list, from) {
    const v = byId(id);
    if (!v) return;
    modalList = list && list.some((x) => x.id === id) ? list : videos;
    modalIndex = modalList.findIndex((x) => x.id === id);
    if (!modal.open) opener = from || document.activeElement;
    fillModal(v);
    openDialog(modal);
    $("#m-buy").focus({ preventScroll: true });
    history.replaceState(null, "", `#clip=${encodeURIComponent(id)}`);
    track("modal_open", { clip: id });
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
    buy.href = withUtm(v.stockUrl, v.id);
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
  modal.addEventListener("close", () => {
    mVideo.pause();
    mVideo.removeAttribute("src");
    mVideo.load();
    if (location.hash.startsWith("#clip=")) history.replaceState(null, "", location.pathname + location.search);
    // return focus to the card that opened the modal
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    opener = null;
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
  const sectionToLink = { featured: "#collection", "use-cases": "#collection", collections: "#collection", collection: "#collection", process: "#process", faq: "#faq", about: "#contact", contact: "#contact" };
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

  /* ---------- Init ---------- */
  Promise.all([
    loadJson("videos.json", "videos-fallback", validVideos),
    loadJson("site.json", "site-fallback", validSite).catch(() => ({})),
  ]).then(([v, s]) => {
    videos = v.filter((x) => x && x.id && x.title);
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
    Motion.reveal(document);
    initHero(videos.find((x) => x.featured) || videos[0]);
    openFromHash();
  }).catch(() => {
    grid.setAttribute("aria-busy", "false");
    $("#featured-grid").setAttribute("aria-busy", "false");
    errorEl.hidden = false;
  });

})();
