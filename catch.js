// CatchEngine (games_v2 §3.3): Berry Catch / Starfall Catch. Pure + seeded. Field 180 UI px; spawn y 26, catch line y 236.
(function(W){
const TUN=(typeof GAMES_TUNING!=='undefined'?GAMES_TUNING:(typeof require!=='undefined'?require('./games_tuning.js'):null));
const F={W:180,Y0:26,LINE:236};
function rng(s){let a=s>>>0||1;return()=>{a^=a<<13;a>>>=0;a^=a>>17;a^=a<<5;a>>>=0;return a/4294967296}}
const stepVal=(t,n)=>{let v=t[0][1];for(const [k,x] of t)if(n>=k)v=x;return v};
function ramp(L,n){const k=Math.floor(n/5);return {fall:Math.min(L.fallCap,L.fall0+L.fallStep*k),int:Math.max(L.intMin,L.int0*Math.pow(.96,k)),simul:stepVal(L.simul,n),sway:stepVal(L.sway,n),dx:Math.min(L.dxMax,L.dx0+3*n)}}
function create(o){const T=(o&&o.T)||TUN,level=o.level||'standard',L=T.CATCH[level],r=rng(o.seed||1),P=T.CATCH_PICK;
  return {T,L,P,level,fam:o.fam||'slyte',lowfx:!!o.lowfx,r,t:0,x:90,tx:90,items:[],n:0,streak:0,longest:0,golds:0,bonus:0,landed:0,lands:[],spawnT:.6,lastX:90,lastLand:0,nextGold:P.goldEvery[0]+Math.floor(r()*(P.goldEvery[1]-P.goldEvery[0]+1)),made:0,done:false,ev:[]}}
function landT(g,it){return g.t+(F.LINE-it.y)/it.v}
function spawn(g){const R=ramp(g.L,g.n),P=g.P;g.made++;const gold=g.made>=g.nextGold;if(gold)g.nextGold=g.made+P.goldEvery[0]+Math.floor(g.r()*(P.goldEvery[1]-P.goldEvery[0]+1));
  const v=R.fall*(gold?P.goldFall:1),tl=g.t+(F.LINE-F.Y0)/v;
  // fairness: reachable from the previous landing at echoV
  const prev=g.items.length?g.items.reduce((a,b)=>landT(g,b)>landT(g,a)?b:a):null,px=prev?prev.x:g.x,pt=prev?landT(g,prev):g.t;
  const reach=Math.max(0,g.L.echoV*(tl-pt-g.T.CATCH_FAIR.margin)*g.T.CATCH_FAIR.factor),dx=Math.min(R.dx,reach);
  let x=px+(g.r()*2-1)*dx;x=Math.max(12,Math.min(F.W-12,x));
  const it={x,x0:x,y:F.Y0,v,gold,id:g.made,sway:g.lowfx?0:R.sway,ph:g.r()*6.28};g.items.push(it);g.ev.push({type:'spawn',gold});}
function step(g,dt){if(g.done)return g;g.t+=dt;const L=g.L;
  const d=g.tx-g.x,mv=L.echoV*dt;g.x+=Math.abs(d)<=mv?d:Math.sign(d)*mv;
  g.spawnT-=dt;const R=ramp(L,g.n);if(g.spawnT<=0&&g.items.length<R.simul){spawn(g);g.spawnT=R.int}
  for(const it of g.items.slice()){it.y+=it.v*dt;
    if(!it.gold&&it.sway)it.x=Math.max(8,Math.min(F.W-8,it.x0+it.sway*Math.sin(it.ph+g.t*6.28*.6)*Math.min(1,(F.LINE-it.y)/60)));
    if(it.gold&&!g.lowfx)it.x=it.x0+((Math.floor(g.t*12/4)%2)?g.P.goldZig/2:-g.P.goldZig/2)*Math.min(1,(F.LINE-it.y)/60);
    if(it.y>=F.LINE){g.items.splice(g.items.indexOf(it),1);
      if(Math.abs(it.x-g.x)<=(L.basket+16)/2+L.magnet){g.n++;g.streak++;g.longest=Math.max(g.longest,g.streak);if(it.gold){g.golds++;g.bonus+=g.P.goldValue}
        g.ev.push({type:'catch',gold:it.gold,n:g.n});if(g.streak%10===0){g.bonus+=5;g.ev.push({type:'streak',n:g.streak})}}
      else{g.landed++;g.streak=0;g.lands.push(it.x);g.ev.push({type:'land',x:it.x});
        if(g.landed>=L.grass){g.done=true;g.ev.push({type:'end',n:g.n,streak:g.longest,golds:g.golds});return g}}}}
  return g}
function moveTo(g,x){g.tx=Math.max(10,Math.min(F.W-10,x))}
function nudge(g,dir){moveTo(g,g.x+dir*30)}
function score(g){return g.n}
function take(g){const e=g.ev;g.ev=[];return e}
W.CatchEngine={create,step,moveTo,nudge,take,score,ramp,F,landT};if(typeof module!=='undefined')module.exports=W.CatchEngine})(typeof window!=='undefined'?window:globalThis);
