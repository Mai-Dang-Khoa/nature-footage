/* ==========================================================================
   Wild Frames — all content in one place. Edit this file, nothing else needed.
   A value that is empty or still contains "[YOUR_" counts as missing:
   - no stockUrl  → the button shows "Listing soon" and is disabled (never a "#" link)
   - no email     → the Email link is hidden
   - no audio     → the sound button is hidden
   ========================================================================== */
window.WF = {
  site: {
    brandName: "Wild Frames",
    email: "[YOUR_EMAIL]",
    adobeStockProfileUrl: "https://stock.adobe.com/contributor/[YOUR_ID]",
    analytics: { provider: "", id: "" },   // "plausible" or "goatcounter" + site id
    // Ambient sound (optional, no music): rain on leaves near the ground, wind up high. Empty = no sound button.
    audio: { ground: "", high: "" },
    // One continuous camera path, same lens, same direction. PLACEHOLDER frames: see README.
    flight: {
      desktop: { path: "assets/flight/desktop/f_{n}.webp", frames: 72, width: 1280, height: 720 },
      mobile: { path: "assets/flight/mobile/f_{n}.webp", frames: 48, width: 720, height: 1080 },
      pad: 4,
      label: "Placeholder frames: one camera move from the forest floor, along a trail, over the canopy and a river, past the mountains and above the clouds.",
    },
    // Same camera angle in four weathers. Shown instead of the flight when "reduce motion" is on.
    stills: [
      { weather: "rain", src: "assets/flight/weather/rain.webp", alt: "Placeholder: the valley at night in heavy rain" },
      { weather: "after", src: "assets/flight/weather/after.webp", alt: "Placeholder: the same valley after the rain, with mist" },
      { weather: "golden", src: "assets/flight/weather/golden.webp", alt: "Placeholder: the same valley at golden hour" },
      { weather: "stars", src: "assets/flight/weather/stars.webp", alt: "Placeholder: the same valley under the stars" },
    ],
    freeFile: "assets/free/free-sample-720p.mp4",
  },

  /* Clips for sale. weatherAt (0–1) = where in the flight the clip steps out of the scene.
     use = what an editor would use it for. preview: 5–8 s, muted H.264, 16:9, ≤ 2 MB.
     placeholder: true = sample file, remove when the real clip is in. */
  clips: [
    { id: "rain-on-leaves", title: "Rain on forest leaves", use: "sleep loop", weatherAt: 0.15, weather: "rain",
      resolution: "4K", loop: true, people: false, free: false, placeholder: true,
      preview: "assets/previews/rain-on-leaves.mp4", previewWebm: "assets/previews/rain-on-leaves.webm", poster: "assets/posters/rain-on-leaves.webp",
      stockUrl: "https://stock.adobe.com/[YOUR_CLIP_URL]" },
    { id: "storm-over-canopy", title: "Storm over the canopy", use: "trailer background", weatherAt: 0.34, weather: "rain",
      resolution: "4K", loop: true, people: false, free: false, placeholder: true,
      preview: "assets/previews/storm-over-canopy.mp4", previewWebm: "assets/previews/storm-over-canopy.webm", poster: "assets/posters/storm-over-canopy.webp",
      stockUrl: "https://stock.adobe.com/[YOUR_CLIP_URL]" },
    { id: "river-mist", title: "River mist after rain", use: "meditation app", weatherAt: 0.56, weather: "after",
      resolution: "4K", loop: true, people: false, free: true, placeholder: true,
      preview: "assets/previews/river-mist.mp4", previewWebm: "assets/previews/river-mist.webm", poster: "assets/posters/river-mist.webp",
      stockUrl: "https://stock.adobe.com/[YOUR_CLIP_URL]" },
    { id: "ridge-golden-hour", title: "Ridge at golden hour", use: "ad background", weatherAt: 0.76, weather: "golden",
      resolution: "4K", loop: true, people: false, free: false, placeholder: true,
      preview: "assets/previews/ridge-golden-hour.mp4", previewWebm: "assets/previews/ridge-golden-hour.webm", poster: "assets/posters/ridge-golden-hour.webp",
      stockUrl: "https://stock.adobe.com/[YOUR_CLIP_URL]" },
    { id: "above-the-clouds", title: "Above the clouds at dusk", use: "title sequence", weatherAt: 0.84, weather: "golden",
      resolution: "4K", loop: true, people: false, free: false, placeholder: true,
      preview: "assets/previews/above-the-clouds.mp4", previewWebm: "assets/previews/above-the-clouds.webm", poster: "assets/posters/above-the-clouds.webp",
      stockUrl: "https://stock.adobe.com/[YOUR_CLIP_URL]" },
    // final: true = the clip held at the end of the page (p > 0.9), with the biggest button
    { id: "stars-over-peaks", title: "Stars over the peaks", use: "sleep loop", weatherAt: 0.93, weather: "stars", final: true,
      resolution: "4K", loop: true, people: false, free: false, placeholder: true,
      preview: "assets/previews/stars-over-peaks.mp4", previewWebm: "assets/previews/stars-over-peaks.webm", poster: "assets/posters/stars-over-peaks.webp",
      stockUrl: "https://stock.adobe.com/[YOUR_CLIP_URL]" },
  ],
};
