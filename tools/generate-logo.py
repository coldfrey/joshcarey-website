#!/usr/bin/env python3
"""
JC monogram logo generator — reproducible, math-driven.

Concept: the initials "J C" drawn as two intertwined line strokes.
- J  = left-biased top serif + stem + bottom hook   (tan / "1 brown")
- C  = open-right circular arc                       (blue gradient / "3 blue")
The C is split into an UNDER segment (drawn first) and an OVER segment (drawn
last) so the two letters genuinely weave: the C passes over the J stem at the
top crossing, and the J passes over the C at the bottom crossing. No casing
tricks — the interleave is real, so it stays clean on any background.

Palette nods to 3Blue1Brown (blue letterforms + a single warm "brown").

Usage:  python3 tools/generate-logo.py
Outputs SVG to public/favicon.svg (requires `rsvg-convert` for the PNG sizes).
Run from the repo root.
"""
import numpy as np, math, subprocess, os, shutil

BG, BG2 = "#0b1020", "#101a3a"
BLUE_A, BLUE_B, BLUE_C = "#8FDcF0", "#46AEDB", "#2C6FB5"
TAN, TAN2 = "#E0A867", "#C9824A"
H, SW = 100, 6.2

yf  = lambda p: [(x, H - y) for x, y in p]
arc = lambda cx, cy, r, a0, a1, n: [
    (cx + r*math.cos(math.radians(a)), cy + r*math.sin(math.radians(a)))
    for a in np.linspace(a0, a1, n)]
ln  = lambda p0, p1, n: [
    (p0[0]+(p1[0]-p0[0])*t, p0[1]+(p1[1]-p0[1])*t) for t in np.linspace(0, 1, n)]

def smooth_d(p):                      # Catmull-Rom -> cubic beziers (flowing line)
    p = yf(p)
    if len(p) < 3:
        return "M " + " L ".join(f"{x:.2f},{y:.2f}" for x, y in p)
    d = f"M {p[0][0]:.2f},{p[0][1]:.2f} "
    for i in range(len(p)-1):
        p0 = p[i-1] if i > 0 else p[0]; p1 = p[i]; p2 = p[i+1]
        p3 = p[i+2] if i+2 < len(p) else p[i+1]
        c1 = (p1[0]+(p2[0]-p0[0])/6, p1[1]+(p2[1]-p0[1])/6)
        c2 = (p2[0]-(p3[0]-p1[0])/6, p2[1]-(p3[1]-p1[1])/6)
        d += f"C {c1[0]:.2f},{c1[1]:.2f} {c2[0]:.2f},{c2[1]:.2f} {p2[0]:.2f},{p2[1]:.2f} "
    return d

# J then C. C crosses the J stem (x=38) where cosθ=(38-58)/27 -> θ≈137.78° / 222.22°
J       = ln((31,75),(40,75),2) + ln((38,75),(38,33),2) + arc(31,33,7.5,0,-192,30)
C_over  = arc(58,50,27, 54, 137.78, 30)     # upper-right → drawn OVER the J
C_under = arc(58,50,27, 137.78, 306, 46)    # left + bottom → drawn UNDER the J

def svg(tile=True):
    bg = '<rect width="100" height="100" rx="22" fill="url(#bgg)"/>' if tile else ''
    P = lambda d, g: (f'<path d="{d}" fill="none" stroke="{g}" stroke-width="{SW}" '
                      'stroke-linecap="round" stroke-linejoin="round"/>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="JC monogram">
<defs>
 <linearGradient id="gc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{BLUE_A}"/><stop offset=".55" stop-color="{BLUE_B}"/><stop offset="1" stop-color="{BLUE_C}"/></linearGradient>
 <linearGradient id="gj" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="{TAN2}"/><stop offset="1" stop-color="{TAN}"/></linearGradient>
 <radialGradient id="bgg" cx=".5" cy=".36" r=".9"><stop offset="0" stop-color="{BG2}"/><stop offset="1" stop-color="{BG}"/></radialGradient>
</defs>{bg}
{P(smooth_d(C_under),"url(#gc)")}
{P(smooth_d(J),"url(#gj)")}
{P(smooth_d(C_over),"url(#gc)")}
</svg>'''

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pub  = os.path.join(root, "public")
open(os.path.join(pub, "favicon.svg"), "w").write(svg(True))
open(os.path.join(root, "tools", "logo-bare.svg"), "w").write(svg(False))  # transparent variant
print("wrote public/favicon.svg + tools/logo-bare.svg")

if shutil.which("rsvg-convert"):
    src = os.path.join(pub, "favicon.svg")
    for name, s in [("apple-touch-icon.png",180),("icon-192.png",192),
                    ("icon-512.png",512),("favicon-32.png",32)]:
        subprocess.run(["rsvg-convert","-w",str(s),"-h",str(s),src,
                        "-o",os.path.join(pub,name)], check=True)
    print("wrote PNG sizes (180/192/512/32)")
else:
    print("rsvg-convert not found — SVG written, skipped PNGs")
