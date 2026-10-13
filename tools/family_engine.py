#!/usr/bin/env python3
"""Families v1 (Oct 12, B): generic family looks for the Howlings (canines) and the Wingsongs (birds).
Approved Oct 12 2026 7:55 PM PT (families_v1 handoff). Copied from origin_v2/families_v1/src/family_engine.py; used by tools/bake_looks.py.

Same engine, same pipeline (pixel_engine.render: label raster -> role palette -> rim shading -> plum ink outline + seams ->
hand-placed face), same palettes (the 10 solid colours per family from origin_v2/src/tint.py), same internal ids
('slyte' = Howlings, 'whimber' = Wingsongs). A family member is a PRESET: a few shape switches on the generic body.

Howling presets switch  ears (soft | pointed | floppy | wide), snout (k: muzzle length) and tail (scale, angle).
Wingsong presets switch tufts, eye discs (owl discs | soft patches), crest (none | plume | comb), beak (small | point | long |
bill | hook | tiny) and head size.
Family identity cues (proposed style guide §6 amendment): Howling = cream muzzle + bib, cream tail tip, socks, forehead gem,
plum ink.  Wingsong = round body, cream belly + eye patches, white wingtips, talons, gold beak, moon gem, plum ink.
Fox ears / owl tufts + discs become MEMBER cues (Slyte, Whimber), not family cues."""
import sys, math, random, contextlib
sys.path.insert(0, '/workspace/echo/style_research/src'); sys.path.insert(0, '/workspace/echo/origin_v2/src')
import pixel_engine as PE, slyte_pixel as FX, slyte_fox as SF, tint as T
T.install()
H = PE.H

# ------------------------------------------------------------------ Howlings (canines)
HOWL = {   # preset: ears, ear scale, snout k (1 = Slyte's long fox muzzle), tail scale, tail angle (deg, + = lower), fluff
  'howling': dict(ears='soft',    ear=.80, snout=.90, tail=.92, swing=6,   fluff=1),   # the family default: reads as pup, fox or wolf
  'fox':     dict(ears='pointed', ear=1.0, snout=1.0, tail=1.0, swing=0,   fluff=1),   # = today's Slyte
  'dog':     dict(ears='floppy',  ear=1.0, snout=.80, tail=.70, swing=-16, fluff=0),
  'wolf':    dict(ears='wide',    ear=.74, snout=.96, tail=.90, swing=10,  fluff=3),
  'coyote':  dict(ears='pointed', ear=1.08, snout=.98, tail=.84, swing=26, fluff=0),
}
class Howling(PE.Fox):
    def __init__(self, preset='howling'):
        super().__init__(); self.p = HOWL[preset]; self.base_seams = dict(self.seams)
    def geometry(self, v, pose):
        p = self.p; v = dict(v, ear=p['ear'] * v.get('ear_k', 1), tail=p['tail'], fluff=p['fluff'] if v.get('fluff_auto', True) else v['fluff'])
        self._v = v
        geo = [(L, poly) for L, poly, tag in FX.geometry(v, bob=pose.get('bob_u', 0), sway=pose.get('sway', 0) + 9 + p['swing'])]
        k = p['snout']; by = pose.get('bob_u', 0)
        sn = lambda poly: [(x, 200 + by + (y - 200 - by) * k) if y > 200 + by else (x, y) for x, y in poly]
        geo = [(L, sn(poly) if L in (self.HEAD, self.MASK) else poly) for L, poly in geo]
        seams = dict(self.base_seams)
        if p['ears'] == 'soft':     # blunt, rounded tip: drop the dark ear tip and cut the point off (outline rounds it)
            geo = [(L, poly) for L, poly in geo if L != self.EARTIP]
            ears = [poly for L, poly in geo if L == self.EAR]
            def blunt(poly, ref):
                y0 = min(y for _, y in ref); y1 = max(y for _, y in ref); cut = y0 + (y1 - y0) * .24
                return [(x, max(y, cut)) for x, y in poly]
            out, ei = [], 0
            for L, poly in geo:
                if L == self.EAR: ref = poly; out.append((L, blunt(poly, ref)))
                elif L == self.EARIN: out.append((L, blunt(poly, ref)))
                else: out.append((L, poly))
            geo = out
        if p['ears'] == 'floppy':   # ears hang in FRONT of the head: drawn last, inked against the head
            geo = [(L, poly) for L, poly in geo if L not in (self.EAR, self.EARIN, self.EARTIP)]
            for d in (1, -1):
                ear = [(200-60*d, 118), (200-100*d, 126), (200-128*d, 166), (200-134*d, 210), (200-120*d, 242), (200-96*d, 240), (200-86*d, 204), (200-72*d, 152)]
                geo.append((self.EAR, [(x, y + by) for x, y in ear]))
            seams[self.HEAD] = tuple(L for L in seams[self.HEAD] if L != self.EAR)
            seams[self.EAR] = (self.HEAD, self.MASK, self.RUFF, self.BIB, self.CROWN, self.TAIL)
        self.seams = seams
        return geo
    def tail_ctx(self, v, pose, T_):
        return super().tail_ctx(dict(v, tail=self.p['tail']), dict(pose, sway=pose.get('sway', 0) + self.p['swing']), T_)
    def color(self, L, x, y, ctx, C, eul, edr):
        if L == self.EAR and self.p['ears'] == 'floppy':   # v1.1: ears one full step darker than the head, so they read at 32 px
            if ctx['N'] < 48: return C['sock']
            return C['fur_d'] if (eul and not edr) else C['sock']
        return super().color(L, x, y, ctx, C, eul, edr)
    def face(self, put, F, N, C, eyes, v):
        k = self.p['snout']; ny = 200 + 58 * k
        # eyes, blush, gem from the locked Slyte face template; only the nose moves with the muzzle
        nose_cache = []
        def put2(x, y, c):
            put(x, y, c)
        PE.Fox.face(self, put2, F, N, C, eyes, v)
        # repaint the template nose at the new muzzle tip (template nose = 2 px ink at (200, 258))
        if k != 1.0:
            ox, oy = F((200, 258)); nx, ny_ = F((200, ny))
            if (ox, oy) != (nx, ny_):
                C2 = C['mask_fill'] if 'mask_fill' in C else None
            E = H(C['eye'])
            put(nx, ny_, E)
            if N >= 48: put(nx - 1, ny_, E)
            if self.p['ears'] in ('floppy',) and N >= 48:   # puppy: a 3-px nose
                put(nx + 1, ny_, E)

# ------------------------------------------------------------------ Wingsongs (birds)
WING = {   # tufts, eye discs, crest, beak, head scale
  'wingsong': dict(tuft=0,   disc='patch', crest=None,    beak='small', head=.93),   # the family default: reads as any bird
  'owl':      dict(tuft=1.0, disc='owl',   crest=None,    beak='small', head=1.0),   # = today's Whimber
  'songbird': dict(tuft=0,   disc='patch', crest='plume', beak='point', head=.90),
  'dove':     dict(tuft=0,   disc='none',  crest=None,    beak='tiny',  head=.76, body=.86, dovetail=True),        # Luma: small smooth head, slim, long low tail
  'pigeon':   dict(tuft=0,   disc='patch', crest=None,    beak='cere',  head=.84, body=1.08, neck=True),          # Trumbit: plump, sheen neck band, white cere
  'gull':     dict(tuft=0,   disc='patch', crest=None,    beak='gull',  head=.90, whitehead=True, darktips=True),  # Gullyn: white head, yellow beak + red dot, dark wingtips
  'crow':     dict(tuft=0,   disc='patch', crest=None,    beak='long',  head=.92),
  'duck':     dict(tuft=0,   disc='patch', crest=None,    beak='bill',  head=.95),
  'eagle':    dict(tuft=0,   disc='patch', crest=None,    beak='hook',  head=.94),
  'chicken':  dict(tuft=0,   disc='patch', crest='comb',  beak='hen',   head=.84, sidetail=True, wattle=True),  # Kippis: red comb + wattle, big beak, tail plume
}
class Wingsong(PE.Owl):
    def __init__(self, preset='wingsong'):
        super().__init__(); self.p = WING[preset]
        self.NECK, self.SIDETAIL = 11, 12
        self.seams = dict(self.seams); self.seams[self.HEAD] = self.seams[self.HEAD] + (self.NECK,)
        self.seams[self.BODY] = self.seams[self.BODY] + (self.SIDETAIL,); self.seams[self.WING] = self.seams[self.WING] + (self.SIDETAIL,)
    def geometry(self, v, pose):
        p = self.p; v = dict(v, tuft=p['tuft'] or 1.0, crest='plume' if p['crest'] == 'plume' else None)
        geo = super().geometry(v, pose); bu = pose.get('bob_u', 0); tilt = pose.get('tilt', 0)
        out = []
        for L, poly in geo:
            if L == self.TUFT and not p['tuft']: continue
            if L == self.DISC and p['disc'] == 'none': continue
            if L == self.HEAD and p['head'] != 1.0:
                poly = [(200 + (x - 200) * p['head'], 250 + bu + (y - 250 - bu) * (p['head'] * .5 + .5)) for x, y in poly]
            if L in (self.BODY, self.BELLY) and p.get('body', 1) != 1:
                poly = [(200 + (x - 200) * p['body'], y) for x, y in poly]
            if L == self.DISC and p['disc'] == 'patch':
                cx = sum(x for x, _ in poly) / len(poly); cy = sum(y for _, y in poly) / len(poly)
                poly = [(cx + (x - cx) * .70, cy + (y - cy) * .68) for x, y in poly]
            out.append((L, poly))
        r = lambda pts: [(x, y + bu) for x, y in pts]
        hi = lambda: [i for i, (L, _) in enumerate(out) if L == self.HEAD][0]
        if p['crest'] == 'comb':   # a proper hen comb: 3 round lobes standing on the crown
            out.insert(hi(), (self.PLUME, r([(170, 118), (166, 92), (174, 78), (186, 80), (192, 92), (196, 70), (208, 64), (218, 72), (218, 88),
                                             (228, 80), (240, 86), (242, 100), (236, 118)])))
        if p.get('neck'):          # pigeon: a sheen band where the head meets the body
            out.insert(hi(), (self.NECK, [(200 + 74 * math.cos(a / 20 * math.pi), 266 + bu * .5 + 20 * math.sin(a / 20 * math.pi)) for a in range(40)]))
        if p.get('dovetail'):      # dove: a long slim tail sweeping out low on the right
            out.insert(0, (self.SIDETAIL, [(236, 318), (276, 322), (316, 334), (346, 352), (340, 364), (300, 360), (252, 352)]))
        if p.get('sidetail'):      # hen: a tail plume rising behind the body on the right
            out.insert(0, (self.SIDETAIL, [(244, 300), (262, 226), (284, 176), (306, 160), (326, 176), (318, 214), (340, 222), (334, 262), (306, 306), (262, 330)]))
        return out
    def color(self, L, x, y, ctx, C, eul, edr):
        p = self.p
        if L == self.PLUME and p['crest'] == 'comb': return RED_D if (edr and not eul) else RED   # comb = a fixed marking (like the gem)
        if L == self.NECK: return C['fur_l'] if (x + 2 * y) % 4 == 0 else C['wing']               # same-hue sheen, not a 2nd colour
        if L == self.SIDETAIL: return C['fur'] if (eul and not edr) else C['wing']
        if L == self.HEAD and p.get('whitehead'): return C['cream_d'] if edr and not eul else C['cream']
        if L == self.WINGTIP and p.get('darktips'): return C['ink']
        return super().color(L, x, y, ctx, C, eul, edr)
    def face(self, put, F, N, C, eyes, v):
        p = self.p; bx, by = F((200, 198)); Bk, Ik = H(C['beak']), H(C['ink'])
        # draw the locked Whimber eye + talon + blush + gem template, but intercept its 4-px beak
        beak_px = set()
        if N >= 48: beak_px = {(bx-1, by), (bx, by), (bx+1, by), (bx, by+1)}
        else: beak_px = {(bx, by), (bx, by+1)}
        def put2(x, y, c):
            if (x, y) in beak_px and p['beak'] != 'small': return
            put(x, y, c)
        PE.Owl.face(self, put2, F, N, C, eyes, v)
        if p['beak'] == 'small': return
        big = N >= 48
        shapes = {   # (dx, dy) pixels below the beak anchor; 'k' = ink pixel
          'point': [(-1, 0), (0, 0), (1, 0), (0, 1), (0, 2)] if big else [(0, 0), (0, 1)],
          'long':  [(-1, 0), (0, 0), (1, 0), (-1, 1), (0, 1), (1, 1), (0, 2), (0, 3)] if big else [(0, 0), (0, 1), (0, 2)],
          'tiny':  [(0, 0), (0, 1)] if big else [(0, 0)],
          'bill':  [(-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (-2, 1), (-1, 1), (0, 1), (1, 1), (2, 1), (-1, 2), (0, 2), (1, 2)] if big else [(-1, 0), (0, 0), (1, 0), (0, 1)],
          'hook':  [(-1, 0), (0, 0), (1, 0), (-1, 1), (0, 1), (1, 1), (0, 2), (1, 2), (1, 3)] if big else [(0, 0), (1, 0), (1, 1)],
          'cere':  [(-1, 0), (0, 0), (1, 0), (0, 1), (0, 2)] if big else [(0, 0), (0, 1)],
          'gull':  [(-1, 0), (0, 0), (1, 0), (-1, 1), (0, 1), (1, 1), (0, 2), (0, 3)] if big else [(0, 0), (0, 1), (0, 2)],
          'hen':   [(-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (0, 2)] if big else [(-1, 0), (0, 0), (1, 0), (0, 1)],
        }[p['beak']]
        Bk = H(BEAK.get(p['beak'], C['beak'])); bset = {(bx + dx, by + dy) for dx, dy in shapes}
        for q in bset: put(*q, Bk)
        if big:   # ink under and beside a bigger beak so it reads on any fur (no new colour: the Echo's own plum ink)
            for (x, y) in bset:
                for q in ((x, y + 1), (x - 1, y), (x + 1, y)):
                    if q not in bset and q[1] > by: put(*q, Ik)
        if p['beak'] == 'cere': put(bx, by - 1, H('#FFFFFF'))                 # pigeon: the white cere on top of the beak
        if p['beak'] == 'gull': put(bx + (1 if big else 0), by + (2 if big else 1), H(RED))   # gull: the red spot
        if p.get('wattle'):       # hen: a 2-lobe red wattle under the beak
            for q in (((-1, 3), (0, 3), (-1, 4), (0, 4), (0, 5)) if big else ((0, 2), (0, 3))): put(bx + q[0], by + q[1], H(RED))
            if big: put(bx - 1, by + 5, Ik); put(bx + 1, by + 4, Ik); put(bx + 1, by + 5, Ik); put(bx, by + 6, Ik); put(bx - 2, by + 4, Ik); put(bx - 2, by + 3, Ik)
        if p['beak'] == 'hook' and big and eyes not in ('blink', 'happy'):   # eagle brow: 4 ink px over each eye, low on the inside
            for ex, d in ((156, -1), (244, 1)):
                x0, y0 = F((ex, 172))
                for dx in (-2, -1, 0, 1):
                    inner = (dx >= 0) if d < 0 else (dx < 0)
                    put(x0 + dx, y0 - 5 + (1 if inner else 0), Ik)

BEAK = {'bill': '#F7A04A', 'hook': '#F7B24A', 'long': '#FFC870', 'point': '#FFC870', 'tiny': '#FFC870',
        'cere': '#FFC870', 'gull': '#FFD84A', 'hen': '#FFB020'}   # bill/hook: warmer orange; gull: bright yellow; hen: bright orange-gold
RED, RED_D = '#F0504A', '#C83848'   # hen comb / wattle, gull spot: fixed warm-red markings (never the body colour)
# ------------------------------------------------------------------ render helpers
@contextlib.contextmanager
def species(fam, preset):
    old = PE.SPECIES[fam]; PE.SPECIES[fam] = Howling(preset) if fam == 'slyte' else Wingsong(preset)
    try: yield
    finally: PE.SPECIES[fam] = old
BASE = {'slyte': dict(SF.BASE), 'whimber': dict(palette='lilac-night', fluff=1, seed=4, crest='tufts', mark='stars', moongem=True, tuft=1.0, wing=1.0)}
def draw(fam, preset, colour, N=48, stage=4, **kw):
    """colour = a colour word ('black', 'golden', ...) or a ramp id. preset None = today's Slyte/Whimber (no swap)."""
    ramp = dict(T.COLOURS[fam]).get(colour) or {w: r for w, r, _ in T.CHIP_ROWS[fam]}.get(colour, colour); v = dict(BASE[fam], palette=ramp)
    kw.setdefault('halo', None); kw.setdefault('nspark', 0 if stage >= 4 else None)
    if preset is None: return PE.render(fam, v, N=N, stage=stage, **kw)
    with species(fam, preset): return PE.render(fam, v, N=N, stage=stage, **kw)
def ncolours(im):
    return len({px for px in im.get_flattened_data() if px[3]})
