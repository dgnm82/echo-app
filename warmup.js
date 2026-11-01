// Warmup (Music School Phase 1, step 1): the hatching-song warm-up right after the child names a new Echo.
// Four tiny moments, each shown by the Echo first, each under 20 s, the whole thing under 2 minutes:
//   1 copy two notes (sol-mi on two big pads)  2 tap my heartbeat  3 which little note goes up high (listen only)  4 clap it back
// Nothing can go wrong: every outcome (same / partial / different / no tap) gets a happy line (Cole's wu_* keys) and the same
// "yay" sparkle, then the Echo plays the moment once more. With no tap the Echo carries on by itself after ~6 s.
// No score, stars or numbers ever reach the screen. The scores (0 / 0.5 / 1, musiclevel.js) only set the quiet start.
// The Echo then sings "its first song" (Cole's rule: the child's two notes on the child's pats, home on do, at the child's
// heartbeat tempo, the heartbeat softly underneath); it goes in the Memory Book ("Our first song").
// Data: music/wu_motifs.json (Cole; DEF below is the same object, tools/test-warmup.js checks they match), music/levels.json warmup.
// Art: px/warmup/* + manifest.json (Pixal, 180x320 canvas coordinates). Input: press.js. Audio: EchoBack.playNote (note samples).
(function(W){'use strict';
const ML=(typeof MusicLevel!=='undefined'?MusicLevel:(W.MusicLevel||(typeof require!=='undefined'?require('./musiclevel.js'):null)));
const DEF={"_about":"Cole step 1 warm-up motifs (Nov 1, 2026). Song v1 style [degree 1-7, octave, ticks @ 12/beat], ticks = onset to next onset. Play with the existing music/notes/<fam>_<note> samples (instruments.json musicbox). See MOTIFS.md.","v":1,"tpb":12,"do_midi":{"slyte":62,"whimber":70,"twitchel":65},"motifs":{"copy":{"bpm":88,"feel":"a friendly two-note call, falling: sol then mi, unhurried, like calling a name across a meadow","pads":[[3,0],[5,0]],"by_family":{"slyte":[[5,0,12],[3,0,12]],"whimber":[[5,0,12],[3,0,12]],"twitchel":[[5,0,12],[3,0,12]]},"samples":{"slyte":["slyte_a4","slyte_fs4"],"whimber":["whimber_f5","whimber_d5"],"twitchel":["twitchel_c5","twitchel_a4"]}},"beat":{"bpm":84,"beats":10,"skip":2,"feel":"a steady, warm, low heartbeat; soft thump, never a click; slightly louder on every 1st of 2 beats","gain":[1.0,0.8,1.0,0.8,1.0,0.8,1.0,0.8,1.0,0.8],"by_family":{"slyte":[[1,0,12],[1,0,12],[1,0,12],[1,0,12],[1,0,12],[1,0,12],[1,0,12],[1,0,12],[1,0,12],[1,0,12]],"whimber":[[5,-1,12],[5,-1,12],[5,-1,12],[5,-1,12],[5,-1,12],[5,-1,12],[5,-1,12],[5,-1,12],[5,-1,12],[5,-1,12]],"twitchel":[[1,0,12],[1,0,12],[1,0,12],[1,0,12],[1,0,12],[1,0,12],[1,0,12],[1,0,12],[1,0,12],[1,0,12]]},"samples":{"slyte":["slyte_d4","slyte_d4","slyte_d4","slyte_d4","slyte_d4","slyte_d4","slyte_d4","slyte_d4","slyte_d4","slyte_d4"],"whimber":["whimber_f4","whimber_f4","whimber_f4","whimber_f4","whimber_f4","whimber_f4","whimber_f4","whimber_f4","whimber_f4","whimber_f4"],"twitchel":["twitchel_f4","twitchel_f4","twitchel_f4","twitchel_f4","twitchel_f4","twitchel_f4","twitchel_f4","twitchel_f4","twitchel_f4","twitchel_f4"]}},"high":{"bpm":100,"feel":"two tiny pip-pip notes, one on each side; bright, short, curious; then (after ANY tap or none) the Echo plays low -> high as a little rising answer","pip":[[0,4],[0,8]],"gap_ticks":12,"by_family":{"slyte":[{"low":[1,1],"high":[5,1],"interval":"perfect 5th (do-sol)","samples":["slyte_d5","slyte_a5"]},{"low":[1,1],"high":[3,1],"interval":"major 3rd (do-mi)","samples":["slyte_d5","slyte_fs5"]}],"whimber":[{"low":[1,0],"high":[5,0],"interval":"perfect 5th (do-sol)","samples":["whimber_bb4","whimber_f5"]},{"low":[1,0],"high":[3,0],"interval":"major 3rd (do-mi)","samples":["whimber_bb4","whimber_d5"]}],"twitchel":[{"low":[1,1],"high":[5,1],"interval":"perfect 5th (do-sol)","samples":["twitchel_f5","twitchel_c6"]},{"low":[1,1],"high":[3,1],"interval":"major 3rd (do-mi)","samples":["twitchel_f5","twitchel_a5"]}]}},"clap":{"bpm":90,"feel":"a bouncy pat pattern on one bright note: long, quick-quick, long (ta ti-ti ta)","ticks":[12,6,6,12],"by_family":{"slyte":[[1,1,12],[1,1,6],[1,1,6],[1,1,12]],"whimber":[[1,1,12],[1,1,6],[1,1,6],[1,1,12]],"twitchel":[[1,1,12],[1,1,6],[1,1,6],[1,1,12]]},"samples":{"slyte":["slyte_d5","slyte_d5","slyte_d5","slyte_d5"],"whimber":["whimber_bb5","whimber_bb5","whimber_bb5","whimber_bb5"],"twitchel":["twitchel_f5","twitchel_f5","twitchel_f5","twitchel_f5"]}},"yay":{"bpm":104,"feel":"the same tiny rising sparkle after EVERY answer (right, other or none), so no answer ever sounds different","by_family":{"slyte":[[3,0,3],[5,0,3],[1,1,12]],"whimber":[[3,0,3],[5,0,3],[1,1,12]],"twitchel":[[3,0,3],[5,0,3],[1,1,12]]},"samples":{"slyte":["slyte_fs4","slyte_a4","slyte_d5"],"whimber":["whimber_d5","whimber_f5","whimber_bb5"],"twitchel":["twitchel_a4","twitchel_c5","twitchel_f5"]}}},"first_song":{"rule":["A, B = the child's first two copy taps (fallback sol, mi; one tap only: B = mi, or sol if A is mi).","R = the child's pats quantised to 6/12 ticks (gap <= 0.75 x their median gap -> 6, else 12; the last pat 12). Fewer than 3 or more than 6 pats, or none: R = the Echo's 12,6,6,12.","Phrase 1 = R over A,B,A,B... ; phrase 2 = R over A,B,... with the last two notes re -> do and the last length doubled (ends home on do).","Tempo = the child's heartbeat tapping tempo (median gap) clamped 76-104 bpm; no or few beat taps: 88.","Under it, the heartbeat note on every beat at 0.5 gain (2 voices total). At most 4 different pitches (re/do + A/B) - EIB rule holds."],"example":{"bpm":88,"n":[[5,0,12],[3,0,6],[5,0,6],[3,0,12],[5,0,12],[3,0,6],[2,0,6],[1,0,24]],"note":"what a child who copies sol-mi and pats ta ti-ti ta (or taps nothing) hears"}}};
let MOT=DEF;
const TPB=12,stepOf=x=>(x[0]-1)+7*(x[1]||0),fromStep=s=>{const o=Math.floor(s/7);return [s-7*o+1,o]};
const seqMs=(seq,bpm)=>seq.reduce((a,x)=>a+x[2]*60000/bpm/TPB,0);
// ---------------------------------------------------------------- timing (ms at speed 1)
const T={say:1600,auto:6000,doneGap:900,lastGap:1600,patEnd:1300,outcome:1900,yayGap:250,next:1400,introAuto:6000,goSay:1500,
  chirpTail:800,songTail:1600,keep:2000,trialGap:300,pitchAuto:4500,pitchOutcome:1300,pitchSay2:1000};
function M(){return MOT.motifs}
const yayMs=()=>seqMs(M().yay.by_family.slyte,M().yay.bpm);
// worst case with no taps at all (tools/test-warmup.js: each moment < 20 s, the whole warm-up < 2.5 min)
function plan(){const P={},cp=M().copy,bt=M().beat,hi=M().high,cl=M().clap,bms=60000/bt.bpm,sideMs=hi.pip.reduce((a,p)=>Math.max(a,p[1]),0)*60000/hi.bpm/TPB+60000/hi.bpm*.5;
  P.intro=T.introAuto+T.goSay;
  P.copy=T.say+seqMs(cp.by_family.slyte,cp.bpm)+T.auto+T.outcome+yayMs()+T.yayGap+seqMs(cp.by_family.slyte,cp.bpm);
  P.beat=T.say+bt.beats*bms+T.outcome+yayMs();
  const trial=2*sideMs+hi.gap_ticks*60000/hi.bpm/TPB+T.pitchAuto+T.pitchOutcome+yayMs()+T.yayGap+2*sideMs+T.chirpTail;
  P.pitch=T.say+hi.by_family.slyte.length*trial+(hi.by_family.slyte.length-1)*T.pitchSay2;
  P.between=3*T.next;
  P.rhythm=T.say+seqMs(cl.by_family.slyte,cl.bpm)+T.auto+T.outcome+yayMs()+T.yayGap+seqMs(cl.by_family.slyte,cl.bpm);
  P.song=T.say+seqMs(firstSong(null,null,null).n,88)+T.songTail+T.keep;
  P.total=Object.keys(P).reduce((a,k)=>a+P[k],0);return P}
// ---------------------------------------------------------------- the first song (pure; Cole's rule, motifs.json first_song.rule)
function median(a){const s=a.slice().sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:0}
// pats -> ticks: a gap <= 0.75 x the median gap = 6, longer = 12, the last pat 12. Fewer than 3 or more than 6 pats: null (use 12,6,6,12)
// Cole's rule says "0.75 x the median gap"; with ta ti-ti ta the short gaps ARE the median, so nothing would become 6.
// Reference = the longest gap instead (deviation, in the step 1 report): <= 0.75 x the longest -> 6, else 12; the last pat 12.
function quantize(taps){if(!taps||taps.length<3||taps.length>6)return null;const g=ML.iois(taps),m=Math.max(...g);return g.map(x=>x<=.75*m?6:12).concat([12])}
// the child's heartbeat tapping tempo: median gap, clamped 76-104 bpm; fewer than 4 taps: 88
function tempoOf(taps){if(!taps||taps.length<4)return 88;const m=median(ML.iois(taps));return m>0?Math.round(Math.max(76,Math.min(104,60000/m))):88}
function firstSong(notes,ticks,bpm){const C=ML.data.warmup,N=(notes||[]).filter(s=>typeof s==='number');
  const A=N.length>=2?N[0]:N.length===1?N[0]:C.copy.notes[0],B=N.length>=2?N[1]:N.length===1?(N[0]===2?4:2):C.copy.notes[1];   // one tap: B = mi, or sol if A is mi
  const R=ticks&&ticks.length>=3?ticks.slice():M().clap.ticks.slice();
  const p1=R.map((t,i)=>[i%2?B:A,t]),p2=R.map((t,i)=>[i%2?B:A,t]);
  if(p2.length>=2){p2[p2.length-2][0]=1;p2[p2.length-1][0]=0}p2[p2.length-1][1]*=2;      // phrase 2 ends re -> do, the last note held twice as long
  const n=p1.concat(p2).map(([s,t])=>{const d=fromStep(s);return [d[0],d[1],t]});
  return {v:1,bpm:bpm?Math.round(Math.max(76,Math.min(104,bpm))):88,tpb:TPB,n,notes:[A,B],ticks:R}}
function songMs(song){return seqMs(song.n,song.bpm)}
// ---------------------------------------------------------------- the scene (DOM)
let cur=null;const A='px/warmup/';
function el(tag,cls,x,y,w,h){const e=document.createElement(tag);e.className=cls;const s=e.style;s.left=x+'px';s.top=y+'px';if(w!=null){s.width=w+'px';s.height=h+'px'}return e}
function frame(e,i,row,w,h){e.style.backgroundPosition=(-i*w)+'px '+(-(row||0)*h)+'px'}
// api: {host, fam, sprite (Echo HTML), bg (url), lowfx, mode:'full'|'copy', manifest, line(key)->{text,expr,react}|null, say(text,expr),
//       speed (tests), seed, onResult(res) (before the ending lines), onDone(res)}
function start(api){stop();const fam=api.fam,RM=!!api.lowfx,sp=Math.max(.05,+api.speed||1),EB=W.EchoBack,LV=ML.data.warmup,mode=api.mode==='copy'?'copy':'full';
  const tok={},later=(ms,f)=>setTimeout(()=>{if(cur&&cur.tok===tok)f()},ms/sp);
  const man=api.manifest||{},LY=man.layout||{},P=(k,d)=>LY[k]||d,TAP=LY.tap||{};
  const root=document.createElement('div');root.className='wu'+(RM?' rm':'');root.id='wu';
  const cv=document.createElement('div');cv.className='wucv';if(api.bg)cv.style.backgroundImage='url('+api.bg+')';root.appendChild(cv);
  const fit=()=>{const w=root.clientWidth||180,h=root.clientHeight||320,k=Math.min(w/180,h/320);cv.style.transform='translate('+Math.round((w-180*k)/2)+'px,'+Math.round((h-320*k)/2)+'px) scale('+k+')'};
  const add=e=>{cv.appendChild(e);return e};
  // z-order (Pixal): spot, heartglow, Echo, pat burst, heart, perches, chirps, pads, pips + cue
  add(el('i','wusp wuspot',...P('stage_spot',[58,201]),64,12));
  const glow=add(el('i','wusp wuglow',...P('heartglow',[50,146]),80,80));glow.hidden=true;
  const echo=add(el('div','wuecho',...P('echo_cell_48',[66,164]).slice(0,2),48,48));echo.innerHTML=api.sprite||'';
  const burst=add(el('i','wusp wuburst',...P('pat_burst',[74,202]),32,12));burst.hidden=true;
  const heart=add(el('i','wusp wuheart',...P('heart_beat',[84,154]),13,13));heart.hidden=true;
  const stage=add(el('div','wustage',0,0,180,320));
  const pips=P('moment_pips',[[49,36],[71,36],[93,36],[115,36]]).map((p,i)=>{const e=add(el('i','wusp wupip',p[0],p[1],16,16));frame(e,i,0,16,16);if(mode==='copy'&&i>0)e.hidden=true;return e});
  const cue=add(el('i','wusp wucue',...P('cue',[82,58]),16,16));cue.hidden=true;
  const bub=add(el('div','wubub',8,78));bub.hidden=true;bub.setAttribute('aria-live','polite');
  const dim=add(el('div','wudim',0,0,180,320));dim.hidden=true;
  const card=add(el('div','wucard',...P('firstsong_card',[34,120]),112,64));card.hidden=true;card.setAttribute('data-press','card');card.setAttribute('role','button');
  (api.host||document.body).appendChild(root);fit();W.addEventListener('resize',fit);
  // ---- helpers
  let cueT=null;
  function setCue(k){clearInterval(cueT);cue.hidden=!k;if(!k)return;if(k==='ear')return frame(cue,0,0,16,16);let f=1;frame(cue,1,0,16,16);if(!RM)cueT=setInterval(()=>{f=f===1?2:1;frame(cue,f,0,16,16)},500/sp)}
  const pip=i=>pips.forEach((e,j)=>frame(e,j,j===i?1:0,16,16));
  function talk(k,ms){const l=api.line&&api.line(k);if(!l||!l.text){bub.hidden=true;return null}bub.textContent=l.text;bub.hidden=false;if(api.say)try{api.say(l.text,l.expr)}catch(e){}
    clearTimeout(talk.t);talk.t=later(ms||2600,()=>{bub.hidden=true});return l}
  const note=(s,v)=>{try{if(EB&&EB.playNote)EB.playNote(fam,s,{vol:v==null?1:v})}catch(e){}};
  const colOf=s=>EB&&EB.colOf&&EB.nameOf?EB.colOf(EB.nameOf(fam,s)):0;
  // a motif / song: [[degree, octave, ticks]...] at bpm; each(i, step) on every note; returns its length (ms)
  function sing(seq,bpm,each,gains){let t=0;seq.forEach((x,i)=>{const s=stepOf(x);later(t,()=>{note(s,gains?gains[i%gains.length]:1);if(each)each(i,s)});t+=x[2]*60000/bpm/TPB});return t}
  const yay=()=>sing(M().yay.by_family[fam]||M().yay.by_family.slyte,M().yay.bpm,null,[.8]);
  let tapH=null;const input=W.Press.on(cv,{down(e,info){if(tapH)tapH(e.getAttribute('data-press'),info.t,e)}},{sel:'[data-press]'});
  const res={r:{copy:0,beat:0,pitch:0,rhythm:0},notes:null,ticks:null,beatTaps:[],mode,taps:0};
  const clearStage=()=>{stage.innerHTML='';tapH=null};
  const hitBox=(rect,key,label)=>{const b=el('button','wuhit',rect[0],rect[1],rect[2],rect[3]);b.setAttribute('data-press',key);b.setAttribute('aria-label',label);stage.appendChild(b);return b};
  // ---- intro (+ the "Let's play!" button; it goes on by itself after ~6 s)
  function mIntro(next){talk('wu_intro',T.introAuto);const g=api.line&&api.line('wu_btn_go');const b=hitBox([50,272,80,24],'go',(g&&g.text)||'Go');b.className='wuhit wugo';b.textContent=(g&&g.text)||'';
    let done=false;const go=()=>{if(done)return;done=true;clearStage();talk('wu_intro_go',T.goSay);later(T.goSay,next)};tapH=k=>{if(k==='go'){res.taps++;go()}};later(T.introAuto,go)}
  const between=next=>{talk('wu_next',T.next);later(T.next,next)};
  // ---- 1. copy two notes (sol-mi, Cole's motif)
  function mCopy(next){pip(0);clearStage();const mo=M().copy,seq=mo.by_family[fam]||mo.by_family.slyte,ask=seq.map(stepOf),pads={};
    [['mi',2,'copy_pad_mi',[30,252]],['sol',4,'copy_pad_sol',[102,242]]].forEach(([n,s,k,d])=>{const p=P(k,d),t=TAP[k]||[p[0]-4,p[1]-4,56,56];
      const pad=el('i','wusp wupad',p[0],p[1],48,48);frame(pad,colOf(s),0,48,48);stage.appendChild(pad);hitBox(t,n,n==='sol'?'High note':'Low note');pads[s]=pad});
    const lit=s=>{const p=pads[s];if(!p)return;frame(p,colOf(s),1,48,48);setTimeout(()=>frame(p,colOf(s),0,48,48),350/sp)};
    setCue('ear');talk('wu_copy_show',T.say+800);
    later(T.say,()=>{const d=sing(seq,mo.bpm,(i,s)=>lit(s));later(d,()=>{setCue('turn');talk('wu_copy_turn',2400);const ans=[];let gt=null;const at=later(T.auto,()=>end(true));
      tapH=(k,t)=>{const s=k==='sol'?4:k==='mi'?2:null;if(s==null)return;clearTimeout(at);clearTimeout(gt);note(s);lit(s);ans.push(s);res.taps++;
        if(ans.length>=ask.length+2)return end(false);gt=later(ans.length>=ask.length?T.doneGap:T.lastGap,()=>end(false))};
      function end(none){tapH=null;setCue('ear');const sc=none?0:ML.scoreCopy(ask,ans);res.r.copy=sc;if(!none)res.notes=ans.slice(0,2);
        talk(none?'wu_copy_wait':sc===1?'wu_copy_same':sc>0?'wu_copy_shape':'wu_copy_new',T.outcome+800);
        later(T.outcome,()=>{const y=yay();later(y+T.yayGap,()=>{const again=none?seq:ans.slice(0,4).map(s=>{const f=fromStep(s);return [f[0],f[1],12]});
          const d2=sing(again,mo.bpm,(i,s)=>lit(s));later(d2,()=>{setCue(null);next()})})})}})})}
  // ---- 2. tap my heartbeat (Cole: 10 steady beats, lub-dub weight; 2 alone, then the child joins)
  function mBeat(next){pip(1);clearStage();const mo=M().beat,seq=mo.by_family[fam]||mo.by_family.slyte,ms=60000/mo.bpm;
    const p=P('beat_pad',[66,246]),pad=el('i','wusp wubeat',p[0],p[1],48,48);frame(pad,0,0,48,48);stage.appendChild(pad);
    hitBox(TAP.beat_pad||[58,238,64,64],'beat','Tap with the heartbeat');hitBox(TAP.heartbeat_echo||[50,146,80,70],'beat','Tap with the heartbeat');
    glow.hidden=false;heart.hidden=false;glow.classList.toggle('static',RM);heart.classList.toggle('static',RM);if(!RM){frame(glow,0,0,80,80);frame(heart,0,0,13,13)}
    setCue('ear');talk('wu_beat_show',T.say);const beats=[],taps=[];
    tapH=(k,tt)=>{if(k!=='beat')return;taps.push(tt);res.taps++;frame(pad,0,1,48,48);setTimeout(()=>frame(pad,0,0,48,48),120/sp)};
    later(T.say,()=>{seq.forEach((x,i)=>later(i*ms,()=>{beats.push(W.Press.now());note(stepOf(x),mo.gain[i%mo.gain.length]*.7);if(i===mo.skip){setCue('turn');talk('wu_beat_turn',2400)}
        if(!RM){frame(glow,1,0,80,80);frame(heart,1,0,13,13);setTimeout(()=>frame(glow,2,0,80,80),120/sp);setTimeout(()=>frame(glow,0,0,80,80),320/sp);setTimeout(()=>frame(heart,0,0,13,13),150/sp)}}));
      later(seq.length*ms,()=>{tapH=null;setCue(null);const sc=ML.scoreBeat(taps.map(x=>x*sp),beats.map(x=>x*sp),{bpm:mo.bpm,beats:mo.beats,skip:mo.skip});res.r.beat=sc;res.beatTaps=taps.map(x=>x*sp);
        talk(!taps.length?'wu_beat_wait':sc>=.7?'wu_beat_with':'wu_beat_own',T.outcome+600);
        later(T.outcome,()=>{const y=yay();later(y,()=>{glow.hidden=true;heart.hidden=true;next()})})})})}
  // ---- 3. which little note goes up high (listen only, Pixal's change: both on the same perch, same look, idle until tapped;
  // after the tap - or none - the Echo always plays low then high, and the higher one does a little reveal hop)
  // Art (Pixal, Nov 1 change): both chirps are chirp_same_<side> on perch_low.png at the chirp_low_<side> / perch_low_<side> spots.
  // A tapped chirp stays chirp_same (f2 happy) - its look never gives the answer. Only the reveal uses chirp_reveal_<side>, on the higher one.
  function mPitch(next){pip(2);clearStage();const mo=M().high,trials=mo.by_family[fam]||mo.by_family.slyte,out=[],side=['l','r'];let i=0;
    const perch=[P('perch_low_l',[12,204]),P('perch_low_r',[144,204])],pos=[P('chirp_low_l',[10,180]),P('chirp_low_r',[142,180])];
    perch.forEach(p=>stage.appendChild(el('i','wusp wuperch',p[0],p[1],24,12)));
    const ch=pos.map(p=>{const e=el('i','wusp wuchirp',p[0],p[1],28,28);stage.appendChild(e);return e});
    hitBox(TAP.chirp_left||[0,104,60,112],'L','Left little note');hitBox(TAP.chirp_right||[120,104,60,112],'R','Right little note');
    const same=j=>A+'chirp_same_'+side[j];
    const look=(j,f,img)=>{const e=ch[j];e.style.backgroundImage='url('+(img||same(j)+'.png')+')';e.classList.remove('hop');frame(e,f,0,28,28)};
    const pipMs=60000/mo.bpm/TPB;
    // one chirp sounds: f1 while it sings (reduced motion: the _static frame), back to f0 (or to `after`) when it ends
    function side1(j,stepv,after){mo.pip.forEach(pp=>later(pp[1]===mo.pip[0][1]?0:mo.pip[0][1]*pipMs,()=>note(stepv,.9)));if(RM)look(j,0,same(j)+'_static.png');else look(j,1);
      const d=mo.pip.reduce((a,pp)=>a+pp[1],0)*pipMs;later(d,after||(()=>look(j,0)));return d}
    function trial(){const tr=trials[i],lo=stepOf(tr.low),hi=stepOf(tr.high),hiSide=api.seed!=null?((api.seed>>i)&1):(Math.random()<.5?1:0),pit=[hiSide?lo:hi,hiSide?hi:lo];
      look(0,0);look(1,0);setCue('ear');talk(i===0?'wu_high_show':'wu_high_more',T.say+1200);
      later(i===0?T.say:T.pitchSay2,()=>{const d=side1(0,pit[0]);later(d+mo.gap_ticks*pipMs,()=>{const d2=side1(1,pit[1]);later(d2,turn)})});
      function turn(){setCue('turn');talk('wu_high_turn',2400);const at=later(T.pitchAuto,()=>done(null));tapH=k=>{if(k!=='L'&&k!=='R')return;clearTimeout(at);res.taps++;done(k==='L'?0:1)}}
      function done(j){tapH=null;setCue('ear');out.push(j==null?null:j===hiSide);if(j!=null){note(pit[j]);look(j,2)}   // the tapped one: chirp_same f2, whichever it is
        talk(j==null?'wu_high_wait':j===hiSide?'wu_high_up':'wu_high_low',T.pitchOutcome+1600);
        // afterwards the Echo always plays low then high; the higher one reveals as it ends, the lower one is happy (chirp_same f2)
        later(T.pitchOutcome,()=>{const y=yay();later(y+T.yayGap,()=>{const loS=1-hiSide,d=side1(loS,lo,()=>look(loS,2));later(d,()=>{const dh=side1(hiSide,hi,()=>reveal(hiSide));
          later(dh+T.chirpTail,()=>{i++;if(i<trials.length)trial();else{res.r.pitch=ML.scorePitch(out);next()}})})})})}
      function reveal(j){look(j,0,A+'chirp_reveal_'+side[j]+(RM?'_static':'')+'.png');if(!RM){void ch[j].offsetWidth;ch[j].classList.add('hop')}}}
    trial()}
  // ---- 4. clap it back (ta ti-ti ta on one bright note; the child pats it back on the paw / feather pad)
  function mRhythm(next){pip(3);clearStage();const mo=M().clap,seq=mo.by_family[fam]||mo.by_family.slyte,col=fam==='whimber'?2:1,hd=stepOf(seq[0]);
    const p=P('beat_pad',[66,246]),pad=el('i','wusp wubeat',p[0],p[1],48,48);frame(pad,col,0,48,48);stage.appendChild(pad);hitBox(TAP.beat_pad||[58,238,64,64],'pat','Pat it back');
    const puff=()=>{burst.hidden=false;burst.classList.toggle('static',RM);if(RM){setTimeout(()=>{burst.hidden=true},200/sp);return}
      frame(burst,0,0,32,12);setTimeout(()=>frame(burst,1,0,32,12),70/sp);setTimeout(()=>frame(burst,2,0,32,12),140/sp);setTimeout(()=>{burst.hidden=true},210/sp)};
    setCue('ear');talk('wu_clap_show',T.say+800);
    later(T.say,()=>{const d=sing(seq,mo.bpm,()=>puff());later(d,()=>{setCue('turn');talk('wu_clap_turn',2400);const taps=[];let gt=null;const at=later(T.auto,()=>end(true));
      tapH=(k,tt)=>{if(k!=='pat')return;clearTimeout(at);clearTimeout(gt);taps.push(tt);res.taps++;note(hd,.8);puff();frame(pad,col,1,48,48);setTimeout(()=>frame(pad,col,0,48,48),120/sp);
        if(taps.length>=seq.length+4)return end(false);gt=later(T.patEnd,()=>end(false))};
      function end(none){tapH=null;setCue('ear');const tp=taps.map(x=>x*sp),sc=none?0:ML.scoreRhythm(tp,mo.ticks);res.r.rhythm=sc;res.ticks=none?null:quantize(tp);
        talk(none?'wu_clap_wait':sc===1?'wu_clap_same':sc>0?'wu_clap_count':'wu_clap_new',T.outcome+800);
        later(T.outcome,()=>{const y=yay();later(y+T.yayGap,()=>{const again=res.ticks?res.ticks.map(t=>[seq[0][0],seq[0][1],t]):seq;const d2=sing(again,mo.bpm,()=>puff());later(d2,()=>{setCue(null);next()})})})}})})}
  // ---- the first song + the card (the child's 2 notes in the slots, one beat mark per pat), the heartbeat softly underneath
  function mSong(next){clearStage();pips.forEach(e=>e.hidden=true);setCue(null);
    const song=firstSong(res.notes,res.ticks,tempoOf(res.beatTaps));res.song=song;if(api.onResult)try{api.onResult(res)}catch(e){}
    const t=api.line&&api.line('wu_book_title');card.setAttribute('aria-label',(t&&t.text)||'Our first song');
    card.innerHTML='';card.hidden=false;dim.hidden=false;
    song.notes.forEach((s,j)=>{const n=el('i','wunote',j?77:53,13,12,12);n.style.setProperty('--c',colOf(s));card.appendChild(n)});
    const stp=song.ticks.length>4?11:15;song.ticks.forEach((tk,j)=>{const b=el('i','wusp wumark',50+j*stp,44,14,6);frame(b,tk>=12?1:0,0,14,6);card.appendChild(b)});
    const hb=(M().beat.by_family[fam]||M().beat.by_family.slyte)[0];
    const play=()=>{card.classList.add('lit');const d=sing(song.n,song.bpm);const bms=60000/song.bpm;for(let k=0;k*bms<d-10;k++)later(k*bms,()=>note(stepOf(hb),.5));later(d,()=>card.classList.remove('lit'));return d};
    talk('wu_song_make',T.say+1000);let busy=true;tapH=k=>{if(k==='card'&&!busy){busy=true;later(play(),()=>{busy=false})}};
    later(T.say,()=>{const d=play();later(d,()=>{busy=false;talk('wu_song_done',T.songTail+400);later(T.songTail,()=>{talk('wu_song_keep',T.keep+400);later(T.keep,next)})})})}
  // ---- run
  cur={tok,root,input,res,fit};
  const finish=()=>{const r=cur&&cur.res;stop();if(api.onDone)api.onDone(r)};
  const seq=mode==='copy'?[mIntro,mCopy,mSong]:[mIntro,mCopy,between,mBeat,between,mPitch,between,mRhythm,mSong];let n=0;const go=()=>{const f=seq[n++];if(f)f(go);else finish()};
  go();return cur}
function stop(){if(!cur)return;const c=cur;cur=null;try{c.input.off()}catch(e){}W.removeEventListener('resize',c.fit);if(c.root.parentNode)c.root.remove()}
function setMotifs(j){if(j&&j.motifs&&j.motifs.copy&&j.motifs.beat&&j.motifs.high&&j.motifs.clap&&j.motifs.yay)MOT=j;return MOT}
const API={start,stop,plan,firstSong,quantize,tempoOf,songMs,setMotifs,T,DEF,get motifs(){return MOT},get cur(){return cur}};
API.ready=(W.fetch&&W.document)?fetch('music/wu_motifs.json').then(r=>r.json()).then(setMotifs).catch(()=>MOT):Promise.resolve(MOT);
W.Warmup=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
