#!/usr/bin/env python3
"""Living Echo P0 props/particles (living_echo.md §5): leaf pile, moon rock, leaf-scatter (reuses the trail leaves), music note, sleep z, trinket."""
from PIL import Image
K=(59,42,92,255);H=lambda s:tuple(int(s[i:i+2],16) for i in (1,3,5))+(255,)
def draw(rows,cm,w,h):
    im=Image.new('RGBA',(w,h))
    for y,r in enumerate(rows):
        for x,c in enumerate(r):
            if c in cm:im.putpixel((x,y),cm[c])
    return im
leaves=[Image.open(f'px/living/leaf_{i}.png').crop((0,0,16,16)) for i in range(3)]
pile=Image.new('RGBA',(32,16))
for (i,(x,y)) in enumerate([(0,5),(8,2),(16,6),(10,7),(4,8),(18,1)]):pile.alpha_composite(leaves[i%3],(x,y))
pile.save('px/living/leafpile.png')
rock=draw(['....KKKKKK......','..KKGGGGGGKK....','.KGGLLGGGGGGK...','KGGLLGGGGGGGGK..','KGGGGGGGGGDDGK..','KDGGGGGGGDDDDK..','.KDDDDDDDDDDK...','..KKKKKKKKKK....'],
 {'K':K,'G':H('#8C86A8'),'L':H('#C9C3E0'),'D':H('#5E587A')},16,8);rock.save('px/living/moonrock.png')
note=draw(['...KK...','...KYK..','...K.YK.','...K....','.KKK....','KYYK....','KYYK....','.KK.....'],{'K':K,'Y':H('#FFD27A')},8,8);note.save('px/living/note.png')
z=draw(['KKKKK...','KWWWK...','...KK...','..KK....','.KK.....','KWWWK...','KKKKK...','........'],{'K':K,'W':H('#FFF6E6')},8,8);z.save('px/living/z.png')
Image.open('px/items/trinket.png').save('px/living/trinket.png')
print('living props ok')
