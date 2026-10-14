# catch ears v2 (motion art v2): the front-facing sit head overhangs the side-on body, so the seat sits behind the head;
# check the seat is on the body (opaque within 3 px below the anchor) for every palette and look
import json,glob,os
from PIL import Image
A=json.load(open('px/catch/anchors.json'))['slyte_basket']['stage3'];bad=[];n=0
for d in sorted(glob.glob('px/run/*/')+glob.glob('px/run/*/*/')):
  for k,(ax,ay) in A.items():
    f=d+'slyte_'+k+'.png'
    if not os.path.exists(f):continue
    im=Image.open(f).convert('RGBA');n+=1
    if not any(im.getpixel((ax,y))[3] for y in range(ay,min(ay+4,im.height))):bad.append((f,ax,ay))
print(n,'frames;',len(bad),'bad',bad[:5]);assert n and not bad
print('catch ears OK')
