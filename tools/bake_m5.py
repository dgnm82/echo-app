#!/usr/bin/env python3
"""Milestone 5 (Whimber) world assets: Hollow Builder blocks (spec v0.3 §2: bark, moss, moon window, feather nest, star lantern, door),
8px minis, the 48x48 tree-hollow Home prop states, Night Sky star sprites, and 16px icons for the constellation guesses + owl setup."""
import sys
from PIL import Image, ImageDraw
sys.path.insert(0, '/workspace/echo/style_research/src')
from PIL import Image as _I
_save = _I.Image.save
_I.Image.save = lambda self, fp, *a, **k: None if '/game_design/' in str(fp) else _save(self, fp, *a, **k)
src = open('/workspace/echo/game_design/src/game_mocks.py').read()
exec(src[:src.index('def glow(')])
_I.Image.save = _save
sys.path.insert(0, 'tools'); import bake_pixel as BP
OUT = 'px/hollow'; import os; os.makedirs(OUT, exist_ok=True)
T = dict(ITEMS)
T['hdoor'] = img(["bbbbbbbbbbbbbbbb", "bBNBBBbBBBNBBBbb", "bBBBBKKKKKKBBBBb", "bBBBKEEEEEEKBBBb", "bBBKEEEEEEEEKBBb", "bBBKEEEEEEEEKBBb", "bNBKEEEEEEEEKBNb", "bBBKEEEEEEYEKBBb",
                  "bBBKEEEEEEEEKBBb", "bBBKEEEEEEEEKBBb", "bBBKEEEEEEEEKBBb", "bBNKEEEEEEEEKBBb", "bBBKEEEEEEEEKNBb", "bBBKKKKKKKKKKBBb", "bBBBBbBBBNBBBBbb", "bbbbbbbbbbbbbbbb"])
T['starlantern'] = img(["bbbbbbbbbbbbbbbb", "bBNBBBBKBBBNBBbb", "bBBBBBBKBBBBBBBb", "bBBBBBKKKBBBBBBb", "bBBBBKYYYKBBBBBb", "bBBBKYYLYYKBBBBb", "bBKKYYLLLYYKKBBb", "bBKYLLLLLLLYKBBb",
                        "bBBKYYLLLYYKBBBb", "bBBBKYLYLYKBBBBb", "bBBBKYKBKYKBBBBb", "bBBBBKBBBKBBBBBb", "bBNBBBBBBBBBBNBb", "bBBBBbBBBNBBBBbb", "bBBNBBBBBBBBBBBb", "bbbbbbbbbbbbbbbb"])
T['nest'] = img(["bbbbbbbbbbbbbbbb", "bBNBBBbBBBNBBBbb", "bBBBBBBBBBBBBBBb", "bBBBBBFFBBBBBBBb", "bBBBBFFFFBBFBBBb", "bBBBBBFFFFFFBBBb", "bBBBBBBFFFFBBBBb", "bBBKKKKKKKKKKBBb",
                 "bBKNbNbNbNbNbKBb", "bBKbNbNbNbNbNKBb", "bBBKNbNbNbNbKBBb", "bBBBKKKKKKKKBBBb", "bBNBBBBBBBBBBNBb", "bBBBBbBBBNBBBBbb", "bBBNBBBBBBBBBBBb", "bbbbbbbbbbbbbbbb"])
mr = Image.new('RGBA', (16, 16)); mr.alpha_composite(T['bark']); mr.alpha_composite(T['moss']); T['mossroof'] = mr
# fort material -> hollow block (engine materials stay the same; Whimber has no disguise piece)
MAP = {'plank': 'bark', 'window': 'moon_window', 'leafroof': 'mossroof', 'door': 'hdoor', 'lantern': 'starlantern', 'flag': 'nest', 'slyte': 'bark'}
for k, v in MAP.items(): T[v].save(f'{OUT}/b_{k}.png'); T[v].resize((8, 8), Image.NEAREST).save(f'{OUT}/m_{k}.png')
K, BK, BR, BL, MOON = '#3B2A5C', '#5E4A3A', '#86573F', '#B0744E', '#FFF1C4'
G, g2, Y, F = '#6DB274', '#9ED98E', '#FFD86B', '#C8BCFF'
def prop(stage, decor=0, open_=False):
    im = Image.new('RGBA', (48, 48)); d = ImageDraw.Draw(im)
    d.polygon([(12, 47), (16, 8), (32, 8), (36, 47)], fill=BR, outline=K)             # trunk
    for y in range(12, 46, 5): d.line((18, y, 20, y+2), fill=BK); d.line((28, y+2, 30, y), fill=BK)
    d.line((32, 14, 44, 6), fill=BR, width=3); d.line((16, 18, 4, 12), fill=BR, width=3)  # branches
    d.ellipse((18, 26, 30, 40), fill='#2A1A3A', outline=K)                           # the hollow
    if open_: d.ellipse((20, 28, 28, 38), fill=Y); d.ellipse((22, 30, 26, 36), fill=MOON)
    if stage == 0:
        for x, y in ((17, 22), (31, 22)): d.point((x, y), fill=BL)
    for f in range(min(stage, 2)):                                                   # rings of bark + a moon window each
        y = 22 - f*8; d.line((16, y, 32, y), fill=BK); d.ellipse((21, y-6, 27, y-1), fill=MOON, outline=K)
    if stage >= 3:                                                                   # mossy roof cap with leaves
        d.ellipse((8, 0, 40, 14), fill='#4E8A5A', outline=K); d.ellipse((11, 1, 37, 11), fill=G)
        for x, y in ((15, 4), (22, 2), (30, 5), (35, 7), (19, 8)): d.point((x, y), fill=g2)
    if decor >= 1: d.line((44, 7, 44, 11), fill=K); d.polygon([(44, 12), (46, 14), (44, 16), (42, 14)], fill=Y, outline=K)   # star lantern
    if decor >= 2: d.ellipse((1, 9, 9, 14), fill=BL, outline=K); d.point((5, 9), fill=F); d.point((4, 8), fill=F)              # feather nest
    if decor >= 3: d.rectangle((17, 40, 31, 42), fill=G, outline=K)                                                          # moss box
    return im
for st in range(4):
    for op in (0, 1): prop(st, 0, op).save(f'{OUT}/hollow_{st}{"_open" if op else ""}.png')
for dc in (1, 2, 3):
    for op in (0, 1): prop(3, dc, op).save(f'{OUT}/hollow_3_d{dc}{"_open" if op else ""}.png')
# Night Sky: 16px star sprites (2 twinkle frames), lit star, and the 16px Whimber head token for the handheld/sky
def starimg(lit, f):
    im = Image.new('RGBA', (16, 16)); p = im.load(); W_, Yc, Fc = BP.PE.H('#FFFFFF'), BP.PE.H('#FFD27A'), BP.PE.H('#C8BCFF')
    arm = 3 if f == 0 else 4; c = Yc if lit else Fc
    for k in range(1, arm+1):
        for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)): p[7+dx, 7+dy] = c if k < arm else (W_ if lit else c)
    for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)): p[7+dx, 7+dy] = c
    p[7, 7] = W_
    if lit:
        for dx, dy in ((2, 2), (-2, 2), (2, -2), (-2, -2)): p[7+dx, 7+dy] = Yc
    return im
for lit in (0, 1):
    for f in (0, 1): starimg(lit, f).save(f'px/sky_star{"_on" if lit else ""}_{f}.png')
ICOL = BP.ICOL
ICONS = {
 'spoon': ["................",".........KKK....","........KCCCK...","........KCWCK...","........KCCCK...",".........KCK....","........KCK.....",".......KCK......","......KCK.......",".....KCK........","....KCK.........","...KCK..........","...KK...........","................","................","................"],
 'cat': ["................","..K.......K.....",".KOK.....KOK....",".KOOKKKKKOOK....",".KOOOOOOOOOK....",".KOKOOOOKOOK....",".KOOOOPOOOOK....","..KOOKKKOOK.....","...KOOOOOK......","..KOOOOOOOK.....",".KOOOOOOOOOK.KK.",".KOOOOOOOOOKKOK.",".KOOKOOOKOOOOK..","..KK.KKK.KKKK...","................","................"],
 'whale': ["................","................","............K.K.",".............K..","....KKKKKK..KTK.","..KKTTTTTTKKTTK.",".KTTTTTTTTTTTK..",".KTWKTTTTTTTTK..",".KTTTTTTTTTTK...",".KCCCCCCCCCCK...","..KCCCCCCCCK....","...KKKKKKKK.....","................","................","................","................"],
 'house': ["................",".......KK.......","......KRRK......",".....KRRRRK.....","....KRRRRRRK....","...KRRRRRRRRK...","..KKKKKKKKKKKK..","...KCCCCCCCCK...","...KCKKCCKKCK...","...KCKYCCKKCK...","...KCKKCCCCCK...","...KCCCCKKCCK...","...KCCCCKYCCK...","...KKKKKKKKKK...","................","................"],
 'dragon': ["................","..K.K...........",".KGKGK..........",".KGGGGK.....K...","KGWKGGK....KGK..","KGGGGGGK..KGGK..",".KKKGGGGKKGGK...","...KGGGGGGGK....","...KGGYGGGGK....","..KGGYYGGGK.....","..KGGGYGGK......","...KGKKGK.......","...KK..KK.......","................","................","................"],
 'balloon': ["................","....KKKKK.......","...KRRRRRK......","..KRWRRRRRK.....","..KRWRRRRRK.....","..KRRRRRRRK.....","..KRRRRRRRK.....","...KRRRRRK......","....KRRRK.......",".....KKK........","......K.........",".......K........","......K.........",".......K........","................","................"],
 'feather': ["................",".........KK.....","........KFFK....",".......KFFFK....","......KFFFFK....","......KFFFK.....",".....KFFFFK.....",".....KFFFK......","....KFFFFK......","....KFFFK.......","...KFFFK........","...KKKK.........","..K.............",".K..............","................","................"],
}
ICOL = dict(ICOL, F='#C8BCFF')
for nm, rows in ICONS.items():
    im = Image.new('RGBA', (16, 16))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.': im.putpixel((x, y), BP.PE.H(ICOL[ch]))
    im.save(f'px/i_{nm}.png')
# night Home background with the owl's tree at the right edge (the hollow prop sits on it)
bg = Image.open('px/bg_night_f0.png').convert('RGBA'); d = ImageDraw.Draw(bg)
d.ellipse((148, 52, 200, 98), fill='#3E6A54', outline=K)
d.polygon([(158, 236), (162, 90), (180, 90), (180, 236)], fill='#6A4A3A', outline=K)
bg.save('px/bg_nighthome.png')
print('m5 assets ok')
