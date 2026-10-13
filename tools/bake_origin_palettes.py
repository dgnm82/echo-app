#!/usr/bin/env python3
"""Bakes the 17 origin v0.3 colour palettes (origin_v2/src/tint.py: SLYTE_NEW, WHIMBER_NEW, SOLID_TWINS) through the same
bakers as the existing ramps: Slyte home + _ev sheets, Whimber home + _ev + _fly sheets, and the runner/flyer frames
(game_design/src/runner_polish.py stage_maps / bake_all) into px/run/<pal>/. Whimber palettes may carry an explicit
plum ink key 'k' (sun-finch); the engine default stays mix(f2,'#2a1a48',.55). Run: python3 tools/bake_origin_palettes.py"""
import os, sys, shutil, tempfile
T = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(T)
sys.path.insert(0, T); sys.path.insert(0, '/workspace/echo/origin_v2/src')
import bake_pixel as BP, bake_events as BE, bake_whimber as BW, bake_whimber_fly as BF
import tint, pixel_engine as PE, slyte_fox as SF
from PIL import Image
tint.install()
# explicit ink key 'k' for Whimber palettes (handoff §1.3)
for cls in [c for c in vars(PE).values() if isinstance(c, type) and hasattr(c, 'palette') and hasattr(c, 'light_tint')]:
    orig = cls.palette
    def pal(self, v, _o=orig):
        d = _o(self, v); P = PE.POWL.get(v.get('palette'), {}) if isinstance(PE.POWL, dict) else {}
        if isinstance(P, dict) and P.get('k') and 'f' in P: d['ink'] = P['k']
        return d
    cls.palette = pal
NEW_S = list(tint.SLYTE_NEW) + [r + '-solid' for r in tint.SOLID_TWINS['slyte']]
NEW_W = list(tint.WHIMBER_NEW) + [r + '-solid' for r in tint.SOLID_TWINS['whimber']]
only = set(sys.argv[1:])
OUT = os.path.join(REPO, 'px'); N = BP.N
for p in NEW_S:
    if only and p not in only: continue
    for fl in range(4):
        v = dict(SF.BASE, palette=p, fluff=fl, seed=7)
        BP.sheet(v).save(f'{OUT}/slyte_{p}_f{fl}.png', optimize=True)
        im = Image.new('RGBA', (N*15, N*2))
        for r, frs in enumerate([BE.arrival(v), BE.release(v)]):
            for i, f in enumerate(frs): im.alpha_composite(f, (i*N, r*N))
        im.save(f'{OUT}/slyte_{p}_f{fl}_ev.png', optimize=True)
    print('slyte', p, flush=True)
for pal in NEW_W:
    if only and pal not in only: continue
    for fl in range(4):
        v = BW.preset(pal, fl); im = Image.new('RGBA', (N*len(BW.FRAMES), N*5), (0, 0, 0, 0))
        for st in range(1, 6):
            for i, (nm, spec) in enumerate(BW.FRAMES): im.alpha_composite(BW.frame(v, st, spec, i % 4), (i*N, (st-1)*N))
        im.save(f'{OUT}/whimber_{pal}_f{fl}.png', optimize=True)
        ev = Image.new('RGBA', (N*15, N*2))
        for r, frs in enumerate((BW.arrival(v), BW.release(v))):
            for i, f in enumerate(frs): ev.alpha_composite(f, (i*N, r*N))
        ev.save(f'{OUT}/whimber_{pal}_f{fl}_ev.png', optimize=True)
        BF.sheet(pal, fl).save(f'{OUT}/whimber_{pal}_f{fl}_fly.png', optimize=True)
    print('whimber', pal, flush=True)
# runner / flyer frames
sys.path.insert(0, '/workspace/echo/game_design/src')
import runner_polish as RP
tmp = tempfile.mkdtemp(); RP.OUT = tmp; RP.PAL_SLYTE = [p for p in NEW_S if not only or p in only]; RP.PAL_OWL = [p for p in NEW_W if not only or p in only]
rep = RP.bake_all()
for pal in RP.PAL_SLYTE + RP.PAL_OWL:
    src = f'{tmp}/px/run/{pal}'; dst = f'{OUT}/run/{pal}'
    if os.path.isdir(dst): shutil.rmtree(dst)
    shutil.copytree(src, dst)
for k, v in rep.items(): print('run', k, v)
