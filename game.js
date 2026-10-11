(()=>{
const C=window.CONFIG, CR=window.CREATURES, $=s=>document.querySelector(s);
const app=$('#app'), ov=$('#overlay');
const KEY='echo-proto-v1';
let S=load(), sess={feeds:0,games:0,naps:0,chats:0};
const rnd=(seed)=>()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s)purgeFeelings(s);return s}catch(e){return null}}
// Privacy: never persist the child's feelings. Remove any legacy data of that kind.
function purgeFeelings(s){let ch=false;if('feelings' in s){delete s.feelings;ch=true}
  const bad=/you had a really good day|felt not great|bright thing for gray days|how you feel|you felt/i;
  if(Array.isArray(s.memories)){const n=s.memories.length;s.memories=s.memories.filter(m=>!bad.test(m));if(s.memories.length!==n)ch=true}
  if(Array.isArray(s.memTags)){const n=s.memTags.length;s.memTags=s.memTags.filter(t=>!['good_day','sat_sad','bright','feelings'].includes(t));if(s.memTags.length!==n)ch=true}
  if(Array.isArray(s.checkins))s.checkins.forEach(k=>{if(bad.test(k.text)){k.text=k.text.replace(/I still think about [^.]*\. It makes me [^.]*\./,'I found a glimmery leaf today.');ch=true}});
  if(Array.isArray(s.postcards)){const p=s.postcards.map(x=>bad.test(x)?x.replace(/I still think about [^.]*\. It makes me [^.]*\./,'I found a glimmery leaf today.'):x);if(p.join()!==s.postcards.join()){s.postcards=p;ch=true}}
  if(ch)try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}}
function save(){if(S&&!window.__wiped){S.last=now();localStorage.setItem(KEY,JSON.stringify(S))}}
function E(){return CR[S.kind]}
// Echoes have no voices: they speak in musical chirps (sound comes later). Text-to-speech is off.
function say(t){try{if(S&&S.voice&&window.Chirp)Chirp.play(t,S.kind)}catch(e){}}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('on'),2200)}
function h(html){app.innerHTML=html;app.querySelectorAll('.scene').forEach(sc=>{const k=sc.classList.contains('dusk')?'dusk':sc.classList.contains('owl-bg')?'night':sc.classList.contains('fox-bg')?'day':null;if(k)sc.insertAdjacentHTML('afterbegin',ART.bg(k))});app.classList.remove('enter');void app.offsetWidth;app.classList.add('enter')}
const PET_KEYS=new Set(['hello','fed_fav','game_end','hunt_found','seek_found','sky_named','gift_got','reveal_reply']);
const B=(k,x)=>{const l=Dialogue.bark(k,x);return PET_KEYS.has(k)?Dialogue.withPet(l):l};
function stage(){return [0,20,70,140,210,290,370,440,500].filter(b=>S.bond>=b).length}
function tod(){const hr=new Date(now()).getHours();return hr<11?'morning':hr<17?'day':hr<20?'evening':'night'}
function remember(t,tag){S.memories.push(t);if(tag){S.memTags=S.memTags||[];if(!S.memTags.includes(tag))S.memTags.push(tag);(S.memTagAt=S.memTagAt||{})[tag]=S.memTagAt[tag]||now()}save()}
// callbacks (Overhaul B8): memory >= callbackMinAgeHours old, each memory <= 3 callbacks, <= 1 per session moment
function callbackLine(){const at=S.memTagAt||{},cnt=S.cbCount||{};
  const ok=l=>{const tags=[];(function walk(c){if(!c)return;if(c.hasMemory)tags.push(c.hasMemory);(c.any||[]).forEach(walk)})(l.cond);
    return tags.every(t=>at[t]!=null&&now()-at[t]>=C.callbackMinAgeHours*36e5&&(cnt[t]||0)<3)};
  const b=Dialogue.bark('callback',null,ok);if(!b)return null;
  (function walk(c){if(!c)return;if(c.hasMemory){(S.cbCount=S.cbCount||{})[c.hasMemory]=(S.cbCount[c.hasMemory]||0)+1}(c.any||[]).forEach(walk)})(b.src.cond);save();return b}
// ambient chatter (B11): every ambientMin–ambientMax s when nothing else is happening on Home
let ambT=null;function scheduleAmbient(){clearTimeout(ambT);const C2=C;ambT=setTimeout(()=>{
  const b=$('#b');const busy=!document.getElementById('feed')||document.querySelector('.full')||ov.innerHTML.trim()||(b&&b.style.display!=='none')||mood()==='sleep';
  if(!busy){const cb=Math.random()<.25?callbackLine():null;talk(cb||B('ambient'));sess.ambient=(sess.ambient||0)+1}
  scheduleAmbient()},(C2.ambientMin+Math.random()*(C2.ambientMax-C2.ambientMin))*1000)}
Dialogue.ctx=()=>S&&S.kind?({mood:mood(),bond:S.bond,stage:stage(),memTags:S.memTags||[],talents:S.talents,time:tod(),vars:S.vars||(S.vars={}),seen:S.seen||[],
  fill:{name:S.g.name,child:S.child,fav:(S.g.fav||'').split(' ').slice(1).join(' '),treasure:E().treasure,place:E().place,release:E().release,trust:E().trust,quirk:S.g.quirk,token:E().token,gift:S.gift||'',memory:(S.memories[Math.floor(Math.random()*S.memories.length)]||'the day we met').replace(/\.$/,'')}}):{};
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
function svg(kind,g,m){const ex=m==='sleep'?'sleepy':m==='sad'?'neutral':m==='happy'?'happy':(m||'neutral');return ART.creature(kind,g).replace('data-expr="neutral"',`data-expr="${ex}"`)}
function mood(){const n=S.needs;const m=Math.min(n.food,n.play,n.rest,n.comfort);return S.napUntil>now()?'sleep':m>60?'happy':m<25?'sad':'ok'}
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
  if(ti>=0){const t=e.talents[ti];S.talents.push(t);title=`Talent: ${t}!`;line=B('talent_'+t);}
  else if(m.id==='name'){title='A new friend!';line=B('first_gift');S.treasures.push(e.treasure)}
  else if(m.id==='place'){title='Favorite place!';line=B('favplace')}
  else if(m.id==='trust'){title='Trust gesture';line=B('trust')}
  else if(m.id==='ready'){title='Ready for the wild';line=B('ready_hint')}
  S.stickers.push(title);save();
  const d=full(`<div style="font-size:64px">${ti>=0?'✨':'🌟'}</div><h1>${title}</h1><div style="width:170px">${svg(S.kind,S.g,line.expr||'happy')}</div><p>${line.text}</p><p style="font-size:14px;opacity:.7">Sticker added to your Memory Book</p><button class="btn">Yay!</button>`);
  say(line.text); d.querySelector('button').onclick=()=>{d.remove();home();setTimeout(flushMilestones,300)};
}
function talentLine(t){return B('talent_'+t).text}
function start(){
  if(!S)return setup();
  Dialogue.load(S.kind==='fox'?'slyte':'whimber').then(()=>{initDialogue();if(S.released)return afterHome();simulate();save();home(true)}).catch(e=>{console.error(e);h('<p style="padding:20px">Could not load dialogue. Please reload.</p>')});
}
function setup(){
  h(`<div class="full" style="position:relative;background:none"><div style="font-size:72px">🦊🦉</div><h1>Project Echo</h1><p>Prototype for playtesting. A grown-up sets this up.</p>
   <input id="nick" maxlength="12" placeholder="Child's nickname"><label style="font-size:16px"><input type="checkbox" id="voice" checked style="width:auto"> Chirp sounds</label>
   <button class="btn" id="go">Start ▶</button></div>`);
  $('#go').onclick=()=>{S={child:($('#nick').value||'friend').slice(0,12),voice:$('#voice').checked};discover()};
}
function discover(){
  h(`<div class="scene dusk"><div class="bg pxbg pxbg-discover"></div><div class="bubble">The meadow at dusk. Something is moving… Tap one!</div>
   <button class="propbtn" id="bush" aria-label="Rustling bush" style="left:2px;bottom:76px;width:66px;height:42px">${ART.props.bush}</button>
   <button class="propbtn" id="tree" aria-label="Tree with glowing eyes" style="right:8px;bottom:80px;width:72px;height:150px">${ART.props.tree}</button>
   <p style="position:absolute;bottom:3%;width:100%;text-align:center;opacity:.85;font-size:13px">(Card scan is deferred in this web prototype)</p></div>`);
  $('#bush').onclick=()=>reveal('fox');$('#tree').onclick=()=>reveal('owl');
}
async function reveal(kind){
  Object.assign(S,{kind,g:genEcho(kind),needs:{food:60,play:50,rest:80,comfort:60},bond:0,badges:[],talents:[],stickers:[],treasures:[],memories:[],memTags:[],vars:{},seen:[],foods:[],met:now(),days:1,lastHello:new Date(now()).toDateString()});
  S.g.name=E().name; await Dialogue.load(kind==='fox'?'slyte':'whimber');initDialogue();
  const e=E();
  h(`<div class="scene ${e.bg}"><div class="creature" id="cr" style="opacity:0;bottom:-40%;transition:all 1.2s cubic-bezier(.2,1.4,.4,1)">${svg(kind,S.g,'surprised')}</div><div class="bubble" id="b" style="display:none"></div></div>`);
  setTimeout(()=>{const c=$('#cr');c.style.opacity=1;c.style.bottom='10%'},300);
  setTimeout(()=>{talk(B('reveal'),60000);
    setTimeout(()=>{choices([['👋','Hi!',null],['🤗','Welcome',null],['🤫','Just smile',null]],(i)=>{
        save();talk(B('reveal_reply'));remember('The day we met in the dusk meadow','met');
        setTimeout(()=>{home();toast('Tip: tap the buttons below to care for '+S.g.name)},2400);
      })},1800)},1700);
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
   <div class="dock"><button class="btn" id="feed"><span class="ic">🍎</span>Feed</button><button class="btn" id="play"><span class="ic">🎲</span>Play</button><button class="btn" id="comfort"><span class="ic">💗</span>Hug</button><button class="btn" id="rest"><span class="ic">🛏️</span>Rest</button></div>
   <div class="dbg"><button class="btn small" id="dbg" style="min-height:28px">dev</button></div>`);
  renderBadge();
  $('#feed').onclick=feed;$('#play').onclick=play;$('#comfort').onclick=comfort;$('#rest').onclick=rest;$('#book').onclick=book;$('#how').onclick=how;$('#dbg').onclick=dev;
  if(ready){$('#rel').onclick=()=>release(false);$('#path').onclick=()=>release(false)}
  // stroke to pet
  let strokes=0;$('#cr').addEventListener('pointermove',ev=>{if(ev.buttons||ev.pointerType==='touch'){strokes++;if(strokes%25===0)pet()}});
  $('#cr').addEventListener('click',pet);
  if(m==='sleep'){talk(B('napping'));setTimeout(()=>{if(S.napUntil<=now())home()},Math.max(500,S.napUntil-now()+200));return}
  if(greet&&S.graceUntil&&graceDay>=C.graceDays&&S.lastDayLine!==graceDay){S.lastDayLine=graceDay;save();talk(B('last_day'))}
  else if(greet&&S.graceUntil){talk(B('grace_hello'))}
  else if(greet){talk(B('hello'));setTimeout(()=>{const b=$('#b');if(document.getElementById('feed')&&!ov.innerHTML.trim()&&!document.querySelector('.full')&&b)talk(B('time_'+tod()))},4200)}
  else if(ready&&!sess.readyLine){sess.readyLine=1;talk(B('ready_hint'))}
  setTimeout(flushMilestones,400);scheduleAmbient();
}
function talk(t,ms){const b=$('#b');if(!b)return;let o=typeof t==='string'?{text:t}:t;if(o.expr)setExpr(o.expr);if(o.react)react(o.react);
  b.style.display='block';b.textContent=o.text;b.style.animation='none';void b.offsetWidth;b.style.animation='';say(o.text);clearTimeout(talk.t);
  talk.t=setTimeout(()=>{if(b)b.style.display='none';if(o.expr&&S&&S.kind&&$('#cr'))setExpr(baseExpr())},ms||Math.max(3000,o.text.length*70))}
function baseExpr(){const m=mood();return m==='sleep'?'sleepy':m==='happy'?'happy':'neutral'}
function hop(){react('happy')}
function asleep(){if(S.napUntil>now()){toast('Shh… napping');return true}}
// two-tap reply choices (S9)
function choices(list,cb,opts){
  let sel=-1;opts=opts||{};ov.innerHTML=`<div class="choices">${list.map((c,i)=>`<button class="btn" data-i="${i}"><span class="ic">${c[0]}</span>${c[1]}</button>`).join('')}<div class="hint">Tap to hear · tap again to choose</div></div>`;
  ov.querySelectorAll('button').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;opts.onTap&&opts.onTap(i);if(sel===i){ov.innerHTML='';cb(i);return}sel=i;ov.querySelectorAll('button').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');say(list[i][1])});
}
function maybeChat(){
  const n=S.needs;
  if(S.badges.includes('ready')&&!S.graceUntil&&!sess.asked&&Math.min(n.food,n.play,n.rest,n.comfort)>=40){sess.asked=1;
    return setTimeout(()=>{if(!document.getElementById('feed')){sess.asked=0;return}talk(B('ask_ready'),60000);choices([['🌲',"Let's go together",null],['🤗','Not yet',null]],i=>{
      S.releasePath='echo-asked';if(i===0)return release(false,true);
      S.graceUntil=now()+C.graceDays*864e5;S.releasePath=null;save();talk(B('stay_more'))})},1500)}
  if(sess.chats>=C.maxConversationsPerSession||Math.random()<.35)return;
  if(!sess.cb&&Math.random()<.3){const cb=callbackLine();if(cb){sess.cb=1;sess.chats++;return setTimeout(()=>{if(document.getElementById('feed')&&!document.querySelector('.full'))talk(cb)},1800)}}
  const conv=Dialogue.pickConversation('idle'); if(!conv)return; sess.chats++;
  setTimeout(()=>{if(!document.getElementById('feed')||document.querySelector('.full'))return;runConv(conv)},1800);
}
function initDialogue(){Dialogue.now=now;S.dlg=S.dlg||{};Dialogue.mem=S.dlg;Dialogue.cfg.carryOnMs=C.carryOnSeconds*1000;Dialogue.setPersona(S.g.seed);Dialogue.prune()}
function runConv(conv,done,depth){depth=depth||0;if(typeof conv==='string')conv=Dialogue.lib.conversations.find(c=>c.id===conv);if(!conv)return done&&done();
  Dialogue.run(conv,{cancelChoices:()=>{ov.innerHTML=''},tangent:()=>B('tangent'),tangentRate:0.10+0.20*Math.max(0,Math.min(1,((S.g.playful||.75)-.5)/.5)),say:(l,ms)=>talk(l,ms),choose:(list,cb,o)=>choices(list,cb,o),setVar:(k,v)=>{(S.vars=S.vars||{})[k]=v;save()},
    remember:(t,tag)=>remember(t,tag),bond:n=>addBond(n),react:k=>react(k),seen:id=>{(S.seen=S.seen||[]).push(id);save()}},(info)=>{addBond(C.bond.reply);save();
    // drift to a linked topic or lose the thought (Overhaul B7); session limit still applies
    const onHome=()=>document.getElementById('feed')&&!document.querySelector('.full');
    const nx=info&&info.carriedOn?null:Dialogue.afterConversation(conv,depth);
    if(nx&&nx.type==='lost'&&onHome()){talk(nx.line);sess.lost=(sess.lost||0)+1}
    else if(nx&&nx.type==='drift'&&sess.chats<C.maxConversationsPerSession&&onHome()){sess.chats++;sess.drift=(sess.drift||0)+1;talk(nx.line);
      return setTimeout(()=>{if(onHome())runConv(nx.conv,done,depth+1)},2600)}
    done&&done()},depth);
}
function feed(){
  if(asleep())return; const e=E();
  if(sess.feeds>=C.sessionLimits.feeds||S.needs.food>=95)return talk(B('full'));
  const pool=[...e.foods].sort(()=>Math.random()-.5).slice(0,2); if(!pool.includes(S.g.fav))pool[0]=S.g.fav; pool.push(e.neutral[0]); pool.sort(()=>Math.random()-.5);
  ov.innerHTML=`<div class="choices">${pool.map((f,i)=>`<button class="btn" data-i="${i}"><span class="ic">${f.split(' ')[0]}</span>${f.split(' ').slice(1).join(' ')}</button>`).join('')}<div class="hint">Tap a food to feed</div></div>`;
  ov.querySelectorAll('button').forEach(b=>b.onclick=()=>{ov.innerHTML='';const f=pool[+b.dataset.i],fav=f===S.g.fav;sess.feeds++;
    S.needs.food=clamp(S.needs.food+(fav?C.restore.foodFav:C.restore.food));if(!S.foods.includes(f))S.foods.push(f);
    addBond(fav?C.bond.feedFav:C.bond.feed);hop();setExpr('eating');setTimeout(()=>talk(B(fav?'fed_fav':'fed')),fav?900:0);if(fav&&!(S.memTags||[]).includes('favfood'))remember(`You found my favorite food: ${f}`,'favfood');save();maybeChat()});
}
function comfort(){
  if(asleep())return; const e=E();
  choices([['✋','Pet',null],['🌙','Sit together',null]],i=>{
    if(i===0){pet();return}
    const sc=$('#sc');sc.style.filter='brightness(.75) saturate(1.2)';talk(B('sit'),C.sitSeconds*1000);ov.innerHTML='<div class="choices"><div class="hint">…sitting together…</div></div>';
    setTimeout(()=>{ov.innerHTML='';sc.style.filter='';S.needs.comfort=clamp(S.needs.comfort+C.restore.sit);addBond(C.bond.sit);hop();maybeChat()},C.sitSeconds*1000);
  });
}
function pet(){if(asleep())return;S.needs.comfort=clamp(S.needs.comfort+C.restore.pet);addBond(C.bond.pet);hop();talk(B('pet'),1800)}
function rest(){
  const e=E(); if(sess.naps>=C.sessionLimits.naps)return talk(B('not_sleepy'));
  sess.naps++;const fav=S.badges.includes('place');S.needs.rest=clamp(S.needs.rest+(fav?C.restore.restFav:C.restore.rest));S.needs.play=clamp(S.needs.play);
  S.napUntil=now()+C.napSeconds*1000;addBond(C.bond.nap);save();talk(B('nap'));setTimeout(home,1500);
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
  if(asleep())return; if(sess.games>=C.sessionLimits.games)return talk(B('game_tired'));
  sess.games++; S.needs.rest=clamp(S.needs.rest-5); (S.kind==='fox'?shinyHunt:nightSky)(0);
}
function gameShell(title){h(`<div class="top"><b>${title}</b><button class="btn small" id="quit">Done</button></div><div class="scene ${E().bg}" id="gs"><div class="bubble" id="b" style="top:3%"></div></div>`);$('#quit').onclick=()=>{endGame(false)}}
function endGame(finished){if(finished){S.needs.play=clamp(S.needs.play+C.restore.playFinish)}save();home();if(finished)talk(B('game_end'));maybeChat()}
function roundDone(round,next){S.needs.play=clamp(S.needs.play+C.restore.play);addBond(C.bond.round,true);if(round>=2)setTimeout(()=>endGame(true),2200);else setTimeout(()=>next(round+1),2200)}
function shinyHunt(round){
  gameShell(`Shiny Search · round ${round+1}/3`);const gs=$('#gs');
  const spots=[['🪵','log','woody'],['🍂','leaf pile','crunchy'],['🏠','treehouse fort','cozy'],['🫖','teapot','tea-ish'],['🥾','boot','smelly']];
  const pos=[[10,40],[60,35],[35,55],[12,72],[62,70]];
  const camo=S.talents.includes('Master of Disguise')&&round===1, seek=S.talents.includes('Riddle Solver')&&round===2;
  const target=Math.floor(Math.random()*5);let miss=0;
  spots.forEach((s,i)=>{const b=document.createElement('button');b.className='spot';b.style.left=pos[i][0]+'%';b.style.top=pos[i][1]+'%';b.textContent=s[0];b.dataset.i=i;gs.appendChild(b)});
  const BTN=[...gs.querySelectorAll('.spot')];
  if(seek){talk(B('seek_start'),60000);
    BTN.forEach(b=>b.onclick=()=>{const h=+b.dataset.i;BTN.forEach(x=>x.onclick=null);b.style.outline='4px solid gold';let tries=[0,1,2,3,4].filter(x=>x!==h).sort(()=>Math.random()-.5).slice(0,2);
      const seq=[...tries,h];let k=0;const step=()=>{const i=seq[k];BTN[i].animate([{transform:'scale(1)'},{transform:'scale(1.3)'},{transform:'scale(1)'}],{duration:500});
        if(i===h){talk(B('seek_found'));S.memories.push('You hid the trinket in the '+spots[h][1]);roundDone(round,shinyHunt)}
        else{talk(spots[i][1]==='teapot'?B('seek_teapot'):B('seek_wrong',{spot:spots[i][1]}));k++;setTimeout(step,1800)}};setTimeout(step,1200)});return}
  talk(B(camo?'camo_start':'hunt_start'),60000);
  if(camo&&Math.random()<.75){const t=document.createElement('div');t.textContent='🦊';t.style.cssText=`position:absolute;font-size:28px;left:${pos[target][0]+12}%;top:${pos[target][1]+8}%;pointer-events:none`;gs.appendChild(t)}
  if(S.talents.includes('Radar Ears'))setTimeout(()=>{jingle(pos[target][0]<40?-1:1);toast('🎵 jingle… (from the '+(pos[target][0]<40?'left':'right')+')')},1500);
  BTN.forEach(b=>b.onclick=()=>{const i=+b.dataset.i;if(b.classList.contains('miss'))return;
    if(i===target){b.textContent=camo?'🦊':'💎';BTN.forEach(x=>x.onclick=null);talk(B(camo?'camo_found':'hunt_found'));if(round===0&&!S.memories.some(m=>m.includes('teapot')))S.memories.push(`You found the treasure in the ${spots[i][1]}`);roundDone(round,shinyHunt);return}
    miss++;b.classList.add('miss');
    if(miss>=4){BTN[target].animate([{transform:'translateY(0)'},{transform:'translateY(-14px)'},{transform:'translateY(0)'}],{duration:400,iterations:4});talk(B('hunt_point',{spot:spots[target][1]}))}
    else if(miss>=3)talk(B('hunt_hint',{spot:spots[target][1]}))
    else talk(B('hunt_guess',{hint:spots[target][2]}))});
}
function jingle(pan){try{const a=new (window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator(),g=a.createGain(),p=a.createStereoPanner?a.createStereoPanner():null;o.frequency.value=1320;g.gain.setValueAtTime(.15,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.6);o.connect(g);if(p){p.pan.value=pan;g.connect(p);p.connect(a.destination)}else g.connect(a.destination);o.start();o.stop(a.currentTime+.6)}catch(e){}}
function nightSky(round){
  gameShell(`Night Sky · picture ${round+1}/3`);const gs=$('#gs');gs.className='scene owl-bg';
  const n=5+Math.floor(Math.random()*3), pts=[];let guard=0;while(pts.length<n&&guard++<500){const q=[12+Math.random()*76,30+Math.random()*45];if(pts.every(p=>Math.hypot(p[0]-q[0],(p[1]-q[1])*1.6)>18))pts.push(q)}
  const ln=document.createElementNS('http://www.w3.org/2000/svg','svg');ln.setAttribute('class','lines');ln.setAttribute('viewBox','0 0 100 100');ln.setAttribute('preserveAspectRatio','none');gs.appendChild(ln);
  (S.constellations||[]).slice(-3).forEach(c=>{const t=document.createElement('div');t.textContent='✦ '+c;t.style.cssText='position:absolute;bottom:4%;left:4%;opacity:.5;font-size:12px';gs.appendChild(t)});
  talk(B('sky_start'),60000);let path=[];
  pts.forEach((p,i)=>{const b=document.createElement('button');b.className='star';b.style.left=p[0]+'%';b.style.top=p[1]+'%';gs.appendChild(b);
    b.onclick=()=>{if(b.classList.contains('on'))return;b.classList.add('on');if(path.length){const q=pts[path[path.length-1]];ln.innerHTML+=`<line x1="${q[0]}" y1="${q[1]}" x2="${p[0]}" y2="${p[1]}" stroke="#ffe27a" stroke-width=".6" vector-effect="non-scaling-stroke" style="stroke-width:3px"/>`}path.push(i);
      if(path.length===n){const opts=[['🥄','Spoon'],['🐈','Stretchy cat'],['🐋','Whale'],['🏠','House'],['🐉','Dragon'],['🎈','Balloon']].sort(()=>Math.random()-.5).slice(0,3);
        talk(B('sky_guess',{guess:opts[0][1].toLowerCase()}),60000);
        choices(opts.map(o=>[o[0],o[1],null]),k=>{const nm=`The ${opts[k][1]}`;(S.constellations=S.constellations||[]).push(nm);remember(`We named a constellation: ${nm}`,'constellation');talk(B('sky_named',{constellation:nm}));roundDone(round,nightSky)})}}});
  if(S.talents.includes('Night Vision')&&round===1)toast('Night Vision: the stars glow brighter for you');
}

// ---------- release (§5.8) ----------
function release(forced,go){
  if(mq.length&&!forced)return flushMilestones();
  const e=E(),g=S.g;if(!S.releasePath)S.releasePath='child';if(forced)S.releasePath='grace-ended';
  h(`<div class="scene ${e.bg}" id="sc"><div class="glowpath"></div><div class="creature" id="cr" style="left:80%">${svg(S.kind,g,'happy')}</div><div class="bubble" id="b"></div></div>`);
  if(go){setTimeout(walk,500)}
  else if(forced){const ask=()=>{talk(B('release_forced'),60000);
    choices([['🤗','One more hug',null],['🌲',"Let's go",null]],i=>{if(i===0){hop();talk(B('hug_more'),2500);setTimeout(ask,2600)}else walk()})};ask()}
  else{talk(B('release_invite'),60000);
    choices([['🌲',"Let's go",null],['🤗','Wait',null]],i=>{if(i===1){S.releasePath=null;home();return}walk()})}
  function walk(){
    const sc=$('#sc');sc.style.transition='filter 4s';sc.style.filter='hue-rotate(-20deg) brightness(.85)';const c=$('#cr');c.style.left='50%';
    const lines=[{text:`We're going to ${e.release}. It's not far.`,expr:'happy'},...S.memories.slice(-3).map(m=>B('walk_memory',{memory:m.replace(/\.$/,'')})),B('walk_end')];let k=0;
    const step=()=>{if(k<lines.length){talk(lines[k++],60000);setTimeout(step,3300)}else gift()};step();
  }
  function gift(){
    talk(B('gift_ask'),60000);
    const opts=[['💎',S.treasures[0]||e.treasure],[S.g.fav.split(' ')[0],S.g.fav.split(' ').slice(1).join(' ')],[e.token==='leaf'?'🍃':'🪶','a '+e.token]];
    choices(opts.map(o=>[o[0],o[1],null]),i=>{S.gift=opts[i][1];hop();talk(B('gift_got'),4000);setTimeout(bye,3500)});
  }
  function bye(){
    talk(B('goodbye_ask'),60000);
    choices([['👋','Wave',null],['🤗','Hug',null],['👃','Nose-tap',null]],i=>{
      talk(B('farewell'),60000);
      setTimeout(()=>{const c=$('#cr');c.style.transition='all 3s';c.style.left='110%';c.style.transform='translateX(-50%) scale(.5)';
        setTimeout(()=>{c.style.transition='all .5s';c.style.left='88%';talk(B('look_back'),3000);
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
  d.querySelector('#ok').onclick=()=>{d.remove();const d2=full(`<p style="font-size:22px">It's okay to feel more than one thing.</p><button class="btn">Memory Book</button>`);say("It's okay to feel more than one thing.");d2.querySelector('button').onclick=()=>{d2.remove();afterHome();book()}};
}
function buildCheckins(){
  const e=E(),g=S.g,c=S.child,mem=(S.memories.filter(m=>!m.startsWith('You said'))[1]||S.memories[0]||'the day we met'),con=(S.constellations||[])[0],lc=mem.charAt(0).toLowerCase()+mem.slice(1);
  const T={postcard:['I made it! The '+(S.gift||e.treasure)+' came too. It likes it here.',
     S.kind==='fox'?`I used my ${S.talents[1]||'disguise'} today and NOBODY found me. You would have. I still think about how ${lc}.`:`I used my ${S.talents[0]||'night eyes'} to count fireflies. I still think about how ${lc}.`,
     S.kind==='fox'?'The meadow turned all gold for autumn. I pounced into the biggest leaf pile and thought of you.':(con?`${con} was out tonight, right over my hollow.`:'The first snow fell on my hollow. Very quiet. Very nice.')],
   note:[S.kind==='fox'?'Psst. Do you think clouds play hide-and-seek? I think they peek.':'I wondered today… where does the wind sleep?',`I still think about ${lc}. It makes me ${S.kind==='fox'?'swish my tail':'fluff my feathers'}.`],
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
window.__echo={get state(){return S},initDialogue:()=>initDialogue(),runConv:(id,d)=>runConv(id,d),callbackLine:()=>callbackLine(),bark:(k)=>B(k)};
start();
})();
