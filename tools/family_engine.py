#!/usr/bin/env python3
"""Unified 20-Animal Master Rig & Pose Engine for Project Echo (Sprites v3).
Supports all 3 families ('slyte' = Howlings [4], 'whimber' = Wingsongs [9], 'twitchel' = Purrlings [7])
across Home (28 frames + _light + _ev), Walk/Fly, Sleep, Run/Game (px/run/), and Home Tails from ONE
shared per-animal master rig and geometry pipeline (<= 16 colours per frame, no pure #000000).
"""
import sys, os, math, random, contextlib
import numpy as np
from PIL import Image, ImageDraw

sys.path[:0] = ['/workspace/echo/style_research/src', '/workspace/echo/origin_v2/src']
import pixel_engine as PE, slyte_pixel as FX, slyte_fox as SF, tint as T
T.install()
H = PE.H

# Inject Purrling 'tan-sand' ramp into SF.PALETTES so all 3 families share one palette registry
NEW_RAMPS = {'tan-sand': dict(fur='#E8C394', fur2='#B98C5E', tailmid='#F2DCBC', tip='#FFF6E8', inner='#FFC4BC', gem='#9FF0D0',
                              glow='#FFF0D8', iris='#6FA048', ink='#3E2440', shade='#8A5A62')}
SF.PALETTES.update(NEW_RAMPS)

# Explicit Wingsong ink key 'k' (e.g. sun-finch)
for cls in [c for c in vars(PE).values() if isinstance(c, type) and hasattr(c, 'palette') and hasattr(c, 'light_tint')]:
    if not getattr(cls.palette, '_k', 0):
        _orig_pal = cls.palette
        def _pal(self, v, _o=_orig_pal):
            d = _o(self, v); P = PE.POWL.get(v.get('palette'), {}) if isinstance(PE.POWL, dict) else {}
            if isinstance(P, dict) and P.get('k') and 'f' in P: d['ink'] = P['k']
            return d
        _pal._k = 1; cls.palette = _pal

# ------------------------------------------------------------------ Howlings (4 canines + 'howling' family default)
HOWL = {
  'howling': dict(ears='soft',    ear=.82, ear_w=1.0,  snout=.90, snout_w=1.0,  head_rx=1.0,  head_ry=1.0,  body_rx=1.0,  body_ry=1.0,  ruff_k=1.0,  tail=.92, tail_w=1.0,  swing=6,   fluff=1, nose3=False, collar=False, brow=False),
  'fox':     dict(ears='pointed', ear=1.02,ear_w=1.0,  snout=1.02,snout_w=0.96, head_rx=1.0,  head_ry=1.0,  body_rx=0.98, body_ry=1.0,  ruff_k=1.0,  tail=1.08,tail_w=1.12, swing=-2,  fluff=1, nose3=False, collar=False, brow=False),
  'dog':     dict(ears='floppy',  ear=1.0, ear_w=1.0,  snout=.76, snout_w=1.14, head_rx=1.05, head_ry=1.02, body_rx=1.08, body_ry=1.02, ruff_k=0.78, tail=.72, tail_w=0.78, swing=-22, fluff=0, nose3=True,  collar=True,  brow=False),
  'wolf':    dict(ears='wide',    ear=.78, ear_w=1.22, snout=.96, snout_w=1.05, head_rx=1.04, head_ry=1.02, body_rx=1.10, body_ry=1.04, ruff_k=1.12, tail=.92, tail_w=1.14, swing=16,  fluff=2, nose3=False, collar=False, brow=True),
  'coyote':  dict(ears='pointed', ear=1.12,ear_w=0.90, snout=1.04,snout_w=0.88, head_rx=0.92, head_ry=0.96, body_rx=0.86, body_ry=0.96, ruff_k=0.72, tail=.86, tail_w=0.88, swing=18,  fluff=0, nose3=False, collar=False, brow=False),
}
COLLAR = 17

class Howling(PE.Fox):
    def __init__(self, preset='howling'):
        super().__init__()
        self.preset = preset or 'fox'
        self.p = HOWL[self.preset]
        self.base_seams = dict(self.seams)
        self._hoff = (0, 0)
        self._bobu = 0

    def geometry(self, v, pose):
        p = self.p
        # Preserve fluff 0..3 variation when v explicitly sets fluff (unless fluff_auto is True and no fluff override)
        fl = v.get('fluff', p['fluff']) if not v.get('fluff_auto', False) else p['fluff']
        v = dict(v, ear=p['ear'] * v.get('ear_k', 1) * v.get('ear', 1.0), tail=p['tail'], fluff=fl)
        self._v = v
        by = pose.get('bob_u', 0); self._bobu = by
        geo = [(L, poly) for L, poly, tag in FX.geometry(v, bob=by, sway=pose.get('sway', 0) + 9 + p['swing'])]

        # Scale body, haunches, legs, and ruff according to species anatomy
        bx_k, by_k = p.get('body_rx', 1.0), p.get('body_ry', 1.0)
        hx_k, hy_k = p.get('head_rx', 1.0), p.get('head_ry', 1.0)
        rk = p.get('ruff_k', 1.0) * (1.0 + 0.08 * fl)
        k = p['snout']; sw_k = p.get('snout_w', 1.0)
        ew_k = p.get('ear_w', 1.0)

        out_geo = []
        for L, poly in geo:
            if L in (self.BODY, self.HAUNCH, self.BIB) and (bx_k != 1.0 or by_k != 1.0):
                poly = [(200 + (x - 200) * bx_k, 310 + (y - 310) * by_k) for x, y in poly]
            elif L in (self.LEG, self.SOCK) and bx_k != 1.0:
                poly = [(200 + (x - 200) * (0.5 + 0.5 * bx_k), y) for x, y in poly]
            elif L == self.RUFF:
                poly = [(200 + (x - 200) * rk, 210 + by + (y - 210 - by) * rk) for x, y in poly]
            elif L in (self.HEAD, self.MASK):
                poly = [(200 + (x - 200) * (sw_k if y > 200 + by else hx_k),
                         (200 + by + (y - 200 - by) * k) if y > 200 + by else (190 + by + (y - 190 - by) * hy_k))
                        for x, y in poly]
            elif L in (self.EAR, self.EARIN, self.EARTIP) and ew_k != 1.0:
                cx = sum(x for x, _ in poly) / len(poly)
                poly = [(cx + (x - cx) * ew_k, y) for x, y in poly]
            out_geo.append((L, poly))
        geo = out_geo

        seams = dict(self.base_seams)
        if p['ears'] in ('soft', 'wide'):
            if p['ears'] == 'soft':
                geo = [(L, poly) for L, poly in geo if L != self.EARTIP]
            out = []
            ref = None
            for L, poly in geo:
                if L == self.EAR:
                    ref = poly
                    y0 = min(y for _, y in ref); y1 = max(y for _, y in ref)
                    cut = y0 + (y1 - y0) * (.22 if p['ears'] == 'soft' else .12)
                    out.append((L, [(x, max(y, cut)) for x, y in poly]))
                elif L == self.EARIN and ref:
                    y0 = min(y for _, y in ref); y1 = max(y for _, y in ref)
                    cut = y0 + (y1 - y0) * (.22 if p['ears'] == 'soft' else .12)
                    out.append((L, [(x, max(y, cut)) for x, y in poly]))
                else:
                    out.append((L, poly))
            geo = out

        if p['ears'] == 'floppy':
            # Dog floppy puppy ears hanging down alongside the cheeks, with fluff lift at higher fl
            geo = [(L, poly) for L, poly in geo if L not in (self.EAR, self.EARIN, self.EARTIP)]
            flare = fl * 3
            for d in (1, -1):
                ear = [(200 - 58 * d, 118), (200 - (102 + flare) * d, 124), (200 - (132 + flare) * d, 164),
                       (200 - (138 + flare) * d, 212), (200 - (122 + flare) * d, 246), (200 - 94 * d, 242),
                       (200 - 84 * d, 202), (200 - 70 * d, 150)]
                geo.append((self.EAR, [(x, y + by) for x, y in ear]))
            seams[self.HEAD] = tuple(L for L in seams[self.HEAD] if L != self.EAR)
            seams[self.EAR] = (self.HEAD, self.MASK, self.RUFF, self.BIB, self.CROWN, self.TAIL)

        if p.get('collar'):
            # Dog collar band across the top of the chest bib
            col_poly = [(154, 238 + by), (200, 248 + by), (246, 238 + by), (250, 254 + by), (200, 266 + by), (150, 254 + by)]
            # Insert right after BIB so HEAD is in front of COLLAR, and COLLAR is in front of BIB/BODY
            bib_idx = next((i for i, (L, _) in enumerate(geo) if L == self.BIB), len(geo) - 1)
            geo.insert(bib_idx + 1, (COLLAR, col_poly))
            seams[self.HEAD] = tuple(seams.get(self.HEAD, ())) + (COLLAR,)
            seams[COLLAR] = (self.BIB, self.BODY)

        # Ensure crown tufts appear for fluff >= 1 so f0, f1, f2, f3 are always distinct on every canine
        has_crown = any(L == self.CROWN for L, _ in geo)
        if fl >= 1 and not has_crown:
            for x, lean, h in [(194, -4, 18 + fl * 4), (208, 5, 16 + fl * 4)]:
                geo.append((self.CROWN, [(x - 9, 122 + by), (x + lean, 112 - h + by), (x + 9, 122 + by)]))

        self.seams = seams
        return geo

    def tail_ctx(self, v, pose, T_):
        return super().tail_ctx(dict(v, tail=self.p['tail']), dict(pose, sway=pose.get('sway', 0) + self.p['swing']), T_)

    def color(self, L, x, y, ctx, C, eul, edr):
        if L == COLLAR:
            return C['gem'] if abs(x - ctx['N'] // 2) <= 1 and edr else C['fur_d']
        if L == self.EAR and self.p['ears'] == 'floppy':
            if ctx['N'] < 48: return C['sock']
            return C['fur_d'] if (eul and not edr) else C['sock']
        return super().color(L, x, y, ctx, C, eul, edr)

    def face(self, put, F, N, C, eyes, v):
        k = self.p['snout']; ny = 200 + 58 * k
        ox, oy = F((200, 258)); nx, ny_ = F((200, ny)); dy = oy - ny_
        def put2(x, y, c):
            if k != 1.0 and abs(x - ox) <= 3 and oy - 1 <= y <= oy + 4:
                y -= dy
            put(x, y, c)
        PE.Fox.face(self, put2, F, N, C, eyes, v)
        E = H(C['eye']); D = H(C['fur_d'])
        put(nx, ny_, E)
        if N >= 48:
            put(nx - 1, ny_, E)
            if self.p.get('nose3'):
                put(nx + 1, ny_, E); put(nx, ny_ + 1, E)
            if self.p.get('brow') and not any(b in eyes for b in ('blink', 'happy')):
                # Wolf lupine brow mask over eyes
                for ex, d in ((160, -1), (240, 1)):
                    x0, y0 = F((ex, 180))
                    for dx in (-2, -1, 0, 1):
                        put(x0 + dx, y0 - 4 + (1 if (dx * d < 0) else 0), D)


# ------------------------------------------------------------------ Purrlings (7 felines)
MANE = 16
FEL = {
 'cat':          dict(ears='cat',   ear=.62, ear_w=1.0,  snout=.56, head=1.07, head_rx=1.02, body_rx=0.96, body_ry=0.98, ruff_k=0.84, tail=.98, swing=-14, thin=.54, marks=None,      fluff=1),
 'lion':         dict(ears='round', ear=.58, ear_w=1.15, snout=.64, head=1.05, head_rx=1.04, body_rx=0.94, body_ry=1.0,  ruff_k=0.84, tail=.98, swing=-8,  thin=.62, marks='mane',    fluff=1, tuft=True),
 'tiger':        dict(ears='round', ear=.64, ear_w=1.18, snout=.64, head=1.05, head_rx=1.04, body_rx=1.10, body_ry=1.03, ruff_k=1.05, tail=.96, swing=-12, thin=.48, marks='stripes', fluff=1),
 'leopard':      dict(ears='round', ear=.64, ear_w=1.10, snout=.60, head=1.04, head_rx=1.0,  body_rx=0.96, body_ry=0.98, ruff_k=0.80, tail=1.06,swing=-10, thin=.54, marks='spots',   fluff=1),
 'cheetah':      dict(ears='round', ear=.54, ear_w=0.95, snout=.56, head=0.94, head_rx=0.92, body_rx=0.80, body_ry=0.96, ruff_k=0.64, tail=1.06,swing=-4,  thin=.64, marks='cheetah', fluff=0),
 'snowleopard':  dict(ears='round', ear=.56, ear_w=1.12, snout=.58, head=1.04, head_rx=1.04, body_rx=1.12, body_ry=1.04, ruff_k=1.02, tail=1.06,swing=-16, thin=.24, marks='snow',    fluff=2),
 'lynx':         dict(ears='lynx',  ear=.84, ear_w=0.96, snout=.60, head=1.03, head_rx=1.02, body_rx=1.00, body_ry=1.00, ruff_k=1.06, tail=.32, swing=-22, thin=.18, marks='lynx',    fluff=2),
}

def _h(a, b):
    n = (a * 73856093) ^ (b * 19349663); n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF; return (n & 0xFFFF) / 65536

class Purrling(Howling):
    def __init__(self, preset='cat'):
        PE.Fox.__init__(self)
        self.preset = preset or 'cat'
        q = FEL[self.preset]
        self.p = dict(ears='pointed' if q['ears'] in ('cat', 'lynx') else 'soft',
                      ear=q['ear'], ear_w=q.get('ear_w', 1.0), snout=q['snout'], snout_w=1.0,
                      head_rx=q.get('head_rx', 1.0), head_ry=1.0,
                      body_rx=q.get('body_rx', 1.0), body_ry=q.get('body_ry', 1.0),
                      ruff_k=q.get('ruff_k', 0.84), tail=q['tail'], tail_w=1.0,
                      swing=q['swing'], fluff=q['fluff'], nose3=False, collar=False, brow=False)
        self.q = q
        self.base_seams = dict(self.seams)
        self._hoff = (0, 0); self._bob = 0; self._bobu = 0; self._apex = []

    def geometry(self, v, pose):
        q = self.q
        fl = v.get('fluff', q['fluff']) if not v.get('fluff_auto', False) else q['fluff']
        v = dict(v, fluff=fl, fluff_auto=False)
        geo = super().geometry(v, pose)
        by = pose.get('bob_u', 0); self._bobu = by
        hs = q['head']; hc = (200, 196 + by)
        sc = lambda poly, k=hs, c=hc: [(c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k) for x, y in poly]
        geo = [(L, sc(poly) if L in (self.HEAD, self.MASK, self.CROWN, self.RUFF, self.EAR, self.EARIN, self.EARTIP) else poly) for L, poly in geo]
        if q['ears'] == 'round':
            geo = [(L, [(x, y + 12) for x, y in poly] if L in (self.EAR, self.EARIN) else poly) for L, poly in geo]
        if q['ears'] == 'cat':
            geo = [(L, poly) for L, poly in geo if L != self.EARTIP]
        self._apex = [min(poly, key=lambda p: p[1]) for L, poly in geo if L == self.EAR]

        if q['thin']:
            ts = q['tail']; cl = [(232, 348), (330, 366), (372, 262), (318, 136)]
            cl = [cl[0]] + [(cl[0][0] + (x - cl[0][0]) * ts, cl[0][1] + (y - cl[0][1]) * ts) for x, y in cl[1:]]
            a = math.radians(pose.get('sway', 0) + 9 + self.p['swing']); bx, by0 = cl[0]
            cl = [cl[0]] + [(bx + (x - bx) * math.cos(a) - (y - by0) * math.sin(a), by0 + (x - bx) * math.sin(a) + (y - by0) * math.cos(a)) for x, y in cl[1:]]
            pts = [FX.bez(cl, k / 80) for k in range(81)]
            def pinch(poly):
                out = []
                for x, y in poly:
                    i = min(range(81), key=lambda j: (pts[j][0] - x) ** 2 + (pts[j][1] - y) ** 2); cx, cy = pts[i]
                    k = 1 - q['thin'] * (1 - .25 * i / 80)
                    out.append((cx + (x - cx) * k, cy + (y - cy) * k))
                return out
            geo = [(L, pinch(poly) if L == self.TAIL else poly) for L, poly in geo]

        if q['marks'] == 'mane':
            n = 22; mane = []
            mk = 1.0 + 0.04 * fl
            for i in range(n * 2):
                t = math.pi * 2 * i / (n * 2); r = mk * (1 + (.08 if i % 2 else -.02))
                mane.append((200 + 128 * hs * r * math.cos(t), 192 + by + 120 * hs * r * math.sin(t)))
            i0 = next(i for i, (L, _) in enumerate(geo) if L in (self.EAR, self.HEAD))
            geo.insert(i0, (MANE, mane))
            s = dict(self.seams)
            s[self.HEAD] = tuple(s.get(self.HEAD, ())) + (MANE,)
            s[self.BODY] = tuple(s.get(self.BODY, ())) + (MANE,)
            s[self.BIB] = tuple(s.get(self.BIB, ())) + (MANE,)
            s[self.EAR] = tuple(s.get(self.EAR, ())) + (MANE,)
            self.seams = s

        return geo

    def _u(self, x, y, N):
        s = self.sbase * N / 48
        return (x + .5 - N / 2) / s + self.cx0 - self._hoff[0], (y + .5 - N / 2) / s + self.cy0 - self._bobu - self._hoff[1]

    def mark(self, L, ux, uy, ctx):
        m = self.q['marks']
        if not m or m == 'mane': return False
        head = L in (self.HEAD, self.CROWN)
        if m == 'stripes':
            if head:
                if 100 <= uy <= 142 and any(abs(ux - c) <= 6 for c in (176, 200, 224)) and not (122 <= uy and abs(ux - 200) < 8): return True
                if any(lo <= uy <= lo + 10 for lo in (190, 212)) and (ux < 152 or ux > 248): return True
                return False
            if L in (self.BODY, self.HAUNCH, self.LEG): return (ux * .9 + uy * .5) % 30 < 11
            if L == self.TAIL: return ctx['tail_t'](*ctx['xy']) % .18 < .07
            return False
        if m in ('spots', 'snow', 'cheetah', 'lynx'):
            sp, r = {'spots': (21, 7.8), 'snow': (24, 8.8), 'cheetah': (15, 5.4), 'lynx': (24, 5.6)}[m]
            if head and not (uy < 150 or ux < 140 or ux > 260): return False
            if L not in (self.HEAD, self.CROWN, self.BODY, self.HAUNCH, self.LEG, self.TAIL): return False
            if L == self.TAIL and m == 'snow':
                return ctx['tail_t'](*ctx['xy']) % .20 < .08
            gx, gy = math.floor(ux / sp), math.floor(uy / sp)
            for a in (gx - 1, gx, gx + 1):
                for b in (gy - 1, gy, gy + 1):
                    if (a + b) % 2 and m in ('snow', 'lynx'): continue
                    cx = (a + .2 + .6 * _h(a, b)) * sp; cy = (b + .2 + .6 * _h(b, a + 7)) * sp
                    if (ux - cx) ** 2 + (uy - cy) ** 2 <= r * r: return True
            return False
        return False

    def color(self, L, x, y, ctx, C, eul, edr):
        q = self.q
        if L == MANE:
            return C['fur_l'] if (eul and not edr and (x + y) % 3 == 0) else C['fur_d']
        if L == self.SOCK:
            return C['fur_d'] if edr and not eul else C['fur']
        if L == self.TAIL:
            t = ctx['tail_t'](x, y)
            if q.get('tuft') and t > .78: return C['fur_d']
            c = C['fur_d'] if (edr and not eul) else (C['fur_l'] if (eul and not edr) else C['fur'])
            if q['marks'] and self.mark(L, *self._u(x, y, ctx['N']), dict(ctx, xy=(x, y))): c = C['fur_d']
            return c
        c = super().color(L, x, y, ctx, C, eul, edr)
        if c in (C['fur'], C['fur_l']) and L in (self.HEAD, self.CROWN, self.BODY, self.HAUNCH, self.LEG) and q['marks'] and ctx['N'] >= 32:
            if self.mark(L, *self._u(x, y, ctx['N']), dict(ctx, xy=(x, y))): return C['fur_d']
        return c

    def face(self, put, F, N, C, eyes, v):
        k = self.q['snout']; ox, oy = F((200, 258)); nx, ny = F((200, 200 + 58 * k)); dy = oy - ny
        def put2(x, y, c):
            if abs(x - ox) <= 3 and oy - 1 <= y <= oy + 4: y -= dy
            put(x, y, c)
        PE.Fox.face(self, put2, F, N, C, eyes, v)
        pink = H(C['earin']); E = H(C['eye']); D = H(C['fur_d']); Ik = H(C['ink'])
        put(nx, ny, pink)
        if N >= 48:
            put(nx - 1, ny, pink)
            if not any(m in eyes for m in ('mopen', 'mchomp', 'mo', 'mfrown', 'mflat')):
                put(nx - 2, ny + 1, E); put(nx - 1, ny + 2, E); put(nx, ny + 2, E); put(nx + 1, ny + 1, E)
                for d in (-1, 1):
                    put(nx + (-5 if d < 0 else 4), ny + 1, D); put(nx + (-6 if d < 0 else 5), ny + 3, D)
        if self.q['marks'] == 'cheetah' and N >= 48:
            for ex, d in ((160, -1), (240, 1)):
                x0, y0 = F((ex, 180))
                for j in range(4): put(x0 - 1 * d + (0 if j < 2 else -d), y0 + 3 + j, Ik if j < 2 else D)
        if self.q['ears'] == 'lynx':
            for ax, ay in self._apex:
                x0, y0 = F((ax, ay - self._bobu))
                put(x0, y0 - 1, Ik); put(x0, y0 - 2, Ik); put(x0, y0 - 3, Ik); put(x0 + (1 if ax > 200 else -1), y0 - 4, Ik)


# ------------------------------------------------------------------ Wingsongs (9 birds + aliases)
WING = {
  # 1. owl: round nocturnal disc face, prominent ear tufts, big owl eyes with full facial discs
  'owl':      dict(tuft=1.05, disc='owl',   crest=None,    beak='small', head_rx=1.04, head_ry=1.02, head_dy=0,   body_rx=1.04, body_ry=1.02, body_rot=0,   wing_k=1.0,  tail='owl'),
  # 2. chicken: plump hen chest, upright fanned tail feathers, pronounced red comb & wattle, warm round eyes with NO owl facial discs
  'chicken':  dict(tuft=0,    disc='none',  crest='comb',  beak='hen',   head_rx=0.82, head_ry=0.84, head_dy=-6,  body_rx=1.14, body_ry=1.04, body_rot=0,   wing_k=0.88, tail='hen',    sidetail=True, wattle=True),
  # 3. duck: sleek horizontal waterfowl body/posture, flat broad bill, upturned duck tail, webbed feet, no owl discs
  'duck':     dict(tuft=0,    disc='none',  crest=None,    beak='bill',  head_rx=0.88, head_ry=0.82, head_dy=-10, body_rx=1.24, body_ry=0.80, body_rot=0,   wing_k=0.92, tail='duck',   ducktail=True, webbed=True),
  # 4. eagle: broad powerful shoulders, fierce angled brow ridge, hooked raptor beak, fanned raptor tail, distinct chest/head markings
  'eagle':    dict(tuft=0,    disc='none',  crest='crown', beak='hook',  head_rx=0.92, head_ry=0.86, head_dy=-12, body_rx=1.12, body_ry=1.12, body_rot=0,   wing_k=1.16, tail='fan',    whitehead=True, brow=True),
  # 5. dove: slender graceful neck & slim body, gentle small beak, smooth round head (no discs), long fanned dove tail
  'dove':     dict(tuft=0,    disc='none',  crest=None,    beak='tiny',  head_rx=0.74, head_ry=0.76, head_dy=-10, body_rx=0.80, body_ry=0.96, body_rot=0,   wing_k=0.88, tail='dove',   dovetail=True),
  # 6. pigeon: plump chest, iridescent neck collar band, compact beak with white cere, distinct tail band
  'pigeon':   dict(tuft=0,    disc='none',  crest=None,    beak='cere',  head_rx=0.80, head_ry=0.82, head_dy=-6,  body_rx=1.12, body_ry=1.04, body_rot=0,   wing_k=0.96, tail='band',   neck=True, wingbars=True),
  # 7. crow: sleek angled posture, long sturdy corvid beak, wedge tail, sleek head with no owl discs
  'crow':     dict(tuft=0,    disc='none',  crest='sleek', beak='long',  head_rx=0.84, head_ry=0.78, head_dy=-10, body_rx=0.86, body_ry=1.06, body_rot=-8,  wing_k=1.04, tail='wedge',  corvid=True),
  # 8. gull: coastal posture, white head cap/hood contrast, long gull bill with red tip spot, folded dark-tipped wings
  'gull':     dict(tuft=0,    disc='none',  crest=None,    beak='gull',  head_rx=0.86, head_ry=0.82, head_dy=-10, body_rx=0.96, body_ry=0.96, body_rot=0,   wing_k=1.08, tail='short',  whitehead=True, darktips=True, gullwing=True),
  # 9. bird (and aliases wingsong / songbird): round songbird/robin silhouette, perky upright tail, small chirp beak, crest plume, warm chest patch
  'wingsong': dict(tuft=0,    disc='patch', crest='plume', beak='point', head_rx=0.88, head_ry=0.88, head_dy=-4,  body_rx=0.92, body_ry=0.92, body_rot=0,   wing_k=0.90, tail='perky',  perkytail=True, robinbib=True),
}
WING['bird'] = dict(WING['wingsong'])
WING['songbird'] = dict(WING['wingsong'])

BEAK = {'bill': '#F7A04A', 'hook': '#F7B24A', 'long': '#4A3A68', 'point': '#FFC870', 'tiny': '#FFC870',
        'cere': '#FFC870', 'gull': '#FFD84A', 'hen': '#FFB020'}
RED, RED_D = '#F0504A', '#C83848'

class Wingsong(PE.Owl):
    def __init__(self, preset='wingsong'):
        super().__init__()
        self.preset = preset or 'owl'
        self.p = WING[self.preset]
        self.NECK, self.SIDETAIL = 11, 12
        self.seams = dict(self.seams)
        self.seams[self.HEAD] = self.seams[self.HEAD] + (self.NECK,)
        self.seams[self.BODY] = self.seams[self.BODY] + (self.SIDETAIL,)
        self.seams[self.WING] = self.seams[self.WING] + (self.SIDETAIL,)

    def geometry(self, v, pose):
        p = self.p
        fl = v.get('fluff', 1)
        v = dict(v, tuft=p['tuft'] or 1.0, wing=p.get('wing_k', 1.0), crest='plume' if p['crest'] == 'plume' else None)
        geo = super().geometry(v, pose)
        bu = pose.get('bob_u', 0); tilt = pose.get('tilt', 0); flap = pose.get('flap', 0)
        hrx, hry, hdy = p.get('head_rx', 1.0), p.get('head_ry', 1.0), p.get('head_dy', 0)
        brx, bry = p.get('body_rx', 1.0), p.get('body_ry', 1.0)

        out = []
        for L, poly in geo:
            if L == self.TUFT and not p['tuft']: continue
            if L == self.DISC and p['disc'] == 'none': continue
            if L == self.HEAD:
                poly = [(200 + (x - 200) * hrx, 170 + bu + hdy + (y - 170 - bu) * hry) for x, y in poly]
            elif L == self.BODY:
                poly = [(200 + (x - 200) * brx, 290 + (y - 290) * bry) for x, y in poly]
            elif L == self.BELLY:
                k_b = 1.15 if p.get('robinbib') else 0.95
                poly = [(200 + (x - 200) * brx * k_b, 298 + (y - 298) * bry * k_b) for x, y in poly]
            elif L == self.DISC and p['disc'] == 'patch':
                cx = sum(x for x, _ in poly) / len(poly); cy = sum(y for _, y in poly) / len(poly)
                poly = [(cx + (x - cx) * .60, cy + hdy + (y - cy) * .58) for x, y in poly]
            elif L == self.PLUME and hdy:
                poly = [(x, y + hdy) for x, y in poly]
            elif L == self.TAILF:
                if p.get('tail') == 'fan':
                    poly = [(150, 326), (130, 378), (164, 376), (200, 384), (236, 376), (270, 378), (250, 326)]
                elif p.get('tail') == 'wedge':
                    poly = [(172, 326), (156, 374), (200, 388), (244, 374), (228, 326)]
                elif p.get('tail') == 'band':
                    poly = [(164, 326), (148, 374), (200, 378), (252, 374), (236, 326)]
                elif p.get('tail') == 'duck':
                    poly = [(182, 326), (174, 354), (200, 358), (226, 354), (218, 326)]
            out.append((L, poly))

        r = lambda pts: [(x, y + bu + hdy) for x, y in pts]
        hi = lambda: [i for i, (L, _) in enumerate(out) if L == self.HEAD][0]

        if p['crest'] == 'comb':
            # Pronounced 3-lobe red hen comb on crown
            out.insert(hi(), (self.PLUME, r([(164, 120), (156, 86), (168, 66), (184, 72), (190, 88),
                                             (196, 58), (210, 50), (222, 62), (220, 84),
                                             (234, 70), (248, 78), (250, 98), (238, 120)])))
        elif p['crest'] == 'crown':
            # Fierce raptor crown feathers on eagle
            out.insert(hi(), (self.PLUME, r([(168, 108), (156, 84), (178, 92), (196, 74), (208, 90), (228, 78), (242, 92), (232, 108)])))
        elif p['crest'] == 'sleek':
            # Sleek corvid head/nape feather sweep on crow
            out.insert(hi(), (self.PLUME, r([(160, 114), (142, 96), (168, 94), (186, 84), (214, 96), (228, 114)])))

        if p.get('neck'):
            # Pigeon iridescent neck collar band
            out.insert(hi(), (self.NECK, [(200 + 82 * math.cos(a / 20 * math.pi), 252 + bu * .5 + 24 * math.sin(a / 20 * math.pi)) for a in range(40)]))

        if p.get('dovetail'):
            # Long graceful fanned dove tail sweeping out
            out.insert(0, (self.SIDETAIL, [(228, 310), (282, 314), (336, 328), (366, 350), (354, 370), (304, 366), (244, 352)]))
        elif p.get('sidetail'):
            # Upright arched hen sickle tail feathers
            out.insert(0, (self.SIDETAIL, [(236, 296), (258, 210), (288, 152), (318, 138), (344, 158),
                                           (330, 202), (356, 210), (348, 256), (314, 304), (260, 330)]))
        elif p.get('ducktail'):
            # Upturned curled drake tail on the right + sleek waterfowl flank extension
            out.insert(0, (self.SIDETAIL, [(244, 286), (296, 268), (344, 236), (358, 254), (338, 294), (296, 322), (244, 332)]))
        elif p.get('perkytail'):
            # Perky upright songbird tail sticking up at a cheerful angle
            out.insert(0, (self.SIDETAIL, [(232, 298), (278, 232), (322, 188), (342, 202), (316, 256), (274, 306), (236, 322)]))
        elif p.get('corvid'):
            # Sleek angled corvid wedge tail
            out.insert(0, (self.SIDETAIL, [(228, 308), (284, 318), (342, 344), (334, 368), (280, 358), (236, 342)]))
        return out

    def color(self, L, x, y, ctx, C, eul, edr):
        p = self.p
        if L == self.PLUME and p['crest'] == 'comb':
            return RED_D if (edr and not eul) else RED
        if L == self.PLUME and p['crest'] == 'crown':
            return C['cream_d'] if edr else C['cream']
        if L == self.NECK:
            return C['gem'] if (x + y) % 3 == 0 else (C['fur_l'] if (x + 2 * y) % 2 == 0 else C['wing'])
        if L == self.SIDETAIL:
            if p.get('dovetail'): return C['cream_d'] if edr else C['cream']
            return C['fur_d'] if edr else (C['fur_l'] if eul else C['wing'])
        if L == self.HEAD and p.get('whitehead'):
            return C['cream_d'] if edr and not eul else C['cream']
        if L == self.WING and p.get('gullwing'):
            return C['fur_d'] if edr else C['wing']
        if L == self.WING and p.get('wingbars') and (y % 5 in (0, 1)):
            return C['ink']
        if L == self.WINGTIP and (p.get('darktips') or p.get('corvid')):
            return C['ink']
        if L == self.BELLY and p.get('robinbib'):
            # Warm chest patch on songbird/robin
            return C['fur_l'] if y < ctx['N'] * 0.68 else C['cream']
        return super().color(L, x, y, ctx, C, eul, edr)

    def face(self, put, F, N, C, eyes, v):
        p = self.p
        hdy = p.get('head_dy', 0)
        F_h = lambda pt: F((pt[0], pt[1] + hdy))
        bx, by = F_h((200, 198))
        Bk, Ik = H(C['beak']), H(C['ink'])

        beak_px = {(bx - 1, by), (bx, by), (bx + 1, by), (bx, by + 1)} if N >= 48 else {(bx, by), (bx, by + 1)}
        # Intercept base owl face pixels so non-owl birds get their shifted head position & custom feet/beak
        def put2(x, y, c):
            if (x, y) in beak_px and p['beak'] != 'small':
                return
            put(x, y, c)

        # Call Owl.face with head-shifted F_h for eyes/blush/gem, while keeping feet on the ground
        orig_F = F
        def F_mixed(pt):
            if pt[1] > 300: return orig_F(pt)
            return F_h(pt)
        PE.Owl.face(self, put2, F_mixed, N, C, eyes, v)

        # Webbed duck feet (broad orange paddles)
        if p.get('webbed') and N >= 48:
            Wb = H('#F7A04A')
            for fx in (176, 224):
                x0, y0 = orig_F((fx, 366)); y0 -= int(round(getattr(self, '_bob', 0)))
                for dx in range(-3, 4):
                    put(x0 + dx, y0, Wb); put(x0 + dx, y0 + 1, Ik)
                for dx in (-2, -1, 0, 1, 2):
                    put(x0 + dx, y0 - 1, Wb)

        if p['beak'] == 'small':
            return
        big = N >= 48
        shapes = {
          'point': [(-1, 0), (0, 0), (1, 0), (0, 1), (0, 2)] if big else [(0, 0), (0, 1)],
          'long':  [(-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (-1, 2), (0, 2), (1, 2), (0, 3), (0, 4)] if big else [(-1, 0), (0, 0), (1, 0), (0, 1), (0, 2)],
          'tiny':  [(-1, 0), (0, 0), (0, 1)] if big else [(0, 0)],
          'bill':  [(-3, 0), (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (3, 0),
                    (-3, 1), (-2, 1), (-1, 1), (0, 1), (1, 1), (2, 1), (3, 1),
                    (-2, 2), (-1, 2), (0, 2), (1, 2), (2, 2)] if big else [(-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (-1, 1), (0, 1), (1, 1)],
          'hook':  [(-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (0, 2), (1, 2), (1, 3), (0, 3), (1, 4)] if big else [(-1, 0), (0, 0), (1, 0), (1, 1), (1, 2)],
          'cere':  [(-1, 0), (0, 0), (1, 0), (-1, 1), (0, 1), (1, 1), (0, 2)] if big else [(0, 0), (0, 1)],
          'gull':  [(-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (-1, 2), (0, 2), (1, 2), (0, 3)] if big else [(-1, 0), (0, 0), (1, 0), (0, 1), (0, 2)],
          'hen':   [(-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (0, 2)] if big else [(-1, 0), (0, 0), (1, 0), (0, 1)],
        }[p['beak']]
        Bk = H(BEAK.get(p['beak'], C['beak']))
        bset = {(bx + dx, by + dy) for dx, dy in shapes}
        for q in bset: put(*q, Bk)
        if big:
            for (x, y) in bset:
                for q in ((x, y + 1), (x - 1, y), (x + 1, y)):
                    if q not in bset and q[1] > by: put(*q, Ik)
        if p['beak'] == 'cere':
            put(bx - 1, by - 1, H('#FFFFFF')); put(bx, by - 1, H('#FFFFFF')); put(bx + 1, by - 1, H('#FFFFFF'))
        if p['beak'] == 'gull':
            put(bx + (1 if big else 0), by + (2 if big else 1), H(RED))
            if big: put(bx + 1, by + 1, H(RED))
        if p.get('wattle'):
            for q in (((-1, 3), (0, 3), (1, 3), (-1, 4), (0, 4), (1, 4), (-1, 5), (0, 5)) if big else ((0, 2), (0, 3))):
                put(bx + q[0], by + q[1], H(RED))
            if big:
                for q in ((-2, 3), (-2, 4), (-2, 5), (-1, 6), (0, 6), (1, 5), (2, 4), (2, 3)):
                    put(bx + q[0], by + q[1], Ik)
        if p.get('brow') and big and not any(b in eyes for b in ('blink', 'happy')):
            for ex, d in ((156, -1), (244, 1)):
                x0, y0 = F_h((ex, 172))
                for dx in (-3, -2, -1, 0, 1, 2):
                    inner = (dx >= 0) if d < 0 else (dx <= 0)
                    put(x0 + dx, y0 - 5 + (1 if inner else 0), Ik)
                    if inner: put(x0 + dx, y0 - 4, H(C['cream']))


# ------------------------------------------------------------------ Unified context manager & helpers
@contextlib.contextmanager
def species(fam, preset):
    if fam == 'twitchel':
        old = PE.SPECIES['slyte']
        PE.SPECIES['slyte'] = Purrling(preset or 'cat')
        try: yield PE.SPECIES['slyte']
        finally: PE.SPECIES['slyte'] = old
    elif fam == 'slyte':
        old = PE.SPECIES['slyte']
        PE.SPECIES['slyte'] = Howling(preset or 'fox')
        try: yield PE.SPECIES['slyte']
        finally: PE.SPECIES['slyte'] = old
    else:
        old = PE.SPECIES['whimber']
        PE.SPECIES['whimber'] = Wingsong(preset or 'owl')
        try: yield PE.SPECIES['whimber']
        finally: PE.SPECIES['whimber'] = old

BASE = {
    'slyte': dict(SF.BASE),
    'whimber': dict(palette='lilac-night', fluff=1, seed=4, crest='tufts', mark='stars', moongem=True, tuft=1.0, wing=1.0),
    'twitchel': dict(SF.BASE),
}

def draw(fam, preset, colour, N=48, stage=4, **kw):
    sp_key = 'slyte' if fam == 'twitchel' else fam
    ramp = dict(T.COLOURS.get(fam, T.COLOURS['slyte'])).get(colour) or {w: r for w, r, _ in T.CHIP_ROWS.get(fam, T.CHIP_ROWS['slyte'])}.get(colour, colour)
    v = dict(BASE[fam], palette=ramp)
    kw.setdefault('halo', None); kw.setdefault('nspark', 0 if stage >= 4 else None)
    with species(fam, preset): return PE.render(sp_key, v, N=N, stage=stage, **kw)

def ncolours(im):
    return len({px for px in im.get_flattened_data() if px[3]})

# ==================================================================
# UNIFIED SIDE-ON WALK / RUN / SLEEP / TAIL PIPELINE (All 20 Animals)
# ==================================================================
FLEG, FSOCK = 14, 15
TAU = 2 * math.pi

def _ell(cx, cy, rx, ry, n=28, rot=0):
    a0 = math.radians(rot); pts = []
    for i in range(n):
        a = TAU * i / n; x, y = rx * math.cos(a), ry * math.sin(a)
        pts.append((cx + x * math.cos(a0) - y * math.sin(a0), cy + x * math.sin(a0) + y * math.cos(a0)))
    return pts

def _rot(pts, c, a):
    a = math.radians(a); ca, sa = math.cos(a), math.sin(a)
    return [(c[0] + (x - c[0]) * ca - (y - c[1]) * sa, c[1] + (x - c[0]) * sa + (y - c[1]) * ca) for x, y in pts]

def _capsule(p0, p1, w, n=6):
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]; L = math.hypot(dx, dy) or 1; ux, uy = dx / L, dy / L; nx, ny = -uy, ux; r = w / 2; pts = []
    for k in range(n + 1):
        a = math.pi * k / n; pts.append((p1[0] + r * (nx * math.cos(a) + ux * math.sin(a)), p1[1] + r * (ny * math.cos(a) + uy * math.sin(a))))
    pts += [(p0[0] - nx * r, p0[1] - ny * r), (p0[0] + nx * r, p0[1] + ny * r)]
    return pts

def _cyc(t, A, lift, ph):
    return {k: (A * math.cos(TAU * (t - p)), lift * max(0, math.sin(TAU * (t - p)))) for k, p in ph.items()}

def P_walk(i):
    t = i / 6; return dict(legs=_cyc(t, 20, 12, dict(nh=0, nf=.25, fh=.5, ff=.75)), by=-4 if i % 3 == 1 else 0, tail=4 * math.sin(TAU * t))

def P_trot(i):
    t = i / 4; return dict(legs=_cyc(t, 30, 18, dict(nf=0, fh=0, ff=.5, nh=.5)), by=-7 if i % 2 else 0, tail=8, hy=-2 if i % 2 else 0)

def P_run(i):
    t = i / 6; return dict(legs=_cyc(t, 46, 22, dict(nh=0, fh=.08, nf=.5, ff=.58)), pitch=5 * math.sin(TAU * t), by=-12 * max(0, math.sin(TAU * t + 1.2)), tail=-6)

POSE = {
 'crouch': dict(by=12, squash=4, legs=dict(nf=(26, 16), ff=(20, 16), nh=(-10, 22), fh=(-16, 22)), hy=8, pitch=3, tail=14),
 'leap':   dict(by=-14, hy=4, pitch=-9, legs=dict(nf=(62, 16), ff=(54, 16), nh=(-62, 10), fh=(-54, 10)), tail=-14),
 'land':   dict(by=6, squash=3, legs=dict(nf=(16, 10), ff=(10, 8), nh=(-22, 8), fh=(-28, 8)), pitch=5, tail=6),
 'fall':   dict(by=-12, pitch=7, legs=dict(nf=(30, 6), ff=(22, 6), nh=(-34, 8), fh=(-26, 8)), tail=-4),
}

class SideRig:
    """Unified side-on body + master-rig head wrapper for both Howling and Purrling looks."""
    def __init__(self, base):
        self.base = base
        self._hx = 0; self._hy = 0; self._cl = []

    def __getattr__(self, k):
        return getattr(self.base, k)

    @property
    def seams(self):
        b = self.base; s = dict(b.seams)
        s[b.LEG] = (b.BODY, b.BIB, b.HAUNCH, FLEG, FSOCK, b.TAIL)
        s[b.SOCK] = (FLEG, FSOCK, b.BODY, b.HAUNCH)
        s[b.HAUNCH] = (b.TAIL, b.BODY, FLEG, FSOCK)
        s[b.BODY] = (b.TAIL, FLEG, FSOCK)
        s[b.HEAD] = tuple(s.get(b.HEAD, ())) + (b.BODY, b.HAUNCH, b.LEG)
        s[b.RUFF] = (b.TAIL, b.BODY)
        s[b.BIB] = (b.BODY, b.LEG)
        s[FLEG] = (b.TAIL,)
        if b.EAR in s:
            s[b.EAR] = tuple(set(s[b.EAR]) | {b.BODY})
        if COLLAR in s:
            s[COLLAR] = tuple(set(s[COLLAR]) | {b.BODY, b.LEG, b.BIB})
        if MANE in s:
            s[MANE] = tuple(set(s.get(MANE, ())) | {b.BODY, b.TAIL})
            s[b.BODY] = tuple(set(s[b.BODY]) | {MANE})
        return s

    def geometry(self, v, pose):
        b = self.base; P = pose; gx = 17
        by = P.get('by', 0) + 16; pitch = P.get('pitch', 0); C0 = (196 + gx, 298 + by)
        head = [(L, poly) for L, poly in b.geometry(v, dict(P, bob_u=0)) if L not in (b.TAIL, b.HAUNCH, b.BODY, b.LEG, b.SOCK)]
        p = getattr(b, 'p', HOWL['fox'])
        ts = p.get('tail', 1.0); sw = p.get('swing', 0); tw_k = p.get('tail_w', 1.0)
        bx_k = p.get('body_rx', 1.0); by_k = p.get('body_ry', 1.0)
        fl = v.get('fluff', p.get('fluff', 1))

        base_ = (134 + gx + P.get('tx', 0), 286 + by); cl = [(0, 0), (-92, 14), (-128, -70), (-84, -176)]
        tk = P.get('tk', 1.0); cl = [(x * ts * tk * (.78 - .07 * max(0, fl - 1)), y * ts * tk * .86) for x, y in cl]
        cl = _rot(cl, (0, 0), -(P.get('tail', 0) - sw * .8) + 28 + 9 * max(0, fl - 1))
        cl = [(base_[0] + x, base_[1] + y) for x, y in cl]; cl = _rot(cl, C0, pitch)
        self._cl = cl
        W = 34 * ts * tw_k * (1 + .13 * fl); bump = [0, 6, 11, 16][fl]; NN = 14 + 2 * fl

        def side(sg):
            pts = []
            for k in range(NN + 1):
                t = k / NN; x, y = FX.bez(cl, t); x2, y2 = FX.bez(cl, min(1, t + .01)); x1, y1 = FX.bez(cl, max(0, t - .01))
                L = math.hypot(x2 - x1, y2 - y1) or 1; nx, ny = -(y2 - y1) / L, (x2 - x1) / L
                w = W * math.sin(math.pi * (.12 + .88 * t)) ** .8
                if 0 < k < NN and t < .95 and fl: w += bump * (1 if k % 2 else -.3)
                pts.append((x + sg * nx * w, y + sg * ny * w))
            return pts

        tail_poly = side(1) + side(-1)[::-1]
        if hasattr(b, 'q') and b.q.get('thin'):
            th = b.q['thin']
            pts = [FX.bez(self._cl, k / 60) for k in range(61)]
            pinched = []
            for x, y in tail_poly:
                i = min(range(61), key=lambda j: (pts[j][0] - x) ** 2 + (pts[j][1] - y) ** 2); cx, cy = pts[i]
                k = 1 - th * (1 - .25 * i / 60)
                pinched.append((cx + (x - cx) * k, cy + (y - cy) * k))
            tail_poly = pinched

        G = []
        legs = P.get('legs', {}); LEN = 62; WID = 26 * (0.5 + 0.5 * bx_k)
        hips = {'nf': (254 + gx, 312 + by), 'ff': (238 + gx, 306 + by), 'nh': (146 + gx, 312 + by), 'fh': (130 + gx, 306 + by)}
        def leg(k, lab, slab):
            a, lift = legs.get(k, (0, 0)); hx, hy = _rot([hips[k]], C0, pitch)[0]
            L = LEN - lift
            a_ = math.radians(a); foot = (hx + L * math.sin(a_), hy + L * math.cos(a_))
            s0 = (hx + (foot[0] - hx) * .62, hy + (foot[1] - hy) * .62)
            G.append((lab, _capsule((hx, hy - 10), foot, WID + (8 if k[1] == 'h' else 0))))
            G.append((slab, _capsule(s0, foot, WID + 1)))

        leg('ff', FLEG, FSOCK); leg('fh', FLEG, FSOCK)
        G.append((b.TAIL, tail_poly))
        G.append((b.BODY, _rot(_ell(198 + gx, 298 + by, 82 * bx_k, (40 - P.get('squash', 0)) * by_k), C0, pitch)))
        leg('nh', b.LEG, b.SOCK); leg('nf', b.LEG, b.SOCK)
        hx = 74 + gx + P.get('hx', 0); hy = 0 + by + P.get('hy', 0) - math.sin(math.radians(-pitch)) * 70
        self._hx, self._hy = hx, hy
        b._hoff = (hx, hy)
        G += [(L, [(x + hx, y + hy) for x, y in poly]) for L, poly in head]
        return G

    def tail_ctx(self, v, pose, T_):
        pts = [T_(FX.bez(self._cl, k / 60)) for k in range(61)]
        return lambda x, y: min(range(61), key=lambda i: (pts[i][0] - x) ** 2 + (pts[i][1] - y) ** 2) / 60

    def color(self, L, x, y, ctx, C, eul, edr):
        if L == FLEG: return C['fur_d']
        if L == FSOCK: return C['fur_d'] if hasattr(self.base, 'q') else C['sock']
        return self.base.color(L, x, y, ctx, C, eul, edr)

    def face(self, put, F, N_, C, eyes, v):
        self.base.face(put, lambda p: F((p[0] + self._hx, p[1] + self._hy)), N_, C, eyes, v)

def side_render(fam, look, v, pose, eyes='open', N=48):
    old = PE.SPECIES['slyte']
    base = Purrling(look or 'cat') if fam == 'twitchel' else Howling(look or 'fox')
    PE.SPECIES['slyte'] = SideRig(base)
    try:
        return PE.render('slyte', v, N=N, stage=4, pose=pose, eyes=eyes, halo=None, nspark=0)
    finally:
        PE.SPECIES['slyte'] = old
        base._hoff = (0, 0)

def walk_frames(fam, look, v, N=48):
    f = [side_render(fam, look, v, P_walk(i), N=N) for i in range(6)] + [side_render(fam, look, v, P_trot(i), N=N) for i in range(4)]
    return f + [side_render(fam, look, v, POSE['crouch'], N=N), side_render(fam, look, v, POSE['leap'], eyes='happy', N=N), side_render(fam, look, v, POSE['land'], N=N)]

_BUSH_CACHE = {}
def _bush_layer(repo_px, key):
    if key not in _BUSH_CACHE:
        path = os.path.join(repo_px, 'run', 'ember-russet', f'slyte_{key}.png')
        im = Image.open(path).convert('RGBA'); px = im.load(); out = Image.new('RGBA', im.size, (0, 0, 0, 0)); o = out.load()
        for y in range(48):
            for x in range(48):
                r, g, b, a = px[x, y]
                if a and g > r + 15 and g > b: o[x, y] = px[x, y]
        _BUSH_CACHE[key] = out
    return _BUSH_CACHE[key]

def runner_set(fam, look, pal, fl=1, repo_px='/workspace/echo-app/px'):
    """Generates the full runner frame dict for any of the 20 animals from the SAME master rig."""
    if fam in ('slyte', 'twitchel'):
        v = dict(BASE[fam], palette=pal, fluff=fl, seed=7)
        side = lambda pose, eyes='open', dy=0: side_render(fam, look, v, dict(pose, by=pose.get('by', 0) + dy / PE.SPECIES['slyte'].sbase), eyes=eyes)
        S = {f'run{i}': side(P_run(i)) for i in range(6)}
        S['run_happy'] = side(P_run(2), 'happy')
        S['jump'] = side(POSE['leap'], 'happy')
        S['fall'] = side(POSE['fall'])
        S['tumble'] = side(dict(POSE['crouch'], tail=8), 'happy')
        for k, dy in (('disguise0', 1), ('disguise1', 2)):
            f = side(POSE['crouch'], dy=dy); f.alpha_composite(_bush_layer(repo_px, k)); S[k] = f
        f = side(POSE['leap'], 'happy'); f.alpha_composite(_bush_layer(repo_px, 'reveal')); S['reveal'] = f
        return S
    else:
        import bake_whimber as BW, bake_whimber_fly as BF
        v = BW.preset(pal, fl)
        with species('whimber', look or 'owl'):
            fr = {f'flap{i}': PE.render('whimber', v, N=48, stage=4, halo=None, nspark=0, phase=i, **spec) for i, (nm, spec) in enumerate(BF.FLY)}
            fr['glide'] = PE.render('whimber', v, N=48, stage=4, halo=None, nspark=0, pose=dict(flap=92), xf=(1, 1, 0, -4))
            fr['glide_happy'] = PE.render('whimber', v, N=48, stage=4, halo=None, nspark=0, eyes='happy', pose=dict(flap=92), xf=(1, 1, 0, -4))
            fr['tumble'] = PE.render('whimber', v, N=48, stage=4, halo=None, nspark=0, eyes='happy', pose=dict(flap=4))
        return fr

def run_strip8(runner_dict, fam):
    """Packs the 8-col 384x48 `<prefix>_run.png` strip expected by handheld build_packs.py."""
    im = Image.new('RGBA', (384, 48), (0, 0, 0, 0))
    if fam == 'whimber':
        keys = ['flap0', 'flap1', 'flap2', 'flap3', 'glide', 'glide_happy', 'tumble', 'flap0']
    else:
        keys = ['run0', 'run1', 'run2', 'run3', 'run4', 'run5', 'jump', 'tumble']
    for i, k in enumerate(keys):
        im.alpha_composite(runner_dict[k], (i * 48, 0))
    return im

# ------------------------------------------------------------------ Unified Sleep Poses (4 frames: breathe 0-1-2 + stir 3)
def sleep_frames(fam, look, pal, fl=1, N=48):
    """Generates the 4-frame sleep strip directly from the animal's master rig in a cozy curled/tucked sleep posture."""
    import bake_whimber as BW
    if fam == 'whimber':
        v = BW.preset(pal, fl)
        lk = look or 'owl'
        p = WING[lk]
        out = []
        # Breathe 0, 1, 2 (gentle squash/expand) + col 3 stir (wing/tail/head twitch)
        specs = [
            dict(pose=dict(bob=2, tilt=-8, flap=-6),  xf=(1.04, 0.94, 0, 10), eyes='blink'),
            dict(pose=dict(bob=2, tilt=-10, flap=-8), xf=(1.06, 0.92, 0, 12), eyes='blink'),
            dict(pose=dict(bob=3, tilt=-11, flap=-10),xf=(1.08, 0.90, 0, 14), eyes='blink'),
            dict(pose=dict(bob=1, tilt=-4, flap=6),   xf=(1.03, 0.95, 0, 8),  eyes='blink'),
        ]
        with species('whimber', lk):
            for i, sp_ in enumerate(specs):
                fr = PE.render('whimber', v, N=N, stage=4, halo=0, nspark=0, phase=i, **sp_)
                out.append(fr)
        return out
    else:
        # Ground families (Howlings & Purrlings): side-on curled sleep using SideRig with tucked legs, lowered head, and wrapped tail
        v = dict(BASE[fam], palette=pal, fluff=fl, seed=7)
        lk = look or ('cat' if fam == 'twitchel' else 'fox')
        specs = [
            dict(by=26, squash=6, hy=14, pitch=6,  tail=38, tx=24, tk=0.82, legs=dict(nf=(52, 24), ff=(46, 24), nh=(-48, 24), fh=(-54, 24)), eyes='blink'),
            dict(by=28, squash=7, hy=15, pitch=7,  tail=36, tx=24, tk=0.82, legs=dict(nf=(52, 24), ff=(46, 24), nh=(-48, 24), fh=(-54, 24)), eyes='blink'),
            dict(by=30, squash=8, hy=16, pitch=8,  tail=34, tx=24, tk=0.82, legs=dict(nf=(52, 24), ff=(46, 24), nh=(-48, 24), fh=(-54, 24)), eyes='blink'),
            dict(by=24, squash=5, hy=11, pitch=3,  tail=44, tx=24, tk=0.82, legs=dict(nf=(48, 22), ff=(42, 22), nh=(-44, 22), fh=(-50, 22)), eyes='blink'),
        ]
        return [side_render(fam, lk, v, sp_, eyes=sp_['eyes'], N=N) for sp_ in specs]

# ------------------------------------------------------------------ Unified Home Tails (30x26 crop draped over log / basket lip)
def home_tail(fam, look, pal):
    """Generates the 30x26 tail sprite draped outside the log/basket lip in the animal's exact tail thickness & markings."""
    v = dict(BASE[fam], palette=pal, fluff=1, seed=7)
    sp = Purrling(look or 'cat') if fam == 'twitchel' else Howling(look or 'fox')
    C = sp.palette(v)
    N = 48; pad = 1; k_s = (N - 2 * pad) / 100
    T_ = lambda pts: [(pad + x * k_s, pad + y * k_s) for x, y in pts]
    lab = Image.new('L', (N, N), 0)

    if fam == 'twitchel':
        q = FEL[look or 'cat']
        if q['marks'] == 'lynx':
            pts = [(52, 30), (40, 30), (30, 36), (24, 44), (30, 46), (40, 40), (52, 38)]
        elif q['marks'] == 'snow':
            pts = [(52, 28), (38, 28), (22, 36), (6, 52), (4, 68), (14, 74), (24, 64), (34, 50), (46, 42), (54, 40)]
        else:
            pts = [(52, 30), (40, 30), (24, 38), (10, 54), (6, 70), (10, 74), (14, 70), (18, 58), (30, 46), (44, 39), (52, 38)]
        ImageDraw.Draw(lab).polygon(T_(pts), fill=1)
        L = np.array(lab); out = np.zeros((N, N, 4), np.uint8); m = L == 1
        out[m] = H(C['fur'])
        D = H(C['fur_d']); ink = H(C['ink'])
        ys, xs = np.nonzero(m)
        for y, x in zip(ys, xs):
            t = (x - 26) * .5 - (y - 15) * 1.0
            mk = q['marks']
            if mk in ('stripes', 'snow') and t % 4.2 < 1.3: out[y, x] = D
            elif mk == 'cheetah' and (t < -8 and t % 3.6 < 1.2 or t >= -8 and _h(x // 2, y // 2) < .25): out[y, x] = D
            elif mk == 'spots' and _h(x // 2, y // 2) < .25 and (x + y) % 2: out[y, x] = D
        tipc = H(C['fur_d'] if (q.get('tuft') or q['marks'] in ('lynx', 'stripes', 'snow')) else C['fur_l'])
        yb = ys.max() if len(ys) else 30
        for y, x in zip(ys, xs):
            if y > yb - 3: out[y, x] = tipc
        o = np.zeros_like(m); o[1:] |= m[:-1]; o[:-1] |= m[1:]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]
        out[o & ~m] = ink
        return Image.fromarray(out, 'RGBA').crop((0, 10, 30, 36))
    else:
        p = HOWL[look or 'fox']
        ts = p['tail']; tw = p.get('tail_w', 1.0)
        base_pts = [(52, 30), (40, 30), (24, 38), (10, 54), (8, 66), (18, 62), (30, 52), (44, 44), (54, 42)]
        b0 = base_pts[0]
        pts = [(b0[0] + (x - b0[0]) * ts, b0[1] + (y - b0[1]) * ts * tw) for x, y in base_pts]
        ImageDraw.Draw(lab).polygon(T_(pts), fill=1)
        L = np.array(lab); out = np.zeros((N, N, 4), np.uint8); m = L == 1
        (bx, by), (tx, ty) = T_([(54, 36)])[0], T_([(8, 66)])[0]
        yy, xx = np.mgrid[0:N, 0:N]
        d = ((xx - bx) * (tx - bx) + (yy - by) * (ty - by)) / max(1e-6, (tx - bx) ** 2 + (ty - by) ** 2)
        d = d + np.where((xx + yy) % 2 == 0, .05, -.03)
        out[m & (d <= .4)] = H(C['tail_b'])
        out[m & (d > .4)] = H(C['tail_m'])
        out[m & (d > .7)] = H(C['tip'])
        o = np.zeros_like(m); o[1:] |= m[:-1]; o[:-1] |= m[1:]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]
        out[o & ~m] = H(C['ink'])
        return Image.fromarray(out, 'RGBA').crop((0, 10, 30, 36))
