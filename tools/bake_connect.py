#!/usr/bin/env python3
"""Connect assets (spec v0.3 §4): 16px item tiles from Cole's tile sheet code, sparkle wildcard, favourite glow ring, gather burst (4 frames)."""
import sys
from PIL import Image, ImageDraw
from PIL import Image as _I
sys.path.insert(0, '/workspace/echo/style_research/src')
_save = _I.Image.save
_I.Image.save = lambda self, fp, *a, **k: None if '/game_design/' in str(fp) else _save(self, fp, *a, **k)
src = open('/workspace/echo/game_design/src/game_mocks.py').read(); exec(src[:src.index('def memory_mock(')])
_I.Image.save = _save
for k in ('blackberry', 'honey_cake', 'nut', 'leaf', 'apple', 'trinket', 'star', 'moon', 'dewdrop', 'comet', 'firefly', 'feather'): ITEMS[k].save(f'px/connect/{k}.png')
sp = Image.new('RGBA', (16, 16)); p = sp.load(); K, Y, W, P = (59, 42, 92, 255), (255, 210, 122, 255), (255, 255, 255, 255), (255, 143, 184, 255)
for k in range(1, 7):
    for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)): p[7+dx, 7+dy] = Y if k < 5 else W
for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1), (2, 2), (-2, -2), (2, -2), (-2, 2)): p[7+dx, 7+dy] = P if abs(dx) == 2 else Y
p[7, 7] = W; sp.save('px/connect/sparkle.png')
ring = Image.new('RGBA', (20, 20)); d = ImageDraw.Draw(ring)
for x in range(20):
    for y in range(20):
        if (x in (0, 19) or y in (0, 19)) and (x+y) % 2 == 0: ring.putpixel((x, y), Y)
ring.save('px/connect/favring.png')
for f in range(4):
    b = Image.new('RGBA', (16, 16)); q = b.load(); r = 2+f*2
    for a in range(8):
        import math
        x, y = int(7.5+r*math.cos(a*math.pi/4)), int(7.5+r*math.sin(a*math.pi/4))
        if 0 <= x < 16 and 0 <= y < 16: q[x, y] = W if f < 2 else Y
    b.save(f'px/connect/burst{f}.png')
print('connect assets ok')
