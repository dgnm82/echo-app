// Batch G (history): the starting level for every game by band. Since the Nov 1 overrides there is no age step: Catch/Stack/Run/Dig
// on 'auto' use the dial below; level() stays for set levels, Pairs and Den Dig's first games.
// Batch G: the starting level for every game by age band (pure; tools/test-age-start.js). A grown-up's per-game level
// (dev tools / Grown-ups) always wins. 5-6 plays Easy (obSetBand sets the per-game levels), 7-8 is unchanged (the first
// games are Easy, then Standard, with the quiet auto-Easy), 9-10 starts at Standard from game 1 (skips the Easy warm-up)
// and still falls back to Easy quietly after short games (AUTO_EASY), so every game stays playable.
(function(W){'use strict';
const START={'5-6':'easy','7-8':'auto','9-10':'standard'};
const WARMUP={pairs:1,dig:2,run:2,catch:2,stack:2};   // Easy games before Standard (7-8 / unset)
// o: {band, set (grown-up level or 'auto'), games (played so far), autoEasy (the quiet fallback is on)}
function level(gm,o){const set=o.set||'auto',fb=o.autoEasy?'easy':'standard';
  if(START[o.band]==='standard')return set!=='auto'?set:fb;
  if(gm==='pairs'||gm==='dig'){if((o.games||0)<WARMUP[gm])return 'easy';return set!=='auto'?set:fb}   // as before Batch G
  if(set!=='auto')return set;return (o.games||0)<WARMUP[gm]?'easy':fb}
// Music School Phase 1 step 1: the quiet dial. dial(game, ctx) -> 0..2 (0 = easy preset, 1 = standard, 2 = bigkid, blended between).
// ctx: {set (grown-up/dev level or 'auto'), ml (the child's MusicLevel record)}. A set level always wins (a fixed dial).
// blend(table, d): numeric fields (and flat numeric arrays of equal length) are interpolated between the two neighbouring presets;
// everything else (booleans, strings, step tables like simul / pieces / ease / wind) comes from the nearest preset.
// level() above stays for grown-up/dev overrides, Pairs and the old tests.
const PRESETS=['easy','standard','bigkid'];
const nearest=d=>PRESETS[Math.max(0,Math.min(2,Math.round(+d||0)))];
function dial(gm,ctx){ctx=ctx||{};const set=ctx.set||'auto';if(set!=='auto'&&PRESETS.includes(set))return PRESETS.indexOf(set);
  const m=ctx.ml;const v=m&&m.dial&&typeof m.dial[gm]==='number'?m.dial[gm]:(ctx.fallback!=null?ctx.fallback:.5);return Math.max(0,Math.min(2,v))}
const isNum=x=>typeof x==='number'&&isFinite(x);
const flatNums=a=>Array.isArray(a)&&a.every(isNum);
function blend(table,d){d=Math.max(0,Math.min(2,+d||0));const lo=Math.min(1,Math.floor(d)),f=d-lo,A=table[PRESETS[lo]],B=table[PRESETS[lo+1]],N=table[nearest(d)];
  if(!A||!B||!N)return N||A||B;const out={},keys=new Set(Object.keys(N).concat(Object.keys(A),Object.keys(B)));
  keys.forEach(k=>{const a=A[k],b=B[k];
    if(isNum(a)&&isNum(b))out[k]=a+(b-a)*f;
    else if(flatNums(a)&&flatNums(b)&&a.length===b.length)out[k]=a.map((x,i)=>x+(b[i]-x)*f);
    else if(k in N)out[k]=N[k]});
  return out}
const D={START,WARMUP,level,dial,blend,nearest,PRESETS};W.Difficulty=D;if(typeof module!=='undefined')module.exports=D;
})(typeof window!=='undefined'?window:globalThis);
