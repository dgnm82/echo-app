(()=>{
const C=window.CONFIG, CR=window.CREATURES, $=s=>document.querySelector(s);
const app=$('#app'), ov=$('#overlay');
const KEY='echo-proto-v1';
let S=load(), sess={feeds:0,games:0,naps:0,chats:0};
const rnd=(seed)=>()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
function load(){try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}}
function save(){if(S&&!window.__wiped){S.last=now();localStorage.setItem(KEY,JSON.stringify(S))}}
function E(){return CR[S.kind]}
function say(t){try{if(S&&S.voice&&window.speechSynthesis){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t.replace(/\(.*?\)/g,''));u.rate=S.kind==='owl'?.85:1.15;u.pitch=S.kind==='owl'?.8:1.4;speechSynthesis.speak(u)}}catch(e){}}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('on'),2200)}
function h(html){app.innerHTML=html}
function full(html){const d=document.createElement('div');d.className='full';d.innerHTML=html;document.body.appendChild(d);return d}
const now=()=>Date.now()+((S&&S.clockOffset)||0);
const clamp=v=>Math.max(0,Math.min(100,v));

// ---------- unique creature generation (§7) ----------
function genEcho(kind){
  const seed=Math.floor(Math.random()*2e9)+1, r=rnd(seed), pick=a=>a[Math.floor(r()*a.length)];
  const cr=CR[kind];
  const coats=kind==='fox'?['#e8772e','#d9622b','#c9853f','#b5533a','#e39a52']:['#8a6f5a','#a08670','#6f6a80','#b49a7a','#7d6150'];
  return {seed, coat:pick(coats), accent:pick(['#fff4e0','#ffe9c7','#f3efe6']), eye:pick(['#3a2a1a','#2b5d3a','#e0a020','#3b4fa0']),
    marking:pick(['star','stripe','spot','none']), quirk:pick(cr.quirks), fav:pick(cr.foods),
    playful:+(0.5+r()*0.5).toFixed(2), name:null};
}
function svg(kind,g,mood){
  const eyes=mood==='sleep'?`<path d="M78 92q8 6 16 0M126 92q8 6 16 0" stroke="#222" stroke-width="4" fill="none"/>`
    :`<circle cx="86" cy="92" r="9" fill="${g.eye}"/><circle cx="134" cy="92" r="9" fill="${g.eye}"/><circle cx="89" cy="89" r="3" fill="#fff"/><circle cx="137" cy="89" r="3" fill="#fff"/>`;
  const mk=g.marking==='star'?`<path d="M110 52l4 9 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="${g.accent}"/>`:g.marking==='stripe'?`<rect x="104" y="48" width="12" height="30" rx="6" fill="${g.accent}"/>`:g.marking==='spot'?`<circle cx="150" cy="150" r="12" fill="${g.accent}"/>`:'';
  if(kind==='fox') return `<svg viewBox="0 0 220 220"><path d="M170 170q50-20 30-70q-10 40-40 50z" fill="${g.coat}"/><path d="M196 104q8 10 4 22q-10-4-12-16z" fill="${g.accent}"/>
   <ellipse cx="110" cy="165" rx="55" ry="45" fill="${g.coat}"/><ellipse cx="110" cy="175" rx="28" ry="30" fill="${g.accent}"/>
   <path d="M60 70l10-50 30 35zM160 70l-10-50-30 35z" fill="${g.coat}"/><path d="M68 60l5-28 16 20zM152 60l-5-28-16 20z" fill="#5a2d1a"/>
   <path d="M55 80q55-50 110 0q5 50-55 60q-60-10-55-60z" fill="${g.coat}"/><path d="M80 112q30 30 60 0q-10 26-30 26q-20 0-30-26z" fill="${g.accent}"/>
   ${mk}${eyes}<ellipse cx="110" cy="116" rx="7" ry="5" fill="#222"/>${mood==='happy'?'<path d="M100 124q10 8 20 0" stroke="#222" stroke-width="3" fill="none"/>':''}</svg>`;
  return `<svg viewBox="0 0 220 220"><ellipse cx="110" cy="140" rx="65" ry="72" fill="${g.coat}"/><ellipse cx="110" cy="160" rx="40" ry="45" fill="${g.accent}" opacity=".8"/>
   <path d="M150 120q30 30 10 80q-20-20-20-60zM70 120q-30 30-10 80q20-20 20-60z" fill="${g.coat}" filter="brightness(.8)"/>
   <path d="M60 60l12 22 18-12zM160 60l-12 22-18-12z" fill="${g.coat}"/>${mk}
   <circle cx="86" cy="92" r="22" fill="${g.accent}"/><circle cx="134" cy="92" r="22" fill="${g.accent}"/>${eyes}
   <path d="M104 104l6 14 6-14z" fill="#e0a020"/><path d="M90 210h12M118 210h12" stroke="#e0a020" stroke-width="6" stroke-linecap="round"/></svg>`;
}
function mood(){const n=S.needs;const m=Math.min(n.food,n.play,n.rest,n.comfort);return S.napUntil>now()?'sleep':m>60?'happy':'ok'}
function want(){const n=S.needs;const e=[['food','🍎'],['play','⚽'],['rest','🛏️'],['comfort','💗']].sort((a,b)=>n[a[0]]-n[b[0]])[0];return n[e[0]]<60?e[1]:null}

// ---------- time model (§5.1) ----------
function simulate(){
  if(!S||!S.last)return; let hrs=(now()-S.last)/36e5; if(hrs<0)hrs=0; hrs=Math.min(hrs,C.maxDecayHours);
  for(const k in C.decayPerHour)S.needs[k]=clamp(S.needs[k]-C.decayPerHour[k]*hrs);
  const today=new Date(now()).toDateString(); if(S.lastHello!==today){S.lastHello=today;addBond(C.bond.hello,true);S.days=(S.days||0)+1}
}
function addBond(n,silent){
  const before=S.bond; S.bond=Math.min(500,S.bond+Math.round(n*C.demoSpeed));
  if(S.badges===undefined)S.badges=[];
  for(const m of C.milestones){ if(before<m.bond&&S.bond>=m.bond&&!S.badges.includes(m.id)){S.badges.push(m.id);queueMilestone(m)} }
  save(); if(!silent)renderBadge();
}
let mq=[];function queueMilestone(m){mq.push(m)}
function flushMilestones(){
  if(!mq.length||document.querySelector('.full')||!document.getElementById('feed'))return; const m=mq.shift(), e=E(); let title='',line='';
  const ti=['talent1','talent2','talent3','talent4'].indexOf(m.id);
  if(ti>=0){const t=e.talents[ti];S.talents.push(t);title=`Talent: ${t}!`;line=talentLine(t);}
  else if(m.id==='name'){title='A new friend!';line=`${S.g.name} gives you a ${e.treasure} it was saving. "For you. Don\'t tell anyone. Okay, you can tell people."`;S.treasures.push(e.treasure)}
  else if(m.id==='place'){title='Favorite place!';line=`${S.g.name} shows you its ${e.place}. Naps there are extra cozy now.`}
  else if(m.id==='trust'){title='Trust gesture';line=`${S.g.name} ${e.trust}.`}
  else if(m.id==='ready'){title='Ready for the wild';line=e.ready}
  S.stickers.push(title);save();
  const d=full(`<div style="font-size:64px">${ti>=0?'✨':'🌟'}</div><h1>${title}</h1><div style="width:160px">${svg(S.kind,S.g,'happy')}</div><p>${line}</p><p style="font-size:14px;opacity:.7">Sticker added to your Memory Book</p><button class="btn">Yay!</button>`);
  say(line); d.querySelector('button').onclick=()=>{d.remove();home();setTimeout(flushMilestones,300)};
}
function talentLine(t){return ({'Radar Ears':'Wait… I can hear the treasure jingling! Since when?!','Master of Disguise':'Look! I\'m a bush! …You can still see me? Rude. Amazing, but rude.','Super Jumper':'I just jumped SO high I touched a cloud. Almost. Basically.','Riddle Solver':'Your turn to hide something. I bet I can find it. Probably.',
 'Night Vision':'Oh… I can see in the dark. Everything is softly glowing.','Silent Flight':'I flew across the whole room and… I couldn\'t hear myself. How odd. How lovely.','Super Radar Hearing':'Shh… I can hear a frog three gardens away.','Nightmare Banisher':'See that little gray cloud? Watch… (it turns into stars). There. I\'ll keep watch.'})[t]||t}

// ---------- screens ----------
function start(){
  if(!S)return setup();
  if(S.released)return afterHome();
  simulate();save();home(true);
}
function setup(){
  h(`<div class="full" style="position:relative;background:none"><div style="font-size:72px">🦊🦉</div><h1>Project Echo</h1><p>Prototype for playtesting. A grown-up sets this up.</p>
   <input id="nick" maxlength="12" placeholder="Child's nickname"><label style="font-size:16px"><input type="checkbox" id="voice" checked style="width:auto"> Read lines aloud</label>
   <button class="btn" id="go">Start ▶</button></div>`);
  $('#go').onclick=()=>{S={child:($('#nick').value||'friend').slice(0,12),voice:$('#voice').checked};discover()};
}
function discover(){
  h(`<div class="scene dusk"><div class="bubble">The meadow at dusk. Something is moving… Tap one!</div>
   <button class="spot" id="bush" style="left:12%;bottom:22%;width:120px;height:120px;font-size:80px">🌿</button>
   <button class="spot" id="tree" style="right:10%;bottom:28%;width:130px;height:160px;font-size:90px;border-radius:30px">🌳<span style="position:absolute;top:44%;font-size:20px">👀</span></button>
   <p style="position:absolute;bottom:4%;width:100%;text-align:center;opacity:.8">(Card scan is deferred in this web prototype)</p></div>`);
  let wig=setInterval(()=>{const b=$('#bush');if(!b)return clearInterval(wig);b.animate([{transform:'rotate(0)'},{transform:'rotate(-8deg)'},{transform:'rotate(8deg)'},{transform:'rotate(0)'}],{duration:500})},1500);
  $('#bush').onclick=()=>{clearInterval(wig);reveal('fox')};$('#tree').onclick=()=>{clearInterval(wig);reveal('owl')};
}
function reveal(kind){
  Object.assign(S,{kind,g:genEcho(kind),needs:{food:60,play:50,rest:80,comfort:60},bond:0,badges:[],talents:[],stickers:[],treasures:[],memories:[],foods:[],met:now(),days:1,lastHello:new Date().toDateString()});
  const e=E();
  h(`<div class="scene ${e.bg}"><div class="creature" id="cr" style="opacity:0;bottom:-30%">${svg(kind,S.g,'happy')}</div><div class="bubble" id="b" style="opacity:0"></div></div>`);
  setTimeout(()=>{const c=$('#cr');c.style.opacity=1;c.style.bottom='16%'},300);
  setTimeout(()=>{const b=$('#b');const l=kind==='fox'?`Psst! Hi! I'm Slyte! Not just any Slyte — me! I ${S.g.quirk}. Are we friends now?`:`Hoo… hello. I'm Whimber. I think I'm your Whimber. I ${S.g.quirk}. Hello…`;b.textContent=l;b.style.opacity=1;say(l);
    setTimeout(()=>{const names=kind==='fox'?['Pip','Ember','Scout','Rusty']:['Luna','Hoot','Willow','Pebble'];
      choices([['👋','Hi!',null],['🤗','Welcome',null],['🤫','Just smile',null]],(i)=>{
        let n=E().name; S.g.name=n; save();
        const l2=kind==='fox'?`Friends! Best friends! …Can I have a snack?`:`Hoo. I'm glad it's you.`;$('#b').textContent=l2;say(l2);
        S.memories.push(`The day we met in the dusk meadow`);
        setTimeout(()=>{home();toast('Tip: tap the buttons below to care for '+n)},2200);
      })},1800)},2200);
}
function renderBadge(){const el=$('#bond');if(el)el.innerHTML=`${E().badge}<span class="bar"><i style="width:${S.bond/5}%"></i></span>`}
function home(greet){
  ov.innerHTML='';
  const e=E(), m=mood(), w=want(), ready=S.badges.includes('ready');
  if(S.graceUntil&&now()>=S.graceUntil)return release(true);
  const graceDay=S.graceUntil?Math.floor((now()-(S.graceUntil-C.graceDays*864e5))/864e5)+1:0;
  h(`<div class="top"><button class="badge" id="bond" style="border:0;color:#fff"></button><b>${S.g.name}</b><div class="row"><button class="btn small" id="book">📖</button><button class="btn small" id="how">?</button></div></div>
   <div class="scene ${e.bg}" id="sc">${ready?`<div class="glowpath" id="path"></div><div style="position:absolute;right:4px;bottom:12%;font-size:22px;display:flex;flex-direction:column;pointer-events:none">${e.pathIcon.repeat(Math.max(1,graceDay))}</div>`:''}
   <div class="creature idle" id="cr">${svg(S.kind,S.g,m)}</div>${w&&m!=='sleep'?`<div class="thought">${w}</div>`:''}
   <div class="bubble" id="b" style="display:none"></div>
   ${ready?'<button class="btn" id="rel" style="position:absolute;right:10px;top:10px">🌲 Take home…</button>':''}</div>
   <div class="dock"><button class="btn" id="feed"><span class="ic">🍎</span>Feed</button><button class="btn" id="play"><span class="ic">🎲</span>Play</button><button class="btn" id="comfort"><span class="ic">💗</span>Comfort</button><button class="btn" id="rest"><span class="ic">🛏️</span>Rest</button></div>
   <div class="dbg"><button class="btn small" id="dbg" style="min-height:28px">dev</button></div>`);
  renderBadge();
  $('#feed').onclick=feed;$('#play').onclick=play;$('#comfort').onclick=comfort;$('#rest').onclick=rest;$('#book').onclick=book;$('#how').onclick=how;$('#dbg').onclick=dev;
  if(ready){$('#rel').onclick=()=>release(false);$('#path').onclick=()=>release(false)}
  // stroke to pet
  let strokes=0;$('#cr').addEventListener('pointermove',ev=>{if(ev.buttons||ev.pointerType==='touch'){strokes++;if(strokes%25===0)pet()}});
  $('#cr').addEventListener('click',pet);
  if(m==='sleep'){talk('Zzz… ('+S.g.name+' is napping. It\'ll wake soon.)');setTimeout(()=>{if(S.napUntil<=now())home()},Math.max(500,S.napUntil-now()+200));return}
  if(greet&&S.graceUntil&&graceDay>=C.graceDays&&S.lastDayLine!==graceDay){S.lastDayLine=graceDay;save();talk("Tomorrow I'll go home. Let's make today a really good one.")}
  else if(greet&&S.graceUntil){talk('Remember the first time we met in the dusk meadow? Last time we played my favorite game. Let\'s do it again!')}
  else if(greet){talk(e.hello[Math.floor(Math.random()*e.hello.length)])}
  else if(ready&&!sess.readyLine){sess.readyLine=1;talk(e.ready)}
  setTimeout(flushMilestones,400);
}
function talk(t,ms){const b=$('#b');if(!b)return;b.style.display='block';b.textContent=t;say(t);clearTimeout(talk.t);talk.t=setTimeout(()=>{if(b)b.style.display='none'},ms||Math.max(3000,t.length*70))}
function hop(){const c=$('#cr');if(!c)return;c.classList.remove('hop');void c.offsetWidth;c.classList.add('hop')}
function asleep(){if(S.napUntil>now()){toast('Shh… napping');return true}}
// two-tap reply choices (S9)
function choices(list,cb){
  let sel=-1;ov.innerHTML=`<div class="choices">${list.map((c,i)=>`<button class="btn" data-i="${i}"><span class="ic">${c[0]}</span>${c[1]}</button>`).join('')}<div class="hint">Tap to hear · tap again to choose</div></div>`;
  ov.querySelectorAll('button').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;if(sel===i){ov.innerHTML='';cb(i);return}sel=i;ov.querySelectorAll('button').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');say(list[i][1])});
}
function maybeChat(){
  const n=S.needs;
  if(S.badges.includes('ready')&&!S.graceUntil&&!sess.asked&&Math.min(n.food,n.play,n.rest,n.comfort)>=40){sess.asked=1;
    return setTimeout(()=>{if(!document.getElementById('feed')){sess.asked=0;return}talk(E().askReady,60000);choices([['🌲',"Let's go together",null],['🤗','Not yet',null]],i=>{
      S.releasePath='echo-asked';if(i===0)return release(false,true);
      S.graceUntil=now()+C.graceDays*864e5;S.releasePath=null;save();talk('I can stay a little longer. A few more days. Then I really should go live my wild life.');hop()})},1500)}
  if(sess.chats>=2||Math.random()<.35)return; sess.chats++; const e=E(); const c=e.chats[(S.chatIdx=(S.chatIdx||0)+1)%e.chats.length];
  setTimeout(()=>{if(!document.getElementById('feed')||document.querySelector('.full'))return;talk(c.q,60000);choices(c.c,i=>{talk(c.c[i][2]);addBond(C.bond.reply);if(i<c.c.length)S.memories.push(`You said "${c.c[i][1]}" when I asked: ${c.q}`);save();hop()})},1800);
}
function feed(){
  if(asleep())return; const e=E();
  if(sess.feeds>=C.sessionLimits.feeds||S.needs.food>=95)return talk(e.lines.full);
  const pool=[...e.foods].sort(()=>Math.random()-.5).slice(0,2); if(!pool.includes(S.g.fav))pool[0]=S.g.fav; pool.push(e.neutral[0]); pool.sort(()=>Math.random()-.5);
  ov.innerHTML=`<div class="choices">${pool.map((f,i)=>`<button class="btn" data-i="${i}"><span class="ic">${f.split(' ')[0]}</span>${f.split(' ').slice(1).join(' ')}</button>`).join('')}<div class="hint">Tap a food to feed</div></div>`;
  ov.querySelectorAll('button').forEach(b=>b.onclick=()=>{ov.innerHTML='';const f=pool[+b.dataset.i],fav=f===S.g.fav;sess.feeds++;
    S.needs.food=clamp(S.needs.food+(fav?C.restore.foodFav:C.restore.food));if(!S.foods.includes(f))S.foods.push(f);
    addBond(fav?C.bond.feedFav:C.bond.feed);hop();talk(fav?e.lines.fav:e.lines.fed);if(fav&&!S.memories.some(m=>m.includes('favorite food')))S.memories.push(`You found my favorite food: ${f}`);save();maybeChat()});
}
function comfort(){
  if(asleep())return; const e=E();
  choices([['✋','Pet',null],['🌙','Sit together',null]],i=>{
    if(i===0){pet();return}
    const sc=$('#sc');sc.style.filter='brightness(.75) saturate(1.2)';talk(e.lines.sit,C.sitSeconds*1000);ov.innerHTML='<div class="choices"><div class="hint">…sitting together…</div></div>';
    setTimeout(()=>{ov.innerHTML='';sc.style.filter='';S.needs.comfort=clamp(S.needs.comfort+C.restore.sit);addBond(C.bond.sit);hop();maybeChat()},C.sitSeconds*1000);
  });
}
function pet(){if(asleep())return;S.needs.comfort=clamp(S.needs.comfort+C.restore.pet);addBond(C.bond.pet);hop();talk(E().lines.pet,1500)}
function rest(){
  const e=E(); if(sess.naps>=C.sessionLimits.naps)return talk('I\'m not sleepy! …Okay, a little. But not yet.');
  sess.naps++;const fav=S.badges.includes('place');S.needs.rest=clamp(S.needs.rest+(fav?C.restore.restFav:C.restore.rest));S.needs.play=clamp(S.needs.play);
  S.napUntil=now()+C.napSeconds*1000;addBond(C.bond.nap);save();talk(e.lines.nap);setTimeout(home,1500);
}
function how(){
  const p=document.querySelector('.panel');if(p)return p.remove();const n=S.needs;
  const d=document.createElement('div');d.className='panel';d.innerHTML=`<b>How am I?</b>`+['food','play','rest','comfort'].map(k=>`<div>${k}<span class="bar"><i style="width:${n[k]}%"></i></span></div>`).join('')+`<div style="opacity:.7">Bond ${S.bond}/500 · day ${S.days}</div>`;
  app.appendChild(d);d.onclick=()=>d.remove();
}
function dev(){
  const d=full(`<h1>Playtest tools</h1><p>For trying the whole arc quickly.</p><div class="row">
  <button class="btn" id="b1">+60 bond</button><button class="btn" id="b2">Jump to Ready</button><button class="btn" id="b3">New session</button><button class="btn" id="b7">+1 day</button><button class="btn" id="b4">Voice ${S.voice?'on':'off'}</button><button class="btn" id="b5">Delete everything</button><button class="btn" id="b6">Close</button></div>`);
  const cl=()=>d.remove();
  d.querySelector('#b1').onclick=()=>{cl();addBond(60/C.demoSpeed);home()};
  d.querySelector('#b2').onclick=()=>{cl();addBond(500);home()};
  d.querySelector('#b3').onclick=()=>{cl();sess={feeds:0,games:0,naps:0,chats:0};S.napUntil=0;S.last=now()-6*36e5;simulate();save();home(true)};
  d.querySelector('#b4').onclick=()=>{S.voice=!S.voice;save();cl()};
  d.querySelector('#b5').onclick=()=>{if(confirm('Delete the Echo, memories and keepsakes?')&&confirm('Really delete everything?')){window.__wiped=1;localStorage.removeItem(KEY);location.reload()}};
  d.querySelector('#b6').onclick=cl;
  d.querySelector('#b7').onclick=()=>{cl();S.clockOffset=(S.clockOffset||0)+864e5;sess={feeds:0,games:0,naps:0,chats:0};S.napUntil=0;simulate();save();home(true);toast('A day passes…')};
}
function book(){
  const e=E(),d=document.createElement('div');d.className='book';
  d.innerHTML=`<button class="btn" style="float:right" id="x">✕</button><h1 style="margin:0">📖 Memory Book</h1>
  <div style="width:140px">${svg(S.kind,S.g,'happy')}</div><b>${S.g.name}</b> — ${e.name}, ${e.title}<br><small>Quirk: ${S.g.quirk} · ${S.days} day(s) together</small>
  <h2>Stickers</h2>${S.stickers.map(s=>`<span class="chip">🌟 ${s}</span>`).join('')||'<i>none yet</i>'}
  <h2>Talents</h2>${S.talents.map(s=>`<span class="chip">✨ ${s}</span>`).join('')||'<i>none yet</i>'}
  <h2>Foods discovered</h2>${S.foods.map(s=>`<span class="chip">${s}${s===S.g.fav?' ❤️':''}</span>`).join('')||'<i>none yet</i>'}
  <h2>Treasures</h2>${S.treasures.map(s=>`<span class="chip">💎 ${s}</span>`).join('')||'<i>none yet</i>'}
  <h2>Things we figured out</h2>${S.memories.slice(-12).map(s=>`<div class="chip">${s}</div>`).join('')||'<i>none yet</i>'}
  ${S.postcards?'<h2>Letters from the wild</h2>'+S.postcards.map(p=>`<div class="postcard">${p}</div>`).join(''):''}`;
  document.body.appendChild(d);d.querySelector('#x').onclick=()=>d.remove();
}

// ---------- mini-games (§6.3) ----------
function play(){
  if(asleep())return; if(sess.games>=C.sessionLimits.games)return talk(S.kind==='fox'?'My paws are tired! Let\'s play again next time.':'Hoo… enough stars for today. My eyes are full.');
  sess.games++; S.needs.rest=clamp(S.needs.rest-5); (S.kind==='fox'?shinyHunt:nightSky)(0);
}
function gameShell(title){h(`<div class="top"><b>${title}</b><button class="btn small" id="quit">Done</button></div><div class="scene ${E().bg}" id="gs"><div class="bubble" id="b" style="top:3%"></div></div>`);$('#quit').onclick=()=>{endGame(false)}}
function endGame(finished){if(finished){S.needs.play=clamp(S.needs.play+C.restore.playFinish)}save();home();if(finished)talk(S.kind==='fox'?'Best. Game. EVER. Again tomorrow?':'That was a lovely sky. Thank you.');maybeChat()}
function roundDone(round,next){S.needs.play=clamp(S.needs.play+C.restore.play);addBond(C.bond.round,true);if(round>=2)setTimeout(()=>endGame(true),2200);else setTimeout(()=>next(round+1),2200)}
function shinyHunt(round){
  gameShell(`Shiny Hunt · round ${round+1}/3`);const gs=$('#gs');
  const spots=[['🪵','log','woody'],['🍂','leaf pile','crunchy'],['🏠','treehouse fort','cozy'],['🫖','teapot','tea-ish'],['🥾','boot','smelly']];
  const pos=[[10,40],[60,35],[35,55],[12,72],[62,70]];
  const camo=S.talents.includes('Master of Disguise')&&round===1, seek=S.talents.includes('Riddle Solver')&&round===2;
  const target=Math.floor(Math.random()*5);let miss=0;
  spots.forEach((s,i)=>{const b=document.createElement('button');b.className='spot';b.style.left=pos[i][0]+'%';b.style.top=pos[i][1]+'%';b.textContent=s[0];b.dataset.i=i;gs.appendChild(b)});
  const B=[...gs.querySelectorAll('.spot')];
  if(seek){talk('Your turn! Tap a spot to hide my shiny trinket. I won\'t peek. (peeks)',60000);
    B.forEach(b=>b.onclick=()=>{const h=+b.dataset.i;B.forEach(x=>x.onclick=null);b.style.outline='4px solid gold';let tries=[0,1,2,3,4].filter(x=>x!==h).sort(()=>Math.random()-.5).slice(0,2);
      const seq=[...tries,h];let k=0;const step=()=>{const i=seq[k];B[i].animate([{transform:'scale(1)'},{transform:'scale(1.3)'},{transform:'scale(1)'}],{duration:500});
        if(i===h){talk('FOUND IT! …You\'re TOO good at this. That took me forever.');S.memories.push('You hid the trinket in the '+spots[h][1]);roundDone(round,shinyHunt)}
        else{talk(spots[i][1]==='teapot'?'It\'s… in the teapot! …It\'s not in the teapot. Who put a teapot here?':`It's in the ${spots[i][1]}! …No.`);k++;setTimeout(step,1800)}};setTimeout(step,1200)});return}
  talk(camo?'I\'m hiding! You\'ll NEVER find me. (giggle)':'Don\'t look! …Okay, you can look. Wait, no, my tail\'s out.',60000);
  if(camo&&Math.random()<.75){const t=document.createElement('div');t.textContent='🦊';t.style.cssText=`position:absolute;font-size:28px;left:${pos[target][0]+12}%;top:${pos[target][1]+8}%;pointer-events:none`;gs.appendChild(t)}
  if(S.talents.includes('Radar Ears'))setTimeout(()=>{jingle(pos[target][0]<40?-1:1);toast('🎵 jingle… (from the '+(pos[target][0]<40?'left':'right')+')')},1500);
  B.forEach(b=>b.onclick=()=>{const i=+b.dataset.i;if(b.classList.contains('miss'))return;
    if(i===target){b.textContent=camo?'🦊':'💎';B.forEach(x=>x.onclick=null);talk(camo?'You found me! How?! Was it the tail? It was the tail.':'You found it! How?! Did the treasure tell you? Traitor treasure.');if(round===0&&!S.memories.some(m=>m.includes('teapot')))S.memories.push(`You found the treasure in the ${spots[i][1]}`);roundDone(round,shinyHunt);return}
    miss++;b.classList.add('miss');
    if(miss>=4){B[target].animate([{transform:'translateY(0)'},{transform:'translateY(-14px)'},{transform:'translateY(0)'}],{duration:400,iterations:4});talk('(Slyte points at the '+spots[target][1]+' with its WHOLE body.) …What? I\'m just standing here.')}
    else if(miss>=3)talk(`Psst… it's in the ${spots[target][1]}. I didn't say that.`)
    else talk(`Not there. But that was a VERY good guess. Psst… it's somewhere… ${spots[target][2]}.`)});
}
function jingle(pan){try{const a=new (window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator(),g=a.createGain(),p=a.createStereoPanner?a.createStereoPanner():null;o.frequency.value=1320;g.gain.setValueAtTime(.15,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.6);o.connect(g);if(p){p.pan.value=pan;g.connect(p);p.connect(a.destination)}else g.connect(a.destination);o.start();o.stop(a.currentTime+.6)}catch(e){}}
function nightSky(round){
  gameShell(`Night Sky · picture ${round+1}/3`);const gs=$('#gs');gs.className='scene owl-bg';
  const n=5+Math.floor(Math.random()*3), pts=[];let guard=0;while(pts.length<n&&guard++<500){const q=[12+Math.random()*76,30+Math.random()*45];if(pts.every(p=>Math.hypot(p[0]-q[0],(p[1]-q[1])*1.6)>18))pts.push(q)}
  const ln=document.createElementNS('http://www.w3.org/2000/svg','svg');ln.setAttribute('class','lines');ln.setAttribute('viewBox','0 0 100 100');ln.setAttribute('preserveAspectRatio','none');gs.appendChild(ln);
  (S.constellations||[]).slice(-3).forEach(c=>{const t=document.createElement('div');t.textContent='✦ '+c;t.style.cssText='position:absolute;bottom:4%;left:4%;opacity:.5;font-size:12px';gs.appendChild(t)});
  talk('Tap the stars, in any order. Let\'s see what picture they make…',60000);let path=[];
  pts.forEach((p,i)=>{const b=document.createElement('button');b.className='star';b.style.left=p[0]+'%';b.style.top=p[1]+'%';gs.appendChild(b);
    b.onclick=()=>{if(b.classList.contains('on'))return;b.classList.add('on');if(path.length){const q=pts[path[path.length-1]];ln.innerHTML+=`<line x1="${q[0]}" y1="${q[1]}" x2="${p[0]}" y2="${p[1]}" stroke="#ffe27a" stroke-width=".6" vector-effect="non-scaling-stroke" style="stroke-width:3px"/>`}path.push(i);
      if(path.length===n){const opts=[['🥄','Spoon'],['🐈','Thin cat'],['🐋','Whale'],['🏠','House'],['🐉','Dragon'],['🎈','Balloon']].sort(()=>Math.random()-.5).slice(0,3);
        talk(`Hmm… it looks like a ${opts[0][1].toLowerCase()}. Or a very thin cat. What do you think it is?`,60000);
        choices(opts.map(o=>[o[0],o[1],null]),k=>{const nm=`The ${opts[k][1]}`;(S.constellations=S.constellations||[]).push(nm);S.memories.push(`We named a constellation: ${nm}`);talk(`${nm}. Hoo. It will be in our sky from now on.`);roundDone(round,nightSky)})}}});
  if(S.talents.includes('Night Vision')&&round===1)toast('Night Vision: the stars glow brighter for you');
}

// ---------- release (§5.8) ----------
function release(forced,go){
  if(mq.length&&!forced)return flushMilestones();
  const e=E(),g=S.g;if(!S.releasePath)S.releasePath='child';if(forced)S.releasePath='grace-ended';
  h(`<div class="scene ${e.bg}" id="sc"><div class="glowpath"></div><div class="creature" id="cr" style="left:80%">${svg(S.kind,g,'happy')}</div><div class="bubble" id="b"></div></div>`);
  if(go){setTimeout(walk,500)}
  else if(forced){const ask=()=>{talk(`It's time. ${g.name} walks to the edge of the meadow and looks back at you, happy.`,60000);
    choices([['🤗','One more hug',null],['🌲',"Let's go",null]],i=>{if(i===0){hop();talk('(A big, warm hug.) Mmm. Okay, one more is allowed.',2500);setTimeout(ask,2600)}else walk()})};ask()}
  else{talk(`${g.name} walks to the edge of the meadow and looks back at you.`,60000);
    choices([['🌲',"Let's go",null],['🤗','Wait',null]],i=>{if(i===1){S.releasePath=null;home();return}walk()})}
  function walk(){
    const sc=$('#sc');sc.style.transition='filter 4s';sc.style.filter='hue-rotate(-20deg) brightness(.85)';const c=$('#cr');c.style.left='50%';
    const lines=[`We're going to ${e.release}. It's not far.`,...S.memories.slice(-3).map(m=>'Remember? '+m+'.'),'I\'ll remember all of it.'];let k=0;
    const step=()=>{if(k<lines.length){talk(lines[k++],60000);setTimeout(step,3300)}else gift()};step();
  }
  function gift(){
    talk('Before I go… can I take something with me?',60000);
    const opts=[['💎',S.treasures[0]||e.treasure],[S.g.fav.split(' ')[0],S.g.fav.split(' ').slice(1).join(' ')],[e.token==='leaf'?'🍃':'🪶','a '+e.token]];
    choices(opts.map(o=>[o[0],o[1],null]),i=>{S.gift=opts[i][1];hop();talk(`The ${S.gift}! I'll keep it forever. FOREVER.`,4000);setTimeout(bye,3500)});
  }
  function bye(){
    talk('How do you want to say goodbye?',60000);
    choices([['👋','Wave',null],['🤗','Hug',null],['👃','Nose-tap',null]],i=>{
      talk(`(${g.name} ${e.trust}.) I'm so excited and a tiny bit sad, both at once. You helped me grow strong. Thank you, ${S.child}.`,60000);
      setTimeout(()=>{const c=$('#cr');c.style.transition='all 3s';c.style.left='110%';c.style.transform='translateX(-50%) scale(.5)';
        setTimeout(()=>{c.style.transition='all .5s';c.style.left='88%';talk('(It stops… and looks back once.)',3000);
          setTimeout(()=>{c.style.opacity=0;talk(S.kind==='fox'?'…yip! …yip… …yip…':'…hoo… …hoo… …hoo…',3000);setTimeout(closure,3500)},2500)},3200)},6000);
    });
  }
}
function closure(){
  const g=S.g;S.released=now();S.postcards=[];S.checkins=buildCheckins();save();
  const d=full(`<h1>${g.name} is home, off to live its wild life.</h1><p>You helped it grow strong and brave.</p><div id="cont" style="height:64px"></div>`);
  setTimeout(()=>{d.querySelector('#cont').innerHTML='<button class="btn">Continue</button>';d.querySelector('button').onclick=()=>{d.remove();feelings()}},5000);
}
function feelings(){
  const f=[['😊','Happy'],['😌','Proud'],['😢','Sad'],['😮','Surprised'],['🙂','Okay']],sel=new Set();
  const d=full(`<h1>How do you feel?</h1><p>You can pick more than one.</p><div class="row">${f.map((x,i)=>`<button class="btn" data-i="${i}"><span class="ic">${x[0]}</span>${x[1]}</button>`).join('')}</div><button class="btn" id="ok" style="background:#ffe27a">Done</button>`);
  d.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;sel.has(i)?sel.delete(i):sel.add(i);b.classList.toggle('sel');say(f[i][1])});
  d.querySelector('#ok').onclick=()=>{S.feelings=[...sel].map(i=>f[i][1]);save();d.remove();const d2=full(`<p style="font-size:22px">It's okay to feel more than one thing.</p><button class="btn">Memory Book</button>`);say("It's okay to feel more than one thing.");d2.querySelector('button').onclick=()=>{d2.remove();afterHome();book()}};
}
function buildCheckins(){
  const e=E(),g=S.g,c=S.child,mem=(S.memories.filter(m=>!m.startsWith('You said'))[1]||S.memories[0]||'the day we met'),con=(S.constellations||[])[0],lc=mem.charAt(0).toLowerCase()+mem.slice(1);
  const T={postcard:['I made it! The '+(S.gift||e.treasure)+' came too. It likes it here.',
     S.kind==='fox'?`I used my ${S.talents[1]||'disguise'} today and NOBODY found me. You would have. I still think about how ${lc}.`:`I used my ${S.talents[0]||'night eyes'} to count fireflies. I still think about how ${lc}.`,
     S.kind==='fox'?'The meadow turned all gold for autumn. I pounced into the biggest leaf pile and thought of you.':(con?`${con} was out tonight, right over my hollow.`:'The first snow fell on my hollow. Very quiet. Very nice.')],
   note:[S.kind==='fox'?'Psst. Do you think clouds play hide-and-seek? I think they cheat.':'I wondered today… where does the wind sleep?',`I still think about ${lc}. It makes me ${S.kind==='fox'?'swish my tail':'fluff my feathers'}.`],
   sign:[e.sign.slice(e.sign.indexOf(' ')+1),'a tiny '+e.token+', left just for you']};
  const used={postcard:0,note:0,sign:0};
  return C.checkins.map(([day,type])=>({day,type,text:type==='sign'?`(Found: ${T.sign[used.sign++]}.) ${S.kind==='fox'?'…yip! (from far away)':'…hoo… (from far away)'}`:`Dear ${c}, ${T[type][used[type]++]} — ${g.name}`,delivered:false}));
}
function deliverCheckins(){
  const due=(S.checkins||[]).filter(k=>!k.delivered&&S.released+k.day*864e5<=now());
  if(!due.length||S.lastCheckinDate===new Date(now()).toDateString())return null;
  due.forEach(k=>k.delivered=true);S.lastCheckinDate=new Date(now()).toDateString();
  S.postcards=S.checkins.filter(k=>k.delivered).map(k=>`<b>Day +${k.day} · ${k.type==='sign'?'small sign':k.type}</b><br>${k.text}`);save();return due[due.length-1];
}
function afterHome(){
  const e=E(),g=S.g;ov.innerHTML='';const fresh=deliverCheckins(),sign=fresh&&fresh.type==='sign',days=Math.floor((now()-S.released)/864e5),ic=e.sign.split(' ')[0];
  h(`<div class="top"><b>The meadow · day +${days}</b><button class="btn small" id="book">📖</button></div><div class="scene ${e.bg}"><div class="bubble">${g.name} is home in ${e.release}.${fresh?(sign?' Something was left here… tap it!':' There\'s something in the mailbox!'):' Letters from the wild arrive now and then.'}</div>
  <button class="spot" id="mail" style="left:40%;bottom:20%;width:100px;height:100px;font-size:64px">${fresh&&!sign?'📬':'📪'}</button>
  ${sign?`<button class="spot" id="sign" style="left:12%;bottom:42%;font-size:44px">${ic}</button>`:''}</div>
  <div class="dock" style="grid-template-columns:1fr 1fr"><button class="btn" id="pc">⏩ Skip ahead a day (demo)</button><button class="btn" id="again">🌿 Discover a new Echo</button></div>`);
  const show=()=>{const d=full(`<div style="font-size:56px">${fresh.type==='postcard'?'🖼️':fresh.type==='note'?'✉️':ic}</div><div style="width:150px">${svg(S.kind,g,'happy')}</div><p>${fresh.text}</p><button class="btn">Keep it in my Memory Book</button>`);say(fresh.text);d.querySelector('button').onclick=()=>{d.remove();$('#mail').textContent='📪'}};
  $('#book').onclick=book;$('#mail').onclick=()=>fresh&&!sign?show():book();if(sign)$('#sign').onclick=()=>{$('#sign').remove();show()};
  $('#pc').onclick=()=>{S.clockOffset=(S.clockOffset||0)+864e5;save();afterHome();const nx=(S.checkins||[]).find(k=>!k.delivered);if(nx)toast('Next letter around day +'+nx.day)};
  $('#again').onclick=()=>{if(confirm('Start with a new Echo? (This prototype keeps one save, so the old Memory Book will be cleared.)')){S={child:S.child,voice:S.voice};discover()}};
}
window.addEventListener('visibilitychange',()=>{if(document.hidden)save();else if(S&&S.last&&now()-S.last>10*60e3){sess={feeds:0,games:0,naps:0,chats:0};simulate();save();if(!S.released)home(true)}});
window.__echo={get state(){return S}};
start();
})();
