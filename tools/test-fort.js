// Fort Builder engine tests (spec v0.2 §3): node tools/test-fort.js
const assert=require('assert');const F=require('../fort.js');let n=0,ok=0;
function T(name,fn){n++;try{fn();ok++;console.log('  ok  '+name)}catch(e){console.log('  FAIL '+name+': '+e.message)}}
T('a) levels follow GAMES_TUNING.BUILD fall ms at h 0/12/24/30 and PIECE_STEPS',()=>{const B=require('../games_tuning.js').BUILD;
  for(const level of ['easy','standard','bigkid'])for(const h of [0,12,24,30]){const g=F.create({level,seed:1});g.rows=h;let v=B[level].fall[0][1];for(const [k,x] of B[level].fall)if(h>=k)v=x;assert.equal(F.fallMs(g),v,level+h)}
  for(let s=1;s<200;s++){const g=F.create({level:'easy',seed:s});assert(g.piece.cells.length<=3)}
  assert.equal(F.fallMs(F.create({level:'easy'})),0)});
T('b) phone board 8x12, handheld 5x6',()=>{let g=F.create({});assert.equal(g.w,8);assert.equal(g.h,12);g=F.create({w:5,h:6});assert.equal(g.grid.length,6);assert.equal(g.grid[0].length,5)});
T('c) playtest: a full row never clears; it stays on the board',()=>{const g=F.create({level:'easy',seed:3});const need=F.fillNeed(g);
  g.grid[11]=Array(8).fill(null).map((_,i)=>i<need-1?'plank':null);g.piece={name:'domino',cells:[[0,0],[0,1]],mats:['plank','plank'],x:7,y:0};
  g.grid[11]=Array(8).fill('plank');g.grid[11][7]=null;F.drop(g);assert(g.grid[11].every(c=>c),'row kept');assert.equal(g.rows,2);assert(!F.take(g).some(e=>e.type==='row'||e.type==='row-auto'))});
T('d) random play always ends with a roof event within 2000 moves; height = h - stackTop',()=>{
  for(const level of ['easy','standard','bigkid'])for(let s=1;s<=20;s++){const g=F.create({level,seed:s});let i=0,ev=[];
    while(!g.done&&i++<2000){if(g.piece){F.move(g,Math.floor(Math.random()*3)-1);if(Math.random()<.3)F.rotate(g);F.drop(g)}ev.push(...F.take(g))}
    const r=ev.find(e=>e.type==='roof');assert(g.done&&r,level+' seed '+s);assert.equal(r.height,g.h-F.stackTop(g))}});
T('e) no high event ever (pan removed); stars = min(3, gapFree) at every level',()=>{for(let s=1;s<=10;s++){const g=F.create({level:'standard',seed:s});let ev=[];
  while(!g.done){F.drop(g);ev.push(...F.take(g))}assert(!ev.some(e=>e.type==='high'))}
  for(const level of ['easy','standard','bigkid']){const g=F.create({level});g.gapFree=5;assert.equal(F.stars(g),3)}});
T('f) rotate respects walls (kick) and move stops at walls',()=>{const g=F.create({level:'bigkid',seed:9});g.piece={name:'I',cells:[[0,0],[0,1],[0,2],[0,3]],mats:Array(4).fill('plank'),x:7,y:0};
  assert(F.rotate(g));assert(g.piece.x+Math.max(...g.piece.cells.map(c=>c[0]))<8);for(let i=0;i<20;i++)F.move(g,-1);assert.equal(g.piece.x,0)});
T('h) Master of Disguise hides one "secretly Slyte" block per round at most',()=>{let seen=0;for(let s=1;s<60;s++){const g=F.create({level:'easy',seed:s,disguise:true});let c=0;
  for(let i=0;i<40&&!g.done;i++){F.drop(g);c+=F.take(g).filter(e=>e.type==='disguise').length}assert(c<=1);seen+=c}assert(seen>0)});
T('i) bottom-floor door: the first piece of a round carries a door',()=>{const g=F.create({level:'easy',seed:4});F.drop(g);assert([...g.grid.flat(),...g.piece.mats,...g.next.mats].includes('door'))});
console.log(ok+'/'+n+' fort tests passed');if(ok!==n)process.exit(1);
