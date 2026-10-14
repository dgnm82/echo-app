// CatchEngine (games_v2 §3.3): Berry Catch / Starfall Catch. Pure + seeded. Field 180 UI px; spawn y 26, catch line y 236.
(function(W){
const TUN=(typeof GAMES_TUNING!=='undefined'?GAMES_TUNING:(typeof require!=='undefined'?require('./games_tuning.js'):null));
const F={W:180,Y0:26,LINE:236};
function rng(s){let a=s>>>0||1;return()=>{a^=a<<13;a>>>=0;a^=a>>17;a^=a<<5;a>>>=0;return a/4294967296}}
const stepVal=(t,n)=>{let v=t[0][1];for(const [k,x] of t)if(n>=k)v=x;return v};
// playtest: a smooth ramp. Every 5 catches the fall gets ~4 % faster and the gap ~4 % shorter, from the first catch;
// no simultaneous-item steps (the gap alone sets the density, capped by the level's top simul), so nothing jumps
function ramp(L,n){const k=Math.floor(n/5),top=L.simul[L.simul.length-1][1];return {fall:Math.min(L.fallCap,L.fall0*Math.pow(1.04,k)),int:Math.max(L.intMin,L.int0*Math.pow(.96,k)),simul:top,sway:stepVal(L.sway,n),dx:Math.min(L.dxMax,L.dx0+3*n)}}
const BIN=20;   // spawn "spots": 9 columns of 20 px; never 3 in a row from the same one
function create(o){const T=(o&&o.T)||TUN,level=o.level||'standard',L=T.CATCH[level],r=rng(o.seed||1),P=T.CATCH_PICK;
  return {T,L,P,level,fam:o.fam||'slyte',lowfx:!!o.lowfx,r,t:0,x:90,tx:90,items:[],n:0,streak:0,longest:0,golds:0,bonus:0,landed:0,lands:[],spawnT:.6,lastX:90,lastLand:0,nextGold:P.goldEvery[0]+Math.floor(r()*(P.goldEvery[1]-P.goldEvery[0]+1)),made:0,done:false,ev:[]}}
function landT(g,it){return g.t+(F.LINE-it.y)/it.v}
function spawn(g){const R=ramp(g.L,g.n),P=g.P;g.made++;const gold=g.made>=g.nextGold;if(gold)g.nextGold=g.made+P.goldEvery[0]+Math.floor(g.r()*(P.goldEvery[1]-P.goldEvery[0]+1));
  const v=R.fall*(gold?P.goldFall:1),tl=g.t+(F.LINE-F.Y0)/v;
  // fairness: reachable from the previous landing at echoV
  const prev=g.items.length?g.items.reduce((a,b)=>landT(g,b)>landT(g,a)?b:a):null,px=prev?prev.x:g.x,pt=prev?landT(g,prev):g.t;
  const reach=Math.max(0,g.L.echoV*(tl-pt-g.T.CATCH_FAIR.margin)*g.T.CATCH_FAIR.factor),dx=Math.min(R.dx,reach);
  const lo=Math.max(12,px-dx),hi=Math.min(F.W-12,px+dx),bin=v=>Math.floor(v/BIN),h=g.bins||(g.bins=[]),same=b=>h.length>=2&&h[h.length-1]===b&&h[h.length-2]===b;
  let x=lo+g.r()*(hi-lo);for(let t=0;t<6&&same(bin(x));t++)x=lo+g.r()*(hi-lo);   // uniform inside the reachable window (no clamping onto the edge)
  if(same(bin(x))){const b=bin(x),a=b*BIN-1,c=(b+1)*BIN;x=a>=lo?Math.max(lo,a-g.r()*Math.min(BIN,a-lo)):Math.min(hi,c+g.r()*Math.max(0,Math.min(BIN-1,hi-c)))}
  if(same(bin(x))){const b=bin(x),a=Math.max(12,b*BIN-1),c=Math.min(F.W-12,(b+1)*BIN);x=(b*BIN-1>=12&&(px-a<=c-px||(b+1)*BIN>F.W-12))?a:c}   // a tight window: step just over the spot edge
  h.push(bin(x));if(h.length>3)h.shift();
  const it={x,x0:x,y:F.Y0,v,gold,id:g.made,sway:g.lowfx?0:R.sway,ph:g.r()*6.28};g.items.push(it);g.ev.push({type:'spawn',gold});}
function step(g,dt){if(g.done)return g;g.t+=dt;const L=g.L;
  const d=g.tx-g.x,mv=L.echoV*dt;g.x+=Math.abs(d)<=mv?d:Math.sign(d)*mv;
  g.spawnT-=dt;const R=ramp(L,g.n);if(g.spawnT<=0&&g.items.length<R.simul){spawn(g);g.spawnT=R.int}
  for(const it of g.items.slice()){it.y+=it.v*dt;
    if(!it.gold&&it.sway)it.x=Math.max(8,Math.min(F.W-8,it.x0+it.sway*Math.sin(it.ph+g.t*6.28*.6)*Math.min(1,(F.LINE-it.y)/60)));
    if(it.gold&&!g.lowfx)it.x=it.x0+((Math.floor(g.t*12/4)%2)?g.P.goldZig/2:-g.P.goldZig/2)*Math.min(1,(F.LINE-it.y)/60);
    const hy=g.headY==null?F.LINE:g.headY,bot=it.y+(hy<F.LINE?8:0);   // head-touch v1: caught the moment the item's bottom reaches the head top (head-only: within headR, top band of 8 px)
    if(!it.miss&&bot>=hy&&Math.abs(it.x-g.x-(g.headDX||0))<=headR(g)){g.items.splice(g.items.indexOf(it),1);{g.n++;g.streak++;g.longest=Math.max(g.longest,g.streak);if(it.gold){g.golds++;g.bonus+=g.P.goldValue}
        g.ev.push({type:'catch',gold:it.gold,n:g.n});if(g.streak%10===0){g.bonus+=5;g.ev.push({type:'streak',n:g.streak})}}
      continue}
    if(bot>hy+8)it.miss=true;
    if(it.y>=F.LINE){g.items.splice(g.items.indexOf(it),1);{g.landed++;g.streak=0;g.lands.push(it.x);g.ev.push({type:'land',x:it.x});
        if(g.landed>=L.grass){g.done=true;g.ev.push({type:'end',n:g.n,streak:g.longest,golds:g.golds});return g}}}}
  return g}
// playtest: only a hit on the Echo's head counts (head ~ basket width minus the item overhang)
const HEAD={easy:22,standard:16,bigkid:14};function headR(g){return (HEAD[g.level]||16)/2+g.L.magnet}
function moveTo(g,x){g.tx=Math.max(10,Math.min(F.W-10,x))}
function nudge(g,dir){moveTo(g,g.x+dir*30)}
function score(g){return g.n}
function take(g){const e=g.ev;g.ev=[];return e}
W.CatchEngine={create,step,moveTo,nudge,take,score,ramp,F,landT,headR};if(typeof module!=='undefined')module.exports=W.CatchEngine})(typeof window!=='undefined'?window:globalThis);
