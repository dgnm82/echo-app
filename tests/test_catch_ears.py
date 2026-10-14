# catch ears v1: the basket anchor sits on the runner's back line (top opaque pixel at the anchor x, ±2 px) for every palette and look; ears ≤ 8 px above the head
import json,glob,os
from PIL import Image
A=json.load(open('px/catch/anchors.json'))['slyte_basket']['stage3'];bad=[];n=0
for d in sorted(glob.glob('px/run/*/')+glob.glob('px/run/*/*/')):
  for k,(ax,ay) in A.items():
    f=d+'slyte_'+k+'.png'
    if not os.path.exists(f):continue
    im=Image.open(f).convert('RGBA');n+=1
    top=next((y for y in range(im.height) if im.getpixel((ax,y))[3]),None)
    if top is None or abs(top-ay)>2:bad.append((f,top,ay))
    hd=min((y for x in range(im.width) for y in range(im.height) if im.getpixel((x,y))[3]),default=0)
    if ay-hd>16:bad.append((f,'ears',ay-hd))
print(n,'frames;',len(bad),'bad',bad[:5]);assert n and not bad
print('catch ears OK')
