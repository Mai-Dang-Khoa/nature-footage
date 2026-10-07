/* ==========================================================================
   FX — the "cinematic max" layer. Everything here runs only when
   <html data-fx="max">. "standard" keeps the regular site, "off" removes
   decorative motion. Heavy effects belong to groups that can be switched
   off one by one (webgl, particles, distort, grain, cursor, tilt, magnetic,
   intro); the FPS monitor in motion.js steps them down automatically.
   ========================================================================== */
(() => {
  "use strict";

  const M = window.Motion;
  if (!M) return;
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LEVELS = ["off", "standard", "max"];
  const LABEL = { off: "Off", standard: "Standard", max: "Max" };
  const track = (name, props) => { if (window.App) window.App.track(name, props); };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  // run fn with the site data, whether it is already loaded or not
  function onData(fn) { if (window.App) fn(window.App); else { const off = M.on("data", (d) => { off(); fn(d); }); } }

  /* ---------- Module registry: start when allowed, stop when a group is switched off ---------- */
  const modules = [];
  // Heavy groups (WebGL, particles) wait for a short FPS probe after the page has loaded:
  // they only start if the device keeps ≥ 50fps, so slow devices never pay for them.
  const HEAVY = ["webgl", "particles"];
  let heavyOk = null;
  const waiting = [];
  function register(group, start) {
    const m = { group, start, stop: null, running: false };
    modules.push(m);
    if (!(M.fx.max && M.fx.enabled(group))) return m;
    if (!HEAVY.includes(group) || heavyOk === true) run(m);
    else if (heavyOk === null) waiting.push(m);
    return m;
  }
  function run(m) {
    if (m.running) return;
    try { m.stop = m.start() || null; m.running = true; } catch (err) { m.running = false; }
  }
  function halt(m) {
    if (!m.running) return;
    m.running = false;
    try { if (m.stop) m.stop(); } catch (err) { /* never break the page */ }
  }
  M.on("fx", ({ group, on }) => { if (!on) modules.filter((m) => m.group === group).forEach(halt); });

  // Step down the heaviest effect first when frames drop: WebGL → particles → distort → grain → standard.
  const LADDER = ["webgl", "particles", "distort", "grain"];
  function stepDown(reason) {
    const next = LADDER.find((g) => M.fx.enabled(g));
    if (next) { M.fx.disable(next); track("fx_auto", { off: next, reason }); return; }
    toStandard(reason);
  }
  function toStandard(reason) {
    if (root.getAttribute("data-fx") !== "max") return;
    M.fx.groups.forEach((g) => M.fx.disable(g));
    root.setAttribute("data-fx", "standard");
    try { sessionStorage.setItem("fx-auto", "standard"); } catch (err) { /* ignore */ }
    track("fx_auto", { level: "standard", reason });
    updateSwitch();
  }
  // ?fxlock=1 keeps the chosen level (for testing and demos); otherwise low FPS steps effects down
  const locked = /[?&]fxlock=1\b/.test(location.search);
  if (M.fx.max && !locked) M.on("lowfps", (fps) => stepDown(`fps ${Math.round(fps)}`));

  function releaseHeavy(ok, reason) {
    if (heavyOk !== null) return;
    heavyOk = ok;
    if (ok) waiting.splice(0).forEach((m) => { if (M.fx.enabled(m.group)) run(m); });
    else { waiting.length = 0; HEAVY.forEach((g) => M.fx.disable(g)); track("fx_auto", { off: HEAVY.join("+"), reason }); }
  }
  if (M.fx.max) {
    if (locked) releaseHeavy(true, "locked");
    else {
      const probe = () => setTimeout(() => {
        const wins = [];
        const off = M.on("fps", (f) => {
          wins.push(f);
          if (wins.length < 2) return;
          off();
          const worst = Math.min(...wins);
          releaseHeavy(worst >= 50, `probe ${Math.round(worst)}fps`);
        });
        M.watchFps(2200);
      }, 600);
      if (document.readyState === "complete") probe(); else window.addEventListener("load", probe, { once: true });
    }
  }

  /* ---------- Level switch (FX button, Shift+F, footer link) ---------- */
  function currentLevel() { return root.getAttribute("data-fx") || "standard"; }
  function setLevel(level) {
    try { localStorage.setItem("fx", level); } catch (err) { /* choice lasts for this page only */ }
    try { sessionStorage.removeItem("fx-auto"); } catch (err) { /* ignore */ }
    track("fx_change", { level });
    // reload without ?fx= so the saved choice is used
    const url = new URL(location.href);
    url.searchParams.delete("fx");
    if (url.href === location.href) location.reload(); else location.replace(url.href);
  }

  const sw = el("div", "fx-switch");
  sw.id = "fx-switch";
  const toggle = el("button", "fx-toggle");
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "fx-menu");
  const menu = el("div", "fx-menu");
  menu.id = "fx-menu";
  menu.setAttribute("role", "group");
  menu.setAttribute("aria-label", "Motion level");
  menu.hidden = true;
  const choices = LEVELS.map((l) => {
    const b = el("button", "fx-choice", LABEL[l]);
    b.type = "button";
    b.dataset.level = l;
    b.addEventListener("click", () => (l === currentLevel() ? closeMenu() : setLevel(l)));
    menu.append(b);
    return b;
  });
  sw.append(toggle, menu);
  ($("#nav") || document.body).append(sw);

  function updateSwitch() {
    const l = currentLevel(), auto = root.getAttribute("data-fx-source") !== "user";
    toggle.textContent = `FX · ${LABEL[l]}`;
    toggle.setAttribute("aria-label", `Motion level: ${LABEL[l]}${auto ? " (automatic)" : ""}. Change`);
    choices.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.level === l)));
    if (footerBtn) footerBtn.textContent = `Motion: ${LABEL[l]}`;
  }
  function openMenu() { menu.hidden = false; toggle.setAttribute("aria-expanded", "true"); sw.classList.add("open"); (choices.find((b) => b.getAttribute("aria-pressed") === "true") || choices[0]).focus(); }
  function closeMenu() { menu.hidden = true; toggle.setAttribute("aria-expanded", "false"); sw.classList.remove("open"); }
  toggle.addEventListener("click", () => (menu.hidden ? openMenu() : closeMenu()));
  sw.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { e.stopPropagation(); closeMenu(); toggle.focus(); } });
  document.addEventListener("click", (e) => { if (!sw.contains(e.target) && e.target !== footerBtn && !menu.hidden) closeMenu(); });

  // Shift+F shows/hides the switch (it is hidden on small screens by default)
  document.addEventListener("keydown", (e) => {
    if (!e.shiftKey || e.key.toLowerCase() !== "f" || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest && e.target.closest("input, textarea, [contenteditable]")) return;
    sw.classList.toggle("shown");
    if (sw.classList.contains("shown")) toggle.focus();
  });

  // footer entry, always reachable (also on phones)
  let footerBtn = null;
  const footer = $(".footer");
  if (footer) {
    footerBtn = el("button", "fx-footer text-link");
    footerBtn.type = "button";
    footerBtn.addEventListener("click", () => { sw.classList.add("shown"); openMenu(); });
    const p = el("p");
    p.append(footerBtn);
    footer.append(p);
  }
  updateSwitch();

  // Site default from site.json (only when the visitor has not chosen a level)
  onData(({ site }) => {
    const want = site && LEVELS.includes(site.fxLevel) ? site.fxLevel : "max";
    if (root.getAttribute("data-fx-source") === "user") return;
    if (LEVELS.indexOf(want) < LEVELS.indexOf(currentLevel())) {
      if (want === "standard") toStandard("site default");
      else { root.setAttribute("data-fx", want); M.fx.groups.forEach((g) => M.fx.disable(g)); }
      updateSwitch();
    }
  });

  /* ---------- Hero title, letter by letter (max) ---------- */
  // Splits each word of the hero title into letters inside the existing word masks.
  // The whole title stays within 700ms; screen readers get the plain sentence via aria-label.
  function splitChars(h, cap = 700) {
    if (!h || h.dataset.chars) return 0;
    h.dataset.chars = "1";
    h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
    let i = 0;
    $$(".wi", h).forEach((wi) => {
      const walk = (node) => [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...n.textContent].forEach((ch) => {
            const s = el("span", "ch", ch);
            s.setAttribute("aria-hidden", "true");
            s.style.setProperty("--ci", i++);
            frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
      walk(wi);
      wi.classList.add("has-chars");
    });
    if (i > 1) h.style.setProperty("--char-step", `${Math.min(18, cap / (i - 1)).toFixed(2)}ms`);
    if (i > 1) h.style.setProperty("--ch-step", `${Math.min(14, cap / (i - 1)).toFixed(2)}ms`);
    return i;
  }
  if (M.fx.max) splitChars($(".hero-title"));
  root.classList.add("chars-ready");

  /* ---------- Opening curtain (first visit, max) ---------- */
  register("intro", () => {
    if (!root.classList.contains("intro-on")) return null;
    const brand = $(".intro-brand"), target = $(".nav .brand span"), skip = $("#intro-skip");
    // measure where the brand has to fly: the menu logo
    if (brand && target) {
      const a = brand.getBoundingClientRect(), b = target.getBoundingClientRect();
      brand.style.setProperty("--fly-x", `${(b.left - a.left).toFixed(1)}px`);
      brand.style.setProperty("--fly-y", `${(b.top + b.height / 2 - (a.top + a.height / 2)).toFixed(1)}px`);
      brand.style.setProperty("--fly-s", (b.width / Math.max(1, a.width)).toFixed(3));
      brand.style.setProperty("--fly-o", "1");
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      root.classList.add("intro-done");
      document.removeEventListener("keydown", onKey, true);
      if (document.activeElement === skip) document.querySelector(".skip")?.focus({ preventScroll: true });
    };
    const onKey = (e) => { if (e.key === "Escape") finish(); };
    document.addEventListener("keydown", onKey, true);
    skip.addEventListener("click", finish);
    const total = parseFloat(getComputedStyle(root).getPropertyValue("--intro-total")) || 1150;
    const timer = setTimeout(finish, total + 60);
    return () => { clearTimeout(timer); finish(); };
  });

  /* ---------- Hero layers ---------- */
  const hero = $("#hero"), heroMedia = $(".hero-media"), heroInner = $("#hero-inner"), heroShade = $(".hero-shade");
  let heroVisible = true, pageVisible = !document.hidden;
  const syncPause = () => hero && hero.classList.toggle("fx-paused", !(heroVisible && pageVisible));
  if (hero) new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; syncPause(); M.emit("hero-visible", heroVisible); }).observe(hero);
  M.on("visibility", (v) => { pageVisible = v; syncPause(); });
  const heroActive = () => heroVisible && pageVisible;
  const DPR = () => Math.min(window.devicePixelRatio || 1, 1.5);
  // normalised pointer over the hero: -1..1 from the centre, plus speed (for the colour fringe)
  const hp = { x: 0, y: 0, tx: 0, ty: 0, speed: 0, inside: false, px: 0, py: 0 };
  if (hero && M.finePointer) {
    hero.addEventListener("pointermove", (e) => {
      const nx = (e.clientX / innerWidth) * 2 - 1, ny = (e.clientY / innerHeight) * 2 - 1;
      hp.speed = Math.min(1, hp.speed + Math.hypot(nx - hp.tx, ny - hp.ty) * 4);
      hp.tx = nx; hp.ty = ny; hp.px = e.clientX; hp.py = e.clientY + M.scroll.y; hp.inside = true;
    }, { passive: true });
    hero.addEventListener("pointerleave", () => { hp.tx = 0; hp.ty = 0; hp.inside = false; });
  }
  function layer(cls, tag = "div") { const n = el(tag, `fx-layer ${cls}`); n.setAttribute("aria-hidden", "true"); return n; }

  // Mouse parallax per layer (desktop): background 8px, mist 14px, particles 22px, text 12px the other way.
  let mist = null, particlesCanvas = null;
  if (hero && M.fx.max) {
    mist = layer("fx-mist");
    heroShade.before(mist);
    const vignette = layer("fx-vignette"), leak = layer("fx-leak"), grain = layer("fx-grain");
    heroShade.after(vignette, leak, grain);
  }
  if (hero && M.fx.max && M.finePointer && M.rich) {
    // the buttons are left out on purpose: they must never move under the pointer
    const textLayers = $$(":scope > :not(.hero-actions)", heroInner).map((n) => [n, -12]);
    const layers = [[heroMedia, -8], [mist, -14], [() => particlesCanvas, -22], ...textLayers];
    let running = false;
    const tick = () => {
      hp.x = M.lerp(hp.x, hp.tx, 0.08);
      hp.y = M.lerp(hp.y, hp.ty, 0.08);
      hp.speed *= 0.92;
      layers.forEach(([n, f]) => {
        const node = typeof n === "function" ? n() : n;
        if (node) node.style.translate = `${(hp.x * f).toFixed(2)}px ${(hp.y * f).toFixed(2)}px`;
      });
      running = Math.abs(hp.x - hp.tx) + Math.abs(hp.y - hp.ty) > 0.001 || hp.speed > 0.01;
      return running && heroActive();
    };
    hero.addEventListener("pointermove", () => { if (!running) { running = true; M.add(tick); } }, { passive: true });
    hero.addEventListener("pointerleave", () => { if (!running) { running = true; M.add(tick); } });
  }
  // scroll depth for the new layers
  if (hero && M.fx.max) {
    M.onScroll(({ y }) => {
      if (y > innerHeight * 1.2) return;
      if (mist) mist.style.transform = `translate3d(0, ${(y * 0.12).toFixed(1)}px, 0)`;
      if (particlesCanvas) particlesCanvas.style.transform = `translate3d(0, ${(y * 0.22).toFixed(1)}px, 0)`;
    });
  }

  /* ---------- WebGL hero: video as a texture, soft ripple, pointer glow, edge colour fringe ---------- */
  register("webgl", () => {
    if (!hero) return null;
    const canvas = el("canvas", "hero-gl");
    canvas.setAttribute("aria-hidden", "true");
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power", preserveDrawingBuffer: false });
    if (!gl) return null; // fallback: plain video/poster
    // a software renderer (no GPU) can't keep up: keep the plain video instead
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    if (/swiftshader|llvmpipe|software|basic render/i.test(renderer) && !locked) { track("fx_auto", { off: "webgl", reason: "software renderer" }); M.fx.disable("webgl"); return null; }
    const VS = "attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
    const FS = `precision mediump float;
uniform sampler2D t;uniform vec2 res;uniform vec2 tres;uniform vec2 mouse;uniform float time;uniform float ca;uniform float glow;varying vec2 v;
vec2 cover(vec2 uv){float ra=res.x/res.y,rt=tres.x/tres.y;vec2 s=ra>rt?vec2(1.,rt/ra):vec2(ra/rt,1.);return (uv-.5)*s+.5;}
void main(){
  vec2 uv=v+vec2(sin(v.y*11.+time*.55),cos(v.x*9.+time*.45))*.0015;
  vec2 d=uv-.5;float edge=dot(d,d)*4.;vec2 off=d*ca*edge*.014;vec2 c=cover(uv);
  vec3 col=vec3(texture2D(t,c+off).r,texture2D(t,c).g,texture2D(t,c-off).b);
  float asp=res.x/res.y;float m=1.-smoothstep(0.,.5,distance(vec2(v.x*asp,v.y),vec2(mouse.x*asp,mouse.y)));
  col+=vec3(.92,.91,.86)*m*m*.10*glow;
  gl_FragColor=vec4(col,1.);
}`;
    const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : null; };
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(prog, n);
    const u = { res: U("res"), tres: U("tres"), mouse: U("mouse"), time: U("time"), ca: U("ca"), glow: U("glow") };
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]].forEach(([k, val]) => gl.texParameteri(gl.TEXTURE_2D, k, val));
    heroMedia.append(canvas);

    const video = $("#hero-video"), poster = $("#hero-poster");
    let quality = 1, w = 0, h = 0, ok = true, stopped = false, mouse = [0.5, 0.5], glow = 0, ca = 0, shown = false;
    const size = () => {
      const r = hero.getBoundingClientRect(), k = DPR() * quality;
      w = Math.max(1, Math.round(r.width * k)); h = Math.max(1, Math.round(r.height * k));
      canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h);
    };
    size();
    const offResize = M.on("resize", size);
    const offFps = M.on("fps", (f) => { if (f < 50 && quality > 0.6) { quality -= 0.2; size(); } });
    const source = () => (video && hero.classList.contains("video-on") && video.readyState >= 2 ? video : poster && poster.complete && poster.naturalWidth ? poster : null);
    // upload the texture only when there is a new picture (new video frame, or the source changed)
    let lastSrc = null, fresh = true;
    if (video && video.requestVideoFrameCallback) {
      const onFrame = () => { fresh = true; if (!stopped) video.requestVideoFrameCallback(onFrame); };
      video.requestVideoFrameCallback(onFrame);
    }
    const t0 = performance.now();
    let running = false;
    const frame = (t) => {
      if (stopped) return false;
      if (!heroActive()) { running = false; return false; }
      const src = source();
      if (src) {
        const isVideo = src === video;
        if (src !== lastSrc || fresh || (isVideo && !video.requestVideoFrameCallback)) {
          try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src); }
          catch (err) { ok = false; }
          lastSrc = src; fresh = false;
        }
        if (!ok) { stop(); return false; }
        const tw = src.videoWidth || src.naturalWidth || 16, th = src.videoHeight || src.naturalHeight || 9;
        mouse[0] = M.lerp(mouse[0], hp.inside ? (hp.x + 1) / 2 : 0.5, 0.08);
        mouse[1] = M.lerp(mouse[1], hp.inside ? 1 - (hp.y + 1) / 2 : 0.5, 0.08);
        glow = M.lerp(glow, hp.inside ? 1 : 0, 0.06);
        ca = M.lerp(ca, hp.speed, 0.15);
        gl.uniform2f(u.res, w, h); gl.uniform2f(u.tres, tw, th); gl.uniform2f(u.mouse, mouse[0], mouse[1]);
        gl.uniform1f(u.time, (t - t0) / 1000); gl.uniform1f(u.ca, ca); gl.uniform1f(u.glow, glow);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (!shown) { shown = true; canvas.classList.add("on"); }
      }
      return true;
    };
    const kick = () => { if (!running && !stopped && heroActive()) { running = true; M.add(frame); } };
    kick();
    const offVis = M.on("hero-visible", kick), offPage = M.on("visibility", kick);
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); stop(); });
    function stop() { stopped = true; offResize(); offFps(); offVis(); offPage(); canvas.remove(); }
    return stop;
  });

  /* ---------- Particles: dust / pollen / fireflies with depth (Canvas 2D) ---------- */
  register("particles", () => {
    if (!hero) return null;
    const canvas = layer("fx-particles", "canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    particlesCanvas = canvas;
    (mist || heroShade).after(canvas);
    // two pre-rendered sprites: far = small and sharp, near = big and soft
    const sprite = (r, blur) => {
      const c = document.createElement("canvas"); c.width = c.height = r * 2;
      const g = c.getContext("2d"), grad = g.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, "rgba(246,238,214,1)"); grad.addColorStop(blur, "rgba(246,238,214,.55)"); grad.addColorStop(1, "rgba(246,238,214,0)");
      g.fillStyle = grad; g.fillRect(0, 0, r * 2, r * 2); return c;
    };
    const sharp = sprite(8, 0.35), soft = sprite(32, 0.08);
    let w = 0, h = 0, k = 1, parts = [], target = 0, running = false, stopped = false;
    const make = () => ({ x: Math.random() * w, y: Math.random() * h, z: 0.15 + Math.random() * 0.85, s: Math.random() * 6.28, vx: 0, vy: 0 });
    // soft specks don't need full resolution: draw at half size, CSS scales the canvas up
    const size = () => {
      const r = hero.getBoundingClientRect(); k = DPR() * 0.5;
      w = Math.round(r.width * k); h = Math.round(r.height * k); canvas.width = w; canvas.height = h;
      target = Math.round(Math.min(120, Math.max(50, (r.width * r.height) / 16000)));
      while (parts.length < target) parts.push(make());
      parts.length = Math.min(parts.length, target);
    };
    size();
    const offResize = M.on("resize", size);
    const offFps = M.on("fps", (f) => { if (f < 50 && parts.length > 30) parts.length = Math.round(parts.length * 0.7); });
    let odd = false;
    const frame = () => {
      if (stopped) return false;
      if (!heroActive()) { running = false; return false; }
      odd = !odd;
      if (odd) return true; // 30fps is plenty for slow drifting specks
      ctx.clearRect(0, 0, w, h);
      const mx = hp.px * k, my = (hp.py - M.scroll.y) * k;
      for (const p of parts) {
        p.s += 0.02;
        p.vx += Math.sin(p.s) * 0.004 * p.z; p.vy -= 0.006 * p.z;
        if (hp.inside) { const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy, R = 140 * k; if (d2 < R * R) { const f = (1 - Math.sqrt(d2) / R) * 0.35; p.vx += (dx / R) * f; p.vy += (dy / R) * f; } }
        p.vx *= 0.96; p.vy *= 0.96; p.x += p.vx; p.y += p.vy;
        if (p.y < -40) { p.y = h + 20; p.x = Math.random() * w; }
        if (p.x < -40) p.x = w + 20; else if (p.x > w + 40) p.x = -20;
        const near = p.z > 0.7, img = near ? soft : sharp;
        const size2 = (near ? 10 + p.z * 22 : 2 + p.z * 6) * k;
        ctx.globalAlpha = near ? 0.10 + (1 - p.z) * 0.2 : 0.25 + p.z * 0.45;
        ctx.drawImage(img, p.x - size2 / 2, p.y - size2 / 2, size2, size2);
      }
      ctx.globalAlpha = 1;
      return true;
    };
    const kick = () => { if (!running && !stopped && heroActive()) { running = true; M.add(frame); } };
    kick();
    const offVis = M.on("hero-visible", kick), offPage = M.on("visibility", kick);
    return () => { stopped = true; offResize(); offFps(); offVis(); offPage(); canvas.remove(); particlesCanvas = null; };
  });

  /* ---------- Scroll velocity sampled per frame (decays to 0 when scrolling stops) ---------- */
  const vel = { v: 0, y: window.scrollY, t: performance.now(), stamp: 0 };
  function sampleVel(stamp) {
    if (stamp && stamp === vel.stamp) return vel.v;
    vel.stamp = stamp;
    const now = performance.now(), y = window.scrollY;
    vel.v = M.lerp(vel.v, (y - vel.y) / Math.max(1, now - vel.t), 0.25);
    vel.y = y; vel.t = now;
    return vel.v;
  }

  /* ---------- Cinematic scroll ---------- */
  if (M.fx.max) onData(() => {
    // headings rise letter by letter; section numbers 01, 02… flip in next to the eyebrow
    $$("h2[data-reveal='mask']").forEach((h) => { if (!$(".wi", h)) M.splitWords(h); splitChars(h); });
    $$("main > section .section-head .eyebrow, #free-sample .eyebrow").filter((e) => !e.closest("[hidden]")).forEach((e, i) => {
      const n = el("span", "sec-num", String(i + 1).padStart(2, "0"));
      n.setAttribute("aria-hidden", "true");
      e.prepend(n);
    });
    // process: step titles get word masks
    $$(".story-steps .step h3").forEach((h) => M.splitWords(h));

    // giant words line after the collection rows
    const mega = el("div", "mega");
    mega.setAttribute("aria-hidden", "true");
    const track = el("div", "mega-track");
    for (let k = 0; k < 4; k++) track.append(el("span", null, "4K · Photoreal · Unreal Engine 5 ·"));
    mega.append(track);
    ($("#rows") || $("main")).after(mega);
    let half = 0, x = 0, dir = -1, megaOn = false, running = false;
    const measure = () => { half = track.scrollWidth / 2; };
    measure();
    M.on("resize", measure);
    const tick = (t) => {
      if (!megaOn) { running = false; return false; }
      const v = Math.abs(sampleVel(t));
      x += dir * (0.4 + Math.min(v, 6) * 2.2);
      if (x <= -half) x += half; else if (x > 0) x -= half;
      track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
      return true;
    };
    M.on("scroll", (st) => { if (st.dy) dir = st.dy > 0 ? -1 : 1; });
    new IntersectionObserver(([e]) => { megaOn = e.isIntersecting && !document.hidden; if (megaOn && !running) { running = true; M.add(tick); } }).observe(mega);

    // section tones: cross-fade full-page colour layers as sections come into view
    const TONES = ["#070a08", "#07090d", "#0b0907", "#06100f"];
    const SECTION_TONE = { rows: 0, recent: 0, "use-cases": 1, collection: 0, proof: 1, "free-sample": 2, process: 3, faq: 1, about: 2, contact: 2 };
    const tones = el("div", "tones");
    tones.setAttribute("aria-hidden", "true");
    const layers = TONES.map((c, k) => { const t = el("span"); t.style.background = c; if (k === 0) t.classList.add("on"); tones.append(t); return t; });
    document.body.prepend(tones);
    const toneIO = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const k = SECTION_TONE[e.target.id] ?? 0;
      layers.forEach((t, j) => t.classList.toggle("on", j === k));
    }), { rootMargin: "-45% 0px -50% 0px" });
    $$("main > section[id]").forEach((sec) => toneIO.observe(sec));
  });

  /* ---------- Speed skew: rows, grid and the story frame lean with scroll velocity (max 3°) ---------- */
  register("distort", () => {
    let targets = [], skew = 0, running = false, stopped = false;
    const collect = () => { targets = $$(".row-track, #grid, .story-frame"); };
    onData(collect);
    const tick = (t) => {
      if (stopped) return false;
      const v = sampleVel(t);
      skew = M.lerp(skew, M.clamp(v * 1.2, -3, 3), 0.15);
      if (Math.abs(skew) < 0.01 && Math.abs(v) < 0.005) { skew = 0; targets.forEach((n) => (n.style.transform = "")); running = false; return false; }
      targets.forEach((n) => (n.style.transform = `skewY(${skew.toFixed(3)}deg)`));
      return true;
    };
    const off = M.on("scroll", () => { if (!running && !stopped) { if (!targets.length) collect(); running = true; M.add(tick); } });
    return () => { stopped = true; off(); targets.forEach((t) => (t.style.transform = "")); };
  });

  /* ---------- Hover ripple on card images (SVG displacement, settles in 400ms) ---------- */
  register("distort", () => {
    if (!M.finePointer) return null;
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "fx-svg"); svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = '<filter id="fx-ripple" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.010 0.026" numOctaves="1" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>';
    document.body.append(svg);
    const disp = svg.querySelector("feDisplacementMap"), turb = svg.querySelector("feTurbulence");
    let target = null, start = 0, running = false;
    const DUR = M.ms("--dur-slow") || 400;
    const tick = (t) => {
      if (!target) { running = false; return false; }
      const p = M.clamp((t - start) / DUR);
      const e = 1 - Math.pow(1 - p, 3);
      disp.setAttribute("scale", (26 * (1 - e)).toFixed(2));
      turb.setAttribute("baseFrequency", `${(0.010 + 0.006 * e).toFixed(4)} ${(0.026 - 0.01 * e).toFixed(4)}`);
      if (p >= 1) { target.style.filter = ""; target = null; running = false; return false; }
      return true;
    };
    const onEnter = (e) => {
      if (e.pointerType !== "mouse") return;
      const card = e.target.closest && e.target.closest(".card");
      if (!card || (e.relatedTarget && card.contains(e.relatedTarget))) return;
      const img = $(".card-thumb", card);
      if (!img) return;
      if (target && target !== img) target.style.filter = "";
      target = img; img.style.filter = "url(#fx-ripple)"; start = performance.now();
      if (!running) { running = true; M.add(tick); }
    };
    document.addEventListener("pointerover", onEnter, { passive: true });
    return () => { document.removeEventListener("pointerover", onEnter); if (target) target.style.filter = ""; target = null; svg.remove(); };
  });

  /* ---------- Magnetic buttons: visual copy follows the pointer, hit area stays put ---------- */
  register("magnetic", () => {
    const SEL = ".btn-accent, .hero-actions .btn-outline, .fav-btn";
    const states = new Map();
    let running = false;
    const prepare = (btn) => {
      if (btn.classList.contains("mag")) return btn._mag;
      const face = el("span", "mag-face");
      face.setAttribute("aria-hidden", "true");
      // label roll: the text slides up and a copy slides in on hover
      const text = btn.textContent.trim();
      if (btn.classList.contains("fav-btn")) face.textContent = text;
      else { const roll = el("span", "roll"); roll.append(el("span", null, text), el("span", null, text)); face.append(roll); }
      btn.classList.add("mag");
      btn.append(face);
      btn._mag = { btn, face, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, pressed: false };
      return btn._mag;
    };
    const tick = () => {
      let moving = false;
      states.forEach((m) => {
        const sx = { x: m.x, v: m.vx }, sy = { x: m.y, v: m.vy };
        const a = M.spring(sx, m.tx, 0.16, 0.72), b = M.spring(sy, m.ty, 0.16, 0.72);
        m.x = sx.x; m.vx = sx.v; m.y = sy.x; m.vy = sy.v;
        m.face.style.translate = `${m.x.toFixed(2)}px ${m.y.toFixed(2)}px`;
        if (a || b) moving = true; else if (!m.tx && !m.ty) states.delete(m.btn);
      });
      running = moving || states.size > 0 && [...states.values()].some((m) => m.tx || m.ty);
      return running;
    };
    const kick = () => { if (!running) { running = true; M.add(tick); } };
    const onMove = (e) => {
      if (e.pointerType !== "mouse") return;
      const btn = e.target.closest && e.target.closest(SEL);
      states.forEach((m) => { if (m.btn !== btn) { m.tx = 0; m.ty = 0; } });
      if (btn && !(btn.id === "m-fav")) {
        const m = prepare(btn);
        if (!m.pressed) {
          const r = btn.getBoundingClientRect();
          m.tx = M.clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1) * 10;
          m.ty = M.clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1) * 8;
        }
        states.set(btn, m);
      }
      kick();
    };
    const onDown = (e) => { const btn = e.target.closest && e.target.closest(".mag"); if (btn && btn._mag) btn._mag.pressed = true; };
    const onUp = () => states.forEach((m) => { m.pressed = false; });
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerdown", onDown); document.removeEventListener("pointerup", onUp);
      $$(".mag").forEach((b) => { b.classList.remove("mag"); b._mag && b._mag.face.remove(); b._mag = null; });
    };
  });

  /* ---------- Context cursor: Play/View on cards, Drag on rows, Buy on buy buttons, grows on links ---------- */
  register("cursor", () => {
    const c = el("div", "fx-cursor");
    c.setAttribute("aria-hidden", "true");
    const label = el("span");
    c.append(label);
    document.body.append(c);
    const pos = { x: M.pointer.x, y: M.pointer.y };
    let running = false, mode = "";
    const tick = () => {
      pos.x = M.lerp(pos.x, M.pointer.x, 0.18); pos.y = M.lerp(pos.y, M.pointer.y, 0.18);
      c.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
      running = Math.abs(pos.x - M.pointer.x) + Math.abs(pos.y - M.pointer.y) > 0.3;
      return running;
    };
    const setMode = (m, text = "") => {
      if (m === mode && label.textContent === text) return;
      mode = m; label.textContent = text;
      c.classList.toggle("label", m === "label"); c.classList.toggle("grow", m === "grow");
    };
    const onOver = (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const t = e.target;
      const card = t.closest && t.closest(".card-hit");
      if (card) setMode("label", card.closest(".card").classList.contains("playing") ? "View" : "Play");
      else if (t.closest && t.closest(".btn-accent")) setMode("label", "Buy");
      else if (t.closest && t.closest("a, button, summary, input, [role='button']")) setMode("grow");
      else if (t.closest && t.closest(".row-track")) setMode("label", "Drag");
      else setMode("");
      c.classList.add("on");
    };
    const onMove = () => { if (!running) { running = true; M.add(tick); } };
    const onLeave = (e) => { if (!e.relatedTarget) c.classList.remove("on"); };
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave, { passive: true });
    return () => { document.removeEventListener("pointerover", onOver); document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerout", onLeave); c.remove(); };
  });

  /* ---------- Rows: drag with the mouse, with momentum and a soft elastic edge ---------- */
  if (M.fx.max && M.finePointer) {
    let drag = null;
    document.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      const track = e.target.closest && e.target.closest(".row-track");
      if (!track || e.target.closest(".btn, .fav-btn, a")) return;
      drag = { track, x0: e.clientX, s0: track.scrollLeft, last: e.clientX, t: performance.now(), v: 0, moved: false, pull: 0 };
    });
    window.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x0;
      if (!drag.moved && Math.abs(dx) < 6) return;
      if (!drag.moved) { drag.moved = true; drag.track.classList.add("dragging"); }
      const max = drag.track.scrollWidth - drag.track.clientWidth;
      const want = drag.s0 - dx;
      drag.track.scrollLeft = M.clamp(want, 0, max);
      // past the ends the row stretches a little (35% resistance)
      drag.pull = want < 0 ? -want * 0.35 : want > max ? -(want - max) * 0.35 : 0;
      drag.track.style.translate = drag.pull ? `${M.clamp(drag.pull, -60, 60).toFixed(1)}px 0` : "";
      const now = performance.now();
      drag.v = M.lerp(drag.v, (e.clientX - drag.last) / Math.max(1, now - drag.t), 0.4);
      drag.last = e.clientX; drag.t = now;
    }, { passive: true });
    window.addEventListener("pointerup", () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (!d.moved) return;
      // swallow the click that ends a drag
      const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      d.track.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(() => d.track.removeEventListener("click", stop, { capture: true }), 50);
      let v = -d.v * 16, pull = M.clamp(d.pull, -60, 60);
      M.add(() => {
        v *= 0.94;
        d.track.scrollLeft += v;
        pull = M.lerp(pull, 0, 0.18);
        d.track.style.translate = Math.abs(pull) > 0.3 ? `${pull.toFixed(1)}px 0` : "";
        if (Math.abs(v) > 0.3 || Math.abs(pull) > 0.3) return true;
        d.track.classList.remove("dragging"); // scroll-snap takes over again
        return false;
      });
    });
  }

  /* ---------- Modal: lens opening without View Transitions, light sweep on clip change ---------- */
  if (M.fx.max) {
    const media = $(".modal-media");
    const circleAt = (rect) => {
      const m = media.getBoundingClientRect();
      if (!rect) return { x: m.width / 2, y: m.height / 2 };
      return { x: rect.left + rect.width / 2 - m.left, y: rect.top + rect.height / 2 - m.top };
    };
    M.on("modal-open", ({ from }) => {
      if (!media || !media.animate) return;
      const c = circleAt(from);
      media.animate([{ clipPath: `circle(0px at ${c.x}px ${c.y}px)` }, { clipPath: `circle(150% at ${c.x}px ${c.y}px)` }], { duration: M.ms("--dur-slow"), easing: M.easing("--ease-out") });
    });
    M.on("modal-close", ({ to }) => {
      if (!media || !media.animate) return;
      const c = circleAt(to);
      media.animate([{ clipPath: `circle(150% at ${c.x}px ${c.y}px)` }, { clipPath: `circle(0px at ${c.x}px ${c.y}px)` }], { duration: M.ms("--dur-med") * 0.75, easing: M.easing("--ease-in"), fill: "forwards" })
        .finished.then((a) => a.cancel(), () => {});
    });
    M.on("modal-step", ({ dir }) => {
      if (!media || !media.animate) return;
      const sweep = el("span", "fx-sweep");
      media.append(sweep);
      sweep.animate([{ transform: `translateX(${dir > 0 ? -100 : 100}%)` }, { transform: `translateX(${dir > 0 ? 100 : -100}%)` }], { duration: Math.min(400, M.ms("--dur-slow")), easing: M.easing("--ease-in-out") })
        .finished.then(() => sweep.remove(), () => sweep.remove());
    });
  }

  /* ---------- Micro details ---------- */
  if (M.fx.max) onData(() => {
    // scramble small labels once when they come into view (≤ 450ms, never repeats)
    const GLYPHS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
    const scramble = (node) => {
      const texts = [];
      const walk = (n) => n.childNodes.forEach((c) => { if (c.nodeType === 3 && c.textContent.trim()) texts.push(c); else if (c.nodeType === 1 && !c.classList.contains("sec-num")) walk(c); });
      walk(node);
      if (!texts.length) return;
      const orig = texts.map((t) => t.textContent);
      const w = node.getBoundingClientRect().width;
      node.style.width = `${w}px`; // lock the width so neighbours never move
      const start = performance.now(), DUR = 450;
      M.add((t) => {
        const p = M.clamp((t - start) / DUR);
        texts.forEach((tn, k) => {
          const o = orig[k], keep = Math.floor(o.length * p);
          tn.textContent = o.slice(0, keep) + o.slice(keep).replace(/[A-Za-z0-9]/g, () => GLYPHS[(Math.random() * GLYPHS.length) | 0]);
        });
        if (p < 1) return true;
        texts.forEach((tn, k) => (tn.textContent = orig[k]));
        node.style.width = "";
        return false;
      });
    };
    const scrIO = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      scrIO.unobserve(e.target);
      scramble(e.target);
    }), { rootMargin: "0px 0px -10% 0px" });
    $$("main .eyebrow, .card-badge").forEach((n) => scrIO.observe(n));

    // counters: only real numbers from the data (clip counts), eased up once when visible
    const cntIO = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      cntIO.unobserve(e.target);
      const node = e.target, m = node.textContent.match(/^(\d+)(.*)$/);
      if (!m) return;
      const end = +m[1], rest = m[2], start = performance.now(), DUR = M.ms("--dur-reveal") || 700;
      let last = node.textContent;
      M.add((t) => {
        if (node.textContent !== last) return false; // content changed meanwhile (filters): stop
        const p = M.clamp((t - start) / DUR), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
        node.textContent = last = `${v}${rest}`;
        return p < 1;
      });
    }));
    $$(".row-count, .stats dd").forEach((n) => cntIO.observe(n));

    // fireflies in two quiet sections (≤ 8 each)
    ["use-cases", "free-sample"].forEach((id) => {
      const sec = document.getElementById(id);
      if (!sec || sec.hidden) return;
      const box = el("div", "fireflies");
      box.setAttribute("aria-hidden", "true");
      for (let k = 0; k < 7; k++) {
        const f = el("i");
        f.style.left = `${8 + k * 13}%`; f.style.top = `${20 + ((k * 37) % 60)}%`;
        f.style.setProperty("--d", `${14 + (k % 4) * 3}s`); f.style.setProperty("--dl", `${-k * 2}s`);
        f.style.setProperty("--fx", `${(k % 2 ? 1 : -1) * (30 + k * 6)}px`); f.style.setProperty("--fy", `${-(40 + k * 8)}px`);
        box.append(f);
      }
      sec.style.position = "relative";
      sec.prepend(box);
    });

    // giant brand above the footer: masked letters, leans a little with the pointer
    const footer = $(".footer");
    if (footer) {
      const brand = el("div", "mega-brand");
      brand.setAttribute("aria-hidden", "true");
      const line = el("span");
      const name = (window.App && window.App.isReal(window.App.site.brandName) && window.App.site.brandName) || "Wild Frames";
      const h = el("p");
      h.setAttribute("data-reveal", "mask");
      h.textContent = name;
      line.append(h);
      brand.append(line);
      footer.before(brand);
      M.splitWords(h);
      splitChars(h);
      h.removeAttribute("aria-label");
      M.reveal(brand);
      if (M.rich) {
        let bx = 0, tx = 0, running = false;
        const tick = () => { bx = M.lerp(bx, tx, 0.06); line.style.setProperty("--bx", `${bx.toFixed(1)}px`); running = Math.abs(bx - tx) > 0.2; return running; };
        M.on("pointer", (pt) => { tx = (pt.x / innerWidth - 0.5) * -40; if (!running) { running = true; M.add(tick); } });
      }
    }
  });

  /* ---------- Pause everything when the tab is hidden ---------- */
  document.addEventListener("visibilitychange", () => M.emit("visibility", !document.hidden));

  window.FX = { register, stepDown, toStandard, onData, $, $$, el };
})();
