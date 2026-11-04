// Echo It Back (Batch F = music Part B piece 1, phone). The Echo sings a tiny tune, the child sings it back on the pads.
// No fail state, ever: same -> sparkle + "Same! Again?"; close -> small sparkle + "Close! Like this:" and the Echo plays it again,
// warmly and a little slower; anything else -> the Echo copies the child back ("Ooh, a new one! My turn:"). Matching compares
// the degree order only (timing is shown at T4 but never matched): EchoBack.matchTune(asked, answered) -> 'same'|'close'|'new'.
// Data (no tune or timbre lives in code): music/tunes.json echo_it_back (degrees per tier), music/instruments.json (instruments).
// Locks for pieces 2-3 (Zane): Song v1 = degree + octave + ticks with a version field (EchoBack.Song, 2 bytes a note when packed);
// the Songbook store 'echo-songbook-v1' is separate from the Echo save (schema + load/save only; nothing writes it yet);
// PadInput tracks one pad per pointerId (several fingers, slide-to-next-pad) with a 3-voice cap; instruments come from data.
// Batch G (v2): a round is 5 matches (same or close; a miss neither counts nor resets); 10 tunes without 5 = "Let's rest our ears!".
// Start length by age band, ramp after a round with all 5 matched first try, cap 16, then a little faster each round. Past 8 notes the tune
// is 4-note phrases (ABA / AABA) echoed phrase by phrase. Tunes come from a seeded scale walk (gen) unless a hand-written tier tune has the
// exact length. All numbers live in music/tunes.json echo_it_back.v2. Progress is per child in the Songbook store (v:2, silent v1 migration).
// Music School step 1 (Nov 1): store v:3 adds progress[kid].ml (MusicLevel, musiclevel.js; silent v1/v2 -> v3 migration, nothing lost).
// The start length, the ramp band, the pads (music level OR song stage, whichever gives more; never fa/ti in Phase 1) and the solfege
// labels come from ml.level. The length steps up after a round with success >= 0.85 (matches / tunes), and steps down 1 after < 0.65
// or a soft stop (never below 3). The band is only the reading band now: it no longer resets the length (only the grown-ups age row does).
(function(W){'use strict';
const ML=(typeof MusicLevel!=='undefined'?MusicLevel:(W.MusicLevel||(typeof require!=='undefined'?require('./musiclevel.js'):null)));
const EB={title:'Echo It Back',v:2};const MAJ=[0,2,4,5,7,9,11],TPB=12;
const SHARP=['c','c#','d','d#','e','f','f#','g','g#','a','a#','b'],FLAT=['c','db','d','eb','e','f','gb','g','ab','a','bb','b'];
const COLS=['c','d','e','f','g','a','b','c5','f#','bb'];   // sprite columns (px/eib/pads.png + px/notes/notes_shaped.png, Pixal Nov 1): C red ... B violet, C5 high do (pink hexagon), then F#, Bb
const COLS9=['c','d','e','f','g','a','b','f#','bb'];        // the older 9-column sheets (px/eib/hold.png, px/warmup/copy_pads.png, px/beat/stack_note_sparkle.png): no C5 column
let DATA=null,INST=null;
// ---------------------------------------------------------------- pure core (tools/test-echoback.js)
const step=x=>Array.isArray(x)?(x[0]-1)+7*(x[1]||0):x;            // [degree 1-7, octave, ticks] -> diatonic step (do 0, do' 7, low sol -3)
const fromStep=s=>{const o=Math.floor(s/7);return [s-7*o+1,o]};
const norm=a=>(a||[]).map(step);
const eq=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const sgn=x=>x>0?1:x<0?-1:0;
const contour=a=>a.slice(1).map((x,i)=>sgn(x-a[i])).join();
function matchTune(asked,answered){const A=norm(asked),B=norm(answered);
  if(!B.length)return 'new';if(eq(A,B))return 'same';
  if(B.length===A.length){let d=0;for(let i=0;i<A.length;i++)if(A[i]!==B[i])d++;if(d===1||(A.length>1&&contour(A)===contour(B)))return 'close'}   // one note off / right shape
  if(B.length===A.length+1)for(let i=0;i<B.length;i++)if(eq(A,B.slice(0,i).concat(B.slice(i+1))))return 'close';   // one extra or repeated note
  return 'new'}
const doMidi=fam=>((DATA&&DATA.do_midi)||{slyte:62,whimber:70,twitchel:65})[fam];
function midiOf(fam,s){const [d,o]=fromStep(s);return doMidi(fam)+MAJ[d-1]+12*o}
const midiOfNote=(fam,x)=>doMidi(fam)+MAJ[x[0]-1]+12*(x[1]||0)+(x[3]||0);   // a Song v2 note [degree, octave, ticks, acc]
const fileOfMidi=(fam,m)=>spell(fam,m).replace('#','s');
function spell(fam,m){return (fam==='slyte'?SHARP:FLAT)[((m%12)+12)%12]+(Math.floor(m/12)-1)}   // tunes.json style: f#4, bb4
const nameOf=(fam,s)=>spell(fam,midiOf(fam,s));
const fileOf=(fam,s)=>nameOf(fam,s).replace('#','s');                   // music/notes/<fam>_<file>
const colOf=n=>{if(n==='c5')return 7;const k=n.replace(/\d+$/,'');const i=COLS.indexOf(k);return i>=0?i:COLS.indexOf(k[0])};   // octave-5 C = its own column; every other C = do's
const colOf9=n=>{const k=n.replace(/\d+$/,'');const i=COLS9.indexOf(k);return i>=0?i:COLS9.indexOf(k[0])};
function padsFor(fam,tier,data){const D=data||DATA,t=Math.max(1,Math.min(4,tier|0)),out=[];
  for(let i=1;i<=t;i++){const L=(i===4&&D.unlock_t4&&D.unlock_t4[fam])||D.unlock[String(i)];for(const p of L)out.push(step(p))}
  return out.sort((a,b)=>a-b)}
function tunesFor(fam,tier,data){const D=data||DATA,t=Math.max(1,Math.min(4,tier|0));const T=D.tiers.find(x=>x.tier===t);return T.tunes.filter(u=>!u.fams||u.fams.includes(fam))}
// ---------------------------------------------------------------- v2 (Batch G): lengths, ramp, phrases, generator, tempo (all pure)
const V2=d=>(d||DATA).v2;
const startLen=(band,d)=>{const V=V2(d);return V.start[band]||V.start['7-8']};
function rampLen(len,band,d){const V=V2(d);for(const [upTo,st] of (V.ramp[band]||V.ramp['7-8']))if(len<upTo)return Math.min(upTo,len+st);return Math.min(V.max_len,len)}
function phrasesFor(len,d){const V=V2(d);if(len<V.phrase_from)return null;const shape=len<=12?V.shapes['12']:V.shapes['16'],nA=shape.split('A').length-1;
  for(let a=V.phrase_len;a>=2;a--){const b=len-nA*a;if(b>=2&&b<=V.phrase_len)return {shape,sizes:[...shape].map(l=>l==='A'?a:b),labels:[...shape]}}return null}
function rng(seed){let a=(seed>>>0)||1;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
// seeded scale walk over the tier's pads: a window of <= 4 neighbouring pads around do.
// H16: varied contours (ascending, descending, arch, valley/pendulum, leap-and-step, free walk) and a home ending on ANY stable degree
// of the window (do, mi, sol or la), not only do-with-mi-before-it; B phrases still end open (never on do).
const STABLE=x=>[0,2,4,5].includes(((x%7)+7)%7);
const CONTOURS=['walk','asc','desc','arch','valley','leap'];
function gen(fam,tier,len,seed,d){const D=d||DATA,V=V2(D),r=rng(seed),pads=padsFor(fam,tier,D),i0=pads.indexOf(0),w=Math.min(V.max_distinct,pads.length);
  const lo=Math.max(0,i0-w+1),hi=Math.min(i0,pads.length-w),ws=lo+Math.floor(r()*(hi-lo+1)),pool=pads.slice(ws,ws+w),d0=pool.indexOf(0),top=pool.length-1;
  const near=i=>pool[i>0&&(i>=top||r()<.5)?i-1:i+1];
  const cl=i=>Math.max(0,Math.min(top,i));
  function shape(n,kind,from){const ix=[from];const st=()=>1+(r()<.3?1:0);
    for(let k=1;k<n;k++){const i=ix[k-1],half=k<Math.ceil(n/2);let j;
      if(kind==='asc')j=i>=top?cl(i-1):i+st();
      else if(kind==='desc')j=i<=0?cl(i+1):i-st();
      else if(kind==='arch')j=half?(i>=top?cl(i-1):i+st()):(i<=0?cl(i+1):i-st());
      else if(kind==='valley')j=half?(i<=0?cl(i+1):i-st()):(i>=top?cl(i-1):i+st());
      else if(kind==='leap')j=k===1?(i+2<=top?i+2+(r()<.4&&i+3<=top?1:0):cl(i-2)):(ix[1]>ix[0]?i-1:i+1);
      else{const M=[-1,1,-1,1,0,2,-2];do{j=i+M[Math.floor(r()*M.length)]}while(top>0&&cl(j)===i&&k>1&&ix[k-1]===ix[k-2]);}
      ix.push(cl(j))}
    return ix.map(i=>pool[i])}
  function walk(n,home,from){const kind=CONTOURS[Math.floor(r()*CONTOURS.length)];
    const start=kind==='asc'||kind==='arch'?Math.floor(r()*Math.max(1,Math.ceil((top+1)/2))):kind==='desc'||kind==='valley'?top-Math.floor(r()*Math.max(1,Math.ceil((top+1)/2))):from;
    let o=shape(n,kind,cl(start));
    if(home){if(!STABLE(o[n-1])){const pi=pool.indexOf(o[n-1]),c=pool.map((x,i)=>[Math.abs(i-pi),i,x]).filter(z=>STABLE(z[2])).sort((a,b)=>a[0]-b[0]||(r()<.5?-1:1));if(c.length)o[n-1]=c[0][2]}}
    else if(o[n-1]===0)o[n-1]=near(d0);
    if(n>=2&&top>0&&o.every(x=>x===o[0]))o[0]=near(pool.indexOf(o[0]));
    if(home&&!STABLE(o[n-1]))o[n-1]=0;
    return o}
  const P=phrasesFor(len,D);let steps,phrases=null;
  if(!P)steps=walk(len,true,Math.floor(r()*pool.length));
  else{const A=walk(P.sizes[P.labels.indexOf('A')],true,Math.floor(r()*pool.length));let B,g=0;
    do{B=walk(P.sizes[P.labels.indexOf('B')],false,pool.indexOf(near(d0)))}while(g++<8&&eq(B,A.slice(0,B.length)));
    steps=[];phrases=[];P.labels.forEach(l=>{const q=l==='A'?A:B;phrases.push([steps.length,steps.length+q.length]);steps.push(...q)})}
  const ticks=steps.map(()=>TPB);
  if(tier>=4&&len<=V.rhythm_shown_to)for(let i=0;i<len-2;i++)if(r()<.2){ticks[i]=18;ticks[i+1]=6;i++}   // long-short, shown never matched
  const s=Song.fromSteps(V.tempo.bpm,steps,ticks);return Object.assign(s,{id:'g'+seed,phrases,labels:P?P.labels:null})}
// H16 dedupe core (pure, deterministic, mirrored by eib_core.c pick_fresh()):
//  key = normalized diatonic steps joined by ','; a candidate is fresh when key != lastSeq and key is not in the round's seen list.
//  1) hand-written tunes of exactly this length that are fresh, in file order; choose index floor(rng(seed)() * count).
//  2) else the generator at seeds seed + k*0x9E3779B1 (mod 2^32), k = 0..GEN_TRIES-1: first fresh tune wins.
//  3) else (tiny pools only) the first generated tune with key != lastSeq from k = GEN_TRIES..GEN_TRIES+FALLBACK_TRIES-1
//     (round repeat allowed, back-to-back never); last resort: the k=0 tune.
const GEN_TRIES=64,FALLBACK_TRIES=192;
const seqKey=n=>norm(n).join(',');
function pickFresh(o){const seen=new Set(o.seen||[]),last=o.lastSeq==null?null:String(o.lastSeq),fresh=k=>k!==last&&!seen.has(k);
  const H=(o.hand||[]).filter(u=>u.n.length===o.len&&fresh(seqKey(u.n)));
  if(H.length){const r=rng(o.seed>>>0);return {tune:H[Math.floor(r()*H.length)],src:'hand',k:-1}}
  const sd=k=>((o.seed>>>0)+Math.imul(k,0x9E3779B1))>>>0;
  for(let k=0;k<GEN_TRIES;k++){const t=o.gen(sd(k));if(fresh(seqKey(t.n)))return {tune:t,src:'gen',k}}
  for(let k=GEN_TRIES;k<GEN_TRIES+FALLBACK_TRIES;k++){const t=o.gen(sd(k));if(seqKey(t.n)!==last)return {tune:t,src:'fallback',k}}
  return {tune:o.gen(sd(0)),src:'last_resort',k:0}}
// simulate rounds exactly like start() does (used by tests + vector export): returns [[keys of round 1], [keys of round 2], ...]
function simulateRounds(o){const out=[];let last=o.lastSeq||null,seed=o.seed0||0;const tunes=tunesFor(o.fam,o.tier,o.data);
  for(let r=0;r<o.rounds;r++){const seen=[];for(let i=0;i<(o.perRound||5);i++){seed++;const s=(seed*7919+(o.kid||'kid').length*104729+o.tier)>>>0;
      const res=pickFresh({hand:tunes,len:o.len,seen,lastSeq:last,seed:s,gen:sd=>gen(o.fam,o.tier,o.len,sd,o.data)});const k=seqKey(res.tune.n);seen.push(k);last=k}
    out.push(seen)}
  return out}
// ---------------------------------------------------------------- Ancient Echoes (Music School step 2; pure, tools/test-songbook.js)
// music/tunes.json "songbook": {v:1, slyte:[tune], whimber:[...], twitchel:[...]}; tune = {id, title, composer, home, meter, bpm, mood, skills,
// echo: Song v2 (the real hook the Echo sings), child: [Song v1 phrases on the family pads], min_ml, icon, prov, prov_status}.
// Only prov_status "ok" tunes ever play (build_songbook.py holds back edition_check; test-songbook.js fails if one ships).
let SB=null;
function sbTunes(fam,sb){const B=sb||SB;const L=(B&&Array.isArray(B[fam]))?B[fam]:[];return L.filter(t=>t&&t.id&&t.prov_status==='ok'&&Song.valid(t.echo)&&Array.isArray(t.child)&&t.child.length&&t.child.every(Song.valid))}
const sbById=(id,sb)=>{const B=sb||SB;if(!B)return null;for(const f of ['slyte','whimber','twitchel'])for(const t of sbTunes(f,B))if(t.id===id)return Object.assign({fam:f},t);return null};
// the child's part, cut to the length they're on: the first `len` notes of the allowed phrases joined (ML: songbook.phrases, max_distinct).
// <= 8 notes: one tune; longer: phrase by phrase at the child phrase boundaries. null = not for this child yet.
function sbChild(t,len,lv,lim){lim=lim||{max_distinct:4,phrases:1};if(!t||(t.min_ml||1)>lv)return null;const P=t.child.slice(0,Math.max(1,lim.phrases|0));
  const all=[],bounds=[];P.forEach(ph=>{bounds.push([all.length,all.length+ph.n.length]);all.push(...ph.n)});const n=all.slice(0,Math.max(3,len|0));if(n.length<3)return null;
  const cut=bounds.map(([a,b])=>[a,Math.min(b,n.length)]).filter(([a,b])=>b>a);
  if(cut.some(([a,b])=>new Set(n.slice(a,b).map(x=>step(x))).size>Math.min(4,lim.max_distinct||4)))return null;
  const phrased=n.length>8&&cut.length>1;return {n:n.map(x=>[x[0],x[1],x[2]]),phrases:phrased?cut:null,labels:phrased?cut.map((z,i)=>String.fromCharCode(65+i)):null}}
// which tune: allowed at this level, least heard first, never the same tune twice in a row (when there is another), seeded among ties
function sbPick(o){const L=sbTunes(o.fam,o.sb).filter(t=>sbChild(t,o.len,o.lv,o.lim));if(!L.length)return null;const met=o.met||{},h=t=>(met[t.id]&&met[t.id].h)||0;
  let C=L.length>1&&o.last?L.filter(t=>t.id!==o.last):L;const lo=Math.min(...C.map(h));C=C.filter(t=>h(t)===lo);return C[Math.floor(rng((o.seed>>>0)||1)()*C.length)]}
// where in the round (0-based tune index): a seeded position, never the first tune. k slots (a chosen tune: 2) are distinct.
function sbSlots(seed,round,k){const r=rng((seed>>>0)||1),out=[];k=Math.min(k||1,Math.max(1,round-1));while(out.length<k){const i=1+Math.floor(r()*(round-1));if(!out.includes(i))out.push(i)}return out.sort((a,b)=>a-b)}
// the Echo version, cut at a note boundary to at most 8 s
function sbEchoNotes(song){return song.n.slice()}   // an Ancient Echo (EIB intro + replay, Memory Book) = the whole approved phrase, never cut (Daniel)
// heard / matched (ml.met[id] = {h: times heard, m: 1 after the first match, o: order first heard, l: last heard, f: family})
function sbHeard(ml,t,fam){ml.met=ml.met||{};ml.metN=(ml.metN|0)+1;const e=ml.met[t.id]||(ml.met[t.id]={h:0,m:0,o:ml.metN,f:fam});const first=!e.h;e.h++;e.l=ml.metN;return first}
const sbList=(ml,fam)=>Object.keys((ml&&ml.met)||{}).map(id=>Object.assign({id},ml.met[id])).filter(e=>e.h>0&&(!fam||e.f===fam)&&sbById(e.id)).sort((a,b)=>a.o-b.o);
const bpmAt=(step,bpm0,d)=>{const T=V2(d).tempo;return Math.min(T.bpm_max,Math.round(bpm0*(1+T.step*Math.min(T.max_steps,step||0))))};
const noteMs=(ticks,bpm,d)=>Math.max(V2(d).tempo.min_note_ms,ticks*60000/bpm/TPB);
const matchPhrased=rs=>rs.includes('new')?'new':rs.includes('close')?'close':'same';
// progress (per child, in the Songbook store): {band, len, roundsDone, tempoStep, speedRounds, seed}
const Progress={
  // the child's age band lives here too (Kai, Batch G): a changed age sets the length to that band's start, up or down
  // Nov 1: a new child starts at the music level's length (neutral ML2 = 4 notes until the warm-up sets it). The band passed in is the
  // reading band; it is remembered but never moves the length (only setBand, from the grown-ups age row, does).
  get(b,kid,band,d){b.progress=b.progress||{};let p=b.progress[kid];
    if(!p){const m=ML?ML.fresh():null;p=b.progress[kid]={band,len:m?ML.eibStartLen(m.level):startLen(band,d),roundsDone:0,tempoStep:0,speedRounds:0,seed:0};if(m)p.ml=m}
    if(ML)p.ml=ML.repair(p.ml);if(band&&!p.band)p.band=band;return p},
  setBand(p,band,d){p.band=band;p.len=startLen(band,d);p.tempoStep=0;p.grew=0;return p},
  reset(b,kid,band,d){const o=(b.progress||{})[kid]||{};(b.progress=b.progress||{})[kid]={band,len:startLen(band,d),roundsDone:o.roundsDone||0,tempoStep:0,speedRounds:o.speedRounds||0,seed:o.seed||0};if(o.ml)b.progress[kid].ml=o.ml;return b.progress[kid]},   // the music level is kept
  // a finished round (Nov 1 / LIST2 #6): success = matches / tunes. >= 0.85 at the saved length (not a "little one") steps up
  // (+len below 16 via the ramp, +tempo at 16); < 0.65 (or a soft stop) takes a tempo step back, or 1 note off when there is no tempo
  // step to give back (never below min_len). o.success missing (old callers): perfect = 1, otherwise a hold.
  finish(p,o,band,d){const V=V2(d),was=p.len;p.grew=0;
    const s=typeof o.success==='number'?o.success:o.soft?0:o.perfect?1:.7,stepK=ML?ML.eibStep(s,!!o.soft):(o.soft?'down':o.perfect?'up':'hold');
    const down=()=>{if((p.tempoStep||0)>0)p.tempoStep--;else if(p.len>V.min_len){p.len--;p.grew=-1}};
    if(o.soft){down();return p}
    p.roundsDone=(p.roundsDone||0)+1;if(p.tempoStep>0)p.speedRounds=(p.speedRounds||0)+1;
    if(stepK==='up'&&o.played===p.len&&!o.little){if(p.len<V.max_len){p.len=rampLen(p.len,band,d);p.grew=p.len-was}else p.tempoStep=Math.min(V.tempo.max_steps,(p.tempoStep||0)+1)}
    else if(stepK==='down')down();
    return p}};
function stickersFor(played,speedRounds,has,d){const out=[],S=V2(d).stickers;
  const L=S.find(x=>x.len&&x.len<=played&&!has(x.title));if(L)out.push(L.title);
  for(const x of S)if(x.speed_rounds&&speedRounds>=x.speed_rounds&&!has(x.title))out.push(x.title);return out}
// ---------------------------------------------------------------- Song v1 (lock 1) + Songbook store (lock 2, v:2 adds per-child progress)
// Song v2 (Music School step 2): v1 + an optional 4th element acc (-1/0/+1, the Echo's half-steps in the Ancient Echoes).
// Still 2 bytes a note: b0 = degree | (octave+1)<<3 | (acc+1)<<6 in v2 (v1 keeps the top 2 bits 0, so every v1 pack is unchanged).
// Child phrases stay v1. Song.valid accepts v1 and v2.
const Song={v:1,tpb:TPB,
  make:(bpm,n)=>({v:1,bpm:bpm|0,tpb:TPB,n:n.map(x=>[x[0]|0,x[1]|0,Math.max(1,Math.min(255,x[2]|0))])}),
  make2:(bpm,n)=>({v:2,bpm:bpm|0,tpb:TPB,n:n.map(x=>{const y=[x[0]|0,x[1]|0,Math.max(1,Math.min(255,x[2]|0))];if(x[3])y.push(Math.max(-1,Math.min(1,x[3]|0)));return y})}),
  fromSteps:(bpm,steps,ticks)=>Song.make(bpm,steps.map((s,i)=>{const [d,o]=fromStep(s);return [d,o,(ticks&&ticks[i])||TPB]})),
  valid:s=>!!s&&(s.v===1||s.v===2)&&s.tpb===TPB&&s.bpm>=40&&s.bpm<=200&&Array.isArray(s.n)&&s.n.every(x=>Array.isArray(x)&&(x.length===3||(s.v===2&&x.length===4&&[-1,0,1].includes(x[3])))&&x[0]>=0&&x[0]<=7&&x[1]>=-1&&x[1]<=2&&x[2]>=1&&x[2]<=255),
  // 2 bytes a note (ESP32 /songbook.bin): b0 = degree | (octave+1)<<3, b1 = ticks; 4-byte header v, bpm, count lo, count hi
  pack(s){const b=new Uint8Array(4+2*s.n.length);b[0]=s.v;b[1]=s.bpm;b[2]=s.n.length&255;b[3]=s.n.length>>8;
    s.n.forEach((x,i)=>{b[4+2*i]=(x[0]&7)|(((x[1]+1)&7)<<3)|(s.v===2?((((x[3]||0)+1)&3)<<6):0);b[5+2*i]=x[2]});return b},
  unpack(b){const n=[],len=b[2]|(b[3]<<8),v2=b[0]===2;for(let i=0;i<len;i++){const x=b[4+2*i],y=[x&7,((x>>3)&7)-1,b[5+2*i]];if(v2){const a=((x>>6)&3)-1;if(a)y.push(a)}n.push(y)}return {v:b[0],bpm:b[1],tpb:TPB,n}}};
const Songbook={KEY:'echo-songbook-v1',   // key kept from v1 (store v:3 inside); beside the Echo save: survives a release and a new Echo; only "Start over" (erase all) removes it
  schema:{v:3,slots:6,songs:'[{id, made: ms, fam, inst, song: Song v1}] (at most slots)',star:'song id | null (Echo\'s Song, piece 3)',
    progress:'{[child id]: {band, len, roundsDone, tempoStep, speedRounds, seed, ml}} (reading band + Echo It Back v2 + music level)',
    ml:"{v:1, level:1-5, src:'prior'|'warmup'|'seed', warm:{at, r:{copy,beat,pitch,rhythm}}|null, dial:{catch,stack,run,dig: 0-2}, win:{<game>:[last 4 success 0-1]}, set:{}, met:{}, missions:{}, up, sessions}"},
  empty:()=>({v:3,slots:6,songs:[],star:null,progress:{}}),
  // v1 -> v3: songs kept, empty progress. v2 -> v3: every child's progress kept; ml seeded from the EIB length (and the band's dial).
  migrate(j){if(!j||typeof j!=='object'||!Array.isArray(j.songs))return null;
    if(j.v===1)return Object.assign({},j,{v:3,progress:{}});
    if(j.v===2||j.v===3){const P=j.progress&&typeof j.progress==='object'?j.progress:{};
      for(const k in P){const p=P[k];if(!p||typeof p!=='object'){delete P[k];continue}if(ML&&!ML.valid(p.ml))p.ml=ML.seed(p.len,p.band)}
      return Object.assign(j,{v:3,progress:P})}
    return null},
  load(){let j=null;try{j=JSON.parse(localStorage.getItem(Songbook.KEY)||'null')}catch(e){}const was=j&&j.v,raw=JSON.stringify(j);let m=null;try{m=Songbook.migrate(j)}catch(e){m=null}if(!m)return Songbook.empty();if(was!==3||JSON.stringify(m)!==raw)Songbook.save(m);return m},
  save(b){try{localStorage.setItem(Songbook.KEY,JSON.stringify(b));return true}catch(e){return false}},
  clear(){try{localStorage.removeItem(Songbook.KEY)}catch(e){}}};
// ---------------------------------------------------------------- data
EB.ready=(W.fetch&&W.document)?Promise.all([fetch('music/tunes.json').then(r=>r.json()).then(j=>{DATA=j.echo_it_back||null;SB=j.songbook||null}),
  fetch('music/instruments.json').then(r=>r.json()).then(j=>{INST=j})]).catch(()=>{}):Promise.resolve();
EB.setData=(eib,inst)=>{DATA=eib;if(inst)INST=inst};
EB.setSongbook=sb=>{SB=sb||null;return SB};EB.songbook=()=>SB;
// ---------------------------------------------------------------- voices (cap from instruments.json, 3 on the speaker)
const voices=[];
const instOf=o=>(INST&&INST.instruments&&INST.instruments[(o&&o.inst)||INST.default])||{sample:'notes/{fam}_{note}',gain:.5};
const sampleOf=(fam,s,o)=>{const I=instOf(o);return I.sample?I.sample.replace('{fam}',fam).replace('{note}',o&&o.midi!=null?fileOfMidi(fam,o.midi):fileOf(fam,s)):null};
function play(fam,s,o){o=o||{};if(!W.Music||!Music.oneShot)return;const I=instOf(o);
  if(!I.sample)return;const cap=(INST&&INST.voices)||3;
  const p=Music.oneShot(sampleOf(fam,s,o),{vol:(o.vol||1)*(I.gain||.5)});
  if(p&&p.then)p.then(src=>{if(!src)return;voices.push(src);while(voices.length>cap){const v=voices.shift();try{v.stop()}catch(e){}}
    src.onended=()=>{const i=voices.indexOf(src);if(i>=0)voices.splice(i,1)}})}
// Nov 3 (LIST #11): a tune is scheduled only once its note samples are decoded. Music.oneShot fetches a sample the first time it
// is asked for and starts it when it lands, so a tune with notes never heard before (an Ancient Echo's first intro: half-steps and
// octaves outside the pads) started late and bunched up, i.e. sounded rushed; a replay (all cached) was fine. Never waits > 2.5 s.
const echoSamples=(fam,notes)=>notes.filter(x=>x[0]).map(x=>sampleOf(fam,0,{midi:midiOfNote(fam,x)})).filter(Boolean);
const padSamples=(fam,notes)=>notes.map(x=>sampleOf(fam,step(x))).filter(Boolean);
function whenLoaded(list){if(!W.Music||!Music.prime||!list.length)return Promise.resolve();return Promise.race([Music.prime(list).catch(()=>{}),new Promise(r=>setTimeout(r,2500))])}
// Nov 3 (LIST #11): an Ancient Echo's one tempo, from its score: the intro (Echo version + the child's part), the round-end duet and the
// Memory Book replay all read sbBpm. The round speed-up (bpmAt / tempoStep) is for the generated tunes only.
const sbBpm=t=>(t&&t.echo&&t.echo.bpm)||(t&&t.bpm)||96;
const sbTune=(t,c)=>({id:'anc:'+t.id,n:c.n,phrases:c.phrases,labels:c.labels,bpm:sbBpm(t),ancient:t});   // the round's Ancient Echo tune (pure: tools/test-songbook.js)
// ---------------------------------------------------------------- PadInput (lock 3): several fingers, one live pad per pointer
function PadInput(root,opt){const live=new Map(),doc=root.ownerDocument||document;
  const padAt=(x,y)=>{const el=doc.elementFromPoint(x,y),p=el&&el.closest?el.closest('[data-pad]'):null;return p&&root.contains(p)?p:null};
  const id=p=>+p.dataset.pad;
  const down=e=>{const p=padAt(e.clientX,e.clientY);if(!p)return;e.preventDefault();if(live.has(e.pointerId))opt.up(id(live.get(e.pointerId)),e.pointerId);live.set(e.pointerId,p);opt.down(id(p),e.pointerId)};
  const move=e=>{const was=live.get(e.pointerId);if(!was)return;const p=padAt(e.clientX,e.clientY);if(p&&p!==was){opt.up(id(was),e.pointerId);live.set(e.pointerId,p);opt.down(id(p),e.pointerId)}};
  const up=e=>{const was=live.get(e.pointerId);if(!was)return;live.delete(e.pointerId);opt.up(id(was),e.pointerId)};
  const key=e=>{const p=e.target&&e.target.closest&&e.target.closest('[data-pad]');if(!p||!(e.key==='Enter'||e.key===' '))return;e.preventDefault();opt.down(id(p),'k');setTimeout(()=>opt.up(id(p),'k'),150)};
  root.addEventListener('pointerdown',down);W.addEventListener('pointermove',move);W.addEventListener('pointerup',up);W.addEventListener('pointercancel',up);root.addEventListener('keydown',key);
  return {live,off(){root.removeEventListener('pointerdown',down);W.removeEventListener('pointermove',move);W.removeEventListener('pointerup',up);W.removeEventListener('pointercancel',up);root.removeEventListener('keydown',key);live.clear()}}}
// ---------------------------------------------------------------- the game
let TOK=0,cur=null;
const msPerTick=bpm=>60000/bpm/TPB;
const SOLN=['do','re','mi','fa','sol','la','ti'];
function noteHTML(fam,s,ticks,cls){const n=nameOf(fam,s);return `<i class="eibn${ticks>=18?' long':ticks<=6?' short':''}${cls?' '+cls:''}" style="--c:${colOf(n)};--h:${colOf9(n)}" data-note="${n}" data-sol="${SOLN[((s%7)+7)%7]}"></i>`}
// LIST2 #3 (Daniel, Oct 28): a row longer than 4 notes splits into two even rows (6 = 3+3, 8 = 4+4, odd: the top row gets the extra one);
// 4 or fewer stay on one row. Same rule for the length dots on the start tiles. rowCols(n) = columns of the grid.
const rowCols=n=>n>4?Math.ceil(n/2):Math.max(1,n);
function layoutRow(row,n){row.classList.toggle('two',n>4);row.style.setProperty('--cols',rowCols(n))}
// Nov 3 (LIST #1): the pads are one even row (--n equal shares), 6px labels once there are more than 6 pads (crowd), an even 2-row grid past 8
function padsLayout(box,n){box.style.setProperty('--n',n);box.style.setProperty('--c',Math.ceil(n/2));box.classList.toggle('crowd',n>6);box.classList.toggle('two',n>8)}
const dotsHTML=n=>`<span class="eibdots" style="--n:${rowCols(n)}">${'<i></i>'.repeat(n)}</span>`;   // lengths are dots, never numbers
// api: {gs, fam, tier, lowfx, state, save, line, talk, react, band, kid, mode:'play'|'invite', color, hasSticker(t), onSticker(t,{fam,song}), onTune(r), onRound(info), onDone(finished)}
function start(api){stop();const fam=api.fam,tier=Math.max(1,Math.min(4,api.tier|0)),RM=!!api.lowfx,st=api.state||{},V=DATA.v2,band=api.band||'7-8',kid=api.kid||'kid';
  st.rounds=st.rounds||0;st.heard=st.heard||[];
  const book=Songbook.load(),P=Progress.get(book,kid,band);Songbook.save(book);
  const lvl=P.ml?P.ml.level:2,ptier=ML?Math.min(4,ML.padsTier(lvl,tier)):tier,sol=ML?ML.solfege(lvl):'none',SOL=ML?ML.data.solfege:[];   // pads: music level OR song stage, whichever gives more
  const tok=++TOK,later=(ms,f)=>{const t=tok;return setTimeout(()=>{if(t===TOK)f()},ms)};
  let pads=padsFor(fam,ptier);const tunes=tunesFor(fam,ptier),basePads=pads.slice();
  const LIM=(ML&&ML.data.levels[String(lvl)]&&ML.data.levels[String(lvl)].songbook)||{max_distinct:4,phrases:1};   // Ancient Echoes: what this music level copies
  const padsHTML=L=>L.map((s,i)=>{const n=nameOf(fam,s);return `<button class="eibpad" data-pad="${s}"${sol!=='none'?` data-sol="${SOL[((s%7)+7)%7]}"`:''} style="--c:${colOf(n)};--i:${i}" aria-label="Note ${n.replace(/\d/,'').toUpperCase().replace('#',' sharp').replace(/^(.)B$/,'$1 flat')}"></button>`}).join('');
  const root=document.createElement('div');root.className='eib'+(RM?' rm':'')+(sol!=='none'?' solpads':'')+(sol==='pads+strip'?' solstrip':'');root.id='eib';if(api.color)api.gs.style.setProperty('--ec',api.color);
  root.innerHTML=`<div class="eibbeads" aria-hidden="true">${'<i></i>'.repeat(V.round)}</div>
    <div class="eibstrip" aria-live="polite"><div class="eibslots" aria-hidden="true"></div><div class="eibrow eibask" aria-label="The Echo's tune"></div><div class="eibrow eibans" aria-label="Your tune"></div><i class="eibspark"></i><i class="eibpuff"></i></div>
    <div class="eibpads listen" role="group" aria-label="Notes">${padsHTML(pads)}</div>
    <div class="eibtiles" hidden></div><i class="eibflo" hidden aria-hidden="true"></i>`;
  api.gs.appendChild(root);if(RM)api.gs.classList.add('eibrm');const ask=root.querySelector('.eibask'),ans=root.querySelector('.eibans'),padBox=root.querySelector('.eibpads'),spark=root.querySelector('.eibspark'),
    beads=[...root.querySelectorAll('.eibbeads i')],slots=root.querySelector('.eibslots'),puff=root.querySelector('.eibpuff'),tiles=root.querySelector('.eibtiles');
  padsLayout(padBox,pads.length);const padEl=s=>padBox.querySelector(`[data-pad="${s}"]`);
  const light=(s,ms)=>{const p=padEl(s);if(!p)return;p.classList.add('on');setTimeout(()=>p.classList.remove('on'),ms||260)};
  const say=(k,ms,x)=>{const l=api.line&&api.line(k,x);if(l)api.talk(l,ms||2200)};   // x = {ancient: tune} for eib_ancient_* (the shell adds eib_band + the spoken title)
  const echoEl=()=>document.getElementById('cr');const saveBook=()=>Songbook.save(book);
  // ---- Ancient Echoes: the flourish over the Echo's head, the Echo version (real notes, half-steps included), the pads a tune needs
  const flo=root.querySelector('.eibflo');
  function flourish(){const e=echoEl(),g=api.gs.getBoundingClientRect();if(e){const a=e.getBoundingClientRect();flo.style.left=(a.left-g.left+a.width/2)+'px';flo.style.top=(a.top-g.top)+'px'}
    flo.hidden=false;flo.className='eibflo'+(RM?' static':'');void flo.offsetWidth;flo.classList.add('go');later(RM?1000:600,()=>{flo.hidden=true;flo.classList.remove('go')})}
  function singEcho(at,done){const song=at.echo,notes=sbEchoNotes(song);phase='echo';padBox.classList.add('listen');padBox.classList.remove('turn');ask.innerHTML='';ans.innerHTML='';
    const tk=TOK;whenLoaded(echoSamples(fam,notes)).then(()=>{if(tk===TOK)singEchoNow(at,notes,done)})}
  function singEchoNow(at,notes,done){const k=msPerTick(sbBpm(at)),e=echoEl();if(e)e.classList.add('eibsing');
    let t=300;const my=++singing;notes.forEach(x=>{const d=Math.max(V.tempo.min_note_ms,x[2]*k);if(x[0])later(t,()=>{play(fam,0,{midi:midiOfNote(fam,x)});if(W.PIXEL&&W.PIXEL.react&&!RM)W.PIXEL.react('sing');
      const s=step(x);if(!x[3]&&padEl(s))light(s,Math.min(420,d*.8))});t+=d});
    later(t+300,()=>{if(my===singing){const e2=echoEl();if(e2)e2.classList.remove('eibsing')}done&&done()});return t}
  function setPads(L){pads=L;padsLayout(padBox,L.length);padBox.innerHTML=padsHTML(L)}
  function needPads(list){const need=new Set();list.forEach(c=>c.n.forEach(x=>need.add(step(x))));const L=[...new Set(basePads.concat([...need]))].sort((a,b)=>a-b);if(L.length!==pads.length||L.some((x,i)=>x!==pads[i]))setPads(L);return need}
  let phase='echo',tune=null,asked=[],answer=[],gapT=null,waitT=null,idles=0,retried=false,lastId=null,n=0,singing=0,R=null,curNotes=[],ph=-1,pres=[];
  // H16: never the same note sequence back-to-back (st.lastSeq, kept across rounds) or twice in one round (R.seen); spec + vectors:
  // phone_app_review/h16_eib_dedupe_spec.md, host/eib_dedupe_vectors.json (shared with eib_core.c)
  function pick(len){P.seed=(P.seed||0)+1;saveBook();const seed=(P.seed*7919+kid.length*104729+ptier)>>>0;
    const res=pickFresh({hand:tunes,len,seen:R?R.seen:[],lastSeq:st.lastSeq||null,seed,gen:sd=>gen(fam,ptier,len,sd)});
    const k=seqKey(res.tune.n);if(R)R.seen.push(k);st.lastSeq=k;lastId=res.tune.id;api.save&&api.save();return res.tune}
  function sing(notes,bpm,done,o){o=o||{};phase=o.phase||'echo';padBox.classList.add('listen');padBox.classList.remove('turn');const tk=TOK;
    whenLoaded(padSamples(fam,notes)).then(()=>{if(tk===TOK)singNow(notes,bpm,done,o)})}
  function singNow(notes,bpm,done,o){const k=msPerTick(bpm)*(o.slow?1.15:1);
    const row=o.row||ask;row.classList.toggle('many',notes.length>V.rhythm_shown_to);layoutRow(row,notes.length);row.innerHTML=notes.map(x=>noteHTML(fam,step(x),notes.length>V.rhythm_shown_to?TPB:x[2])).join('');const els=[...row.children];
    const e=echoEl();if(e)e.classList.add('eibsing');let t=350;const my=++singing;
    notes.forEach((x,i)=>{const s=step(x),d=Math.max(V.tempo.min_note_ms,x[2]*k);later(t,()=>{play(fam,s,{vol:o.soft?.8:1});if(W.PIXEL&&W.PIXEL.react&&!RM)W.PIXEL.react('sing');light(s,Math.min(420,d*.8));els.forEach(z=>z.classList.remove('lit'));if(els[i])els[i].classList.add('lit')});t+=d});
    later(t+250,()=>{if(my===singing){els.forEach(z=>z.classList.remove('lit'));const e2=echoEl();if(e2)e2.classList.remove('eibsing')}done&&done()})}
  function yourTurn(){phase='child';answer=[];ans.innerHTML='';ans.classList.remove('many');layoutRow(ans,asked.length);padBox.classList.remove('listen');padBox.classList.add('turn');if(ph<=0)say('eib_your_turn',1500);
    clearTimeout(waitT);waitT=later(DATA.timing.answer_wait_ms,idle)}
  function idle(){if(phase!=='child'||answer.length)return;idles++;
    if(idles===1){say('eib_again',2000);later(1300,()=>sing(curNotes,tune.bpm,yourTurn,{slow:true,soft:true}))}
    else{say('eib_rest',3000)}}   // after that the Echo just waits: no reminders; any tap is an answer
  function copyBack(a,bpm){const k=msPerTick(bpm);const ticks=a.map((x,i)=>i<a.length-1?Math.max(6,Math.min(24,Math.round((a[i+1].t-x.t)/k/6)*6)):TPB);return Song.fromSteps(bpm,a.map(x=>x.s),ticks)}
  function sparkle(size){spark.className='eibspark '+size;void spark.offsetWidth;spark.classList.add('go');setTimeout(()=>{spark.className='eibspark'},RM?500:900)}
  // ---- a tune: whole (<= 8 notes) or phrase by phrase (> 8)
  function finish(){clearTimeout(gapT);clearTimeout(waitT);if(phase!=='child'||!answer.length)return;phase='react';padBox.classList.remove('turn');
    const r=matchTune(asked,answer.map(a=>a.s));idles=0;st.last={tune:tune.id,r};
    if(tune.phrases)return phraseDone(r);
    if(retried){if(r==='same'){sparkle('big');say('eib_same');if(tune.ancient&&R.pendingAnc)R.pendingAnc.matched=true}later(r==='same'?2400:700,nextTune);return}   // the one more go after a close is just for fun
    n++;st.rounds++;tuneDone(r);
    if(r==='same'){sparkle('big');api.react&&api.react('happy');say('eib_same');later(2600,nextTune)}
    else if(r==='close'){sparkle('small');say('eib_close',1800);later(1400,()=>sing(tune.n,tune.bpm,()=>{retried=true;asked=norm(tune.n);yourTurn()},{slow:true,soft:true}))}
    else{api.react&&api.react('delighted');say('eib_new',1800);const cp=copyBack(answer,tune.bpm);cur.lastCopy=cp;later(1400,()=>sing(cp.n,cp.bpm,()=>later(900,nextTune),{row:ans}))}}
  function phraseDone(r){pres.push(r);const sl=slots.children[ph];if(sl)sl.classList.add('done');
    if(r==='new'){api.react&&api.react('delighted');say('eib_new',1800);const cp=copyBack(answer,tune.bpm);cur.lastCopy=cp;n++;st.rounds++;tuneDone('new');later(1400,()=>sing(cp.n,cp.bpm,()=>later(900,nextTune),{row:ans}));return}   // a new bit ends this tune (no step up)
    const go=()=>{if(ph+1<tune.phrases.length)later(300,()=>phrase(ph+1));else{const m=matchPhrased(pres);n++;st.rounds++;tuneDone(m);sparkle('big');api.react&&api.react('happy');say('eib_same');later(2600,nextTune)}};
    if(r==='close'){sparkle('small');say('eib_close',1800);later(1400,()=>sing(curNotes,tune.bpm,go,{slow:true,soft:true}))}   // the one slip a phrase: hear it again, then on
    else{sparkle('small');go()}}
  function phrase(i){ph=i;const [a,b]=tune.phrases[i],L=tune.labels;curNotes=tune.n.slice(a,b);asked=norm(curNotes);ans.innerHTML='';
    [...slots.children].forEach((z,j)=>z.classList.toggle('cur',j===i));
    const rep=L.indexOf(L[i])<i,beat=60000/tune.bpm*V.breath_beats;
    const goSing=()=>sing(curNotes,tune.bpm,yourTurn);
    if(i===0)return goSing();
    puff.classList.remove('go');void puff.offsetWidth;puff.classList.add('go');   // a 1-beat breath (and a breath puff) between phrases
    if(rep&&!st.saidBack){st.saidBack=1;api.save&&api.save();say('eib_comes_back',1800);later(Math.max(beat,1500),goSing)}else later(beat,goSing)}
  function tuneDone(r){api.onTune&&api.onTune(r);if(tune&&tune.ancient)R.pendingAnc={t:tune.ancient,matched:r!=='new',first:tune.first};
    if(r!=='new'){R.matches++;R.missRun=0;R.last=tune;beads.forEach((b,i)=>b.classList.toggle('on',i<R.matches))}
    else{R.perfect=false;R.missRun++;if(R.missRun>=V.eased_after_misses&&R.len>V.min_len){R.len--;R.eased=true;R.missRun=0;R.sayLittle=true}}}   // 2 misses in a row: one note shorter (this round only)
  // after an Ancient Echo: a match -> the Echo sings the whole hook again with the pads glowing; the first time -> it joins Ancient Echoes
  function ancEpilogue(a,next){padBox.querySelectorAll('.need').forEach(z=>z.classList.remove('need'));
    if(a.matched){if(P.ml&&P.ml.met&&P.ml.met[a.t.id])P.ml.met[a.t.id].m=1;saveBook()}
    const go=()=>{if(a.first){flourish();say('eib_ancient_collection',2400,{ancient:a.t});later(2600,next)}else next()};
    if(a.matched){root.classList.add('duet');padBox.classList.add('duet');later(400,()=>singEcho(a.t,()=>{root.classList.remove('duet');padBox.classList.remove('duet');go()}))}else go()}
  function ancTune(a){const t=a.t,c=a.c;let first=false;if(P.ml){first=sbHeard(P.ml,t,fam);saveBook()}api.onAncient&&api.onAncient({id:t.id,first});
    return Object.assign(sbTune(t,c),{first})}
  function nextTune(){if(R.pendingAnc){const a=R.pendingAnc;R.pendingAnc=null;return ancEpilogue(a,nextTune)}
    if(R.matches>=V.round)return roundEnd();if(R.tunes>=V.soft_stop_tunes)return softStop();
    R.tunes++;retried=false;ph=-1;pres=[];
    const A=R.anc&&R.anc[R.tunes-1];
    if(A){tune=ancTune(A);const k=seqKey(tune.n);R.seen.push(k);st.lastSeq=k;st.lastAnc=A.t.id;lastId=tune.id;api.save&&api.save();ans.innerHTML='';slots.innerHTML=tune.phrases?tune.labels.map(()=>'<i></i>').join(''):'';
      const need=new Set(tune.n.map(x=>step(x)));padBox.querySelectorAll('.eibpad').forEach(z=>z.classList.toggle('need',need.has(+z.dataset.pad)));
      flourish();say('eib_ancient_echo',2200,{ancient:A.t});
      return later(1500,()=>singEcho(A.t,()=>{say('eib_my_turn',1400);if(tune.phrases)return later(900,()=>phrase(0));curNotes=tune.n;asked=norm(tune.n);later(700,()=>sing(tune.n,tune.bpm,yourTurn))}))}
    const t=pick(R.len);tune=Object.assign({},t,{bpm:bpmAt(P.tempoStep,t.bpm)});ans.innerHTML='';
    slots.innerHTML=tune.phrases?tune.labels.map((l,i)=>`<i class="${tune.labels.indexOf(l)<i?'rep':''}"></i>`).join(''):'';
    let k='eib_my_turn';if(R.tunes===1&&R.intro)k=R.intro;else if(R.sayLittle){R.sayLittle=false;k='eib_little'}
    if(tune.phrases&&!st.saidBreath){st.saidBreath=1;api.save&&api.save();k='eib_breath'}
    say(k,1600);if(tune.phrases)return later(1500,()=>phrase(0));
    curNotes=tune.n;asked=norm(tune.n);later(900,()=>sing(tune.n,tune.bpm,yourTurn))}
  // ---- round end: the duet (last matched tune, pads + Echo lit), "Five! We sang five!", progress, stickers, then Home
  function roundEnd(){phase='end';const t=R.last,was=P.len;padBox.classList.add('duet');root.classList.add('duet');
    sing(t.n,t.bpm,()=>{phase='end';padBox.classList.remove('duet');root.classList.remove('duet');api.react&&api.react('delighted');say('eib_five',2400);
      const succ=R.tunes?R.matches/R.tunes:0;Progress.finish(P,{perfect:R.perfect&&!R.eased,played:R.played,little:R.little,success:succ},ML?ML.rampBand(lvl):band);
      if(ML&&P.ml)ML.eibRound(P.ml,P.len,succ);
      const got=stickersFor(t.n.length,P.speedRounds||0,api.hasSticker||(()=>true));saveBook();
      got.forEach(title=>api.onSticker&&api.onSticker(title,{fam,song:Song.make(t.bpm,t.n)}));
      const lines=[];if(got.length)lines.push('eib_sticker');if(was<V.max_len&&P.len>=V.max_len)lines.push('eib_sixteen');
      api.onRound&&api.onRound({finished:true,perfect:R.perfect,len:R.played,grew:P.grew||0,stickers:got});
      let w=2600;lines.forEach(k=>{later(w,()=>say(k,2400));w+=2600});later(w,()=>{phase='done';api.onDone&&api.onDone(true)})},{phase:'end'})}
  function softStop(){phase='end';say('eib_rest_ears',2400);Progress.finish(P,{soft:true},band);if(ML&&P.ml)ML.report(P.ml,'eib',R.tunes?R.matches/R.tunes:0);saveBook();
    api.onRound&&api.onRound({finished:true,soft:true});later(2600,()=>{phase='done';api.onDone&&api.onDone(true)})}   // counts as finished, takes one speed step back
  function planAnc(len,chosen){const out={};if(!SB)return out;const seed=(Math.imul((P.seed||0)+1,2654435761)^Math.imul((P.roundsDone||0)+1,40503)^(kid.length*97+lvl))>>>0;   // P.seed is NOT advanced: the tune picker's seeds (and the firmware vectors) stay as they were
    let t=null;if(chosen){const c=sbById(chosen);t=c&&c.fam===fam&&sbChild(c,len,lvl,LIM)?c:null}
    if(!t&&!chosen)t=sbPick({fam,len,lv:lvl,lim:LIM,met:P.ml&&P.ml.met,last:st.lastAnc,seed});
    if(!t)return out;const c=sbChild(t,len,lvl,LIM);sbSlots(seed^0x5bd1e995,V.round,chosen?2:1).forEach(i=>{out[i]={t,c}});needPads([c]);return out}
  function newRound(len,little,chosen){tiles.hidden=true;tiles.innerHTML='';if(pads.length!==basePads.length)setPads(basePads.slice());
    R={len,played:len,little,seen:[],matches:0,tunes:0,missRun:0,perfect:!little,eased:false,last:null,sayLittle:false,anc:null,pendingAnc:null,
      intro:P.tempoStep>0?'eib_zippy':little?'eib_little':P.grew>=2?'eib_more2':P.grew===1?'eib_more1':null};
    beads.forEach(b=>b.classList.remove('on'));
    // the new-note intro only counts the child's own pads (an Ancient Echo's extra pads are just for that tune)
    const own=basePads;R.anc=planAnc(len,chosen);
    // opening: hello the first time; a new note (tier unlock) is played once on its own before the first tune
    const fresh=own.filter(s=>!st.heard.includes(s));
    if(!st.heard.length){st.heard=own.slice();say('eib_hello',2600);later(2200,nextTune)}
    else if(fresh.length){st.heard=st.heard.concat(fresh);say('eib_new_note',2200);let t=900;fresh.forEach(s=>{later(t,()=>{play(fam,s);light(s,500)});t+=700});later(t+700,nextTune)}
    else nextTune();api.save&&api.save()}
  // start tiles (from the Play list, once a round has been sung): big "Same as last time" (default) + small "A little one" (-2, this round only)
  function showTiles(){const lit=Math.max(V.min_len,P.len-V.little_minus);phase='tiles';
    tiles.innerHTML=`<button class="eibtile big" id="eibsame" aria-label="Same as last time">${dotsHTML(P.len)}<span>Same as last time</span></button>`+
      (lit<P.len?`<button class="eibtile small" id="eiblittle" aria-label="A little one">${dotsHTML(lit)}<span>A little one</span></button>`:'');
    // Ancient Echoes tile: only once this family has a heard tune; up to 4 of the most recently heard icons, filling from the left (no empty wells)
    const heard=sbList(P.ml,fam).sort((a,b)=>b.l-a.l).slice(0,4).map(e=>sbById(e.id)).filter(t=>t&&sbChild(t,P.len,lvl,LIM));
    if(heard.length)tiles.insertAdjacentHTML('afterbegin',`<div class="eibanc" role="group" aria-label="${api.ancTitle||'Ancient Echoes'}">${heard.map((t,i)=>`<button class="eibanci" data-anc="${t.id}" style="--k:${i};background-image:url(${t.icon})" aria-label="${t.title}"></button>`).join('')}</div>`);
    tiles.hidden=false;tiles.querySelector('#eibsame').onclick=()=>newRound(P.len,false);const b=tiles.querySelector('#eiblittle');if(b)b.onclick=()=>newRound(lit,true);
    tiles.querySelectorAll('[data-anc]').forEach(z=>z.onclick=()=>{z.classList.add('on');later(180,()=>newRound(P.len,false,z.dataset.anc))})}
  const input=PadInput(padBox,{down(s){play(fam,s);const p=padEl(s);if(p)p.classList.add('on');
      if(phase!=='child')return;answer.push({s,t:Date.now()});layoutRow(ans,Math.max(asked.length,answer.length));ans.insertAdjacentHTML('beforeend',noteHTML(fam,s,TPB,'lit'));const kids=ans.children;if(kids.length>1)kids[kids.length-2].classList.remove('lit');
      clearTimeout(waitT);clearTimeout(gapT);
      if(answer.length>=asked.length+DATA.timing.extra_notes)return finish();
      gapT=later(eq(asked,answer.map(a=>a.s))?900:DATA.timing.answer_gap_ms,finish)},
    up(s){const p=padEl(s);if(p)setTimeout(()=>p.classList.remove('on'),120)}});
  cur={root,input,api,get pads(){return pads},get phase(){return phase},get asked(){return asked},get tune(){return tune},get round(){return R},get progress(){return P},get phraseIdx(){return ph},finish,lastCopy:null};
  if(api.mode==='invite'||!P.roundsDone)newRound(P.len,false);else showTiles();
  api.save&&api.save();return cur}
// grown-ups + age band hooks (game.js) and the Memory Book sticker tune
EB.progressFor=(kid,band)=>{const b=Songbook.load(),p=Progress.get(b,kid,band);Songbook.save(b);return p};
EB.setBand=(kid,band)=>{const b=Songbook.load();b.progress=b.progress||{};Progress.setBand(Progress.get(b,kid,band),band);Songbook.save(b);return b.progress[kid]};   // grown-ups age row only
EB.bandOf=kid=>{const p=(Songbook.load().progress||{})[kid];return p&&p.band||null};
EB.resetProgress=(kid,band)=>{const b=Songbook.load(),p=Progress.reset(b,kid,band);Songbook.save(b);return p};
// the child's music level (game.js, warmup.js): read, or change and save in one go. fn(ml, progress) may return a replacement record.
EB.mlFor=(kid,band)=>{const b=Songbook.load(),p=Progress.get(b,kid,band);Songbook.save(b);return p.ml};
EB.withMl=(kid,fn,band)=>{const b=Songbook.load(),p=Progress.get(b,kid,band);const r=fn(p.ml,p);if(r&&typeof r==='object'&&r.v===1)p.ml=r;Songbook.save(b);return p.ml};
// the warm-up result also sets the first Echo It Back length while the child has not sung a round yet
EB.applyWarmup=(kid,r,at,o)=>EB.withMl(kid,(m,p)=>{const n=ML.applyWarmup(m,r,at,o);if(!p.roundsDone&&!(o&&o.keep))p.len=ML.eibStartLen(n.level);return n});
// an existing save without a warm-up: seed the level from its EIB length (or the band's start length when it never played)
EB.seedMl=(kid,band)=>{const b=Songbook.load();b.progress=b.progress||{};let p=b.progress[kid];
  if(!p){p=b.progress[kid]={band,len:startLen(band||'7-8'),roundsDone:0,tempoStep:0,speedRounds:0,seed:0}}
  if(ML&&(!ML.valid(p.ml)||(p.ml.src==='prior'&&!p.ml.warm)))p.ml=ML.seed(p.len,band||p.band);Songbook.save(b);return p.ml};
EB.playNote=(fam,s,o)=>play(fam,s,o);
// Ancient Echoes for game.js (Memory Book page): the heard tunes (order heard), the shipped tunes of a family, and the Echo version
EB.ancientHeard=(kid,fam)=>{const b=Songbook.load(),p=(b.progress||{})[kid];return sbList(p&&p.ml,fam).map(e=>Object.assign(sbById(e.id),{heard:e}))};
EB.ancientTunes=fam=>sbTunes(fam);
EB.playEcho=(id,cut)=>{const t=sbById(id);if(!t)return 0;const k=msPerTick(sbBpm(t)),N=cut||sbEchoNotes(t.echo);   // cut: the Catch hum's phrase cut (musicfx cutAtPhrase)
  let ms=0;const at=[];N.forEach(x=>{at.push(ms);ms+=Math.max(V2().tempo.min_note_ms,x[2]*k)});
  whenLoaded(echoSamples(t.fam,N)).then(()=>N.forEach((x,i)=>{if(x[0]){const m=midiOfNote(t.fam,x);setTimeout(()=>play(t.fam,0,{midi:m,vol:.8}),at[i])}}));return ms};   // Nov 3: same tempo (sbBpm) + samples first, like the intro
EB.playSong=(fam,song)=>{if(!Song.valid(song))return 0;const k=msPerTick(song.bpm);let t=0;song.n.forEach(x=>{if(x[0]){const s=step(x);setTimeout(()=>play(fam,s,{vol:.8}),t)}t+=Math.max(DATA?V2().tempo.min_note_ms:120,x[2]*k)});return t};
function stop(){TOK++;if(cur){cur.input.off();if(cur.root.parentNode)cur.root.remove();cur=null}voices.splice(0).forEach(v=>{try{v.stop()}catch(e){}})}
// ---------------------------------------------------------------- the Echo-started invite: a note chip by the Echo, gone after 10 s, never repeated
function invite(host,onYes,o){if(!host)return null;o=o||{};const b=document.createElement('button');b.className='eibinv'+(o.lowfx?' rm':'');b.setAttribute('aria-label','Sing with me');
  host.appendChild(b);const ms=(DATA&&DATA.timing.invite_fade_ms)||10000;let done=false;
  const t=setTimeout(()=>{if(done)return;done=true;b.classList.add('fade');setTimeout(()=>b.remove(),o.lowfx?0:600)},ms);
  b.onclick=e=>{e.stopPropagation();if(done)return;done=true;clearTimeout(t);b.remove();onYes&&onYes()};return b}
Object.assign(EB,{start,stop,invite,noteHTML,matchTune,padsFor,tunesFor,nameOf,fileOf,colOf,colOf9,midiOf,step,fromStep,Song,Songbook,PadInput,Progress,gen,
  sbTunes,sbById,sbChild,sbPick,sbSlots,sbEchoNotes,sbHeard,sbList,sbBpm,sbTune,midiOfNote,fileOfMidi,
  _pure:{rowCols,padsLayout,matchTune,contour,norm,step,fromStep,spell,padsFor,tunesFor,Song,startLen,rampLen,phrasesFor,gen,bpmAt,noteMs,matchPhrased,Progress,stickersFor,rng,seqKey,pickFresh,simulateRounds,STABLE,CONTOURS,GEN_TRIES,FALLBACK_TRIES}});
Object.defineProperties(EB,{cur:{get:()=>cur},data:{get:()=>DATA},inst:{get:()=>INST}});   // live getters (Object.assign would copy today's value)
W.EchoBack=EB;if(typeof module!=='undefined')module.exports=EB;
})(typeof window!=='undefined'?window:globalThis);
