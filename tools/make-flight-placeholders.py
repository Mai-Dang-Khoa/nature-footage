#!/usr/bin/env python3
"""PLACEHOLDER assets for the flight page. Replace them with real UE5 renders (see README).

Draws one simple camera path (ground → leaves → trail → canopy → river → mountains → clouds → sky)
and writes, every image labelled "PLACEHOLDER":
  assets/flight/desktop/f_0001.webp …   1280×720, the flight (neutral light; the page adds the weather)
  assets/flight/mobile/f_0001.webp …    720×1080, same path, portrait
  assets/flight/weather/{rain,after,golden,stars}.webp   one camera angle in 4 weathers (reduced motion)
  assets/previews/<id>.mp4               6 s muted H.264 loops, 640×360
  assets/posters/<id>.webp               first frame of each preview
  assets/free/free-sample-720p.mp4       1280×720 free sample
Needs Pillow and ffmpeg. Usage: python3 tools/make-flight-placeholders.py
"""
import math, pathlib, random, shutil, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets"
FONT = None
for f in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/dejavu/DejaVuSans.ttf"):
    if pathlib.Path(f).exists():
        FONT = f


def font(size):
    return ImageFont.truetype(FONT, size) if FONT else ImageFont.load_default()


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    return tuple(int(lerp(x, y, t)) for x, y in zip(c1, c2))


def band(a, lo, hi, soft=0.08):
    """1 inside [lo, hi], fading to 0 over `soft` on both sides."""
    if a < lo - soft or a > hi + soft:
        return 0.0
    if a < lo:
        return (a - (lo - soft)) / soft
    if a > hi:
        return 1 - (a - hi) / soft
    return 1.0


def ridge(rng, w, base, amp, n):
    pts = []
    for i in range(n + 1):
        x = w * i / n
        pts.append((x, base - amp * (0.5 + 0.5 * math.sin(i * 1.7 + rng.random() * 2)) * rng.uniform(0.6, 1.0)))
    return pts


def scene(a, w, h, shift=0.0):
    """Neutral-light frame of the flight at progress a (0 = ground, 1 = sky). shift = small sideways drift."""
    s = w / 1280
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    horizon = h * lerp(0.42, 0.78, a)                      # camera rises: horizon sinks
    for y in range(h):                                      # sky
        t = y / h
        d.line([(0, y), (w, y)], fill=mix((120, 134, 150), (196, 202, 206), min(1, t * 1.3)))
    rng = random.Random(7)
    # far mountains (always), nearer ridge from the river on
    for k, (col, amp, off) in enumerate([((112, 122, 132), 0.20, 0.0), ((86, 98, 104), 0.14, 0.03)]):
        r2 = random.Random(11 + k)
        pts = ridge(r2, w + 200 * s, horizon + h * off, h * amp * lerp(1.0, 0.55, a), 14)
        pts = [(x - 100 * s + shift * (k + 1) * 6 * s, y) for x, y in pts]
        d.polygon(pts + [(w + 200 * s, h), (-200 * s, h)], fill=col)
    # ground plane
    d.rectangle([0, horizon + h * 0.03, w, h], fill=(70, 86, 72))
    # canopy: rows of tree tops
    c = band(a, 0.30, 0.62)
    if c > 0:
        r3 = random.Random(3)
        for row in range(6):
            y0 = lerp(horizon + h * 0.05, h * 1.05, row / 5)
            size = lerp(14, 70, row / 5) * s * lerp(1.2, 0.6, a)
            x = -size
            while x < w + size:
                col = mix((70, 86, 72), (52, 74, 56) if row % 2 else (60, 82, 60), c)
                d.ellipse([x + shift * 4 * s, y0 - size * 0.6, x + size * 1.6 + shift * 4 * s, y0 + size * 0.6], fill=col)
                x += size * r3.uniform(1.0, 1.4)
    # trail: a pale path to the horizon
    t = band(a, 0.16, 0.40)
    if t > 0:
        cx = w * 0.5 + shift * 10 * s
        top = horizon + h * 0.05
        d.polygon([(cx - w * 0.22, h), (cx + w * 0.22, h), (cx + w * 0.02, top), (cx - w * 0.02, top)], fill=mix((70, 86, 72), (150, 140, 118), t))
    # river: a winding band that reflects the sky
    r = band(a, 0.46, 0.76)
    if r > 0:
        pts_l, pts_r = [], []
        for i in range(21):
            y = lerp(horizon + h * 0.04, h, i / 20)
            width = lerp(6, 160, i / 20) * s
            cx = w * 0.5 + math.sin(i * 0.5 + 1) * w * 0.12 * (i / 20) + shift * 6 * s
            pts_l.append((cx - width, y))
            pts_r.append((cx + width, y))
        d.polygon(pts_l + pts_r[::-1], fill=mix((70, 86, 72), (170, 182, 190), r))
    # clouds: sit above the horizon, then below the camera
    cl = band(a, 0.74, 1.0, 0.14)
    if cl > 0:
        layer = Image.new("L", (w, h), 0)
        ld = ImageDraw.Draw(layer)
        r4 = random.Random(5)
        base = lerp(horizon - h * 0.1, h * 0.55, cl)
        for _ in range(26):
            cx, cy = r4.uniform(-0.1, 1.1) * w + shift * 12 * s, base + r4.uniform(-0.05, 0.35) * h
            rx, ry = r4.uniform(120, 300) * s, r4.uniform(30, 70) * s
            ld.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=int(235 * cl))
        layer = layer.filter(ImageFilter.GaussianBlur(18 * s))
        img = Image.composite(Image.new("RGB", (w, h), (226, 228, 230)), img, layer)
        d = ImageDraw.Draw(img)
    # close leaves and grass at the very start (camera at ground level)
    lv = band(a, 0.0, 0.14, 0.1)
    if lv > 0:
        r5 = random.Random(9)
        for _ in range(26):
            x, y = r5.uniform(-0.1, 1.1) * w, h - r5.uniform(0, 0.42) * h * lv
            rx, ry = r5.uniform(60, 160) * s * lv, r5.uniform(20, 50) * s * lv
            ang = r5.uniform(-0.6, 0.6)
            poly = [(x + math.cos(ang + q / 12 * 2 * math.pi) * rx, y + math.sin(ang + q / 12 * 2 * math.pi) * ry) for q in range(12)]
            d.polygon(poly, fill=mix((70, 86, 72), (40, 64, 42) if r5.random() < .5 else (54, 80, 50), lv))
    return img.filter(ImageFilter.GaussianBlur(0.6 * s))


def grade(img, weather, seed=1):
    """Bake one weather into a frame (used for the stills and the previews)."""
    w, h = img.size
    if weather == "rain":
        out = ImageChops.multiply(img, Image.new("RGB", (w, h), (52, 66, 96)))
        d = ImageDraw.Draw(out)
        rng = random.Random(seed)
        for _ in range(int(w * h / 2600)):
            x, y = rng.uniform(0, w), rng.uniform(0, h)
            d.line([(x, y), (x - 4, y + 22 * w / 1280)], fill=(120, 136, 160), width=1)
    elif weather == "after":
        out = ImageChops.multiply(img, Image.new("RGB", (w, h), (150, 164, 170)))
        mist = Image.linear_gradient("L").resize((w, h)).point(lambda v: int(v * 0.55))
        out = Image.composite(Image.new("RGB", (w, h), (200, 208, 212)), out, mist)
    elif weather == "golden":
        warm = ImageChops.multiply(img, Image.new("RGB", (w, h), (255, 196, 140)))
        glow = Image.new("L", (w, h), 0)
        ImageDraw.Draw(glow).ellipse([w * 0.55, h * 0.2, w * 0.95, h * 0.6], fill=170)
        glow = glow.filter(ImageFilter.GaussianBlur(w / 12))
        out = Image.composite(Image.new("RGB", (w, h), (255, 214, 150)), warm, glow)
    elif weather == "stars":
        out = ImageChops.multiply(img, Image.new("RGB", (w, h), (30, 38, 70)))
        d = ImageDraw.Draw(out)
        rng = random.Random(seed + 3)
        for _ in range(int(w * h / 3000)):
            x, y = rng.uniform(0, w), rng.uniform(0, h * 0.55)
            v = rng.randint(150, 255)
            d.point((x, y), fill=(v, v, v))
    else:
        out = img
    return out


def label(img, text):
    d = ImageDraw.Draw(img)
    s = img.size[0] / 1280
    f = font(max(11, int(16 * s)))
    d.rectangle([0, img.size[1] - 34 * s, img.size[0], img.size[1]], fill=(0, 0, 0))
    d.text((14 * s, img.size[1] - 26 * s), text, fill=(255, 255, 255), font=f)
    return img


def frames(dirname, w, h, n):
    path = OUT / "flight" / dirname
    shutil.rmtree(path, ignore_errors=True)
    path.mkdir(parents=True)
    for i in range(n):
        a = i / (n - 1)
        im = label(scene(a, w, h), f"PLACEHOLDER flight frame {i + 1}/{n} — replace with a UE5 render")
        im.save(path / f"f_{i + 1:04d}.webp", quality=58, method=6)


def video(path, w, h, a, weather, title, seconds=6, fps=24):
    with tempfile.TemporaryDirectory() as tmp:
        n = seconds * fps
        for i in range(n):
            drift = math.sin(i / n * 2 * math.pi)  # returns to the start: first frame = last frame
            im = grade(scene(a, w, h, shift=drift), weather, seed=i % 6)
            label(im, f"PLACEHOLDER preview — {title}")
            im.save(f"{tmp}/{i:04d}.png")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", f"{tmp}/%04d.png",
                        "-c:v", "libx264", "-crf", "30", "-preset", "slow", "-pix_fmt", "yuv420p", "-an",
                        "-movflags", "+faststart", str(path)], check=True)


CLIPS = [  # keep in sync with data.js (id, progress, weather, title)
    ("rain-on-leaves", 0.10, "rain", "Rain on forest leaves"),
    ("storm-over-canopy", 0.36, "rain", "Storm over the canopy"),
    ("river-mist", 0.56, "after", "River mist after rain"),
    ("ridge-golden-hour", 0.70, "golden", "Ridge at golden hour"),
    ("above-the-clouds", 0.86, "golden", "Above the clouds at dusk"),
    ("stars-over-peaks", 0.96, "stars", "Stars over the peaks"),
]

if __name__ == "__main__":
    frames("desktop", 1280, 720, 72)
    frames("mobile", 720, 1080, 48)
    wdir = OUT / "flight" / "weather"
    wdir.mkdir(parents=True, exist_ok=True)
    for name in ("rain", "after", "golden", "stars"):
        label(grade(scene(0.6, 1280, 720), name), f"PLACEHOLDER still — {name} — replace with a UE5 render").save(wdir / f"{name}.webp", quality=62, method=6)
    (OUT / "previews").mkdir(exist_ok=True)
    (OUT / "posters").mkdir(exist_ok=True)
    for cid, a, weather, title in CLIPS:
        video(OUT / "previews" / f"{cid}.mp4", 640, 360, a, weather, title)
        label(grade(scene(a, 640, 360), weather), f"PLACEHOLDER preview — {title}").save(OUT / "posters" / f"{cid}.webp", quality=70)
    video(OUT / "free" / "free-sample-720p.mp4", 1280, 720, 0.56, "after", "free 720p sample")
    print("placeholder assets written")
