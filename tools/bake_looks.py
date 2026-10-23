#!/usr/bin/env python3
"""Unified 20-Animal Baker (Sprites v3): bakes all 20 animal looks across all 3 families
(slyte: Howlings [4+default], whimber: Wingsongs [9+aliases], twitchel: Purrlings [7+default])
directly from the unified master rig in tools/family_engine.py.
Outputs into px/:
  - <fam>[_<look>]_<pal>_f<0..3>.png        (1344x48, 28-frame stage-4 home sheet, sparkles stripped for runtime glow)
  - <fam>[_<look>]_<pal>_f<0..3>_light.png  (288x48, 6-frame stage-1 origin invite idle strip)
  - <fam>[_<look>]_<pal>_f<0..3>_ev.png     (720x96, arrival + release dissolve sheets)
  - <fam>[_<look>]_<pal>_f<0..3>_walk.png   (624x48, 13-frame side-on walk/trot/pounce strip for canines & felines)
  - <fam>[_<look>]_<pal>_walk.png           (legacy alias of _f1_walk.png)
  - <fam>[_<look>]_<pal>_f<0..3>_fly.png    (192x48, 4-frame wingbeat strip for birds, preserving the bird's exact preset!)
  - <fam>[_<look>]_<pal>_sleep.png          (192x48, 4-frame side/curled sleep strip)
  - <fam>[_<look>]_<pal>_run.png            (384x48, 8-frame combined runner strip for handheld build_packs.py)
  - px/run/[<look>/]<pal>/<fam>_<frame>.png (individual 48x48 runner/glide frames for web & mini-games)
  - px/home/tail_<fam>[_<look>]_<pal>.png   (30x26 home tail sprite draped over log/basket lip)
Also writes px/looks_meta.json (frame colour check: <= 16 colours incl. transparent, 0 pure black).
Run: python3 tools/bake_looks.py [look ...]
"""
import os, sys, json, shutil
from multiprocessing import Pool, cpu_count
from PIL import Image

T_DIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(T_DIR)
sys.path[:0] = [T_DIR, '/workspace/echo/style_research/src', '/workspace/echo/origin_v2/src']

import bake_pixel as BP, bake_events as BE, bake_whimber as BW, bake_whimber_fly as BF
import family_engine as FE, pixel_engine as PE, slyte_fox as SF

OUT = os.path.join(REPO, 'px')
N = 48
SPARK = {(255, 255, 255), (255, 210, 122)}

# Palettes per family (chip palettes + legacy seeded palettes for base looks)
PALS_CHIP = {
    'slyte':    ['dusk-plum', 'cocoa-cream', 'ember-russet', 'sunset-gold-solid', 'snow-blush', 'moon-lilac',
                 'mint-teal-solid', 'sky-periwinkle-solid', 'violet-rose-solid', 'rose-sapphire-solid'],
    'whimber':  ['crow-dusk', 'wren-cocoa', 'robin-ember', 'dove-mist', 'sun-finch', 'sky-teal',
                 'mint-aurora-solid', 'peach-dusk-solid', 'plum-blush', 'lilac-night'],
    'twitchel': ['dusk-plum', 'moon-lilac', 'ember-russet', 'sunset-gold-solid', 'snow-blush', 'cocoa-cream',
                 'tan-sand', 'mint-teal-solid', 'rose-sapphire-solid', 'violet-rose-solid'],
}
PALS_BASE_EXTRA = {
    'slyte':    ['mint-teal', 'violet-rose', 'sunset-gold', 'rose-sapphire', 'teal-gold', 'sky-periwinkle'],
    'whimber':  ['mint-aurora', 'peach-dusk'],
    'twitchel': [],
}
LOOKS = {
    'slyte':    ['fox', 'dog', 'wolf', 'coyote', 'howling'],
    'whimber':  ['owl', 'wingsong', 'duck', 'dove', 'pigeon', 'crow', 'eagle', 'chicken', 'gull'],
    'twitchel': ['cat', 'lion', 'tiger', 'leopard', 'cheetah', 'snowleopard', 'lynx'],
}
BASE_LOOK = {'slyte': 'fox', 'whimber': 'owl', 'twitchel': 'cat'}

def _flat_data(im):
    return list(im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata())

def unspark(im):
    px = im.load(); W, Hh = im.size; seen = set(); n = 0
    sp = lambda c, d: 0 <= c < W and 0 <= d < Hh and px[c, d][3] and px[c, d][:3] in SPARK
    clear = lambda c, d: not (0 <= c < W and 0 <= d < Hh) or not px[c, d][3]
    for y in range(Hh):
        for x in range(W):
            if (x, y) in seen or not sp(x, y): continue
            comp, st = [], [(x, y)]; seen.add((x, y))
            while st:
                a, b = st.pop(); comp.append((a, b))
                for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                    if (c, d) not in seen and sp(c, d): seen.add((c, d)); st.append((c, d))
            if len(comp) <= 5 and any(clear(c, d) for a, b in comp for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1))):
                for p in comp: px[p] = (0, 0, 0, 0)
                n += 1
    return n

def identity_keep(fam, look, pal):
    v = BW.preset(pal, 1) if fam == 'whimber' else dict(SF.BASE, palette=pal, fluff=1, seed=7)
    sp_key = 'slyte' if fam == 'twitchel' else fam
    with FE.species(fam, look):
        C = PE.SPECIES[sp_key].palette(v)
    keep = {C[k] for k in ('ink', 'eye', 'pupil', 'iris', 'blush', 'beak', 'beak_d', 'white', 'gem', 'gem_l', 'earin') if k in C}
    keep |= {'#F0504A', '#C83848', '#FF9EC0', '#FF8FB8', '#FFFFFF', '#2A1A3A', '#F7A04A', '#F7B24A', '#FFD84A', '#FFB020'}
    return {PE.H(c)[:3] for c in keep}

def cap16(im, w=48, keep=None):
    """<= 16 colours incl. transparent per frame: merge the closest non-identity colour pair (or rarest if needed) and strip any #000000."""
    keep = keep or set()
    for x in range(0, im.width, w):
        for y in range(0, im.height, w):
            fr = im.crop((x, y, x + w, y + w))
            data = _flat_data(fr)
            if any(p[3] and p[:3] == (0, 0, 0) for p in data):
                data = [(0x24, 0x16, 0x2C, p[3]) if (p[3] and p[:3] == (0, 0, 0)) else p for p in data]
                fr.putdata(data)
            while len(fr.getcolors(4096) or []) > 16:
                cs_all = [c for c in fr.getcolors(4096) if c[1][3]]
                if len(cs_all) + 1 <= 16:
                    break
                cs = [c[1] for c in cs_all]
                counts = {c[1]: c[0] for c in cs_all}
                best = None
                for i, a in enumerate(cs):
                    for b in cs[i + 1:]:
                        if a[:3] in keep and b[:3] in keep: continue
                        d = sum((u - v) ** 2 for u, v in zip(a[:3], b[:3]))
                        if best is None or d < best[0]: best = (d, a, b)
                if best is None:
                    cs_sorted = sorted(cs_all, key=lambda c: c[0])
                    src = cs_sorted[0][1]
                    dst = min((c[1] for c in cs_sorted[1:]), key=lambda q: sum((a - b) ** 2 for a, b in zip(q[:3], src[:3])))
                else:
                    _, a, b = best
                    src, dst = (a, b) if a[:3] not in keep else (b, a)
                    if src[:3] not in keep and dst[:3] not in keep and counts[src] > counts[dst]:
                        src, dst = dst, src
                fr.putdata([dst if q == src else q for q in _flat_data(fr)])
            im.paste(fr, (x, y))
    return im

def strip_row(frs, w=48):
    im = Image.new('RGBA', (w * len(frs), w), (0, 0, 0, 0))
    for i, f in enumerate(frs):
        im.alpha_composite(f, (i * w, 0))
    return im

def strip_grid(rows, w=48):
    im = Image.new('RGBA', (w * max(len(r) for r in rows), w * len(rows)), (0, 0, 0, 0))
    for j, r in enumerate(rows):
        for i, f in enumerate(r):
            im.alpha_composite(f, (i * w, j * w))
    return im

def bake_one(job):
    fam, look, pal = job
    is_base = (look == BASE_LOOK[fam])
    keep = identity_keep(fam, look, pal)
    st = {'frames': 0, 'max': 0, 'over16': 0, 'black': 0}

    def record_and_save(im, path, w=48):
        im = cap16(im, w=w, keep=keep)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        im.save(path, optimize=True)
        for x in range(0, im.width, w):
            for y in range(0, im.height, w):
                fr = im.crop((x, y, x + w, y + w))
                cs = fr.getcolors(4096) or []
                if not any(c[1][3] for c in cs): continue
                n = len(cs)
                st['frames'] += 1; st['max'] = max(st['max'], n); st['over16'] += (n > 16)
                st['black'] += any(c[1][3] and c[1][:3] == (0, 0, 0) for c in cs)
        return im

    prefixes = [f'{OUT}/{fam}_{look}_{pal}']
    if is_base:
        prefixes.append(f'{OUT}/{fam}_{pal}')
    if fam == 'whimber' and look == 'wingsong':
        prefixes.append(f'{OUT}/whimber_bird_{pal}')
        prefixes.append(f'{OUT}/whimber_songbird_{pal}')

    primary_pre = prefixes[0]
    alias_pres = prefixes[1:]

    with FE.species(fam, look):
        for fl in range(4):
            if fam == 'whimber':
                v = BW.preset(pal, fl)
                home_frs = [BW.frame(v, 4, dict(spec, nspark=0), i % 4) for i, (nm, spec) in enumerate(BW.FRAMES)]
                for f in home_frs: unspark(f)
                light_frs = [BW.frame(v, 1, spec, i % 4) for i, (nm, spec) in enumerate(BW.FRAMES[:6])]
                ev_rows = [BW.arrival(v), BW.release(v)]
                fly_frs = [PE.render('whimber', v, N=N, stage=4, halo=None, nspark=0, phase=i, **spec) for i, (nm, spec) in enumerate(BF.FLY)]
                for f in fly_frs: unspark(f)

                record_and_save(strip_row(home_frs), f'{primary_pre}_f{fl}.png')
                record_and_save(strip_row(light_frs), f'{primary_pre}_f{fl}_light.png')
                record_and_save(strip_grid(ev_rows), f'{primary_pre}_f{fl}_ev.png')
                record_and_save(strip_row(fly_frs), f'{primary_pre}_f{fl}_fly.png')
                for ap in alias_pres:
                    for suf in ('', '_light', '_ev', '_fly'):
                        shutil.copyfile(f'{primary_pre}_f{fl}{suf}.png', f'{ap}_f{fl}{suf}.png')
            else:
                v = dict(SF.BASE, palette=pal, fluff=fl, seed=7)
                home_frs = [BP.frame(v, 4, dict(spec, nspark=0), i % 4) for i, (nm, spec) in enumerate(BP.FRAMES)]
                for f in home_frs: unspark(f)
                light_frs = [BP.frame(v, 1, spec, i % 4) for i, (nm, spec) in enumerate(BP.FRAMES[:6])]
                ev_rows = [BE.arrival(v), BE.release(v)]
                walk_frs = FE.walk_frames(fam, look, v, N=N)

                record_and_save(strip_row(home_frs), f'{primary_pre}_f{fl}.png')
                record_and_save(strip_row(light_frs), f'{primary_pre}_f{fl}_light.png')
                record_and_save(strip_grid(ev_rows), f'{primary_pre}_f{fl}_ev.png')
                record_and_save(strip_row(walk_frs), f'{primary_pre}_f{fl}_walk.png')
                if fl == 1:
                    shutil.copyfile(f'{primary_pre}_f1_walk.png', f'{primary_pre}_walk.png')
                for ap in alias_pres:
                    for suf in ('', '_light', '_ev', '_walk'):
                        shutil.copyfile(f'{primary_pre}_f{fl}{suf}.png', f'{ap}_f{fl}{suf}.png')
                    if fl == 1:
                        shutil.copyfile(f'{primary_pre}_walk.png', f'{ap}_walk.png')

    # Sleep sheet (4 cols, 192x48)
    slp_frs = FE.sleep_frames(fam, look, pal, fl=1, N=N)
    record_and_save(strip_row(slp_frs), f'{primary_pre}_sleep.png')
    for ap in alias_pres:
        shutil.copyfile(f'{primary_pre}_sleep.png', f'{ap}_sleep.png')

    # Runner / Mini-game frames (px/run/[<look>/]<pal>/ + combined <prefix>_run.png strip)
    rset = FE.runner_set(fam, look, pal, fl=1, repo_px=OUT)
    run_dirs = [f'{OUT}/run/{look}/{pal}']
    if is_base:
        run_dirs.append(f'{OUT}/run/{pal}')
    if fam == 'whimber' and look == 'wingsong':
        run_dirs.append(f'{OUT}/run/bird/{pal}')
        run_dirs.append(f'{OUT}/run/songbird/{pal}')

    p_rdir = run_dirs[0]
    os.makedirs(p_rdir, exist_ok=True)
    capped_rset = {}
    for k, im in rset.items():
        fn = f'{fam}_{k}.png'
        capped_rset[k] = record_and_save(im, f'{p_rdir}/{fn}')
        for adir in run_dirs[1:]:
            os.makedirs(adir, exist_ok=True)
            shutil.copyfile(f'{p_rdir}/{fn}', f'{adir}/{fn}')

    # Legacy top-level fallback in px/run/<fam>_<k>.png for the default palette
    if (fam == 'slyte' and is_base and pal == 'mint-teal') or (fam == 'whimber' and is_base and pal == 'lilac-night'):
        for k, im in capped_rset.items():
            shutil.copyfile(f'{p_rdir}/{fam}_{k}.png', f'{OUT}/run/{fam}_{k}.png')

    # Combined 8-col 384x48 `<prefix>_run.png` strip
    rstrip = FE.run_strip8(capped_rset, fam)
    record_and_save(rstrip, f'{primary_pre}_run.png')
    for ap in alias_pres:
        shutil.copyfile(f'{primary_pre}_run.png', f'{ap}_run.png')

    # Home tail (30x26 crop draped over log/basket lip) for ground families
    if fam in ('slyte', 'twitchel'):
        tl_im = FE.home_tail(fam, look, pal)
        tl_im = cap16(tl_im, w=30, keep=keep)
        t_paths = [f'{OUT}/home/tail_{fam}_{look}_{pal}.png']
        if is_base:
            t_paths.append(f'{OUT}/home/tail_{fam}_{pal}.png')
        os.makedirs(f'{OUT}/home', exist_ok=True)
        tl_im.save(t_paths[0], optimize=True)
        for tp in t_paths[1:]:
            shutil.copyfile(t_paths[0], tp)

    # Handheld 32px sheets for Purrlings (px/hh/twitchel_<look>_<pal>*.png)
    if fam == 'twitchel' and pal in PALS_CHIP['twitchel']:
        v32 = dict(SF.BASE, palette=pal, fluff=FE.FEL[look]['fluff'], seed=7)
        old_N = BP.N; BP.N = 32
        try:
            with FE.species('twitchel', look):
                h32 = [BP.frame(v32, 4, dict(s, nspark=0), i % 4) for i, (nm, s) in enumerate(BP.FRAMES)]
                l32 = [BP.frame(v32, 1, s, i % 4) for i, (nm, s) in enumerate(BP.FRAMES[:6])]
        finally:
            BP.N = old_N
        for f in h32: unspark(f)
        s32 = FE.sleep_frames('twitchel', look, pal, fl=FE.FEL[look]['fluff'], N=32)
        hh_pre = f'{OUT}/hh/twitchel_{look}_{pal}'
        record_and_save(strip_row(h32, 32), f'{hh_pre}.png', w=32)
        record_and_save(strip_row(l32, 32), f'{hh_pre}_light.png', w=32)
        record_and_save(strip_row(s32, 32), f'{hh_pre}_sleep.png', w=32)

    return fam, look, pal, st

if __name__ == '__main__':
    if sys.argv[1:2] == ['--cap16']:
        import glob
        for f in sys.argv[2:]:
            for q in glob.glob(f): cap16(Image.open(q).convert('RGBA')).save(q, optimize=True)
        sys.exit(0)

    only = set(sys.argv[1:])
    jobs = []
    for fam, looks in LOOKS.items():
        for look in looks:
            if only and look not in only and fam not in only:
                continue
            pals = PALS_CHIP[fam] + (PALS_BASE_EXTRA[fam] if look == BASE_LOOK[fam] else [])
            for pal in pals:
                jobs.append((fam, look, pal))

    meta = {'frames': 0, 'max': 0, 'over16': 0, 'black': 0}
    n_workers = min(8, cpu_count() or 4)
    with Pool(n_workers) as pool:
        for fam, look, pal, st in pool.imap_unordered(bake_one, jobs):
            meta['frames'] += st['frames']
            meta['max'] = max(meta['max'], st['max'])
            meta['over16'] += st['over16']
            meta['black'] += st['black']
            print(f'{fam:8s} {look:11s} {pal:20s} -> {st["frames"]} frames (max {st["max"]} cols)', flush=True)

    if not only:
        json.dump(dict(meta, looks=LOOKS, palettes=PALS_CHIP), open(f'{OUT}/looks_meta.json', 'w'), indent=1)
    print('DONE:', meta)
