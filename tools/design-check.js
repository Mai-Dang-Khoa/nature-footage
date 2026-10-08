#!/usr/bin/env node
/* Design check: measures the live page against docs/design/DESIGN.md at 1440 and 390 px.
   For developers only (needs Node + Playwright):
     python3 -m http.server 8123   (in the repo root, in another terminal)
     node tools/design-check.js [http://localhost:8123/]
   Prints every failed rule and exits with code 1 if anything fails. */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

const URL_ = process.argv[2] || "http://localhost:8123/";
const SIZES = [[1440, 900], [390, 844]];

function audit(mobile) {
  const fails = [];
  const fail = (rule, where, got) => fails.push({ rule, where, got: String(got) });
  const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; })
    .reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  const name = (n) => n.tagName.toLowerCase() + (n.id ? `#${n.id}` : "") + (n.className && typeof n.className === "string" ? "." + n.className.trim().split(/\s+/).join(".") : "");
  const visible = (n) => { const r = n.getBoundingClientRect(); const cs = getComputedStyle(n); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
  const bgOf = (n) => { for (let x = n; x; x = x.parentElement) { const c = rgb(getComputedStyle(x).backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] > .9)) return c.slice(0, 3); } return [0, 0, 0]; };
  const words = (t) => t.trim().split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
  const all = [...document.querySelectorAll("body *")].filter((n) => !n.closest("dialog:not([open])") && !n.closest("script, style, [hidden]") && visible(n));

  // 1. Surfaces: section backgrounds, no shadows, no grey hairlines, no gradients
  const SURF = ["0,0,0", "245,245,247", "255,255,255"];
  document.querySelectorAll("main > section:not([hidden]), footer").forEach((s) => {
    const c = rgb(getComputedStyle(s).backgroundColor).slice(0, 3).join(",");
    if (!SURF.includes(c)) fail("surface: section background", name(s), c);
  });
  all.forEach((n) => {
    const cs = getComputedStyle(n);
    if (cs.boxShadow !== "none") fail("no drop shadow", name(n), cs.boxShadow);
    ["Top", "Right", "Bottom", "Left"].forEach((side) => { if (parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== "none") fail("no 1px rules", name(n), side); });
    if (/gradient/.test(cs.backgroundImage)) fail("no gradients", name(n), cs.backgroundImage.slice(0, 40));
  });

  // 2. Accent only on links and pills
  const ACC = ["0,113,227", "41,151,255"];
  all.forEach((n) => {
    const cs = getComputedStyle(n);
    const col = rgb(cs.color).slice(0, 3).join(","), bg = rgb(cs.backgroundColor).slice(0, 3).join(",");
    const ok = n.closest("a, .pill, .text-btn, .more");
    if ((ACC.includes(col) && n.childNodes.length && [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) || ACC.includes(bg)) {
      if (!ok) fail("accent only on links and pills", name(n), col);
    }
  });

  // 3. Type scale
  const px = (n, p) => parseFloat(getComputedStyle(n)[p]);
  document.querySelectorAll(".display").forEach((n) => {
    if (!visible(n)) return;
    const fs = px(n, "fontSize"), lh = px(n, "lineHeight") / fs, tr = px(n, "letterSpacing") / fs;
    if (mobile ? fs < 40 : (fs < 56 || fs > 80)) fail("display size", name(n), fs);
    if (lh < 1.05 || lh > 1.08) fail("display line-height", name(n), lh.toFixed(3));
    if (tr > -.0199 || tr < -.0301) fail("display tracking", name(n), tr.toFixed(3));
    if (getComputedStyle(n).fontWeight !== "600") fail("display weight", name(n), getComputedStyle(n).fontWeight);
  });
  document.querySelectorAll(".title").forEach((n) => {
    if (!visible(n)) return;
    const fs = px(n, "fontSize"), lh = px(n, "lineHeight") / fs;
    if (!mobile && (fs < 40 || fs > 48)) fail("section size", name(n), fs);
    if (lh < 1.08 || lh > 1.1001) fail("section line-height", name(n), lh.toFixed(3));
  });
  document.querySelectorAll(".body").forEach((n) => {
    if (!visible(n)) return;
    const fs = px(n, "fontSize"), lh = px(n, "lineHeight") / fs, mw = getComputedStyle(n).maxWidth;
    if (fs !== 17) fail("body 17px", name(n), fs);
    if (Math.abs(lh - 1.47) > .01) fail("body line-height 1.47", name(n), lh.toFixed(3));
    if (!(parseFloat(mw) >= 520 && parseFloat(mw) <= 640) && n.getBoundingClientRect().width > 640) fail("body measure 520–640", name(n), mw);
  });
  document.querySelectorAll(".nav-links a, .small, .label, .chip").forEach((n) => {
    if (!visible(n)) return;
    const fs = px(n, "fontSize");
    if (fs < 12 || fs > 14) fail("label 12–14px", name(n), fs);
  });

  // 4. Contrast (display type ≥ 3:1, everything else ≥ 4.5:1)
  all.forEach((n) => {
    const own = [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
    if (!own || n.closest(".card-media, .hero-media, .film-frame")) return;
    const cs = getComputedStyle(n);
    if (parseFloat(cs.opacity) < 1 || n.closest("[style*='opacity']")) return;
    const r = ratio(rgb(cs.color).slice(0, 3), bgOf(n)), big = parseFloat(cs.fontSize) >= 24;
    if (r < (big ? 3 : 4.5)) fail("contrast", name(n) + ` "${n.textContent.trim().slice(0, 24)}"`, r.toFixed(2));
  });

  // 5. Spacing on the 8px grid (padding, margins, gaps of layout boxes)
  all.forEach((n) => {
    if (n.closest(".nav-links, .specs, .footer-links") && n.matches("a, dt, dd")) return;
    const cs = getComputedStyle(n);
    const vals = ["paddingTop", "paddingBottom", "marginTop", "marginBottom", "rowGap", "columnGap"].map((p) => [p, parseFloat(cs[p])]).filter(([, v]) => v && isFinite(v));
    vals.forEach(([p, v]) => { if (Math.abs(v) % 8 !== 0) fail("8px grid", `${name(n)} ${p}`, v); });
  });

  // 6. Controls
  const nav = document.getElementById("nav").offsetHeight;
  if (nav < 44 || nav > 52) fail("nav 44–52px", "nav", nav);
  document.querySelectorAll(".pill, .chip").forEach((n) => {
    if (!visible(n)) return;
    const h = n.offsetHeight, cs = getComputedStyle(n), pad = parseFloat(cs.paddingLeft);
    if (h < 36 || h > 44) fail("pill height 36–44", name(n), h);
    if (pad < 16 || pad > 22) fail("pill padding 16–22", name(n), pad);
    if (parseFloat(cs.borderTopLeftRadius) < h / 2) fail("pill radius", name(n), cs.borderTopLeftRadius);
  });

  // 7. Copy limits
  document.querySelectorAll("main h1, main h2:not(.sr-only)").forEach((n) => { if (visible(n) && words(n.textContent) > 8) fail("headline ≤ 8 words", name(n), words(n.textContent)); });
  document.querySelectorAll(".head > p.body, .hero-head p, .finale p, .split-text p.body").forEach((n) => { if (visible(n) && words(n.textContent) > 18) fail("subline ≤ 18 words", name(n), words(n.textContent)); });
  document.querySelectorAll(".pill").forEach((n) => { if (visible(n) && words(n.textContent) > 2) fail("CTA 1–2 words", name(n), n.textContent.trim()); });
  document.querySelectorAll(".card-title, .film-line").forEach((n) => { if (words(n.textContent) > 6) fail("caption ≤ 6 words", name(n), n.textContent.trim()); });
  document.querySelectorAll("main section:not([hidden])").forEach((s) => {
    const pills = [...s.querySelectorAll(".pill")].filter(visible).length;
    if (pills > 1) fail("one action per screen", name(s), pills);
  });

  // 8. Hero: footage ≥ 60% of the first screen, no paragraph
  const m = document.querySelector(".hero-media").getBoundingClientRect();
  const share = (Math.min(m.bottom, innerHeight) - Math.max(m.top, 0)) / innerHeight;
  if (share < .6) fail("hero footage ≥ 60%", ".hero-media", share.toFixed(3));
  if (document.querySelectorAll(".hero p").length > 1) fail("no paragraph on the hero", ".hero", document.querySelectorAll(".hero p").length);

  // 9. Motion: nothing loops; hover never scales or moves
  document.getAnimations().forEach((a) => { if (a.effect && a.effect.getTiming().iterations === Infinity) fail("no looping animation", a.animationName || "anim", "infinite"); });
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list) => [...list].forEach((r) => {
      if (r.cssRules) walk(r.cssRules);
      if (r.selectorText && /:hover/.test(r.selectorText) && /(^|;)\s*(transform|scale|translate|rotate)\s*:/.test(r.style.cssText)) fail("hover only opacity/underline", r.selectorText, r.style.cssText);
    });
    walk(rules);
  }
  if (document.documentElement.scrollWidth > innerWidth) fail("no sideways scroll", "html", document.documentElement.scrollWidth);
  return fails;
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  let total = 0;
  for (const [w, h] of SIZES) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    // FAST=1: pretend to be a strong device so the sticky film runs instead of its still
    if (process.env.FAST) await page.addInitScript(() => { Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 }); Object.defineProperty(navigator, "deviceMemory", { get: () => 8 }); });
    await page.goto(URL_);
    await page.waitForTimeout(1500);
    // reveal everything (scroll through once), then back to the top
    await page.evaluate(async () => { document.documentElement.style.scrollBehavior = "auto"; for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } scrollTo(0, 0); });
    await page.waitForTimeout(1000);
    const fails = await page.evaluate(audit, w < 600);
    // the clip modal too
    await page.locator(".card-hit").first().click();
    await page.waitForTimeout(600);
    fails.push(...(await page.evaluate(audit, w < 600)).filter((f) => /modal|m-|specs|text-btn|dialog/.test(f.where)));
    const seen = new Set();
    const uniq = fails.filter((f) => { const k = f.rule + f.where; if (seen.has(k)) return false; seen.add(k); return true; });
    console.log(`\n${w}×${h}: ${uniq.length ? uniq.length + " failed" : "all rules pass"}`);
    uniq.forEach((f) => console.log(`  ✗ ${f.rule} — ${f.where}: ${f.got}`));
    total += uniq.length;
    await page.close();
  }
  await browser.close();
  process.exit(total ? 1 : 0);
})();
