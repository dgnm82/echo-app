#!/usr/bin/env node
// Music School Phase 1, step 1: musiclevel.js (the quiet music level + game dials) and difficulty.js dial()/blend() with the engines.
// Usage: node tools/test-musiclevel.js
const fs=require('fs'),path=require('path'),R=path.join(__dirname,'..');
const M=require(path.join(R,'musiclevel.js')),D=require(path.join(R,'difficulty.js'));
const Catch=require(path.join(R,'catch.js')),Stack=require(path.join(R,'stack.js')),Run=require(path.join(R,'runner.js')),Lines=require(path.join(R,'lines.js'));
let n=0,bad=0;const ok=(c,m)=>{n++;if(!c){bad++;console.log('FAIL',m)}};
const J=JSON.parse(fs.readFileSync(path.join(R,'music/levels.json'),'utf8'));
ok(JSON.stringify(M.DEF)===JSON.stringify(J),'musiclevel.js DEF == music/levels.json');
// no age prior: a fresh record is ML2 (neutral) for everyone
const f=M.fresh();ok(f.level===2&&f.src==='prior'&&f.warm===null,'fresh = neutral ML2 prior');ok(M.valid(f),'fresh is valid');
ok(!/age|band/i.test(JSON.stringify(Object.keys(f))),'no age field in the record');
// warm-up mapping
const all=v=>({copy:v,beat:v,pitch:v,rhythm:v});
ok(M.startLevel(all(1))===3,'all moments full -> prior +1 (ML3)');ok(M.startLevel(all(0))===1,'no moments -> prior -1 (ML1)');
ok(M.startLevel(all(.5))===2,'half everywhere -> stays ML2');ok(M.startLevel({copy:1,beat:1,pitch:1,rhythm:.5})===3,'3.5 -> up');
ok(M.startLevel({copy:1,beat:1,pitch:1,rhythm:0})===2,'3.0 -> stays');ok(M.startLevel({copy:1,beat:0,pitch:0,rhythm:0})===1,'1.0 -> down');
ok(M.startLevel(all(1),5)===5&&M.startLevel(all(0),1)===1,'clamped 1-5');
// scoring
ok(M.scoreCopy([4,2],[4,2])===1&&M.scoreCopy([4,2],[5,2])===.5&&M.scoreCopy([4,2],[2,4])===0&&M.scoreCopy([4,2],[])===0,'copy: same / shape / new / none');
ok(M.scoreCopy([4,2],[4,4,2])===.5,'copy: one extra note = 0.5');
const beats=Array.from({length:10},(_,i)=>i*714);
ok(M.scoreBeat(beats.slice(2).map(b=>b+20),beats)===1,'beat: all on time = 1');
ok(M.scoreBeat(beats.slice(2).map(b=>b+180),beats)===1,'beat: steady phone lag is taken out (relative timing)');
ok(M.scoreBeat([3000,3100],beats)===0,'beat: too few taps = 0');
ok(M.scoreBeat(beats.slice(2).map((b,i)=>b+(i%2?330:0)),beats)<.75,'beat: off-beat half the time scores low');
ok(M.scorePitch([true,true])===1&&M.scorePitch([true,false])===.5&&M.scorePitch([null,null])===0,'pitch: trials');
const tk=[12,6,6,12];
ok(M.scoreRhythm([0,500,750,1000],tk)===1,'rhythm: long short short long = 1');ok(M.scoreRhythm([0,333,666,1000],tk)===.5,'rhythm: right count, even = .5');
ok(M.scoreRhythm([0,500],tk)===0,'rhythm: wrong count = 0');ok(M.scoreRhythm([0,1000,1500,2000],tk)===1,'rhythm: tempo-free (half speed)');ok(M.scoreRhythm([0,450,750,1050],tk)===1,'rhythm: a loose long-short still counts');ok(M.scoreRhythm([0,300,750,1050],tk)===.5,'rhythm: short-long-short = count only');
// apply
let a=M.applyWarmup(M.fresh(),all(1),5);ok(a.level===3&&a.src==='warmup'&&a.warm.at===5,'applyWarmup sets ML3 for a strong warm-up');
ok(a.dial.catch===M.startDial(3,1),'dials start from the warm-up level (+ beat bonus)');ok(M.startDial(1,0)===0&&M.startDial(3,0)===1&&M.startDial(2,.8)===.75,'startDial table');
const sd=M.seed(7,'7-8');ok(sd.level===4&&sd.src==='seed','seed from EIB length 7 -> ML4');ok(M.applyWarmup(sd,all(0)).level===4,'seeded save never goes down');
ok(M.applyWarmup(M.seed(4,'7-8'),all(1)).level===3,'seeded save goes up with a strong warm-up');
ok(M.applyWarmup(a,all(0),9,{keep:true}).level===3,'keep (second Echo) changes nothing');
ok([[3,1],[4,2],[5,2],[6,3],[7,4],[8,5],[12,5]].every(([l,v])=>M.levelFromLen(l)===v),'levelFromLen');
// repair
ok(M.valid(M.repair({v:1,level:3,dial:{catch:'x'},win:{}}))&&M.repair({v:1,level:3,dial:{catch:'x'},win:{}}).dial.catch===M.fresh(3).dial.catch,'repair fixes a broken dial');
ok(M.repair(null).level===2&&M.repair({v:9}).level===2,'repair of junk = fresh ML2');
// adaptation
let m=M.fresh();for(let i=0;i<4;i++)M.report(m,'catch',1);ok(m.dial.catch>M.fresh().dial.catch,'all wins -> dial up');
m=M.fresh();for(let i=0;i<4;i++)M.report(m,'catch',0);ok(m.dial.catch<M.fresh().dial.catch,'all losses -> dial down');
m=M.fresh();for(let i=0;i<80;i++)M.report(m,'stack',1);ok(m.dial.stack===2,'clamped at 2');for(let i=0;i<80;i++)M.report(m,'stack',0);ok(m.dial.stack===0,'clamped at 0');
m=M.fresh();m.set.run='bigkid';for(let i=0;i<8;i++)M.report(m,'run',0);ok(M.dialFor(m,'run')===2&&D.dial('run',{set:'bigkid',ml:m})===2,'a set level holds the dial');
ok(D.dial('catch',{set:'easy',ml:M.fresh()})===0&&D.dial('catch',{ml:{dial:{catch:1.3}}})===1.3,'Difficulty.dial');
m=M.fresh();M.report(m,'pairs',.9);ok(m.win.pairs.length===1&&!('pairs' in m.dial),'Pairs only reports');
// simulated children (logistic skill model): steady-state mean success of games 6-20 lands in ~70-80% for every skill level
function rng(s){let x=s>>>0||1;return()=>{x^=x<<13;x>>>=0;x^=x>>17;x^=x<<5;x>>>=0;return x/4294967296}}
const sig=x=>1/(1+Math.exp(-x));
for(const gm of ['catch','stack','run','dig','eib'])for(const skill of [0,.5,1,1.5,2]){let tot=0;const REP=30;
  for(let rep=0;rep<REP;rep++){const r=rng(rep*977+skill*31+gm.length);const mm=M.applyWarmup(M.fresh(),all(.5));let dd=mm.dial[gm]==null?.5:mm.dial[gm],s=0,c=0;
    for(let g=0;g<20;g++){const d=gm==='eib'?dd:mm.dial[gm];const p=sig(1.1+2.5*(skill-d));let h=0;for(let i=0;i<20;i++)if(r()<p)h++;const sc=h/20;if(g>=5){s+=sc;c++}
      M.report(mm,gm,sc);if(gm==='eib'){const st=M.eibStep(sc);dd=Math.max(0,Math.min(2,dd+(st==='up'?.15:st==='down'?-.2:0)))}}
    tot+=s/c}
  const mu=tot/REP;ok(mu>=.68&&mu<=.84,`${gm} skill ${skill}: mean success ${mu.toFixed(2)} in ~70-80%`)}
// blend
const T={easy:{a:0,b:[0,10],c:'e',s:[[1,2]]},standard:{a:10,b:[10,20],c:'s',s:[[3,4]]},bigkid:{a:20,b:[20,40],c:'b',s:[[5,6]]}};
let b=D.blend(T,.5);ok(b.a===5&&b.b[1]===15&&b.c==='s'&&b.s[0][0]===3,'blend .5: numbers interpolate, others nearest');
b=D.blend(T,1.75);ok(b.a===17.5&&b.b[1]===35&&b.c==='b','blend 1.75');ok(D.blend(T,0).a===0&&D.blend(T,2).a===20&&D.blend(T,-3).a===0&&D.blend(T,9).a===20,'blend ends + clamp');
ok(D.nearest(.4)==='easy'&&D.nearest(.5)==='standard'&&D.nearest(1.6)==='bigkid','nearest');
// the engines take blended params and still run (Catch: every fall reachable; all: no NaN)
const ENG=[['catch',Catch,()=>Catch.table()],['stack',Stack,()=>Stack.table()],['run',Run,()=>Run.table('jump')],['run-glide',Run,()=>Run.table('glide')],['dig',Lines,()=>Lines.table()]];
for(const [nm,E,tb] of ENG)for(const d of [0,.25,.5,1,1.3,1.5,2]){const L=D.blend(tb(),d);
  ok(Object.values(L).every(v=>typeof v!=='number'||isFinite(v)),`${nm} d=${d}: blended params finite`);
  let g;try{g=nm.startsWith('run')?E.create({kind:nm==='run'?'jump':'glide',level:D.nearest(d),L,seed:7,talents:[]}):nm==='dig'?E.create({level:D.nearest(d),L,seed:7,mode:'dig'}):E.create({level:D.nearest(d),L,seed:7,fam:'slyte'})}catch(e){g=null;console.log(e.message)}
  ok(g&&(g.L===L||g.C===L),`${nm} d=${d}: engine uses the blended params`);
  if(g&&E.success)ok(typeof E.success(g)==='number','success() is a number at the start')}
if(Catch.HEAD){for(const d of [0,.5,1,1.5,2]){const L=D.blend(Catch.table(),d);ok(L.head>0&&L.basket>0,`catch d=${d}: head + basket present`)}}
console.log(`musiclevel: ${n} checks, ${bad} failed`);process.exit(bad?1:0)
