// StackEngine (games_v2 §3.4): Pancake Tower / Cloud Steps. Pure + seeded. Slider runs 4..176 UI px.
(function(W){
const TUN=(typeof GAMES_TUNING!=='undefined'?GAMES_TUNING:(typeof require!=='undefined'?require('./games_tuning.js'):null));
const WIND={standard:.15,bigkid:.2},X0=4,X1=176;
function rng(s){let a=s>>>0||1;return()=>{a^=a<<13;a>>>=0;a^=a>>17;a^=a<<5;a>>>=0;return a/4294967296}}
function create(o){const T=(o&&o.T)||TUN,level=o.level||'standard',L=T.STACK[level],w=L.w0;
  const g={T,L,level,r:rng(o.seed||1),t:0,h:0,w,top:90-w/2,sx:X0,dir:1,pass:1,run:0,perfects:0,layers:[{x:90-w/2,w}],done:false,ev:[]};return g}
const speed=g=>Math.min(g.L.vCap,g.L.v0+g.L.vStep*g.h);
function newPass(g){const L=g.L;g.pass=L.wind&&g.h>=L.wind[0]?1+(g.r()*2-1)*(WIND[g.level]||.15):1}
function step(g,dt){if(g.done)return g;g.t+=dt;const L=g.L,span=X1-g.w-X0;let v=speed(g)*g.pass;
  if(L.ease&&g.h>=L.ease[0]){const f=(g.sx-X0)/Math.max(1,span);v*=.55+.45*Math.sin(Math.PI*Math.max(.02,Math.min(.98,f)))}
  g.sx+=g.dir*v*dt;if(g.sx>X0+span){g.sx=X0+span;g.dir=-1;newPass(g)}else if(g.sx<X0){g.sx=X0;g.dir=1;newPass(g)}return g}
// playtest: classic stacker. Tight perfect window, every overhang trimmed (no width floor or glue), and the slider
// re-enters from the side farther from the tower so a quick re-tap can't land on the same spot.
const PERFECT={easy:2,standard:1,bigkid:.5};   // E8: tighter, so near-misses get trimmed
function perfectW(g){return PERFECT[g.level]!=null?PERFECT[g.level]:g.L.perfect}
function press(g){if(g.done)return g;const L=g.L,err=g.sx-g.top;
  if(Math.abs(err)<=perfectW(g)){g.run++;g.perfects++;let x=g.top;g.ev.push({type:'perfect',run:g.run});
    if(g.run%L.regrowAfter===0&&g.w<L.w0){const nw=Math.min(L.w0,g.w+L.regrow);x-=(nw-g.w)/2;g.w=nw;g.ev.push({type:'grow'})}
    g.top=x;g.ev.push({type:'place',w:g.w,trimL:0,trimR:0,perfect:true})}
  else{g.run=0;const ov=g.w-Math.abs(err);
    if(ov<1){g.done=true;g.ev.push({type:'end',h:g.h,perfects:g.perfects});return g}
    const x=err>0?g.sx:g.top,trimL=err<0?-err:0,trimR=err>0?err:0;g.w=ov;g.top=x;g.ev.push({type:'place',w:ov,trimL,trimR})}
  g.h++;g.layers.push({x:g.top,w:g.w});const mid=X0+(X1-g.w-X0)/2;if(g.top+0>=mid){g.sx=X0;g.dir=1}else{g.sx=X1-g.w;g.dir=-1}newPass(g);return g}
function result(g){return {h:g.h,perfects:g.perfects}}   // the one source for HUD, card and extras
function score(g){return g.h}
function take(g){const e=g.ev;g.ev=[];return e}
W.StackEngine={create,step,press,take,score,result,perfectW,speed,X0,X1};if(typeof module!=='undefined')module.exports=W.StackEngine})(typeof window!=='undefined'?window:globalThis);
