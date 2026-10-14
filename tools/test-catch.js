const C=require('../catch.js'),T=require('../games_tuning.js');let ok=0,n=0;const A=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
function run(level,seed,bot,N=300){const g=C.create({level,seed});let caught=0,miss=0;for(let i=0;i<60*600&&!g.done&&g.made<N;i++){
  if(bot){const nx=g.items.slice().sort((a,b)=>C.landT(g,a)-C.landT(g,b))[0];if(nx)C.moveTo(g,nx.x)}C.step(g,1/60);for(const e of C.take(g)){if(e.type==='catch')caught++;if(e.type==='land')miss++}}return {g,caught,miss}}
const a=run('standard',7,true,80),b=run('standard',7,true,80);A(a.caught===b.caught&&a.g.t===b.g.t,'replay');
for(const l of ['easy','standard','bigkid']){let bad=0;for(let s=1;s<=50;s++){const r=run(l,s,true,300);if(r.miss)bad++}A(bad===0,'fair '+l+' '+bad);
  const g=C.create({level:l,seed:3});const lands=[];while(!g.done)for(const e of (C.step(g,1/60),C.take(g)))if(e.type==='land')lands.push(e);A(lands.length===T.CATCH[l].grass,'grass '+l)}
A(C.ramp(T.CATCH.standard,25).fall===80,'ramp');const g=C.create({level:'bigkid',seed:2,lowfx:true});for(let i=0;i<600;i++)C.step(g,1/60);A(g.items.every(i=>i.sway===0),'lowfx sway');
{const g=C.create({level:"standard",seed:5});g.items.push({x:90+C.headR(g)+2,x0:0,y:235,v:60,gold:false,id:99,sway:0,ph:0});g.spawnT=99;C.step(g,.1);A(C.take(g).some(e=>e.type==="land"),"head only: off-head hit is a miss")}
console.log(`${ok}/${n} catch tests passed`);if(ok<n)process.exit(1)
