#!/usr/bin/env python3
"""Music School step 2: render the note one-shots the Ancient Echoes need (fa, ti, half-steps) that music/notes/ does not have yet.
Same music-box recipe as every existing Echo It Back note (Batch D make_audio.py one_shot: musicbox inst, palette per family,
-20 LUFS / peak -3 dBFS, .ogg q3 + 8-bit .wav) on the project chip engine (/workspace/echo/sound_design/v2/src/chip.py via purr_audio).

  python3 tools/render_songbook_notes.py --list                 # what is missing (no rendering)
  python3 tools/render_songbook_notes.py                        # render the missing ones into music/notes/
  python3 tools/render_songbook_notes.py --tunes F.json --out DIR [--list]   # fixtures / tests
Cole checks that new renders sound like the existing notes (his ear sign-off)."""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_songbook import FAMS, eib, midi, sample_of

def needed(sb, E):
    out = {}
    for fam in FAMS:
        for t in sb.get(fam, []):
            for x in t['echo']['n'] + [y for ph in t['child'] for y in ph['n']]:
                if x[0]: m = midi(fam, E, x); out[sample_of(fam, m)] = (fam, m)
    return out

def render(name, fam, m, d):
    sys.path.insert(0, '/workspace/echo/sound_design/v2/src'); sys.path.insert(0, '/workspace/echo/purrlings_v1/src')
    import purr_audio as PA
    from purr_audio import music, Song
    PA.BUILD = '/tmp/echo_songbook_build'; os.makedirs(PA.BUILD, exist_ok=True)
    s = Song(name, 60e6 / 120 / 4, 6, loop=False, lp=7500, echo_ms=180, echo_fb=0.2, echo_wet=0.12)   # = make_audio.py one_shot()
    music.palette(s, fam); music.kit(s, None); s.note(0, 0, m, 4, 'musicbox', 104)
    data, x = PA.level(s, -20.0, -3.0)
    return PA.export(name, x, data, d)

def main(a):
    def opt(k, dflt=None): return a[a.index(k) + 1] if k in a else dflt
    tp = opt('--tunes'); d = opt('--out', os.path.join(ROOT, 'music/notes'))
    sb = json.load(open(tp)) if tp else json.load(open(os.path.join(ROOT, 'music/tunes.json'))).get('songbook', {})
    E = eib(); need = needed(sb, E); have = os.path.join(ROOT, 'music/notes')
    miss = {k: v for k, v in sorted(need.items()) if not (os.path.exists(f'{have}/{k}.ogg') or os.path.exists(f'{d}/{k}.ogg'))}
    print(f'{len(need)} note(s) used by the Ancient Echoes, {len(miss)} missing' + (': ' + ' '.join(miss) if miss else ''))
    if '--list' in a or not miss: return
    os.makedirs(d, exist_ok=True)
    for k, (fam, m) in miss.items():
        assert 60 <= m <= 84, (k, m)
        r = render(k, fam, m, d); print('rendered', k, r)

if __name__ == '__main__': main(sys.argv[1:])
