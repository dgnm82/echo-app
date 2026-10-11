// Trail engine tests (game spec v0.3 §3): node tools/test-trail.js
const assert=require('assert');const T_=require('../trail.js');let n=0,ok=0;
function T(name,fn){n++;try{fn();ok++;console.log('  ok  '+name)}catch(e){console.log('  FAIL '+name+': '+e.message)}}
const chase=(g,max=4000)=>{for(let i=0;i<max&&!g.done;i++){T_.steer(g,g.pickup.x,g.pickup.y);T_.step(g)}};
T('a) goals 8 / 12 / 16 and speeds 450 / 330 / 250 ms; easy is step mode',()=>{assert.deepEqual(['easy','standard','bigkid'].map(l=>T_.create({level:l}).goal),[8,12,16]);
  assert.deepEqual(['easy','standard','bigkid'].map(l=>T_.LEVELS[l].ms),[450,330,250]);assert(T_.LEVELS.easy.step&&!T_.LEVELS.standard.step)});
T('b) steering toward pickups always finishes; rounds end at 1/3, 2/3 and the goal',()=>{for(const l of ['easy','standard','bigkid']){const g=T_.create({level:l,seed:3,rareChance:0});const r=[];
  for(let i=0;i<4000&&!g.done;i++){T_.steer(g,g.pickup.x,g.pickup.y);T_.step(g);for(const e of T_.take(g))if(e.type==='round')r.push(g.count)}assert(g.done,l);assert.equal(r.length,3);assert.equal(r[2],g.goal)}});
T('c) no crashes: 3000 steps straight into walls only bump and turn, head stays on the board',()=>{const g=T_.create({level:'bigkid',seed:5});for(let i=0;i<3000;i++){T_.step(g);assert(T_.free(g,g.head.x,g.head.y))}assert(g.bumps>0)});
T('d) crossing the trail is allowed (no event ends the game)',()=>{const g=T_.create({seed:2,rareChance:0});g.count=5;for(let i=0;i<40;i++){T_.turn(g,1);T_.step(g)}assert(!g.done||g.count>=g.goal)});
T('e) at most 12 followers shown; extras become a counter',()=>{const g=T_.create({level:'bigkid',seed:8,rareChance:0});chase(g);assert.equal(T_.followers(g).length,12);assert.equal(T_.extra(g),4)});
T('f) a rare pickup is worth 3',()=>{const g=T_.create({seed:4,rareChance:1});const p=g.pickup;g.head={x:p.x,y:p.y+1};g.dir=0;T_.step(g);assert.equal(g.count,3)});
T('g) easy pickups appear 2-3 cells ahead',()=>{const g=T_.create({level:'easy',seed:9});const d=Math.abs(g.pickup.x-g.head.x)+Math.abs(g.pickup.y-g.head.y);assert(d===2||d===3,d)});
T('h) never reverses into itself when steering behind',()=>{const g=T_.create({seed:1});g.dir=0;T_.steer(g,g.head.x,g.head.y+5);assert.notEqual(g.dir,2)});
T('i) Super Jumper hops over a bush; without it the bush is a bump',()=>{for(const j of [true,false]){const g=T_.create({seed:1,jumper:j});g.obs=new Set(['5,5']);g.head={x:5,y:7};g.dir=0;g.pickup={x:0,y:0};T_.step(g);T_.step(g);
  const e=T_.take(g).map(x=>x.type);if(j){assert(e.includes('hop'));assert.equal(g.head.y,4)}else assert(e.includes('bump'))}});
console.log(ok+'/'+n+' trail tests passed');if(ok!==n)process.exit(1);
