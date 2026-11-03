#!/usr/bin/env python3
"""Cole Phase B (Nov 3) drop-in: applies /workspace/echo/dialogue_v2/cole_overrides_phaseB.json (phaseB_lines.csv + lift50.csv)
to dialogue/*.json in place, by pre-cut id <fam>:b:<key>:<i>. A cut line becomes the tombstone {"text":"","cut":true} at its own
index, so no id after it shifts (review CSVs, lint/allowlist ids, cole_overrides_nov1.json, history stay valid); dialogue.js D.use
drops tombstones at load, so every picker sees only live lines. Every row checks its 'before' text first (refuses on a mismatch).
Idempotent: a row already applied is counted, not re-applied. The generator applies the same file (build_dialogue_v2.py), so a
rebuild keeps these lines. Usage: python3 tools/apply_phaseB.py [--check]"""
import json, os, sys
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OVR = '/workspace/echo/dialogue_v2/cole_overrides_phaseB.json'
ovr = {k: v for k, v in json.load(open(OVR, encoding='utf-8')).items() if not k.startswith('_')}
docs = {}; n = {'applied': 0, 'cut': 0, 'already': 0}; bad = []
for fid, v in ovr.items():
    fam, _, key, i = fid.split(':'); i = int(i)
    d = docs.setdefault(fam, json.load(open(os.path.join(R, 'dialogue', fam + '.json'), encoding='utf-8')))
    L = d['barks'][key]; cur = L[i]
    if v.get('cut'):
        if cur.get('cut'): n['already'] += 1; continue
        if cur.get('text') != v['before']: bad.append((fid, cur.get('text'), v['before'])); continue
        L[i] = {'text': '', 'cut': True}; n['cut'] += 1
    else:
        if cur.get('text') == v['text'] and cur.get('short') == v['short']: n['already'] += 1; continue
        if cur.get('text') != v['before']: bad.append((fid, cur.get('text'), v['before'])); continue
        cur['text'] = v['text']; cur['short'] = v['short']; n['applied'] += 1
for b in bad: print('BEFORE MISMATCH', *b)
if bad: sys.exit(1)
if '--check' not in sys.argv:
    for fam, d in docs.items():
        with open(os.path.join(R, 'dialogue', fam + '.json'), 'w', encoding='utf-8') as f: json.dump(d, f, ensure_ascii=False, indent=2)
print('phaseB:', n)
