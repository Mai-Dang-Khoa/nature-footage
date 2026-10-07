#!/usr/bin/env python3
"""Generate the SAMPLE frame sequence used by the scroll-scrubbed "hero film".

Replace these frames with a real UE5 render (see README). Usage:
  python3 tools/make-sample-sequence.py
Writes assets/sequence/desktop/frame_0001.webp … (1280×720) and
assets/sequence/mobile/frame_0001.webp … (640×360).
"""
import math, pathlib, random
from PIL import Image, ImageDraw, ImageFilter

N = 60
ROOT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "sequence"

def lerp(a, b, t): return a + (b - a) * t
def mix(c1, c2, t): return tuple(int(lerp(a, b, t)) for a, b in zip(c1, c2))

def ridge(seed, base, amp, w, step=40):
    r = random.Random(seed)
    pts, x = [], -step * 4
    while x <= w + step * 4:
        pts.append((x, base + r.uniform(-amp, amp)))
        x += step
    return pts

W, H = 1280, 720
RIDGES = [ridge(s, b, a, W) for s, b, a in ((1, 380, 60), (2, 450, 50), (3, 520, 40), (4, 600, 28))]

def frame(i):
    t = i / (N - 1)                      # 0 → 1: night → sunrise, camera moves forward
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    top = mix((10, 14, 30), (38, 52, 92), t)
    mid = mix((30, 34, 60), (196, 120, 92), t)
    low = mix((48, 44, 64), (248, 196, 140), t)
    for y in range(H):
        k = y / H
        c = mix(top, mid, k / 0.6) if k < 0.6 else mix(mid, low, (k - 0.6) / 0.4)
        d.line([(0, y), (W, y)], fill=c)
    # sun rising behind the ridges, with a soft glow
    sx, sy = W * 0.62, lerp(560, 300, t)
    glow = Image.new("L", (W, H), 0)
    g = ImageDraw.Draw(glow)
    for r in range(220, 0, -6):
        g.ellipse([sx - r, sy - r, sx + r, sy + r], fill=int(lerp(0, 120 + 100 * t, (220 - r) / 220) * 0.5))
    img = Image.composite(Image.new("RGB", (W, H), (255, 228, 190)), img, glow.filter(ImageFilter.GaussianBlur(30)))
    d = ImageDraw.Draw(img)
    d.ellipse([sx - 34, sy - 34, sx + 34, sy + 34], fill=mix((240, 200, 160), (255, 236, 200), t))
    # ridges: nearer layers move and grow more (dolly forward + parallax)
    colors = [mix((40, 44, 70), (120, 96, 110), t), mix((28, 32, 52), (80, 62, 76), t), mix((18, 22, 36), (46, 38, 48), t), (8, 10, 14)]
    for depth, (pts, col) in enumerate(zip(RIDGES, colors)):
        speed = (depth + 1) * 26
        scale = 1 + t * 0.06 * (depth + 1)
        cx = W / 2
        moved = [((x - cx) * scale + cx - t * speed, H - (H - y) * scale) for x, y in pts]
        d.polygon(moved + [(W + 400, H), (-400, H)], fill=col)
    # mist band
    mist = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mist).rectangle([0, 470, W, 560], fill=int(70 * (1 - t) + 20))
    img = Image.composite(Image.new("RGB", (W, H), (210, 214, 224)), img, mist.filter(ImageFilter.GaussianBlur(28)))
    ImageDraw.Draw(img).text((24, H - 34), f"SAMPLE FRAME {i + 1:02d}/{N}", fill=(200, 200, 200))
    return img

for i in range(N):
    im = frame(i)
    name = f"frame_{i + 1:04d}.webp"
    im.save(ROOT / "desktop" / name, "WEBP", quality=68, method=4)
    im.resize((640, 360), Image.LANCZOS).save(ROOT / "mobile" / name, "WEBP", quality=66, method=4)
print("done")
