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
# ---- care frames (guide 9.2: eat, pet, curious, shy, sleepy/nap, plus sad/surprised/think/giggle for expressions)
FRAMES += [
  ('eat1', dict(pose=dict(bob=1, sway=2), xf=(1, 1, -9, 0), eyes='open+mopen')), ('eat2', dict(pose=dict(bob=1, sway=2), xf=(1, 1, -9, 0), eyes='happy+mchomp')),
  ('pet1', dict(pose=dict(bob=1, sway=4), xf=(1.02, .96, 0, 0), eyes='happy+blush2', hearts=True)), ('pet2', dict(pose=dict(bob=0, sway=3), eyes='happy+blush2', hearts=True)),
  ('curious1', dict(pose=dict(bob=0, sway=6), xf=(1, 1, 9, 0), ear=1.1, eyes='wide+mo')), ('curious2', dict(pose=dict(bob=1, sway=8), xf=(1, 1, 9, 0), ear=1.1, eyes='open+mo')),
  ('shy1', dict(pose=dict(bob=1, sway=-26), eyes='happy+blush2')), ('shy2', dict(pose=dict(bob=1, sway=-22), eyes='half+blush2')),
  ('sleepy1', dict(pose=dict(bob=1, sway=0), eyes='half')), ('sleepy2', dict(pose=dict(bob=1, sway=-4), eyes='blink')),
  ('nap1', dict(pose=dict(bob=1, sway=-12), eyes='blink+z1', halo=0)), ('nap2', dict(pose=dict(bob=0, sway=-12), eyes='blink+z2', halo=0)),
  ('sad', dict(pose=dict(bob=1, sway=-6), ear=.9, eyes='half+mfrown')), ('surprised', dict(pose=dict(bob=0, sway=4), ear=1.12, eyes='wide+mo')),
  ('think', dict(pose=dict(bob=0, sway=2), eyes='wink+mflat')), ('giggle', dict(pose=dict(bob=1, sway=6), xf=(1, 1.02, 0, 0), eyes='happy+mopen')),
]
_FOX = PE.SPECIES['slyte']; _orig_face = type(_FOX).face
def _face(self, put, F, N, C, eyes, v):
    """extends the guide face templates with half lids, wide eyes, mouths, extra blush and nap z's (hand-placed pixels)."""
    parts = eyes.split('+'); base = parts[0]; ex = set(parts[1:]); H = PE.H
    _orig_face(self, put, F, N, C, {'half': 'open', 'wide': 'open'}.get(base, base), v)
    E = H(C['eye']); FUR = H(C['fur'])
    for exx, d in ((160, -1), (240, 1)):
        x0, y0 = F((exx, 180))
        if base == 'half':      # top two rows become lid (fur), lid line in eye ink
            for dx in range(-2, 2):
                put(x0+dx, y0-2, FUR); put(x0+dx, y0-1, E)
        if base == 'wide':      # one more white pixel, smaller iris
            put(x0-1+(0 if d < 0 else 0), y0, H('#FFFFFF'))
    nx, ny = F((200, 258))
    if 'mopen' in ex: put(nx-1, ny+2, E); put(nx, ny+2, E); put(nx-1, ny+3, H('#FF8FB8')); put(nx, ny+3, E)
    if 'mchomp' in ex: put(nx-2, ny+2, E); put(nx-1, ny+3, E); put(nx, ny+3, E); put(nx+1, ny+2, E)
    if 'mo' in ex: put(nx-1, ny+2, E); put(nx, ny+2, E); put(nx-1, ny+3, E); put(nx, ny+3, E)
    if 'mfrown' in ex: put(nx-2, ny+3, E); put(nx-1, ny+2, E); put(nx, ny+2, E); put(nx+1, ny+3, E)
    if 'mflat' in ex: put(nx-1, ny+2, E); put(nx, ny+2, E); put(nx+1, ny+2, E)
    if 'blush2' in ex:
        for bx in (136, 264):
            x0, y0 = F((bx, 216)); dd = 1 if bx > 200 else -1
            for k in (0, 1, 2): put(x0+dd*k, y0, H(C['blush']))
            put(x0+dd, y0+1, H(C['blush']))
    for zk, (zx, zy) in (('z1', (40, 8)), ('z2', (41, 5))):
        if zk in ex:
            for a, b in ((0, 0), (1, 0), (2, 0), (3, 0), (2, 1), (1, 2), (0, 3), (1, 3), (2, 3), (3, 3)): put(zx+a, zy+b, H('#FFFFFF'))
            for a, b in ((0, 0), (1, 0), (2, 0), (1, 1), (0, 2), (1, 2), (2, 2)): put(zx-5+a, zy+6+b, H('#FFD27A'))
type(_FOX).face = _face
def frame(v, stage, spec, phase):
    spec = dict(spec); vv = dict(v)
    if 'ear' in spec: vv['ear'] = spec.pop('ear')
    if stage == 5:   # release: happy eyes, hearts, gentle dissolve + home star
        e = spec.get('eyes', 'open'); e = e if e.split('+')[0] in ('blink', 'half', 'wink') else 'happy+' + '+'.join(e.split('+')[1:])
        return PE.render('slyte', vv, N=N, stage=5, eyes=e.rstrip('+'), dissolve=.35, hearts=True, star_home=True, phase=phase, pose=spec.get('pose'), xf=spec.get('xf', (1, 1, 0, 0)))
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
ICOL = dict(K='#3B2A5C', W='#FFFFFF', C='#FFF6E6', Y='#FFD27A', O='#F2A65A', P='#FF8FB8', R='#E8705A', G='#8CCB7E', D='#5E9E5A', B='#B9A6FF', T='#7FD4E8', N='#B07A4A', M='#8A5A3A', V='#7A5AC8')
ICONS = {  # 16x16, ink + up to 2-3 colours, hand-placed (guide 8: icons ink plus 2 colours)
 'berry': ["................","........DD......",".......D........","....KKKDKKK.....","...KVVKVVVVK....","..KVWVVKVVVVK...","..KVVVVKVWVVK...","..KKKVVVVVVKK...","..KVVVKKKVVVK...","..KVWVVVKVVVK...","..KVVVVVKVVK....","...KVVVVKKK.....","....KKKKK.......","................","................","................"],
 'honey': ["................","................","....KKKKKKKK....","...KYYYYYYYYK...","..KYYWYYYYOYYK..","..KYYYYYYYYYYK..","..KOOOOOOOOOOK..","..KYYYYYYYYYYK..","..KYYYYYWYYYYK..","..KOOOOOOOOOOK..","..KYYYYYYYYYYK..","...KKKKKKKKKK...","................","................","................","................"],
 'nut': ["................",".......KK.......","......KMMK......","....KKMMMMKK....","...KMMMMMMMMK...","...KKKKKKKKKK...","...KNNNNNNNNK...","...KNWNNNNNNK...","...KNNNNNNNNK...","....KNNNNNNK....",".....KNNNNK.....","......KKKK......","................","................","................","................"],
 'apple': ["................",".......K.DD.....",".......KDD......","....KKKKKKK.....","...KRRRRRRRK....","..KRWRRRRRRRK...","..KRWRRRRRRRK...","..KRRRRRRRRRK...","..KRRRRRRRRRK...","..KRRRRRRRRRK...","...KRRRRRRRK....","....KKRKRKK.....",".....K.K.K......","................","................","................"],
 'fish': ["................","................","................",".....KKKKK......","...KKTTTTTKK..KK","..KTWTTTTTTTKKTK",".KTKTTTTTTTTTTTK",".KTTTTTTTTTTKKTK","..KTTTTTTTTK..KK","...KKTTTTKK.....",".....KKKK.......","................","................","................","................","................"],
 'meat': ["................","................","..........KK....",".........KWWK...",".....KKKKWWK....","...KKRRRKKK.....","..KRRWRRRRK.....","..KRRRRRRRK.....","..KRRRRRRK......","...KRRRRK.......","....KKKK........","................","................","................","................","................"],
 'water': ["................",".......K........","......KTK.......","......KTK.......",".....KTTTK......",".....KTTTK......","....KTWTTTK.....","....KTWTTTK.....","...KTTTTTTTK....","...KTTTTTTTK....","...KTTTTTTTK....","....KTTTTTK.....",".....KKKKK......","................","................","................"],
 'hand': ["................","......K.K.K.....",".....KCKCKCK....",".....KCKCKCK.K..",".....KCKCKCKKCK.","..KK.KCCCCCKCK..",".KCCKKCCCCCCCK..",".KCCCKCCCCCCK...","..KCCCCCCCCCK...","...KCCCCCCCK....","....KCCCCCK.....",".....KKKKK......","................","................","................","................"],
 'moon': ["................","......KKKK......","....KKYYYK......","...KYYYKK.......","..KYYYK.........","..KYYK..........","..KYYK..........","..KYYK..........","..KYYYK.........","...KYYYKK.......","....KKYYYKKKK...","......KKKKYK....","................","................","................","................"],
 'book': ["................","................","..KKKKKK.KKKKKK.","..KCCCCCKCCCCCK.","..KCKKKCKCKKKCK.","..KCCCCCKCCCCCK.","..KCKKKCKCKKKCK.","..KCCCCCKCCCCCK.","..KCKKCCKCKKCCK.","..KCCCCCKCCCCCK.","..KPPPPPKPPPPPK.","...KKKKKKKKKKK..","................","................","................","................"],
 'question': ["................","......KKKK......",".....KYYYYK.....","....KYYKKYYK....","....KYK..KYK....","........KYYK....",".......KYYK.....","......KYYK......","......KYYK......","......KKKK......","......KYYK......","......KKKK......","................","................","................","................"],
 'close': ["................","................","...KK......KK...","..KPPK....KPPK..","...KPPK..KPPK...","....KPPKKPPK....",".....KPPPPK.....","......KPPK......",".....KPPPPK.....","....KPPKKPPK....","...KPPK..KPPK...","..KPPK....KPPK..","...KK......KK...","................","................","................"],
 'sticker': ["................",".......KK.......","......KYYK......","......KYYK......","..KKKKKYYKKKKK..","..KYYYYYYYYWYK..","...KYYYYYYYYK...","....KYYYYYYK....","....KYYKKYYK....","...KYYK..KYYK...","...KKK....KKK...","................","................","................","................","................"],
 'sparkle': ["................",".......K........","......KYK.......","......KYK.......","....KKYWYKK.....","...KYYWWWYYK....","....KKYWYKK.....","......KYK...K...","......KYK..KYK..",".......K....K...","..K.............",".KYK............","..K.............","................","................","................"],
 'gem': ["................","................","....KKKKKKK.....","...KTWTTTTTK....","..KTWWTTTTTTK...","..KKKKKKKKKKK...","...KTTWTTTTK....","....KTTTTTK.....",".....KTTTK......","......KTK.......",".......K........","................","................","................","................","................"],
 'heart': ["................","................","...KK....KK.....","..KPPK..KPPK....",".KPWPPKKPPPPK...",".KPWPPPPPPPPK...",".KPPPPPPPPPPK...","..KPPPPPPPPK....","...KPPPPPPK.....","....KPPPPK......",".....KPPK.......","......KK........","................","................","................","................"],
 'tree': ["................","......KKKK......","....KKGGGGKK....","...KGGWGGGGGK...","..KGGGGGGGDGGK..","..KGDGGGGGGGGK..","..KGGGGGDGGGGK..","...KKGGGGGGKK...",".....KKNNKK.....","......KNNK......","......KNNK......","....KKKKKKKK....","................","................","................","................"],
 'talk': ["................","................","..KKKKKKKKKKK...",".KCCCCCCCCCCCK..",".KCKKCKKCKKCCK..",".KCCCCCCCCCCCK..",".KCKKKCKKKKCCK..",".KCCCCCCCCCCCK..","..KKKKCCKKKKK...","......KCK.......","......KK........","................","................","................","................","................"],
 'yes': ["................","................","................","............KK..","...........KGK..","..........KGK...","..KK.....KGK....",".KGGK...KGK.....","..KGGK.KGK......","...KGGKGK.......","....KGGK........",".....KK.........","................","................","................","................"],
 'no': ["................","................","....KKKKKKK.....","...KCCCCCCCK....","..KCCCCCCCCCK...","..KCKKCCCKKCK...","..KCCCCCCCCCK...","..KCCKKKKKCCK...","..KCCCCCCCCCK...","...KCCCCCCCK....","....KKKKKKK.....","................","................","................","................","................"],
 'ear': ["................","....KKKKK.......","...KCCCCCK......","..KCCKKKCCK.....","..KCKPPPKCK.....","..KCKPKKCCK.....","..KCCKPKCK......","...KCCKCCK......","....KCCCK.......",".....KCCK.......","......KK........","................","................","................","................","................"],
 'smile': ["................","................","....KKKKKKK.....","...KYYYYYYYK....","..KYYKYYYKYYK...","..KYYKYYYKYYK...","..KYYYYYYYYYK...","..KYKYYYYYKYK...","..KYYKKKKKYYK...","...KYYYYYYYK....","....KKKKKKK.....","................","................","................","................","................"],
 'laugh': ["................","................","....KKKKKKK.....","...KYYYYYYYK....","..KYKYKYKYKYK...","..KYYYYYYYYYK...","..KYKKKKKKKYK...","..KYKPPPPPKYK...","..KYYKPPPKYYK...","...KYYKKKYYK....","....KKKKKKK.....","................","................","................","................","................"],
 'silly': ["................","................","....KKKKKKK.....","...KYYYYYYYK....","..KYKYYYYKKYK...","..KYYYYYYYYYK...","..KYYYYYYYYYK...","..KYKKKKKKKYK...","..KYYYKPPKYYK...","...KYYKPPKYK....","....KKKKKKK.....","................","................","................","................","................"],
 'wow': ["................","................","....KKKKKKK.....","...KYYYYYYYK....","..KYKKYYYKKYK...","..KYKKYYYKKYK...","..KYYYYYYYYYK...","..KYYYKKKYYYK...","..KYYYKPKYYYK...","...KYYKKKYYK....","....KKKKKKK.....","................","................","................","................","................"],
 'later': ["................","................","....KKKKKKK.....","...KCCCCCCCK....","..KCCCCKCCCCK...","..KCCCCKCCCCK...","..KCCCCKCCCCK...","..KCCCCKKKCCK...","..KCCCCCCCCCK...","...KCCCCCCCK....","....KKKKKKK.....","................","................","................","................","................"],
}
def bake_icons():
    for nm, rows in ICONS.items():
        im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
        for y, r in enumerate(rows):
            for x, ch in enumerate(r):
                if ch != '.': im.putpixel((x, y), PE.H(ICOL[ch]))
        im.save(f'{OUT}/i_{nm}.png')
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
    bake_icons()
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
