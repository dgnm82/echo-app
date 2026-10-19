// Pixel-art runtime (style guide v1): one virtual pixel grid per screen, integer device-pixel scaling,
// 12 fps sprite clock (1 tick = 83 ms), Slyte sprite sheets baked by tools/bake_pixel.py, chirp hook.
(function(){
const W=window, TICK=83, N=48;
const PAL0=['mint-teal','violet-rose','sunset-gold','rose-sapphire','teal-gold','sky-periwinkle'];   // seeded pick (existing saves keep their colour)
const PAL=PAL0.concat(['dusk-plum','cocoa-cream','ember-russet','snow-blush','moon-lilac','sunset-gold-solid','mint-teal-solid','sky-periwinkle-solid','violet-rose-solid','rose-sapphire-solid']);   // + origin v0.3 colours (tools/bake_origin_palettes.py)
const POWL0=['lilac-night','sky-teal','plum-blush','mint-aurora','peach-dusk'];
const POWL=POWL0.concat(['crow-dusk','wren-cocoa','robin-ember','dove-mist','sun-finch','mint-aurora-solid','peach-dusk-solid']);   // Whimber: the 5 POWL ramps (guide §6)
const FR={idle:[0,1,2,3,4,5],blink:6,ear1:7,ear2:8,tail1:9,tail2:10,happy:11,eat1:12,eat2:13,pet1:14,pet2:15,cur1:16,cur2:17,shy1:18,shy2:19,sl1:20,sl2:21,nap1:22,nap2:23,sad:24,sur:25,think:26,gig:27};
// expression -> looping frame sequence [[column, ticks],...]; loop = index the loop restarts from (guide 9.2 timings)
const F_=FR,SEQ={happy:[[F_.happy,8],[F_.gig,4]],delighted:[[F_.gig,3],[F_.happy,5]],love:[[F_.pet2,6],[F_.pet1,6]],excited:[[F_.gig,2],[F_.happy,2]],
  giggling:[[F_.gig,2],[F_.happy,2]],proud:[[F_.happy,10],[F_.idle[0],4]],eating:[[F_.eat1,2],[F_.eat2,2],[F_.eat1,2],[F_.eat2,4]],
  curious:[[F_.idle[0],2],[F_.cur1,3],[F_.cur2,3],[F_.cur1,2]],thinking:[[F_.think,8],[F_.idle[0],4]],concentrating:[[F_.think,10],[F_.blink,2]],
  shy:[[F_.shy1,3],[F_.shy2,3],[F_.shy1,4],[F_.shy2,4]],sleepy:{s:[[F_.sl1,4],[F_.sl1,4],[F_.sl2,4],[F_.nap1,6],[F_.nap2,6]],loop:3},
  sad:[[F_.sad,10],[F_.sl1,4]],wistful:[[F_.sad,8],[F_.idle[0],6]],surprised:[[F_.sur,8],[F_.idle[0],2]]};
// one-shot reactions (care actions), then back to the expression/idle
const REACT={eat:[[F_.eat1,2],[F_.eat2,2],[F_.eat1,2],[F_.eat2,2],[F_.happy,4]],pet:[[F_.pet1,2],[F_.pet2,3],[F_.pet1,3],[F_.pet2,4]],
  happy:[[F_.happy,2],[F_.gig,2],[F_.happy,2],[F_.gig,4]],excited:[[F_.gig,2],[F_.happy,2],[F_.gig,2],[F_.happy,2]],sleepy:[[F_.sl1,4],[F_.sl2,6]],sad:[[F_.sad,10]]};
const IDLE_T=[3,2,2,2,2,2];               // guide §9.2 idle loop ticks
function rng(s){let a=s>>>0||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// seeded variation within the guide: palette (6 ramps) + fluff preset (0-3); ear/tail/eye fixed (open decision)
function pals(sp){const F=W.FAMILIES,f=F&&F[sp];return f&&f.palettes?[f.palettes,f.palettes]:sp==='whimber'?[POWL,POWL0]:[PAL,PAL0]}   // manifest `palettes` (baked ramps) for new sprites
function variant(seed,sp,pal){const r=rng((seed||1)^0x9e37),[P,P0]=pals(sp),p=P0[Math.floor(r()*P0.length)],f=Math.floor(r()*4);return {pal:pal&&P.includes(pal)?pal:p,fluff:f}}   // pal: S.g.pal from origin colour chips (origin_v2 §4); fluff stays seeded
function stageFromBond(bond){const f=Math.max(0,Math.min(1,(bond||0)/500));return f<.25?1:f<.5?2:f<.75?3:4}
function stageNow(){try{const S=W.__echo&&W.__echo.state;if(!S)return 1;if(S.released)return 4;if(S.releasePath)return 5;return stageFromBond(S.bond)}catch(e){return 1}}
// Families v1 looks: g.look picks px/<sprite>_<look>_<pal>_f<fl>.png when it is a BUILT look (FAMILIES[f].looks) other than
// the family's base look (fox / owl = today's sheets). Unknown / missing look -> today's sheet (old saves have no g.look).
function lookOf(sp,g,pal){const F=W.FAMILIES,f=F&&F[sp],l=g&&g.look;return f&&l&&l!==f.look_base&&(f.looks||[]).includes(l)&&(!pal||(f.chips||[]).some(c=>c.ramp===pal))?l:null}   // looks are baked in the chip colours only
const MISS={};function probe(url,fb){if(url===fb||MISS[url]!=null)return;MISS[url]=1;const im=new Image();im.onload=()=>{MISS[url]=0};
  im.onerror=()=>{MISS[url]=2;try{document.querySelectorAll('.px-echo').forEach(el=>{for(const k of ['_base']){if(el[k]&&el[k].includes(url))el[k]=el[k].split(url).join(fb)}if(el.style.backgroundImage.includes(url))el.style.backgroundImage=el.style.backgroundImage.split(url).join(fb)})}catch(e){}};im.src=url+'.png'}   // missing look sheet: fall back to the family sheet
function sheetBase(sp,g){const v=variant(g&&g.seed,sp,g&&g.pal),l=lookOf(sp,g,v.pal),fb=`px/${sp}_${v.pal}_f${v.fluff}`,u=l&&MISS[`px/${sp}_${l}_${v.pal}_f${v.fluff}`]!==2?`px/${sp}_${l}_${v.pal}_f${v.fluff}`:fb;if(l)probe(u,fb);return {v,u}}
function label(sp,g){const F=W.FAMILIES;return String((g&&g.name)||(F&&F[sp]&&F[sp].label)||'').replace(/"/g,'')}   // screen-reader name: the Echo's own name, else the family word
function whimber(g,stage){const {u,v}=sheetBase('whimber',g),lt=stage===1;stage=stage||stageNow();
  {const pre=new Image();pre.src=`${u}_fly.png`}   // v1.1: no flash on the first take-off
  return `<div class="echo-svg px-echo owl" role="img" aria-label="${label('whimber',g)}" data-expr="neutral" data-stage="${stage}" ${gAttr(lt,v)} style="background-image:url(${u}${lt?'_light':''}.png)">${lt?'':AURA_CV}</div>`}
// any other family's sprite (manifest `sprite`): the same home-sheet element; class fox = ground style, owl = sky style (blink/fly packs)
function echo(sp,g,stage){const F=W.FAMILIES,f=F&&F[sp],cls=f&&f.games&&f.games.style==='sky'?'owl':'fox',{u,v}=sheetBase(sp,g),lt=stage===1;stage=stage||stageNow();
  return `<div class="echo-svg px-echo ${cls}" role="img" aria-label="${label(sp,g)}" data-expr="neutral" data-stage="${stage}" ${gAttr(lt,v)} style="background-image:url(${u}${lt?'_light':''}.png)">${lt?'':AURA_CV}</div>`}
function slyte(g,stage){const {u,v}=sheetBase('slyte',g),lt=stage===1;stage=stage||stageNow();
  return `<div class="echo-svg px-echo fox" role="img" aria-label="${label('slyte',g)}" data-expr="neutral" data-stage="${stage}" ${gAttr(lt,v)} style="background-image:url(${u}${lt?'_light':''}.png)">${lt?'':AURA_CV}</div>`}
// ---- glow v1.1 (handoff/glow_v1.md §2): the Echo keeps its origin colour; bond grows an aura in its OWN colour (G1..G5).
// Runtime outline glow: octagonal dilation of the frame alpha -> dithered bands (rim, glow) + seeded white sparkles. Opaque px only.
let AURA=null,LASTLV=0;const AURA_CV='<canvas class="aura" width="74" height="65" aria-hidden="true"></canvas>';   // a CHILD of the sprite: it moves, flips and squishes with it in every state
try{fetch('px/aura.json').then(r=>r.json()).then(j=>{AURA=j;document.querySelectorAll('.px-echo').forEach(e=>{e._ak=null;auraDraw(e)})}).catch(()=>{})}catch(e){}
function glowLevel(bond,ready){if(ready)return 5;const b=bond||0;return b>=370?4:b>=210?3:b>=70?2:1}
function lowFxNow(){try{const S=W.__echo&&W.__echo.state;return !!(S&&S.lowfx)||!!(W.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)}catch(e){return false}}
function curGlow(){try{return (W.__echo&&W.__echo.glow)?W.__echo.glow():1}catch(e){return 1}}
function gAttr(lt,v){return lt?'data-light="1" data-glow="0"':`data-glow="${curGlow()}" data-pal="${v.pal}"`}
const IMG={};function img(u){let i=IMG[u];if(!i){i=IMG[u]=new Image();i.onload=()=>document.querySelectorAll('.px-echo').forEach(e=>{e._ak=null;auraDraw(e)});i.src=u}return i}
function dilate(a,w,h,n){const dist=new Uint8Array(w*h).fill(99);let cur=new Uint8Array(w*h);for(let i=0;i<w*h;i++)if(a[i]){cur[i]=1;dist[i]=0}
  for(let s=1;s<=n;s++){const nx=new Uint8Array(cur);for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(cur[y*w+x])continue;let on=0;
      for(let b=-1;b<=1&&!on;b++)for(let c=-1;c<=1&&!on;c++){if(s%2===0&&b&&c)continue;const X=x+c,Y=y+b;if(X>=0&&Y>=0&&X<w&&Y<h&&cur[Y*w+X])on=1}
      if(on){nx[y*w+x]=1;dist[y*w+x]=s}}cur=nx}return dist}
const hex=c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16),255];
// img/sx/sy/sw/sh: the source frame; level 1..5; pal: the Echo palette. o.bands overrides (origin strip), o.ring limits the
// painted distance (step-up), o.phase = G5 shimmer phase, o.seed = Echo seed. Returns a canvas padded 13 px (scaled) L/T/R, 4 px below.
const ACACHE={};
function aura(im,sx,sy,level,pal,o){o=o||{};if(!AURA||!im||!im.complete||!im.naturalWidth||!level)return null;const sw=o.sw||N,sh=o.sh||N,k=sh/48;
  const L=AURA.levels[level],RO=AURA.roles[pal]||AURA.roles[Object.keys(AURA.roles)[0]],ph=o.phase||0;
  const bands=o.bands||L.bands.map(([w,r,d],i,A)=>[Math.max(1,Math.round(w*k)),r,(level===5&&ph&&i===A.length-1)?6:d]);
  const R=bands.reduce((a,b)=>a+b[0],0),P=o.bands?Math.max(R+1,7):Math.round(13*k),PB=o.bands?Math.max(2,Math.round(P/3)):Math.round(4*k),w=sw+2*P,h=sh+P+PB;
  const key=[im.src,sx,sy,sw,sh,level,pal,ph,o.ring==null?'':o.ring,o.seed||0,o.bands?'s':''].join('|');if(ACACHE[key])return ACACHE[key];
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(im,sx,sy,sw,sh,P,P,sw,sh);
  const d0=x.getImageData(0,0,w,h),a=new Uint8Array(w*h);for(let i=0;i<w*h;i++)a[i]=d0.data[i*4+3]?1:0;
  const dist=dilate(a,w,h,R),out=x.createImageData(w,h),D=out.data,col={rim:hex(RO.rim[level-1]),glow:hex(RO.glow)},B4=AURA.bayer4,lim=o.ring==null?R:o.ring;
  for(let y=0;y<h;y++)for(let X=0;X<w;X++){const dd=dist[y*w+X];if(!dd||dd===99||dd>lim)continue;let acc=0;
    for(const [bw,r,den] of bands){acc+=bw;if(dd<=acc){if(B4[y%4][X%4]<den){const q=(y*w+X)*4,cc=col[r];D[q]=cc[0];D[q+1]=cc[1];D[q+2]=cc[2];D[q+3]=255}break}}}
  if(!o.bands&&(o.ring==null||o.ring>=R)){const r=rng((o.seed||1)+level+(ph?2:0)),sp=hex(AURA.spark);
    for(let i=0;i<L.sparkles;i++){const X=2+Math.floor(r()*(w-4)),y=2+Math.floor(r()*(h*.75-2));if(a[y*w+X])continue;const put=(px,py,cc)=>{if(a[py*w+px])return;const q=(py*w+px)*4;D[q]=cc[0];D[q+1]=cc[1];D[q+2]=cc[2];D[q+3]=255};
      put(X,y,sp);if(L.cross&&i%2===0)for(const [u,v] of [[1,0],[-1,0],[0,1],[0,-1]])put(X+u,y+v,col.rim)}}
  x.putImageData(out,0,0);ACACHE[key]=c;return c}
// paint the sibling canvas.aura of a home sprite; repaints only when frame / level / phase change. Step-up: one ring per 2 ticks.
function auraDraw(el){const cv=el.querySelector(':scope>canvas.aura');if(!cv)return;
  const lv=+el.dataset.glow||0,lowfx=lowFxNow();if(el._ev&&el._ev.kind==='arrival'||el.dataset.light){if(el._ak!=='none'){cv.getContext('2d').clearRect(0,0,74,65);el._ak='none'}return}
  const R=AURA?AURA.radius[lv]||0:0;if(el._lv==null)el._lv=Math.min(lv,LASTLV||lv);LASTLV=Math.max(LASTLV||0,lv);if(lv>el._lv){el._ring=lowfx?null:(AURA?AURA.radius[el._lv]||0:0);el._lv=lv;el._rk=0}
  if(el._ring!=null&&++el._rk>=2){el._rk=0;el._ring++;if(el._ring>=R)el._ring=null}
  const ph=lv===5&&!lowfx?((Date.now()/3000|0)%2):0,m=/url\("?([^")]+)"?\)/.exec(el.style.backgroundImage||'');if(!m)return;
  const bp=(el.style.backgroundPosition||'0px 0px').split(' ').map(v=>-parseInt(v)||0),key=[m[1],bp,lv,ph,el._ring].join('|');if(key===el._ak)return;
  const c=aura(img(m[1]),bp[0],bp[1],lv,el.dataset.pal,{phase:ph,ring:el._ring,seed:(W.__echo&&W.__echo.state&&W.__echo.state.g&&W.__echo.state.g.seed)||1});
  const x=cv.getContext('2d');x.clearRect(0,0,74,65);if(c)x.drawImage(c,0,0);el._ak=c?key:null}
// ---- 12 fps clock: idle loop + random blink / ear flick / tail flick, expression overrides
// one-shot event animations from the _ev sheet (guide 9.2): arrival (P0) and release dissolve (P1, must ship)
const EV={arrival:{row:0,t:[1,1,1,1,1,1,1,1,1,1,1,3,2,2,6]},release:{row:1,t:[3,2,1,1,1,1,1,2,1,1,2,3,3]}};
function event(el,kind,cb){if(!el)return;const e=EV[kind];if(el.dataset.light){el.style.backgroundImage=el.style.backgroundImage.replace('_light.png','.png');delete el.dataset.light;el._base=null}if(!el._base)el._base=el.style.backgroundImage;
  el._ev={kind,row:e.row,t:e.t,i:0,k:0,cb};el.style.backgroundImage=el._base.replace('.png','_ev.png');evStep(el)}
function evStep(el){const v=el._ev;el.style.backgroundPosition=`${-v.i*N}px ${-v.row*N}px`;el._col='ev'+v.row+':'+v.i;auraDraw(el);
  if(++v.k>=v.t[v.i]){v.k=0;v.i++;if(v.i>=v.t.length){el._ev=null;if(v.kind==='release'){el.style.visibility='hidden'}else{el.style.backgroundImage=el._base}
    try{v.cb&&v.cb()}catch(e){console.error(e)}}}}
function step(el){if(el._ev)return evStep(el);if(el._sleep)return sleepStep(el);if(el._wake)return wakeStep(el);if(el._walk)return walkStep(el);if(el._fly)return flyStep(el);const st=+el.dataset.stage||1,ex=el.getAttribute('data-expr')||'neutral';let s=el._s;
  if(!s){s=el._s={i:0,hold:0,q:[],nb:rand(24,72),ne:rand(48,108),nt:rand(60,120),t:0}}
  s.t++;let col;
  if(s.ex!==ex){s.ex=ex;s.si=0;s.sh=0}
  const sq=SEQ[ex];
  if(s.q.length){const [c,n]=s.q[0];col=c;if(--s.q[0][1]<=0)s.q.shift()}
  else if(sq){const L=sq.s||sq,lp=sq.loop||0;col=L[s.si][0];if(++s.sh>=L[s.si][1]){s.sh=0;s.si++;if(s.si>=L.length)s.si=lp}}
  else{ const sleepy=el.dataset.sleepy==='1';
        if(--s.nb<=0){const b=el.classList.contains('owl')&&(s.alt=!s.alt)?FR.think:FR.blink;   // blink pack (aliveness B1): 2 ticks every 2-6 s,
          if(sleepy)s.q.push([FR.blink,6],[FR.sl1,3]);                                             // heavy when sleepy (6 ticks, then sl1)
          else if(Math.random()<.15)s.q.push([FR.blink,2],[FR.idle[0],2],[FR.blink,2]);            // double blink ~15%
          else s.q.push([b,2]);s.nb=rand(24,72)}
        if(--s.ne<=0){s.q.push([FR.ear1,2],[FR.ear2,2]);s.ne=rand(48,108)} // ear flick
        if(--s.nt<=0){s.q.push([FR.tail1,2],[FR.tail2,2],[FR.tail1,1]);s.nt=rand(60,120)} // tail flick
        if(++s.hold>=IDLE_T[s.i]*(sleepy?1.4:1)){s.hold=0;s.i=(s.i+1)%6}col=FR.idle[s.i]}
  if(el.dataset.light)col=FR.idle[s.i];el.style.backgroundPosition=`${-col*N}px 0px`;el._col=col;auraDraw(el)}   // glow v1: one row, the aura carries the bond
const rand=(a,b)=>a+Math.floor(Math.random()*(b-a));
setInterval(()=>document.querySelectorAll('.px-echo').forEach(step),TICK);
// ---- integer scaling: 180x320 virtual phone screen, largest whole device-pixel multiple, letterboxed
const VW=180,VH=320;
function fit(){const sc=document.getElementById('screen');if(!sc)return;const d=W.devicePixelRatio||1;
  const k=Math.max(1,Math.floor(Math.min(innerWidth*d/VW,innerHeight*d/VH)));const s=k/d;
  const x=Math.round((innerWidth*d-VW*k)/2)/d,y=Math.round((innerHeight*d-VH*k)/2)/d;
  sc.style.transform=`translate(${x}px,${y}px) scale(${s})`;sc.dataset.k=k;document.documentElement.style.setProperty('--px-k',k)}
function wrap(){if(document.getElementById('screen')||!document.getElementById('app'))return;const sc=document.createElement('div');sc.id='screen';
  ['app','overlay','toast'].forEach(id=>{const e=document.getElementById(id);if(e)sc.appendChild(e)});document.body.appendChild(sc);fit()}
addEventListener('resize',fit);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wrap);else wrap();
// ---- Echoes don't talk: they chirp. Sound comes later; this is the hook.
W.Chirp={enabled:true,last:null,play(text,kind){this.last={text:String(text),kind,at:Date.now()};
  try{W.dispatchEvent(new CustomEvent('echo-chirp',{detail:this.last}))}catch(e){}}};
function queue(el,seq,add){if(!el||el._ev)return;if(!el._s)step(el);const q=seq.map(x=>x.slice());el._s.q=add?el._s.q.concat(q):q}   // play raw frames once
// v1.1 F1: Whimber flap cycle, px/whimber_<pal>_f<fl>_fly.png (rows = stages like the home sheet, cols = fly0..fly3, 2 ticks each)
function fly(el,on){if(!el||el._ev||!el.classList.contains('owl'))return;if(!el._base)el._base=el.style.backgroundImage;
  if(on&&!el._fly){el._fly={i:0,k:0};el.style.backgroundImage=el._base.replace('.png','_fly.png');flyStep(el)}
  else if(!on&&el._fly){el._fly=null;el.style.backgroundImage=el._base;if(el._s)el._s.q=[]}}
function flyStep(el){const f=el._fly;el.style.backgroundPosition=`${-f.i*N}px 0px`;el._col='fly'+f.i;auraDraw(el);if(++f.k>=2){f.k=0;f.i=(f.i+1)%4}}
// sleep_poses v1: side-on sleep sheet px/<sprite>[_<look>]_<pal>_sleep.png, 4 cols: breathe 0-1-2-1 at 600 ms, stir (col 3, 300 ms)
// every 6-10 s; reduced motion holds col 0. The aura follows each column.
function sleep(el,on){if(!el||el._ev)return;if(!el._base)el._base=el.style.backgroundImage;
  if(on&&!el._sleep){if(el._fly)fly(el,false);el._sleep={i:0,k:0,st:rand(72,120)};el.style.backgroundImage=el._base.replace(/_f\d+(_light)?\.png/,'_sleep.png');sleepStep(el)}
  else if(!on&&el._sleep){el._sleep=null;el.style.backgroundImage=el._base;if(el._s)el._s.q=[]}}
// wander v1: side-on walk sheet ..._walk.png (13 cols): walk0-5 (2 ticks), trot0-3 (1 tick), crouch(6) leap(6) land(3)
const WALK={walk:[[0,2],[1,2],[2,2],[3,2],[4,2],[5,2]],trot:[[6,1],[7,1],[8,1],[9,1]],pounce:[[10,6],[11,6],[12,3]]};
function walk(el,mode){if(!el||el._ev)return;if(!el._base)el._base=el.style.backgroundImage;if(el._wake){el._wake=null;el.style.backgroundImage=el._base}
  if(mode){if(el._sleep)sleep(el,false);const lo=lowFxNow()&&mode!=='pounce';el._walk={m:lo?'walk':mode,i:0,k:0,slow:lo};el.style.backgroundImage=el._base.replace(/(_f\d+)(_light)?\.png/,'$1_walk.png');walkStep(el)}
  else if(el._walk){el._walk=null;el.style.backgroundImage=el._base;if(el._s)el._s.q=[]}}
function walkStep(el){const w=el._walk,L=WALK[w.m],[c,h]=L[Math.min(w.i,L.length-1)];el.style.backgroundPosition=`${-c*N}px 0px`;el._col='walk'+c;auraDraw(el);
  if(++w.k>=(w.slow?3:h)){w.k=0;w.i++;if(w.i>=L.length)w.i=w.m==='pounce'?L.length-1:0}}
// wake: the sleep pose played in reverse (deeper-out 2 → out 1 → in 0, then the stir as it rouses), then the home sheet. lowFx: instant swap
function wake(el,cb){if(!el){cb&&cb();return}if(!el._base)el._base=el.style.backgroundImage;const was=!!el._sleep;el._sleep=null;
  if(!was||lowFxNow()){el._wake=null;el.style.backgroundImage=el._base;if(el._s)el._s.q=[];cb&&cb();return}
  el.style.backgroundImage=el._base.replace(/_f\d+(_light)?\.png/,'_sleep.png');el._wake={q:[[2,3],[1,3],[0,3],[3,4]],i:0,k:0,cb};wakeStep(el)}
function wakeStep(el){const w=el._wake,[c,h]=w.q[w.i];el.style.backgroundPosition=`${-c*N}px 0px`;el._col='sl'+c;auraDraw(el);
  if(++w.k>=h){w.k=0;w.i++;if(w.i>=w.q.length){el._wake=null;el.style.backgroundImage=el._base;if(el._s)el._s.q=[];const cb=w.cb;cb&&cb()}}}
const SLP=[0,1,2,1];function sleepStep(el){const z=el._sleep;let col=lowFxNow()?0:SLP[z.i];if(!lowFxNow()){if(--z.st<=0&&z.k===0){z.stir=4;z.st=rand(72,120)}if(z.stir>0){z.stir--;col=3}else if(++z.k>=7){z.k=0;z.i=(z.i+1)%4}}
  el.style.backgroundPosition=`${-col*N}px 0px`;el._col='sl'+col;auraDraw(el)}
function blink(el,slow){queue(el,[[FR.blink,slow?5:2]],true)}   // slow blink on pet / love lines; a blink on every turn
function react(el,kind){if(!el||el._ev)return;const r=REACT[kind];if(!r)return;if(!el._s)step(el);el._s.q=r.map(x=>x.slice())}
// pixel icons (16x16, guide 8). Emoji in care/dialogue data map to icons; dialogue choices fall back to their reply intent.
const EMO={'🔔':'bell','🧶':'yarn','🌞':'sunny_puff','🟣':'plum','🥭':'mango','🍑':'peach','🎃':'pumpkin_soup','🍞':'toast','🥒':'cucumber','🌻':'seeds','🌸':'flower','🪨':'pebble','📜':'scroll','🐾':'stamp_paw','🍂':'glowleaf','💫':'starfeather','🥄':'spoon','🐈':'cat','🐋':'whale','🏡':'house','🐉':'dragon','🎈':'balloon','✦':'sparkle','🍎':'apple','🫐':'berry','🍯':'honey','🌰':'nut','🐟':'fish','🥓':'meat','💧':'water','✋':'hand','🌙':'moon','🌲':'tree','🤗':'heart','💗':'heart','❤️':'heart','📖':'book',
  '✕':'close','🌟':'sticker','🍓':'strawberry','🥞':'pancakes','✨':'sparkle','♪':'note','💎':'gem','💬':'talk','👍':'yes','👂':'ear','🙂':'smile','😂':'laugh','😄':'laugh','🤪':'silly','😮':'wow','🤔':'question','⏰':'later','👋':'hand','😊':'smile','🎵':'talk','⭐':'sticker','🏠':'house','🕳️':'dig','🪺':'weave','🤫':'smile','👃':'nose','🍃':'leaf','🪶':'feather','😌':'proud','😢':'sad','😮':'wow','📬':'mail_open','📪':'mail_closed','🖼️':'postcard','✉️':'postcard','⏩':'skip','🌿':'leaf','🦊':'sticker','▶':'skip','🌼':'sparkle','🍂':'leaf'};
const INT={yes:'yes',no:'no',unsure:'question',listen:'ear',nod:'smile',giggle:'laugh',ask_more:'talk',later:'later',wow:'wow',silly:'silly'};
const ICON_FILE={dig:'dig/icon',weave:'weave/icon',feed:'icon_feed',play:'icon_play',pet:'icon_pet',sleep:'icon_sleep'};
function iconName(emoji,intent){const e=String(emoji||'').trim();return EMO[e]||EMO[e.replace(/\uFE0F/g,'')]||INT[intent]||'talk'}
function icon(name){return `<i class="pxi" data-icon="${name}" style="background-image:url(px/${ICON_FILE[name]||'i_'+name}.png)"></i>`}
W.PIXEL={pals:sp=>pals(sp)[0],echo,walk,wake,sleep,glowLevel,aura,auraDraw,get AURA(){return AURA},queue,blink,fly,whimber,POWL,POWL0,PAL0,sheet:(sp,g)=>sheetBase(sp,g).u+'.png',lookOf,event,EV,react,icon,iconName,SEQ,variant,stageFromBond,stageNow,slyte,fit,FR,PAL,bg:k=>`<div class="bg pxbg pxbg-${k}"></div>`};
})();
