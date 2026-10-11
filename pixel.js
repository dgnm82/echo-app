// Pixel-art runtime (style guide v1): one virtual pixel grid per screen, integer device-pixel scaling,
// 12 fps sprite clock (1 tick = 83 ms), Slyte sprite sheets baked by tools/bake_pixel.py, chirp hook.
(function(){
const W=window, TICK=83, N=48;
const PAL=['mint-teal','violet-rose','sunset-gold','rose-sapphire','teal-gold','sky-periwinkle'];
const FR={idle:[0,1,2,3,4,5],blink:6,ear1:7,ear2:8,tail1:9,tail2:10,happy:11};
const IDLE_T=[3,2,2,2,2,2];               // guide §9.2 idle loop ticks
const HAPPY=new Set(['happy','delighted','giggling','love','excited','eating','proud']);
function rng(s){let a=s>>>0||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// seeded variation within the guide: palette (6 ramps) + fluff preset (0-3); ear/tail/eye fixed (open decision)
function variant(seed){const r=rng((seed||1)^0x9e37);return {pal:PAL[Math.floor(r()*PAL.length)],fluff:Math.floor(r()*4)}}
function stageFromBond(bond){const f=Math.max(0,Math.min(1,(bond||0)/500));return f<.25?1:f<.5?2:f<.75?3:4}
function stageNow(){try{const S=W.__echo&&W.__echo.state;if(!S)return 1;if(S.released)return 4;if(S.releasePath)return 5;return stageFromBond(S.bond)}catch(e){return 1}}
function slyte(g,stage){const v=variant(g&&g.seed);stage=stage||stageNow();
  return `<div class="echo-svg px-echo fox" role="img" aria-label="Slyte" data-expr="neutral" data-stage="${stage}" style="background-image:url(px/slyte_${v.pal}_f${v.fluff}.png)"></div>`}
// ---- 12 fps clock: idle loop + random blink / ear flick / tail flick, expression overrides
function step(el){const st=+el.dataset.stage||1,ex=el.getAttribute('data-expr')||'neutral';let s=el._s;
  if(!s){s=el._s={i:0,hold:0,q:[],nb:rand(24,72),ne:rand(48,108),nt:rand(60,120),t:0}}
  s.t++;let col;
  if(s.q.length){const [c,n]=s.q[0];col=c;if(--s.q[0][1]<=0)s.q.shift()}
  else if(HAPPY.has(ex))col=FR.happy;
  else if(ex==='sleepy')col=FR.blink;
  else{ if(--s.nb<=0){s.q.push([FR.blink,2]);s.nb=rand(24,72)}            // blink: 2 ticks every 2-6 s
        if(--s.ne<=0){s.q.push([FR.ear1,2],[FR.ear2,2]);s.ne=rand(48,108)} // ear flick
        if(--s.nt<=0){s.q.push([FR.tail1,2],[FR.tail2,2],[FR.tail1,1]);s.nt=rand(60,120)} // tail flick
        if(++s.hold>=IDLE_T[s.i]){s.hold=0;s.i=(s.i+1)%6}col=FR.idle[s.i]}
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
W.PIXEL={variant,stageFromBond,stageNow,slyte,fit,FR,PAL,bg:k=>`<div class="bg pxbg pxbg-${k}"></div>`};
})();
