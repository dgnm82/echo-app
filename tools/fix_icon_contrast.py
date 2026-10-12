# Contrast fixes for Cole's food icons (food_icons/REVIEW.md "weakest"): recolour within the existing food palette only.
from PIL import Image
H=lambda s:tuple(int(s[i:i+2],16) for i in (1,3,5))
FIX={'waffle':{'#ffd27a':'#f6b44a','#f6b44a':'#e88a3a','#e88a3a':'#b0744e'},   # fill was exactly the gold button colour
     'cornbread':{'#f6b44a':'#e88a3a','#e88a3a':'#b0744e','#f2a65a':'#b0744e','#ffe39a':'#fff1b0'},
     'cheese':{'#ffd75e':'#f6b44a','#e6ae3c':'#e88a3a'},
     'turkey':{'#d69678':'#b0744e'},                                             # roasted brown rim so the slices read as meat
     'noodle_soup':{'#ffffff':'#c8c0e0'}}                                        # lilac steam shows on the white chip and the gold button
for k,m in FIX.items():
    im=Image.open(f'px/i_{k}.png').convert('RGBA');px=im.load();M={H(a):H(b) for a,b in m.items()}
    for y in range(16):
        for x in range(16):
            p=px[x,y]
            if p[3] and p[:3] in M:px[x,y]=M[p[:3]]+(255,)
    im.save(f'px/i_{k}.png')
print('ok')
