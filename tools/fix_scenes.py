"""Scene polish (Daniel, 11 Oct): remove the bare sand strip in Slyte's clearing (grass continues, grid-aligned seamless grass tiles) and break up
flat ground in grove / meadow / branch / hilltop with small props (rocks, bushes, flower clusters) drawn from each scene's own 16-role palette
(day and twilight use the same geometry; props get a 1 px outline in their own darkest role). Library (interior) unchanged.
Runs on Cole's baked art in px/scenes/ (originals: /workspace/echo/scenes/mocks/*_bg.png)."""
import json,random
from PIL import Image
P={s['id']:s['palettes'] for s in json.load(open('/workspace/echo/scenes/scenes.json'))['scenes']}
hx=lambda h:tuple(int(h[i:i+2],16) for i in (1,3,5))
ROCK=["..kkk..",".kLsSk.","kLssSSk","kssSSWk",".kkkkk."]            # L=LITE s=ST S=W0 W=W1 k=W2
BUSH=["...kkk....","..kHHHk.k.",".kHHGGHkHk","kHGGaGGGHk","kGGgGGgaGk",".kgggggggk","..kkkkkk.."]   # H=G0 G=G1 g=G2 a=ACC1
FLWR=[".a.b.","aya.b","ta.bt",".t.t."]                              # a=ACC1 b=ACC2 y=LITE t=G2
ROLE={'L':3,'s':13,'S':10,'W':11,'k':12,'H':5,'G':6,'g':7,'a':8,'b':9,'y':3,'t':7}
DECOR={'clearing':[('R',118,296),('R',42,306),('B',126,280),('F',28,288),('F',84,302),('F',150,306),('F',100,278),('F',64,272)],
  'grove':[('R',60,298),('R',160,302),('B',28,300),('F',118,294),('F',76,282),('F',96,310)],
  'meadow':[('R',112,300),('R',142,288),('B',74,304),('F',20,300)],
  'branch':[('B',18,292),('B',118,302),('B',64,312),('F',150,294),('F',40,306)],
  'hilltop':[('R',20,262),('R',152,300),('B',108,276),('F',40,302),('F',100,308),('F',160,266),('F',130,312)]}
SPR={'R':ROCK,'B':BUSH,'F':FLWR}
def draw(im,pal,spr,x0,y0):
    for y,r in enumerate(spr):
        for x,ch in enumerate(r):
            if ch in ROLE:im.putpixel((x0+x,y0+y),hx(pal[ROLE[ch]]))
def fill_path(name,dev,ground,ox,oy):
    """replace the sand path (ST pixels below the ground line) with seamless grass tiles from clean grid tiles"""
    ims={v:Image.open(f'px/scenes/{name}{dev}_{v}.png').convert('RGB') for v in ('day','twi')}
    d=ims['day'];W,H=d.size;st=hx(P[name]['day'][13]);grass={hx(P[name]['day'][i]) for i in (5,6,7)};g2=hx(P[name]['day'][7])
    pts=[(x,y) for y in range(ground+6,H) for x in range(W) if d.getpixel((x,y))==st]
    if not pts:return
    x0,x1=min(p[0] for p in pts)-3,max(p[0] for p in pts)+3;y0,y1=min(p[1] for p in pts)-3,max(p[1] for p in pts)+3
    clean=[]
    for ty in range(ground,H-15,16):
        for tx in range(ox%16,W-15,16):
            if tx+15>=x0 and tx<=x1 and ty+15>=y0 and ty<=y1:continue
            px=[d.getpixel((tx+i,ty+j)) for i in range(16) for j in range(16)]
            if st not in px and sum(c in grass for c in px)>=230 and sum(c==g2 for c in px)<30 and ty>=ground+16:clean.append((tx,ty))
    src=ims
    if not clean:   # handheld: borrow clean grass tiles from the phone art (same 16x16 tile set and palette)
        src={v:Image.open(f'px/scenes/{name}_{v}.png').convert('RGB') for v in ('day','twi')};pd=src['day']
        for ty in range(252,320-15,16):
            for tx in range(10,180-15,16):
                px=[pd.getpixel((tx+i,ty+j)) for i in range(16) for j in range(16)]
                if st not in px and sum(c in grass for c in px)>=230 and sum(c==g2 for c in px)<30 and ty>=ground+16:clean.append((tx,ty))
    assert clean,name
    rnd=random.Random(7)
    for ty in range((y0-ground)//16*16+ground,y1+1,16):
        for tx in range((x0-ox%16)//16*16+ox%16,x1+1,16):
            sx,sy=rnd.choice(clean)
            for j in range(16):
                for i in range(16):
                    x,y=tx+i,ty+j
                    if x0<=x<=x1 and y0<=y<=y1 and 0<=x<W and 0<=y<H:
                        for v,im in ims.items():im.putpixel((x,y),src[v].getpixel((sx+i,sy+j)))
    for v,im in ims.items():im.save(f'px/scenes/{name}{dev}_{v}.png')
    print('path filled',name+dev,(x0,y0,x1,y1),'from',len(clean),'clean tiles')
fill_path('clearing','_hh',36,-2,-12)
fill_path('clearing','',236,-6,-4)
for name,items in DECOR.items():
    for v in ('day','twi'):
        im=Image.open(f'px/scenes/{name}_{v}.png').convert('RGB')
        for k,x,y in items:draw(im,P[name][v],SPR[k],x,y)
        im.save(f'px/scenes/{name}_{v}.png')
# handheld: a flower cluster + rock where the clearing path was (same palette roles)
for v in ('day','twi'):
    im=Image.open(f'px/scenes/clearing_hh_{v}.png').convert('RGB');draw(im,P['clearing'][v],FLWR,20,62);draw(im,P['clearing'][v],ROCK,42,66);im.save(f'px/scenes/clearing_hh_{v}.png')
print('done')
