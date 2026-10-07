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
  if (M.fx.max) M.on("lowfps", (fps) => stepDown(`fps ${Math.round(fps)}`));

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
  sw.append(menu, toggle);
  document.body.append(sw);

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

  /* ---------- Pause everything when the tab is hidden ---------- */
  document.addEventListener("visibilitychange", () => M.emit("visibility", !document.hidden));

  window.FX = { register, stepDown, toStandard, onData, $, $$, el };
})();
