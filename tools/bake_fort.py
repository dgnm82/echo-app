#!/usr/bin/env python3
"""Fort Builder assets (spec v0.2 §3): 16px home blocks, ghost + row glow, and the 48x48 treehouse-fort Home prop states.
Plank/window/leaf-roof tiles come from Nya's game_mocks.py (same palette); door/lantern/flag/props are drawn here."""
import re, sys
from PIL import Image, ImageDraw
sys.path.insert(0, '/workspace/echo/style_research/src')
src = open('/workspace/echo/game_design/src/game_mocks.py').read()
exec(src[:src.index('def glow(')])          # CM, img(), ITEMS (no mock rendering)
OUT = 'px/fort'
T = dict(ITEMS)
T['door'] = img(["bbbbbbbbbbbbbbbb", "bNNNNNNNNNNNNNNb", "bBBBBbbbbbbBBBBb", "bBBBbMMMMMMbBBBb", "bBBbMmmmmmmMbBBb", "bBBbMmBBBBmMbBBb", "bBBbMmBBBBmMbBBb", "bBBbMmBBBBmMbBBb",
                 "bBBbMmBBYBmMbBBb", "bBBbMmBBBBmMbBBb", "bBBbMmBBBBmMbBBb", "bBBbMmBBBBmMbBBb", "bBBbMmBBBBmMbBBb", "bNNbMmBBBBmMbNNb", "bBBbMmBBBBmMbBBb", "bbbbbbbbbbbbbbbb"])
T['lantern'] = img(["bbbbbbbbbbbbbbbb", "bNNNNNNKNNNNNNNb", "bBBBBBBKBBBBBBBb", "bBBBBBKKKBBBBBBb", "bBBBBKYYYKBBBBBb", "bBBBKYhhhYKBBBBb", "bBBBKYhLhYKBBBBb", "bBBBKYhhhYKBBBBb",
                    "bBBBKYYhYYKBBBBb", "bBBBBKYYYKBBBBBb", "bBBBBBKKKBBBBBBb", "bBBBBBBBBBBBBBBb", "bbbbbbbbbbbbbbbb", "bNNNNNNNNNNNNNNb", "bBBBBBBBBBBBBBBb", "bbbbbbbbbbbbbbbb"])
T['flag'] = img(["bbbbbbbbbbbbbbbb", "bNNKRRRRRRNNNNNb", "bBBKRRRRRRRRBBBb", "bBBKRRLRRRRBBBBb", "bBBKRRRRRRRRBBBb", "bBBKRRRRRRBBBBBb", "bBBKBBBBBBBBBBBb", "bBBKBBBBBBBBBBBb",
                 "bbbKbbbbbbbbbbbb", "bNNKNNNNNNNNNNNb", "bBBKBBBBBBBBBBBb", "bBBKBBBBBBBBBBBb", "bbbbbbbbbbbbbbbb", "bNNNNNNNNNNNNNNb", "bBBBBBBBBBBBBBBb", "bbbbbbbbbbbbbbbb"])
lr = Image.new('RGBA', (16, 16)); lr.alpha_composite(T['plank']); lr.alpha_composite(T['leaf_roof']); T['leafroof'] = lr
T['slyte'] = Image.new('RGBA', (16, 16)); T['slyte'].alpha_composite(T['plank']); T['slyte'].alpha_composite(T['token_slyte'])
for k in ('plank', 'window', 'leafroof', 'door', 'lantern', 'flag', 'slyte'): T[k].save(f'{OUT}/b_{k}.png')
# ghost outline + 3-frame row glow
g = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(g); d.rectangle((0, 0, 15, 15), outline=(255, 216, 107, 255)); d.rectangle((1, 1, 14, 14), outline=(255, 216, 107, 90)); g.save(f'{OUT}/ghost.png')
for i, a in enumerate((90, 160, 90)):
    im = Image.new('RGBA', (16, 16), (255, 227, 154, a)); ImageDraw.Draw(im).line((0, 0, 15, 0), fill=(255, 255, 255, 200)); im.save(f'{OUT}/glow{i}.png')
# 8px mini tiles for the "home so far" strip
for k in ('plank', 'window', 'door', 'lantern', 'flag', 'leafroof'): T[k].resize((8, 8), Image.NEAREST).save(f'{OUT}/m_{k}.png')
# ---- 48x48 Home prop: frame -> 1 floor -> 2 floors -> roof (+ decorations, + open/glowing door)
K, BK, BR, BL, NN = '#3B2A5C', '#86573F', '#B0744E', '#E6AE7C', '#FFE39A'
G, g2, GD, Y = '#6DB274', '#9ED98E', '#4E8A5A', '#FFD86B'
def prop(stage, decor=0, open_=False):
    im = Image.new('RGBA', (48, 48)); d = ImageDraw.Draw(im)
    d.ellipse((2, 0, 45, 22), fill=GD); d.ellipse((5, 1, 42, 18), fill=G); [d.point((x, y), fill=g2) for x, y in ((12, 5), (20, 3), (30, 6), (36, 9), (16, 10), (26, 12))]
    d.rectangle((19, 18, 28, 47), fill=BK); d.rectangle((21, 18, 26, 47), fill=BR); d.line((23, 22, 23, 44), fill=BK)
    d.rectangle((4, 34, 43, 36), fill=BR, outline=K)                     # platform
    for x in (6, 40): d.rectangle((x, 37, x+1, 41), fill=BK)
    for y in range(38, 47, 3): d.line((30, y, 34, y), fill=BL)             # ladder
    d.line((30, 37, 30, 47), fill=BK); d.line((34, 37, 34, 47), fill=BK)
    if stage == 0:
        for x in (8, 39): d.rectangle((x, 20, x+1, 33), fill=BK)          # bare frame posts
        d.line((8, 20, 40, 20), fill=BK)
    for f in range(min(stage, 2)):
        y1 = 33 - f*9; y0 = y1 - 8
        d.rectangle((8, y0, 39, y1), fill=BR, outline=K); d.line((9, y0+3, 38, y0+3), fill=BK); d.line((9, y0+6, 38, y0+6), fill=BK)
        d.rectangle((12, y0+2, 16, y0+6), fill=NN, outline=K)
        d.rectangle((31, y0+2, 35, y0+6), fill=NN, outline=K)
        if f == 0:
            d.rectangle((21, y0+1, 26, y1), fill=(NN if open_ else BK), outline=K)
            if open_: d.point((25, y0+5), fill=K)
    if stage >= 3:
        top = 33 - 2*9 - 8
        d.polygon([(5, top), (24, top-11), (42, top)], fill=G, outline=K); d.line((10, top-2, 38, top-2), fill=g2)
    if open_:
        for x, y in ((19, 26), (28, 26), (23, 23), (24, 23)): d.point((x, y), fill=Y)
    if decor >= 1: d.line((42, 30, 42, 33), fill=K); d.rectangle((41, 26, 43, 29), fill=Y, outline=K)   # lantern
    if decor >= 2 and stage >= 3: top = 33-26; d.line((24, top-11, 24, top-17), fill=K); d.rectangle((25, top-17, 29, top-14), fill='#FF8FB8')  # flag
    if decor >= 3: d.rectangle((11, 31, 17, 33), fill='#FF8FB8', outline=K)                              # window box
    return im
for st in range(4):
    for op in (0, 1):
        prop(st, 0, op).save(f'{OUT}/fort_{st}{"_open" if op else ""}.png')
for dc in (1, 2, 3):
    for op in (0, 1): prop(3, dc, op).save(f'{OUT}/fort_3_d{dc}{"_open" if op else ""}.png')
print('fort assets ok')
