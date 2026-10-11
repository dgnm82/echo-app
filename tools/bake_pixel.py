#!/usr/bin/env python3
"""Bakes the pixel-art assets the game loads (px/), using the style-guide engine in
/workspace/echo/style_research/pixel/generator (pixel_engine.py). Run: python3 tools/bake_pixel.py
Slyte sheets: one PNG per (palette x fluff preset). Rows = stages 1..5, columns = frames (see FRAMES).
Ear/tail/eye shape params are fixed at 1.0 (presets only: fluff 0-3), see report 'open decisions'."""
import os, sys, json, shutil
R = '/workspace/echo/style_research'
sys.path[:0] = [f'{R}/pixel/generator', f'{R}/src']
from PIL import Image
import pixel_engine as PE, pixel_ui as U, slyte_fox as SF
OUT = os.path.join(os.path.dirname(__file__), '..', 'px'); os.makedirs(OUT, exist_ok=True)
N = 48
# frame list per stage row (12 fps; durations live in pixel.js)
IDLE = [dict(pose=dict(bob=0, sway=0)), dict(pose=dict(bob=0, sway=3)), dict(pose=dict(bob=1, sway=5)), dict(pose=dict(bob=1, sway=3)), dict(pose=dict(bob=1, sway=0)), dict(pose=dict(bob=0, sway=-3))]
FRAMES = [('idle', p) for p in IDLE] + [
  ('blink', dict(pose=dict(bob=0, sway=0), eyes='blink')),
  ('ear1', dict(pose=dict(bob=0, sway=0), ear=.88)), ('ear2', dict(pose=dict(bob=0, sway=0), ear=1.08)),
  ('tail1', dict(pose=dict(bob=0, sway=14))), ('tail2', dict(pose=dict(bob=0, sway=-7))),
  ('happy', dict(pose=dict(bob=1, sway=4), eyes='happy', hearts=True)),
]
def frame(v, stage, spec, phase):
    spec = dict(spec); vv = dict(v)
    if 'ear' in spec: vv['ear'] = spec.pop('ear')
    if stage == 5:   # release: happy eyes, hearts, gentle dissolve + home star
        return PE.render('slyte', vv, N=N, stage=5, eyes='happy', dissolve=.35, hearts=True, star_home=True, phase=phase, pose=spec.get('pose'))
    return PE.render('slyte', vv, N=N, stage=stage, phase=phase, **spec)
def sheet(v):
    im = Image.new('RGBA', (N*len(FRAMES), N*5), (0, 0, 0, 0))
    for st in range(1, 6):
        for i, (nm, spec) in enumerate(FRAMES):
            im.alpha_composite(frame(v, st, spec, i % 4), (i*N, (st-1)*N))
    return im
def colours(im):
    s = set()
    for y in range(0, im.height, N):
        for x in range(0, im.width, N):
            s = max(s, set(c for c in im.crop((x, y, x+N, y+N)).getdata() if c[3]) , key=len)
    return len(s) + 1
def backdrop(W, Hh, ground, kind='dusk', f=0):
    """copied from pixel_guide_assets.backdrop: real 16x16 tiles, dusk bands or night sky over grass."""
    from PIL import ImageDraw
    bg = Image.new('RGBA', (W, Hh), PE.H(U.TP['dusk3']))
    for ty in range((Hh+15)//16):
        for tx in range((W+15)//16):
            y = ty*16
            if kind == 'night': t = U.t_sky(stars=(tx+ty) % 3 == 0, f=f)
            else:
                band = min(3, max(0, int((y/max(1, ground))*3.2)))
                t = U.t_dusk(min(band, 2)) if band < 3 else U.fill(U.tile(), U.TP['dusk0'])
            bg.alpha_composite(t, (tx*16, y))
    for tx in range((W+15)//16):
        for ty in range(0, Hh-ground+16, 16):
            g = U.t_grass(tx+3*ty+1) if (tx+ty) % 4 else U.t_flowers()
            bg.alpha_composite(g, (tx*16, ground+ty))
    ImageDraw.Draw(bg).line([0, ground, W, ground], fill=PE.H(U.TP['g0']))
    return bg
def bake_world():
    W, Hh = 180, 320
    for kind in ('dusk', 'night'):
        for f in (0, 1):
            bg = backdrop(W, Hh, 236, kind, f)
            for x in range(0, W, 16): bg.alpha_composite(U.t_path(x), (x, 268)) if 40 <= x < 150 else None
            bg.save(f'{OUT}/bg_{kind}_f{f}.png')
    # discover scene: bush cluster (left) + tree with hollow (right), 1x on the same grid
    d = backdrop(W, Hh, 236, 'dusk')
    for x, y in ((14, 222), (30, 222), (22, 210), (46, 224), (6, 226)): d.alpha_composite(U.t_bush(), (x, y))
    trunk = Image.new('RGBA', (20, 110), PE.H('#9A6A44'))
    for yy in range(0, 110, 6): trunk.putpixel((6, yy), PE.H('#7A5034')); trunk.putpixel((13, (yy+3) % 110), PE.H('#7A5034'))
    d.alpha_composite(trunk, (132, 130)); d.alpha_composite(U.t_hollow(), (126, 170))
    for x, y in ((112, 112), (128, 100), (144, 108), (120, 124), (150, 122), (104, 126), (136, 118)): d.alpha_composite(U.t_bush(), (x, y))
    d.save(f'{OUT}/bg_discover.png')
    for nm in ('feed', 'pet', 'play', 'sleep'): U.icon(nm).save(f'{OUT}/icon_{nm}.png')
    U.heart(True).save(f'{OUT}/heart_full.png'); U.heart(False).save(f'{OUT}/heart_empty.png')
    U.panel(24, 24).save(f'{OUT}/panel.png'); U.button(24, 24).save(f'{OUT}/button.png'); U.button(24, 24, True).save(f'{OUT}/button_d.png')
    U.bubble(24, 24, '').save(f'{OUT}/bubble.png')
    shutil.copy('/usr/share/fonts/truetype/sand-box/google/Press Start 2P/PressStart2P-Regular.ttf', f'{OUT}/PressStart2P.ttf')
if __name__ == '__main__':
    only = sys.argv[1:]  # optional palette filter
    pals = list(SF.PALETTES); meta = dict(frames=[f[0] for f in FRAMES], size=N, palettes=pals, fluffs=[0, 1, 2, 3], maxColours=0)
    for p in pals:
        if only and p not in only: continue
        for fl in range(4):
            v = dict(SF.BASE, palette=p, fluff=fl, seed=7)
            im = sheet(v); im.save(f'{OUT}/slyte_{p}_f{fl}.png', optimize=True)
            meta['maxColours'] = max(meta['maxColours'], colours(im)); print(p, fl, flush=True)
    bake_world()
    json.dump(meta, open(f'{OUT}/slyte_meta.json', 'w'))
    print('max colours per frame (incl. transparent):', meta['maxColours'])
