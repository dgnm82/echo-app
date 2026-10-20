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
MFX._pure={beatAt,nearBeat,catchState,catchStep,ladderStep,hummRate};
if(typeof module!=='undefined'){module.exports=MFX;return}
// ---------------- sound
function note(f,n,o){const M=W.Music;if(!M||!M.oneShot)return null;return M.oneShot(nfile(f,n),Object.assign({vol:.5,duck:.75},o||{}))}
MFX.note=note;MFX.ok=f=>!!fam(f);   // tunes.json loaded and this family has data
MFX.beat=function(){const M=W.Music,c=M&&M.clock&&M.clock();if(!c||!TEMPO||!TEMPO[c.name])return null;const m=TEMPO[c.name];return beatAt(c.t,m.bpm,m.beatsPerBar,m.beats)};
MFX.onBeatNow=function(){const M=W.Music,c=M&&M.clock&&M.clock();if(!c||!TEMPO||!TEMPO[c.name])return false;return nearBeat(c.t,TEMPO[c.name].bpm)};
function freeBeat(bpm,bpb){const t=performance.now()/1000;return Object.assign(beatAt(t,bpm,bpb,0),{free:true})}
// ---------------- A4 games
let CT=catchState();MFX.catchStart=()=>{CT=catchState()};
MFX.catchHit=function(f){const F=fam(f);if(!F)return null;const c=F.catch,r=catchStep(CT,c.notes.length);note(f,c.notes[r.i],{vol:.5});return r};   // {i,done,songs}
let LD={i:0};MFX.digStart=()=>{LD={i:0}};
MFX.digClear=function(f,rows){const F=fam(f);if(!F)return null;const L=F.dig_ladder,r=ladderStep(LD,L.length,rows||1);
  r.steps.forEach((s,k)=>setTimeout(()=>note(f,L[s],{vol:.5}),k*95));if(r.top)setTimeout(()=>note(f,L[L.length-1],{vol:.4,rate:2}),r.steps.length*95+60);return r};   // top: an octave sparkle
MFX.pairsFlip=function(f,item,second){const F=fam(f);const d=F&&F.pairs[item];if(!d)return null;return note(f,d[second?1:0],{vol:.4})};
MFX.pairsMatch=function(f,item){const F=fam(f);const d=F&&F.pairs[item];if(!d)return null;note(f,d[0],{vol:.42});note(f,d[1],{vol:.42});return true};   // 2 voices: the chime rings together
// Cushion Tower beat sparkle: px/stack/beat_sparkle.png, 5 frames of 24x24, 2 ticks each; reduced motion: frame 2 held, no growth
const SPK=new Image();if(D)SPK.src='px/stack/beat_sparkle.png';
MFX.drawSparkle=function(cx,x,y,age,scale){if(!SPK.complete||!SPK.naturalWidth)return age<10;const k=scale||1,rm=RM(),f=rm?2:Math.floor(age/2);if(f>4||(rm&&age>9))return false;
  cx.drawImage(SPK,f*24,0,24,24,Math.round(x-12*k),Math.round(y-12*k),24*k,24*k);return true};
// Meadow Dash: a soft mark on the ground ahead flashes on each beat (px/run/beat_pulse.png, 3 frames of 20x6). Off in reduced motion.
const BP=new Image();if(D)BP.src='px/run/beat_pulse.png';
MFX.runPulse=true;   // Meadow Dash beat mark: the one switch (false = off everywhere)
MFX.drawRunPulse=function(cx,x,y,scale){if(!MFX.runPulse||RM()||!BP.complete||!BP.naturalWidth)return;const b=MFX.beat();if(!b)return;const f=b.phase<.15?0:b.phase<.3?1:b.phase<.45?2:-1;if(f<0)return;const k=scale||1;
  cx.drawImage(BP,f*20,0,20,6,Math.round(x-10*k),Math.round(y-3*k),20*k,6*k)};
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
  const pop=()=>{if(!o.noteEl)return;const n=P.notes[i],c='cdefgab'.indexOf(n[0]),col=n.startsWith('f#')?7:n.startsWith('bb')?8:c,e=D.createElement('i');e.className='mfx-pnote'+(RM()?' calm':'');
    e.style.backgroundPosition=`${-12*col}px 0`;const r=o.noteEl.getBoundingClientRect(),R=(o.tapEl||D.body).getBoundingClientRect(),z=(o.zoom||1);
    e.style.left=Math.round((r.left-R.left)/z+r.width/z/2-6)+'px';e.style.top=Math.round((r.top-R.top)/z-10)+'px';(o.tapEl||D.body).appendChild(e);setTimeout(()=>e.remove(),900)};
  const next=()=>{if(done)return;clearTimeout(t);note(o.fam,P.notes[i],{vol:.55});pop();try{o.onNote&&o.onNote(i)}catch(e){}i++;
    if(i>=P.notes.length){done=true;el.removeEventListener('pointerdown',next);setTimeout(()=>res(true),Math.round((P.beats[P.beats.length-1]||1)*500));return}
    t=setTimeout(next,(P.autoplay_after_s||1.6)*1000)};
  el.addEventListener('pointerdown',next);t=setTimeout(next,(P.autoplay_after_s||1.6)*1000)})};
// ---------------- A10 postcard tune stamps (+ A8 Memory Book sounds): event delegation, works on every screen that shows them
MFX.stampHTML=function(f,scene){const F=fam(f);if(!F||!F.postcards[scene])return '';return `<i class="pctune mfxsnd" role="button" aria-label="Play the postcard tune" data-tune="${f}:${scene}" style="background-image:url(px/pc_tune/${f}_${scene}.png)"></i>`};
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
let bell=null;function bellTick(){const sc=D.getElementById('sc');const st=sc&&(sc.getAttribute('style')||'');const m=st&&st.match(/twitchel_meadow_(day|twi)\.png/);
  if(!m||D.getElementById('gs')){if(bell&&bell.el)bell.el.remove();bell=null;return}
  if(!bell||!bell.el.isConnected||bell.band!==m[1]){if(bell&&bell.el)bell.el.remove();const e=D.createElement('i');e.className='mfx-bell';e.style.backgroundImage=`url(px/scenes/fx/twitchel_meadow_bell_${m[1]}.png)`;
    e.style.top=(sc.clientHeight-320+219)+'px';sc.appendChild(e);bell={el:e,band:m[1]}}
  if(RM()){bell.el.dataset.f=0;return}const b=MFX.beat();if(!b){bell.el.dataset.f=0;return}
  const inBar=(b.beat%b.bpb)+b.phase;bell.el.dataset.f=inBar<.17?1:inBar<.34?2:inBar<.5?1:0}   // a little swing + ting on each bar's downbeat
function loop(){try{titleTick()}catch(e){}try{pulseTick()}catch(e){}try{bellTick()}catch(e){}W.requestAnimationFrame(loop)}
if(D&&W.requestAnimationFrame)W.requestAnimationFrame(loop);
MFX.tunes=()=>TUNES;MFX.tempo=()=>TEMPO;MFX.reduced=RM;
W.MusicFX=MFX})(typeof window!=='undefined'?window:globalThis);
