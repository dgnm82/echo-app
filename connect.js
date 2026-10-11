// Connect engine (Berry Connect / Moonlight Connect, game spec v0.3 §4). Pure logic, testable in node.
// Link 3+ touching same items (up/down/left/right, no reuse) and gather them; nothing is swapped, nothing fails.
(function(root){
const ITEMS={slyte:{kinds:['blackberry','honey_cake','nut','leaf','apple'],fav:'trinket'},whimber:{kinds:['star','moon','dewdrop','comet','firefly'],fav:'feather'}};
const LEVELS={easy:{w:6,h:5,kinds:4,goal:8,hintMs:3000},standard:{w:7,h:7,kinds:5,goal:12,hintMs:6000},bigkid:{w:7,h:7,kinds:5,goal:12,hintMs:0,stars:15}};
const WILD='*',FAV='!';
function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
function create(o){o=o||{};const level=LEVELS[o.level]?o.level:'standard',L=LEVELS[level],sp=ITEMS[o.species]?o.species:'slyte',r=rng(o.seed||11);
  const kinds=ITEMS[sp].kinds.slice(0,L.kinds);
  const g={level,L,sp,kinds,fav:ITEMS[sp].fav,w:L.w,h:L.h,r,cells:[],round:0,goal:null,got:0,threads:0,events:[],done:false,shapeGoal:!!o.shapes};
  for(let i=0;i<g.w*g.h;i++)g.cells.push(r_kind(g));
  newGoal(g);ensure(g);return g}
function r_kind(g){return g.kinds[Math.floor(g.r()*g.kinds.length)]}
function newGoal(g){g.goal=g.kinds[(Math.floor(g.r()*g.kinds.length)+g.round)%g.kinds.length];g.got=0;g.events.push({type:'goal',kind:g.goal,need:g.L.goal,round:g.round})}
const xy=(g,i)=>[i%g.w,Math.floor(i/g.w)];
function adj(g,a,b){const [ax,ay]=xy(g,a),[bx,by]=xy(g,b);return Math.abs(ax-bx)+Math.abs(ay-by)===1}
const wild=c=>c===WILD||c===FAV;
function kindOf(g,path){for(const i of path){const c=g.cells[i];if(!wild(c))return c}return null}
// can cell i extend this thread?
function canAdd(g,path,i){if(i<0||i>=g.cells.length||path.includes(i))return false;if(path.length&&!adj(g,path[path.length-1],i))return false;
  const c=g.cells[i],k=kindOf(g,path);return wild(c)||k===null||c===k}
function valid(g,path){if(!path.length)return false;if(path.length===1)return g.cells[path[0]]===FAV;
  for(let j=1;j<path.length;j++)if(!adj(g,path[j-1],path[j]))return false;if(new Set(path).size!==path.length)return false;
  const k=kindOf(g,path);if(!path.every(i=>wild(g.cells[i])||g.cells[i]===k))return false;return path.length>=3}
function isLoop(g,path){return path.length>=4&&adj(g,path[0],path[path.length-1])}
function isLine(g,path){if(path.length<4)return false;const ys=new Set(path.map(i=>xy(g,i)[1])),xs=new Set(path.map(i=>xy(g,i)[0]));return ys.size===1||xs.size===1}
function gather(g,path){if(g.done||!valid(g,path))return false;let k=kindOf(g,path)||g.goal;const rm=new Set(path);
  for(const i of path){if(g.cells[i]===WILD){const y=xy(g,i)[1];for(let x=0;x<g.w;x++)rm.add(y*g.w+x)}if(g.cells[i]===FAV)g.cells.forEach((c,j)=>{if(c===k)rm.add(j)})}
  let n=0;rm.forEach(i=>{if(g.cells[i]===g.goal)n++});if(k===g.goal)path.forEach(i=>{if(wild(g.cells[i]))n++});
  if(g.shapeGoal&&isLine(g,path)){n+=2;g.events.push({type:'shape'})}
  const last=path[path.length-1];let special=null;if(path.length>=9||isLoop(g,path))special=FAV;else if(path.length>=6)special=WILD;
  rm.forEach(i=>g.cells[i]=null);if(special){g.cells[last]=special;g.events.push({type:'special',special,len:path.length,loop:isLoop(g,path)})}
  g.threads++;g.events.push({type:'gather',kind:k,len:path.length,cells:[...rm],big:path.length>=6});
  fall(g);g.got=Math.min(g.L.goal,g.got+n);
  if(g.got>=g.L.goal){g.events.push({type:'round',round:g.round});g.round++;if(g.round>=3){g.done=true;g.events.push({type:'done'})}else newGoal(g)}
  if(!g.done)ensure(g);return true}
function gatherSet(g,cells){   // handheld bunch picker: gather a whole bunch (no path needed); counts as one thread
  return gather(g,orderPath(g,cells)||[])}
function orderPath(g,cells){ // try to order a connected bunch into a simple path (DFS); fallback: largest path found
  let best=[];const S=new Set(cells);const dfs=(p)=>{if(p.length>best.length)best=p.slice();if(best.length===cells.length)return true;
    const last=p[p.length-1];for(const j of cells)if(!p.includes(j)&&adj(g,last,j)){p.push(j);if(dfs(p))return true;p.pop()}return false};
  for(const s of cells){if(dfs([s]))break}return best.length>=3?best:null}
function fall(g){for(let x=0;x<g.w;x++){const col=[];for(let y=g.h-1;y>=0;y--){const c=g.cells[y*g.w+x];if(c!=null)col.push(c)}
    for(let y=g.h-1,k=0;y>=0;y--,k++)g.cells[y*g.w+x]=k<col.length?col[k]:r_kind(g)}}
function bunches(g){const seen=new Set(),out=[];
  for(let i=0;i<g.cells.length;i++){const c=g.cells[i];if(seen.has(i)||wild(c))continue;const comp=[],st=[i],vis=new Set([i]);
    while(st.length){const a=st.pop();comp.push(a);const [x,y]=xy(g,a);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=g.w||ny>=g.h)continue;const j=ny*g.w+nx;
      if(!vis.has(j)&&(g.cells[j]===c||wild(g.cells[j]))){vis.add(j);st.push(j)}}}
    comp.forEach(j=>{if(!wild(g.cells[j]))seen.add(j)});if(comp.length>=3&&orderPath(g,comp))out.push({kind:c,cells:comp})}
  return out.sort((a,b)=>b.cells.length-a.cells.length)}
function ensure(g){let t=0;while(!bunches(g).length&&t++<50){shuffle(g)}if(t)g.events.push({type:'shuffle'})}
function shuffle(g){const c=g.cells;for(let i=c.length-1;i>0;i--){const j=Math.floor(g.r()*(i+1));[c[i],c[j]]=[c[j],c[i]]}if(!bunches(g).length)for(let i=0;i<c.length;i++)if(!wild(c[i]))c[i]=r_kind(g)}
function reshuffle(g){shuffle(g);ensure(g);g.events.push({type:'shuffle',free:true})}
function stars(g){if(!g.L.stars)return 0;return g.threads<=g.L.stars?3:g.threads<=g.L.stars+5?2:1}
function take(g){const e=g.events;g.events=[];return e}
const API={ITEMS,LEVELS,WILD,FAV,create,canAdd,valid,gather,gatherSet,orderPath,bunches,reshuffle,stars,take,adj,isLoop,isLine};
if(typeof module!=='undefined')module.exports=API;root.ConnectEngine=API;
})(typeof window!=='undefined'?window:globalThis);
