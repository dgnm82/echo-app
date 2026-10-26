#!/usr/bin/env python3
"""H1: merge Cole's Magic Window copy (/workspace/echo/batch_H/H1_camera_copy.json) into dialogue/shared.json barks (idempotent).
Cole's source file is read-only here. Re-run after any corpus rebuild that rewrites dialogue/shared.json."""
import json,os,sys
SRC=sys.argv[1] if len(sys.argv)>1 else '/workspace/echo/batch_H/H1_camera_copy.json'
DST=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','dialogue','shared.json')
src=json.load(open(SRC));raw=open(DST).read();d=json.loads(raw);n=0
# lint rules (tools/lint_dialogue.py): no unknown bark fields -> the age band rides in context.age_band; no duplicate text -> a key
# whose every line already exists elsewhere in shared.json is skipped and game.js OR_ALIAS points it at that key.
have={l['text'].strip().lower():k for k,v in d['barks'].items() if not k.startswith('ui_or_cam_') for l in v}
skipped=[]
for k,v in src.items():
    if k.startswith('_'):continue
    if all(l['text'].strip().lower() in have for l in v):skipped.append(f"{k} -> {have[v[0]['text'].strip().lower()]}");d['barks'].pop(k,None);continue
    new=[{**{kk:l[kk] for kk in ('text','expr','short') if kk in l},'context':{'age_band':l.get('band','all'),'h1':'camera'}} for l in v]
    if d['barks'].get(k)!=new:d['barks'][k]=new;n+=1
if skipped:print('aliased (same text already in shared.json):',', '.join(skipped));n+=1
if n:open(DST,'w').write(json.dumps(d,indent=2,ensure_ascii=not any(ord(c)>127 for c in raw))+'\n')
print(f'H1 camera copy: {n} key(s) merged into dialogue/shared.json')
