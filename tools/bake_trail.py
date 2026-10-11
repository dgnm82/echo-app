#!/usr/bin/env python3
"""Sparkle trail assets (spec v0.3 §3): 16px head tokens per palette (open/happy x 2 bob frames, from Nya's pixel_tokens.py),
followers (3 per Echo x 2 frames), rare pickups, a bump-only bush/puddle, and 16px board tiles."""
import sys
from PIL import Image
sys.path[:0] = ['/workspace/echo/style_research/src', '/workspace/echo/style_research/pixel/generator', 'tools']
from PIL import Image as _I
_save = _I.Image.save
_I.Image.save = lambda self, fp, *a, **k: None if ('/game_design/' in str(fp) or '/style_research/' in str(fp)) else _save(self, fp, *a, **k)
src = open('/workspace/echo/game_design/src/game_mocks.py').read(); exec(src[:src.index('def glow(')])
import pixel_tokens as TK, pixel_engine as PE, pixel_ui as U, slyte_fox as SF
_I.Image.save = _save
OUT = 'px/trail'
def sheet(sp, v):
    im = Image.new('RGBA', (64, 16))
    for i, (e, b) in enumerate((('open', 0), ('open', 1), ('happy', 0), ('happy', 1))): im.alpha_composite(TK.token(sp, v, 4, eyes=e, bob=b), (i*16, 0))
    return im
for p in SF.PALETTES: sheet('slyte', dict(SF.BASE, palette=p)).save(f'{OUT}/tok_slyte_{p}.png')
for p in PE.POWL: sheet('whimber', dict(TK.WHIMBER, palette=p)).save(f'{OUT}/tok_whimber_{p}.png')
def recolor(im, m):
    out = im.copy(); px = out.load()
    for y in range(16):
        for x in range(16):
            c = px[x, y]
            if c[3] and (c[0], c[1], c[2]) in m: px[x, y] = m[(c[0], c[1], c[2])] + (255,)
    return out
def two(im):  # 2-frame follower: bob 1px
    s = Image.new('RGBA', (32, 16)); s.alpha_composite(im, (0, 0)); s.alpha_composite(im, (16, 1) if True else (16, 0)); return s
leaf = ITEMS['leaf']; cols = sorted({c[:3] for c in leaf.getdata() if c[3]})
red = recolor(leaf, {c: (min(255, c[0]+10), max(0, c[1]-70), max(0, c[2]-30)) for c in cols if c != (59, 42, 92)})
gold = recolor(leaf, {c: (255, min(255, c[1]+50), max(0, c[2]-40)) for c in cols if c != (59, 42, 92)})
for i, im in enumerate((leaf, red, gold)): two(im).save(f'{OUT}/f_slyte_{i}.png')
for i, k in enumerate(('firefly', 'baby_star', 'firefly')): two(ITEMS[k] if i < 2 else recolor(ITEMS['firefly'], {})).save(f'{OUT}/f_whimber_{i}.png')
ITEMS['trinket'].save(f'{OUT}/rare_slyte.png'); ITEMS['moon'].save(f'{OUT}/rare_whimber.png')
U.t_bush().save(f'{OUT}/obs_slyte.png')
pd = Image.new('RGBA', (16, 16)); px = pd.load()
for y in range(6, 13):
    for x in range(1, 15):
        if ((x-7.5)/7)**2 + ((y-9.5)/3.6)**2 <= 1: px[x, y] = PE.H('#5A6FB8') if (x+y) % 5 else PE.H('#9FB8F0')
pd.save(f'{OUT}/obs_whimber.png')
U.t_grass(3).save(f'{OUT}/tile_slyte_a.png'); U.t_flowers().save(f'{OUT}/tile_slyte_b.png')
U.t_sky(stars=True, f=0).save(f'{OUT}/tile_whimber_a.png'); U.t_sky(stars=False, f=1).save(f'{OUT}/tile_whimber_b.png')
print('trail assets ok')
