// RunnerEngine (spec v0.6 §3): one-button endless runners, no fail state. Pure + seeded (replayable in tests).
// Meadow Dash (kind 'jump', Slyte) and Moonlight Glide (kind 'glide', Whimber). World px: 360x640, 1 m = 16 px.
(function(W){
const LV={
  jump:{easy:{v0:90,ramp:4,cap:120,space:1.6,launch:190,grav:475,coyote:.2,buffer:.2,hitE:[.5,.55],hitO:.5,magnet:24,cue:true,stretch:30},
        standard:{v0:110,ramp:6,cap:160,space:1.1,launch:234,grav:720,coyote:.12,buffer:.15,hitE:[.55,.6],hitO:.6,magnet:12,stretch:40},
        bigkid:{v0:130,ramp:8,cap:200,space:.8,launch:253,grav:844,coyote:.08,buffer:.1,hitE:[.6,.65],hitO:.7,magnet:0,stretch:50,stack:true,hold:true}},
  glide:{easy:{v0:80,ramp:4,cap:110,space:1.6,rise:100,fall:45,gap:2.6,coyote:.2,hitE:[.5,.55],hitO:.5,magnet:24,stretch:30},
        standard:{v0:100,ramp:6,cap:145,space:1.1,rise:130,fall:60,gap:2.2,coyote:.12,hitE:[.55,.6],hitO:.6,magnet:12,stretch:40,gates:true},
        bigkid:{v0:120,ramp:8,cap:180,space:.8,rise:160,fall:80,gap:1.8,coyote:.08,hitE:[.6,.65],hitO:.7,magnet:0,stretch:50,gates:true}}};
const TUN=(typeof GAMES_TUNING!=='undefined'?GAMES_TUNING:(typeof require!=='undefined'?require('./games_tuning.js'):null));
function lvFor(kind,level,o){const t=Object.assign({},((o&&o.T)||TUN).RUN[kind][level]);if(typeof t.hitE==='number')t.hitE=[t.hitE,t.hitE+.05];return Object.assign({},LV[kind][level],t)}
function speedAt(L,m){return m<=L.dKid?L.v0+(L.vKid-L.v0)*m/L.dKid:Math.min(L.vMax,L.vKid+L.creep*(m-L.dKid)/100)}
function two(L,m,a,b,c){const vAt=L.dKid+100*(L.vMax-L.vKid)/L.creep;if(m<=L.dKid)return L[a]+(L[b]-L[a])*m/L.dKid;const f=Math.min(1,(m-L.dKid)/(vAt-L.dKid));return L[b]+(L[c]-L[b])*f}
const G={W:360,FEET:470,EX:40,TOP:42,HILL:528,OWL:40,CORE:[26,22]};
function rng(s){let a=s>>>0||1;return()=>{a^=a<<13;a>>>=0;a^=a>>17;a^=a<<5;a>>>=0;return a/4294967296}}
function create(o){const kind=o.kind||'jump',level=o.level||'standard',L=lvFor(kind,level,o),P=((o&&o.T)||TUN).PICKUPS;
  const g={kind,level,L,r:rng(o.seed||1),talents:o.talents||[],evening:!!o.evening,t:0,dist:0,base:L.v0,mult:1,speed:L.v0,
    y:kind==='jump'?G.FEET:280,vy:0,air:false,airT:0,lastGround:0,buffer:-9,hops:0,held:false,heldT:0,
    obs:[],tre:[],nextObs:G.W+120,nextTre:G.W+60,treasures:0,gold:0,bumps:0,stretchBumps:[0],stretch:0,stretchT:0,
    tumble:0,haul:0,streak:0,P,DM:((o&&o.T)||TUN).TALENTS.disguiseEveryM,disguiseAt:-1e9,grace:0,pending:null,disguised:false,disguiseUsed:-1,phase:'run',restT:0,ev:[],chimeT:0,best:o.best||0,nTre:0};
  return g}
const has=(g,t)=>g.talents.includes(t);
function core(g){const [w,h]=G.CORE,[sx,sy]=g.L.hitE,cx=G.EX+12,bot=g.kind==='jump'?g.y-3:g.y-10;return {x:cx-w*sx/2,y:bot-h*sy,w:w*sx,h:h*sy}}   // anchored low: feet-level contact counts
function obox(g,o){const k=g.L.hitO,sx=o.x-g.dist;if(o.type==='puddle')return {x:sx+o.w*.25,y:o.y+o.h-3,w:o.w*.5,h:3};
  return {x:sx+o.w*(1-k)/2,y:o.y+(o.type==='branch'?0:o.h*(1-k)/3),w:o.w*k,h:o.type==='branch'?o.h-o.h*(1-k)/3:o.h*(1-(1-k)/3)}}
const hit=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
function spawnObs(g,at){const r=g.r,L=g.L;
  if(g.kind==='jump'){const pick=r();let o;
    if(L.stack&&pick<.2)o={type:'logs',w:30,h:28};else if(pick<.45)o={type:'log',w:30,h:14};else if(pick<.75)o={type:'rock',w:20,h:12};else o={type:'puddle',w:26,h:6};
    o.x=at;o.y=G.FEET-o.h;g.obs.push(o);return}
  // glide: a branch from above or a bush/cloud from below; gates (both, with a clear gap) from standard
  const gap=Math.round(two(L,g.dist/16,'gapMax','gapMin','gapOver')*G.OWL),span=G.HILL-G.TOP;const gate=L.gates&&r()<.35;
  if(gate){const top=60+Math.floor(r()*(span-gap-120));g.obs.push({type:'branch',x:at,y:0,w:34,h:top});g.obs.push({type:'bush',x:at,y:top+gap,w:30,h:G.HILL-(top+gap)});return}
  const k=r();if(k<.45){const h=120+Math.floor(r()*3)*40;g.obs.push({type:'branch',x:at,y:0,w:34,h})}
  else if(k<.75){const h=40+Math.floor(r()*3)*20;g.obs.push({type:'bush',x:at,y:G.HILL-h,w:30,h})}
  else{const y=150+Math.floor(r()*250);g.obs.push({type:'cloud',x:at,y,w:44,h:14})}}
function spawnTre(g,at){const gold=g.streak>=g.P.streakGlow||g.r()<1/g.P.goldEvery;let y;if(gold)g.streak=0;
  if(gold){const nx=g.obs.filter(o=>o.x>at-10).sort((a,b)=>a.x-b.x);const o=nx[0];
    if(g.kind==='jump'){const apex=g.L.launch*g.L.launch/(2*g.L.grav);at=o?o.x+o.w/2:at;y=Math.round(G.FEET-apex-4);if(o&&o.type==='logs')y-=12}
    else{const top=nx.find(q=>q.type==='branch'),bot=top&&nx.find(q=>q.type==='bush'&&q.x===top.x);if(top&&bot){at=top.x+top.w/2;y=Math.round((top.h+bot.y)/2)}else y=G.TOP+30+Math.floor(g.r()*(G.HILL-G.TOP-80));
      if(!bot&&g.obs.some(o=>Math.abs(o.x+o.w/2-at)<40))at+=60}
    g.tre.push({x:at,y,gold,id:++g.nTre});return}
  if(g.kind==='jump')y=G.FEET-(g.r()<.5?20:52);else y=G.TOP+30+Math.floor(g.r()*(G.HILL-G.TOP-80));
  // keep treasure away from obstacles
  if(g.obs.some(o=>Math.abs(o.x+o.w/2-at)<40))at+=60;g.tre.push({x:at,y,gold,id:++g.nTre})}
function press(g){g.held=true;g.heldT=0;if(g.phase!=='run'||g.tumble>0)return;
  if(g.kind==='glide'){if(g.pending){g.pending.o.passed=1;g.pending=null}return}
  const canCoyote=!g.air||(g.t-g.lastGround)<=g.L.coyote;
  if(g.pending){g.pending.o.passed=1;g.pending=null;jump(g);return}             // pressed just after touching: the contact is forgiven
  if(canCoyote&&g.hops===0)jump(g);else if(has(g,'Super Jumper')&&g.hops===1){g.vy=-g.L.launch*.7;g.hops=2;g.ev.push({type:'hop2'})}else g.buffer=g.t}
function release(g){g.held=false}
function jump(g){g.vy=-g.L.launch;g.air=true;g.airT=0;g.hops=1;g.ev.push({type:'jump'})}
function bump(g,o){g.bumps++;g.phase='end';g.tumble=.5;g.endT=0;o.pushed=1;g.ev.push({type:'bump',obs:o.type})}
function step(g,dt){g.t+=dt;const L=g.L;
  if(g.phase==='done')return g;
  if(g.phase==='end'){g.endT+=dt;g.speed=Math.max(0,g.speed-g.base*dt/.5);g.dist+=g.speed*dt;if(g.kind==='glide')g.y=Math.min(G.HILL-2,g.y+60*dt);else{g.y=Math.min(G.FEET,g.y+Math.max(0,g.vy)*dt+120*dt)}
    if(g.endT>=.5&&g.tumble>0){g.tumble=0;g.ev.push({type:'giggle'});g.phase='done';g.ev.push({type:'end',m:score(g),haul:haul(g)})}return g}
  g.base=speedAt(L,g.dist/16);g.speed=g.base;
  g.dist+=g.speed*dt;
  // physics
  if(g.kind==='jump'){if(g.held)g.heldT+=dt;
    if(g.air){const grav=L.hold&&g.held&&g.airT<.2?L.grav*.55:L.grav;g.vy+=grav*dt;g.y+=g.vy*dt;g.airT+=dt;
      if(g.y>=G.FEET){g.y=G.FEET;g.air=false;g.vy=0;g.hops=0;g.lastGround=g.t;if(g.t-g.buffer<=L.buffer){g.buffer=-9;jump(g)}}}
    else g.lastGround=g.t}
  else{if(g.tumble>0)g.vy=40;else g.vy=g.held?-L.rise:L.fall*(has(g,'Silent Flight')?.75:1);
    g.y=Math.max(G.TOP,Math.min(G.HILL-2,g.y+g.vy*dt));if(g.held)g.ev.push({type:'flap'})}
  // spawn ahead (spacing in seconds at the current speed)
  const ahead=g.dist+G.W+40;while(g.nextObs<ahead){spawnObs(g,g.nextObs);const sp=two(L,g.dist/16,'sMax','sMin','sOver')*g.speed*(1+g.r()*.5);g.nextObs+=Math.max(sp,g.kind==='glide'?140:104)}
  while(g.nextTre<ahead){spawnTre(g,g.nextTre);g.nextTre+=g.base*(g.P.treasureEvery[0]+g.r()*(g.P.treasureEvery[1]-g.P.treasureEvery[0]))}
  g.obs=g.obs.filter(o=>o.x-g.dist>-80);for(const t of g.tre)if(!t.got&&t.x-g.dist<=-40)g.streak=0;g.tre=g.tre.filter(t=>t.x-g.dist>-40&&!t.got);
  // talents that look ahead
  for(const t of g.tre)if(!t.cued&&t.x-g.dist<G.W+g.speed){t.cued=1;if(t.gold&&has(g,'Radar Ears'))g.ev.push({type:'radar'});if(has(g,'Super Radar Hearing'))g.ev.push({type:'chime',y:t.y})}
  if(L.cue)for(const o of g.obs)if(!o.cued&&g.kind==='jump'&&o.x-g.dist-G.EX<g.speed*.8+40){o.cued=1;g.ev.push({type:'cue'})}
  // collisions
  const c=core(g);
  if(g.pending){g.pending.t-=dt;if(g.pending.t<=0){const o=g.pending.o;g.pending=null;bump(g,o);return g}}
  if(!g.pending)for(const o of g.obs){if(o.pushed||o.passed)continue;if(hit(c,obox(g,o))){
      if(has(g,'Master of Disguise')&&g.dist/16-g.disguiseAt>=g.DM){g.disguiseAt=g.dist/16;o.passed=1;g.disguised=.8;g.ev.push({type:'disguise'});break}
      g.pending={o,t:L.coyote};break}}
  if(g.disguised>0)g.disguised-=dt;
  const mag=L.magnet;for(const t of g.tre){const sx=t.x-g.dist;const tb={x:sx-8-mag/2,y:t.y-8-mag/2,w:16+mag,h:16+mag};if(hit(c,tb)){t.got=1;if(t.gold)g.gold++;else{g.treasures++;g.streak++}g.haul=haul(g);g.ev.push({type:t.gold?'gold':'treasure',n:g.treasures+g.gold})}}
  return g}
function score(g){return Math.floor(g.dist/16)}
function haul(g){return g.treasures+3*g.gold}
function take(g){const e=g.ev;g.ev=[];return e}
W.RunnerEngine={speedAt,two,lvFor,haul,create,step,press,release,score,take,core,obox,LV,G}
if(typeof module!=='undefined')module.exports=W.RunnerEngine})(typeof window!=='undefined'?window:globalThis);
