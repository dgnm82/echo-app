// Fort Builder engine (game spec v0.2 §3): a gentle falling-blocks game that builds Slyte's treehouse fort.
// Pure logic (no DOM) so it can be unit-tested in node. Full rows never vanish: they become a finished floor
// row and slide into the "home so far" strip; 3 rows make a floor. There is no game over.
(function(root){
const SHAPES={ // [cells] in a 4x4 box; rotation is computed
  domino:[[0,0],[1,0]], I3:[[0,0],[1,0],[2,0]], L3:[[0,0],[0,1],[1,1]],
  O:[[0,0],[1,0],[0,1],[1,1]], I:[[0,0],[1,0],[2,0],[3,0]], L:[[0,0],[0,1],[0,2],[1,2]], J:[[1,0],[1,1],[1,2],[0,2]], T:[[0,0],[1,0],[2,0],[1,1]],
  S:[[1,0],[2,0],[0,1],[1,1]], Z:[[0,0],[1,0],[1,1],[2,1]]};
const LEVELS={
  easy:    {pieces:['domino','I3','L3'], fallMs:0,   ghost:true},          // hovers until B / drop
  standard:{pieces:['domino','I3','L3','O','I','L','J','T'], fallMs:900, ghost:true},   // 4-cell pieces except S/Z
  bigkid:  {pieces:['O','I','L','J','T','S','Z'], fallMs:600, ghost:true, stars:true}};
const ROWS_PER_FLOOR=3;
function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
function rotateCells(c){const r=c.map(([x,y])=>[-y,x]);const mx=Math.min(...r.map(p=>p[0])),my=Math.min(...r.map(p=>p[1]));return r.map(([x,y])=>[x-mx,y-my])}
function create(o){o=o||{};const L=LEVELS[o.level]||LEVELS.standard;const g={
  w:o.w||8,h:o.h||12,level:LEVELS[o.level]?o.level:'standard',L,rand:rng(o.seed||Date.now()),
  grid:null,piece:null,next:null,rows:0,goal:o.goal||ROWS_PER_FLOOR,strip:[],placed:0,gapFree:0,pans:0,events:[],done:false,
  disguise:!!o.disguise,disguiseUsed:false,round:o.round||0};
  g.grid=Array.from({length:g.h},()=>Array(g.w).fill(null));g.next=newPiece(g);spawn(g);return g}
function material(g,i,n,name){ // home parts: mostly planks, some windows, a door on the bottom floor, a lantern or flag now and then
  const r=g.rand();if(g.disguise&&!g.disguiseUsed&&g.placed>=2&&r<.25&&i===0){g.disguiseUsed=true;return 'slyte'}
  if(!g.doorUsed&&i===0){g.doorUsed=true;return 'door'}
  return r<.18?'window':r<.23?'lantern':r<.26?'flag':'plank'}
function newPiece(g){const names=g.L.pieces;const name=names[Math.floor(g.rand()*names.length)];let cells=SHAPES[name].map(p=>p.slice());
  const rot=Math.floor(g.rand()*4);for(let i=0;i<rot;i++)cells=rotateCells(cells);return {name,cells,mats:cells.map((_,i)=>material(g,i,cells.length,name)),x:0,y:0}}
function width(p){return Math.max(...p.cells.map(c=>c[0]))+1}
function spawn(g){const p=g.next;g.next=newPiece(g);p.x=Math.floor((g.w-width(p))/2);p.y=0;g.piece=p;
  if(!fits(g,p.cells,p.x,p.y))pan(g)} // never full: make room instead of ending
function fits(g,cells,x,y){return cells.every(([cx,cy])=>{const X=x+cx,Y=y+cy;return X>=0&&X<g.w&&Y<g.h&&(Y<0||!g.grid[Y][X])})}
function move(g,dx){const p=g.piece;if(!p||g.done)return false;if(fits(g,p.cells,p.x+dx,p.y)){p.x+=dx;return true}return false}
function moveTo(g,col){let n=0;while(g.piece&&g.piece.x<col&&move(g,1)&&n++<20);while(g.piece&&g.piece.x>col&&move(g,-1)&&n++<40);return g.piece&&g.piece.x}
function rotate(g){const p=g.piece;if(!p||g.done)return false;const c=rotateCells(p.cells);
  for(const k of [0,-1,1,-2,2,-3,3])if(fits(g,c,p.x+k,p.y)){p.cells=c;p.x+=k;return true} // simple wall kick
  return false}
function ghostY(g){const p=g.piece;let y=p.y;while(fits(g,p.cells,p.x,y+1))y++;return y}
function tick(g){const p=g.piece;if(!p||g.done)return null;if(fits(g,p.cells,p.x,p.y+1)){p.y++;return 'fall'}return settle(g)}
function drop(g){const p=g.piece;if(!p||g.done)return null;p.y=ghostY(g);return settle(g)}
function soft(g){return tick(g)} // B held = faster fall
function finishRow(g,y,auto){const row=g.grid[y];const gaps=row.filter(c=>!c).length;
  g.strip.push(row.map(c=>c||'window'));if(!gaps)g.gapFree++; // gaps become windows and nooks
  g.grid.splice(y,1);g.grid.unshift(Array(g.w).fill(null));g.rows++;g.events.push({type:auto?'row-auto':'row',gaps})}
function pan(g){ // "Let's build higher!": the lowest row is finished as it is (gaps become windows), so the stack drops one row
  let y=g.h-1;while(y>=0&&g.grid[y].every(c=>!c))y--;if(y<0)return;finishRow(g,g.h-1,true);g.pans++;g.events.push({type:'high'});checkGoal(g)}
function checkGoal(g){if(!g.done&&g.rows>=g.goal){g.done=true;g.events.push({type:'floor'})}}
function stackTop(g){for(let y=0;y<g.h;y++)if(g.grid[y].some(c=>c))return y;return g.h}
function settle(g){const p=g.piece;p.cells.forEach(([cx,cy],i)=>{const Y=p.y+cy;if(Y>=0)g.grid[Y][p.x+cx]=p.mats[i]});g.placed++;
  if(p.mats.includes('slyte'))g.events.push({type:'disguise'});
  g.events.push({type:'settle'});
  for(let y=g.h-1;y>=0;){if(g.grid[y].every(c=>c)){finishRow(g,y,false)}else y--}
  checkGoal(g);if(g.done){g.piece=null;return 'floor'}
  while(stackTop(g)<3&&!g.done)pan(g);   // nearing the top: pan up instead of failing
  if(g.done){g.piece=null;return 'floor'}
  spawn(g);return 'settle'}
function stars(g){return g.L.stars?Math.min(3,g.gapFree):0}
function take(g){const e=g.events;g.events=[];return e}
const API={SHAPES,LEVELS,ROWS_PER_FLOOR,create,move,moveTo,rotate,tick,drop,soft,ghostY,fits,stackTop,stars,take,rotateCells};
if(typeof module!=='undefined')module.exports=API;root.FortEngine=API;
})(typeof window!=='undefined'?window:globalThis);
