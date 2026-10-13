// Shiny Pairs engine tests (game spec v0.3 §1): node tools/test-memory.js
const assert=require('assert');const M=require('../memory.js');let n=0,ok=0;
function T(name,fn){n++;try{fn();ok++;console.log('  ok  '+name)}catch(e){console.log('  FAIL '+name+': '+e.message)}}
const solve=g=>{for(let i=0;i<g.cards.length;i++){if(g.cards[i].paired)continue;const j=M.partner(g,i);M.flip(g,i);M.flip(g,j)}};
T('a) deal: 20 cards / 10 pairs in 4x5; easy 12 cards / first 6 items in 3x4',()=>{const g=M.create({seed:1});assert.equal(g.cards.length,20);assert.equal(g.cols*g.rows,20);
  const e=M.create({level:'easy',seed:1});assert.equal(e.cards.length,12);assert.deepEqual([...new Set(e.cards.map(c=>c.item))].sort(),M.DECK.slyte.slice(0,6).sort())});
T('b) seeded shuffle is replayable',()=>{assert.deepEqual(M.create({seed:42}).cards.map(c=>c.item),M.create({seed:42}).cards.map(c=>c.item))});
T('c) a pair stays up; a miss waits, then any tap turns both back',()=>{const g=M.create({seed:3});const j=M.partner(g,0);assert.equal(M.flip(g,0),'first');assert.equal(M.flip(g,j),'pair');assert(g.cards[0].paired&&g.cards[j].paired);
  let a=1;while(g.cards[a].paired)a++;let b=a+1;while(g.cards[b].paired||g.cards[b].item===g.cards[a].item)b++;M.flip(g,a);assert.equal(M.flip(g,b),'miss');assert(g.cards[a].up&&g.cards[b].up);
  assert.equal(M.flip(g,0),'ignored');let c=0;while(g.cards[c].up||g.cards[c].paired)c++;assert.equal(M.flip(g,c),'resolved');assert(!g.cards[a].up&&!g.cards[b].up)});
T('d) rounds end at pairs 3, 6, 10 (easy 2, 4, 6) and the board never resets',()=>{for(const [lv,ends] of [['standard',[3,6,10]],['easy',[2,4,6]]]){const g=M.create({level:lv,seed:9});const at=[];
  for(let i=0;i<g.cards.length;i++){if(g.cards[i].paired)continue;M.flip(g,i);M.flip(g,M.partner(g,i));for(const e of M.take(g))if(e.type==='round')at.push(g.pairs)}assert.deepEqual(at,ends);assert(g.done)}});
T('e) no fail: 500 random taps never end the game early or lose progress',()=>{const g=M.create({seed:5});let p=0;for(let k=0;k<500;k++){M.flip(g,Math.floor(Math.random()*20));assert(g.pairs>=p);p=g.pairs}});
T('f) hints: after 3 misses (2 on easy) the next first card shows its partner; big-kid has none',()=>{for(const [lv,nm] of [['standard',3],['easy',2],['bigkid',0]]){const g=M.create({level:lv,seed:11});
  const miss=()=>{let a=g.cards.findIndex(c=>!c.paired);let b=g.cards.findIndex((c,j)=>j!==a&&!c.paired&&c.item!==g.cards[a].item);M.flip(g,a);M.flip(g,b);M.resolve(g)};
  for(let i=0;i<(nm||3);i++)miss();M.take(g);const f=g.cards.findIndex(c=>!c.paired);M.flip(g,f);const h=M.take(g).find(e=>e.type==='hint');
  if(nm){assert(h,lv+' hint');assert.equal(g.cards[h.i].item,g.cards[f].item)}else assert(!h,'no hint in big-kid')}});
T('g) big-kid stars: <=18 turns 3, <=24 2, else 1',()=>{const g=M.create({level:'bigkid',seed:2});g.turns=18;assert.equal(M.stars(g),3);g.turns=24;assert.equal(M.stars(g),2);g.turns=30;assert.equal(M.stars(g),1);assert.equal(M.stars(M.create({})),0)});
T('h) Master of Disguise hides a Slyte pair only in big-kid, board stays 20',()=>{const g=M.create({level:'bigkid',seed:4,disguise:true});assert.equal(g.cards.filter(c=>c.item==='slyte_token').length,2);assert.equal(g.cards.length,20);
  assert(!M.create({seed:4,disguise:true}).cards.some(c=>c.item==='slyte_token'))});
T('i) handheld cursor: ◀ ▶ wrap in reading order and skip paired cards; B jumps down a row and wraps',()=>{const g=M.create({seed:6});g.cards[1].paired=true;g.cursor=0;assert.equal(M.cursorMove(g,1),2);g.cursor=0;assert.equal(M.cursorMove(g,-1),19);
  g.cursor=17;assert.equal(M.cursorDown(g),5,'17 down wraps to 1 (paired) so it lands on 5');g.cursor=3;assert.equal(M.cursorDown(g),7)});
T('j) slow board = more than 2x as many turns as pairs (auto Easy rule)',()=>{const g=M.create({seed:7});solve(g);assert(!M.slow(g));g.turns=21;assert(M.slow(g))});
T('riddle) every DECK.slyte item has one pairs_riddle line keyed by cond.var.riddle (Riddle Solver hints)',()=>{const L=require('../dialogue/slyte.json').barks.pairs_riddle;
  for(const it of M.DECK.slyte){const ls=L.filter(l=>l.cond&&l.cond.var&&l.cond.var.riddle===it);assert.ok(ls.length>=1,it);for(const l of ls)assert.ok(l.text.length<=42,'fits 3 rows: '+l.text)}});
console.log(ok+'/'+n+' memory tests passed');if(ok!==n)process.exit(1);
