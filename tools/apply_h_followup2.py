#!/usr/bin/env python3
"""Pixal follow-up 2 (h_followup_hotspots_for_jay.json sections 5 + 6), idempotent.
 5. twitchel_clearing is retired: drop scenes.twitchel_clearing / twitchel_clearing and its alias 'cushion' from
    scenes_hotspots.json + the embedded copies (scenes.js SCENE_HOTSPOTS, pixel.js DEFAULT_HOTSPOTS); homes.json
    wild-cat placement -> twitchel_wild_clearing / den_wild; families/twitchel.json clearing title -> the wild den clearing
    (families.js is rebuilt by tools/build_families.py).
 6. scales: brumlo/finli -> cloverkin (G major pentatonic) / tidelings (D major pentatonic); tidepool_cove, kelp_reef,
    lighthouse_pier hotspot lists replaced with Pixal's D major lists. DATA ONLY: Tidelings scenes stay unreachable."""
import json,re,os,sys,copy,subprocess
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
SRC=sys.argv[1] if len(sys.argv)>1 else '/workspace/echo/ios_design/batch_h/h_followup_hotspots_for_jay.json'
P=json.load(open(SRC));S6=P['6_scales']
SCALES=S6['paste_scales']['replace_with'];OCEAN=S6['paste_ocean_hotspots']['replace_with']
RETIRED=('twitchel_clearing','cushion')
def fix(d):
    for k in RETIRED:d.pop(k,None)
    if isinstance(d.get('scenes'),dict):fix(d['scenes'])
    if isinstance(d.get('scales'),dict):d['scales']=copy.deepcopy(SCALES)
    for k,v in OCEAN.items():
        if k in d:d[k]=copy.deepcopy(v)
    if 'scales' in d:d['_h_followup2']='old twitchel basket clearing + its cushion alias retired (wild cats -> twitchel_wild_clearing, house cat -> twitchel_sunbeam_room); scales cloverkin/tidelings; ocean hotspots D major (data only, unreachable)'
    return d
def main():
    p=os.path.join(ROOT,'scenes_hotspots.json');d=fix(json.load(open(p)));json.dump(d,open(p,'w'),indent=2)
    for f,pat in(('scenes.js',r'(window\.SCENE_HOTSPOTS=)(\{.*?\});\n'),('pixel.js',r'(const DEFAULT_HOTSPOTS=)(\{.*?\});\n')):
        fp=os.path.join(ROOT,f);s=open(fp).read();m=re.search(pat,s)
        if not m:print('no embedded table in',f);sys.exit(1)
        e=fix(json.loads(m.group(2)));s=s[:m.start(2)]+json.dumps(e,ensure_ascii=False)+s[m.end(2):];open(fp,'w').write(s)
    hp=os.path.join(ROOT,'px/home/homes.json');H=json.load(open(hp))
    for k,v in H.get('_batchH',{}).get('placement',{}).items():
        if v.get('scene')=='twitchel_clearing':
            v['scene']='twitchel_wild_clearing';v['home']['k']='den_wild';v['home_hh']['k']='den_wild_hh'
    json.dump(H,open(hp,'w'),indent=1)
    fp=os.path.join(ROOT,'families/twitchel.json');F=json.load(open(fp))
    t=F['scene']['borrow'].setdefault('titles',{})
    if t.get('clearing')=='The basket clearing':
        t['clearing']='The wild den clearing'   # the borrowed 'clearing' slot is always re-routed (game.js h4Scene): wild cats -> wild_clearing, house cat -> sunbeam_room
        json.dump(F,open(fp,'w'),indent=1,ensure_ascii=False);open(fp,'a').write('\n')
    subprocess.run([sys.executable,os.path.join(ROOT,'tools/build_families.py')],check=True,cwd=ROOT)
    print('follow-up 2 applied')
if __name__=='__main__':main()
