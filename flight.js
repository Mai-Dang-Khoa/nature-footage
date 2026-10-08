/* ==========================================================================
   Wild Frames — one continuous flight.
   Scroll progress p (0–1) is the timeline: it picks the flight frame, the weather,
   which line of text is in the air and which clip steps out of the scene.
   Desktop adds wind (mist leans toward the pointer) and press-and-hold to fly on.
   Phones: shorter flight, clips stacked below. Reduced motion: four stills, no scrub.
   ========================================================================== */
(() => {
  "use strict";

  const WF = window.WF;
  if (!WF) return;
  const { site, clips } = WF;
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const mq = (q) => window.matchMedia && matchMedia(q).matches;

  const still = root.classList.contains("still");
  const mobile = mq("(max-width: 799px)") || mq("(pointer: coarse)");
  if (mobile && !still) root.classList.add("mobile");
  const windy = !still && !mobile && mq("(hover: hover) and (pointer: fine)");

  /* ---------- helpers ---------- */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ramp = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  // cubic-bezier(.16, 1, .3, 1), solved for x
  const ease = (x) => {
    const cx = 3 * .16, bx = 3 * (.3 - .16) - cx, ax = 1 - cx - bx;
    const cy = 3 * 1, by = 3 * (1 - 1) - cy, ay = 1 - cy - by;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const fx = ((ax * t + bx) * t + cx) * t - x, d = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(d) < 1e-6) break;
      t = clamp(t - fx / d);
    }
    return ((ay * t + by) * t + cy) * t;
  };
  const isReal = (x) => typeof x === "string" && x.trim() !== "" && !x.includes("[YOUR_");
  function el(tag, props = {}, kids = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else n.setAttribute(k, v === true ? "" : v);
    }
    kids.forEach((c) => c && n.append(c));
    return n;
  }
  function withUtm(url, campaign) {
    try {
      const u = new URL(url, location.href);
      u.searchParams.set("utm_source", "portfolio");
      u.searchParams.set("utm_medium", "site");
      u.searchParams.set("utm_campaign", campaign);
      return u.href;
    } catch { return url; }
  }

  /* ---------- analytics (off unless data.js has an id) ---------- */
  const a = site.analytics || {};
  if (a.id && a.provider === "plausible") {
    window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
    document.head.append(el("script", { defer: true, "data-domain": a.id, src: "https://plausible.io/js/script.js" }));
  } else if (a.id && a.provider === "goatcounter") {
    document.head.append(el("script", { async: true, "data-goatcounter": a.id.includes("://") ? a.id : `https://${a.id}.goatcounter.com/count`, src: "https://gc.zgo.at/count.js" }));
  }
  function track(name, props = {}) {
    if (!a.id) return;
    try {
      if (a.provider === "plausible" && window.plausible) window.plausible(name, { props });
      else if (a.provider === "goatcounter" && window.goatcounter && window.goatcounter.count) {
        const detail = Object.values(props).join("/");
        window.goatcounter.count({ path: detail ? `${name}/${detail}` : name, title: name, event: true });
      }
    } catch { /* never break the page */ }
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-track]");
    if (t) track(t.dataset.track, t.dataset.clip ? { clip: t.dataset.clip } : {});
  });

  /* ---------- buttons: a real link, or a disabled "Listing soon". Never "#". ---------- */
  function licenseButton(c) {
    const url = c && isReal(c.stockUrl) ? c.stockUrl : null;
    if (!url) return el("button", { class: "cta", type: "button", disabled: true, text: "Listing soon" });
    return el("a", { class: "cta", href: withUtm(url, c.id), target: "_blank", rel: "noopener noreferrer", "data-track": "buy_click", "data-clip": c.id, text: "License on Adobe Stock" });
  }
  const freeButton = (c) => (c.free && isReal(site.freeFile)
    ? el("a", { class: "ghost", href: site.freeFile, download: true, "data-track": "free_download", "data-clip": c.id, text: "Download 720p" })
    : null);
  const meta = (c) => [c.resolution, c.loop ? "seamless loop" : "", c.people === false ? "no people" : ""].filter(Boolean).join(" · ");
  const note = (c) => (c.loop ? "CGI, not a camera. Loop matches at the first frame." : "CGI, not a camera.");
  const emailLink = () => (isReal(site.email) && site.email.includes("@")
    ? el("a", { class: "text-link", href: `mailto:${site.email}?subject=${encodeURIComponent("Custom scene")}`, text: "Need a custom scene? Email" })
    : null);

  // one clip: picture, then three lines (title, specs, buttons) and the proof line
  function clipBox(c, { cls = "frame", heading = "h2", autoplay = true } = {}) {
    const poster = el("img", { src: c.poster, alt: "", width: "640", height: "360", loading: "lazy", decoding: "async" });
    const video = el("video", { muted: true, loop: true, playsinline: true, preload: "none", "aria-hidden": "true", tabindex: "-1" });
    video.muted = true;
    if (!autoplay) { video.controls = true; video.removeAttribute("aria-hidden"); video.removeAttribute("tabindex"); video.poster = c.poster; video.src = c.preview; video.classList.add("playing"); }
    video.addEventListener("playing", () => video.classList.add("playing"));
    const title = el(heading, { class: "frame-title" }, [document.createTextNode(c.title), c.placeholder ? el("span", { class: "tag", text: "Placeholder" }) : null]);
    const box = el("div", { class: cls, "data-id": c.id }, [
      el("div", { class: "frame-media" }, [poster, video]),
      title,
      el("p", { class: "frame-meta", text: `${meta(c)} — for ${c.use}` }),
      el("div", { class: "frame-actions" }, [licenseButton(c), freeButton(c)]),
      el("p", { class: "frame-note", text: note(c) }),
    ]);
    box._video = video;
    box._clip = c;
    return box;
  }
  const loadVideo = (box) => { if (!box._video.src) box._video.src = box._clip.preview; };

  /* ---------- JSON-LD (search engines) ---------- */
  (() => {
    const abs = (p) => new URL(p, document.baseURI).href;
    const s = el("script", { type: "application/ld+json" });
    s.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": clips.map((c) => {
      const o = { "@type": "VideoObject", name: c.title, description: `${c.title}: ${meta(c)}. Nature footage rendered in Unreal Engine 5.`, thumbnailUrl: abs(c.poster), contentUrl: abs(c.preview) };
      if (isReal(c.stockUrl)) o.url = c.stockUrl;
      return o;
    }) });
    document.head.append(s);
  })();

  const finalClip = clips.find((c) => c.final) || clips[clips.length - 1];
  const lineText = [...document.querySelectorAll("#lines .line")].map((n) => n.textContent);

  /* ==========================================================================
     Reduced motion: four stills of the same angle, each with its clips. No scrub.
     ========================================================================== */
  if (still) {
    const list = $("#list");
    const h1 = $(".line-hero");
    h1.className = "still-title";
    list.append(h1);
    const lineFor = { rain: lineText[1], after: lineText[2], golden: lineText[3], stars: lineText[4] };
    site.stills.forEach((s) => {
      const block = el("section", { class: "still-block" }, [
        el("img", { src: s.src, alt: s.alt, width: "1280", height: "720", loading: "lazy", decoding: "async" }),
        el("p", { class: "line", text: lineFor[s.weather] || "" }),
      ]);
      clips.filter((c) => c.weather === s.weather).forEach((c) => block.append(clipBox(c, { cls: c === finalClip ? "card end" : "card", heading: "h2", autoplay: false })));
      if (s.weather === "stars") { const m = emailLink(); if (m) block.append(m); }
      list.append(block);
    });
    $("#end").remove();
    list.lastElementChild.id = "end";
    return;
  }

  /* ==========================================================================
     The flight
     ========================================================================== */
  const flight = $("#flight"), stage = $("#stage");
  const canvas = $("#scene"), ctx = canvas.getContext && canvas.getContext("2d");
  const first = $("#scene-first");
  const set = mobile ? site.flight.mobile : site.flight.desktop;
  const N = set.frames, pad = site.flight.pad || 4;
  const frameUrl = (i) => set.path.replace("{n}", String(i + 1).padStart(pad, "0"));
  if (mobile) first.src = frameUrl(0);
  if (site.flight.label) canvas.setAttribute("aria-label", site.flight.label);

  // frames: first at once, then nearest-first, ≤ 6 requests at a time (only the next stretch is fetched early)
  const bitmaps = new Array(N), state = new Uint8Array(N); // 0 idle, 1 loading, 2 ready, 3 failed
  let inflight = 0, want = 0, dirty = true;
  const canDecode = !!(ctx && window.createImageBitmap && window.fetch);
  async function load(i) {
    state[i] = 1; inflight++;
    try {
      const res = await fetch(frameUrl(i));
      if (!res.ok) throw new Error(res.status);
      bitmaps[i] = await createImageBitmap(await res.blob());
      state[i] = 2; dirty = true;
    } catch { state[i] = 3; } finally { inflight--; pump(); }
  }
  function pump() {
    if (!canDecode) return;
    const reach = Math.ceil(N * 0.18); // look ahead/behind ~18% of the flight
    while (inflight < 6) {
      let next = -1;
      for (let d = 0; d <= reach && next < 0; d++) {
        if (want + d < N && state[want + d] === 0) next = want + d;
        else if (want - d >= 0 && state[want - d] === 0) next = want - d;
      }
      if (next < 0) break;
      load(next);
    }
  }
  const nearestReady = (i) => { for (let d = 0; d < N; d++) { if (i - d >= 0 && state[i - d] === 2) return i - d; if (i + d < N && state[i + d] === 2) return i + d; } return -1; };

  let W = 0, H = 0, drawn = -1;
  const rainCv = $("#rain"), rctx = rainCv.getContext && rainCv.getContext("2d");
  const starsCv = $("#stars"), sctx = starsCv.getContext && starsCv.getContext("2d");
  function size() {
    const k = Math.min(window.devicePixelRatio || 1, 1.5);
    W = stage.clientWidth; H = stage.clientHeight;
    canvas.width = Math.round(W * k); canvas.height = Math.round(H * k);
    rainCv.width = W; rainCv.height = H;
    starsCv.width = W; starsCv.height = H;
    if (sctx) { // stars: drawn once per size
      sctx.clearRect(0, 0, W, H);
      let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < (W * H) / 2500; i++) { const v = 150 + rnd() * 105; sctx.fillStyle = `rgb(${v},${v},${v})`; sctx.fillRect(rnd() * W, rnd() * H * 0.6, rnd() < .1 ? 2 : 1, rnd() < .1 ? 2 : 1); }
    }
    drops.length = 0;
    for (let i = 0; i < (mobile ? 110 : 220); i++) drops.push({ x: Math.random() * W, y: Math.random() * H, v: 14 + Math.random() * 12, l: 12 + Math.random() * 14 });
    dirty = true;
  }
  function draw(i) {
    const bmp = bitmaps[i];
    if (!bmp) return;
    const cw = canvas.width, ch = canvas.height, s = Math.max(cw / bmp.width, ch / bmp.height);
    ctx.drawImage(bmp, (cw - bmp.width * s) / 2, (ch - bmp.height * s) / 2, bmp.width * s, bmp.height * s);
    if (drawn < 0) canvas.classList.add("on");
    drawn = i;
  }

  /* ---------- weather ---------- */
  const wx = { rain: $(".wx-rain"), after: $(".wx-after"), golden: $(".wx-golden"), stars: $(".wx-stars") };
  const weather = (p) => ({
    rain: 1 - ramp(.40, .44, p),                          // 0–0.30 night rain, 0.30–0.42 the storm
    after: ramp(.40, .44, p) * (1 - ramp(.60, .64, p)),   // 0.42–0.62 rain stops, mist
    golden: ramp(.60, .64, p) * (1 - ramp(.82, .86, p)),  // 0.62–0.84 golden hour
    stars: ramp(.82, .86, p),                              // 0.84–1 stars
  });
  const drops = [];
  let wind = 0;
  function rain(level) {
    rainCv.style.opacity = level.toFixed(3);
    if (!rctx || level < 0.02) return;
    rctx.clearRect(0, 0, W, H);
    rctx.strokeStyle = "rgba(190, 205, 230, .55)";
    rctx.lineWidth = 1;
    rctx.beginPath();
    const slant = -2 + wind * 0.15;
    for (const d of drops) {
      d.y += d.v; d.x += slant;
      if (d.y > H) { d.y = -d.l; d.x = Math.random() * W; }
      if (d.x < 0) d.x += W; else if (d.x > W) d.x -= W;
      rctx.moveTo(d.x, d.y); rctx.lineTo(d.x - slant, d.y + d.l);
    }
    rctx.stroke();
  }

  // lightning: one flash (< 120ms) each time the camera passes 0.35, never while standing still
  const flash = $("#flash"), lines = $("#lines");
  let armed = true, lastP = 0;
  function lightning(p) {
    if (armed && (lastP - .35) * (p - .35) <= 0 && lastP !== p) {
      armed = false;
      if (flash.animate) flash.animate([{ opacity: 0 }, { opacity: .7, offset: .25 }, { opacity: 0 }], { duration: 110, easing: "ease-out" });
      lines.classList.add("bright");
      setTimeout(() => lines.classList.remove("bright"), 110);
    }
    if (p < .30 || p > .42) armed = true;
    lastP = p;
  }

  /* ---------- lines in the air ---------- */
  const lineEls = [...lines.querySelectorAll(".line")].map((n) => ({ n, a: +n.dataset.a, b: +n.dataset.b, o: -1, y: 0 }));
  function placeLines(p) {
    lineEls.forEach((L) => {
      const t = (p - L.a) / (L.b - L.a);
      let o = 0;
      if (t > -.05 && t < 1.05) o = (L.a === 0 ? 1 : ramp(0, .2, t)) * (L.b > 1 ? 1 : 1 - ramp(.8, 1, t));
      const e = ease(clamp(t));
      const y = lerp(24, -72, e), sc = lerp(1.03, .95, e);
      if (Math.abs(o - L.o) < .002 && Math.abs(y - L.y) < .2) return;
      L.o = o; L.y = y;
      L.n.style.opacity = o.toFixed(3);
      L.n.style.transform = o > 0 ? `translate3d(0, ${y.toFixed(1)}px, 0) scale(${sc.toFixed(4)})` : "";
    });
  }

  /* ---------- clips step out of the scene (desktop) ---------- */
  const frames = mobile ? [] : clips.map((c) => {
    const box = clipBox(c, { cls: c === finalClip ? "frame final" : "frame" });
    $("#frames").append(box);
    return box;
  });
  const proof = $("#proof");
  let activeBox = null;
  function activeFor(p) {
    if (p >= .9) return frames.find((f) => f._clip === finalClip) || null;
    let best = null, bd = .03;
    frames.forEach((f) => { if (f._clip === finalClip) return; const d = Math.abs(p - f._clip.weatherAt); if (d <= bd) { bd = d; best = f; } });
    return best;
  }
  function setActive(box) {
    if (box === activeBox) return;
    if (activeBox) { activeBox.classList.remove("on"); activeBox._video.pause(); }
    activeBox = box;
    proof.classList.toggle("on", !!box);
    if (!box) return;
    box.classList.add("on");
    loadVideo(box);
    box._video.play().catch(() => {});
    buildProof(box._clip);
    track("clip_view", { clip: box._clip.id });
  }
  // the same preview, sitting on an editor timeline twice: where the loop joins
  let head = null, headW = 0;
  function buildProof(c) {
    const clip = () => { const b = el("div", { class: "tl-clip" }); b.style.backgroundImage = `url("${c.poster}")`; return b; };
    head = el("div", { class: "tl-head" });
    proof.replaceChildren(
      el("div", { class: "tl-ruler" }, [el("span", { text: "00:00" }), el("span", { text: "end" })]),
      el("div", { class: "tl-track" }, [el("span", { text: "V1" }), clip(), clip(), el("span", { class: "tl-join", text: "first frame = last frame" }), head]),
      el("div", { class: "tl-track" }, [el("span", { text: "A1" }), el("div", { class: "tl-audio" }), el("div", { class: "tl-audio" })]),
    );
    headW = 0;
  }
  function movePlayhead() {
    if (!activeBox || !head) return;
    const v = activeBox._video;
    if (!headW) headW = (proof.querySelector(".tl-clip") || {}).offsetWidth || 0;
    const t = v.duration ? v.currentTime / v.duration : 0;
    head.style.setProperty("--x", `${(t * headW).toFixed(1)}px`);
  }
  // warm up the preview shortly before its clip arrives
  function preload(p) { frames.forEach((f) => { if (Math.abs(p - f._clip.weatherAt) < .08 || (f._clip === finalClip && p > .82)) loadVideo(f); }); }

  /* ---------- wind (desktop): mist leans ≤ 12px toward the pointer; press and hold to fly on ---------- */
  const mist = $("#mist");
  const gust = { x: 0, y: 0, tx: 0, ty: 0, last: 0 };
  let holding = false;
  if (windy) {
    stage.addEventListener("pointermove", (e) => {
      const dx = e.clientX - W / 2, dy = e.clientY - H / 2, len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / (W / 2));
      gust.tx = (dx / len) * 12 * k; gust.ty = (dy / len) * 12 * k; gust.last = performance.now();
    }, { passive: true });
    stage.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("a, button, video, .frame")) return;
      holding = true;
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((t) => stage.addEventListener(t, () => { holding = false; }));
    window.addEventListener("blur", () => { holding = false; });
  }
  function blow(now) {
    if (now - gust.last > 600) { gust.tx = 0; gust.ty = 0; }
    gust.x = lerp(gust.x, gust.tx, .08); gust.y = lerp(gust.y, gust.ty, .08);
    wind = gust.x;
    mist.style.transform = `translate3d(${gust.x.toFixed(2)}px, ${gust.y.toFixed(2)}px, 0)`;
    if (holding) window.scrollBy(0, 3); // a gentle push forward; release to stop
  }

  /* ---------- sound (optional, off by default; hidden when there is no file) ---------- */
  const soundBtn = $("#sound");
  const au = site.audio || {};
  const tracks = [au.ground, au.high].filter(isReal).length ? [au.ground, au.high].map((src) => (isReal(src) ? Object.assign(new Audio(src), { loop: true, volume: 0 }) : null)) : null;
  let soundOn = false;
  if (tracks) {
    setTimeout(() => { soundBtn.hidden = false; }, 2000);
    soundBtn.addEventListener("click", () => {
      soundOn = !soundOn;
      tracks.forEach((t) => t && (soundOn ? t.play().catch(() => {}) : t.pause()));
      soundBtn.setAttribute("aria-pressed", String(soundOn));
      soundBtn.textContent = soundOn ? "Sound on" : "Sound off";
    });
  }
  function mixSound(p) {
    if (!soundOn) return;
    const up = ramp(.3, .7, p);               // rain on leaves near the ground → wind up high
    if (tracks[0]) tracks[0].volume = 1 - up;
    if (tracks[1]) tracks[1].volume = up;
  }

  /* ---------- the loop: runs only while the flight is on screen and the tab is visible ---------- */
  let sp = -1, running = false, onScreen = true;
  function progress() {
    const r = flight.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - innerHeight));
  }
  function tick(now) {
    if (!onScreen || document.hidden) { running = false; return; }
    const p = progress();
    sp = sp < 0 ? p : lerp(sp, p, .12);
    if (Math.abs(sp - p) < .0004) sp = p;

    const idx = Math.round(sp * (N - 1));
    if (idx !== want) { want = idx; pump(); }
    const show = nearestReady(idx);
    if (show >= 0 && (show !== drawn || dirty)) { draw(show); dirty = false; }

    const w = weather(sp);
    for (const k in wx) wx[k].style.opacity = w[k].toFixed(3);
    rain(w.rain * .85);
    lightning(sp);
    placeLines(sp);
    if (!mobile) { setActive(activeFor(sp)); preload(sp); movePlayhead(); }
    if (windy) blow(now);
    if (tracks) mixSound(sp);
    requestAnimationFrame(tick);
  }
  const kick = () => { if (!running && onScreen && !document.hidden) { running = true; requestAnimationFrame(tick); } };
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (!onScreen) setActive(null); kick(); }).observe(flight);
  document.addEventListener("visibilitychange", kick);
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { size(); kick(); }, 120); }, { passive: true });

  size();
  if (canDecode) load(0);
  pump();
  kick();

  /* ==========================================================================
     Phones: the clips, stacked under the flight, each with its own button
     ========================================================================== */
  if (mobile) {
    const list = $("#list");
    const cards = clips.filter((c) => c !== finalClip).map((c) => clipBox(c, { cls: "card" }));
    const end = clipBox(finalClip, { cls: "card end" });
    const endHead = el("h2", { class: "line", text: lineText[4] });
    end.prepend(endHead);
    const m = emailLink(); if (m) end.append(m);
    list.append(...cards, end);
    $("#end").remove();
    end.id = "end";
    end.tabIndex = -1;
    // previews load and play only near the screen
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      const box = e.target;
      if (e.isIntersecting) { loadVideo(box); box._video.play().catch(() => {}); } else box._video.pause();
    }), { rootMargin: "200px 0px" });
    [...cards, end].forEach((b) => io.observe(b));
  }
})();
