#!/usr/bin/env python3
"""Copy videos.json and site.json into the fallback <script> tags in index.html.

Only needed if you want the site to show your latest data when opening
index.html directly from disk (file://). GitHub Pages always reads the JSON files.
Usage: python3 tools/sync-fallback.py
"""
import json, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")

for tag, name in (("videos-fallback", "videos.json"), ("site-fallback", "site.json")):
    data = json.loads((root / name).read_text(encoding="utf-8"))  # validates JSON
    body = json.dumps(data, ensure_ascii=False, indent=2).replace("</", "<\\/")
    html, n = re.subn(
        rf'(<script type="application/json" id="{tag}">)(.*?)(</script>)',
        lambda m: f"{m.group(1)}\n{body}\n  {m.group(3)}", html, flags=re.S)
    if n != 1:
        raise SystemExit(f"Could not find #{tag} in index.html")

(root / "index.html").write_text(html, encoding="utf-8")
print("index.html fallback data updated")
