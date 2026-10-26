#!/usr/bin/env python3
# Lowest opaque row (feet) of every title strip in px/title/title_frames.json, per frame and overall (frame px, 48x48 frames).
# Also the union opaque bbox of every strip. Used by tools/test-batch-h-final.js to check every title Echo stands / perches / floats on a surface line. Usage: python3 tools/title_feet.py
import json,os
from PIL import Image
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..');F=json.load(open(os.path.join(R,'px/title/title_frames.json')))
out={}
for s in F['strips']:
  p=os.path.join(R,s['file'])
  if not os.path.exists(p):out[s['file']]=None;continue
  im=Image.open(p).convert('RGBA');a=im.split()[3];fw,fh=s.get('frame',[48,48]);rows=[];U=None
  for i in range(s['frames']):
    bb=a.crop((i*fw,0,(i+1)*fw,fh)).getbbox();rows.append(bb[3]-1 if bb else None)
    if bb:U=list(bb) if U is None else [min(U[0],bb[0]),min(U[1],bb[1]),max(U[2],bb[2]),max(U[3],bb[3])]
  # bbox: union of every frame's opaque box in frame px [left, top, right, bottom) (PM Oct 25: viewport-clip and tagline checks)
  out[s['file']]={'anim':s['anim'],'look':s.get('look'),'anchor':s.get('anchor'),'kind':s.get('anchor_kind'),'feet':rows,'bbox':U}
print(json.dumps(out))
