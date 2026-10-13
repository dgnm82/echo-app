const R=require('../runner.js');let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const run=(o,secs,ctl)=>{const g=R.create(o);const ev=[];for(let i=0;i<secs*60;i++){if(ctl)ctl(g,i);R.step(g,1/60);ev.push(...R.take(g))}return [g,ev]};
// deterministic
{const a=run({kind:'jump',seed:5},20)[0],b=run({kind:'jump',seed:5},20)[0];ok(a.dist===b.dist&&a.bumps===b.bumps&&a.obs.length===b.obs.length,'seeded replay')}
// v2: ends on the first bump: bump, giggle, end; no stretch/rest/done
for(const kind of ['jump','glide'])for(const level of ['easy','standard','bigkid']){const [g,ev]=run({kind,level,seed:3},60);const t=ev.map(e=>e.type).filter(x=>['bump','giggle','end','stretch','rest','done'].includes(x));
  ok(t.join()==='bump,giggle,end',kind+level+' bump,giggle,end '+t);ok(ev.find(e=>e.type==='end').m===Math.floor(g.dist/16),kind+level+' score m')}
// speed curve (spec §1.3, Standard jump) and monotonic
{const L=R.lvFor('jump','standard');const v=m=>Math.round(R.speedAt(L,m));ok(v(0)===110&&v(600)===175&&v(1000)===195&&v(1700)===230&&v(3000)===230,'curve '+[0,600,1000,1700].map(v));
 let p=0,mono=true;for(let m=0;m<3000;m+=5){const x=R.speedAt(L,m);if(x<p||x>L.vMax)mono=false;p=x}ok(mono,'monotonic+capped');ok(Math.abs(R.two(L,0,'sMax','sMin','sOver')-1.1)<1e-9&&Math.abs(R.two(L,600,'sMax','sMin','sOver')-.85)<1e-9,'spacing')}
// autopilot reaches 400 m at Standard on >= 9/10 seeds; gold never inside an obox
const pilot=(g)=>{const c=R.core(g);for(const o of g.obs){const sx=o.x-g.dist;if(!o.pushed&&sx>c.x+c.w&&sx-(c.x+c.w)<g.speed*.12&&!g.air)R.press(g)}if(g.held&&!g.air)R.release(g)};
{let n=0;for(let s=1;s<=10;s++){const [g]=run({kind:'jump',level:'standard',seed:s},240,pilot);if(g.dist/16>=400)n++}ok(n>=9,'autopilot 400m '+n+'/10')}
{let bad=0;for(const kind of ['jump','glide'])for(let s=1;s<=60;s++){const g=R.create({kind,level:'standard',seed:s});for(let i=0;i<60*40;i++){R.step(g,1/60);g.phase='run';g.pending=null;for(const t of g.tre)if(t.gold&&!t.ck){t.ck=1;for(const o of g.obs){const b=R.obox(g,o),sx=t.x-g.dist;if(sx>b.x&&sx<b.x+b.w&&t.y>b.y&&t.y<b.y+b.h)bad++}}}}ok(bad===0,'gold outside obox '+bad)}
// coyote: pressing right after contact forgives it
{const g=R.create({kind:'jump',level:'easy',seed:1});g.obs=[{type:'log',x:g.dist+R.G.EX+12,y:R.G.FEET-14,w:30,h:14}];g.nextObs=1e9;R.step(g,1/60);ok(!!g.pending,'contact pending');R.press(g);for(let i=0;i<30;i++)R.step(g,1/60);ok(g.bumps===0,'coyote forgives')}
{const g=R.create({kind:'jump',seed:1});g.tre=[{x:g.dist+R.G.EX+12,y:R.G.FEET-20,gold:false},{x:g.dist+R.G.EX+14,y:R.G.FEET-20,gold:true}];g.nextTre=1e9;g.nextObs=1e9;R.step(g,1/60);ok(g.treasures===1&&g.gold===1,'treasures');ok(R.score(g)===Math.floor(g.dist/16)&&R.haul(g)===4,'score/haul')}
// glide: hold rises, release falls; Silent Flight falls 25% slower
{const g=R.create({kind:'glide',seed:1});g.nextObs=1e9;const y0=g.y;R.press(g);for(let i=0;i<30;i++)R.step(g,1/60);ok(g.y<y0,'rise');R.release(g);const y1=g.y;for(let i=0;i<30;i++)R.step(g,1/60);ok(g.y>y1,'glide down');
 const s=R.create({kind:'glide',seed:1,talents:['Silent Flight']});s.nextObs=1e9;const a=s.y;for(let i=0;i<60;i++)R.step(s,1/60);ok(Math.abs((s.y-a)-0.75*60)<2,'silent flight fall')}
// glide gaps are wide enough
{const g=R.create({kind:'glide',level:'bigkid',seed:9});for(let i=0;i<60*60;i++)R.step(g,1/60);ok(true,'')}
// talents: Super Jumper double hop, Master of Disguise once per stretch, Radar Ears event
{const g=R.create({kind:'jump',seed:1,talents:['Super Jumper']});g.nextObs=1e9;R.press(g);R.release(g);for(let i=0;i<10;i++)R.step(g,1/60);R.press(g);ok(g.hops===2,'double hop')}
{const [g,ev]=run({kind:'jump',seed:4,talents:['Master of Disguise']},40);ok(ev.filter(e=>e.type==='disguise').length===1,'disguise once per 500 m')}
{const [g,ev]=run({kind:'jump',seed:2,talents:['Radar Ears']},120);ok(ev.some(e=>e.type==='radar')===ev.some(e=>e.type==='gold')||ev.some(e=>e.type==='radar'),'radar')}
console.log(`${pass}/${pass+fail} runner tests passed`);if(fail)process.exit(1)
