#!/usr/bin/env python3
"""Music Phase 1 step 4 drop-in: Cole's reviewed music tags + step 4 lines in one command.

  python3 tools/step4_dropin.py [/workspace/echo/pm/music_phase1/cole_out/step4]

Expects in that folder (either file may be missing; it applies what is there):
  music_tags_reviewed.json  tools/music_tags/proposals.json with accept true/false per item (tag may be changed)
  lines.json                {"slyte"|"whimber"|"twitchel": {"<bark key>": [line, ...]}}; mission_* keys REPLACE the
                            placeholder pools; any other key is APPENDED (new music lines for ambient, games, ...)
Then runs both dialogue lints, tools/test-missions.js and tools/test-music-share.js --strict (18-25% on the shipped corpus).
"""
import json, os, re, subprocess, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/echo/pm/music_phase1/cole_out/step4'
TAGS = {'pulse','highlow','loudsoft','fastslow','timbre','contour','rhythm','mood','form','song'}
files = {f: os.path.join(ROOT, 'dialogue', f + '.json') for f in ('shared', 'slyte', 'whimber', 'twitchel')}
raw = {f: open(p, encoding='utf-8').read() for f, p in files.items()}; dlg = {f: json.loads(s) for f, s in raw.items()}
n_tag = n_line = 0; bad = []
rv = os.path.join(SRC, 'music_tags_reviewed.json')
if os.path.exists(rv):
    for it in json.load(open(rv, encoding='utf-8'))['items']:
        if it.get('accept') is not True: continue
        f = it['file'].replace('.json', ''); pool = dlg[f]['barks'].get(it['key']) or []
        l = pool[it['i']] if it['i'] < len(pool) else None
        if not l or l.get('text') != it['text']: bad.append(f"{it['file']} {it['key']}[{it['i']}] text moved"); continue
        if it['tag'] not in TAGS: bad.append(f"{it['key']} bad tag {it['tag']}"); continue
        l['music'] = it['tag']; n_tag += 1
ln = os.path.join(SRC, 'lines.json')
if os.path.exists(ln):
    for f, keys in json.load(open(ln, encoding='utf-8')).items():
        for k, lines in keys.items():
            b = dlg[f]['barks']
            if k.startswith('mission_'): b[k] = lines
            else: b[k] = (b.get(k) or []) + lines
            n_line += len(lines)
if bad: print('NOT APPLIED:\n  ' + '\n  '.join(bad)); sys.exit(1)
for f, p in files.items():
    out = json.dumps(dlg[f], indent=2, ensure_ascii=False) + ('\n' if raw[f].endswith('\n') else '')
    if out != raw[f]: open(p, 'w', encoding='utf-8').write(out)
left = sum(1 for f in dlg for p in dlg[f]['barks'].values() for l in p if (l.get('context') or {}).get('placeholder'))
print(f"applied {n_tag} tags, {n_line} lines; placeholder lines left: {left}")
rc = 0
for cmd in (['python3', 'tools/lint_dialogue.py'], ['node', 'tools/lint-dialogue.js', 'dialogue'], ['node', 'tools/test-missions.js'], ['node', 'tools/test-music-share.js', '--strict']):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True); print('==', ' '.join(cmd), '->', (r.stdout.strip().splitlines() or [''])[-1]); rc |= r.returncode
sys.exit(rc)
