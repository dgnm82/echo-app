#!/usr/bin/env python3
"""glow v1.1 (handoff/glow_v1.md §1/§2): writes px/aura.json = AURA/STRIP params from glow_v1/src/glow_mocks.py and the aura
colour roles (glow + rim per level) for every app palette. The aura itself is drawn at runtime (pixel.js). Run: python3 tools/bake_aura.py"""
import os, sys, json
T = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(T)
sys.path.insert(0, T); sys.path.insert(0, '/workspace/echo/origin_v2/src'); sys.path.insert(0, '/workspace/echo/glow_v1/src')
import bake_pixel as BP, bake_whimber as BW
import tint, pixel_engine as PE, slyte_fox as SF
tint.install()
import glow_mocks as GM
pj = open(os.path.join(REPO, 'pixel.js')).read()
def arr(name):
    import re; m = re.search(r'const %s=(.*?);' % name, pj); s = m.group(1)
    out = re.findall(r"'([^']+)'", s)
    if '.concat' in s: out = arr(s.split('.concat')[0].strip()) + out
    return out
roles = {}
for p in arr('PAL'):
    P = PE.SPECIES['slyte'].palette(dict(SF.BASE, palette=p, fluff=0, seed=7))
    roles[p] = {'glow': GM.roles(P, 1)['glow'], 'rim': [GM.roles(P, l)['rim'] for l in range(1, 6)]}
for p in arr('POWL'):
    P = PE.SPECIES['whimber'].palette(BW.preset(p, 0))
    roles[p] = {'glow': GM.roles(P, 1)['glow'], 'rim': [GM.roles(P, l)['rim'] for l in range(1, 6)]}
A = {'radius': {str(k): sum(b[0] for b in v['bands']) for k, v in GM.AURA.items()},
     'levels': {str(k): v for k, v in GM.AURA.items()}, 'strip28': {str(k): v for k, v in GM.STRIP.items()},
     'bayer4': [list(r) for r in GM.B4], 'spark': '#FFFFFF', 'roles': roles}
json.dump(A, open(os.path.join(REPO, 'px', 'aura.json'), 'w'), separators=(',', ':'))
print(len(roles), 'palettes', A['radius'])
