#!/usr/bin/env python3
"""
Favicon generator — "JC" in a terminal/typewriter monospace on the amber-CRT
(yellow→brown) background. Single source of truth: writes public/favicon.svg,
then rasterizes the PNG sizes from it via rsvg-convert.

Run from the repo root:  python3 tools/generate-logo.py   (or: pnpm run logo)
"""
import os, subprocess, shutil

# amber-CRT palette: yellow→brown tile, dark espresso letters
SVG = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="JC">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4b21a"/>
      <stop offset="1" stop-color="#b9760a"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#bg)"/>
  <text x="50" y="68" text-anchor="middle"
        font-family="'Geist Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
        font-size="52" font-weight="700" letter-spacing="-1" fill="#1a1206">JC</text>
</svg>
'''

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pub = os.path.join(root, "public")
src = os.path.join(pub, "favicon.svg")
open(src, "w").write(SVG)
print("wrote public/favicon.svg")

if shutil.which("rsvg-convert"):
    for name, s in [("apple-touch-icon.png", 180), ("icon-192.png", 192),
                    ("icon-512.png", 512), ("favicon-32.png", 32)]:
        subprocess.run(["rsvg-convert", "-w", str(s), "-h", str(s), src,
                        "-o", os.path.join(pub, name)], check=True)
    print("wrote PNG sizes (180/192/512/32)")
else:
    print("rsvg-convert not found — SVG written, skipped PNGs")
