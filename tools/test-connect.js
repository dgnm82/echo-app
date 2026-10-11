// Connect engine tests (game spec v0.3 §4): node tools/test-connect.js
const assert=require('assert');const C=require('../connect.js');let n=0,ok=0;
function T(name,fn){n++;try{fn();ok++;console.log('  ok  '+name)}catch(e){console.log('  FAIL '+name+': '+e.message)}}
const at=(g,x,y)=>y*g.w+x;
const fill=(g,k)=>{g.cells=g.cells.map((_,i)=>g.kinds[(i+Math.floor(i/g.w))%g.kinds.length]);return g};
T('a) boards: easy 6x5 with 4 kinds, goal 8; standard 7x7 with 5 kinds, goal 12; both species',()=>{for(const sp of ['slyte','whimber']){const e=C.create({species:sp,level:'easy',seed:1}),s=C.create({species:sp,seed:1});
  assert.equal(e.cells.length,30);assert.equal(new Set(e.cells).size<=4,true);assert.equal(e.L.goal,8);assert.equal(s.cells.length,49);assert.equal(s.L.goal,12)}});
T('b) a thread needs 3+ touching same items; corners ok; no reuse; fewer than 3 just un-links',()=>{const g=fill(C.create({seed:2}),0);const k=g.kinds[0];
  [at(g,0,0),at(g,1,0),at(g,1,1)].forEach(i=>g.cells[i]=k);g.cells[at(g,2,1)]=g.kinds[1];
  assert(C.valid(g,[at(g,0,0),at(g,1,0),at(g,1,1)]));assert(!C.valid(g,[at(g,0,0),at(g,1,0)]));assert(!C.valid(g,[at(g,0,0),at(g,1,1),at(g,1,0)]),'diagonal');
  assert(!C.canAdd(g,[at(g,0,0),at(g,1,0)],at(g,0,0)),'no reuse');assert(!C.gather(g,[at(g,0,0),at(g,1,0)]))});
T('c) gathering removes the bunch, items fall and the board refills; board never has a dead end',()=>{const g=C.create({seed:3});for(let t=0;t<60&&!g.done;t++){const b=C.bunches(g);assert(b.length>0,'always a bunch');C.gatherSet(g,b[0].cells);
  assert(g.cells.every(c=>c!=null))}});
T('d) 6+ leaves a sparkle wildcard that also gathers its row; 9+ or a loop makes the favourite',()=>{const g=C.create({seed:4});const k=g.kinds[0];g.cells=g.cells.map((_,i)=>g.kinds[1+(i%2)]);
  const p6=[0,1,2,3,4,5].map(x=>at(g,x,0));p6.forEach(i=>g.cells[i]=k);C.gather(g,p6);let e=C.take(g);assert(e.some(x=>x.type==='special'&&x.special===C.WILD));
  const g2=C.create({seed:5});g2.cells=g2.cells.map((_,i)=>g2.kinds[1+(i%2)]);const loop=[at(g2,0,0),at(g2,1,0),at(g2,1,1),at(g2,0,1)];loop.forEach(i=>g2.cells[i]=k);
  assert(C.isLoop(g2,loop));C.gather(g2,loop);assert(C.take(g2).some(x=>x.type==='special'&&x.special===C.FAV));
  const g3=C.create({seed:6});g3.cells=g3.cells.map((_,i)=>g3.kinds[1+(i%2)]);const row=Math.floor(3);g3.cells[at(g3,2,row)]=C.WILD;
  const p=[at(g3,0,row),at(g3,1,row),at(g3,2,row)];g3.cells[p[0]]=k;g3.cells[p[1]]=k;C.gather(g3,p);assert(C.take(g3).find(x=>x.type==='gather').cells.length===g3.w,'sparkle gathers its row')});
T('e) the favourite gathers every item of one kind (and can be tapped alone)',()=>{const g=C.create({seed:7});g.cells[0]=C.FAV;const k=g.goal,before=g.cells.filter(c=>c===k).length;
  assert(C.valid(g,[0]));C.gather(g,[0]);const e=C.take(g).find(x=>x.type==='gather');assert(e.cells.length>=before)});
T('f) 3 rounds of one goal item each; never fails; round goal resets',()=>{const g=C.create({level:'easy',seed:8});const goals=[];let t=0;
  while(!g.done&&t++<500){const b=C.bunches(g);const pick=b.find(x=>x.kind===g.goal)||b[0];C.gatherSet(g,pick.cells);for(const e of C.take(g))if(e.type==='round')goals.push(e.round)}
  assert(g.done);assert.deepEqual(goals,[0,1,2])});
T('g) big-kid stars: <=15 threads 3, <=20 2, else 1',()=>{const g=C.create({level:'bigkid'});g.threads=15;assert.equal(C.stars(g),3);g.threads=20;assert.equal(C.stars(g),2);g.threads=30;assert.equal(C.stars(g),1)});
T('h) bunch picker lists bunches biggest first (handheld)',()=>{const g=C.create({seed:9});const b=C.bunches(g);for(let i=1;i<b.length;i++)assert(b[i-1].cells.length>=b[i].cells.length)});
T('i) Riddle Solver shape goal: a straight line of 4+ earns a bonus',()=>{const g=C.create({seed:10,shapes:true});const k=g.goal;g.cells=g.cells.map((_,i)=>g.kinds.find(x=>x!==k));
  const line=[0,1,2,3].map(x=>at(g,x,0));line.forEach(i=>g.cells[i]=k);C.gather(g,line);assert(C.take(g).some(e=>e.type==='shape'));assert(g.got>=6)});
T('j) reshuffle (Super Jumper hop) keeps a playable board',()=>{const g=C.create({seed:12});C.reshuffle(g);assert(C.bunches(g).length>0);assert(C.take(g).some(e=>e.type==='shuffle'))});
console.log(ok+'/'+n+' connect tests passed');if(ok!==n)process.exit(1);
