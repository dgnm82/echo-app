// LinesEngine (den_dig.md): Den Dig (Howlings) / Nest Weave (Wingsongs). A gentle line-clear falling-block game.
// Forked from fort.js: SHAPES, rng, rotateCells, fits, move/moveTo/rotate/ghostY/tick/drop/soft/take are unchanged.
// New: full rows clear (classic), score 100/300/500/800 × level (+1 per soft-drop cell, +2 per hard-drop cell),
// a level every LINES[level].perLevel rows, fall speed from the level AND a slow time creep. A blocked spawn is the
// happy ending ('full': the den is dug / the nest is woven). Pure (no DOM), seeded, node-testable.
(function(root){
const SHAPES={domino:[[0,0],[1,0]],I3:[[0,0],[1,0],[2,0]],L3:[[0,0],[0,1],[1,1]],
  O:[[0,0],[1,0],[0,1],[1,1]],I:[[0,0],[1,0],[2,0],[3,0]],L:[[0,0],[0,1],[0,2],[1,2]],J:[[1,0],[1,1],[1,2],[0,2]],T:[[0,0],[1,0],[2,0],[1,1]],
  S:[[1,0],[2,0],[0,1],[1,1]],Z:[[0,0],[1,0],[1,1],[2,1]]};
const TUN=(typeof GAMES_TUNING!=='undefined'?GAMES_TUNING:(typeof require!=='undefined'?(()=>{try{return require('./games_tuning.js')}catch(e){return null}})():null));
const DEF={   // = GAMES_TUNING.LINES (tuning_lines.json); used when the generated tuning has no LINES block yet
  easy:    {w:8,h:12,pieces:[[1,'domino I3 L3 O'],[3,'+ I']],fall0:1400,mult:0.90,floor:650,creep:0.02,creepMin:0.90,perLevel:6,levelMax:12,ghost:true},
  standard:{w:8,h:12,pieces:[[1,'I3 L3 O I L J T'],[3,'+ S Z']],fall0:1000,mult:0.85,floor:260,creep:0.04,creepMin:0.80,perLevel:10,levelMax:15,ghost:true},
  bigkid:  {w:8,h:12,pieces:[[1,'O I L J T S Z']],fall0:800,mult:0.82,floor:120,creep:0.05,creepMin:0.75,perLevel:10,levelMax:15,ghost:true,ghostOff:8},
  score:[0,100,300,500,800],soft:1,hard:2};
const MAT={dig:{O:'stone',I:'root',I3:'root',L:'clay',J:'clay',L3:'clay',T:'dirt',S:'loam',Z:'loam',domino:'pebble',sp:'gem'},
           weave:{O:'moss',I:'twig',I3:'twig',L:'straw',J:'straw',L3:'straw',T:'leaf',S:'bark',Z:'bark',domino:'feather',sp:'berry'}};
const T=()=>(TUN&&TUN.LINES)||DEF;
function parsePieces(steps){let cur=[];return steps.map(([lv,s])=>{const add=s.startsWith('+');const n=s.replace('+','').trim().split(/\s+/);cur=add?cur.concat(n):n;return [lv,cur.slice()]})}
const stepVal=(t,n)=>{let v=t[0][1];for(const [k,x] of t)if(n>=k)v=x;return v};
function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
function rotateCells(c){const r=c.map(([x,y])=>[-y,x]);const mx=Math.min(...r.map(p=>p[0])),my=Math.min(...r.map(p=>p[1]));return r.map(([x,y])=>[x-mx,y-my])}
function create(o){o=o||{};const L=T()[o.level]?o.level:'standard',C=T()[L];const g={
  w:o.w||C.w,h:o.h||C.h,level:L,C,mode:o.mode==='weave'?'weave':'dig',rand:rng(o.seed||Date.now()),steps:parsePieces(C.pieces),
  grid:null,piece:null,next:null,bag:[],lines:0,lv:1,score:0,clears:[0,0,0,0,0],big:0,t:0,placed:0,events:[],done:false,
  disguise:!!o.disguise,disguiseUsed:false};
  g.grid=Array.from({length:g.h},()=>Array(g.w).fill(null));g.next=newPiece(g);spawn(g);return g}
function fallMs(g){const C=g.C,k=Math.max(C.creepMin,1-C.creep*g.t/60);return Math.round(Math.max(C.floor,C.fall0*Math.pow(C.mult,g.lv-1)*k))}
function ghostOn(g){return g.C.ghost&&!(g.C.ghostOff&&g.lv>=g.C.ghostOff)}
function pick(g){const names=stepVal(g.steps,g.lv);   // 7-bag (each piece once per bag) keeps it fair: no long droughts
  if(!g.bag.length||g.bag.some(n=>!names.includes(n))){g.bag=names.slice();for(let i=g.bag.length-1;i>0;i--){const j=Math.floor(g.rand()*(i+1));[g.bag[i],g.bag[j]]=[g.bag[j],g.bag[i]]}}
  return g.bag.pop()}
function newPiece(g){const name=pick(g);let cells=SHAPES[name].map(p=>p.slice());const rot=Math.floor(g.rand()*4);for(let i=0;i<rot;i++)cells=rotateCells(cells);
  const m=MAT[g.mode][name],sp=g.rand()<1/12?Math.floor(g.rand()*cells.length):-1;   // 1 piece in 12 carries a gem / berry cell
  let mats=cells.map((_,i)=>i===sp?MAT[g.mode].sp:m);
  if(g.disguise&&!g.disguiseUsed&&g.placed>=4&&g.rand()<.2){g.disguiseUsed=true;mats[0]='echo'}
  return {name,cells,mats,x:0,y:0}}
function width(p){return Math.max(...p.cells.map(c=>c[0]))+1}
function spawn(g){const p=g.next;g.next=newPiece(g);p.x=Math.floor((g.w-width(p))/2);p.y=0;g.piece=p;if(!fits(g,p.cells,p.x,p.y))full(g)}
function fits(g,cells,x,y){return cells.every(([cx,cy])=>{const X=x+cx,Y=y+cy;return X>=0&&X<g.w&&Y<g.h&&(Y<0||!g.grid[Y][X])})}
function move(g,dx){const p=g.piece;if(!p||g.done)return false;if(fits(g,p.cells,p.x+dx,p.y)){p.x+=dx;return true}return false}
function moveTo(g,col){let n=0;while(g.piece&&g.piece.x<col&&move(g,1)&&n++<20);while(g.piece&&g.piece.x>col&&move(g,-1)&&n++<40);return g.piece&&g.piece.x}
function rotate(g){const p=g.piece;if(!p||g.done)return false;const c=rotateCells(p.cells);for(const k of [0,-1,1,-2,2])if(fits(g,c,p.x+k,p.y)){p.cells=c;p.x+=k;return true}return false}
function ghostY(g){const p=g.piece;let y=p.y;while(fits(g,p.cells,p.x,y+1))y++;return y}
function tick(g){const p=g.piece;if(!p||g.done)return null;if(fits(g,p.cells,p.x,p.y+1)){p.y++;return 'fall'}return settle(g)}
function soft(g){const p=g.piece;if(!p||g.done)return null;if(fits(g,p.cells,p.x,p.y+1)){p.y++;g.score+=T().soft;return 'fall'}return settle(g)}   // B held / ▼
function drop(g){const p=g.piece;if(!p||g.done)return null;const y=ghostY(g);g.score+=T().hard*(y-p.y);p.y=y;return settle(g)}
function clock(g,dt){if(!g.done)g.t+=dt;return fallMs(g)}   // the shell calls this with real seconds (pauses when the app is hidden)
function full(g){if(g.done)return;g.done=true;g.piece=null;g.events.push({type:'full',score:g.score,lines:g.lines,level:g.lv})}
function settle(g){const p=g.piece;p.cells.forEach(([cx,cy],i)=>{const Y=p.y+cy;if(Y>=0)g.grid[Y][p.x+cx]=p.mats[i]});g.placed++;
  if(p.mats.includes('echo'))g.events.push({type:'disguise'});g.events.push({type:'settle'});
  const rows=[];for(let y=0;y<g.h;y++)if(g.grid[y].every(c=>c))rows.push(y);
  if(rows.length){const n=rows.length,pts=T().score[n]*g.lv,cells=rows.map(y=>g.grid[y].slice());
    for(const y of rows){g.grid.splice(y,1);g.grid.unshift(Array(g.w).fill(null))}
    g.lines+=n;g.score+=pts;g.clears[n]++;if(n===4)g.big++;g.events.push({type:'clear',rows,n,pts,cells,big:n===4});
    const lv=Math.min(g.C.levelMax,1+Math.floor(g.lines/g.C.perLevel));if(lv>g.lv){g.lv=lv;g.events.push({type:'level',level:lv})}}
  if(p.y<0||p.cells.some(([,cy])=>p.y+cy<0)){full(g);return 'full'}   // settled above the top line: the den / nest is full
  spawn(g);return g.done?'full':'settle'}
function result(g){return {score:g.score,lines:g.lines,level:g.lv,big:g.big}}   // the one source for HUD, card and memory
function take(g){const e=g.events;g.events=[];return e}
const API={SHAPES,MAT,DEF,parsePieces,create,fallMs,ghostOn,clock,move,moveTo,rotate,tick,soft,drop,ghostY,fits,result,take,rotateCells};
if(typeof module!=='undefined')module.exports=API;root.LinesEngine=API;
})(typeof window!=='undefined'?window:globalThis);
