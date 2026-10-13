#!/usr/bin/env python3
"""Families v1 phase 1: bakes the member looks that sit on a P1 card (flat bake, no runtime palette swap yet).
  Howling : dog, wolf, howling (family default; borrowed cat / bunny / other) x the 10 Howling chip colours x fluff 0-3 -> home + _ev
  Wingsong: wingsong (bird; borrowed), duck                                  x the 10 Wingsong chip colours x fluff 0-3 -> home + _ev + _fly
Files: px/<sprite>_<look>_<pal>_f<fl>[_ev|_fly].png. fox / owl are pixel-identical to today's sheets, so they are not re-baked.
Also writes px/looks_meta.json (frame colour check: <= 16 colours incl. transparent, no pure black). Run: python3 tools/bake_looks.py [look ...]"""
import os, sys, json
T = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(T)
sys.path.insert(0, T); sys.path.insert(0, '/workspace/echo/origin_v2/src')
import bake_pixel as BP, bake_events as BE, bake_whimber as BW, bake_whimber_fly as BF
import family_engine as FE, pixel_engine as PE, slyte_fox as SF   # family_engine runs tint.install() (the v0.3 palettes)
from PIL import Image
for cls in [c for c in vars(PE).values() if isinstance(c, type) and hasattr(c, 'palette') and hasattr(c, 'light_tint')]:
    if getattr(cls.palette, '_k', 0): continue
    orig = cls.palette
    def pal(self, v, _o=orig):   # explicit Wingsong ink key 'k' (sun-finch), as in bake_origin_palettes.py
        d = _o(self, v); P = PE.POWL.get(v.get('palette'), {})
        if isinstance(P, dict) and P.get('k') and 'f' in P: d['ink'] = P['k']
        return d
    pal._k = 1; cls.palette = pal
CH = json.load(open('/workspace/echo/origin_v2/data/origin_config.json'))['colour']['chips']
PALS = {f: list(dict.fromkeys(c['colour'] for c in CH[f])) for f in CH}
LOOKS = {'slyte': ['dog', 'wolf', 'howling'], 'whimber': ['wingsong', 'duck']}
only = set(sys.argv[1:]); OUT = os.path.join(REPO, 'px'); N = BP.N; meta = {'frames': 0, 'max': 0, 'over16': 0, 'black': 0}
def chk(im, w):
    for x in range(0, im.width, w):
        for y in range(0, im.height, w):
            fr = im.crop((x, y, x + w, y + w)); cs = fr.getcolors(4096) or []
            if not any(c[1][3] for c in cs): continue
            n = len(cs); meta['frames'] += 1; meta['max'] = max(meta['max'], n); meta['over16'] += n > 16
            meta['black'] += any(c[1][3] and c[1][:3] == (0, 0, 0) for c in cs)
for fam, looks in LOOKS.items():
    for look in looks:
        if only and look not in only: continue
        with FE.species(fam, look):
            for p in PALS[fam]:
                for fl in range(4):
                    if fam == 'slyte':
                        v = dict(SF.BASE, palette=p, fluff=fl, seed=7); im = BP.sheet(v)
                        ev = Image.new('RGBA', (N*15, N*2))
                        for r, frs in enumerate([BE.arrival(v), BE.release(v)]):
                            for i, f in enumerate(frs): ev.alpha_composite(f, (i*N, r*N))
                        sh = {'': im, '_ev': ev}
                    else:
                        v = BW.preset(p, fl); im = Image.new('RGBA', (N*len(BW.FRAMES), N*5), (0, 0, 0, 0))
                        for st in range(1, 6):
                            for i, (nm, spec) in enumerate(BW.FRAMES): im.alpha_composite(BW.frame(v, st, spec, i % 4), (i*N, (st-1)*N))
                        ev = Image.new('RGBA', (N*15, N*2))
                        for r, frs in enumerate((BW.arrival(v), BW.release(v))):
                            for i, f in enumerate(frs): ev.alpha_composite(f, (i*N, r*N))
                        sh = {'': im, '_ev': ev, '_fly': BF.sheet(p, fl)}
                    for suf, s in sh.items():
                        s.save(f'{OUT}/{fam}_{look}_{p}_f{fl}{suf}.png', optimize=True); chk(s, N)
                print(fam, look, p, flush=True)
json.dump(dict(meta, looks=LOOKS, palettes=PALS), open(f'{OUT}/looks_meta.json', 'w'), indent=1)
print('frames', meta)
