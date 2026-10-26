// H9 (final): phone weather engine, fully offline. Weather comes only from the on-device season/date cycle:
//  - deterministic: local date + 6-hour block + month -> one of 6 cozy states (same device clock = same weather).
//  - Grown-Ups override: S.weatherOverride = 'auto' (default) | 'off' | 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'storm'.
//  - it is the Echo's OWN world (its den / scene), never a claim about the child's weather. tools/test-no-weather.js keeps this file
//    and the app bundle free of any location or remote lookup.
//  - feeds ctx.weather to the dialogue (game.js Dialogue.ctx / needCtx, dialogue_engine resolveContext) and the Echo's weather
//    reactions (catch a flake, shake off water, cozy up).
//  - never touches character sprite pixels: one canvas layer behind the Echo (z-index 5), pointer-events none, whole pixels only.
(function(){'use strict';const W=typeof window!=='undefined'?window:globalThis;
const STATES=['clear','cloudy','rain','snow','fog','storm'];
const SEASON_W={   // weights per season (snow only in winter, Dec-Feb, matching game.js snowSeason())
  winter:{clear:.35,cloudy:.25,snow:.25,fog:.15},
  spring:{clear:.40,cloudy:.25,rain:.25,fog:.10},
  summer:{clear:.60,cloudy:.20,rain:.10,storm:.10},
  autumn:{clear:.35,cloudy:.30,rain:.20,fog:.15}};
const seasonOf=m=>m===11||m<=1?'winter':m<=4?'spring':m<=7?'summer':'autumn';
function h32(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h>>>0}
function seasonal(date){const d=date instanceof Date?date:new Date(date==null?Date.now():date),m=d.getMonth(),se=seasonOf(m),wts=SEASON_W[se];
  const key=`${d.getFullYear()}-${m+1}-${d.getDate()}|${Math.floor(d.getHours()/6)}`,u=(h32(key)%10000)/10000;let acc=0;
  for(const k of Object.keys(wts)){acc+=wts[k];if(u<acc)return {state:k,season:se,key}}return {state:'clear',season:se,key}}
function current(S,date){const ov=S&&S.weatherOverride;if(ov==='off')return {state:'off',src:'override'};
  if(ov&&ov!=='auto'&&STATES.includes(ov))return {state:ov,src:'override'};
  if(S&&S.weatherOn===false)return {state:'off',src:'flag'};
  const r=seasonal(date);return {state:r.state,season:r.season,src:'season'}}
// ---- dialogue + reactions (the Echo's own world)
const REACTIONS={snow:'catch_flake',rain:'shake_off',storm:'cozy_up',fog:'cozy_up'};
const API={STATES,SEASON_W,seasonOf,seasonal,current,REACTIONS,
  dialogueCtx(S,date){const c=current(S,date);return c.state==='off'?undefined:c.state},   // ctx.weather ('off' -> no weather talk)
  reactionFor(state){return REACTIONS[state]||null}};
// ---- renderer
let raf=0,parts=[],cur=null,el=null,lastT=0;
function lowFx(){try{const S=W.__echo&&W.__echo.state;return !!(S&&(S.lowfx||S.calm))||!!(W.matchMedia&&W.matchMedia('(prefers-reduced-motion: reduce)').matches)}catch(e){return false}}
function rnd(seed){let a=seed>>>0||1;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function seed(state){const r=rnd(h32(state)),low=lowFx();parts=[];
  const N={clear:0,cloudy:4,rain:low?10:46,snow:low?8:34,fog:3,storm:low?12:60}[state]||0;
  for(let i=0;i<N;i++){if(state==='cloudy'||state==='fog')parts.push({x:r()*196,y:state==='fog'?150+r()*150:10+r()*70,w:state==='fog'?90+r()*60:22+r()*18,v:2+r()*3,k:'band'});
    else parts.push({x:r()*196,y:r()*336,v:state==='snow'?10+r()*10:state==='storm'?150+r()*60:110+r()*50,ph:r()*6.28,k:state==='snow'?'flake':'drop'})}}
function draw(dt){if(!el||!el.isConnected){stop();return}const cx=el.getContext&&el.getContext('2d');if(!cx)return;cx.clearRect(0,0,196,336);const st=cur&&cur.state;
  if(st==='storm'||st==='rain'){cx.fillStyle=st==='storm'?'rgba(36,22,44,.16)':'rgba(59,42,92,.08)';cx.fillRect(0,0,196,336)}   // cozy dim, never a flash
  for(const p of parts){
    if(p.k==='drop'){p.y+=p.v*dt;p.x-=p.v*dt*.25;if(p.y>336){p.y=-4;p.x=Math.random()*210}if(p.x<-4)p.x=200;cx.fillStyle='rgba(185,221,240,.75)';const x=Math.round(p.x),y=Math.round(p.y);cx.fillRect(x,y,1,1);cx.fillRect(x-1,y+1,1,1);cx.fillRect(x-1,y+2,1,1)}
    else if(p.k==='flake'){p.ph+=dt*1.6;p.y+=p.v*dt;p.x+=Math.sin(p.ph)*6*dt;if(p.y>336){p.y=-2;p.x=Math.random()*196}cx.fillStyle='#FFFFFF';cx.fillRect(Math.round(p.x),Math.round(p.y),(p.ph|0)%3?1:2,(p.ph|0)%3?1:2)}
    else{p.x+=p.v*dt;if(p.x>200)p.x=-p.w;cx.fillStyle=st==='fog'?'rgba(255,246,230,.20)':'rgba(255,255,255,.85)';const x=Math.round(p.x),y=Math.round(p.y),w=Math.round(p.w);
      if(st==='fog')cx.fillRect(x,y,w,6);else{cx.fillRect(x,y+3,w,5);cx.fillRect(x+4,y,w-10,4)}}}}
function loop(t){const dt=lastT?Math.min(.1,(t-lastT)/1000):1/60;lastT=t;draw(dt);if(el&&!lowFx())raf=W.requestAnimationFrame(loop);else raf=0}
function stop(){if(raf&&W.cancelAnimationFrame)W.cancelAnimationFrame(raf);raf=0}
API.mount=function(scEl,opts){if(!scEl||!scEl.querySelector)return null;const S=(W.__echo&&W.__echo.state)||{};cur=current(S,opts&&opts.date);
  const old=scEl.querySelector('canvas.wx-layer');if(old)old.remove();stop();scEl.dataset.weather=cur.state;
  if(cur.state==='off'||cur.state==='clear'){el=null;return null}   // clear: the den's own sunbeam/firefly motes already show it
  el=W.document.createElement('canvas');el.className='wx-layer wx-'+cur.state;el.width=196;el.height=336;el.setAttribute('aria-hidden','true');
  el.style.cssText='position:absolute;left:-8px;top:-8px;width:196px;height:336px;z-index:5;pointer-events:none;image-rendering:pixelated';
  scEl.appendChild(el);seed(cur.state);lastT=0;draw(1/60);if(!lowFx()&&W.requestAnimationFrame)raf=W.requestAnimationFrame(loop);return el};
API.refresh=function(scEl){const S=(W.__echo&&W.__echo.state)||{},n=current(S);if(!cur||n.state!==cur.state)return API.mount(scEl);return el};
API.stop=stop;API.now=()=>cur;
// Echo weather reactions (H9 final, the Echo's own world). Returns the reaction name or null. Gestures reuse existing frames.
API.react=function(state){const kind=API.reactionFor(state||(cur&&cur.state));if(!kind)return null;const doc=W.document;if(!doc)return kind;
  const sc=doc.getElementById&&doc.getElementById('sc'),pe=doc.querySelector&&doc.querySelector('#cr .px-echo'),A=W.Alive,low=lowFx();
  let x=90,y=210;try{if(sc&&pe){const R=sc.getBoundingClientRect(),z=R.width/180||1,r=pe.getBoundingClientRect();x=Math.round((r.left-R.left)/z+24);y=Math.round((r.top-R.top)/z+10)}}catch(e){}
  const dot=(cls,css,ms)=>{if(!sc||low)return;const e=doc.createElement('i');e.className='wxfx '+cls;e.style.cssText='position:absolute;width:2px;height:2px;pointer-events:none;z-index:31;'+css;sc.appendChild(e);setTimeout(()=>{try{e.remove()}catch(_){}},ms)};
  if(kind==='catch_flake'){dot('wxflake',`left:${x}px;top:${y-30}px;background:#fff`,900);try{A&&A.act&&A.act('lookup')}catch(e){}setTimeout(()=>{try{W.react&&W.react('excited')}catch(e){}},700)}
  else if(kind==='shake_off'){try{A&&A.act&&A.act('preen')}catch(e){}for(let i=0;i<6;i++)dot('wxdrop',`left:${x+(i%2?14:-14)+(i>>1)*3}px;top:${y+6+i*2}px;background:#B9DDF0`,600)}
  else if(kind==='cozy_up'){try{A&&A.act&&A.act('settle')}catch(e){}}
  API.lastReaction=kind;return kind};
W.WEATHER=API;if(typeof module!=='undefined')module.exports=API;
})();
