const C=require('../catch.js'),T=require('../games_tuning.js');let ok=0,n=0;const A=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
function run(level,seed,bot,N=300){const g=C.create({level,seed});let caught=0,miss=0;for(let i=0;i<60*600&&!g.done&&g.made<N;i++){
  if(bot){const nx=g.items.slice().sort((a,b)=>C.landT(g,a)-C.landT(g,b))[0];if(nx)C.moveTo(g,nx.x)}C.step(g,1/60);for(const e of C.take(g)){if(e.type==='catch')caught++;if(e.type==='land')miss++}}return {g,caught,miss}}
const a=run('standard',7,true,80),b=run('standard',7,true,80);A(a.caught===b.caught&&a.g.t===b.g.t,'replay');
for(const l of ['easy','standard','bigkid']){let bad=0;for(let s=1;s<=50;s++){const r=run(l,s,true,300);if(r.miss)bad++}A(bad===0,'fair '+l+' '+bad);
  const g=C.create({level:l,seed:3});const lands=[];while(!g.done)for(const e of (C.step(g,1/60),C.take(g)))if(e.type==='land')lands.push(e);A(lands.length===T.CATCH[l].grass,'grass '+l)}
for(const l of ['easy','standard','bigkid']){const L=T.CATCH[l];let ok1=true,ok2=true;for(let n=0;n<=80;n++){const a=C.ramp(L,n),b=C.ramp(L,n+1);if(b.fall/a.fall>1.05||a.int/b.int>1.05||b.simul!==a.simul)ok1=false}
  for(let n=0;n<=70;n+=10){if(!(C.ramp(L,n+10).fall>C.ramp(L,n).fall||C.ramp(L,n+10).fall===L.fallCap))ok2=false}A(ok1,'smooth ramp '+l);A(ok2&&C.ramp(L,5).fall>C.ramp(L,0).fall,'no flat start '+l)}
for(const l of ['easy','standard','bigkid'])for(let sd=1;sd<=30;sd++){const g=C.create({level:l,seed:sd});const bins=[];let bad=0;while(g.made<120&&g.t<900){C.moveTo(g,(g.items[0]||{x:90}).x);C.step(g,1/60);for(const e of C.take(g))if(e.type==='spawn'){const b=Math.floor(g.items[g.items.length-1].x0/20);if(bins.length>=2&&bins[bins.length-1]===b&&bins[bins.length-2]===b)bad++;bins.push(b)}if(g.done)break}
  if(bad){A(false,'no 3 in a row '+l+' seed '+sd+' '+bad);break}if(sd===30)A(true,'')}
{const g=C.create({level:'standard',seed:9});const cnt={};while(g.made<400){g.done=false;g.landed=0;C.moveTo(g,(g.items[0]||{x:90}).x);C.step(g,1/60);for(const e of C.take(g))if(e.type==='spawn'){const b=Math.floor(g.items[g.items.length-1].x0/20);cnt[b]=(cnt[b]||0)+1}}
  const v=Object.values(cnt);A(Object.keys(cnt).length>=8&&Math.max(...v)<=400*.25,'columns spread '+JSON.stringify(cnt))}const g=C.create({level:'bigkid',seed:2,lowfx:true});for(let i=0;i<600;i++)C.step(g,1/60);A(g.items.every(i=>i.sway===0),'lowfx sway');
{const g=C.create({level:"standard",seed:5});g.items.push({x:90+C.headR(g)+2,x0:0,y:235,v:60,gold:false,id:99,sway:0,ph:0});g.spawnT=99;C.step(g,.1);A(C.take(g).some(e=>e.type==="land"),"head only: off-head hit is a miss")}
// LIST2 #4: smooth, free finger-follow across the full width (critically damped follow, no columns, edges reachable)
{const mk=()=>{const g=C.create({level:'standard',seed:4});g.spawnT=1e9;return g};
  let g=mk(),worst=0;for(let x=C.FOLLOW.EDGE;x<=180-C.FOLLOW.EDGE;x+=1.37){C.moveTo(g,x);for(let i=0;i<60;i++)C.step(g,1/60);worst=Math.max(worst,Math.abs(g.x-x))}
  A(worst<0.06,'any x reachable (no columns), worst '+worst.toFixed(3));
  g=mk();C.moveTo(g,-50);for(let i=0;i<90;i++)C.step(g,1/60);const lo=g.x;C.moveTo(g,999);for(let i=0;i<90;i++)C.step(g,1/60);const hi=g.x;
  A(lo<=C.FOLLOW.EDGE&&hi>=180-C.FOLLOW.EDGE,'edges reachable '+lo+' '+hi);
  for(const l of ['easy','standard','bigkid']){const r=C.headR(C.create({level:l,seed:1}));A(lo-15-r<=8&&hi+15+r>=172&&lo+r>=8-1e9,'edge items (x 8..172) reachable by the head '+l)}
  g=mk();g.x=g.tx=10;C.moveTo(g,170);let t=0,over=false,prevV=0,jump=0;while(Math.abs(g.x-170)>0.5&&t<3){C.step(g,1/60);t+=1/60;if(g.x>170.01)over=true;jump=Math.max(jump,Math.abs(g.vx-prevV));prevV=g.vx}
  A(t<=0.6,'crosses the field fast ('+t.toFixed(2)+' s)');A(!over,'never overshoots the finger');
  A(jump<=C.FOLLOW.aMax/60+1,'speed ramps (no snap): max dv/frame '+jump.toFixed(1));
  g=mk();g.x=g.tx=20;C.moveTo(g,160);for(let i=0;i<12;i++)C.step(g,1/60);C.moveTo(g,20);let lastFast=-1,firstBack=-1,pv=g.vx,dv=0;for(let i=0;i<60;i++){C.step(g,1/60);dv=Math.max(dv,Math.abs(g.vx-pv));pv=g.vx;if(g.vx>150)lastFast=i;if(firstBack<0&&g.vx<-150)firstBack=i}
  A(firstBack-lastFast>=3&&dv<=C.FOLLOW.aMax/60+1&&Math.abs(g.x-20)<0.5,'direction change eases through (no instant reversal) '+[lastFast,firstBack,dv.toFixed(0)]);
  g=mk();g.x=g.tx=90;C.nudge(g,1);for(let i=0;i<60;i++)C.step(g,1/60);A(Math.abs(g.x-120)<0.06,'keyboard nudge still 30 px')}
console.log(`${ok}/${n} catch tests passed`);if(ok<n)process.exit(1)
