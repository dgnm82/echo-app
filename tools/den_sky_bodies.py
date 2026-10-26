#!/usr/bin/env python3
# Find the painted sun / moon disc in each den's L0 sky layer (largest connected blob of the disc colours, sky band only).
# Prints JSON {den:{cx,cy,r,bbox}} in L0-plane px and in #sc px (L0 plane sits at left:-8, top:-8 inside the den wrap, which is mounted at #sc top:-57, Option A). Used to build DEN_SKY_BODY
# in pixel.js and by tools/test-batch-h-final.js. Usage: python3 tools/den_sky_bodies.py
import json,os,sys
from PIL import Image
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
def disc(px,W,H):
  c=px
  def is_body(p):return p[3]>200 and p[0]>=240 and p[1]>=170 and p[2]<=190   # warm gold / cream disc + rim (sky blues and plums excluded)
  seen=set();best=[]
  for y in range(min(H,160)):
    for x in range(W):
      if (x,y) in seen or not is_body(c[x,y]):continue
      st=[(x,y)];seen.add((x,y));comp=[]
      while st:
        a,b=st.pop();comp.append((a,b))
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
          q=(a+dx,b+dy)
          if 0<=q[0]<W and 0<=q[1]<H and q not in seen and is_body(c[q]):seen.add(q);st.append(q)
      if len(comp)>len(best):best=comp
  # grow the rim blob into the disc's cream interior (only pixels touching the blob, so separate clouds stay out)
  def cream(p):return p[3]>200 and p[0]>=240 and p[1]>=225 and p[2]>=190
  B=set(best);st=list(best)
  while st:
    a,b=st.pop()
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
      q=(a+dx,b+dy)
      if 0<=q[0]<W and 0<=q[1]<H and q not in B and cream(c[q]) and len(B)<900:B.add(q);st.append(q)
  return list(B)
OY=57   # den wrap top in #sc (pixel.js DEN_OY)
out={}
for f in sorted(os.listdir(os.path.join(R,'px/dens/layers'))):
  if not f.endswith('_L0_sky.png'):continue
  d=f[:-len('_L0_sky.png')];im=Image.open(os.path.join(R,'px/dens/layers',f)).convert('RGBA');W,H=im.size
  b=disc(im.load(),W,H)
  if len(b)<40:out[d]=None;continue
  xs=[p[0] for p in b];ys=[p[1] for p in b];x0,y0,x1,y1=min(xs),min(ys),max(xs),max(ys)
  bs=set(b);mx,my=sum(xs)/len(xs),sum(ys)/len(ys);cx,cy=min(b,key=lambda q:(q[0]-mx)**2+(q[1]-my)**2)   # centroid snapped onto a painted pixel (a crescent's centre is sky)
  out[d]={'n':len(b),'bbox':[x0,y0,x1,y1],'sc':{'x':cx-8,'y':cy-8-OY,'r':round(max(x1-x0,y1-y0)/2)},'center_painted':(cx,cy) in bs,'px':sorted([[a-8,c-8-OY] for a,c in b])}
print(json.dumps(out))
