// Needs v2 logic (needs_v2/needs_bond.md §1, §2, §4). Pure + node-testable. The meter layout comes later (Cole's mock);
// NeedsV2.meter() is the data hook it will read. Bond never goes down; low needs change how often the Echo asks, never its tone.
(function(W){
const N={rate:{food:5,play:4,comfort:3,rest:3},quiet:[20,7],floor:1,show:50,hide:60,full:90,
  hue:{food:'#FFB070',play:'#7EC8FF',comfort:'#FF8FB8',rest:'#B49CFF'},
  bond:{hello:5,visit:5,feed:3,feedFav:6,pet:1,sit:3,game:4,reply:3},
  perDay:{visit:3,feed:3,feedFav:3,pet:3,sit:1,game:6},perSess:{reply:2},capSess:30,capDay:60,
  care:['feed','feedFav','pet','sit','game','nap','care']};
// hours of the span [t0,t1] that fall outside quiet hours (local clock); drain only runs while the child would be awake
function awakeHours(t0,t1,q){q=q||N.quiet;if(t1<=t0)return 0;let h=0,t=t0;const quiet=d=>{const x=d.getHours();return q[0]>q[1]?(x>=q[0]||x<q[1]):(x>=q[0]&&x<q[1])};
  while(t<t1){const d=new Date(t),nx=Math.min(t1,new Date(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours()+1).getTime());if(!quiet(d))h+=(nx-t)/36e5;t=nx}return h}
function drain(needs,t0,t1,q,cap){const h=Math.min(awakeHours(t0,t1,q),cap||1e9);for(const k in N.rate)needs[k]=Math.max(Math.min(needs[k],N.floor),Math.min(100,needs[k]-N.rate[k]*h));return h}
// the bubble: a need < 50 (stays until 60 once shown); lowest wins, a tie goes to the one met longest ago
function want(needs,metAt,shown){metAt=metAt||{};const c=Object.keys(N.rate).filter(k=>needs[k]<N.show||(k===shown&&needs[k]<N.hide));
  c.sort((a,b)=>needs[a]-needs[b]||(metAt[a]||0)-(metAt[b]||0));return c[0]||null}
const step=v=>v<25?1:v<50?2:v<75?3:4;
function meter(needs){const o={};for(const k in N.rate)o[k]={v:Math.round(needs[k]),step:step(needs[k]),hue:N.hue[k]};return o}
// request pacing by level: 25-49 at most 2 a session, 1-24 at most 3; gap 120 s + (level-1)/48 x 180 s
function reqCap(v){return v>=N.show?0:v<25?3:2}
function reqGapMs(v){return (120+Math.max(0,v-1)/48*180)*1000}
// bond: per-source daily counts, 2 replies a session, 30 a session and 60 a day; returns the points granted
function bondGrant(st,sess,src,day){const b=st.bondDay=st.bondDay&&st.bondDay.d===day?st.bondDay:{d:day,n:0,c:{}};sess.bond=sess.bond||0;sess.c=sess.c||{};
  let n=N.bond[src]||0;if(!n)return 0;
  if(N.perDay[src]!=null&&(b.c[src]||0)>=N.perDay[src])return 0;if(N.perSess[src]!=null&&(sess.c[src]||0)>=N.perSess[src])return 0;
  n=Math.max(0,Math.min(n,N.capSess-sess.bond,N.capDay-b.n));if(!n)return 0;b.c[src]=(b.c[src]||0)+1;sess.c[src]=(sess.c[src]||0)+1;b.n+=n;sess.bond+=n;return n}
// away timeline (clock frozen during holiday): 0 normal, 1 treasure, 2 note, 3 kind leave
function awayStage(h){return h>=72?3:h>=48?2:h>=24?1:0}
const awayFloor=[0,50,60,0];
// placeholder text from the spec (§4) until the dialogue pass moves it into dialogue/*.json
const L={note:{slyte:"Dear {child}, I saved you the shiniest pebble. Also, I learned to hop backwards! Want to see? — {name}",whimber:"Dear {child}, hoo! I counted the stars for you last night. There were lots. I saved you the brightest one. — {name}"},
  leave:{slyte:"Dear {child}, I went home to the meadow for my next adventure! The Howlings say hi. Thank you for being my friend. — {name}",whimber:"Dear {child}, I flew home to the old oak for my next adventure. The stars are bright here. Thank you for being my friend. — {name}"},
  leave2:{slyte:"Dear {child}, I found a new favourite rock! It is round and sparkly. — {name}",whimber:"Dear {child}, I found a new favourite rock in the old oak. Hoo, so smooth. — {name}"},
  holidayStart:{slyte:"A trip? Fun! I'll go exploring with the other Howlings. Tell me everything after!",whimber:"Hoo, a journey! I'll visit my Wingsong cousins in the old oak. Save me a story?"},
  holidayBack:{slyte:"You're here! I have SO many stories. First: a beetle with stripes.",whimber:"You're here! I have SO many stories. First: a beetle with stripes."},
  treasure:{slyte:"Look what I found while exploring!",whimber:"Hoo! I found something while exploring."}};
const fill=(t,v)=>t.replace(/\{(\w+)\}/g,(m,k)=>v[k]!=null?v[k]:m);
W.NeedsV2=Object.assign(N,{L,fill,awakeHours,drain,want,meter,step,reqCap,reqGapMs,bondGrant,awayStage,awayFloor});
if(typeof module!=='undefined')module.exports=W.NeedsV2})(typeof window!=='undefined'?window:globalThis);
