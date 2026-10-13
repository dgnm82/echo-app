#!/usr/bin/env python3
"""Whimber flap cycle (v1.1 motion proposal). Same engine and presets as tools/bake_whimber.py, so the frames match the
home sheets pixel-for-pixel in palette, fluff crest/chest mark, stage form (light-form halo on 1-3) and stage 5.
Writes one sheet per (POWL palette x fluff preset), like the _ev sheets: px/whimber_<pal>_f<fl>_fly.png,
rows = stages 1..5 (same as the home sheet), columns = fly0..fly3 (48x48 each).
  fly0 wings up (downstroke starts)   fly1 wings mid, going down
  fly2 wings down, body lifted 1 px   fly3 wings mid, coming up
Run from the repo root:  python3 tools/bake_whimber_fly.py [out_dir=px]"""
import os, sys
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
REPO_TOOLS = '/workspace/echo-app/tools'
if not os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bake_whimber.py')): sys.path.insert(0, REPO_TOOLS)
import bake_whimber as BW
from PIL import Image
N = BW.N
P = lambda **k: dict(k)
FLY = [('fly0', dict(pose=P(bob=0, flap=118))),
       ('fly1', dict(pose=P(bob=0, flap=66))),
       ('fly2', dict(pose=P(bob=0, flap=14), xf=(1, 1, 0, -8))),
       ('fly3', dict(pose=P(bob=0, flap=60), xf=(1, 1, 0, -4)))]
TICKS = [2, 2, 2, 2]          # 12 fps: one wingbeat = 8 ticks = 0.67 s (calm, ~1.5 beats/s)
def sheet(pal, fl):
    v = BW.preset(pal, fl); im = Image.new('RGBA', (N*len(FLY), N*5), (0, 0, 0, 0))
    for st in range(1, 6):
        for i, (nm, spec) in enumerate(FLY): im.alpha_composite(BW.frame(v, st, spec, i % 4), (i*N, (st-1)*N))
    return im
if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'px'; os.makedirs(out, exist_ok=True); mx = 0
    for pal in BW.PALS:
        for fl in range(4):
            im = sheet(pal, fl); im.save(f'{out}/whimber_{pal}_f{fl}_fly.png', optimize=True)
            for st in range(5):
                for c in range(len(FLY)):
                    fr = im.crop((c*N, st*N, (c+1)*N, (st+1)*N)); mx = max(mx, len(fr.getcolors(4096) or []))
    print('sheets:', len(BW.PALS)*4, 'max colours per frame (incl. transparent):', mx)
