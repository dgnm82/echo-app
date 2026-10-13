// Needs v2 logic (needs_v2/needs_bond.md §1, §2, §4). Pure + node-testable. The meter layout comes later (Cole's mock);
// NeedsV2.meter() is the data hook it will read. Bond never goes down; low needs change how often the Echo asks, never its tone.
(function(W){
const N={rate:{food:5,play:4,comfort:3,rest:3},quiet:[20,7],floor:1,show:50,hide:60,full:90,
  hue:{food:'#FFB070',play:'#7EC8FF',comfort:'#FF8FB8',rest:'#B49CFF'},
  bond:{hello:5,visit:5,feed:3,feedFav:6,pet:1,sit:3,game:4,reply:3},
  perDay:{visit:3,snack:3,pet:3,sit:1,game:6},group:{feed:'snack',feedFav:'snack'},perSess:{reply:2},capSess:30,capDay:60,
  care:['feed','feedFav','pet','sit','game','nap','care']};
// hours of the span [t0,t1] that fall outside quiet hours (local clock); drain only runs while the child would be awake
function awakeHours(t0,t1,q){q=q||N.quiet;if(t1<=t0)return 0;let h=0,t=t0;const quiet=d=>{const x=d.getHours();return q[0]>q[1]?(x>=q[0]||x<q[1]):(x>=q[0]&&x<q[1])};
  while(t<t1){const d=new Date(t),nx=Math.min(t1,new Date(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours()+1).getTime());if(!quiet(d))h+=(nx-t)/36e5;t=nx}return h}
function drain(needs,t0,t1,q,cap){const h=Math.min(awakeHours(t0,t1,q),cap||1e9);for(const k in N.rate)needs[k]=Math.max(Math.min(needs[k],N.floor),Math.min(100,needs[k]-N.rate[k]*h));return h}
// the bubble: a need < 50 (stays until 60 once shown); lowest wins, a tie goes to the one met longest ago
function want(needs,metAt,shown){metAt=metAt||{};const c=Object.keys(N.rate).filter(k=>needs[k]<N.show||(k===shown&&needs[k]<N.hide));
  c.sort((a,b)=>needs[a]-needs[b]||(metAt[a]||0)-(metAt[b]||0));return c[0]||null}
const step=v=>v<25?1:v<50?2:v<75?3:4;
// handheld light: the lowest need's hue at its step (PWM duty = level^2.2); cream at 100 % when all >= 75
function led(needs){const ks=Object.keys(N.rate),lo=ks.reduce((a,b)=>needs[b]<needs[a]?b:a);if(ks.every(k=>needs[k]>=75))return {hex:'#FFF6E6',level:1,duty:1,breathe:false};
  const s=step(needs[lo]),level=[0,.2,.4,.7,1][s];return {hex:N.hue[lo],level,duty:Math.pow(level,2.2),breathe:s<=2,need:lo}}
function meter(needs){const o={};for(const k in N.rate)o[k]={v:Math.round(needs[k]),step:step(needs[k]),hue:N.hue[k]};return o}
// request pacing by level: 25-49 at most 2 a session, 1-24 at most 3; gap 120 s + (level-1)/48 x 180 s
function reqCap(v){return v>=N.show?0:v<25?3:2}
function reqGapMs(v){return (120+Math.max(0,v-1)/48*180)*1000}
// bond: per-source daily counts, 2 replies a session, 30 a session and 60 a day; returns the points granted
function bondGrant(st,sess,src,day,amt){const b=st.bondDay=st.bondDay&&st.bondDay.d===day?st.bondDay:{d:day,n:0,c:{}};sess.bond=sess.bond||0;sess.c=sess.c||{};
  let n=src==='choice'?(amt||0):(N.bond[src]||0);if(!n)return 0;const key=N.group[src]||src;
  if(N.perDay[key]!=null&&(b.c[key]||0)>=N.perDay[key])return 0;if(N.perSess[src]!=null&&(sess.c[src]||0)>=N.perSess[src])return 0;
  n=Math.max(0,Math.min(n,N.capSess-sess.bond,N.capDay-b.n));if(!n)return 0;b.c[key]=(b.c[key]||0)+1;sess.c[src]=(sess.c[src]||0)+1;b.n+=n;sess.bond+=n;return n}
// away timeline (clock frozen during holiday): 0 normal, 1 treasure, 2 note, 3 kind leave
function awayStage(h){return h>=72?3:h>=48?2:h>=24?1:0}
const awayFloor=[0,50,60,0];
W.NeedsV2=Object.assign(N,{led,awakeHours,drain,want,meter,step,reqCap,reqGapMs,bondGrant,awayStage,awayFloor});
if(typeof module!=='undefined')module.exports=W.NeedsV2})(typeof window!=='undefined'?window:globalThis);
