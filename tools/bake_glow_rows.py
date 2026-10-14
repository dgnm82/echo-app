#!/usr/bin/env python3
"""glow v1.1 (handoff/glow_v1.md §1/§7): home and _fly sheets become ONE row = the old stage-4 row without its baked sparkles
(halo was already 0 at stage 4), so the body colour is the same at every bond level and the aura is drawn at runtime.
Home sheets also get a 6-col ..._light.png idle strip (old stage-1 row) for the origin invite. One-shot; idempotent (1-row sheets are skipped)."""
import glob, os
from PIL import Image
N = 48; SPARK = {(255, 255, 255), (255, 210, 122)}
def unspark(im):
    """a baked sparkle = a group of <= 5 sparkle-coloured pixels (white / gold) touching transparency; the gem and eye
    highlights sit inside the body and never touch it, body light-fur groups are bigger than 5."""
    px = im.load(); W, H = im.size; seen = set(); n = 0
    sp = lambda c, d: 0 <= c < W and 0 <= d < H and px[c, d][3] and px[c, d][:3] in SPARK
    clear = lambda c, d: not (0 <= c < W and 0 <= d < H) or not px[c, d][3]
    for y in range(H):
        for x in range(W):
            if (x, y) in seen or not sp(x, y): continue
            comp, st = [], [(x, y)]; seen.add((x, y))
            while st:
                a, b = st.pop(); comp.append((a, b))
                for c, d in ((a+1, b), (a-1, b), (a, b+1), (a, b-1)):
                    if (c, d) not in seen and sp(c, d): seen.add((c, d)); st.append((c, d))
            if len(comp) <= 5 and any(clear(c, d) for a, b in comp for c, d in ((a+1, b), (a-1, b), (a, b+1), (a, b-1))):
                for p in comp: px[p] = (0, 0, 0, 0)
                n += 1
    return n
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'px'); tot = 0
for f in sorted(glob.glob(f'{R}/*.png')):
    im = Image.open(f).convert('RGBA')
    if im.height != 5*N or f.endswith('_ev.png'): continue
    if im.width == 28*N: im.crop((0, 0, 6*N, N)).save(f[:-4] + '_light.png', optimize=True)
    row = im.crop((0, 3*N, im.width, 4*N))
    for c in range(im.width // N):
        cell = row.crop((c*N, 0, c*N+N, N)); tot += unspark(cell); row.paste(cell, (c*N, 0))
    row.save(f, optimize=True)
print('sparkles removed', tot)
