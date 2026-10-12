"""Title / night / dusk backgrounds: the bare sand strip (x 48-159, y 268-283) becomes grass (copied from the same tile column 32 px down,
so the flower rhythm continues), plus a small rock and two flower clusters from each image's own colours (scene-fix rules)."""
from PIL import Image
SAND=(235,203,156)
ROCK=["..kkk..",".kLsSk.","kLssSSk",".kkkkk."];FL=[".a.b.","aya.b",".t.t."]
for f in ('bg_night_f0','bg_night_f1','bg_dusk_f0','bg_dusk_f1','bg_nighthome'):
    p=f'px/{f}.png';im=Image.open(p).convert('RGBA');W,H=im.size
    if not any(im.getpixel((x,y))[:3]==SAND for y in range(268,284) for x in range(48,160)):print(f,'already fixed');continue
    for y in range(266,286):
        for x in range(46,162):im.putpixel((x,y),im.getpixel((x,y+32)))
    cols=[c for n,c in im.convert('RGB').getcolors(999)];lum=lambda c:.3*c[0]+.6*c[1]+.1*c[2]
    grass=[c for c in cols if c[1]>c[0]+20 and c[1]>c[2]];dark=min(grass,key=lum);mid=sorted(grass,key=lum)[len(grass)//2]
    pink=max(cols,key=lambda c:c[0]-c[1]);yel=max(cols,key=lambda c:c[0]+c[1]-2*c[2]);light=max(cols,key=lum);ink=min(cols,key=lum)
    M={'k':ink,'L':light,'s':(205,196,214) if (205,196,214) in cols else light,'S':mid,'a':pink,'b':yel,'y':light,'t':dark}
    def draw(spr,x0,y0):
        for j,r in enumerate(spr):
            for i,ch in enumerate(r):
                if ch in M:im.putpixel((x0+i,y0+j),M[ch]+(255,))
    draw(ROCK,70,276);draw(FL,108,270);draw(FL,140,280)
    im.save(p);print(f,'fixed')
