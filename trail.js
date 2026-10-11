// Sparkle trail engine (Leaf Trail / Firefly Parade, game spec v0.3 §3). Pure logic, testable in node.
// No crashes: walls and obstacles are soft bumps (turn along them), crossing the trail is fine, at most 12 followers shown.
(function(root){
const LEVELS={easy:{ms:450,goal:8,step:true,obstacles:0},standard:{ms:330,goal:12,step:false,obstacles:0},bigkid:{ms:250,goal:16,step:false,obstacles:6}};
const DX=[0,1,0,-1],DY=[-1,0,1,0],MAXF=12;
function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
function create(o){o=o||{};const level=LEVELS[o.level]?o.level:'standard',L=LEVELS[level],w=o.w||11,h=o.h||15,r=rng(o.seed||7);
  const g={level,L,w,h,r,head:{x:Math.floor(w/2),y:h-3},dir:0,hist:[],count:0,goal:o.goal||L.goal,pickup:null,obs:new Set(),events:[],done:false,roundIdx:0,
    jumper:!!o.jumper,rareChance:o.rareChance==null?.08:o.rareChance,steps:0,bumps:0};
  for(let k=0,t=0;k<L.obstacles&&t<200;t++){const x=1+Math.floor(r()*(w-2)),y=1+Math.floor(r()*(h-5));if(Math.abs(x-g.head.x)+Math.abs(y-g.head.y)>3&&!g.obs.has(x+','+y)){g.obs.add(x+','+y);k++}}
  spawn(g);return g}
const inside=(g,x,y)=>x>=0&&y>=0&&x<g.w&&y<g.h;
const free=(g,x,y)=>inside(g,x,y)&&!g.obs.has(x+','+y);
function spawn(g){const r=g.r,ahead=g.L.step;let p=null;
  if(ahead){for(const d of [3,2]){const x=g.head.x+DX[g.dir]*d,y=g.head.y+DY[g.dir]*d;if(free(g,x,y)){p={x,y};break}}}   // easy: 2-3 cells ahead
  for(let t=0;!p&&t<300;t++){const x=Math.floor(r()*g.w),y=Math.floor(r()*g.h);if(free(g,x,y)&&Math.abs(x-g.head.x)+Math.abs(y-g.head.y)>=3)p={x,y}}
  if(!p)p={x:0,y:0};p.rare=r()<g.rareChance;g.pickup=p;g.events.push({type:'spawn',x:p.x,y:p.y,rare:p.rare})}
function turn(g,d){g.dir=(g.dir+(d>0?1:3))%4}
function steer(g,tx,ty){const dx=tx-g.head.x,dy=ty-g.head.y;if(!dx&&!dy)return;let want=Math.abs(dx)>=Math.abs(dy)?(dx>0?1:3):(dy>0?2:0);
  if(want===(g.dir+2)%4)want=Math.abs(dx)>=Math.abs(dy)?(dy>=0?2:0):(dx>=0?1:3);if(want!==(g.dir+2)%4)g.dir=want}
function step(g,dash){if(g.done)return;let nx=g.head.x+DX[g.dir],ny=g.head.y+DY[g.dir];
  if(!free(g,nx,ny)){
    if(g.jumper&&g.obs.has(nx+','+ny)&&free(g,nx+DX[g.dir],ny+DY[g.dir])){g.events.push({type:'hop',x:nx,y:ny});nx+=DX[g.dir];ny+=DY[g.dir]}   // Super Jumper: hop the bush
    else{g.bumps++;g.events.push({type:'bump',x:nx,y:ny});const opts=[1,3].map(t=>(g.dir+t)%4).filter(d=>free(g,g.head.x+DX[d],g.head.y+DY[d]));
      if(!opts.length){g.dir=(g.dir+2)%4;return}
      const p=g.pickup;opts.sort((a,b)=>dist(g,a,p)-dist(g,b,p));g.dir=opts[0];nx=g.head.x+DX[g.dir];ny=g.head.y+DY[g.dir]}}
  g.hist.push({x:g.head.x,y:g.head.y});if(g.hist.length>64)g.hist.shift();g.head={x:nx,y:ny};g.steps++;
  const p=g.pickup;if(p&&p.x===nx&&p.y===ny){const v=p.rare?3:1;g.count=Math.min(g.goal,g.count+v);g.events.push({type:'pickup',rare:p.rare,count:g.count});
    if(g.count>=8&&!g.longSaid){g.longSaid=true;g.events.push({type:'long'})}
    const ends=[Math.ceil(g.goal/3),Math.ceil(2*g.goal/3),g.goal];while(g.roundIdx<3&&g.count>=ends[g.roundIdx]){g.events.push({type:'round',round:g.roundIdx});g.roundIdx++}
    if(g.count>=g.goal){g.done=true;g.events.push({type:'done'})}else spawn(g)}
  if(dash&&!g.done)step(g,false)}
function dist(g,d,p){if(!p)return 0;return Math.abs(g.head.x+DX[d]-p.x)+Math.abs(g.head.y+DY[d]-p.y)}
function followers(g){return g.hist.slice(-Math.min(g.count,MAXF)).reverse()}
function extra(g){return Math.max(0,g.count-MAXF)}
function take(g){const e=g.events;g.events=[];return e}
const API={LEVELS,MAXF,create,step,turn,steer,followers,extra,take,free};
if(typeof module!=='undefined')module.exports=API;root.TrailEngine=API;
})(typeof window!=='undefined'?window:globalThis);
