# Aliveness v1 art (aliveness/README): food icons not drawn in mocks/, tap ripple, plate, mini heart. 16 px, plum ink outline.
from PIL import Image
import shutil,os
O='#3b2a5c';P={'.':None,'A':O,'W':'#ffffff'}
def save(name,rows,pal):
    h=len(rows);w=len(rows[0]);im=Image.new('RGBA',(w,h),(0,0,0,0))
    for y,r in enumerate(rows):
        assert len(r)==w,(name,y,len(r))
        for x,c in enumerate(r):
            col={**P,**pal}[c]
            if col:im.putpixel((x,y),tuple(int(col[i:i+2],16) for i in (1,3,5))+(255,))
    im.save(f'px/{name}.png')
I={}
I['seeds']=(["................","................","....AA....AA....","...ABBA..ABBA...","...ABCA..ABCA...","...ABCA..ABCA...","....AA....AA....","................",".......AA.......","......ABBA......","......ABCA......","......ABCA......",".......AA.......","................","................","................"],{'B':'#4a3a40','C':'#d8c8a8'})
I['pancakes']=(["................","......AAAA......",".....ABBBBA.....","..AAAABDDBAAAA..",".ACCCCCDDCCCCCA.",".AEEEEEEEEEEEEA.",".ACCCCCCCCCCCCA.",".AEEEEEEEEEEEEA.",".ACCCCCCCCCCCCA.",".AEEEEEEEEEEEEA.","..AAAAAAAAAAAA..","................","................","................","................","................"],{'B':'#fff1b0','C':'#f6b44a','D':'#e88a3a','E':'#b0744e'})
I['strawberry']=(["................","......A.A.......",".....ABABA......","....ABBBBBA.....","...AAAAAAAAA....","..ACCWCCCCWCA...","..ACCCCCWCCCA...","..ACWCCCCCCCA...","...ACCCWCCCA....","...ACCCCCWCA....","....ACWCCCA.....",".....ACCCA......","......AAA.......","................","................","................"],{'B':'#5e9e5a','C':'#e8705a'})
I['cheese']=(["................","................","..........AA....",".......AAABBA...","....AAABBBBBA...","..AABBBBBBBBA...",".ABBBBBBBBBBA...",".AAAAAAAAAAAA...",".ACCDCCCCCDCA...",".ACCCCCDCCCCA...",".ACDCCCCCCDCA...",".ACCCCCCDCCCA...",".AAAAAAAAAAAA...","................","................","................"],{'B':'#fff1b0','C':'#ffd75e','D':'#e6ae3c'})
I['noodle_soup']=(["................","....A..A..A.....","...A..A..A......","....A..A..A.....","................",".AAAAAAAAAAAAAA.",".ABCBBCBBBCBBBA.",".ABBCBBBCBBCBBA.","..ADDDDDDDDDDA..","..ADDDDDDDDDDA..","...ADDDDDDDDA...","....AAAAAAAA....","................","................","................","................"],{'B':'#ffe39a','C':'#f6b44a','D':'#7fb6d8'})
I['dumpling']=(["................","................","................","......A.A.A.....",".....ABABABA....","....ABBBBBBBA...","...ABBBBBBBBBA..","..ABBBBBBBBBBBA.","..ABBBBBBBBBBCA.","..ACBBBBBBBBCCA.","...ACCCCCCCCCA..","....AAAAAAAAA...","................","................","................","................"],{'B':'#fff6e6','C':'#e6d2b4'})
I['banana']=(["................","............AA..","...........ABA..","...........ACA..","..........ACCA..","..........ACCA..",".........ACCDA..","........ACCCDA..","......AACCCDA...","..AAAACCCCDDA...",".ACCCCCCCDDA....","..ADDDDDDDA.....","...AAAAAAA......","................","................","................"],{'B':'#5e3a2a','C':'#ffe066','D':'#f6b44a'})
I['fish_sticks']=(["................","................","..AAAAAAAAAA....",".ABBCBBBCBBBA...",".ABBBBBCBBBBA...","..AAAAAAAAAAAA..","..ABBCBBBBCBBBA.","..ABBBBCBBBBBBA.","...AAAAAAAAAAA..","....AAAAAAAAAA..","...ABBBCBBBBCBA.","...ABCBBBBCBBBA.","....AAAAAAAAAA..","................","................","................"],{'B':'#f6b44a','C':'#e88a3a'})
I['cookie']=(["................","................",".....AAAAAA.....","...AABBBBBBAA...","..ABBCBBBBBBBA..","..ABBBBBBCBBBA..",".ABBBBBBBBBBBBA.",".ABCBBBBCBBBBBA.",".ABBBBBBBBBCBBA.",".ABBBBCBBBBBBBA.","..ABBBBBBBBBBA..","..ABBBCBBBCBBA..","...AABBBBBBAA...",".....AAAAAA.....","................","................"],{'B':'#e6ae7c','C':'#b0744e'})
for k,(r,p) in I.items():save('i_'+k,r,p)
for k in ('pizza','mac_and_cheese','lemon'):shutil.copy(f'/workspace/echo/aliveness/mocks/icon_{k}_x1.png',f'px/i_{k}.png')
os.makedirs('px/alive',exist_ok=True);shutil.copy('/workspace/echo/aliveness/mocks/leaf_parachute_x1.png','px/alive/leaf_parachute.png')
R={'B':'#ffffff'}
rip=[["........","........","........","...BB...","...BB...","........","........","........"],
     ["........","........","...BB...","..B..B..","..B..B..","...BB...","........","........"],
     ["........","..BBBB..",".B....B.",".B....B.",".B....B.",".B....B.","..BBBB..","........"],
     ["..B..B..","........","B......B","........","........","B......B","........","..B..B.."]]
for i,r in enumerate(rip):
    h=len(r);im=Image.new('RGBA',(8,8),(0,0,0,0))
    for y,row in enumerate(r):
        for x,c in enumerate(row):
            if c=='B':im.putpixel((x,y),(255,255,255,220-50*i))
    im.save(f'px/alive/ripple{i}.png')
save('alive/plate',["..AAAAAAAAAAAA..",".ABBBBBBBBBBBBA.","ACBBBBBBBBBBBBCA",".ACCCCCCCCCCCCA.","..AAAAAAAAAAAA.."],{'B':'#ffffff','C':'#c8c0e0'})
save('alive/heart',[".AA.AA.","ABBABBA","ABWBBBA","ABBBBBA",".ABBBA.","..ABA..","...A..."],{'B':'#ff8fb8'})
save('alive/crumb',["AB","BA"],{'A':'#b0744e','B':'#e6ae7c'})
print('ok')
