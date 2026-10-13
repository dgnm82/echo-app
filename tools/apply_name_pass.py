#!/usr/bin/env python3
"""Applies origin_v2/families_v1/dialogue/name_replacements.json to dialogue/*.json BY ID (bark+i, or conv+node+choice+field),
checking that `old` matches first. Family words are written as {var:family}/{var:family_plural} so a family rename stays data-only
(families.js); game.js sets those vars on every save. Icons: entries with `icon` swap the choice icon (fox/owl -> paw/feather)."""
import json, re, sys
SRC = '/workspace/echo/origin_v2/families_v1/dialogue/name_replacements.json'
FAM = [('Howlings', '{var:family_plural}'), ('Wingsongs', '{var:family_plural}'), ('Howling', '{var:family}'), ('Wingsong', '{var:family}')]
def famvar(t):
  for a, b in FAM: t = re.sub(r'\b' + a + r'\b', b, t)
  return t
E_ = json.load(open(SRC)); files = {}; ok = miss = done = 0
for e in E_:
  f = e['file']; d = files.setdefault(f, json.load(open(f)))
  if 'bark' in e: obj = d['barks'][e['bark']][e['i']]
  else:
    c = next(c for c in d['conversations'] if c['id'] == e['conv']); nodes = c['nodes']
    n = nodes[e['node']] if isinstance(nodes, dict) else next(x for x in nodes if x.get('id') == e['node'])
    obj = n['choices'][e['choice']] if e.get('choice') is not None else n
  new = famvar(e['new'])
  if obj.get(e['field']) == new: done += 1; continue
  if obj.get(e['field']) != e['old']: miss += 1; print('MISS', e.get('conv') or e.get('bark'), e.get('node'), e.get('choice'), e['field'], repr(obj.get(e['field']))[:80]); continue
  obj[e['field']] = new; ok += 1
  if e.get('icon'): obj['icon'] = e['icon']
for f, d in files.items(): json.dump(d, open(f, 'w'), ensure_ascii=False, indent=1)
print(f'applied {ok}, already {done}, missed {miss} of {len(E_)}'); sys.exit(1 if miss else 0)
