// MusicFX (Batch D, Oct 20): the music-first tweaks to existing pieces (audit_v1 Part A, approved by Daniel). Load after sound.js, before game.js.
// Self-wiring (no game.js hook): title glow + floating notes (main screen), home bond-glow beat pulse, cat meadow bell sway, postcard tune stamps
// and Memory Book sounds (event delegation). Hooked from game.js: Snack Catch tune, Cushion Tower beat sparkle, Den Dig / Yarn Tumble ladder,
// Cozy Pairs chimes, Meadow Dash ground pulse, petting hum, the real animal's home sound, the farewell play-off.
// Reduced motion = prefers-reduced-motion OR the Calm effects setting (S.lowfx): static glows, no floating notes, no sway, no pulse; sounds stay.
// Every entry point is a no-op if its data or art is missing, so a partial merge never throws.
(function(W){
const D=W.document,MFX={},RM=()=>{try{const S=W.__echo&&W.__echo.state;if(S&&S.lowfx)return true}catch(e){}return !!(W.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)};
let TUNES=null,TEMPO=null;
let READY=Promise.resolve();if(W.fetch&&D){READY=fetch('music/tunes.json').then(r=>r.json()).then(j=>{TUNES=j}).catch(()=>{});fetch('music/tempo.json').then(r=>r.json()).then(j=>{TEMPO=j}).catch(()=>{})}
const fam=f=>TUNES&&TUNES.families&&TUNES.families[f]||null;
const nfile=(f,n)=>'notes/'+f+'_'+String(n).replace('#','s');
// ---------------- pure helpers (unit-tested in node: tools/test-musicfx.js)
function beatAt(t,bpm,bpb,beats){const spb=60/bpm,b=Math.max(0,t)/spb,i=Math.floor(b);return {bpm,bpb,spb,beat:beats?i%beats:i,bar:Math.floor((beats?i%beats:i)/bpb),phase:b-i}}
function nearBeat(t,bpm,win){const spb=60/bpm,ph=(t/spb)%1,d=Math.min(ph,1-ph)*spb;return d<=Math.max(win||.09,.12*spb)}   // on the beat: within +-max(90 ms, 12 % of a beat)
function catchState(){return {i:0,songs:0}}
function catchStep(st,len){const i=st.i;st.i=(st.i+1)%len;const done=st.i===0;if(done)st.songs++;return {i,done,songs:st.songs}}   // a miss never calls this: the tune just waits
function ladderStep(st,len,n){const out=[];let top=false;for(let k=0;k<Math.max(1,n|0);k++){out.push(st.i);st.i++;if(st.i>=len){st.i=0;top=true;break}}return {steps:out,top}}
function hummRate(speed){return Math.max(.89,Math.min(1.12,.89+(.23*Math.min(1,speed/900))))}   // px/s -> playbackRate, about -2..+2 semitones, no target pitch
// ---------------- Music School step 3 (pure): songbook hooks for Catch / Dig floor / the growing song, the Stack ladder, the beat gates
// A songbook tune is a tunes.json "songbook" record (Song v2 echo = the real hook, child = Song v1 phrases). Nothing here makes up notes:
// with no shipped tunes every helper returns null/[] and the game keeps today's sound.
const TPB=12,HOOK_MS=8000;
function hookNotes(t,maxMs){if(!t||!t.echo||!Array.isArray(t.echo.n))return [];const k=60000/(t.echo.bpm||96)/TPB;let ms=0,started=false;const out=[];
  for(const x of t.echo.n){const d=x[2]*k;if(started&&ms+d>(maxMs||HOOK_MS))break;if(x[0])out.push(x);started=true;ms+=d}return out}   // the 8 s hook (same cut as EIB), rests dropped
function openingNotes(t,maxMs){return hookNotes(t,maxMs||2600)}   // Dig floor: the first ~2.6 s of the hook
function catchOrder(tunes,heard,level){const L=(tunes||[]).slice(),H=(heard||[]).map(e=>e.id||e),lv=level||1;   // met tunes first (most recently met first), then the ones at the child's music level
  const met=H.map(id=>L.find(t=>t.id===id)).filter(Boolean),rest=L.filter(t=>H.indexOf(t.id)<0&&(t.min_ml||1)<=lv);return met.concat(rest)}
function growChoice(tunes,heard,pick){const L=tunes||[];if(!L.length)return null;if(pick){const p=L.find(t=>t.id===pick);if(p)return p}   // Cole's pick, else the most-met tune, else the first
  let best=null,bh=0;(heard||[]).forEach(e=>{const t=L.find(x=>x.id===e.id),h=(e.heard&&e.heard.h)||e.h||0;if(t&&h>bh){best=t;bh=h}});return best||L[0]}
function growPlan(t,stage,top){top=top||5;if(!t||!(stage>=2))return null;if(stage>=top)return {full:true,n:hookNotes(t),bpm:t.echo.bpm};   // stage 2 = 1 phrase ... last stage = the whole hook
  const ph=(t.child||[]).slice(0,stage-1);if(!ph.length)return null;const n=[];ph.forEach((p,i)=>{if(i)n.push([0,0,6]);p.n.forEach(x=>n.push(x))});return {full:false,phrases:ph.length,n,bpm:(ph[0].bpm||t.echo.bpm)}}
function stackStep(k,len){return {i:((k%len)+len)%len,top:k>0&&k%len===0}}   // layer k plays ladder note k (wraps to the bottom after the top)
function noteCol(n){return n.startsWith('f#')?7:n.startsWith('bb')?8:'cdefgab'.indexOf(n[0])}   // the 9-column stack_note_sparkle.png order (echoback.js COLS9): c d e f g a b f# bb
function beatOn(b,tw,holdS){if(!b)return false;if(tw&&(b.beat%b.bpb)!==0)return false;return b.phase*b.spb<(holdS||.166)}   // day: every beat; twilight: beat 1 of each bar; 2 ticks
function swayFrame(b,tw,holdS){if(!beatOn(b,tw,holdS))return 0;const n=tw?Math.floor(b.beat/b.bpb):b.beat;return n%2?2:1}   // f1 then f2 on alternate beats (twilight: alternate bars)
function seqMs(n,bpm,minMs){const k=60000/(bpm||96)/TPB;return n.reduce((a,x)=>a+Math.max(minMs||0,x[2]*k),0)}
MFX._pure={beatAt,nearBeat,catchState,catchStep,ladderStep,hummRate,hookNotes,openingNotes,catchOrder,growChoice,growPlan,stackStep,noteCol,beatOn,swayFrame,seqMs};
if(typeof module!=='undefined'){module.exports=MFX;return}
// ---------------- sound
function note(f,n,o){const M=W.Music;if(!M||!M.oneShot)return null;return M.oneShot(nfile(f,n),Object.assign({vol:.5,duck:.75},o||{}))}
MFX.note=note;MFX.ok=f=>!!fam(f);   // tunes.json loaded and this family has data
MFX.beat=function(){const M=W.Music,c=M&&M.clock&&M.clock();if(!c||!TEMPO||!TEMPO[c.name])return null;const m=TEMPO[c.name];return Object.assign(beatAt(c.t,m.bpm,m.beatsPerBar,m.beats),{name:c.name,t:c.t})};
MFX.onBeatNow=function(){const M=W.Music,c=M&&M.clock&&M.clock();if(!c||!TEMPO||!TEMPO[c.name])return false;return nearBeat(c.t,TEMPO[c.name].bpm)};
function freeBeat(bpm,bpb){const t=performance.now()/1000;return Object.assign(beatAt(t,bpm,bpb,0),{free:true})}
// ---------------- A4 games
// Step 3: the Echo's songbook hooks. MFX.ctx (set by game.js) = {heard(fam) -> [{id,heard:{h,...}}], level() -> music level}.
MFX.ctx=MFX.ctx||{};const EBW=()=>W.EchoBack&&W.EchoBack.playNote&&W.EchoBack.midiOfNote?W.EchoBack:null;
function sbList(f){const E=EBW();try{return E&&E.ancientTunes?E.ancientTunes(f)||[]:[]}catch(e){return []}}
function ctxHeard(f){try{return (MFX.ctx.heard&&MFX.ctx.heard(f))||[]}catch(e){return []}}
function ctxLevel(){try{return (MFX.ctx.level&&MFX.ctx.level())||1}catch(e){return 1}}
function sbOrder(f){return catchOrder(sbList(f),ctxHeard(f),ctxLevel())}
function playSeq(f,n,bpm,o){const E=EBW();if(!E||!n||!n.length)return 0;o=o||{};const k=60000/(bpm||96)/TPB,mn=o.minMs||110;let t=o.delay||0;   // through EchoBack's sampler (3-voice cap, half-step samples)
  n.forEach(x=>{const d=Math.max(mn,x[2]*k);if(x[0]){const m=E.midiOfNote(f,x);setTimeout(()=>{try{E.playNote(f,0,{midi:m,vol:o.vol||.8})}catch(e){}},t)}t+=d});return t}
MFX.playSeq=playSeq;
let CT=catchState(),CS=null;   // CS: {order, k, tune, n, hum} when the family has shipped songbook tunes; null = today's family tune
MFX.catchStart=f=>{CT=catchState();CS=null;const L=f?sbOrder(f):[];if(L.length){const t=L[0];CS={f,order:L,k:0,tune:t,n:hookNotes(t),hum:0}}return CS&&CS.tune.id};
MFX.catchHit=function(f){
  if(CS&&CS.f===f&&CS.n.length){if(performance.now()<CS.hum)return null;   // the Echo is humming the hook: the catch keeps today's sound
    const r=catchStep(CT,CS.n.length),x=CS.n[r.i],E=EBW();if(E)E.playNote(f,0,{midi:E.midiOfNote(f,x),vol:.65});r.tune=CS.tune.id;
    if(r.done){const t=CS.tune;setTimeout(()=>{const ms=E&&E.playEcho?E.playEcho(t.id):0;CS.hum=performance.now()+ms},380);CS.hum=performance.now()+400;r.hum=true;   // a whole hook caught: the Echo hums it, then the next tune
      CS.k=(CS.k+1)%CS.order.length;CS.tune=CS.order[CS.k];CS.n=hookNotes(CS.tune);CT=Object.assign(catchState(),{songs:r.songs})}
    return r}
  const F=fam(f);if(!F)return null;const c=F.catch,r=catchStep(CT,c.notes.length);note(f,c.notes[r.i],{vol:.5});return r};   // {i,done,songs}
MFX.catchTune=()=>CS&&{id:CS.tune.id,i:CT.i,len:CS.n.length,humming:performance.now()<CS.hum};
let LD={i:0};MFX.digStart=()=>{LD={i:0}};
MFX.digClear=function(f,rows){const F=fam(f);if(!F)return null;const L=F.dig_ladder,r=ladderStep(LD,L.length,rows||1);
  r.steps.forEach((s,k)=>setTimeout(()=>note(f,L[s],{vol:.5}),k*95));if(r.top)setTimeout(()=>note(f,L[L.length-1],{vol:.4,rate:2}),r.steps.length*95+60);return r};   // top: an octave sparkle
let DF=0;MFX.digFloor=function(f,delay){const L=sbOrder(f);if(!L.length)return null;const t=L[DF++%L.length],n=openingNotes(t);if(!n.length)return null;   // a floor (3 rows): the opening of a family tune
  return {id:t.id,ms:playSeq(f,n,t.echo.bpm,{delay:delay||0,vol:.7})}};
// Stack (step 3): each layer = the next note up the family ladder; a trimmed layer slides one ladder step down; the end card plays the tower back
const SV=[];function capNote(f,n,o){const p=note(f,n,o);if(p&&p.then)p.then(src=>{if(!src)return;SV.push(src);while(SV.length>3){const v=SV.shift();try{v.stop()}catch(e){}}});return p}   // <= 3 voices
MFX.stackLadder=f=>{const F=fam(f);return F&&F.dig_ladder||null};
MFX.stackNote=function(f,k){const L=MFX.stackLadder(f);if(!L)return null;const r=stackStep(k,L.length),n=L[r.i];capNote(f,n,{vol:.45});return {i:r.i,note:n,col:noteCol(n),top:r.top}};
MFX.stackSlide=function(f,k){const L=MFX.stackLadder(f);if(!L)return null;const r=stackStep(k,L.length),lo=L[Math.max(0,r.i-1)];if(r.i===0)return null;setTimeout(()=>capNote(f,lo,{vol:.3}),90);return {note:lo}};   // real notes only: the step below, softly
MFX.stackPlay=function(f,h,gap){const L=MFX.stackLadder(f);if(!L||!(h>0))return 0;const n=Math.min(h,24),g=gap||150;for(let k=0;k<n;k++)setTimeout(()=>capNote(f,L[stackStep(k,L.length).i],{vol:.42}),k*g);return n*g};
// Our song grew! (step 3): after the sting, the Echo plays its growing song: stage 2 = 1 phrase ... the last stage = the whole hook
MFX.growTune=f=>{const L=sbList(f);const B=W.EchoBack&&W.EchoBack.songbook&&W.EchoBack.songbook();return growChoice(L,ctxHeard(f),B&&B.grow&&B.grow[f])};
MFX.growSong=function(f,stage,o){const t=MFX.growTune(f),p=growPlan(t,stage,(o&&o.top)||5);if(!p||!p.n.length)return null;return {id:t.id,full:p.full,phrases:p.phrases||0,ms:playSeq(f,p.n,p.bpm,{delay:(o&&o.delay)||0,vol:.8})}};
MFX.pairsFlip=function(f,item,second){const F=fam(f);const d=F&&F.pairs[item];if(!d)return null;return note(f,d[second?1:0],{vol:.4})};
// LIST2 #5: a card's own sound (both cards of a pair sound the same): a tune = its notes one after another, a pitch = one note
MFX.pairsData=f=>{const F=fam(f);return F&&F.pairs||null};
MFX.pairsSound=function(f,snd,o){if(!fam(f)||!snd||!snd.length)return null;o=o||{};const gap=o.gap||170;snd.forEach((n,k)=>setTimeout(()=>note(f,n,{vol:o.vol||.42}),k*gap));return snd.length*gap};
MFX.pairsMatch=function(f,item){const F=fam(f);const d=F&&F.pairs[item];if(!d)return null;note(f,d[0],{vol:.42});note(f,d[1],{vol:.42});return true};   // 2 voices: the chime rings together
// Cushion Tower beat sparkle: px/stack/beat_sparkle.png, 5 frames of 24x24, 2 ticks each; reduced motion: frame 2 held, no growth
const SPK=new Image();if(D)SPK.src='px/stack/beat_sparkle.png';
MFX.drawSparkle=function(cx,x,y,age,scale){if(!SPK.complete||!SPK.naturalWidth)return age<10;const k=scale||1,rm=RM(),f=rm?2:Math.floor(age/2);if(f>4||(rm&&age>9))return false;
  cx.drawImage(SPK,f*24,0,24,24,Math.round(x-12*k),Math.round(y-12*k),24*k,24*k);return true};
// Step 3 Cushion Tower note sparkle (Pixal, px/beat/): 9 columns (COLS order) x 3 frames of 16x16, ~1 tick each; reduced motion: the static frame for 400 ms
const NS=new Image(),NSS=new Image();if(D){NS.src='px/beat/stack_note_sparkle.png';NSS.src='px/beat/stack_note_sparkle_static.png'}
MFX.drawNoteSparkle=function(cx,col,x,y,ms){if(col<0)return false;const rm=RM(),im=rm?NSS:NS;if(!im.complete||!im.naturalWidth)return ms<400;
  if(rm){if(ms>=400)return false;cx.drawImage(im,col*16,0,16,16,Math.round(x-8),Math.round(y-8),16,16);return true}
  const f=Math.floor(ms/83);if(f>2)return false;cx.drawImage(im,col*16,f*16,16,16,Math.round(x-8),Math.round(y-8),16,16);return true};
// Meadow Dash: a gold dash in the foreground grass flashes on each beat (step 3: px/beat/run_beat_mark.png, 3 frames of 28x6, drawn AFTER the obstacles at 84,474). Off in reduced motion.
const BP=new Image();if(D)BP.src='px/beat/run_beat_mark.png';
MFX.runPulse=false;   // Meadow Dash beat mark: the one switch (false = off everywhere). Nov 3 (LIST #9): OFF. Its gold 28x6 dash flashes
// ~2x a second at (84,474), right at the Echo's front foot (sprite x 16-64, aura to 77, feet 470): that was the "blinking text cursor
// on the Echo". No DOM caret exists in any game (no input/contenteditable/focusable text, user-select:none everywhere: phone_nov3_test caret).
// Obstacles stay beat-locked (beatGrid); a beat cue that can't read as a caret belongs in the music plan (LIST #5).
MFX.drawRunPulse=function(cx,x,y,scale){if(!MFX.runPulse||RM()||!BP.complete||!BP.naturalWidth)return;const b=MFX.beat();if(!b)return;const f=b.phase<.15?0:b.phase<.3?1:b.phase<.45?2:-1;if(f<0)return;const k=scale||1;
  cx.drawImage(BP,f*28,0,28,6,Math.round(x-14*k),Math.round(y-3*k),28*k,6*k)};
// Step 3 beat-lock: the playing loop's beat grid in game time (beat k at k*spb - off); null when no loop plays (= today's spawns)
MFX.beatGrid=function(gt){const b=MFX.beat();if(!b)return null;const off=((b.t-(gt||0))%b.spb+b.spb)%b.spb;return {spb:b.spb,off,bpm:b.bpm}};
// ---------------- A7 petting hum: one soft hum per ~1.1 s while stroking; pitch follows speed, no target
let hum={t:0,x:0,y:0,last:0,v:0};
MFX.petMove=function(ev,f){const now=performance.now();if(hum.t){const dt=Math.max(1,now-hum.t)/1000,d=Math.hypot(ev.clientX-hum.x,ev.clientY-hum.y);hum.v=hum.v*.7+.3*(d/dt)}
  hum.t=now;hum.x=ev.clientX;hum.y=ev.clientY;if(now-hum.last<1100)return;hum.last=now;const M=W.Music;if(M&&M.oneShot)M.oneShot('pet_hum_'+f,{vol:.35,rate:hummRate(hum.v),duck:.85})};
// ---------------- A5 the real animal's home sound (invite + first hello of the session)
let homeSaid=false;MFX.homeSound=function(animal,o){if(!TUNES){READY.then(()=>{if(TUNES)MFX.homeSound(animal,o)});return}if(!animal||!(TUNES.home_sounds||[]).includes(animal))return;   // home() can run before tunes.json lands
 if(o&&o.once){if(homeSaid)return;homeSaid=true}const M=W.Music;if(!M||!M.oneShot)return;
  const play=()=>M.oneShot('home_'+animal,{vol:.55,duck:.4});if(play()===null&&o&&o.once&&D){const t0=Date.now();   // audio not unlocked yet (a fresh app open): the hello cue waits for the first tap, up to 20 s
    D.addEventListener('pointerdown',()=>setTimeout(()=>{if(Date.now()-t0<20000)play()},120),{capture:true,once:true,passive:true})}};
// ---------------- A9 farewell play-off: one tap = one note = one step; untouched, each note plays by itself after 1.6 s
MFX.playoff=function(o){return new Promise(res=>{const F=fam(o.fam);if(!F)return res(false);const P=F.playoff,el=o.tapEl||D.body;let i=0,t=null,done=false;
  const pop=()=>{if(!o.noteEl)return;const n=P.notes[i],c='cdefgab'.indexOf(n[0]),col=n==='c5'?7:n.startsWith('f#')?8:n.startsWith('bb')?9:c,e=D.createElement('i');e.className='mfx-pnote'+(RM()?' calm':'');
    e.style.backgroundPosition=`${-12*col}px 0`;const r=o.noteEl.getBoundingClientRect(),R=(o.tapEl||D.body).getBoundingClientRect(),z=(o.zoom||1);
    e.style.left=Math.round((r.left-R.left)/z+r.width/z/2-6)+'px';e.style.top=Math.round((r.top-R.top)/z-10)+'px';(o.tapEl||D.body).appendChild(e);setTimeout(()=>e.remove(),900)};
  const next=()=>{if(done)return;clearTimeout(t);note(o.fam,P.notes[i],{vol:.55});pop();try{o.onNote&&o.onNote(i)}catch(e){}i++;
    if(i>=P.notes.length){done=true;el.removeEventListener('pointerdown',next);setTimeout(()=>res(true),Math.round((P.beats[P.beats.length-1]||1)*500));return}
    t=setTimeout(next,(P.autoplay_after_s||1.6)*1000)};
  el.addEventListener('pointerdown',next);t=setTimeout(next,(P.autoplay_after_s||1.6)*1000)})};
// ---------------- A10 postcard tune stamps (+ A8 Memory Book sounds): event delegation, works on every screen that shows them
MFX.stampHTML=function(f,scene){const F=fam(f);if(!F||!F.postcards[scene])return '';return `<i class="pctune mfxsnd" role="button" aria-label="Play the postcard tune" data-tune="${f}:${scene}" style="background-image:url(px/pc_tune/${f}_${scene}.png)"></i>`};
MFX.sing=function(f){const F=fam(f),T=F&&F.catch;if(!T)return 0;let t=0;const spb=60/(T.bpm||100);T.notes.forEach((n,k)=>{setTimeout(()=>note(f,n,{vol:.5}),t*1000);t+=T.beats[k]*spb});return t};   // E5 'Can you sing me your song?': the family tune
MFX.playTune=function(f,scene,el){const F=fam(f),T=F&&F.postcards[scene];if(!T)return;let t=0;const spb=60/(T.bpm||96);
  T.notes.forEach((n,k)=>{setTimeout(()=>note(f,n,{vol:.5}),t*1000);t+=T.beats[k]*spb*.9});if(el&&!RM()){el.classList.add('playing');setTimeout(()=>el.classList.remove('playing'),t*1000)}};
if(D)D.addEventListener('click',ev=>{const s=ev.target.closest&&ev.target.closest('[data-tune],[data-snd]');if(!s)return;
  if(s.dataset.tune){const [f,sc]=s.dataset.tune.split(':');MFX.playTune(f,sc,s);ev.stopPropagation();return}
  const v=s.dataset.snd;if(v&&W.Sound){if(v.startsWith('tune:')){const [_,f,sc]=v.split(':');MFX.playTune(f,sc,s)}else W.Sound.play(v,{vol:.6,gap:300})}},true);
// ---------------- self-wired visuals: one rAF loop
const TN=new Image(),G=[0,1,2,3].map(i=>{const m=new Image();if(D)m.src=`px/title/logo_glow5_${i}.png`;return m});if(D)TN.src='px/title/title_notes.png';
let title=null;   // {glow, cv, notes:[], last}
function titleTick(){const g=D.querySelector('.scene.ttl .oblogo-glow');if(!g){title=null;return}
  if(!title||title.glow!==g){title={glow:g,cv:null,notes:[],last:-1,seed:7};g.classList.add('g5');
    if(!RM()){const cv=D.createElement('canvas');cv.width=180;cv.height=120;cv.className='mfx-tnotes';cv.setAttribute('aria-hidden','true');g.parentNode.insertBefore(cv,g.nextSibling);title.cv=cv}}
  const rm=RM();g.classList.toggle('calm',rm);if(rm){g.dataset.f=0;if(title.cv){title.cv.remove();title.cv=null}return}
  const b=MFX.beat()||freeBeat(72,3);const alt=b.bar%2,on=b.phase<.34;g.dataset.f=(alt?2:0)+(on?1:0);   // 0 rest, 1 beat, 2 rest alt sparkles, 3 beat alt
  const cv=title.cv;if(!cv)return;const cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;cx.clearRect(0,0,180,120);
  if(b.beat!==title.last){title.last=b.beat;if(title.notes.length<6){const s=title.seed=(title.seed*16807)%2147483647,side=s%3,x=side===0?8+s%20:side===1?150+s%22:30+s%120,y=side===2?14:30+s%30;
      title.notes.push({x,y,t0:performance.now(),g:[0,1,3][s%3],tint:(title.last%4),ph:s%6})}}
  const now=performance.now(),life=(b.spb||.83)*2.2*1000;title.notes=title.notes.filter(n=>now-n.t0<life);
  for(const n of title.notes){const u=(now-n.t0)/life,fade=u>.85?2:u>.7?1:0,x=Math.round(n.x+Math.sin(n.ph+u*6.28)*2),y=Math.round(n.y-u*26);
    if(TN.complete&&TN.naturalWidth)cx.drawImage(TN,(n.g*3+fade)*12,n.tint*12,12,12,x,y,12,12)}}
let pulse=null;function pulseTick(){const au=D.querySelector('#cr canvas.aura');if(!au||D.getElementById('gs')||D.querySelector('.bondup')){pulse=null;return}
  if(RM()){au.classList.remove('mfx-beat');return}const b=MFX.beat();if(!b){au.classList.remove('mfx-beat');return}au.classList.toggle('mfx-beat',b.phase<.3)}
// Step 3 beat at Home (Pixal/Kai, Nov 1): the Echo bobs 1 px on the beat (class beat on #cr, held 2 ticks, no easing) and the den flowers sway
// (px/beat/sway_<type>_<tod>.png, f1/f2 lean 1 px). Day loops: every beat. Twilight loops: beat 1 of each bar. Only at Home while a loop plays;
// off in reduced motion / Calm, any game, any modal or sheet, the bond-up scene and a nap. A tap on a flower wins (its strip plays, the sway waits).
const SWAY=/px\/scenes\/fx\/flower_(bellflower|sundaisy|starbloom|crocus|windowbox)_(day|twi)\.png/;
// the sway follows the art the hotspot SHOWS: flower_<type>_<tod>.png, or flower_bloom.png (the web's flower overlay = the sundaisy day strip, pixel-identical)
function swayOf(u){const m=SWAY.exec(u);if(m)return m[1]+'_'+m[2];return /px\/scenes\/fx\/flower_bloom\.png/.test(u)?'sundaisy_day':null}
function homeBeatOk(){if(!D.getElementById('feed')||D.getElementById('gs')||D.querySelector('.bondup,.full,.sheet,.lvmodal'))return false;
  try{const S=W.__echo&&W.__echo.state;if(S&&S.napUntil>Date.now())return false}catch(e){}return !RM()}
function swayEl(el,f){const o=el.dataset.swayOrig;if(!o)return;if(f){el.style.backgroundImage=`url(px/beat/sway_${el.dataset.swayArt}.png)`;el.style.backgroundPosition=`-${f*16}px 0px`;el.dataset.sway=f}
  else if(el.dataset.sway&&el.dataset.sway!=='0'){el.style.backgroundImage=`url(${o})`;el.style.backgroundPosition='0px 0px';el.dataset.sway='0'}}
function beatTick(){const cr=D.querySelector('#sc #cr'),spots=D.querySelectorAll('#sc .den-hotspot');const b=homeBeatOk()?MFX.beat():null;
  const tw=!!(b&&/twilight/.test(b.name||'')),on=beatOn(b,tw),f=b?swayFrame(b,tw):0,now=Date.now();
  if(cr){cr.classList.toggle('mfxb',!!b);cr.classList.toggle('beat',on)}
  spots.forEach(el=>{if(!el.dataset.swayOrig){const bg=el.style.backgroundImage||'',m=/url\(["']?([^"')]+)["']?\)/.exec(bg);const a=m&&swayOf(m[1]);if(!a)return;el.dataset.swayOrig=m[1];el.dataset.swayArt=a;el.dataset.sway='0'}
    if(el._swayHold>now){return}swayEl(el,f)})}
if(D)D.addEventListener('pointerdown',ev=>{const el=ev.target&&ev.target.closest&&ev.target.closest('.den-hotspot');if(!el||!el.dataset.swayOrig)return;el._swayHold=Date.now()+700;swayEl(el,0)},true);   // the tap strip (1,2,1,0 at 110 ms) plays on the real flower art
MFX._beatTick=beatTick;
let bell=null;function bellTick(){const sc=D.getElementById('sc');const st=sc&&(sc.getAttribute('style')||'');const m=st&&st.match(/twitchel_meadow_(day|twi)\.png/);
  if(!m||D.getElementById('gs')){if(bell&&bell.el)bell.el.remove();bell=null;return}
  if(!bell||!bell.el.isConnected||bell.band!==m[1]){if(bell&&bell.el)bell.el.remove();const e=D.createElement('i');e.className='mfx-bell';e.style.backgroundImage=`url(px/scenes/fx/twitchel_meadow_bell_${m[1]}.png)`;
    e.style.top=(sc.clientHeight-320+219)+'px';sc.appendChild(e);bell={el:e,band:m[1]}}
  if(RM()){bell.el.dataset.f=0;return}const b=MFX.beat();if(!b){bell.el.dataset.f=0;return}
  const inBar=(b.beat%b.bpb)+b.phase;bell.el.dataset.f=inBar<.17?1:inBar<.34?2:inBar<.5?1:0}   // a little swing + ting on each bar's downbeat
function loop(){try{titleTick()}catch(e){}try{pulseTick()}catch(e){}try{bellTick()}catch(e){}try{beatTick()}catch(e){}W.requestAnimationFrame(loop)}
if(D&&W.requestAnimationFrame)W.requestAnimationFrame(loop);
MFX.tunes=()=>TUNES;MFX.tempo=()=>TEMPO;MFX.reduced=RM;
W.MusicFX=MFX})(typeof window!=='undefined'?window:globalThis);
