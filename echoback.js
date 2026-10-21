// Echo It Back (Batch F = music Part B piece 1, phone). The Echo sings a tiny tune, the child sings it back on the pads.
// No fail state, ever: same -> sparkle + "Same! Again?"; close -> small sparkle + "Close! Like this:" and the Echo plays it again,
// warmly and a little slower; anything else -> the Echo copies the child back ("Ooh, a new one! My turn:"). Matching compares
// the degree order only (timing is shown at T4 but never matched): EchoBack.matchTune(asked, answered) -> 'same'|'close'|'new'.
// Data (no tune or timbre lives in code): music/tunes.json echo_it_back (degrees per tier), music/instruments.json (instruments).
// Locks for pieces 2-3 (Zane): Song v1 = degree + octave + ticks with a version field (EchoBack.Song, 2 bytes a note when packed);
// the Songbook store 'echo-songbook-v1' is separate from the Echo save (schema + load/save only; nothing writes it yet);
// PadInput tracks one pad per pointerId (several fingers, slide-to-next-pad) with a 3-voice cap; instruments come from data.
(function(W){'use strict';
const EB={title:'Echo It Back',v:1};const MAJ=[0,2,4,5,7,9,11],TPB=12;
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
// ---------------------------------------------------------------- Song v1 (lock 1) + Songbook store stub (lock 2)
const Song={v:1,tpb:TPB,
  make:(bpm,n)=>({v:1,bpm:bpm|0,tpb:TPB,n:n.map(x=>[x[0]|0,x[1]|0,Math.max(1,Math.min(255,x[2]|0))])}),
  fromSteps:(bpm,steps,ticks)=>Song.make(bpm,steps.map((s,i)=>{const [d,o]=fromStep(s);return [d,o,(ticks&&ticks[i])||TPB]})),
  valid:s=>!!s&&s.v===1&&s.tpb===TPB&&s.bpm>=40&&s.bpm<=200&&Array.isArray(s.n)&&s.n.every(x=>x.length===3&&x[0]>=0&&x[0]<=7&&x[1]>=-1&&x[1]<=2&&x[2]>=1&&x[2]<=255),
  // 2 bytes a note (ESP32 /songbook.bin): b0 = degree | (octave+1)<<3, b1 = ticks; 4-byte header v, bpm, count lo, count hi
  pack(s){const b=new Uint8Array(4+2*s.n.length);b[0]=s.v;b[1]=s.bpm;b[2]=s.n.length&255;b[3]=s.n.length>>8;
    s.n.forEach((x,i)=>{b[4+2*i]=(x[0]&7)|(((x[1]+1)&7)<<3);b[5+2*i]=x[2]});return b},
  unpack(b){const n=[],len=b[2]|(b[3]<<8);for(let i=0;i<len;i++){const x=b[4+2*i];n.push([x&7,((x>>3)&7)-1,b[5+2*i]])}return {v:b[0],bpm:b[1],tpb:TPB,n}}};
const Songbook={KEY:'echo-songbook-v1',   // lives beside the Echo save: survives a release and a new Echo; only "Start over" (erase all) removes it
  schema:{v:1,slots:6,songs:'[{id, made: ms, fam, inst, song: Song v1}] (at most slots)',star:'song id | null (Echo\'s Song, piece 3)'},
  empty:()=>({v:1,slots:6,songs:[],star:null}),
  load(){try{const j=JSON.parse(localStorage.getItem(Songbook.KEY)||'null');if(j&&j.v===1&&Array.isArray(j.songs))return j}catch(e){}return Songbook.empty()},
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
function start(api){stop();const fam=api.fam,tier=Math.max(1,Math.min(4,api.tier|0)),RM=!!api.lowfx,st=api.state||{};
  st.rounds=st.rounds||0;st.heard=st.heard||[];
  const tok=++TOK,later=(ms,f)=>{const t=tok;return setTimeout(()=>{if(t===TOK)f()},ms)};
  const pads=padsFor(fam,tier),tunes=tunesFor(fam,tier);
  const root=document.createElement('div');root.className='eib'+(RM?' rm':'');root.id='eib';
  root.innerHTML=`<div class="eibstrip" aria-live="polite"><div class="eibrow eibask" aria-label="The Echo's tune"></div><div class="eibrow eibans" aria-label="Your tune"></div><i class="eibspark"></i></div>
    <div class="eibpads listen" role="group" aria-label="Notes">${pads.map((s,i)=>{const n=nameOf(fam,s);return `<button class="eibpad" data-pad="${s}" style="--c:${colOf(n)};--i:${i}" aria-label="Note ${n.replace(/\d/,'').toUpperCase().replace('#',' sharp').replace(/^(.)B$/,'$1 flat')}"></button>`}).join('')}</div>`;
  api.gs.appendChild(root);if(RM)api.gs.classList.add('eibrm');const ask=root.querySelector('.eibask'),ans=root.querySelector('.eibans'),padBox=root.querySelector('.eibpads'),spark=root.querySelector('.eibspark');
  const padEl=s=>padBox.querySelector(`[data-pad="${s}"]`);
  const light=(s,ms)=>{const p=padEl(s);if(!p)return;p.classList.add('on');setTimeout(()=>p.classList.remove('on'),ms||260)};
  const say=(k,ms)=>{const l=api.line&&api.line(k);if(l)api.talk(l,ms||2200)};
  const echoEl=()=>document.getElementById('cr');
  let phase='echo',tune=null,asked=[],answer=[],gapT=null,waitT=null,idles=0,retried=false,lastId=null,n=0,singing=0;
  function pick(){const L=tunes.filter(u=>u.id!==lastId);const u=L[Math.floor(Math.random()*L.length)]||tunes[0];lastId=u.id;return u}
  function sing(notes,bpm,done,o){o=o||{};phase='echo';padBox.classList.add('listen');padBox.classList.remove('turn');const k=msPerTick(bpm)*(o.slow?1.15:1);
    const row=o.row||ask;row.innerHTML=notes.map(x=>noteHTML(fam,step(x),x[2])).join('');const els=[...row.children];
    const e=echoEl();if(e)e.classList.add('eibsing');let t=350;const my=++singing;
    notes.forEach((x,i)=>{const s=step(x),d=x[2]*k;later(t,()=>{play(fam,s,{vol:o.soft?.8:1});light(s,Math.min(420,d*.8));els.forEach(z=>z.classList.remove('lit'));if(els[i])els[i].classList.add('lit')});t+=d});
    later(t+250,()=>{if(my===singing){els.forEach(z=>z.classList.remove('lit'));const e2=echoEl();if(e2)e2.classList.remove('eibsing')}done&&done()})}
  function yourTurn(){phase='child';answer=[];ans.innerHTML='';padBox.classList.remove('listen');padBox.classList.add('turn');say('eib_your_turn',1500);
    clearTimeout(waitT);waitT=later(DATA.timing.answer_wait_ms,idle)}
  function idle(){if(phase!=='child'||answer.length)return;idles++;
    if(idles===1){say('eib_again',2000);later(1300,()=>sing(tune.n,tune.bpm,yourTurn,{slow:true,soft:true}))}
    else{say('eib_rest',3000)}}   // after that the Echo just waits: no reminders; any tap is an answer
  function finish(){clearTimeout(gapT);clearTimeout(waitT);if(phase!=='child'||!answer.length)return;phase='react';padBox.classList.remove('turn');
    const r=matchTune(asked,answer.map(a=>a.s));n++;st.rounds++;st.last={tune:tune.id,r};api.onRound&&api.onRound(n,r);idles=0;
    if(r==='same'){sparkle('big');api.react&&api.react('happy');say('eib_same');later(2600,round)}
    else if(r==='close'){sparkle('small');say('eib_close',1800);later(1400,()=>sing(tune.n,tune.bpm,()=>{if(!retried){retried=true;asked=norm(tune.n);yourTurn()}else later(700,round)},{slow:true,soft:true}))}
    else{api.react&&api.react('delighted');say('eib_new',1800);const cp=copyBack(answer,tune.bpm);cur.lastCopy=cp;later(1400,()=>sing(cp.n,cp.bpm,()=>later(900,round),{row:ans}))}}
  function copyBack(a,bpm){const k=msPerTick(bpm);const ticks=a.map((x,i)=>i<a.length-1?Math.max(6,Math.min(24,Math.round((a[i+1].t-x.t)/k/6)*6)):TPB);return Song.fromSteps(bpm,a.map(x=>x.s),ticks)}
  function sparkle(size){spark.className='eibspark '+size;void spark.offsetWidth;spark.classList.add('go');setTimeout(()=>{spark.className='eibspark'},RM?500:900)}
  function round(){retried=false;tune=pick();asked=norm(tune.n);ans.innerHTML='';say('eib_my_turn',1400);later(900,()=>sing(tune.n,tune.bpm,yourTurn))}
  const input=PadInput(padBox,{down(s){play(fam,s);const p=padEl(s);if(p)p.classList.add('on');
      if(phase!=='child')return;answer.push({s,t:Date.now()});ans.insertAdjacentHTML('beforeend',noteHTML(fam,s,TPB,'lit'));const kids=ans.children;if(kids.length>1)kids[kids.length-2].classList.remove('lit');
      clearTimeout(waitT);clearTimeout(gapT);
      if(answer.length>=asked.length+DATA.timing.extra_notes)return finish();
      gapT=later(eq(asked,answer.map(a=>a.s))?900:DATA.timing.answer_gap_ms,finish)},
    up(s){const p=padEl(s);if(p)setTimeout(()=>p.classList.remove('on'),120)}});
  cur={root,input,api,get phase(){return phase},get asked(){return asked},get tune(){return tune},finish,lastCopy:null};
  // opening: hello the first time; a new note (tier unlock) is played once on its own before the first tune
  const fresh=pads.filter(s=>!st.heard.includes(s));
  if(!st.heard.length){st.heard=pads.slice();say('eib_hello',2600);later(2200,round)}
  else if(fresh.length){st.heard=st.heard.concat(fresh);say('eib_new_note',2200);let t=900;fresh.forEach(s=>{later(t,()=>{play(fam,s);light(s,500)});t+=700});later(t+700,round)}
  else round();
  api.save&&api.save();return cur}
function stop(){TOK++;if(cur){cur.input.off();if(cur.root.parentNode)cur.root.remove();cur=null}voices.splice(0).forEach(v=>{try{v.stop()}catch(e){}})}
// ---------------------------------------------------------------- the Echo-started invite: a note chip by the Echo, gone after 10 s, never repeated
function invite(host,onYes,o){if(!host)return null;o=o||{};const b=document.createElement('button');b.className='eibinv'+(o.lowfx?' rm':'');b.setAttribute('aria-label','Sing with me');
  host.appendChild(b);const ms=(DATA&&DATA.timing.invite_fade_ms)||10000;let done=false;
  const t=setTimeout(()=>{if(done)return;done=true;b.classList.add('fade');setTimeout(()=>b.remove(),o.lowfx?0:600)},ms);
  b.onclick=e=>{e.stopPropagation();if(done)return;done=true;clearTimeout(t);b.remove();onYes&&onYes()};return b}
Object.assign(EB,{start,stop,invite,matchTune,padsFor,tunesFor,nameOf,fileOf,colOf,midiOf,step,fromStep,Song,Songbook,PadInput,
  _pure:{matchTune,contour,norm,step,fromStep,spell,padsFor,tunesFor,Song}});
Object.defineProperties(EB,{cur:{get:()=>cur},data:{get:()=>DATA},inst:{get:()=>INST}});   // live getters (Object.assign would copy today's value)
W.EchoBack=EB;if(typeof module!=='undefined')module.exports=EB;
})(typeof window!=='undefined'?window:globalThis);
