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
  function register(group, start) {
    const m = { group, start, stop: null, running: false };
    modules.push(m);
    if (M.fx.max && M.fx.enabled(group)) run(m);
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
  function splitHeroChars() {
    const h1 = $(".hero-title");
    if (!h1 || h1.dataset.chars) return;
    h1.dataset.chars = "1";
    h1.setAttribute("aria-label", h1.textContent.replace(/\s+/g, " ").trim());
    let i = 0;
    $$(".wi", h1).forEach((wi) => {
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
    if (i > 1) h1.style.setProperty("--char-step", `${Math.min(18, 700 / (i - 1)).toFixed(2)}ms`);
  }
  if (M.fx.max) splitHeroChars();
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
    const layers = [[heroMedia, -8], [mist, -14], [() => particlesCanvas, -22], [heroInner, -12]];
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
    const t0 = performance.now();
    let running = false;
    const frame = (t) => {
      if (stopped) return false;
      if (!heroActive()) { running = false; return false; }
      const src = source();
      if (src) {
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src); }
        catch (err) { ok = false; }
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

  /* ---------- Pause everything when the tab is hidden ---------- */
  document.addEventListener("visibilitychange", () => M.emit("visibility", !document.hidden));

  window.FX = { register, stepDown, toStandard, onData, $, $$, el };
})();
