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
(function(W){'use strict';
const EB={title:'Echo It Back',v:2};const MAJ=[0,2,4,5,7,9,11],TPB=12;
const SHARP=['c','c#','d','d#','e','f','f#','g','g#','a','a#','b'],FLAT=['c','db','d','eb','e','f','gb','g','ab','a','bb','b'];
const COLS=['c','d','e','f','g','a','b','f#','bb'];   // sprite columns (Batch D notes_shaped.png order): C red ... B violet, then F#, Bb
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
function spell(fam,m){return (fam==='slyte'?SHARP:FLAT)[((m%12)+12)%12]+(Math.floor(m/12)-1)}   // tunes.json style: f#4, bb4
const nameOf=(fam,s)=>spell(fam,midiOf(fam,s));
const fileOf=(fam,s)=>nameOf(fam,s).replace('#','s');                   // music/notes/<fam>_<file>
const colOf=n=>{const k=n.replace(/\d+$/,'');const i=COLS.indexOf(k);return i>=0?i:COLS.indexOf(k[0])};
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
// seeded scale walk over the tier's pads: a window of <= 4 neighbouring pads around do, mostly steps, ends home on do (B phrases end open)
function gen(fam,tier,len,seed,d){const D=d||DATA,V=V2(D),r=rng(seed),pads=padsFor(fam,tier,D),i0=pads.indexOf(0),w=Math.min(V.max_distinct,pads.length);
  const lo=Math.max(0,i0-w+1),hi=Math.min(i0,pads.length-w),ws=lo+Math.floor(r()*(hi-lo+1)),pool=pads.slice(ws,ws+w),d0=pool.indexOf(0),top=pool.length-1;
  const near=i=>pool[i>0&&(i>=top||r()<.5)?i-1:i+1];
  function walk(n,home,from){let i=from,o=[pool[i]];const M=[-1,1,-1,1,0,2,-2];
    for(let k=1;k<n;k++){let j;do{j=Math.max(0,Math.min(top,i+M[Math.floor(r()*M.length)]))}while(top>0&&j===i&&o.length>1&&o[o.length-1]===o[o.length-2]);i=j;o.push(pool[i])}
    if(home){o[n-1]=0;if(n>=3&&Math.abs(pool.indexOf(o[n-2])-d0)>1)o[n-2]=near(d0)}else if(o[n-1]===0)o[n-1]=near(d0);
    if(n>=2&&top>0&&o.every(x=>x===o[0]))o[0]=near(pool.indexOf(o[0]));return o}
  const P=phrasesFor(len,D);let steps,phrases=null;
  if(!P)steps=walk(len,true,Math.floor(r()*pool.length));
  else{const A=walk(P.sizes[P.labels.indexOf('A')],true,Math.floor(r()*pool.length));let B,g=0;
    do{B=walk(P.sizes[P.labels.indexOf('B')],false,pool.indexOf(near(d0)))}while(g++<8&&eq(B,A.slice(0,B.length)));
    steps=[];phrases=[];P.labels.forEach(l=>{const q=l==='A'?A:B;phrases.push([steps.length,steps.length+q.length]);steps.push(...q)})}
  const ticks=steps.map(()=>TPB);
  if(tier>=4&&len<=V.rhythm_shown_to)for(let i=0;i<len-2;i++)if(r()<.2){ticks[i]=18;ticks[i+1]=6;i++}   // long-short, shown never matched
  const s=Song.fromSteps(V.tempo.bpm,steps,ticks);return Object.assign(s,{id:'g'+seed,phrases,labels:P?P.labels:null})}
const bpmAt=(step,bpm0,d)=>{const T=V2(d).tempo;return Math.min(T.bpm_max,Math.round(bpm0*(1+T.step*Math.min(T.max_steps,step||0))))};
const noteMs=(ticks,bpm,d)=>Math.max(V2(d).tempo.min_note_ms,ticks*60000/bpm/TPB);
const matchPhrased=rs=>rs.includes('new')?'new':rs.includes('close')?'close':'same';
// progress (per child, in the Songbook store): {band, len, roundsDone, tempoStep, speedRounds, seed}
const Progress={
  // the child's age band lives here too (Kai, Batch G): a changed age sets the length to that band's start, up or down
  get(b,kid,band,d){b.progress=b.progress||{};const p=b.progress[kid]=b.progress[kid]||{band,len:startLen(band,d),roundsDone:0,tempoStep:0,speedRounds:0,seed:0};
    if(band&&p.band!==band)Progress.setBand(p,band,d);return p},
  setBand(p,band,d){p.band=band;p.len=startLen(band,d);p.tempoStep=0;p.grew=0;return p},
  reset(b,kid,band,d){const o=(b.progress||{})[kid]||{};(b.progress=b.progress||{})[kid]={band,len:startLen(band,d),roundsDone:o.roundsDone||0,tempoStep:0,speedRounds:o.speedRounds||0,seed:o.seed||0};return b.progress[kid]},
  // a finished round: only a round with all 5 matched first try, played at the saved length, steps up (+len below 16, +tempo at 16)
  finish(p,o,band,d){const V=V2(d),was=p.len;p.grew=0;
    if(o.soft){p.tempoStep=Math.max(0,(p.tempoStep||0)-1);return p}
    p.roundsDone=(p.roundsDone||0)+1;if(p.tempoStep>0)p.speedRounds=(p.speedRounds||0)+1;
    if(o.perfect&&o.played===p.len){if(p.len<V.max_len){p.len=rampLen(p.len,band,d);p.grew=p.len-was}else p.tempoStep=Math.min(V.tempo.max_steps,(p.tempoStep||0)+1)}
    return p}};
function stickersFor(played,speedRounds,has,d){const out=[],S=V2(d).stickers;
  const L=S.find(x=>x.len&&x.len<=played&&!has(x.title));if(L)out.push(L.title);
  for(const x of S)if(x.speed_rounds&&speedRounds>=x.speed_rounds&&!has(x.title))out.push(x.title);return out}
// ---------------------------------------------------------------- Song v1 (lock 1) + Songbook store (lock 2, v:2 adds per-child progress)
const Song={v:1,tpb:TPB,
  make:(bpm,n)=>({v:1,bpm:bpm|0,tpb:TPB,n:n.map(x=>[x[0]|0,x[1]|0,Math.max(1,Math.min(255,x[2]|0))])}),
  fromSteps:(bpm,steps,ticks)=>Song.make(bpm,steps.map((s,i)=>{const [d,o]=fromStep(s);return [d,o,(ticks&&ticks[i])||TPB]})),
  valid:s=>!!s&&s.v===1&&s.tpb===TPB&&s.bpm>=40&&s.bpm<=200&&Array.isArray(s.n)&&s.n.every(x=>x.length===3&&x[0]>=0&&x[0]<=7&&x[1]>=-1&&x[1]<=2&&x[2]>=1&&x[2]<=255),
  // 2 bytes a note (ESP32 /songbook.bin): b0 = degree | (octave+1)<<3, b1 = ticks; 4-byte header v, bpm, count lo, count hi
  pack(s){const b=new Uint8Array(4+2*s.n.length);b[0]=s.v;b[1]=s.bpm;b[2]=s.n.length&255;b[3]=s.n.length>>8;
    s.n.forEach((x,i)=>{b[4+2*i]=(x[0]&7)|(((x[1]+1)&7)<<3);b[5+2*i]=x[2]});return b},
  unpack(b){const n=[],len=b[2]|(b[3]<<8);for(let i=0;i<len;i++){const x=b[4+2*i];n.push([x&7,((x>>3)&7)-1,b[5+2*i]])}return {v:b[0],bpm:b[1],tpb:TPB,n}}};
const Songbook={KEY:'echo-songbook-v1',   // key kept from v1 (store v:2 inside); beside the Echo save: survives a release and a new Echo; only "Start over" (erase all) removes it
  schema:{v:2,slots:6,songs:'[{id, made: ms, fam, inst, song: Song v1}] (at most slots)',star:'song id | null (Echo\'s Song, piece 3)',progress:'{[child id]: {band, len, roundsDone, tempoStep, speedRounds, seed}} (age band + Echo It Back v2)'},
  empty:()=>({v:2,slots:6,songs:[],star:null,progress:{}}),
  migrate(j){if(!j||!Array.isArray(j.songs))return null;if(j.v===1)return Object.assign({},j,{v:2,progress:{}});if(j.v===2){j.progress=j.progress||{};return j}return null},   // v1 -> v2: songs kept, empty progress
  load(){let j=null;try{j=JSON.parse(localStorage.getItem(Songbook.KEY)||'null')}catch(e){}const m=Songbook.migrate(j);if(!m)return Songbook.empty();if(j.v===1)Songbook.save(m);return m},
  save(b){try{localStorage.setItem(Songbook.KEY,JSON.stringify(b));return true}catch(e){return false}},
  clear(){try{localStorage.removeItem(Songbook.KEY)}catch(e){}}};
// ---------------------------------------------------------------- data
EB.ready=(W.fetch&&W.document)?Promise.all([fetch('music/tunes.json').then(r=>r.json()).then(j=>{DATA=j.echo_it_back||null}),
  fetch('music/instruments.json').then(r=>r.json()).then(j=>{INST=j})]).catch(()=>{}):Promise.resolve();
EB.setData=(eib,inst)=>{DATA=eib;if(inst)INST=inst};
// ---------------------------------------------------------------- voices (cap from instruments.json, 3 on the speaker)
const voices=[];
function play(fam,s,o){o=o||{};if(!W.Music||!Music.oneShot)return;const I=(INST&&INST.instruments&&INST.instruments[o.inst||INST.default])||{sample:'notes/{fam}_{note}',gain:.5};
  if(!I.sample)return;const cap=(INST&&INST.voices)||3;
  const p=Music.oneShot(I.sample.replace('{fam}',fam).replace('{note}',fileOf(fam,s)),{vol:(o.vol||1)*(I.gain||.5)});
  if(p&&p.then)p.then(src=>{if(!src)return;voices.push(src);while(voices.length>cap){const v=voices.shift();try{v.stop()}catch(e){}}
    src.onended=()=>{const i=voices.indexOf(src);if(i>=0)voices.splice(i,1)}})}
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
function noteHTML(fam,s,ticks,cls){const n=nameOf(fam,s);return `<i class="eibn${ticks>=18?' long':ticks<=6?' short':''}${cls?' '+cls:''}" style="--c:${colOf(n)}" data-note="${n}"></i>`}
const dotsHTML=n=>`<span class="eibdots" style="--n:${Math.min(8,n)}">${'<i></i>'.repeat(n)}</span>`;   // lengths are dots, never numbers
// api: {gs, fam, tier, lowfx, state, save, line, talk, react, band, kid, mode:'play'|'invite', color, hasSticker(t), onSticker(t,{fam,song}), onTune(r), onRound(info), onDone(finished)}
function start(api){stop();const fam=api.fam,tier=Math.max(1,Math.min(4,api.tier|0)),RM=!!api.lowfx,st=api.state||{},V=DATA.v2,band=api.band||'7-8',kid=api.kid||'kid';
  st.rounds=st.rounds||0;st.heard=st.heard||[];
  const book=Songbook.load(),P=Progress.get(book,kid,band);Songbook.save(book);
  const tok=++TOK,later=(ms,f)=>{const t=tok;return setTimeout(()=>{if(t===TOK)f()},ms)};
  const pads=padsFor(fam,tier),tunes=tunesFor(fam,tier);
  const root=document.createElement('div');root.className='eib'+(RM?' rm':'');root.id='eib';if(api.color)api.gs.style.setProperty('--ec',api.color);
  root.innerHTML=`<div class="eibbeads" aria-hidden="true">${'<i></i>'.repeat(V.round)}</div>
    <div class="eibstrip" aria-live="polite"><div class="eibslots" aria-hidden="true"></div><div class="eibrow eibask" aria-label="The Echo's tune"></div><div class="eibrow eibans" aria-label="Your tune"></div><i class="eibspark"></i><i class="eibpuff"></i></div>
    <div class="eibpads listen" role="group" aria-label="Notes">${pads.map((s,i)=>{const n=nameOf(fam,s);return `<button class="eibpad" data-pad="${s}" style="--c:${colOf(n)};--i:${i}" aria-label="Note ${n.replace(/\d/,'').toUpperCase().replace('#',' sharp').replace(/^(.)B$/,'$1 flat')}"></button>`}).join('')}</div>
    <div class="eibtiles" hidden></div>`;
  api.gs.appendChild(root);if(RM)api.gs.classList.add('eibrm');const ask=root.querySelector('.eibask'),ans=root.querySelector('.eibans'),padBox=root.querySelector('.eibpads'),spark=root.querySelector('.eibspark'),
    beads=[...root.querySelectorAll('.eibbeads i')],slots=root.querySelector('.eibslots'),puff=root.querySelector('.eibpuff'),tiles=root.querySelector('.eibtiles');
  const padEl=s=>padBox.querySelector(`[data-pad="${s}"]`);
  const light=(s,ms)=>{const p=padEl(s);if(!p)return;p.classList.add('on');setTimeout(()=>p.classList.remove('on'),ms||260)};
  const say=(k,ms)=>{const l=api.line&&api.line(k);if(l)api.talk(l,ms||2200)};
  const echoEl=()=>document.getElementById('cr');const saveBook=()=>Songbook.save(book);
  let phase='echo',tune=null,asked=[],answer=[],gapT=null,waitT=null,idles=0,retried=false,lastId=null,n=0,singing=0,R=null,curNotes=[],ph=-1,pres=[];
  function pick(len){const L=tunes.filter(u=>u.n.length===len&&u.id!==lastId);P.seed=(P.seed||0)+1;saveBook();
    if(L.length){const u=L[Math.floor(Math.random()*L.length)];lastId=u.id;return u}   // a hand-written tier tune when one has this length
    return gen(fam,tier,len,(P.seed*7919+kid.length*104729+tier)>>>0)}
  function sing(notes,bpm,done,o){o=o||{};phase=o.phase||'echo';padBox.classList.add('listen');padBox.classList.remove('turn');const k=msPerTick(bpm)*(o.slow?1.15:1);
    const row=o.row||ask;row.classList.toggle('many',notes.length>V.rhythm_shown_to);row.innerHTML=notes.map(x=>noteHTML(fam,step(x),notes.length>V.rhythm_shown_to?TPB:x[2])).join('');const els=[...row.children];
    const e=echoEl();if(e)e.classList.add('eibsing');let t=350;const my=++singing;
    notes.forEach((x,i)=>{const s=step(x),d=Math.max(V.tempo.min_note_ms,x[2]*k);later(t,()=>{play(fam,s,{vol:o.soft?.8:1});light(s,Math.min(420,d*.8));els.forEach(z=>z.classList.remove('lit'));if(els[i])els[i].classList.add('lit')});t+=d});
    later(t+250,()=>{if(my===singing){els.forEach(z=>z.classList.remove('lit'));const e2=echoEl();if(e2)e2.classList.remove('eibsing')}done&&done()})}
  function yourTurn(){phase='child';answer=[];ans.innerHTML='';padBox.classList.remove('listen');padBox.classList.add('turn');if(ph<=0)say('eib_your_turn',1500);
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
    if(retried){if(r==='same'){sparkle('big');say('eib_same')}later(r==='same'?2400:700,nextTune);return}   // the one more go after a close is just for fun
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
  function tuneDone(r){api.onTune&&api.onTune(r);
    if(r!=='new'){R.matches++;R.missRun=0;R.last=tune;beads.forEach((b,i)=>b.classList.toggle('on',i<R.matches))}
    else{R.perfect=false;R.missRun++;if(R.missRun>=V.eased_after_misses&&R.len>V.min_len){R.len--;R.eased=true;R.missRun=0;R.sayLittle=true}}}   // 2 misses in a row: one note shorter (this round only)
  function nextTune(){if(R.matches>=V.round)return roundEnd();if(R.tunes>=V.soft_stop_tunes)return softStop();
    R.tunes++;retried=false;ph=-1;pres=[];const t=pick(R.len);tune=Object.assign({},t,{bpm:bpmAt(P.tempoStep,t.bpm)});ans.innerHTML='';
    slots.innerHTML=tune.phrases?tune.labels.map((l,i)=>`<i class="${tune.labels.indexOf(l)<i?'rep':''}"></i>`).join(''):'';
    let k='eib_my_turn';if(R.tunes===1&&R.intro)k=R.intro;else if(R.sayLittle){R.sayLittle=false;k='eib_little'}
    if(tune.phrases&&!st.saidBreath){st.saidBreath=1;api.save&&api.save();k='eib_breath'}
    say(k,1600);if(tune.phrases)return later(1500,()=>phrase(0));
    curNotes=tune.n;asked=norm(tune.n);later(900,()=>sing(tune.n,tune.bpm,yourTurn))}
  // ---- round end: the duet (last matched tune, pads + Echo lit), "Five! We sang five!", progress, stickers, then Home
  function roundEnd(){phase='end';const t=R.last,was=P.len;padBox.classList.add('duet');root.classList.add('duet');
    sing(t.n,t.bpm,()=>{phase='end';padBox.classList.remove('duet');root.classList.remove('duet');api.react&&api.react('delighted');say('eib_five',2400);
      Progress.finish(P,{perfect:R.perfect&&!R.eased,played:R.played},band);
      const got=stickersFor(t.n.length,P.speedRounds||0,api.hasSticker||(()=>true));saveBook();
      got.forEach(title=>api.onSticker&&api.onSticker(title,{fam,song:Song.make(t.bpm,t.n)}));
      const lines=[];if(got.length)lines.push('eib_sticker');if(was<V.max_len&&P.len>=V.max_len)lines.push('eib_sixteen');
      api.onRound&&api.onRound({finished:true,perfect:R.perfect,len:R.played,grew:P.grew||0,stickers:got});
      let w=2600;lines.forEach(k=>{later(w,()=>say(k,2400));w+=2600});later(w,()=>{phase='done';api.onDone&&api.onDone(true)})},{phase:'end'})}
  function softStop(){phase='end';say('eib_rest_ears',2400);Progress.finish(P,{soft:true},band);saveBook();
    api.onRound&&api.onRound({finished:true,soft:true});later(2600,()=>{phase='done';api.onDone&&api.onDone(true)})}   // counts as finished, takes one speed step back
  function newRound(len,little){tiles.hidden=true;tiles.innerHTML='';
    R={len,played:len,little,matches:0,tunes:0,missRun:0,perfect:!little,eased:false,last:null,sayLittle:false,
      intro:P.tempoStep>0?'eib_zippy':little?'eib_little':P.grew>=2?'eib_more2':P.grew===1?'eib_more1':null};
    beads.forEach(b=>b.classList.remove('on'));
    // opening: hello the first time; a new note (tier unlock) is played once on its own before the first tune
    const fresh=pads.filter(s=>!st.heard.includes(s));
    if(!st.heard.length){st.heard=pads.slice();say('eib_hello',2600);later(2200,nextTune)}
    else if(fresh.length){st.heard=st.heard.concat(fresh);say('eib_new_note',2200);let t=900;fresh.forEach(s=>{later(t,()=>{play(fam,s);light(s,500)});t+=700});later(t+700,nextTune)}
    else nextTune();api.save&&api.save()}
  // start tiles (from the Play list, once a round has been sung): big "Same as last time" (default) + small "A little one" (-2, this round only)
  function showTiles(){const lit=Math.max(V.min_len,P.len-V.little_minus);phase='tiles';
    tiles.innerHTML=`<button class="eibtile big" id="eibsame" aria-label="Same as last time">${dotsHTML(P.len)}<span>Same as last time</span></button>`+
      (lit<P.len?`<button class="eibtile small" id="eiblittle" aria-label="A little one">${dotsHTML(lit)}<span>A little one</span></button>`:'');
    tiles.hidden=false;tiles.querySelector('#eibsame').onclick=()=>newRound(P.len,false);const b=tiles.querySelector('#eiblittle');if(b)b.onclick=()=>newRound(lit,true)}
  const input=PadInput(padBox,{down(s){play(fam,s);const p=padEl(s);if(p)p.classList.add('on');
      if(phase!=='child')return;answer.push({s,t:Date.now()});ans.insertAdjacentHTML('beforeend',noteHTML(fam,s,TPB,'lit'));const kids=ans.children;if(kids.length>1)kids[kids.length-2].classList.remove('lit');
      clearTimeout(waitT);clearTimeout(gapT);
      if(answer.length>=asked.length+DATA.timing.extra_notes)return finish();
      gapT=later(eq(asked,answer.map(a=>a.s))?900:DATA.timing.answer_gap_ms,finish)},
    up(s){const p=padEl(s);if(p)setTimeout(()=>p.classList.remove('on'),120)}});
  cur={root,input,api,get phase(){return phase},get asked(){return asked},get tune(){return tune},get round(){return R},get progress(){return P},get phraseIdx(){return ph},finish,lastCopy:null};
  if(api.mode==='invite'||!P.roundsDone)newRound(P.len,false);else showTiles();
  api.save&&api.save();return cur}
// grown-ups + age band hooks (game.js) and the Memory Book sticker tune
EB.progressFor=(kid,band)=>{const b=Songbook.load(),p=Progress.get(b,kid,band);Songbook.save(b);return p};
EB.setBand=(kid,band)=>{const b=Songbook.load();b.progress=b.progress||{};const p=b.progress[kid];if(p)Progress.setBand(p,band);else Progress.get(b,kid,band);Songbook.save(b);return b.progress[kid]};
EB.bandOf=kid=>{const p=(Songbook.load().progress||{})[kid];return p&&p.band||null};
EB.resetProgress=(kid,band)=>{const b=Songbook.load(),p=Progress.reset(b,kid,band);Songbook.save(b);return p};
EB.playSong=(fam,song)=>{if(!Song.valid(song))return 0;const k=msPerTick(song.bpm);let t=0;song.n.forEach(x=>{if(x[0]){const s=step(x);setTimeout(()=>play(fam,s,{vol:.8}),t)}t+=Math.max(DATA?V2().tempo.min_note_ms:120,x[2]*k)});return t};
function stop(){TOK++;if(cur){cur.input.off();if(cur.root.parentNode)cur.root.remove();cur=null}voices.splice(0).forEach(v=>{try{v.stop()}catch(e){}})}
// ---------------------------------------------------------------- the Echo-started invite: a note chip by the Echo, gone after 10 s, never repeated
function invite(host,onYes,o){if(!host)return null;o=o||{};const b=document.createElement('button');b.className='eibinv'+(o.lowfx?' rm':'');b.setAttribute('aria-label','Sing with me');
  host.appendChild(b);const ms=(DATA&&DATA.timing.invite_fade_ms)||10000;let done=false;
  const t=setTimeout(()=>{if(done)return;done=true;b.classList.add('fade');setTimeout(()=>b.remove(),o.lowfx?0:600)},ms);
  b.onclick=e=>{e.stopPropagation();if(done)return;done=true;clearTimeout(t);b.remove();onYes&&onYes()};return b}
Object.assign(EB,{start,stop,invite,matchTune,padsFor,tunesFor,nameOf,fileOf,colOf,midiOf,step,fromStep,Song,Songbook,PadInput,Progress,gen,
  _pure:{matchTune,contour,norm,step,fromStep,spell,padsFor,tunesFor,Song,startLen,rampLen,phrasesFor,gen,bpmAt,noteMs,matchPhrased,Progress,stickersFor,rng}});
Object.defineProperties(EB,{cur:{get:()=>cur},data:{get:()=>DATA},inst:{get:()=>INST}});   // live getters (Object.assign would copy today's value)
W.EchoBack=EB;if(typeof module!=='undefined')module.exports=EB;
})(typeof window!=='undefined'?window:globalThis);
