#!/usr/bin/env python3
"""Pixal's Batch H follow-up hotspots (echo/ios_design/batch_h/h_followup_hotspots_for_jay.json), idempotent.
Applies to scenes_hotspots.json and the two embedded copies (scenes.js SCENE_HOTSPOTS, pixel.js DEFAULT_HOTSPOTS):
 1. den bell-vine replaces tw_clearing_bell (+ its 'cushion' alias cushion_3); the old twitchel_clearing basket is gone.
 2. new scene twitchel_wild_clearing (wild cats): tw_wild_flower_1/2, tw_wild_mushroom, tw_wild_den_bellvine.
 3. twitchel_sunbeam_room props (house cat): yarn, toy, plant, purr-bell as musical taps (twitchel F major pentatonic).
Phone coords are 180x320 bg px; hh / hh_120x160 copied as given (Zane's)."""
import json,re,os,sys,copy
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
SRC=sys.argv[1] if len(sys.argv)>1 else '/workspace/echo/ios_design/batch_h/h_followup_hotspots_for_jay.json'
P=json.load(open(SRC))
WILD=copy.deepcopy(P['2_twitchel_wild_clearing']['hotspots'])
for h in WILD:
    h.setdefault('overlay',True)
    if h['id']=='tw_wild_den_bellvine':h['sprite']=None
ROOM_SRC=P['3_indoor_no_sky']['scenes']['twitchel_sunbeam_room']['props_proposed']
LABEL={'tw_room_yarn':'Yarn Ball','tw_room_toy':'Toy Mouse','tw_room_plant':'Floor Plant','tw_room_purr_bell':'Basket Purr-Bell'}
KIND={'tw_room_yarn':'toy','tw_room_toy':'toy','tw_room_plant':'plant','tw_room_purr_bell':'bell'}   # props, not turf flowers (no y clamp, no bloom sprite)
HZ={'f4':349.23,'g4':392.0,'a4':440.0,'c5':523.25,'d5':587.33,'f5':698.46}
ROOM=[]
for k,v in ROOM_SRC.items():
    p=v['phone'];ROOM.append({'id':k,'label':LABEL.get(k,k),'kind':KIND.get(k,'toy'),'x':p['x'],'y':p['y'],'w':p['w'],'h':p['h'],'phone':dict(p),'hh':v.get('hh'),
        'notes':v['notes'],'scientific_pitches':[n.upper() for n in v['notes']],'hz':[HZ[n] for n in v['notes']],'key':'F major pentatonic','instrument':v.get('instrument','harp'),'overlay':False})
def fix(d):
    for k,v in list(d.items()):
        if k=='scenes' and isinstance(v,dict):fix(v);continue
        if not isinstance(v,list):continue
        if k=='twitchel_clearing':d[k]=[h for h in v if not(isinstance(h,dict) and h.get('id')=='tw_clearing_bell')]
        if k=='cushion':d[k]=[h for h in v if not(isinstance(h,dict) and h.get('id')=='cushion_3' and h.get('kind')=='bell')]
    if any(isinstance(v,list) for v in d.values()) and ('clearing' in d):
        d['twitchel_wild_clearing']=copy.deepcopy(WILD);d['twitchel_sunbeam_room']=copy.deepcopy(ROOM)
    d['_h_followup']='Pixal h_followup_hotspots_for_jay.json: den bell-vine, twitchel_wild_clearing, sunbeam room props'
    return d
def main():
    p=os.path.join(ROOT,'scenes_hotspots.json');d=fix(json.load(open(p)));json.dump(d,open(p,'w'),indent=2)
    for f,pat in(('scenes.js',r'(window\.SCENE_HOTSPOTS=)(\{.*?\});\n'),('pixel.js',r'(const DEFAULT_HOTSPOTS=)(\{.*?\});\n')):
        fp=os.path.join(ROOT,f);s=open(fp).read();m=re.search(pat,s)
        if not m:print('no embedded table in',f);sys.exit(1)
        e=fix(json.loads(m.group(2)));s=s[:m.start(2)]+json.dumps(e,ensure_ascii=False)+s[m.end(2):];open(fp,'w').write(s)
    print('follow-up hotspots applied')
if __name__=='__main__':main()
