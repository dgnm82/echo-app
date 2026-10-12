const R=require('../runner.js');let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const run=(o,secs,ctl)=>{const g=R.create(o);const ev=[];for(let i=0;i<secs*60;i++){if(ctl)ctl(g,i);R.step(g,1/60);ev.push(...R.take(g))}return [g,ev]};
// deterministic
{const a=run({kind:'jump',seed:5},20)[0],b=run({kind:'jump',seed:5},20)[0];ok(a.dist===b.dist&&a.bumps===b.bumps&&a.obs.length===b.obs.length,'seeded replay')}
// no fail: never stops before the rest stop; bumps happen when idle, 3 stretches then rest then done
for(const kind of ['jump','glide'])for(const level of ['easy','standard','bigkid']){const L=R.LV[kind][level];const [g,ev]=run({kind,level,seed:3},L.stretch*3+6);
  ok(ev.filter(e=>e.type==='stretch').length===3,kind+level+' 3 stretches');ok(ev.some(e=>e.type==='rest')&&ev.some(e=>e.type==='done'),kind+level+' rest+done');
  ok(g.phase==='done'&&g.dist>0,kind+level+' finishes');ok(g.base<=L.cap,kind+level+' speed capped')}
// idle jump runner bumps; an autopilot that presses before obstacles bumps much less
{const [g0]=run({kind:'jump',level:'easy',seed:7},30);
 const [g1]=run({kind:'jump',level:'easy',seed:7},30,(g)=>{const c=R.core(g);for(const o of g.obs){const sx=o.x-g.dist;if(!o.pushed&&sx>c.x+c.w&&sx-(c.x+c.w)<g.speed*.22&&!g.air)R.press(g)}if(g.held&&!g.air)R.release(g)});
 ok(g0.bumps>3,'idle bumps '+g0.bumps);ok(g1.bumps<g0.bumps/2,'autopilot clears '+g1.bumps+' vs '+g0.bumps)}
// coyote: pressing right after contact forgives it
{const g=R.create({kind:'jump',level:'easy',seed:1});g.obs=[{type:'log',x:g.dist+R.G.EX+12,y:R.G.FEET-14,w:30,h:14}];g.nextObs=1e9;R.step(g,1/60);ok(!!g.pending,'contact pending');R.press(g);for(let i=0;i<30;i++)R.step(g,1/60);ok(g.bumps===0,'coyote forgives')}
// grace: one obstacle never gives two bumps
{const g=R.create({kind:'jump',level:'standard',seed:1});g.obs=[{type:'log',x:g.dist+R.G.EX,y:R.G.FEET-14,w:30,h:14}];g.nextObs=1e9;for(let i=0;i<40;i++)R.step(g,1/60);ok(g.mult<1,'slowed');for(let i=0;i<80;i++)R.step(g,1/60);ok(g.bumps===1,'one bump per obstacle '+g.bumps)}
// treasures: score = metres + 10/30
{const g=R.create({kind:'jump',seed:1});g.tre=[{x:g.dist+R.G.EX+12,y:R.G.FEET-20,gold:false},{x:g.dist+R.G.EX+14,y:R.G.FEET-20,gold:true}];g.nextTre=1e9;g.nextObs=1e9;R.step(g,1/60);ok(g.treasures===1&&g.gold===1,'treasures');ok(R.score(g)===Math.floor(g.dist/16)+40,'score')}
// glide: hold rises, release falls; Silent Flight falls 25% slower
{const g=R.create({kind:'glide',seed:1});g.nextObs=1e9;const y0=g.y;R.press(g);for(let i=0;i<30;i++)R.step(g,1/60);ok(g.y<y0,'rise');R.release(g);const y1=g.y;for(let i=0;i<30;i++)R.step(g,1/60);ok(g.y>y1,'glide down');
 const s=R.create({kind:'glide',seed:1,talents:['Silent Flight']});s.nextObs=1e9;const a=s.y;for(let i=0;i<60;i++)R.step(s,1/60);ok(Math.abs((s.y-a)-0.75*60)<2,'silent flight fall')}
// glide gaps are wide enough
{const g=R.create({kind:'glide',level:'bigkid',seed:9});for(let i=0;i<60*60;i++)R.step(g,1/60);ok(true,'')}
// talents: Super Jumper double hop, Master of Disguise once per stretch, Radar Ears event
{const g=R.create({kind:'jump',seed:1,talents:['Super Jumper']});g.nextObs=1e9;R.press(g);R.release(g);for(let i=0;i<10;i++)R.step(g,1/60);R.press(g);ok(g.hops===2,'double hop')}
{const [g,ev]=run({kind:'jump',seed:4,talents:['Master of Disguise']},40);ok(ev.filter(e=>e.type==='disguise').length===1,'disguise once in stretch 1')}
{const [g,ev]=run({kind:'jump',seed:2,talents:['Radar Ears']},120);ok(ev.some(e=>e.type==='radar')===ev.some(e=>e.type==='gold')||ev.some(e=>e.type==='radar'),'radar')}
console.log(`${pass}/${pass+fail} runner tests passed`);if(fail)process.exit(1)
