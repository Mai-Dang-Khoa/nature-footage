/* ==========================================================================
   Polish layer helpers (tiny):
   - lazy images still loading get .soft-img, then .loaded (blur clears)
   - ambient layers ([data-ambient]) only animate while on screen
   ========================================================================== */
(() => {
  "use strict";
  const root = document.documentElement;
  if (root.getAttribute("data-fx") === "off") return;

  document.querySelectorAll("img[loading='lazy']:not(.card-thumb):not(.story-img):not(.film-still)").forEach((img) => {
    if (img.complete && img.naturalWidth) return; // already here: nothing to settle
    img.classList.add("soft-img");
    const done = () => img.classList.add("loaded");
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });
})();
