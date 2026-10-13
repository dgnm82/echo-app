// Pixel-art runtime (style guide v1): one virtual pixel grid per screen, integer device-pixel scaling,
// 12 fps sprite clock (1 tick = 83 ms), Slyte sprite sheets baked by tools/bake_pixel.py, chirp hook.
(function(){
const W=window, TICK=83, N=48;
const PAL=['mint-teal','violet-rose','sunset-gold','rose-sapphire','teal-gold','sky-periwinkle'];
const POWL=['lilac-night','sky-teal','plum-blush','mint-aurora','peach-dusk'];   // Whimber: the 5 POWL ramps (guide §6)
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
function variant(seed,sp){const r=rng((seed||1)^0x9e37),P=sp==='whimber'?POWL:PAL;return {pal:P[Math.floor(r()*P.length)],fluff:Math.floor(r()*4)}}
function stageFromBond(bond){const f=Math.max(0,Math.min(1,(bond||0)/500));return f<.25?1:f<.5?2:f<.75?3:4}
function stageNow(){try{const S=W.__echo&&W.__echo.state;if(!S)return 1;if(S.released)return 4;if(S.releasePath)return 5;return stageFromBond(S.bond)}catch(e){return 1}}
function whimber(g,stage){const v=variant(g&&g.seed,'whimber');stage=stage||stageNow();
  {const pre=new Image();pre.src=`px/whimber_${v.pal}_f${v.fluff}_fly.png`}   // v1.1: no flash on the first take-off
  return `<div class="echo-svg px-echo owl" role="img" aria-label="Whimber" data-expr="neutral" data-stage="${stage}" style="background-image:url(px/whimber_${v.pal}_f${v.fluff}.png)"></div>`}
function slyte(g,stage){const v=variant(g&&g.seed);stage=stage||stageNow();
  return `<div class="echo-svg px-echo fox" role="img" aria-label="Slyte" data-expr="neutral" data-stage="${stage}" style="background-image:url(px/slyte_${v.pal}_f${v.fluff}.png)"></div>`}
// ---- 12 fps clock: idle loop + random blink / ear flick / tail flick, expression overrides
// one-shot event animations from the _ev sheet (guide 9.2): arrival (P0) and release dissolve (P1, must ship)
const EV={arrival:{row:0,t:[1,1,1,1,1,1,1,1,1,1,1,3,2,2,6]},release:{row:1,t:[3,2,1,1,1,1,1,2,1,1,2,3,3]}};
function event(el,kind,cb){if(!el)return;const e=EV[kind];if(!el._base)el._base=el.style.backgroundImage;
  el._ev={kind,row:e.row,t:e.t,i:0,k:0,cb};el.style.backgroundImage=el._base.replace('.png','_ev.png');evStep(el)}
function evStep(el){const v=el._ev;el.style.backgroundPosition=`${-v.i*N}px ${-v.row*N}px`;el._col='ev'+v.row+':'+v.i;
  if(++v.k>=v.t[v.i]){v.k=0;v.i++;if(v.i>=v.t.length){el._ev=null;if(v.kind==='release'){el.style.visibility='hidden'}else{el.style.backgroundImage=el._base}
    try{v.cb&&v.cb()}catch(e){console.error(e)}}}}
function step(el){if(el._ev)return evStep(el);if(el._fly)return flyStep(el);const st=+el.dataset.stage||1,ex=el.getAttribute('data-expr')||'neutral';let s=el._s;
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
  el.style.backgroundPosition=`${-col*N}px ${-(st-1)*N}px`;el._col=col}
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
function flyStep(el){const f=el._fly,st=+el.dataset.stage||1;el.style.backgroundPosition=`${-f.i*N}px ${-(st-1)*N}px`;el._col='fly'+f.i;if(++f.k>=2){f.k=0;f.i=(f.i+1)%4}}
function blink(el,slow){queue(el,[[FR.blink,slow?5:2]],true)}   // slow blink on pet / love lines; a blink on every turn
function react(el,kind){if(!el||el._ev)return;const r=REACT[kind];if(!r)return;if(!el._s)step(el);el._s.q=r.map(x=>x.slice())}
// pixel icons (16x16, guide 8). Emoji in care/dialogue data map to icons; dialogue choices fall back to their reply intent.
const EMO={'🌻':'seeds','🌸':'flower','🪨':'pebble','📜':'scroll','🐾':'stamp_paw','🍂':'glowleaf','💫':'starfeather','🥄':'spoon','🐈':'cat','🐋':'whale','🏡':'house','🐉':'dragon','🎈':'balloon','✦':'sparkle','🍎':'apple','🫐':'berry','🍯':'honey','🌰':'nut','🐟':'fish','🥓':'meat','💧':'water','✋':'hand','🌙':'moon','🌲':'tree','🤗':'heart','💗':'heart','❤️':'heart','📖':'book',
  '✕':'close','🌟':'sticker','✨':'sparkle','💎':'gem','💬':'talk','👍':'yes','👂':'ear','🙂':'smile','😂':'laugh','😄':'laugh','🤪':'silly','😮':'wow','🤔':'question','⏰':'later','👋':'hand','😊':'smile','🎵':'talk','⭐':'sticker','🏠':'fort','🤫':'smile','👃':'nose','🍃':'leaf','🪶':'feather','😌':'proud','😢':'sad','😮':'wow','📬':'mail_open','📪':'mail_closed','🖼️':'postcard','✉️':'postcard','⏩':'skip','🌿':'leaf','🦊':'sticker','▶':'skip','🌼':'sparkle','🍂':'leaf'};
const INT={yes:'yes',no:'no',unsure:'question',listen:'ear',nod:'smile',giggle:'laugh',ask_more:'talk',later:'later',wow:'wow',silly:'silly'};
const ICON_FILE={fort:'fort/b_window',feed:'icon_feed',play:'icon_play',pet:'icon_pet',sleep:'icon_sleep'};
function iconName(emoji,intent){const e=String(emoji||'').trim();return EMO[e]||EMO[e.replace(/\uFE0F/g,'')]||INT[intent]||'talk'}
function icon(name){return `<i class="pxi" data-icon="${name}" style="background-image:url(px/${ICON_FILE[name]||'i_'+name}.png)"></i>`}
W.PIXEL={queue,blink,fly,whimber,POWL,sheet:(sp,g)=>{const v=variant(g&&g.seed,sp);return `px/${sp}_${v.pal}_f${v.fluff}.png`},event,EV,react,icon,iconName,SEQ,variant,stageFromBond,stageNow,slyte,fit,FR,PAL,bg:k=>`<div class="bg pxbg pxbg-${k}"></div>`};
})();
