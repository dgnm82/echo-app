#!/usr/bin/env python3
"""H10/H11/H5 hotspot cleanup (idempotent). Applies to scenes_hotspots.json and the two embedded copies
(scenes.js window.SCENE_HOTSPOTS, pixel.js DEFAULT_HOTSPOTS).
 - H11: drop the hanging branch orb (branch_lantern) and its roof mirror (roof_1: same lantern at 46,196).
 - H10: flowers + mushrooms grow on the turf: y clamped into the ground plane 268..304 (180x320 coords, #sc top 211..247).
 - H10/H5: bells / lanterns / boughs that are not on the ground plane (y < 264) keep an exact-size tap box but draw NO
   sprite overlay (overlay:false), so nothing floats in a tree; sky taps (#sc y < 145) go to the sky unless they hit one exactly.
Phone coords only; handheld 'hh' boxes are Zane's and are left alone."""
import json,re,sys,os
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
DROP={'branch_lantern','roof_1'}
# Pixal's art check (echo/ios_design/batch_h/h10_hotspot_verify.md, Oct 25): phone x,y,w,h on the 180x320 stage.
# tw_garden_flower_2 -> the baked GROUND flowers (not the fence flowerbox), matching the H10 'flowers on the ground' fix.
# tw_clearing_bell: PENDING (Pixal sends the wild-den bell-vine / Sunbeam window coords); left as is.
PIXAL={'clearing_mushroom':(117,292,16,12),'tw_garden_flower_2':(92,293,20,16),'meadow_bell':(152,214,16,18),'tw_meadow_bell':(150,214,16,26)}
GROUND_MIN,GROUND_MAX=268,304
def fix_list(lst):
    out=[]
    for h in lst:
        if not isinstance(h,dict):out.append(h);continue
        if h.get('id') in DROP:continue
        if h.get('id') in PIXAL:
            x,y,w,hh=PIXAL[h['id']];h.update(x=x,y=y,w=w,h=hh)
            if isinstance(h.get('phone'),dict):h['phone'].update(x=x,y=y,w=w,h=hh)
        k=h.get('kind')
        if k in('flower','mushroom'):
            y=h.get('y',0)
            if y<GROUND_MIN:
                y=GROUND_MIN+((h.get('x',0)*7)%20)   # spread 268..287, deterministic per x
            y=min(y,GROUND_MAX-h.get('h',16)+16) if y>GROUND_MAX else y
            h['y']=y;h.pop('overlay',None)
            if isinstance(h.get('phone'),dict):h['phone']['y']=y
        elif h.get('y',0)<264 and not h.get('draw_at'):   # a baked-frame strip (draw_at, e.g. the den bell-vine) keeps its overlay
            h['overlay']=False
        out.append(h)
    return out
def fix(d):
    for k,v in list(d.items()):
        if isinstance(v,list):d[k]=fix_list(v)
        elif k=='scenes' and isinstance(v,dict):fix(v)
    d['_h10']='flowers/mushrooms on turf y268-304; above-ground props overlay:false; branch_lantern removed (H11)'
    return d
def main():
    p=os.path.join(ROOT,'scenes_hotspots.json');d=fix(json.load(open(p)));json.dump(d,open(p,'w'),indent=2)
    for f,pat in(('scenes.js',r'(window\.SCENE_HOTSPOTS=)(\{.*?\});\n'),('pixel.js',r'(const DEFAULT_HOTSPOTS=)(\{.*?\});\n')):
        fp=os.path.join(ROOT,f);s=open(fp).read();m=re.search(pat,s)
        if not m:print('no embedded table in',f);sys.exit(1)
        e=fix(json.loads(m.group(2)))
        s=s[:m.start(2)]+json.dumps(e,ensure_ascii=False)+s[m.end(2):];open(fp,'w').write(s)
    # scenes.js waypoints: the whimber branch 'lantern' perch (acts lantern_share) pointed at branch_lantern, removed in H11
    fp=os.path.join(ROOT,'scenes.js');s=open(fp).read();m=re.search(r'(window\.SCENES=)(\{.*?\});\s*\n',s,re.S)
    S=json.loads(m.group(2))
    for sc in S.get('whimber',[]):
        if sc['id']=='branch':sc['wp']=[w for w in sc['wp'] if w['id']!='lantern']
    s=s[:m.start(2)]+json.dumps(S,ensure_ascii=False,separators=(',',':'))+s[m.end(2):];open(fp,'w').write(s)
    print('hotspots fixed')
if __name__=='__main__':main()
