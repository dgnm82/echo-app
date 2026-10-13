#!/usr/bin/env python3
"""Bakes the 9 P1 animal icons (16x16, origin_v2 src/icons.py art) + a 10x12 lock to px/origin/."""
import os, sys
from PIL import Image
sys.path.insert(0, '/workspace/echo/origin_v2/src'); import icons
OUT = os.path.join(os.path.dirname(__file__), '..', 'px', 'origin'); os.makedirs(OUT, exist_ok=True)
hexc = lambda h: tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
def bake(rows, cmap, name):
  im = Image.new('RGBA', (len(rows[0]), len(rows)), (0, 0, 0, 0))
  for y, r in enumerate(rows):
    for x, c in enumerate(r):
      if c != '.': im.putpixel((x, y), hexc(cmap[c]))
  im.save(os.path.join(OUT, name + '.png'))
for k, v in icons.A.items(): bake(v, icons.C, k)
LOCK = ["...KKKK...", "..K....K..", ".K......K.", ".K......K.", "KKKKKKKKKK", "KYYYYYYYYK", "KYYYKKYYYK", "KYYYKKYYYK",
        "KYYYYKYYYK", "KYYYYYYYYK", "KDDDDDDDDK", "KKKKKKKKKK"]
bake(LOCK, {'K': '#3B2A5C', 'Y': '#FFC870', 'D': '#C9782E'}, 'lock')
print(sorted(os.listdir(OUT)))
