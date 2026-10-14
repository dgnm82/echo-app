// node test-lines.js : LinesEngine rules (den_dig.md §acceptance A1-A6)
const E=require('../lines.js'),assert=require('assert');let n=0;const ok=(c,m)=>{assert(c,m);n++};
// A1 scoring 100/300/500/800 × level
for(const [rows,pts] of [[1,100],[2,300],[3,500],[4,800]])for(const lv of [1,3]){const g=E.create({level:'standard',seed:5});g.lv=lv;
  for(let r=0;r<rows;r++)g.grid[g.h-1-r]=Array(g.w).fill('dirt').map((c,x)=>x<4?null:c);
  g.piece={name:'I',cells:[[0,0],[0,1],[0,2],[0,3]].slice(0,rows),mats:Array(rows).fill('root'),x:0,y:0};
  // fill cols 0..3 with 4 vertical strips: place three helper columns first
  for(let x=1;x<4;x++)for(let r=0;r<rows;r++)g.grid[g.h-1-r][x]='dirt';
  const s0=g.score;E.drop(g);const ev=E.take(g).find(e=>e.type==='clear');ok(ev&&ev.n===rows&&ev.pts===pts*lv,`clear ${rows} at L${lv}`);ok(g.score-s0>=pts*lv,'score added')}
// A2 level every perLevel rows, speed rises with level and with time, never below floor
{const g=E.create({level:'standard',seed:1});const f1=E.fallMs(g);g.lines=10;g.lv=2;ok(E.fallMs(g)<f1,'level faster');const f2=E.fallMs(g);E.clock(g,120);ok(E.fallMs(g)<f2,'time creep');
 E.clock(g,1e5);ok(E.fallMs(g)>=Math.round(g.C.floor),'floor');g.lv=15;ok(E.fallMs(g)===g.C.floor,'floor at max level')}
// A3 random play always ends with exactly one happy 'full' event, no other end
for(const level of ['easy','standard','bigkid'])for(let s=1;s<=40;s++){const g=E.create({level,seed:s,mode:s%2?'dig':'weave'});let k=0,full=0;
  while(!g.done&&k++<20000){const r=g.rand();if(r<.3)E.move(g,-1);else if(r<.6)E.move(g,1);else if(r<.7)E.rotate(g);if(g.rand()<.3)E.drop(g);else E.tick(g);full+=E.take(g).filter(e=>e.type==='full').length}
  ok(g.done&&full===1,`ends once ${level}/${s}`)}
// A4 pieces follow the steps; bag gives every piece once per bag
{const g=E.create({level:'easy',seed:3});const seen=new Set();for(let i=0;i<8;i++){seen.add(g.next.name);E.drop(g);if(g.done)break}ok(['domino','I3','L3','O'].every(x=>seen.has(x)),'easy bag');
 ok(![...seen].some(x=>['T','S','Z','J','L','I'].includes(x)),'easy L1 small pieces only')}
// A5 materials per mode
{const a=E.create({mode:'dig',seed:2}),b=E.create({mode:'weave',seed:2});const D=new Set(Object.values(E.MAT.dig)),W=new Set(Object.values(E.MAT.weave));
 ok(a.piece.mats.every(m=>D.has(m)),'dig mats');ok(b.piece.mats.every(m=>W.has(m)),'weave mats')}
// A6 drop points: hard 2/cell, soft 1/cell
{const g=E.create({level:'standard',seed:9});const y=E.ghostY(g)-g.piece.y;const s=g.score;E.drop(g);ok(g.score-s>=2*y,'hard drop pts');
 const h=E.create({level:'standard',seed:9});const s2=h.score;E.soft(h);ok(h.score-s2===1,'soft drop pt')}
console.log('lines engine OK',n,'checks');
