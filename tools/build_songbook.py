#!/usr/bin/env python3
"""Music School step 2: build the tunes.json "songbook" block (Ancient Echoes) from Cole's transcriptions.

  python3 tools/build_songbook.py                 # tools/songbook_src/<fam>/<id>.txt -> music/tunes.json "songbook"
  python3 tools/build_songbook.py --check         # parse + validate only, write nothing
  python3 tools/build_songbook.py --src DIR --out FILE.json [--fixture] [--include-held]   # tests / fixtures

Source format (one file per tune, tools/songbook_src/<fam>/<id>.txt; '#' starts a comment):
  id: hall_mountain_king            must be a canonical id of that family in px/songbook/manifest.json
  title: In the Hall of the Mountain King
  composer: Edvard Grieg
  home: la                          do (major) | la (minor, stored in relative-major degrees)
  meter: 4
  bpm: 96
  mood: playful-spooky
  skills: fastslow loudsoft          optional, space separated
  min_ml: 1                          optional (default 1)
  source: Grieg (d.1907). Peer Gynt Suite No.1 Op.46, Peters, Leipzig 1888, p.3 (IMSLP). Melody only, own arrangement.   (-> prov, < 200 chars)
  prov_status: ok                    ok | edition_check (edition_check tunes are held back: never shipped)
  echo: la4:12 ti4:12 do5:12 re5:12 | mi5:12 do5:12 mi5:24      the Echo's version; more echo: lines are appended; '|' = bar line (ignored)
  child: la4:12 do5:12 re5:6 mi5:6 do5:12 mi5:24                  one child: line per phrase (3-8 notes, on the family pads, pentatonic)
Notes: <do|re|mi|fa|sol|la|ti>[#|b]<octave>:<ticks>   (12 ticks = 1 beat); r:<ticks> = rest (echo only).
The octave number counts from the family's do: do4 = the family key note (slyte d4, whimber bb4, twitchel f4), so la4 is the la above do4.
'#'/'b' (a half-step up/down) is allowed in echo: lines only (Song v2 acc); child phrases never have half-steps, fa or ti.
"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAMS = ('slyte', 'whimber', 'twitchel')
SOL = {'do': 1, 're': 2, 'mi': 3, 'fa': 4, 'sol': 5, 'la': 6, 'ti': 7}
MAJ = [0, 2, 4, 5, 7, 9, 11]
SHARP = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']
FLAT = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b']
KEYS = {'id', 'title', 'composer', 'home', 'meter', 'bpm', 'mood', 'skills', 'min_ml', 'source', 'prov_status', 'echo', 'child', 'fixture'}
TOK = re.compile(r'^(do|re|mi|fa|sol|la|ti|r)(#|b)?(\d)?:(\d+)$')

def spell(fam, m): return (SHARP if fam == 'slyte' else FLAT)[m % 12] + str(m // 12 - 1)
def sample_of(fam, m): return f"{fam}_{spell(fam, m).replace('#', 's')}"     # music/notes/<fam>_<note>.ogg (# -> s)
def eib(): return json.load(open(os.path.join(ROOT, 'music/tunes.json')))['echo_it_back']
def step(d, o): return d - 1 + 7 * o
def pads(fam, E):
    out = set()
    for t in ('1', '2', '3', '4'):
        L = (E.get('unlock_t4') or {}).get(fam) if t == '4' and (E.get('unlock_t4') or {}).get(fam) else E['unlock'][t]
        for d, o in L: out.add(step(d, o))
    return out
def midi(fam, E, x): return E['do_midi'][fam] + MAJ[x[0] - 1] + 12 * x[1] + (x[3] if len(x) > 3 else 0)

def notes(line, where, err, child=False):
    out = []
    for t in line.replace('|', ' ').split():
        m = TOK.match(t)
        if not m: err(f'{where}: bad note "{t}"'); continue
        syl, acc, octv, ticks = m.group(1), m.group(2), m.group(3), int(m.group(4))
        if not 1 <= ticks <= 255: err(f'{where}: ticks {ticks} out of 1-255')
        if syl == 'r':
            if child: err(f'{where}: no rests in a child phrase')
            out.append([0, 0, ticks]); continue
        if octv is None: err(f'{where}: "{t}" needs an octave number'); continue
        x = [SOL[syl], int(octv) - 4, ticks]
        if acc:
            if child: err(f'{where}: no half-steps in a child phrase ("{t}")')
            x.append(1 if acc == '#' else -1)
        out.append(x)
    return out

def parse(path, fam, E, canon, fixture, errs):
    def err(m): errs.append(f'{os.path.relpath(path, ROOT)}: {m}')
    kv, echo, child = {}, [], []
    for i, raw in enumerate(open(path, encoding='utf-8'), 1):
        line = raw.split('#', 1)[0].strip() if not raw.lstrip().startswith('source:') else raw.strip()
        if not line: continue
        if ':' not in line: err(f'line {i}: expected "key: value"'); continue
        k, v = line.split(':', 1); k, v = k.strip(), v.strip()
        if k not in KEYS: err(f'line {i}: unknown field "{k}" (lyrics/words are never allowed)'); continue
        if k == 'echo': echo += notes(v, f'line {i}', err)
        elif k == 'child': child.append(notes(v, f'line {i}', err, child=True))
        else: kv[k] = v
    tid = kv.get('id', '')
    if tid != os.path.splitext(os.path.basename(path))[0]: err(f'id "{tid}" must match the file name')
    if not fixture and canon.get(tid) != fam: err(f'id "{tid}" is not a canonical {fam} id (px/songbook/manifest.json)')
    if fixture and kv.get('fixture') != 'yes': err('fixture tunes must say "fixture: yes"')
    for k in ('title', 'composer', 'home', 'meter', 'bpm', 'source', 'prov_status'):
        if not kv.get(k): err(f'missing "{k}:"')
    st = kv.get('prov_status', '')
    if st not in ('ok', 'edition_check'): err(f'prov_status must be ok or edition_check, not "{st}"')
    prov = kv.get('source', '')
    if len(prov) >= 200: err(f'source line is {len(prov)} chars (must be < 200)')
    bpm = int(kv.get('bpm', '0') or 0)
    if not 40 <= bpm <= 200: err(f'bpm {bpm} out of 40-200')
    if not echo: err('no echo: notes')
    if not child: err('no child: phrases')
    P = pads(fam, E)
    for x in echo:
        if x[0] and not 60 <= midi(fam, E, x) <= 84: err(f'echo note {x} is outside c4-c6')
    sec = sum(x[2] for x in echo) * 60 / bpm / 12 if bpm else 0
    for j, ph in enumerate(child, 1):
        if not 3 <= len(ph) <= 8: err(f'child phrase {j}: {len(ph)} notes (3-8)')
        for x in ph:
            if x[0] in (4, 7): err(f'child phrase {j}: fa/ti {x} (pentatonic only)')
            elif step(x[0], x[1]) not in P: err(f'child phrase {j}: {x} is not on the {fam} pads')
            if not 60 <= midi(fam, E, x) <= 84: err(f'child phrase {j}: {x} outside c4-c6')
        if len({step(x[0], x[1]) for x in ph}) > 4: err(f'child phrase {j}: more than 4 different notes')
    t = dict(id=tid, title=kv.get('title', ''), composer=kv.get('composer', ''), home=kv.get('home', 'do'), meter=int(kv.get('meter', '4') or 4), bpm=bpm,
             mood=kv.get('mood', ''), skills=kv.get('skills', '').split(), echo=dict(v=2, bpm=bpm, tpb=12, n=echo),
             child=[dict(v=1, bpm=bpm, tpb=12, n=ph) for ph in child], min_ml=int(kv.get('min_ml', '1') or 1),
             icon=f'px/songbook/{tid}.png' if not fixture else 'px/songbook/ancient_emblem.png', prov=prov, prov_status=st)
    if fixture: t['fixture'] = True
    t['_echo_seconds'] = round(sec, 2)
    return t

def build(src, fixture=False, include_held=False):
    E = eib(); errs = []
    man = json.load(open(os.path.join(ROOT, 'px/songbook/manifest.json')))
    canon = {t['id']: t['family'] for t in man['tunes'] if t.get('canonical')}
    out = {'v': 1, '_about': 'Ancient Echoes (Music School step 2). Built by tools/build_songbook.py from tools/songbook_src/<fam>/<id>.txt (Cole). '
           'echo = Song v2 (the real hook the Echo sings, acc = half-steps), child = Song v1 phrases on the family pads. Only prov_status ok ships.',
           'held': []}
    for fam in FAMS:
        out[fam] = []
        d = os.path.join(src, fam)
        for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            if not f.endswith('.txt'): continue
            t = parse(os.path.join(d, f), fam, E, canon, fixture, errs)
            if t['prov_status'] != 'ok' and not include_held: out['held'].append({'id': t['id'], 'fam': fam, 'why': t['prov_status']}); continue
            out[fam].append(t)
    return out, errs

def main(a):
    def opt(k, dflt=None): return a[a.index(k) + 1] if k in a else dflt
    src = opt('--src', os.path.join(ROOT, 'tools/songbook_src')); dst = opt('--out')
    sb, errs = build(src, fixture='--fixture' in a, include_held='--include-held' in a)
    n = sum(len(sb[f]) for f in FAMS)
    for e in errs: print('ERROR', e)
    print(f'songbook: {n} tune(s) ' + ', '.join(f'{f} {len(sb[f])}' for f in FAMS) + f'; held back (edition_check): {len(sb["held"])}; {len(errs)} error(s)')
    if errs: sys.exit(1)
    if '--check' in a: return
    if dst:
        json.dump(sb, open(dst, 'w'), ensure_ascii=False, indent=1); print('wrote', dst); return
    p = os.path.join(ROOT, 'music/tunes.json'); T = json.load(open(p)); T['songbook'] = sb
    open(p, 'w').write(json.dumps(T, ensure_ascii=False, indent=1)); print('wrote music/tunes.json "songbook"')

if __name__ == '__main__': main(sys.argv[1:])
