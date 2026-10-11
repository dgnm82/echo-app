// Fort Builder engine tests (spec v0.2 §3): node tools/test-fort.js
const assert=require('assert');const F=require('../fort.js');let n=0,ok=0;
function T(name,fn){n++;try{fn();ok++;console.log('  ok  '+name)}catch(e){console.log('  FAIL '+name+': '+e.message)}}
T('a) levels: easy = 2-3 cell pieces, no auto fall; standard adds 4-cell minus S/Z at 900 ms; big-kid all 7 at 600 ms',()=>{
  for(let s=1;s<200;s++){const g=F.create({level:'easy',seed:s});assert(g.piece.cells.length<=3)}
  assert.equal(F.LEVELS.easy.fallMs,0);assert.equal(F.LEVELS.standard.fallMs,900);assert.equal(F.LEVELS.bigkid.fallMs,600);
  assert(!F.LEVELS.standard.pieces.includes('S')&&!F.LEVELS.standard.pieces.includes('Z'));
  assert.deepEqual([...F.LEVELS.bigkid.pieces].sort(),['I','J','L','O','S','T','Z'])});
T('b) phone board 8x12, handheld 5x6',()=>{let g=F.create({});assert.equal(g.w,8);assert.equal(g.h,12);g=F.create({w:5,h:6});assert.equal(g.grid.length,6);assert.equal(g.grid[0].length,5)});
T('c) a full row becomes a floor row in the strip, not a vanish; 3 rows = goal',()=>{const g=F.create({level:'easy',seed:3});
  g.grid[11]=['plank','plank','plank','plank','plank','plank','plank',null];g.piece={name:'domino',cells:[[0,0],[0,1]],mats:['plank','plank'],x:7,y:0};
  F.drop(g);assert.equal(g.rows,1);assert.equal(g.strip.length,1);assert(g.strip[0].every(c=>c));assert(!g.done)});
T('d) never full: random play for 2000 moves never ends the game, and every round reaches its floor',()=>{
  for(const level of ['easy','standard','bigkid'])for(let s=1;s<=30;s++){const g=F.create({level,seed:s});let i=0;
    while(!g.done&&i++<2000){if(g.piece){F.move(g,Math.floor(g.piece.x*0+Math.random()*3)-1);if(Math.random()<.3)F.rotate(g);F.drop(g)}}
    assert(g.done,level+' seed '+s+' reached the floor');assert(g.rows>=3)}});
T('e) gaps become windows when the stack nears the top (camera pan)',()=>{const g=F.create({level:'easy',seed:5});
  for(let y=3;y<12;y++)g.grid[y]=['plank',null,'plank','plank','plank','plank','plank','plank'];
  g.piece={name:'domino',cells:[[0,0],[1,0]],mats:['plank','plank'],x:3,y:0};F.drop(g);
  const ev=F.take(g);assert(ev.some(e=>e.type==='high'),'panned');assert(g.strip.some(r=>r[1]==='window'),'gap became a window')});
T('f) rotate respects walls (kick) and move stops at walls',()=>{const g=F.create({level:'bigkid',seed:9});g.piece={name:'I',cells:[[0,0],[0,1],[0,2],[0,3]],mats:Array(4).fill('plank'),x:7,y:0};
  assert(F.rotate(g));assert(g.piece.x+Math.max(...g.piece.cells.map(c=>c[0]))<8);for(let i=0;i<20;i++)F.move(g,-1);assert.equal(g.piece.x,0)});
T('g) big-kid stars count gap-free floor rows; easy/standard show none',()=>{const g=F.create({level:'bigkid',seed:2});g.gapFree=2;assert.equal(F.stars(g),2);assert.equal(F.stars(F.create({level:'easy'})),0)});
T('h) Master of Disguise hides one "secretly Slyte" block per round at most',()=>{let seen=0;for(let s=1;s<60;s++){const g=F.create({level:'easy',seed:s,disguise:true});let c=0;
  for(let i=0;i<40&&!g.done;i++){F.drop(g);c+=F.take(g).filter(e=>e.type==='disguise').length}assert(c<=1);seen+=c}assert(seen>0)});
T('i) bottom-floor door: the first piece of a round carries a door',()=>{const g=F.create({level:'easy',seed:4});F.drop(g);assert([...g.grid.flat(),...g.piece.mats,...g.next.mats].includes('door'))});
console.log(ok+'/'+n+' fort tests passed');if(ok!==n)process.exit(1);
