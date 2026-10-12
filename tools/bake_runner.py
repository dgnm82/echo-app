"""Runner assets (spec v0.6 §3) baked from Cole's generators: runner_sprites.frames() (side-on 48 px Echo frames) and runner_mocks
world layers / props (scene-kit roles + scene palettes). Output: px/run/. Phone only."""
import sys,os
sys.path.insert(0,'/workspace/echo/game_design/src')
import runner_mocks as M, runner_sprites as RS
from scene_kit import *
SC=M.SC;O='px/run/';os.makedirs(O,exist_ok=True)
def sv(a,pal,n):M.rgba(a,pal).save(O+n+'.png')
for sp in ('slyte','whimber'):
    for k,im in RS.frames(sp,48).items():im.save(O+f'{sp}_{k}.png')
md=SC.PAL['meadow']['day'];w=M.meadow_world('phone')
sv(w['sky'],md,'meadow_sky');sv(w['far'][:,:M.PER+360],md,'meadow_far');sv(w['gnd'][:,:M.PER+360],md,'meadow_gnd')
sv(p_log(30,14),md,'log');sv(p_rock(20,12),md,'rock');sv(M.puddle(26,6),md,'puddle');sv(p_sign(),md,'sign');sv(p_rock(44,20),md,'sunrock')
sv(p_cloud(40,13),md,'cloud_day')
ht=SC.PAL['hilltop']['twi'];Wd=360;Hh=640;hill0=528
rows=[t_sky(SKY0)]*18+[t_skyblend(SKY0,SKY1)]+[t_sky(SKY1)]*8+[t_skyblend(SKY1,SKY2)]+[t_sky(SKY2)]*6
sky=blank(Wd,Hh)
for r,kk in enumerate(rows):
    for x in range(0,Wd,16):put(sky,TILES[kk],x,hill0-16*len(rows)+16*r+16)
sv(sky,ht,'hill_sky')
for f in (0,1):
    st=blank(Wd,Hh)
    for r in range(Hh//16):
        for c in range(Wd//16+1):
            if (c*7+r*3)%2==0:put(st,TILES[t_stars(f,(c*5+r*11)%9)],c*16,r*16)
    sv(st,ht,f'hill_stars{f}')
hills=M.layer_rows([[t_faredge('hill')],[t_grassedge(SKY2)]]+[[t_grass(1),t_grass(2),t_grass(3)]]*6,Wd,0)
sv(hills[:,:M.PER+360],ht,'hill_gnd')
for L in (120,160,200,240):sv(M.branch_top(L,True),ht,f'branch{L}')
for h in (40,60,80):sv(M.bush_up(h,True),ht,f'bush{h}')
sv(p_cloud(44,14),ht,'cloud');sv(p_sign(),ht,'sign_twi');b=p_bench();sv(b,ht,'bench');sv(p_moss(),ht,'moss')
print(sorted(os.listdir(O)))
