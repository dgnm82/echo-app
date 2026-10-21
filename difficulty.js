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
const D={START,WARMUP,level};W.Difficulty=D;if(typeof module!=='undefined')module.exports=D;
})(typeof window!=='undefined'?window:globalThis);
