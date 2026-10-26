#!/usr/bin/env python3
"""Batch H character art (Cole): H4 basket sleeper + wild-cat den tail peeks, H7 title diorama frames (+ ocean previews),
H12 Echo It Back icon, H18 bird fly/glide audit. All creature frames come from tools/family_engine.py (same master rig as the
home/walk/run sheets) except the tail-peek strips, which use the rig's palettes + per-species tail markings.
Rules: 48x48 creature frames, <= 16 colours per frame incl. transparent, never #000000, plum ink, 12 fps.
Run from the repo root:  python3 tools/bake_batch_h.py [icon|den|basket|title|ocean|audit|all]
Writes only NEW files (never overwrites the firmware-pack sheets)."""
import os, sys, json, math
T_DIR = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(T_DIR)
sys.path[:0] = [T_DIR, '/workspace/echo/style_research/src', '/workspace/echo/origin_v2/src']
import numpy as np
from PIL import Image
import family_engine as FE, pixel_engine as PE, slyte_fox as SF
import bake_looks as BL, bake_whimber as BW, bake_whimber_fly as BF
PX = os.path.join(REPO, 'px'); H = PE.H
PLUM = (0x24, 0x16, 0x2C, 255)
CAT_PALS = BL.PALS_CHIP['twitchel']
WILD = ['lion', 'tiger', 'leopard', 'cheetah', 'snowleopard', 'lynx']

def hx(c): return tuple(H(c)[:3]) + (255,)

def stats(im, w, h=None):
    """per-frame (colours incl. transparent, over16, black) for a strip of w x h frames"""
    h = h or im.height; mx = o16 = blk = n = 0
    for y in range(0, im.height, h):
        for x in range(0, im.width, w):
            cs = im.crop((x, y, x + w, y + h)).getcolors(65536) or []
            if not any(c[1][3] for c in cs): continue
            k = len({c[1] if c[1][3] else (0, 0, 0, 0) for c in cs}); n += 1
            mx = max(mx, k); o16 += k > 16; blk += any(c[1][3] and c[1][:3] == (0, 0, 0) for c in cs)
    return dict(frames=n, max=mx, over16=o16, black=blk)

LOG = {}
def save(im, rel, w, h=None, cap=True, keep=None):
    path = os.path.join(PX, rel) if not rel.startswith('/') else rel
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if cap: im = BL.cap16(im, w=w, keep=keep) if (h or im.height) == w else _cap_rect(im, w, h or im.height, keep)
    im.save(path, optimize=True); LOG[os.path.relpath(path, REPO)] = dict(size=list(im.size), **stats(im, w, h)); return im

def _cap_rect(im, w, h, keep):
    out = im.copy()
    for x in range(0, im.width, w):
        fr = im.crop((x, 0, x + w, h)); sq = Image.new('RGBA', (max(w, h), max(w, h)), (0, 0, 0, 0)); sq.paste(fr, (0, 0))
        sq = BL.cap16(sq, w=max(w, h), keep=keep); out.paste(sq.crop((0, 0, w, h)), (x, 0))
    return out

def strip(frs, w=48, h=48):
    im = Image.new('RGBA', (w * len(frs), h), (0, 0, 0, 0))
    for i, f in enumerate(frs): im.alpha_composite(f, (i * w, 0))
    return im

# ------------------------------------------------------------------ procedural tail raster (pixel-native, rig palettes)
def bez(c, t):
    u = 1 - t
    return (u**3 * c[0][0] + 3 * u * u * t * c[1][0] + 3 * u * t * t * c[2][0] + t**3 * c[3][0],
            u**3 * c[0][1] + 3 * u * u * t * c[1][1] + 3 * u * t * t * c[2][1] + t**3 * c[3][1])

def tail_raster(W, Hh, ctrl, rfn, colfn, ink, ns=240):
    S = np.array([bez(ctrl, k / (ns - 1)) for k in range(ns)])
    yy, xx = np.mgrid[0:Hh, 0:W]; P = np.stack([xx + .5, yy + .5], -1).reshape(-1, 1, 2)
    d = np.sqrt(((P - S[None]) ** 2).sum(-1)); i = d.argmin(1); dm = d[np.arange(len(i)), i]
    t = (i / (ns - 1)).reshape(Hh, W); dm = dm.reshape(Hh, W)
    R = np.vectorize(rfn)(t); m = dm <= R + .2
    out = np.zeros((Hh, W, 4), np.uint8)
    for y in range(Hh):
        for x in range(W):
            if not m[y, x]: continue
            dn = not (y + 1 < Hh and x + 1 < W and m[y + 1, x]) or not (y + 1 < Hh and m[y + 1, x])
            up = not (y - 1 >= 0 and m[y - 1, x])
            out[y, x] = colfn(t[y, x], x, y, 'd' if dn else ('u' if up else ''))
    o = np.zeros_like(m); o[1:] |= m[:-1]; o[:-1] |= m[1:]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]
    out[o & ~m] = ink
    return Image.fromarray(out, 'RGBA'), m, t

def cat_C(look, pal):
    v = dict(FE.BASE['twitchel'], palette=pal, fluff=1, seed=7)
    return FE.Purrling(look).palette(v)

TAILSPEC = {   # length px, root radius, tip radius, marks
    'lion':        dict(L=23, r0=1.3, r1=1.0, mark='tuft'),
    'tiger':       dict(L=23, r0=2.0, r1=1.5, mark='rings'),
    'leopard':     dict(L=24, r0=1.8, r1=1.5, mark='spots'),
    'cheetah':     dict(L=24, r0=1.6, r1=1.3, mark='cheetah'),
    'snowleopard': dict(L=24, r0=3.0, r1=3.1, mark='snow'),
    'lynx':        dict(L=10,  r0=2.4, r1=2.1, mark='bob'),
}
DEN_W, DEN_H, DEN_ROOT = 32, 24, (31.5, 15.0)
DEN_SWAY = [(-7, -10), (0, 0), (7, 12), (0, 4)]     # (whole-tail deg, extra tip deg): gentle ping-pong sway, 4 frames
DEN_TICKS = [3, 3, 3, 3]                               # 12 fps -> 1.0 s loop

def den_tail(look, pal, k):
    q = TAILSPEC[look]; C = cat_C(look, pal)
    fur, fd, fl, sock, cream, ink = hx(C['fur']), hx(C['fur_d']), hx(C['fur_l']), hx(C['sock']), hx(C['cream']), hx(C['ink'])
    a, tip = DEN_SWAY[k]; L = q['L']; rx, ry = DEN_ROOT
    if look == 'lynx':
        rel = [(0, 0), (-L * .45, .4), (-L * .8, -.4), (-L, -2.2)]
    else:
        rel = [(0, 0), (-L * .42, 2.2), (-L * .82, 2.0), (-L, -L * .34)]
    def rot(p, deg, c=(0, 0)):
        r = math.radians(deg); x, y = p[0] - c[0], p[1] - c[1]
        return (c[0] + x * math.cos(r) - y * math.sin(r), c[1] + x * math.sin(r) + y * math.cos(r))
    rel = [rel[0]] + [rot(p, a) for p in rel[1:]]
    rel[3] = rot(rel[3], tip, rel[2])
    ctrl = [(rx + x, ry + y) for x, y in rel]
    def rfn(t):
        r = q['r0'] + (q['r1'] - q['r0']) * t
        if q['mark'] == 'tuft' and t > .80: r = 1.0 + 1.6 * math.sin(min(1, (t - .80) / .2) * math.pi * .5)
        if q['mark'] == 'snow': r += .35 * math.sin(t * math.pi)
        return r
    def col(t, x, y, edge):
        if t < .07: return PLUM                          # root melts into the dark den mouth
        if t < .14: return sock
        c = fd if edge == 'd' else (fl if edge == 'u' else fur)
        mk = q['mark']
        if mk == 'tuft':
            if t > .80: return fd if edge == 'u' else sock
        elif mk == 'rings':
            if (t * 7.5) % 1 < .34: c = sock if edge == 'd' else fd
            if t > .9: c = sock
        elif mk == 'spots':
            if .16 < t < .9 and FE._h(x // 2, y // 2) < .38: c = sock if edge == 'd' else fd   # 2x2 rosettes
            if t > .9: c = sock
        elif mk == 'cheetah':
            if .16 < t < .6 and FE._h(x, y) < .3: c = fd                                         # small solid dots
            elif t >= .6 and (t * 9) % 1 < .36: c = sock
            if t > .93: c = cream
        elif mk == 'snow':
            if (t * 5) % 1 < .26: c = fd
            if t > .9: c = sock
        elif mk == 'bob':
            if t > .62: c = sock
        return c
    im, m, tt = tail_raster(DEN_W, DEN_H, ctrl, rfn, col, ink)
    return im

def bake_den():
    rows = []
    for look in WILD:
        for pal in CAT_PALS:
            frs = [den_tail(look, pal, k) for k in range(4)]
            save(strip(frs, DEN_W, DEN_H), f'home/denpeek_twitchel_{look}_{pal}.png', DEN_W, DEN_H, cap=False)
    return rows

# ------------------------------------------------------------------ H4a: house cat basket sleeper (visible curled nap)
# Pixal's compact basket prop px/home/basket_room_{back,front}.png: 56x30 at scene (118,230); front-rim top centre at basket (28,17).
BASKET_REF = dict(size=(56, 30), rim_top_center=(28, 17), scene_xy=(118, 230))
SLEEP_OFF = (4, -17)              # sleeper frame top-left relative to basket top-left (frame point (24,34) sits on rim top centre (28,17))
DEN_ROOT_LOCAL = (30, 38)         # den-local point (px/home/den_*.png, 70x46) where the tail root (31,15 in the 32x24 frame) sits: inside the dark entrance, just above den_front's lip
DEN_OFF = (DEN_ROOT_LOCAL[0] - 31, DEN_ROOT_LOCAL[1] - 15)   # strip top-left relative to den top-left = (-1, 23)
SLEEP_RIM_Y = 34                  # frame row that lines up with the basket front-rim top (everything below is meant to be covered)
SLEEP_TICKS = [6, 6, 6, 6]        # 12 fps: breathe in/out over 2 s like _sleep.png
def basket_sleeper(pal, look='cat'):
    v = dict(FE.BASE['twitchel'], palette=pal, fluff=1, seed=7); C = cat_C(look, pal)
    fur, fd, fl, sock, ink = hx(C['fur']), hx(C['fur_d']), hx(C['fur_l']), hx(C['sock']), hx(C['ink'])
    keep = BL.identity_keep('twitchel', look, pal); frs = []
    for k, (by, hy, tip) in enumerate([(26, 16, 0), (27, 16, 0), (28, 16, 0), (25, 15, 14)]):   # breathe 0-1-2 + stir (tail tip flick)
        s = dict(by=by, squash=0, hy=hy, pitch=10, tail=38, tx=24, tk=0.05, legs=dict(nf=(70, 40), ff=(64, 40), nh=(-66, 40), fh=(-72, 40)))
        f = FE.side_render('twitchel', look, v, s, eyes='blink')
        # tail wrapped round the front, resting on the rim line, tip curling up under the chin
        tip_pt = (36.0, 31.0 - tip * .12); ctrl = [(8.5, 29.5), (6, 36), (26, 36.5), tip_pt]
        def col(t, x, y, edge):
            c = fd if edge == 'd' else (fl if edge == 'u' else fur)
            if t > .86: c = hx(C['tip']) if edge != 'd' else fl
            return c
        tl, m, _ = tail_raster(48, 48, ctrl, lambda t: 1.6 - .3 * t, col, ink)
        f.alpha_composite(tl)
        a = np.array(f); a[SLEEP_RIM_Y + 4:] = 0; f = Image.fromarray(a, 'RGBA')   # below the rim is always covered: keep the frame clean
        frs.append(f)
    return strip(frs), keep

def bake_basket():
    for pal in CAT_PALS:
        im, keep = basket_sleeper(pal)
        save(im, f'home/sleeper_twitchel_cat_{pal}.png', 48, keep=keep)
        im2 = Image.open(os.path.join(PX, f'home/sleeper_twitchel_cat_{pal}.png')); im2.save(os.path.join(PX, f'home/sleeper_twitchel_{pal}.png'))
        LOG[f'px/home/sleeper_twitchel_{pal}.png'] = dict(LOG[f'px/home/sleeper_twitchel_cat_{pal}.png'], alias_of=f'px/home/sleeper_twitchel_cat_{pal}.png')

def ref_basket():
    """reference-only compact basket mock (NOT a shipped prop; Pixal draws the real one)"""
    if os.path.exists(os.path.join(PX, 'home/basket_room_back.png')):
        return (Image.open(os.path.join(PX, 'home/basket_room_back.png')).convert('RGBA'), Image.open(os.path.join(PX, 'home/basket_room_front.png')).convert('RGBA'))
    bb = Image.open(os.path.join(PX, 'home/basket_back.png')).convert('RGBA').resize(BASKET_REF['size'], Image.NEAREST)
    bf = Image.open(os.path.join(PX, 'home/basket_front.png')).convert('RGBA').resize(BASKET_REF['size'], Image.NEAREST)
    return bb, bf

# ------------------------------------------------------------------ H7: title diorama frames (production, master rig)
TITLE_GROUND = [('slyte', 'fox', 'ember-russet'), ('slyte', 'wolf', 'moon-lilac'), ('twitchel', 'cat', 'tan-sand'),
                ('twitchel', 'lion', 'sunset-gold-solid'), ('twitchel', 'lynx', 'cocoa-cream')]
TITLE_SKY = [('whimber', 'owl', 'lilac-night'), ('whimber', 'wingsong', 'robin-ember'), ('whimber', 'eagle', 'wren-cocoa'), ('whimber', 'duck', 'sky-teal')]
STAND = dict(nf=(4, 0), ff=(-2, 0), nh=(2, 0), fh=(-4, 0))
MANIFEST = dict(_about='Batch H / H7 title diorama frames (Cole). All frames 48x48, generated from tools/family_engine.py (same master rig as home/walk/run sheets). '
                'Strips are horizontal (frame i at x = 48*i). fps 12; ticks = how many 12 fps ticks each frame is held. anchor = foot point (ground/branch contact) '
                'in frame px for ground + perch strips, body centre for glide/fly strips. Sprites face RIGHT (side-on ground rigs) / FRONT (birds); flip with scaleX(-1) to walk left '
                '(flip about the frame centre x=24; foot x moves to 47-x). preview_ocean/ is NOT production (pending approval).', fps=12, frame=[48, 48], strips=[])

def foot_anchor(frs):
    ys = [np.nonzero(np.array(f)[..., 3].any(1))[0].max() for f in frs if f.getbbox()]
    y = int(max(ys)); a = np.array(frs[0])[..., 3]; xs = np.nonzero(a[max(0, y - 1):y + 1].any(0))[0]
    return [int(round(xs.mean())) if len(xs) else 24, y]

def centre_anchor(frs):
    bx = [f.getbbox() for f in frs if f.getbbox()]
    return [int(round(sum((b[0] + b[2]) / 2 for b in bx) / len(bx))), int(round(sum((b[1] + b[3]) / 2 for b in bx) / len(bx)))]

def add_strip(rel, frs, ticks, kind, keep, fam, look, pal, note, anchor=None, src=None):
    im = save(strip(frs), rel, 48, keep=keep) if src is None else None
    if src is None:
        frs = [im.crop((i * 48, 0, i * 48 + 48, 48)) for i in range(len(frs))]
    anc = anchor or (foot_anchor(frs) if kind in ('ground', 'perch') else centre_anchor(frs))
    MANIFEST['strips'].append(dict(file='px/' + (src or rel), family=fam, look=look, palette=pal, anim=note[0], frames=len(frs), frame=[48, 48], fps=12,
                                   ticks=ticks, loop=note[1], anchor=anc, anchor_kind='foot' if kind in ('ground', 'perch') else 'centre', notes=note[2]))

def ground_set(fam, look, pal):
    v = dict(FE.BASE[fam], palette=pal, fluff=1, seed=7); keep = BL.identity_keep(fam, look, pal)
    R = lambda pose, eyes='open': FE.side_render(fam, look, v, pose, eyes=eyes)
    walk = [R(FE.P_walk(i)) for i in range(6)]
    fa = foot_anchor(walk)
    add_strip(f'title/{look}_{pal}_walk.png', walk, [2] * 6, 'ground', keep, fam, look, pal, ('walk', True, 'side-on walk cycle (same poses as _walk.png cols 0-5); move ~1 px per tick'))
    sn = [dict(hy=0, hx=0, pitch=0, tail=0), dict(hy=14, hx=6, pitch=7, tail=4), dict(hy=30, hx=12, pitch=14, tail=8), dict(hy=36, hx=14, pitch=15, tail=12),
          dict(hy=30, hx=12, pitch=14, tail=8), dict(hy=34, hx=13, pitch=15, tail=14), dict(hy=14, hx=6, pitch=7, tail=4)]
    eyes = ['open', 'open', 'blink', 'open', 'blink', 'happy', 'open']
    sniff = [R(dict(legs=STAND, **p), e) for p, e in zip(sn, eyes)]
    add_strip(f'title/{look}_{pal}_sniff.png', sniff, [4, 2, 3, 3, 3, 6, 2], 'ground', keep, fam, look, pal,
              ('sniff', False, 'stop, nose down to a flower (sniff-sniff, happy), back up. Spawn the flower note/sparkle on frame 5 (happy). Flower sits ~10 px in front of the foot point.'), anchor=fa)
    pk = [dict(by=104, hy=8, squash=4, tail=14), dict(by=64, hy=4, squash=2, tail=10), dict(by=20, hy=-6, tail=4), dict(by=12, hy=-14, pitch=-3, tail=0),
          dict(by=12, hy=-14, pitch=-3, tail=0), dict(by=12, hy=-14, pitch=-3, tail=6), dict(by=64, hy=4, squash=2, tail=10)]
    eyes = ['open', 'open', 'open', 'open', 'blink', 'happy', 'open']
    crouch = dict(nf=(26, 16), ff=(20, 16), nh=(-10, 22), fh=(-16, 22))
    peek = [R(dict(legs=crouch, **p), e) for p, e in zip(pk, eyes)]
    add_strip(f'title/{look}_{pal}_peek.png', peek, [6, 2, 2, 6, 2, 6, 3], 'ground', keep, fam, look, pal,
              ('peek', False, 'crouched low behind a bush/rock (put the bush/rock layer IN FRONT, top edge ~row 30 of the frame), pops head up, blinks, happy, ducks back. Body sinks below the frame bottom in frames 0-1/6 (hidden by the cover layer); anchor = standing foot point, same as walk'), anchor=fa)

def sky_set(fam, look, pal):
    v = BW.preset(pal, 1); keep = BL.identity_keep(fam, look, pal)
    with FE.species('whimber', look):
        Rn = lambda **k: PE.render('whimber', v, N=48, stage=4, halo=None, nspark=0, **k)
        glide = [Rn(pose=dict(flap=92 + df), xf=(1, 1, 0, dy), phase=i) for i, (df, dy) in enumerate([(0, -4), (-4, -8), (0, -12), (4, -8)])]
        land = [Rn(pose=dict(flap=118), xf=(1, 1, 0, -40), phase=0), Rn(pose=dict(flap=66), xf=(1, 1, 0, -28), phase=1),
                Rn(pose=dict(flap=14), xf=(1, 1, 0, -16), phase=2), Rn(pose=dict(flap=60), xf=(1, 1, 0, -6), phase=3),
                Rn(pose=dict(flap=24, bob=1), xf=(1.06, .94, 0, 0), phase=0), Rn(pose=dict(flap=4), phase=1)]
        idle = [Rn(pose=dict(bob=b), eyes=e, phase=i % 4) for i, (b, e) in enumerate([(0, 'open'), (0, 'open'), (1, 'open'), (1, 'open'), (1, 'blink'), (0, 'open'), (0, 'open'), (0, 'happy')])]
    for f in glide + land + idle: BL.unspark(f)
    add_strip(f'title/{look}_{pal}_glide.png', glide, [3, 3, 3, 3], 'glide', keep, fam, look, pal, ('glide', True, 'wings-out glide with a 1 px float bob; drift across the canopy (alternate with the _fly.png wingbeat)'))
    add_strip(f'title/{look}_{pal}_perch_land.png', land, [2, 2, 2, 2, 3, 4], 'perch', keep, fam, look, pal,
              ('perch_land', False, 'last wingbeat dropping onto a branch, feet touch on frame 5 (squash), settle; anchor = feet on the final frames: put it on the branch top'))
    add_strip(f'title/{look}_{pal}_perch_idle.png', idle, [6, 4, 6, 4, 2, 6, 4, 6], 'perch', keep, fam, look, pal, ('perch_idle', True, 'sitting on a branch: breathe, blink, happy'))
    fly = f'{"whimber_" + look}_{pal}_f1_fly.png'
    frs = [Image.open(os.path.join(PX, fly)).convert('RGBA').crop((i * 48, 0, i * 48 + 48, 48)) for i in range(4)]
    add_strip(None, frs, BF.TICKS, 'glide', keep, fam, look, pal, ('fly', True, 'existing 4-frame wingbeat (unchanged, firmware-pack sheet)'), src=fly)

def bake_title():
    MANIFEST['strips'] = []
    for fam, look, pal in TITLE_GROUND: ground_set(fam, look, pal)
    for fam, look, pal in TITLE_SKY: sky_set(fam, look, pal)
    os.makedirs(os.path.join(PX, 'title'), exist_ok=True)
    json.dump(MANIFEST, open(os.path.join(PX, 'title/title_frames.json'), 'w'), indent=1)

# ------------------------------------------------------------------ H7 ocean PREVIEW (Tidelings proposal, NOT approved / not production)
# Roster (Oct 25 update, Daniel via Cole/Kai): sea_otter, seal, dolphin, sea_turtle, penguin, octopus, seahorse, hermit_crab (manatee OUT,
# hermit crab IN, octopus stays; puffin+narwhal dropped earlier). Movement: all 8 swim in the ocean mini-games; at home otter/seal/penguin walk and
# the hermit crab scuttles; in the games the hermit crab drifts/bobs on a current with its shell (preview = drift cycle, not a swim stroke).
# Sprite pixels are never tinted.
# No master-rig species exists for sea creatures yet, so these previews use a small layered raster in the rig's conventions:
# up-left light / down-right shade, plum-ink silhouette + seams, rig eye (dark + white glint), pink blush, cream belly, <= 16 colours.
OCEAN_PAL = {
  'dolphin':    dict(l='#BCD4FF', m='#8FB2F4', d='#5E84D6', c='#F4F6FF', cd='#D2DCF4', ink='#3B2A5C', acc='#FF9EC0'),
  'sea_turtle': dict(l='#BDF0C8', m='#86D8A0', d='#4CAE7A', c='#FFF2CC', cd='#E8CF8E', ink='#3B2A5C', acc='#FF9EC0', sh='#C99A5E', shd='#9A6E44', shl='#E8C48A'),
  'hermit_crab': dict(l='#FFC2AE', m='#FF9A84', d='#E0685A', c='#FFF0DC', cd='#F2D0AE', ink='#3B2A5C', acc='#FF9EC0', sh='#F6C68C', shd='#C88A58', shl='#FFE4B8'),
  'seahorse':   dict(l='#FFE3A0', m='#FFC870', d='#E8964A', c='#FFF4D8', cd='#F6D8A0', ink='#3E2440', acc='#FF8FB8', fin='#BDF0E6'),
}
TIDELINGS = ['sea_otter', 'seal', 'dolphin', 'sea_turtle', 'penguin', 'octopus', 'seahorse', 'hermit_crab']   # final 8 (Oct 25)
OCEAN = ['dolphin', 'sea_turtle', 'seahorse', 'hermit_crab']   # previewed looks (hermit_crab = drift-on-current cycle)
OCEAN_ANIM = {'hermit_crab': 'drift'}   # everyone else: 'swim'
SWIM_TICKS = [2, 2, 2, 2, 2, 2]
from PIL import ImageDraw as _ID

class Layers:
    """paint-order label raster: layer ids drawn back -> front; colour by layer + edge light/shade; ink silhouette + listed seams"""
    def __init__(s, W=48, Hh=48): s.W, s.H = W, Hh; s.lab = Image.new('L', (W, Hh), 0); s.d = _ID.Draw(s.lab); s.cols = {}; s.seam = set()
    def ell(s, k, cx, cy, rx, ry): s.d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=k)
    def poly(s, k, pts): s.d.polygon([(round(x), round(y)) for x, y in pts], fill=k)
    def render(s, colfn, ink):
        L = np.array(s.lab); out = np.zeros((s.H, s.W, 4), np.uint8); m = L > 0
        for y in range(s.H):
            for x in range(s.W):
                k = L[y, x]
                if not k: continue
                up = y == 0 or L[y - 1, x] != k or x == 0 or L[y, x - 1] != k
                dn = y == s.H - 1 or L[y + 1, x] != k or x == s.W - 1 or L[y, x + 1] != k
                out[y, x] = hx(colfn(k, x, y, 'u' if up and not dn else ('d' if dn and not up else '')))
        o = np.zeros_like(m); o[1:] |= m[:-1]; o[:-1] |= m[1:]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]
        out[o & ~m] = hx(ink)
        for (a, b) in s.seam:   # ink seam on layer a where it touches layer b
            A = L == a; B = L == b; t = np.zeros_like(A); t[1:] |= B[:-1]; t[:-1] |= B[1:]; t[:, 1:] |= B[:, :-1]; t[:, :-1] |= B[:, 1:]
            out[A & t] = hx(ink)
        return Image.fromarray(out.copy(), 'RGBA').copy()

def _eye(im, x, y, ink, happy=False, blush=None):
    p = im.load(); E = hx('#2A1A3A'); Wt = hx('#FFFFFF')
    if happy:
        for dx, dy in ((-1, 0), (0, -1), (1, 0)): p[x + dx, y + dy] = E
    else:
        for dx in (0, 1):
            for dy in (0, 1, 2): p[x + dx, y + dy - 1] = E
        p[x + 1, y - 1] = Wt
    if blush:
        for dx in (-1, 0, 1): p[x + dx, y + 3] = hx(blush)

def _rot(pts, c, deg):
    r = math.radians(deg); cs, sn = math.cos(r), math.sin(r)
    return [(c[0] + (x - c[0]) * cs - (y - c[1]) * sn, c[1] + (x - c[0]) * sn + (y - c[1]) * cs) for x, y in pts]

def swim_frame(look, i):
    P = OCEAN_PAL[look]; t = i / 6; w = math.sin(2 * math.pi * t); cw = math.cos(2 * math.pi * t); happy = i == 4
    S = Layers()
    if look == 'dolphin':   # chubby, rounded beak, soft rounded fin, big smile: friendly, never shark-like
        by = 25 + round(cw)
        S.poly(1, _rot([(13, by - 1), (5, by - 6 - 3 * w), (3, by - 4 - 3 * w), (7, by - 1), (3, by + 3 - 3 * w), (5, by + 5 - 3 * w), (13, by + 2)], (13, by), 0))   # flukes
        S.ell(2, 24, by, 15, 10)                                            # body
        S.ell(2, 33, by - 2, 8, 7.5)                                        # round melon head
        S.ell(2, 39, by + 2, 5, 3.5)                                        # rounded beak
        S.ell(3, 22, by - 9, 4, 3); S.poly(3, [(17, by - 8), (20, by - 11), (25, by - 11), (27, by - 8)])   # soft dorsal hump (rounded tip)
        S.ell(4, 25, by + 4, 11, 5)                                         # cream belly
        S.ell(4, 39, by + 4, 4, 1.6)
        S.poly(5, _rot([(24, by + 3), (19, by + 11), (23, by + 11), (28, by + 4)], (25, by + 3), 10 * w))   # pectoral flipper
        S.seam |= {(5, 4), (5, 2)}
        def col(k, x, y, e):
            if k == 4: return P['cd'] if e == 'd' else P['c']
            if k in (1, 5, 3): return P['d'] if e == 'd' else P['m']
            return P['d'] if e == 'd' else (P['l'] if e == 'u' else P['m'])
        im = S.render(col, P['ink']); _eye(im, 33, by - 3, P['ink'], happy, P['acc'])
        px = im.load()
        for x in range(36, 42): px[x, by + 3] = hx(P['ink'])                # smile line along the beak
        px[42, by + 2] = hx(P['ink'])
    elif look == 'sea_turtle':
        by = 26 + round(cw)
        for k, (cx, cy, ang, ln) in enumerate([(30, by - 4, -40 + 30 * w, 12), (30, by + 4, 40 - 30 * w, 11), (14, by - 3, -150 - 12 * w, 6), (14, by + 4, 150 + 12 * w, 6)]):
            r = math.radians(ang); ex, ey = cx + ln * math.cos(r), cy + ln * math.sin(r); nx, ny = -math.sin(r) * 2.4, math.cos(r) * 2.4
            S.poly(1, [(cx + nx, cy + ny), (ex + nx * .6, ey + ny * .6), (ex - nx * .6, ey - ny * .6), (cx - nx, cy - ny)])
        S.ell(2, 38, by - 1, 6, 5)                                          # round head
        S.ell(3, 22, by, 13, 9)                                             # shell
        S.ell(4, 22, by + 7, 11, 2.5)                                       # plastron rim
        S.seam |= {(3, 2), (3, 1), (4, 3)}
        def col(k, x, y, e):
            if k == 3:
                hexa = (abs((x - 22) % 8 - 4) + abs((y - by) % 6 - 3) * 1.3) < 1.2
                return P['shd'] if (e == 'd' or hexa) else (P['shl'] if e == 'u' else P['sh'])
            if k == 4: return P['cd'] if e == 'd' else P['c']
            return P['d'] if e == 'd' else (P['l'] if e == 'u' else P['m'])
        im = S.render(col, P['ink']); _eye(im, 39, by - 3, P['ink'], happy, P['acc']); im.load()[42, by + 1] = hx(P['ink'])
    elif look == 'hermit_crab':   # spiral shell on its back, soft rounded claws, stalk eyes; DRIFT: bobs + sways on a current, legs trail
        by = 25 + round(cw * 2); dx = round(w); sway = w                  # passive bob (2 px) + 1 px drift, no swim stroke
        for j in range(3):                                                  # tucked legs dangling, trailing with the current
            x0 = 27 + dx + j * 3; S.poly(1, [(x0, by + 5), (x0 + 1.6, by + 5), (x0 - 1 - 2 * sway + 1.6, by + 11), (x0 - 1 - 2 * sway, by + 11)])
        sx, sy = 19 + dx, by - 1
        S.ell(3, sx, sy, 12, 11)                                            # spiral shell (on its back)
        S.poly(3, [(sx - 9, sy - 5), (sx - 13, sy - 11), (sx - 5, sy - 9)])  # whorl tip
        S.ell(4, sx + 8, by + 3, 3.5, 6)                                    # shell lip / opening
        S.ell(2, 32 + dx, by + 2, 7, 5)                                     # crab front peeking out
        S.poly(6, [(31 + dx, by - 2), (32.4 + dx, by - 2), (32.4 + dx, by - 8), (31 + dx, by - 8)])     # eye stalks
        S.poly(6, [(35 + dx, by - 2), (36.4 + dx, by - 2), (37.4 + dx, by - 8), (36 + dx, by - 8)])
        S.ell(6, 31.5 + dx, by - 9, 2.5, 2.5); S.ell(6, 36.5 + dx, by - 9, 2.5, 2.5)
        S.ell(5, 40 + dx, by + 4 + round(sway), 3.5, 3)                     # big soft claw (rounded, no pincer points)
        S.ell(5, 37 + dx, by + 7, 2.5, 2)                                   # little claw
        S.seam |= {(4, 3), (2, 4), (5, 2), (2, 3)}
        def col(k, x, y, e):
            if k == 3:
                r = math.hypot(x - sx, y - sy); a = math.atan2(y - sy, x - sx)
                band = (r + 4 * a / (2 * math.pi)) % 4 < 1.1 and r > 1.5
                return P['shd'] if (e == 'd' or band) else (P['shl'] if e == 'u' else P['sh'])
            if k == 4: return P['cd'] if e == 'd' else P['c']
            if k == 1: return P['d'] if e == 'd' else P['m']
            return P['d'] if e == 'd' else (P['l'] if e == 'u' else P['m'])
        im = S.render(col, P['ink']); px = im.load()
        _eye(im, 31 + dx, by - 9, P['ink'], happy); _eye(im, 36 + dx, by - 9, P['ink'], happy)
        for x in (35, 36, 37): px[x + dx, by + 3] = hx(P['acc'])             # cheek blush
        px[41 + dx, by + 3 + round(sway)] = hx(P['ink'])                    # tiny claw crease (soft, not a pincer)
    else:   # seahorse: upright, curled tail, tubey snout, fluttering back fin
        by = 22 + round(cw * 1.5)
        S.poly(1, [(18, by - 2 + w), (12, by + 1), (12, by + 6), (18, by + 6 - w)])            # back fin (flutters)
        S.ell(2, 24, by - 9, 6, 6)                                          # head
        S.poly(2, [(27, by - 11), (36, by - 9), (36, by - 6), (27, by - 6)])   # snout
        S.ell(3, 23, by + 3, 7, 9)                                          # body
        S.ell(4, 25, by + 4, 3.5, 7)                                        # belly plates
        tail = [(22, by + 10), (18, by + 17), (19, by + 23), (24, by + 25), (28, by + 22), (25, by + 19), (22, by + 21), (21, by + 17), (26, by + 11)]
        S.poly(3, tail)
        S.poly(5, [(21, by - 15), (23, by - 19), (25, by - 15)])            # crown nub
        S.seam |= {(4, 3), (2, 3)}
        def col(k, x, y, e):
            if k == 1: return P['fin']
            if k == 4: return P['cd'] if (y % 2 == 0) else P['c']
            return P['d'] if e == 'd' else (P['l'] if e == 'u' else P['m'])
        im = S.render(col, P['ink']); _eye(im, 25, by - 10, P['ink'], happy, P['acc'])
    return im

def bake_ocean():
    rows = []
    for look in OCEAN:
        frs = [swim_frame(look, i) for i in range(6)]
        anim = OCEAN_ANIM.get(look, 'swim')
        rel = f'title/preview_ocean/PREVIEW_{look}_{anim}.png'
        im = save(strip(frs), rel, 48)
        rows.append(dict(file='px/' + rel, look=look, anim=anim, frames=6, frame=[48, 48], fps=12, ticks=SWIM_TICKS, loop=True,
                         anchor=centre_anchor([im.crop((i * 48, 0, i * 48 + 48, 48)) for i in range(6)]), anchor_kind='centre',
                         facing='right' if look != 'seahorse' else 'right (upright)'))
    json.dump(dict(status='PREVIEW - pending approval. Ocean (Tidelings) family is only a proposal; do not ship or wire into the app until Daniel/Kai approve.',
                   roster=TIDELINGS,
                   lineup='roster (8): sea_otter, seal, dolphin, sea_turtle, penguin, octopus, seahorse, hermit_crab (manatee out, hermit crab in). '
                          'All 8 swim in the ocean mini-games. At home otter/seal/penguin walk and the hermit crab scuttles; in the games the hermit crab '
                          'drifts/bobs on a current with its shell. Previewed: dolphin, sea_turtle, seahorse (swim) + hermit_crab (drift). puffin + narwhal dropped.',
                   source='tools/bake_batch_h.py ocean - layered pixel raster in master-rig conventions (no ocean rig exists yet); palettes are preview-only',
                   strips=rows), open(os.path.join(PX, 'title/preview_ocean/PREVIEW_manifest.json'), 'w'), indent=1)
    open(os.path.join(PX, 'title/preview_ocean/README_PREVIEW.txt'), 'w').write(
        'PREVIEW ONLY - pending approval.\nTidelings (ocean Echo family) is a proposal. Roster (8): sea_otter, seal, dolphin, sea_turtle, penguin, octopus, seahorse, hermit_crab (manatee out).\n'
        'All 8 swim in the ocean mini-games. At home otter, seal and penguin walk and the hermit crab scuttles; in the games the hermit crab drifts/bobs on a current with its shell.\n'
        'These 4 cycles (dolphin, sea_turtle, seahorse swim; hermit_crab drift-on-current) are 48x48 x 6 frames @ 12 fps (2 ticks each), facing right, for the title tidepool look test.\n'
        'Sprite pixels are never tinted.\n'
        'Dolphin is drawn round and friendly (soft rounded fin, smile), never shark-like.\n'
        'Not referenced by px/title/title_frames.json and not part of any firmware pack. Do not ship.\n')

# ------------------------------------------------------------------ H12: Echo It Back Play-menu icon (16x16, same palette as px/i_*.png)
ICON_ROWS = [   # g gold  w white highlight  p pink pad  y gold pad (lit)  c cream pad  . clear ; ink outline is added automatically
    "................",
    "......ggggggg...",
    "......gwggggg...",
    "......g.....g...",
    "......g.....g...",
    "......g.....g...",
    "...gggg..gggg...",
    "..gwggg.gwggg...",
    "...ggg...ggg....",
    "................",
    "................",
    "................",
    ".pppp.yyyy.cccc.",
    ".pppp.ywyy.cccc.",
    "................",
    "................"]
ICON_C = {'g': '#FFD27A', 'w': '#FFFFFF', 'p': '#FF8FB8', 'y': '#FFD27A', 'c': '#FFF6E6'}
ICON_INK = '#3B2A5C'
def bake_icon():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); m = np.zeros((16, 16), bool)
    for y, row in enumerate(ICON_ROWS):
        for x, ch in enumerate(row):
            if ch != '.': im.putpixel((x, y), hx(ICON_C[ch])); m[y, x] = True
    o = np.zeros_like(m); o[1:] |= m[:-1]; o[:-1] |= m[1:]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]
    for y, x in zip(*np.nonzero(o & ~m)): im.putpixel((int(x), int(y)), hx(ICON_INK))
    save(im, 'i_echoback.png', 16, cap=False)

# ------------------------------------------------------------------ H18: bird fly / glide / glide_happy audit (Starfall Catch hover)
BIRDS = ['owl', 'chicken', 'duck', 'eagle', 'dove', 'pigeon', 'crow', 'gull', 'wingsong']
BIRD_ALIASES = {'wingsong': ['bird', 'songbird']}
AUDIT = {}
def _sym(fr):
    a = np.array(fr)[..., 3] > 0; b = a[:, ::-1]; bb = fr.getbbox()
    return (float((a & b).sum()) / max(1, a.sum()), ((bb[0] + bb[2]) / 2 - 24) if bb else 0)

def bake_audit():
    rows = []; missing = []; made = []
    for look in BIRDS:
        for pal in BL.PALS_CHIP['whimber'] + (BL.PALS_BASE_EXTRA['whimber'] if look == 'owl' else []):
            for lk in [look] + BIRD_ALIASES.get(look, []):
                r = dict(look=lk, palette=pal, problems=[])
                fl = [os.path.join(PX, f'whimber_{lk}_{pal}_f{i}_fly.png') for i in range(4)]
                rd = os.path.join(PX, f'run/{lk}/{pal}')
                g, gh = os.path.join(rd, 'whimber_glide.png'), os.path.join(rd, 'whimber_glide_happy.png')
                for f in fl + [g, os.path.join(PX, f'whimber_{lk}_{pal}_run.png')]:
                    if not os.path.exists(f): r['problems'].append('missing ' + os.path.relpath(f, REPO)); missing.append(f)
                if not os.path.exists(gh):
                    # produce the missing happy glide from the same rig call as runner_set
                    v = BW.preset(pal, 1)
                    with FE.species('whimber', 'owl' if lk == 'owl' else ('wingsong' if lk in ('bird', 'songbird') else lk)):
                        im = PE.render('whimber', v, N=48, stage=4, halo=None, nspark=0, eyes='happy', pose=dict(flap=92), xf=(1, 1, 0, -4))
                    save(im, os.path.relpath(gh, PX), 48, keep=BL.identity_keep('whimber', lk if lk in FE.WING else 'wingsong', pal)); made.append(gh)
                if r['problems']: rows.append(r); continue
                sh = Image.open(fl[1]).convert('RGBA'); frs = [sh.crop((i * 48, 0, i * 48 + 48, 48)) for i in range(4)]
                r['fly_size'] = list(sh.size); r['fly_frames_distinct'] = len({f.tobytes() for f in frs})
                gi, ghi = Image.open(g).convert('RGBA'), Image.open(gh).convert('RGBA')
                r['glide_happy_differs'] = gi.tobytes() != ghi.tobytes()
                runim = Image.open(os.path.join(PX, f'whimber_{lk}_{pal}_run.png')).convert('RGBA')
                r['run_strip_cols_4_5_match'] = runim.crop((192, 0, 240, 48)).tobytes() == gi.tobytes() and runim.crop((240, 0, 288, 48)).tobytes() == ghi.tobytes()
                st = [stats(Image.open(f).convert('RGBA'), 48) for f in fl] + [stats(gi, 48), stats(ghi, 48)]
                r['max_colours'] = max(x['max'] for x in st); r['over16'] = sum(x['over16'] for x in st); r['black'] = sum(x['black'] for x in st)
                sy = [_sym(f) for f in frs + [gi, ghi]]
                r['silhouette_mirror_overlap_min'] = round(min(x[0] for x in sy), 3); r['bbox_centre_offset_px_max'] = round(max(abs(x[1]) for x in sy), 1)
                bbs = [f.getbbox() for f in frs]
                r['fly_bbox_union'] = [min(b[0] for b in bbs), min(b[1] for b in bbs), max(b[2] for b in bbs), max(b[3] for b in bbs)]
                r['glide_bbox'] = list(gi.getbbox())
                if r['fly_size'] != [192, 48]: r['problems'].append('fly sheet size')
                if r['fly_frames_distinct'] < 4: r['problems'].append('fly frames not distinct')
                if not r['glide_happy_differs']: r['problems'].append('glide_happy == glide')
                if r['over16'] or r['black']: r['problems'].append('colour rule')
                rows.append(r)
    per_look = {}
    for r in rows:
        if 'fly_bbox_union' not in r: continue
        q = per_look.setdefault(r['look'], dict(n=0, sym=1, off=0, top=48, bottom=0, left=48, right=0))
        q['n'] += 1; q['sym'] = min(q['sym'], r['silhouette_mirror_overlap_min']); q['off'] = max(q['off'], r['bbox_centre_offset_px_max'])
        q['top'] = min(q['top'], r['fly_bbox_union'][1], r['glide_bbox'][1]); q['bottom'] = max(q['bottom'], r['fly_bbox_union'][3], r['glide_bbox'][3])
        q['left'] = min(q['left'], r['fly_bbox_union'][0]); q['right'] = max(q['right'], r['fly_bbox_union'][2])
    AUDIT.update(checked=len(rows), with_problems=[r for r in rows if r['problems']], made_glide_happy=[os.path.relpath(m, REPO) for m in made], per_look=per_look, rows=rows)
    os.makedirs('/workspace/echo/batch_H', exist_ok=True)
    json.dump(AUDIT, open('/workspace/echo/batch_H/h18_bird_audit.json', 'w'), indent=1)
    print('H18 audit:', len(rows), 'look/palette combos;', len(AUDIT['with_problems']), 'with problems;', len(made), 'glide_happy made')
    for k, q in per_look.items(): print(f"  {k:9s} n={q['n']:2d} mirror-overlap>={q['sym']:.2f} centre-offset<={q['off']}px  y {q['top']}..{q['bottom']}  x {q['left']}..{q['right']}")

# ------------------------------------------------------------------ contact sheet (review only, written outside the app)
def bake_sheet(out='/workspace/echo/batch_H/art_contact_sheet.png'):
    from PIL import ImageDraw, ImageFont
    try: FONT = ImageFont.truetype(os.path.join(PX, 'PressStart2P.ttf'), 8); BIG = ImageFont.truetype(os.path.join(PX, 'PressStart2P.ttf'), 12)
    except Exception: FONT = BIG = ImageFont.load_default()
    W = 1500; blocks = []
    def up(im, k): return im.resize((im.width * k, im.height * k), Image.NEAREST)
    def block(title, body, bg=(46, 34, 66)):
        b = Image.new('RGBA', (W, body.height + 34), bg + (255,)); d = ImageDraw.Draw(b); d.text((10, 8), title, font=BIG, fill=(255, 230, 170))
        b.alpha_composite(body, (10, 28)); blocks.append(b)
    def labelled(rows, k, gap=6, lw=240, bg=None):
        H_ = sum(r[1].height * k + gap for r in rows); im = Image.new('RGBA', (W - 20, H_), (0, 0, 0, 0)); d = ImageDraw.Draw(im); y = 0
        for lab, pic in rows:
            if bg: im.paste(Image.new('RGBA', (pic.width * k, pic.height * k), bg), (lw, y))
            im.alpha_composite(up(pic, k), (lw, y)); d.text((0, y + pic.height * k // 2 - 4), lab, font=FONT, fill=(240, 236, 255)); y += pic.height * k + gap
        return im
    # 1 icon
    ic = Image.new('RGBA', (3 * 20, 20), (0, 0, 0, 0))
    for i, n in enumerate(['i_talk', 'i_note', 'i_echoback']): ic.alpha_composite(Image.open(os.path.join(PX, n + '.png')).convert('RGBA'), (i * 20 + 2, 2))
    light = Image.new('RGBA', ic.size, (250, 240, 225, 255)); light.alpha_composite(ic)
    block('H12  px/i_echoback.png (16x16)  vs  i_talk / i_note', labelled([('talk | note | ECHOBACK (on dark)', ic), ('same, on light', light)], 6))
    # 2 basket sleeper mock
    bb, bf = ref_basket(); rows = []
    for pal in ['tan-sand', 'dusk-plum', 'snow-blush', 'mint-teal-solid']:
        sh = Image.open(os.path.join(PX, f'home/sleeper_twitchel_cat_{pal}.png')).convert('RGBA'); row = Image.new('RGBA', (4 * 66, 50), (122, 86, 62, 255))
        for i in range(4):
            c = Image.new('RGBA', (66, 50), (0, 0, 0, 0)); c.alpha_composite(bb, (5, 20)); c.alpha_composite(sh.crop((i * 48, 0, i * 48 + 48, 48)), (5 + SLEEP_OFF[0], 20 + SLEEP_OFF[1])); c.alpha_composite(bf, (5, 20)); row.alpha_composite(c, (i * 64, 0))
        rows.append((f'cat {pal} (4f breathe/stir)', row))
    block('H4a  house-cat basket sleeper  px/home/sleeper_twitchel_cat_<pal>.png  on Pixal basket_room props, offset (+4,-17)', labelled(rows, 3))
    # 3 den tail peeks
    rows = []
    for look in WILD:
        db = Image.open(os.path.join(PX, 'home/den_back.png')).convert('RGBA'); dfr = Image.open(os.path.join(PX, 'home/den_front.png')).convert('RGBA')
        row = Image.new('RGBA', (8 * 76, 50), (86, 112, 70, 255))
        for j, pal in enumerate(['tan-sand', 'ember-russet']):
            st_ = Image.open(os.path.join(PX, f'home/denpeek_twitchel_{look}_{pal}.png')).convert('RGBA')
            for k in range(4):
                c = Image.new('RGBA', (76, 50), (0, 0, 0, 0)); c.alpha_composite(db, (4, 2)); c.alpha_composite(dfr, (4, 2))
                c.alpha_composite(st_.crop((k * 32, 0, k * 32 + 32, 24)), (4 + DEN_OFF[0], 2 + DEN_OFF[1])); row.alpha_composite(c, ((j * 4 + k) * 76, 0))
        rows.append((f'{look}  (tan-sand | ember-russet)', row))
    block('H4b  wild-cat den tail peeks  px/home/denpeek_twitchel_<look>_<pal>.png  32x24 x4 on Pixal den props, offset (-1,+23)', labelled(rows, 2))
    # 4 title frames
    rows = []
    for e in MANIFEST['strips'] or json.load(open(os.path.join(PX, 'title/title_frames.json')))['strips']:
        rows.append((os.path.basename(e['file']).replace('.png', ''), Image.open(os.path.join(REPO, e['file'])).convert('RGBA')))
    block('H7  title diorama frames  px/title/*.png  (+ title_frames.json)', labelled(rows, 2, gap=2, bg=(70, 96, 82, 255)))
    # 5 ocean previews
    rows = [(os.path.basename(f).replace('.png', ''), Image.open(os.path.join(PX, 'title/preview_ocean', f)).convert('RGBA'))
            for f in sorted(os.listdir(os.path.join(PX, 'title/preview_ocean'))) if f.endswith('.png')]
    block('H7  OCEAN PREVIEW ONLY - pending approval  px/title/preview_ocean/', labelled(rows, 2, gap=2, bg=(40, 92, 120, 255)), bg=(30, 52, 80))
    # 6 birds
    rows = []
    pals = dict(owl='lilac-night', chicken='robin-ember', duck='sky-teal', eagle='wren-cocoa', dove='dove-mist', pigeon='crow-dusk', crow='plum-blush', gull='mint-aurora-solid', wingsong='sun-finch')
    for b, pal in pals.items():
        row = Image.new('RGBA', (48 * 8, 48), (0, 0, 0, 0)); row.alpha_composite(Image.open(os.path.join(PX, f'whimber_{b}_{pal}_f1_fly.png')).convert('RGBA'), (0, 0))
        g = Image.open(os.path.join(PX, f'run/{b}/{pal}/whimber_glide.png')).convert('RGBA'); gh = Image.open(os.path.join(PX, f'run/{b}/{pal}/whimber_glide_happy.png')).convert('RGBA')
        row.alpha_composite(g, (4 * 48, 0)); row.alpha_composite(gh, (5 * 48, 0)); row.alpha_composite(gh.transpose(Image.FLIP_LEFT_RIGHT), (6 * 48, 0))
        row.alpha_composite(Image.open(os.path.join(PX, f'whimber_{b}_{pal}_f1_fly.png')).convert('RGBA').crop((0, 0, 48, 48)).transpose(Image.FLIP_LEFT_RIGHT), (7 * 48, 0))
        rows.append((f'{b} {pal}', row))
    block('H18  cols: fly0-3 | glide | glide_happy | glide_happy flipped | fly0 flipped   (112 look x palette combos audited, 0 problems)', labelled(rows, 2, gap=2, bg=(26, 30, 70, 255)))
    Ht = sum(b.height + 6 for b in blocks); sheet = Image.new('RGBA', (W, Ht), (24, 18, 36, 255)); y = 0
    for b in blocks: sheet.alpha_composite(b, (0, y)); y += b.height + 6
    os.makedirs(os.path.dirname(out), exist_ok=True); sheet.convert('RGB').save(out, optimize=True); print('contact sheet', out, sheet.size)

STEPS = {}
def main():
    what = set(sys.argv[1:]) or {'all'}
    for k, fn in STEPS.items():
        if what & {k, 'all'}: fn()
    json.dump(LOG, open('/tmp/bake_batch_h_log.json', 'w'), indent=1)
    print('files', len(LOG), 'max', max([v.get('max', 0) for v in LOG.values()] or [0]),
          'over16', sum(v.get('over16', 0) for v in LOG.values()), 'black', sum(v.get('black', 0) for v in LOG.values()))

STEPS.update(icon=bake_icon, den=bake_den, basket=bake_basket, title=bake_title, ocean=bake_ocean, audit=bake_audit, sheet=bake_sheet)
if __name__ == '__main__':
    main()
