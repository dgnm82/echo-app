#!/usr/bin/env python3
"""Whimber flap cycle (v1.1 / v3 unified motion). Same engine and presets as tools/bake_whimber.py and tools/family_engine.py,
so the frames match the home sheets pixel-for-pixel in species anatomy, palette, fluff crest/chest mark, and stage form.
Writes px/whimber[_<look>]_<pal>_f<fl>_fly.png, columns = fly0..fly3 (48x48 each).
  fly0 wings up (downstroke starts)   fly1 wings mid, going down
  fly2 wings down, body lifted 1 px   fly3 wings mid, coming up
Run from the repo root:  python3 tools/bake_whimber_fly.py [out_dir=px]"""
import os, sys
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
REPO_TOOLS = '/workspace/echo-app/tools'
if not os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bake_whimber.py')): sys.path.insert(0, REPO_TOOLS)
import bake_whimber as BW, pixel_engine as PE
from PIL import Image
N = BW.N
P = lambda **k: dict(k)
FLY = [('fly0', dict(pose=P(bob=0, flap=118))),
       ('fly1', dict(pose=P(bob=0, flap=66))),
       ('fly2', dict(pose=P(bob=0, flap=14), xf=(1, 1, 0, -8))),
       ('fly3', dict(pose=P(bob=0, flap=60), xf=(1, 1, 0, -4)))]
TICKS = [2, 2, 2, 2]          # 12 fps: one wingbeat = 8 ticks = 0.67 s (calm, ~1.5 beats/s)
def sheet(pal, fl, look=None, one_row=True):
    import family_engine as FE
    v = BW.preset(pal, fl)
    with FE.species('whimber', look or 'owl'):
        if one_row:
            im = Image.new('RGBA', (N*len(FLY), N), (0, 0, 0, 0))
            for i, (nm, spec) in enumerate(FLY):
                im.alpha_composite(PE.render('whimber', v, N=N, stage=4, halo=None, nspark=0, phase=i, **spec), (i*N, 0))
            return im
        im = Image.new('RGBA', (N*len(FLY), N*5), (0, 0, 0, 0))
        for st in range(1, 6):
            for i, (nm, spec) in enumerate(FLY): im.alpha_composite(BW.frame(v, st, spec, i % 4), (i*N, (st-1)*N))
        return im
if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'px'; os.makedirs(out, exist_ok=True); mx = 0
    for pal in BW.PALS:
        for fl in range(4):
            im = sheet(pal, fl, one_row=True); im.save(f'{out}/whimber_{pal}_f{fl}_fly.png', optimize=True)
            for c in range(len(FLY)):
                fr = im.crop((c*N, 0, (c+1)*N, N)); mx = max(mx, len(fr.getcolors(4096) or []))
    print('sheets:', len(BW.PALS)*4, 'max colours per frame (incl. transparent):', mx)
