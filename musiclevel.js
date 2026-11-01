// MusicLevel (Music School Phase 1, step 1; Nov 1 overrides). Pure: no DOM, no network, node-testable (tools/test-musiclevel.js).
// The child's music level (ML 1-5) and the quiet per-game dials live per child in the Songbook store (echoback.js, store v:3,
// progress[kid].ml). No age prior: a neutral ML2 start, the hatching-song warm-up sets it, play adapts it toward ~70-80% success.
// The child never sees a level, a number or a score. Data: music/levels.json (DEF below is the same object; the test checks they match).
(function(W){'use strict';
const DEF={"_about":"Music School Phase 1, step 1 (Nov 1 overrides): the child's music level (ML 1-5) and the quiet game dials. Pure data for musiclevel.js. No age prior: everyone starts from a neutral ML2, the hatching-song warm-up sets the start, then play adapts toward ~70-80% success. The child never sees a level, a number or a score.","v":1,"levels":{"1":{"pads_tier":1,"eib_len":3,"songbook":{"max_distinct":3,"phrases":1},"rhythm":false,"solfege":"none"},"2":{"pads_tier":2,"eib_len":4,"songbook":{"max_distinct":4,"phrases":1},"rhythm":false,"solfege":"none"},"3":{"pads_tier":3,"eib_len":6,"songbook":{"max_distinct":99,"phrases":1},"rhythm":"long-short","solfege":"none"},"4":{"pads_tier":4,"eib_len":7,"songbook":{"max_distinct":99,"phrases":2},"rhythm":true,"solfege":"pads"},"5":{"pads_tier":4,"eib_len":8,"songbook":{"max_distinct":99,"phrases":99},"rhythm":true,"solfege":"pads+strip","_note":"same pads as ML4: fa and ti are Phase 2"}},"solfege":["do","re","mi","fa","sol","la","ti"],"prior":2,"warmup":{"up_at":3.25,"down_at":1,"beat":{"bpm":84,"beats":10,"skip":2,"window_ms":150,"min_taps":4},"pitch":{"trials":[4,2],"_note":"steps above do: a 5th (sol), then a 3rd (mi)"},"copy":{"notes":[4,2],"_note":"sol-mi"},"rhythm":{"ticks":[12,6,6,12],"ratio_tol":0.45,"long_short_min":1.25,"_rule":"right pattern = every long gap (12 ticks) is at least long_short_min x every short gap (6 ticks), tempo-free; same pat count only = 0.5"},"auto_ms":6000,"moment_max_ms":20000,"dial_from_ml":{"1":0,"2":0.5,"3":1.0,"4":1.0,"5":1.0},"dial_beat_bonus":{"at":0.7,"add":0.25}},"adapt":{"window":4,"up_above":0.85,"down_below":0.65,"up":0.15,"down":0.2,"min":0,"max":2,"games":["catch","stack","run","dig"],"report_only":["pairs"]},"eib":{"up_at":0.85,"down_below":0.65,"ramp_band":{"1":"5-6","2":"7-8","3":"7-8","4":"7-8","5":"7-8"},"ml_up_rounds":2,"_note":"Round success = matches / tunes in the round. >= 0.85 at the saved length steps the length up (the +2 below 8 and the tempo steps after 16 stay); < 0.65 or a soft stop = 1 note shorter next round (never below 3). ML rises (never falls automatically) when the length has stayed >= the next level's start for 2 rounds."},"seed_from_len":[[3,1],[4,2],[6,3],[7,4],[8,5]],"seed_dial_from_band":{"5-6":0,"7-8":0.5,"9-10":1.0},"reading":{"_about":"Dialogue band (5-6 / 7-8 / 9-10) for NEW children: starts at 5-6, nudged by the warm-up, grows with play. Only rises. Existing saves keep their band.","start":"5-6","from_ml":{"1":"5-6","2":"5-6","3":"7-8","4":"9-10","5":"9-10"},"grow_sessions":[[15,"7-8"]]}};
let D=DEF;
const GAMES=['catch','stack','run','dig'],PRESETS=['easy','standard','bigkid'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const r2=x=>Math.round(x*1000)/1000;
const LV=l=>D.levels[String(clamp(l|0,1,5))];
// ---------------------------------------------------------------- the per-child record
function fresh(level,src){const dial={},win={};const d0=D.warmup.dial_from_ml[String(level||D.prior)];GAMES.forEach(g=>{dial[g]=d0;win[g]=[]});win.eib=[];win.pairs=[];
  return {v:1,level:clamp(level||D.prior,1,5),src:src||'prior',warm:null,dial,win,set:{},met:{},missions:{},up:0,sessions:0}}
function valid(m){return !!m&&typeof m==='object'&&m.v===1&&m.level>=1&&m.level<=5&&m.dial&&m.win}
function repair(m){if(!valid(m))return fresh();const f=fresh(m.level,m.src);GAMES.forEach(g=>{if(typeof m.dial[g]!=='number'||!isFinite(m.dial[g]))m.dial[g]=f.dial[g];m.dial[g]=clamp(m.dial[g],D.adapt.min,D.adapt.max)});
  for(const k in f.win)if(!Array.isArray(m.win[k]))m.win[k]=[];['set','met','missions'].forEach(k=>{if(!m[k]||typeof m[k]!=='object')m[k]={}});m.up=m.up|0;m.sessions=m.sessions|0;if(m.warm===undefined)m.warm=null;return m}
// existing saves (no warm-up yet): level from the Echo It Back length, dials from the band the save already has
function levelFromLen(len){let l=1;for(const [n,ml] of D.seed_from_len)if((len|0)>=n)l=ml;return l}
function seed(len,band){const m=fresh(levelFromLen(len),'seed');const d=D.seed_dial_from_band[band];if(d!=null)GAMES.forEach(g=>m.dial[g]=d);return m}
// ---------------------------------------------------------------- warm-up scoring (each moment 0 / 0.5 / 1; never shown)
const sgn=x=>x>0?1:x<0?-1:0;
function scoreCopy(asked,ans){ans=ans||[];if(!ans.length)return 0;
  if(ans.length===asked.length&&ans.every((x,i)=>x===asked[i]))return 1;
  const sh=a=>a.slice(1).map((x,i)=>sgn(x-a[i])).join();
  if(ans.length===asked.length&&sh(ans)===sh(asked))return .5;                                   // right shape
  if(ans.length===asked.length+1)for(let i=0;i<ans.length;i++){const b=ans.slice(0,i).concat(ans.slice(i+1));if(b.every((x,j)=>x===asked[j]))return .5}   // one extra note
  return 0}
// heartbeat: share of taps within +-window of the nearest beat, after the first `skip` beats, at least min_taps taps.
// Relative timing: the median tap offset (phone audio lag) is taken out first, capped at +-250 ms.
function scoreBeat(taps,beats,o){o=Object.assign({},D.warmup.beat,o||{});if(!beats||beats.length<=o.skip)return 0;const from=beats[o.skip]-o.window_ms;
  const T=(taps||[]).filter(t=>t>=from);if(T.length<o.min_taps)return 0;const B=beats.slice(o.skip);
  const off=T.map(t=>{let best=1e9;for(const b of B)if(Math.abs(t-b)<Math.abs(best))best=t-b;return best}).sort((a,b)=>a-b);
  const med=clamp(off[Math.floor(off.length/2)],-250,250);return r2(off.filter(x=>Math.abs(x-med)<=o.window_ms).length/T.length)}
function scorePitch(trials){if(!trials||!trials.length)return 0;return r2(trials.reduce((a,t)=>a+(t===true?1:0),0)/trials.length)}
// clap it back: the same number of pats = 0.5; plus the long/short pattern (every long gap >= long_short_min x every short gap, tempo-free) = 1
function iois(t){return t.slice(1).map((x,i)=>x-t[i])}
function scoreRhythm(taps,ticks,min){const RR=D.warmup.rhythm;min=min==null?(RR.long_short_min||1.25):min;taps=taps||[];if(taps.length!==ticks.length)return 0;
  const a=iois(taps),b=ticks.slice(0,-1);if(!a.length)return .5;const hi=Math.max(...b),lo=Math.min(...b);
  if(hi===lo){const ma=a.reduce((x,y)=>x+y,0)/a.length;return ma>0&&a.every(x=>Math.abs(x/ma-1)<=RR.ratio_tol)?1:.5}
  const L=a.filter((x,i)=>b[i]===hi),S=a.filter((x,i)=>b[i]<hi);return Math.min(...L)>=min*Math.max(...S)?1:.5}
function total(r){return ['copy','beat','pitch','rhythm'].reduce((a,k)=>a+(+r[k]||0),0)}
function startLevel(r,prior){const p=prior==null?D.prior:prior,t=total(r);return clamp(t>=D.warmup.up_at?p+1:t<=D.warmup.down_at?p-1:p,1,5)}
function startDial(level,beat){const W2=D.warmup;let d=W2.dial_from_ml[String(level)];if(d==null)d=.5;if((+beat||0)>=W2.dial_beat_bonus.at)d+=W2.dial_beat_bonus.add;return clamp(d,D.adapt.min,D.adapt.max)}
// apply a finished warm-up. A fresh child (prior) takes the warm-up level. A seeded existing save never goes down (max of both).
// o.keep (a second Echo for the same child): the first song is made, but nothing here changes.
function applyWarmup(m,r,at,o){o=o||{};m=repair(m);if(o.keep)return m;const lv=startLevel(r),d=startDial(lv,r.beat);
  const was=m.level;m.level=m.src==='seed'?Math.max(was,lv):lv;m.src='warmup';m.warm={at:at||0,r:{copy:+r.copy||0,beat:+r.beat||0,pitch:+r.pitch||0,rhythm:+r.rhythm||0}};
  GAMES.forEach(g=>{if(m.win[g].length===0)m.dial[g]=d});return m}   // dials already shaped by play are kept
// ---------------------------------------------------------------- adaptation (after every game)
const presetDial=s=>{const i=PRESETS.indexOf(s);return i<0?null:i};
function dialFor(m,game){const s=m&&m.set&&m.set[game];const p=s&&s!=='auto'?presetDial(s):null;if(p!=null)return p;return m&&m.dial&&typeof m.dial[game]==='number'?m.dial[game]:D.warmup.dial_from_ml[String(D.prior)]}
function mean(a){return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}
// s: the game's success rate 0-1. Window = last N games. mean > up_above: +up; < down_below: -down; clamped. A set level holds the dial.
function report(m,game,s){m=repair(m);const A=D.adapt;if(typeof s!=='number'||!isFinite(s))return m;s=clamp(s,0,1);
  const w=m.win[game]=(m.win[game]||[]);w.push(r2(s));while(w.length>A.window)w.shift();
  if(GAMES.includes(game)&&!(m.set[game]&&m.set[game]!=='auto')){const mu=mean(w);let d=m.dial[game];
    if(mu>A.up_above)d+=A.up;else if(mu<A.down_below)d-=A.down;m.dial[game]=r2(clamp(d,A.min,A.max))}
  return m}
// ---------------------------------------------------------------- Echo It Back hooks
const eibStartLen=l=>LV(l).eib_len;
const padsTier=(l,tier)=>Math.max(tier|0,LV(l).pads_tier);           // the pads rule: music level OR song stage, whichever gives more
const rampBand=l=>D.eib.ramp_band[String(clamp(l|0,1,5))];
const solfege=l=>LV(l).solfege;
const rhythmShown=l=>LV(l).rhythm;
// a finished round at length len: ML rises (never falls on its own) after the length stayed >= the next level's start for N rounds
function eibRound(m,len,s){m=repair(m);if(typeof s==='number')report(m,'eib',s);
  if(m.level<5&&len>=eibStartLen(m.level+1)){m.up++;if(m.up>=D.eib.ml_up_rounds){m.level++;m.up=0}}else m.up=0;return m}
// round success -> length step: 'up' | 'down' | 'hold'
function eibStep(s,soft){if(soft)return 'down';if(s>=D.eib.up_at)return 'up';if(s<D.eib.down_below)return 'down';return 'hold'}
// ---------------------------------------------------------------- reading band (new children only; it only ever rises)
const BANDS=['5-6','7-8','9-10'];
function readingBand(cur,level,sessions){const R=D.reading;let i=Math.max(0,BANDS.indexOf(cur||R.start));
  i=Math.max(i,BANDS.indexOf(R.from_ml[String(clamp(level|0,1,5))]));for(const [n,b] of R.grow_sessions)if((sessions|0)>=n)i=Math.max(i,BANDS.indexOf(b));return BANDS[i]}
function setData(j){if(j&&j.levels&&j.adapt&&j.warmup)D=j;return D}
const API={DEF,GAMES,PRESETS,fresh,valid,repair,seed,levelFromLen,scoreCopy,scoreBeat,scorePitch,scoreRhythm,total,startLevel,startDial,applyWarmup,
  dialFor,report,mean,eibStartLen,padsTier,rampBand,solfege,rhythmShown,eibRound,eibStep,readingBand,setData,iois,BANDS};
Object.defineProperty(API,'data',{get:()=>D});
API.ready=(W.fetch&&W.document)?fetch('music/levels.json').then(r=>r.json()).then(setData).catch(()=>D):Promise.resolve(D);
W.MusicLevel=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
