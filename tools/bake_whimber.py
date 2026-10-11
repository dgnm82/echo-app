#!/usr/bin/env python3
"""Whimber pixel sheets (milestone 5), same engine/rules as Slyte (style guide §7, §9.2).
One sheet per (POWL palette x fluff preset): rows = stages 1..5, columns = the same 28 frame slots as Slyte so pixel.js
maps expressions identically. Owl meanings of the shared slots: ear1/ear2 = feather ruffle (fluff-up squash),
tail1/tail2 = head swivel (2-step head offset, never a 180 turn), blink = one eye at a time (config quirk).
Crest / chest mark per fluff preset (seeded shape extras need a bake; see report). Plus an _ev sheet: arrival + release (flap up, dissolve, home star)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import bake_pixel as BP
from PIL import Image
PE, N, OUT = BP.PE, BP.N, BP.OUT
H = PE.H
OWL = PE.SPECIES['whimber']; _orig = type(OWL).face
def _face(self, put, F, N_, C, eyes, v):
    parts = eyes.split('+'); base = parts[0]; ex = set(parts[1:])
    _orig(self, put, F, N_, C, {'half': 'open', 'wide': 'open'}.get(base, base), v)
    E = H(C['eye']); FUR = H(C['cream'])
    for exx in (156, 244):
        x0, y0 = F((exx, 172))
        if base == 'half':
            for dx in range(-2, 2): put(x0+dx, y0-3, E); put(x0+dx, y0-2, FUR if dx in (-2, 1) else E); put(x0+dx, y0-1, E)
        if base == 'wide': put(x0-2, y0-1, H('#FFFFFF')); put(x0+1, y0+1, H('#FFFFFF'))
    bx, by = F((200, 198))
    if ex & {'mopen', 'mo'}: put(bx, by+1, E); put(bx, by+2, H(C['beak']))
    if 'mchomp' in ex: put(bx-1, by+1, H(C['beak'])); put(bx+1, by+1, H(C['beak']))
    if 'mfrown' in ex: put(bx-1, by+2, E); put(bx+1, by+2, E)
    if 'blush2' in ex:
        for xx in (128, 272):
            x0, y0 = F((xx, 204)); d = 1 if xx > 200 else -1
            for k in (0, 1, 2): put(x0+d*k-d, y0+1, H(C['blush']))
    for zk, (zx, zy) in (('z1', (40, 8)), ('z2', (41, 5))):
        if zk in ex:
            for a, b in ((0, 0), (1, 0), (2, 0), (3, 0), (2, 1), (1, 2), (0, 3), (1, 3), (2, 3), (3, 3)): put(zx+a, zy+b, H('#FFFFFF'))
            for a, b in ((0, 0), (1, 0), (2, 0), (1, 1), (0, 2), (1, 2), (2, 2)): put(zx-5+a, zy+6+b, H('#FFD27A'))
    if 'notes' in ex:   # sleepy trill: 3 pixel notes
        for k, (nx, ny) in enumerate(((38, 14), (42, 9), (45, 4))): put(nx, ny, H('#FFD27A')); put(nx+1, ny-1, H('#FFD27A')); put(nx+1, ny-2, H('#FFD27A'))
type(OWL).face = _face
P = lambda **k: dict(k)
IDLE = [P(bob=0), P(bob=0), P(bob=1), P(bob=1), P(bob=1), P(bob=0)]
FRAMES = [('idle', dict(pose=p)) for p in IDLE] + [
  ('blink', dict(pose=P(bob=0), eyes='wink')),                                   # one eye at a time
  ('ear1', dict(pose=P(bob=0), xf=(1.08, 1.04, 0, -8))), ('ear2', dict(pose=P(bob=0), xf=(1.03, 1.01, 0, -2))),   # feather ruffle (fluff-up)
  ('tail1', dict(pose=P(bob=0, tilt=-12))), ('tail2', dict(pose=P(bob=0, tilt=11))),                            # head swivel -24/+22 as 2 steps
  ('happy', dict(pose=P(bob=1), eyes='happy', hearts=True)),
  ('eat1', dict(pose=P(bob=1, tilt=8), xf=(1, 1, -9, 0), eyes='open+mopen')), ('eat2', dict(pose=P(bob=1, tilt=8), xf=(1, 1, -9, 0), eyes='happy+mchomp')),
  ('pet1', dict(pose=P(bob=1, tilt=-6), xf=(1.02, .96, 0, 0), eyes='happy+blush2', hearts=True)), ('pet2', dict(pose=P(bob=0, tilt=-4), eyes='happy+blush2', hearts=True)),
  ('curious1', dict(pose=P(bob=0, tilt=-14), xf=(1, 1, 9, 0), eyes='wide')), ('curious2', dict(pose=P(bob=1, tilt=12), xf=(1, 1, 9, 0), eyes='open+mo')),
  ('shy1', dict(pose=P(bob=1, tilt=-8, flap=-22), eyes='happy+blush2')), ('shy2', dict(pose=P(bob=1, tilt=-6, flap=-18), eyes='half+blush2')),   # wing up toward the beak, face visible
  ('sleepy1', dict(pose=P(bob=1), eyes='half')), ('sleepy2', dict(pose=P(bob=1, tilt=-4), eyes='blink+notes')),
  ('nap1', dict(pose=P(bob=1, tilt=-10), xf=(1.04, .98, 0, 0), eyes='blink+z1', halo=0)), ('nap2', dict(pose=P(bob=0, tilt=-10), xf=(1.04, .98, 0, 0), eyes='blink+z2', halo=0)),
  ('sad', dict(pose=P(bob=1, tilt=-6), eyes='half+mfrown')), ('surprised', dict(pose=P(bob=0, flap=12), eyes='wide+mo')),
  ('think', dict(pose=P(bob=0, tilt=9), eyes='wink_l')), ('giggle', dict(pose=P(bob=1, tilt=6), xf=(1, 1.02, 0, 0), eyes='happy+mopen')),
]
assert [f[0] for f in FRAMES] == [f[0] for f in BP.FRAMES], 'slots must match Slyte'
def frame(v, stage, spec, phase):
    spec = dict(spec)
    if stage == 5:
        e = spec.get('eyes', 'open'); b = e.split('+')[0]; e = e if b in ('blink', 'half', 'wink', 'wink_l') else 'happy' + ''.join('+'+x for x in e.split('+')[1:])
        return PE.render('whimber', v, N=N, stage=5, eyes=e, dissolve=.35, hearts=True, star_home=True, phase=phase, pose=spec.get('pose'), xf=spec.get('xf', (1, 1, 0, 0)))
    return PE.render('whimber', v, N=N, stage=stage, phase=phase, **spec)
PALS = list(PE.POWL)
def preset(pal, fl):   # crest + chest mark per fluff preset (defaults, flagged)
    return dict(palette=pal, fluff=fl, seed=4, crest='plume' if fl in (1, 3) else 'tufts', mark=('stars', 'constellation', 'moonbands', 'stars')[fl], moongem=fl != 2, tuft=1.0, wing=1.0)
def star(im, x, y, big=False): import bake_events as BE; BE.star(im, x, y, big)
def arrival(v):
    import bake_events as BE; fr = []
    for i, (x, y) in enumerate(((30, 4), (27, 12), (25, 20))):
        im = Image.new('RGBA', (N, N)); BE.star(im, x, y, i == 2); fr.append(im)
    for t in (0, 1):
        im = Image.new('RGBA', (N, N)); BE.spiral(im, t); fr.append(im)
    for d in (.97, .9, .78, .62, .45, .25): fr.append(PE.render('whimber', v, N=N, stage=1, eyes='blink', dissolve=d, phase=len(fr) % 4))
    fr.append(PE.render('whimber', v, N=N, stage=1, eyes='blink', phase=1))
    fr.append(PE.render('whimber', v, N=N, stage=1, eyes='open', phase=2))
    fr.append(PE.render('whimber', v, N=N, stage=1, eyes='happy', phase=3, xf=(1, 1, 0, -30), hearts=True))
    fr.append(PE.render('whimber', v, N=N, stage=1, eyes='open', phase=0))
    return fr
def release(v):   # wings up (takeoff) with hearts, then outside-in dissolve while gliding up, then the home star
    fr = [PE.render('whimber', v, N=N, stage=5, eyes='happy', hearts=True, phase=0, pose=dict(flap=30)),
          PE.render('whimber', v, N=N, stage=5, eyes='happy', hearts=True, phase=1, pose=dict(flap=55), xf=(1, 1, 0, -20))]
    for i, d in enumerate((.12, .25, .38, .5, .62, .74, .84, .93, .98)):
        fr.append(PE.render('whimber', v, N=N, stage=5, eyes='happy', dissolve=d, hearts=i < 2, star_home=True, phase=i % 4, pose=dict(flap=(55, 8)[i % 2]), xf=(1, 1, 0, -30-i*6)))
    for ph in (0, 1):
        im = Image.new('RGBA', (N, N)); p = im.load(); sx, sy = N-5, 4; W_, Y_ = H('#FFFFFF'), H('#FFD27A')
        for a, b in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)) + (((2, 0), (-2, 0), (0, 2), (0, -2)) if ph else ()): p[sx+a, sy+b] = W_ if (a, b) == (0, 0) else Y_
        fr.append(im)
    return fr
if __name__ == '__main__':
    mx = 0
    for pal in PALS:
        for fl in range(4):
            v = preset(pal, fl)
            im = Image.new('RGBA', (N*len(FRAMES), N*5), (0, 0, 0, 0))
            for st in range(1, 6):
                for i, (nm, spec) in enumerate(FRAMES): im.alpha_composite(frame(v, st, spec, i % 4), (i*N, (st-1)*N))
            im.save(f'{OUT}/whimber_{pal}_f{fl}.png', optimize=True); mx = max(mx, BP.colours(im))
            ev = Image.new('RGBA', (N*15, N*2))
            for r, frs in enumerate((arrival(v), release(v))):
                for i, f in enumerate(frs): ev.alpha_composite(f, (i*N, r*N))
            ev.save(f'{OUT}/whimber_{pal}_f{fl}_ev.png', optimize=True)
        print(pal, flush=True)
    print('max colours per frame (incl. transparent):', mx)
