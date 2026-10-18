"""Farewell arc assets (farewell_arc.md v0.2 §8): home star (3 levels x 2-frame twinkle, dither ring, no alpha glow),
keepsakes (glow-leaf, starlight feather: 2-frame glimmer), gift icons (flower, pebble), list scroll + paw/feather stamps."""
from PIL import Image
INK=(59,42,92);Y=(255,210,122);O=(247,168,90);W=(255,255,255);G1=(109,178,116);G2=(158,217,142);P=(255,158,192);GR=(150,140,160);GR2=(196,188,204);LB=(176,214,240)
OUT='px/'
def img(w,h):return Image.new('RGBA',(w,h),(0,0,0,0))
def put(im,pts,c,ox=0):
    for x,y in pts:im.putpixel((x+ox,y),c+(255,))
def star(level,frame):
    im=img(13,13);c=6
    if level==1:
        put(im,[(c,c)],W if frame==0 else Y);return im
    put(im,[(c,c-1),(c,c+1),(c-1,c),(c+1,c)],Y);put(im,[(c,c)],W)
    if frame==0 or level==3:put(im,[(c,c-2),(c,c+2),(c-2,c),(c+2,c)],O if level==2 else Y)
    if level==3:
        put(im,[(c,c-3),(c,c+3),(c-3,c),(c+3,c)],O)
        ring=[(x,y) for x in range(13) for y in range(13) if 4.5<((x-c)**2+(y-c)**2)**.5<6.2 and (x+y+frame)%2==0]
        put(im,ring,O)
    return im
for L in (1,2,3):
    sh=img(26,13)
    for f in (0,1):sh.paste(star(L,f),(13*f,0))
    sh.save(OUT+f'fw/star_{L}.png')
def leaf(f):
    im=img(16,16);rows=["................","........##......","......##GG#.....",".....#GGLG#.....","....#GGLGGG#....","....#GLGGGG#....","...#GGLGGG#.....","...#GLGGGG#.....","..#GLGGGG#......","..#LGGGG#.......","..#GGGG#........","...###..........","..#.............",".#..............","................","................"]
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch=='#':im.putpixel((x,y),INK+(255,))
            elif ch=='G':im.putpixel((x,y),(G2 if f==0 else Y)+(255,))
            elif ch=='L':im.putpixel((x,y),(Y if f==0 else W)+(255,))
    if f==1:put(im,[(13,2),(14,6),(12,0)],Y)
    else:put(im,[(1,4),(13,9)],O)
    return im
def feather(f):
    im=img(16,16);rows=["..........##....",".........#LL#...","........#LBL#...",".......#LBLL#...","......#LBLL#....",".....#LBLL#.....","....#LBLL#......","....#BLL#.......","...#BLL#........","...#LL#.........","..#L##..........","..#.............",".#..............","................","................","................"]
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch=='#':im.putpixel((x,y),INK+(255,))
            elif ch=='L':im.putpixel((x,y),(LB if f==0 else W)+(255,))
            elif ch=='B':im.putpixel((x,y),(Y)+(255,))
    put(im,[(14,3),(2,6)] if f else [(13,8),(5,1)],Y)
    return im
for nm,fn in (('songleaf',leaf),('songfeather',feather)):
    sh=img(32,16)
    for f in (0,1):sh.paste(fn(f),(16*f,0))
    sh.save(OUT+f'fw/{nm}.png');fn(0).save(OUT+f'i_{nm}.png')
def grid(rows,cmap,name):
    im=img(16,16)
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch in cmap:im.putpixel((x,y),cmap[ch]+(255,))
    im.save(OUT+f'i_{name}.png')
grid(["................","......###.......",".....#PPP#......","...##PYYP##.....","..#PP#YY#PP#....","..#PPPYYPPP#....","...##PYYP##.....",".....#PPP#......","......###.......",".......#........",".......#..##....","......##.#GG#...",".....#GG#GG#....","......###.##....",".......#........","................"],{'#':INK,'P':P,'Y':Y,'G':G1},'flower')
grid(["................","................","................","................",".....######.....","...##WGGGGG##...","..#GWGGGGGGGG#..","..#GGGGGGGGGM#..",".#GGGGGGGGGGMM#.",".#GGGGGGGGGMMM#.","..#GGGGGGMMMM#..","...###########..","................","................","................","................"],{'#':INK,'W':W,'G':GR2,'M':GR},'pebble')
grid(["................","..###########...",".#YYYYYYYYYYY#..",".#Y#YYYYYYYY#...","..##OOOOOOOO#...","...#OIIIIIIO#...","...#OOOOOOOO#...","...#OIIIIIO.#...","...#OOOOOOOO#...","...#OIIIIIIO#...","...#OOOOOOOO#...","..###########...",".#YYYYYYYYYYY#..","..###########...","................","................"],{'#':INK,'Y':Y,'O':(255,246,214),'I':GR},'scroll')
grid(["................","....##....##....","...#PP#..#PP#...","...#PP#..#PP#...","....##....##....",".##..........##.","#PP#..####..#PP#","#PP#.#PPPP#.#PP#",".##.#PPPPPP#.##.","....#PPPPPP#....","...#PPPPPPPP#...","...#PPPPPPPP#...","....##PPPP##....","......####......","................","................"],{'#':INK,'P':O},'stamp_paw')
print('baked')
