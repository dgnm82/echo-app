#!/usr/bin/env python3
"""Milestone 4 assets: icons for arrival/release/postcard flows, the glowing path (grows over the grace period),
and painted pixel postcard fronts (152x80). Palette: the guide's warm 16 + UI ink."""
import sys, math
from PIL import Image, ImageDraw
sys.path.insert(0, 'tools'); import bake_pixel as BP
from PIL import Image as _I
_save = _I.Image.save
_I.Image.save = lambda self, fp, *a, **k: None if '/game_design/' in str(fp) else _save(self, fp, *a, **k)
src = open('/workspace/echo/game_design/src/game_mocks.py').read(); exec(src[:src.index('def glow(')]); _I.Image.save = _save
OUT = 'px'; H = BP.PE.H
K = '#3B2A5C'
ICOL = BP.ICOL
NEW = {
 'mail_closed': ["................","................","...KKKKKKKKK....","..KCCCCCCCCCK...","..KCKCCCCCKCK...","..KCCKCCCKCCK...","..KCCCKCKCCCK...","..KCCCCKCCCCK...","..KCCCCCCCCCK...","..KKKKKKKKKKK...","................","................","................","................","................","................"],
 'mail_open': ["................","..KKKKKKKKKKK...","..KCPPPPPPPCK...","..KCPWPPPPPCK...","..KCPPPPPPPCK...","..KKKKKKKKKKK...","..KKCCCCCCCKK...","..KCKCCCCCKCK...","..KCCKCCCKCCK...","..KCCCKKKCCCK...","..KCCCCCCCCCK...","..KKKKKKKKKKK...","................","................","................","................"],
 'postcard': ["................","................",".KKKKKKKKKKKKKK.",".KTTTTTTTTKYYYK.",".KTTTTTWTTKYPYK.",".KTTTTTTTTKYYYK.",".KTGGTTTTTKKKKK.",".KGGGGGTTGGCCCK.",".KGGGGGGGGGCKCK.",".KGDGGGGDGGCCCK.",".KKKKKKKKKKKKKK.","................","................","................","................","................"],
 'sad': ["................","................","....KKKKKKK.....","...KYYYYYYYK....","..KYYKYYYKYYK...","..KYYKYYYKYYK...","..KYTYYYYYYYK...","..KYTYKKKYYYK...","..KYYKYYYKYYK...","...KYYYYYYYK....","....KKKKKKK.....","................","................","................","................","................"],
 'proud': ["................","................","....KKKKKKK.....","...KYYYYYYYK....","..KYKKYYYKKYK...","..KYYYYYYYYYK...","..KYPYYYYYPYK...","..KYKYYYYYKYK...","..KYYKKKKKYYK...","...KYYYYYYYK....","....KKKKKKK.....","................","................","................","................","................"],
 'star': ["................","................",".......K........","......KYK.......","......KYK.......",".KKKKKYWYKKKKK..","..KYYYYWYYYYK...","...KYYYYYYYK....","....KYYYYYK.....","....KYYKYYK.....","...KYYK.KYYK....","...KKK...KKK....","................","................","................","................"],
 'nose': ["................","................","................","....KKKKKKK.....","...KPPPPPPPK....","..KPPWPPPPPPK...","..KPPPPPPPPPK...","...KPPPPPPPK....","....KKKKKKK.....","................","................","................","................","................","................","................"],
 'skip': ["................","................","................","..KK....KK......","..KYK...KYK.....","..KYYK..KYYK....","..KYYYK.KYYYK...","..KYYYYKKYYYYK..","..KYYYK.KYYYK...","..KYYK..KYYK....","..KYK...KYK.....","..KK....KK......","................","................","................","................"],
}
def bake_icons():
    for nm, rows in NEW.items():
        im = Image.new('RGBA', (16, 16))
        for y, r in enumerate(rows):
            for x, ch in enumerate(r):
                if ch != '.': im.putpixel((x, y), H(ICOL[ch]))
        im.save(f'{OUT}/i_{nm}.png')
    for nm in ('leaf', 'feather', 'trinket', 'blackberry', 'honey_cake'): ITEMS[nm].save(f'{OUT}/i_{nm}.png')
def bake_path():
    """glowing stepping-stone path from the Echo (bottom-left) to the far edge (top-right); path_k shows k segments"""
    pts = [(10 + i*14, 66 - i*6 - int(3*math.sin(i))) for i in range(9)]
    for k in (1, 2, 3):
        im = Image.new('RGBA', (140, 80)); d = ImageDraw.Draw(im)
        n = 3*k
        for i, (x, y) in enumerate(pts[:n]):
            w = max(4, 12 - i)
            for dy in (-2, -1, 0, 1, 2):                      # dithered halo ring
                for dx in range(-w//2-3, w//2+4):
                    if (x+dx+y+dy) % 2 == 0 and abs(dy) == 2 or abs(dx) > w//2+1 and (x+dx+y+dy) % 2 == 0:
                        im.putpixel((x+dx, y+dy), H('#FFE39A')[:3] + (150,))
            d.rectangle((x-w//2, y-1, x+w//2, y+1), fill='#FFD27A', outline=K)
            d.line((x-w//2+1, y-1, x+w//2-1, y-1), fill='#FFFFFF')
        if k == 3:
            sx, sy = 132, 8
            for a, b in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1), (2, 0), (-2, 0), (0, 2), (0, -2)): im.putpixel((sx+a, sy+b), H('#FFFFFF' if (a, b) == (0, 0) else '#FFD27A'))
        im.save(f'{OUT}/path_{k}.png')
def bands(d, cols, h):
    n = len(cols); step = h//n
    for i, c in enumerate(cols): d.rectangle((0, i*step, 151, (i+1)*step), fill=c)
def scene(kind):
    im = Image.new('RGBA', (152, 80)); d = ImageDraw.Draw(im)
    if kind == 'meadow':
        bands(d, ['#9FD8F0', '#B8E4F4', '#D4F0F8', '#F6F0DC'], 52); d.ellipse((118, 6, 132, 20), fill='#FFE39A', outline='#FFD27A')
        d.polygon([(0, 52), (40, 38), (90, 50), (152, 36), (152, 80), (0, 80)], fill='#8CCB7E'); d.polygon([(0, 60), (70, 50), (152, 58), (152, 80), (0, 80)], fill='#6DB274')
        for i in range(40):
            x, y = (i*37) % 150, 58 + (i*13) % 20; d.point((x, y), fill=('#FF8FB8', '#FFFFFF', '#FFD27A', '#B9A6FF')[i % 4]); d.point((x, y+1), fill='#4E8A5A')
    elif kind == 'autumn':
        bands(d, ['#F6B07A', '#F8C890', '#FBDDA8', '#FDEEC8'], 50)
        for tx in (14, 120):
            d.rectangle((tx+8, 26, tx+12, 56), fill='#86573F'); d.ellipse((tx-4, 6, tx+24, 34), fill='#E8705A', outline='#B0744E'); d.ellipse((tx+2, 10, tx+16, 24), fill='#F2A65A')
        d.rectangle((0, 50, 151, 79), fill='#D9A55A'); d.rectangle((0, 64, 151, 79), fill='#C98A44')
        d.ellipse((50, 50, 110, 76), fill='#E8705A', outline='#B0744E')
        for i in range(30): d.point((54 + (i*7) % 52, 54 + (i*5) % 18), fill=('#FFD27A', '#F2A65A', '#B0744E')[i % 3])
        for i in range(10): d.point(((i*29) % 150, 8 + (i*11) % 40), fill='#E8705A')
    elif kind in ('log', 'bramble', 'sunset'):
        sky = {'log': ['#9FD8F0', '#B8E4F4', '#D4F0F8', '#F6F0DC'], 'bramble': ['#B8E4F4', '#D4F0F8', '#E8F6F8', '#F6F0DC'], 'sunset': ['#7A5AC8', '#E8705A', '#F2A65A', '#FFD27A']}[kind]
        bands(d, sky, 52)
        if kind == 'sunset': d.ellipse((60, 36, 92, 68), fill='#FFE39A')
        d.polygon([(0, 54), (60, 44), (152, 52), (152, 80), (0, 80)], fill='#8CCB7E' if kind != 'sunset' else '#6DB274'); d.rectangle((0, 64, 151, 79), fill='#6DB274' if kind != 'sunset' else '#4E8A5A')
        if kind in ('log', 'sunset'):
            d.rectangle((88, 52, 140, 70), fill='#B0744E', outline=K); d.ellipse((132, 52, 146, 70), fill='#86573F', outline=K); d.ellipse((135, 56, 143, 66), fill='#2A1A3A')
            for x in range(92, 132, 6): d.line((x, 55, x+3, 55), fill='#86573F')
            if kind == 'sunset': d.point((128, 68), fill='#FFFFFF'); d.rectangle((126, 66, 129, 68), outline='#7FE0FF')
        if kind == 'bramble':
            d.ellipse((92, 30, 150, 72), fill='#4E8A5A', outline=K); d.ellipse((98, 36, 144, 64), fill='#6DB274')
            for i in range(22): x, y = 100 + (i*13) % 42, 38 + (i*7) % 26; d.rectangle((x, y, x+1, y+1), fill='#7A4FB0'); d.point((x, y), fill='#A77AD8')
        for i in range(26):
            x, y = (i*37) % 150, 66 + (i*13) % 12; d.point((x, y), fill=('#FF8FB8', '#FFFFFF', '#FFD27A')[i % 3])
    elif kind in ('field', 'stars', 'library', 'autumnnight', 'frost'):
        bands(d, ['#2E2452', '#3B2A5C', '#4E3A78', '#6A54A0'], 56)
        for i in range(30): d.point(((i*53) % 150, (i*17) % 46), fill='#FFFFFF' if i % 3 else '#FFD27A')
        if kind == 'field':
            d.ellipse((120, 6, 136, 22), fill='#FFF1C4'); d.rectangle((0, 58, 151, 79), fill='#3E6A54'); [d.line((x, 58, x, 52 - (x % 5)), fill='#6DB274') for x in range(2, 150, 7)]
        if kind == 'stars':
            pts = [(30, 14), (46, 22), (62, 16), (76, 28), (92, 20)]; d.line(pts, fill='#FFD27A'); [d.rectangle((x-1, y-1, x+1, y+1), fill='#FFFFFF') for x, y in pts]
            d.rectangle((0, 60, 151, 79), fill='#2A3A4A'); d.line((96, 60, 150, 50), fill='#86573F', width=3)
        if kind == 'library':
            d.rectangle((0, 0, 151, 79), fill='#4A3550'); d.rectangle((0, 14, 151, 19), fill='#86573F', outline=K)
            for x in range(4, 150, 10): d.rectangle((x, 46, x+7, 70), fill=('#E8705A', '#7FD4E8', '#FFD27A', '#8CCB7E', '#B9A6FF')[(x//10) % 5], outline=K)
            d.rectangle((0, 70, 151, 79), fill='#86573F'); d.rectangle((40, 38, 70, 44), fill='#FFFAF6', outline=K); d.line((55, 38, 55, 44), fill='#E6C9A8')
        if kind == 'autumnnight':
            d.rectangle((104, 14, 124, 64), fill='#86573F', outline=K); d.ellipse((86, 0, 142, 26), fill='#B0744E'); d.ellipse((92, 4, 132, 20), fill='#E8705A')
            for i in range(9): d.rectangle(((i*19) % 140, 20 + (i*11) % 36, (i*19) % 140 + 1, 21 + (i*11) % 36), fill='#F2A65A')
            d.rectangle((0, 64, 151, 79), fill='#5A4A3A')
        if kind == 'frost':
            d.ellipse((60, 6, 92, 38), fill='#FFF1C4'); d.rectangle((0, 56, 151, 79), fill='#C9D8F0', outline=K); d.line((0, 56, 151, 56), fill='#FFFFFF')
            d.rectangle((0, 0, 3, 79), fill='#86573F'); d.rectangle((148, 0, 151, 79), fill='#86573F'); d.rectangle((0, 0, 151, 3), fill='#86573F')
            for x in range(6, 148, 9): d.point((x, 58), fill='#FFFFFF')
    else:  # night: hollow / first snow under stars
        bands(d, ['#2E2452', '#3B2A5C', '#4E3A78', '#6A54A0'], 50)
        for i in range(24): d.point(((i*53) % 150, (i*17) % 44), fill='#FFFFFF' if i % 3 else '#FFD27A')
        d.ellipse((16, 6, 26, 16), fill='#FFF1C4'); d.ellipse((19, 5, 29, 15), fill='#3B2A5C')
        d.rectangle((104, 14, 124, 60), fill='#86573F', outline=K); d.ellipse((108, 26, 120, 40), fill='#2A1A3A'); d.point((112, 31), fill='#FFD27A'); d.point((116, 31), fill='#FFD27A')
        d.ellipse((90, 0, 140, 22), fill='#4E8A5A')
        d.rectangle((0, 58, 151, 79), fill='#EAF2FF'); d.line((0, 58, 151, 58), fill='#FFFFFF')
        for i in range(30): d.point(((i*41) % 150, (i*23) % 56), fill='#FFFFFF')
    d.rectangle((0, 0, 151, 79), outline=K)
    im.save(f'{OUT}/pc_{kind}.png')
bake_icons(); bake_path(); [scene(k) for k in ('meadow', 'autumn', 'night', 'log', 'bramble', 'sunset', 'field', 'stars', 'library', 'autumnnight', 'frost')]; print('m4 assets ok')
