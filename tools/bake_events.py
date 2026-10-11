#!/usr/bin/env python3
"""Arrival + release event sheets for Slyte (pixel style guide §5 and §9.2 'Arrival' P0 / 'Release' P1 must-ship).
Row 0 = arrival (15 frames): falling star x3, gather x2, form heart-out x6 (the dissolve reversed, light form), eyes-closed hold,
open, happy hop, settle.  Row 1 = release (13 frames): hearts x2, outside-in dissolve x9 (face last), home star x2."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import bake_pixel as BP
from PIL import Image
PE, SF, N, OUT = BP.PE, BP.SF, BP.N, BP.OUT
W, H = PE.H('#FFFFFF'), PE.H('#FFD27A')
def star(im, x, y, big=False):
    p = im.load()
    for a, b in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)) + (((2, 0), (-2, 0), (0, 2), (0, -2)) if big else ()):
        if 0 <= x+a < N and 0 <= y+b < N: p[x+a, y+b] = W if (a, b) == (0, 0) else H
    for k in range(1, 4):              # short trail up-left
        if 0 <= x-k*2 < N and 0 <= y-k*2 < N: p[x-k*2, y-k*2] = H if k < 3 else W
def spiral(im, t):
    import math; p = im.load()
    for i in range(12):
        a = i*0.52 + t*1.3; r = 18 - t*7 - (i % 3)
        x, y = int(24 + r*math.cos(a)), int(28 + r*.8*math.sin(a))
        if 0 <= x < N and 0 <= y < N: p[x, y] = (W, H, W)[i % 3]
def arrival(v):
    fr = []
    for i, (x, y) in enumerate(((30, 4), (27, 12), (25, 20))):
        im = Image.new('RGBA', (N, N)); star(im, x, y, i == 2); fr.append(im)
    for t in (0, 1):
        im = Image.new('RGBA', (N, N)); spiral(im, t); fr.append(im)
    for d in (.97, .9, .78, .62, .45, .25):      # forms heart-out: the release dissolve played backwards, light palette
        fr.append(PE.render('slyte', v, N=N, stage=1, eyes='blink', dissolve=d, phase=len(fr) % 4))
    fr.append(PE.render('slyte', v, N=N, stage=1, eyes='blink', phase=1))
    fr.append(PE.render('slyte', v, N=N, stage=1, eyes='open', phase=2))
    fr.append(PE.render('slyte', v, N=N, stage=1, eyes='happy', phase=3, xf=(1, 1, 0, -40)))   # hop (≈4 px)
    fr.append(PE.render('slyte', v, N=N, stage=1, eyes='open', phase=0))
    return fr
def release(v):
    fr = [PE.render('slyte', v, N=N, stage=5, eyes='happy', hearts=True, phase=i) for i in (0, 1)]
    for i, d in enumerate((.12, .25, .38, .5, .62, .74, .84, .93, .98)):
        fr.append(PE.render('slyte', v, N=N, stage=5, eyes='happy', dissolve=d, hearts=i < 2, star_home=True, phase=i % 4))
    for ph in (0, 1):
        im = Image.new('RGBA', (N, N)); p = im.load(); sx, sy = N-5, 4
        for a, b in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)) + (((2, 0), (-2, 0), (0, 2), (0, -2)) if ph else ()):
            p[sx+a, sy+b] = W if (a, b) == (0, 0) else H
        fr.append(im)
    return fr
if __name__ == '__main__':
    for p in SF.PALETTES:
        for fl in range(4):
            v = dict(SF.BASE, palette=p, fluff=fl, seed=7)
            rows = [arrival(v), release(v)]
            im = Image.new('RGBA', (N*15, N*2))
            for r, frs in enumerate(rows):
                for i, f in enumerate(frs): im.alpha_composite(f, (i*N, r*N))
            im.save(f'{OUT}/slyte_{p}_f{fl}_ev.png', optimize=True)
        print(p, flush=True)
